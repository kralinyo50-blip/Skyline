import express from "express";
import cookieParser from "cookie-parser";
import { z, ZodError } from "zod";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { first, type Database, type Sql } from "./db";
import { ApiError, ensure } from "./errors";
import {
  sessionUser,
  requireUser,
  requireAdmin,
  rateLimit,
  hashPassword,
  verifyPassword,
  createSession,
  digest,
  publicUser,
} from "./auth";
import {
  username,
  password,
  sc,
  type Catalog,
  type OnlineUser,
} from "../shared/platform";
import { id, wallet, audit } from "./core";
import {
  requestMigration,
  approveMigration,
  createClan,
  clanAction,
  claimCollection,
  submitDesign,
  galleryAction,
  approveDesign,
} from "./social";
import {
  createAuction,
  bidAuction,
  cancelAuction,
  settleAuction,
} from "./market";
import { createBattle, joinBattle, cancelBattle } from "./battles";
import { createQuote, queueGeneration, type AiSettings } from "./ai";
import { platformState, settleDue, weekKey } from "./state";
export interface AppConfig {
  production: boolean;
  publicOrigin?: string;
  adminName?: string;
  dist?: string;
  ai: AiSettings;
}
export function createApp(db: Database, catalog: Catalog, config: AppConfig) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cookieParser());
  app.use("/api", (req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("Origin");
      const own = config.publicOrigin || `${req.protocol}://${req.get("host")}`;
      let preview = false;
      try {
        const supplied = new URL(origin || "");
        preview =
          !config.production &&
          !config.publicOrigin &&
          supplied.host === req.get("host") &&
          ["http:", "https:"].includes(supplied.protocol);
      } catch {
        /* invalid origin */
      }
      if (!origin || (origin !== own && !preview))
        return next(
          new ApiError(
            403,
            "İstek kaynağı doğrulanamadı. Siteyi kendi adresinden aç.",
          ),
        );
      if (!req.is("application/json"))
        return next(new ApiError(415, "JSON içerik gerekli."));
    }
    next();
  });
  app.use("/api", express.json({ limit: "2mb" }));
  const cookie = (req: express.Request): express.CookieOptions => {
    // CHIPS allows cookie sessions in Arena's embedded HTTPS development preview.
    // Production retains its stricter first-party SameSite=Lax policy.
    const embedded =
      !config.production && /\.(e2b\.app|e2b\.dev)$/.test(req.hostname);
    return {
      httpOnly: true,
      secure: config.production || embedded,
      sameSite: embedded ? "none" : "lax",
      partitioned: embedded,
      path: "/",
      maxAge: 7 * 86400_000,
    };
  };
  const token = (req: express.Request) =>
    typeof req.cookies.skyline_session === "string"
      ? req.cookies.skyline_session
      : undefined;
  // Every mutation authenticates again inside the transaction/lock. Revoked roles cannot race a write.
  const action = (
    path: string,
    handler: (
      sql: Sql,
      user: OnlineUser,
      body: unknown,
      now: number,
    ) => Promise<unknown>,
    approved = true,
  ) => {
    app.post(`/api/${path}`, async (req, res) => {
      const who = await sessionUser(db, token(req));
      requireUser(who, approved);
      await rateLimit(db, `write:${who.id}`, 90, 60_000);
      if (path === "ai/quote")
        await rateLimit(db, `quote:${who.id}`, 30, 3600_000);
      if (path === "gallery/submit")
        await rateLimit(db, `design:${who.id}`, 10, 86400_000);
      const result = await db.tx(async (sql) => {
        const user = await sessionUser(sql, token(req));
        requireUser(user, approved);
        await settleDue(sql, Date.now());
        // Settlement can refund funds; the fresh wallet is read by wallet() in the transaction.
        return handler(sql, user, req.body, Date.now());
      });
      res.json(result || { ok: true });
    });
  };
  app.get("/api/health", async (_req, res) => {
    await db.query("SELECT 1");
    res.json({ ok: true, service: "skyline-platform", version: "3.0" });
  });
  app.get("/api/catalog", (_req, res) => {
    res.set("Cache-Control", "public, max-age=300").json(catalog);
  });
  app.get("/api/state", async (req, res) => {
    await rateLimit(db, `read:${req.ip}`, 360, 60_000);
    const state = await db.tx(async (sql) => {
      await settleDue(sql, Date.now());
      const user = await sessionUser(sql, token(req));
      return platformState(sql, user, catalog, config.ai, Date.now());
    });
    // Catalog is versioned/public and downloaded once, not on every live-room poll.
    const { catalog: _catalog, ...payload } = state;
    res.json({
      ...payload,
      environment: config.production ? "production" : "development",
    });
  });
  app.post("/api/auth/register", async (req, res) => {
    const input = z.object({ username, password }).strict().parse(req.body);
    await rateLimit(db, `register:${req.ip}`, 5, 3600_000);
    const name = input.username.toLowerCase();
    ensure(
      name !== config.adminName?.toLowerCase(),
      "Bu ad sunucu yetkilisine ayrılmış.",
    );
    const hash = await hashPassword(input.password);
    const session = await db.tx(async (sql) => {
      const userId = id();
      await sql.query(
        "INSERT INTO accounts(id,username,password_hash,role,status,created_at) VALUES($1,$2,$3,'player','pending',$4)",
        [userId, name, hash, Date.now()],
      );
      return createSession(sql, userId);
    });
    res
      .cookie("skyline_session", session, cookie(req))
      .status(201)
      .json({ ok: true });
  });
  // A fixed valid dummy hash gives unknown names the same expensive verification path.
  const dummyHash = `00000000000000000000000000000000:${"0".repeat(128)}`;
  app.post("/api/auth/login", async (req, res) => {
    const input = z
      .object({ username, password: z.string().min(1).max(128) })
      .strict()
      .parse(req.body);
    const name = input.username.toLowerCase();
    await rateLimit(db, `login-ip:${req.ip}`, 20, 15 * 60_000);
    await rateLimit(db, `login-name:${name}`, 12, 15 * 60_000);
    const account = await first(
      db,
      "SELECT * FROM accounts WHERE username=$1",
      [name],
    );
    const valid = await verifyPassword(
      input.password,
      account?.password_hash || dummyHash,
    );
    ensure(account && valid, "Kullanıcı adı veya şifre hatalı.", 401);
    ensure(account.status !== "suspended", "Hesap askıya alınmış.", 403);
    const session = await db.tx(async (sql) => {
      const current = await first(
        sql,
        "SELECT status,password_hash FROM accounts WHERE id=$1",
        [account.id],
      );
      ensure(
        current?.status !== "suspended" &&
          current?.password_hash === account.password_hash,
        "Hesap durumu değişti; yeniden giriş yap.",
        403,
      );
      return createSession(sql, account.id);
    });
    res.cookie("skyline_session", session, cookie(req)).json({ ok: true });
  });
  app.post("/api/auth/logout", async (req, res) => {
    const value = token(req);
    if (value)
      await db.tx((sql) =>
        sql.query("DELETE FROM sessions WHERE token_hash=$1", [digest(value)]),
      );
    res
      .clearCookie("skyline_session", { ...cookie(req), maxAge: undefined })
      .json({ ok: true });
  });
  app.get("/api/account/export", async (req, res) => {
    const user = await sessionUser(db, token(req));
    requireUser(user, false);
    const backup = await db.tx(async (sql) => ({
      version: 3,
      exportedAt: Date.now(),
      account: publicUser(
        (await first(sql, "SELECT * FROM accounts WHERE id=$1", [user.id]))!,
      ),
      items: (
        await sql.query("SELECT * FROM items WHERE owner_id=$1", [user.id])
      ).rows,
      ledger: (
        await sql.query(
          "SELECT * FROM ledger WHERE user_id=$1 ORDER BY created_at",
          [user.id],
        )
      ).rows,
      migration: await first(
        sql,
        "SELECT snapshot,verified,status FROM migrations WHERE user_id=$1",
        [user.id],
      ),
    }));
    res.attachment(`skyline-v3-${user.username}.json`).json(backup);
  });
  app.get("/api/images/:id", async (req, res) => {
    const imageId = z.string().uuid().parse(req.params.id),
      user = await sessionUser(db, token(req));
    const row = await first(
      db,
      "SELECT m.*,d.status,d.author_id FROM media m JOIN designs d ON d.id=m.design_id WHERE m.design_id=$1",
      [imageId],
    );
    ensure(row, "Görsel bulunamadı.", 404);
    const owned =
      user &&
      (await first(
        db,
        "SELECT id FROM items WHERE owner_id=$1 AND design_id=$2",
        [user.id, imageId],
      ));
    ensure(
      row.status === "approved" ||
        row.author_id === user?.id ||
        (user?.role === "admin" && user.status === "approved") ||
        owned,
      "Görsel yayınlanmadı.",
      404,
    );
    res
      .set("Cache-Control", "private, no-store")
      .type(row.mime)
      .send(Buffer.from(row.bytes));
  });
  action(
    "migration/request",
    (s, u, b, n) => requestMigration(s, u, b, n),
    false,
  );
  action("admin/migration", (s, u, b, n) =>
    approveMigration(s, u, b, catalog, n),
  );
  action("clans/create", (s, u, b) => createClan(s, u, b));
  action("clans/action", (s, u, b) => clanAction(s, u, b));
  action("collections/claim", (s, u, b, n) =>
    claimCollection(
      s,
      u,
      z
        .object({ id: z.string().max(40) })
        .strict()
        .parse(b).id,
      catalog,
      n,
    ),
  );
  action("gallery/submit", (s, u, b, n) => submitDesign(s, u, b, catalog, n));
  action("gallery/action", (s, u, b, n) => galleryAction(s, u, b, n));
  action("market/create", (s, u, b, n) => createAuction(s, u, b, n));
  action("market/bid", (s, u, b, n) => bidAuction(s, u, b, n));
  action("market/cancel", (s, u, b, n) =>
    cancelAuction(
      s,
      u,
      z.object({ id: z.string().uuid() }).strict().parse(b).id,
      n,
    ),
  );
  action("battles/create", (s, u, b, n) => createBattle(s, u, b, catalog, n));
  action("battles/join", (s, u, b, n) =>
    joinBattle(
      s,
      u,
      z
        .object({ code: z.string().min(1).max(12) })
        .strict()
        .parse(b).code,
      catalog,
      n,
    ),
  );
  action("battles/cancel", async (s, u, b, n) => {
    const input = z.object({ id: z.string().uuid() }).strict().parse(b);
    const room = await first(s, "SELECT * FROM battles WHERE id=$1", [
      input.id,
    ]);
    ensure(
      room && room.phase === "waiting",
      "Yalnızca bekleyen oda iptal edilebilir.",
    );
    ensure(
      await first(
        s,
        "SELECT id FROM battle_members WHERE battle_id=$1 AND user_id=$2",
        [room.id, u.id],
      ),
      "Bu odada değilsin.",
      403,
    );
    await cancelBattle(s, room, n);
  });
  action("ai/quote", (s, u, b, n) => createQuote(s, u, b, n));
  action("ai/generate", (s, u, b, n) => queueGeneration(s, u, b, config.ai, n));
  action("admin/user", async (s, u, b, n) => {
    requireAdmin(u);
    const input = z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "suspended"]),
      })
      .strict()
      .parse(b);
    const target = await first(s, "SELECT * FROM accounts WHERE id=$1", [
      input.id,
    ]);
    ensure(
      target && target.role !== "admin",
      "Yetkili hesabının durumu buradan değiştirilemez.",
    );
    await s.query("UPDATE accounts SET status=$1 WHERE id=$2", [
      input.status,
      input.id,
    ]);
    if (input.status === "suspended") {
      await s.query("DELETE FROM sessions WHERE user_id=$1", [input.id]);
      // Cancel their waiting rooms and active seller listings; preserve/refund escrow.
      for (const room of (
        await s.query(
          "SELECT b.* FROM battles b JOIN battle_members m ON m.battle_id=b.id WHERE m.user_id=$1 AND b.phase='waiting'",
          [input.id],
        )
      ).rows)
        await cancelBattle(s, room, n);
      for (const auction of (
        await s.query(
          "SELECT * FROM auctions WHERE status='active' AND (seller_id=$1 OR bidder_id=$1)",
          [input.id],
        )
      ).rows)
        await settleAuction(s, auction, n, true);
    }
    await audit(s, u.id, "account.status", input, n);
  });
  action("admin/credit", async (s, u, b, n) => {
    requireAdmin(u);
    const input = z
      .object({
        id: z.string().uuid(),
        amount: sc.min(1),
        note: z.string().trim().min(10).max(300),
        operationId: z.string().uuid(),
      })
      .strict()
      .parse(b);
    await wallet(
      s,
      input.id,
      input.amount,
      `admin-credit:${input.operationId}`,
      input.note,
      n,
    );
    await audit(
      s,
      u.id,
      "wallet.credit",
      {
        userId: input.id,
        amount: input.amount,
        operationId: input.operationId,
        note: input.note,
      },
      n,
    );
  });
  action("admin/design", async (s, u, b, n) => {
    requireAdmin(u);
    const input = z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
      })
      .strict()
      .parse(b);
    if (input.status === "rejected")
      for (const a of (
        await s.query(
          "SELECT a.* FROM auctions a JOIN items i ON i.id=a.item_id WHERE i.design_id=$1 AND a.status='active'",
          [input.id],
        )
      ).rows)
        await settleAuction(s, a, n, true);
    await approveDesign(s, u, input.id, input.status, n);
  });
  action("admin/feature", async (s, u, b, n) => {
    requireAdmin(u);
    const input = z.object({ id: z.string().uuid() }).strict().parse(b);
    ensure(
      await first(
        s,
        "SELECT id FROM designs WHERE id=$1 AND status='approved'",
        [input.id],
      ),
      "Yalnızca onaylı tasarım seçilebilir.",
    );
    await s.query(
      "UPDATE designs SET featured_week=NULL WHERE featured_week=$1",
      [weekKey(n)],
    );
    await s.query("UPDATE designs SET featured_week=$1 WHERE id=$2", [
      weekKey(n),
      input.id,
    ]);
    await audit(s, u.id, "design.featured", input, n);
  });
  app.use("/api", (_req, _res, next) =>
    next(new ApiError(404, "API yolu bulunamadı.")),
  );
  if (config.dist) {
    const folder = resolve(config.dist);
    app.use(
      express.static(folder, {
        index: false,
        setHeaders(res, path) {
          if (path.endsWith("sw.js") || path.endsWith(".html"))
            res.setHeader("Cache-Control", "no-cache");
        },
      }),
    );
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(folder, "index.html")),
    );
  }
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof ZodError) {
        res
          .status(400)
          .json({ error: error.issues[0]?.message || "Geçersiz alanlar." });
        return;
      }
      if (error instanceof ApiError) {
        res
          .status(error.status)
          .json({ error: error.message, code: error.code });
        return;
      }
      if (error instanceof SyntaxError && "body" in error) {
        res.status(400).json({ error: "Geçersiz JSON gövdesi." });
        return;
      }
      const code = (error as { code?: string })?.code;
      if (code === "23505") {
        res.status(409).json({
          error: "Bu kayıt zaten var veya işlem başka bir istekte tamamlandı.",
        });
        return;
      }
      if ((error as { type?: string })?.type === "entity.too.large") {
        res.status(413).json({
          error:
            "Yedek/istek boyutu 2 MB sınırını aşıyor. Dosyanı silme; yetkiliyle aktarım planla.",
        });
        return;
      }
      const trace = randomUUID();
      console.error(
        "API failure",
        trace,
        error instanceof Error ? error.name : "unknown",
      );
      res.status(500).json({
        error:
          "İşlem tamamlanamadı. Tekrar ödeme yapmadan bakiyeni/işlem geçmişini kontrol et.",
        trace,
      });
    },
  );
  return app;
}
