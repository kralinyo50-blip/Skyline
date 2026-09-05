import { randomBytes } from "node:crypto";
import { z } from "zod";
import { first, type Sql } from "./db";
import { ensure } from "./errors";
import { id, json, audit, addCatalogItem, wallet, clanPoint } from "./core";
import {
  stickerInput,
  type Catalog,
  type OnlineUser,
} from "../shared/platform";
import { requireAdmin } from "./auth";

export const migrationSchema = z
  .object({
    name: z.string().min(3).max(16),
    balance: z.number().finite().min(0).max(9_000_000_000_000),
    inventory: z
      .array(
        z
          .object({
            uid: z.string().min(1).max(100),
            skinId: z.string().min(1).max(160),
            ts: z.number().optional(),
            float: z.number().min(0).max(1).optional(),
            stickers: z.array(z.string().max(160)).max(5).optional(),
            customName: z.string().max(64).optional(),
          })
          .strict(),
      )
      .max(5000),
  })
  .strict();
export async function requestMigration(
  sql: Sql,
  user: OnlineUser,
  raw: unknown,
  now: number,
) {
  const snapshot = migrationSchema.parse(raw);
  ensure(
    snapshot.name.toLowerCase() === user.username,
    "Yedekteki ad güvenli hesap adıyla eşleşmeli.",
  );
  ensure(
    !user.migratedAt,
    "Bu hesap zaten aktarıldı. Eski kayıt tekrar paraya çevrilemez.",
    409,
  );
  ensure(
    new Set(snapshot.inventory.map((i) => i.uid)).size ===
      snapshot.inventory.length,
    "Yedekte tekrarlanan eşya kimliği var.",
  );
  const existing = await first(
    sql,
    "SELECT id FROM migrations WHERE user_id=$1",
    [user.id],
  );
  ensure(
    !existing,
    "Bir aktarım talebin zaten var. Yetkili incelemesini bekle.",
    409,
  );
  const requestId = id();
  await sql.query(
    "INSERT INTO migrations(id,user_id,origin_key,snapshot,requested_at) VALUES($1,$2,$3,$4,$5)",
    [requestId, user.id, user.username, json(snapshot), now],
  );
  return { id: requestId };
}
export async function approveMigration(
  sql: Sql,
  user: OnlineUser,
  raw: unknown,
  catalog: Catalog,
  now: number,
) {
  requireAdmin(user);
  const input = z
    .object({
      id: z.string().uuid(),
      balance: z.number().min(0).max(9_000_000_000_000).multipleOf(0.01),
      itemUids: z.array(z.string().max(100)).max(5000),
      note: z.string().trim().min(10).max(500),
      confirmed: z.literal(true),
    })
    .strict()
    .parse(raw);
  const row = await first(sql, "SELECT * FROM migrations WHERE id=$1", [
    input.id,
  ]);
  ensure(
    row && row.status === "pending",
    "Talep bulunamadı veya zaten işlendi.",
    409,
  );
  const snapshot = migrationSchema.parse(row.snapshot);
  ensure(
    new Set(input.itemUids).size === input.itemUids.length,
    "Eşya listesinde tekrar var.",
  );
  const known = new Set(catalog.skins.map((s) => s.id));
  const selected = input.itemUids.map((uid) =>
    snapshot.inventory.find((i) => i.uid === uid),
  );
  ensure(
    selected.every((i) => i && known.has(i.skinId)),
    "Seçilen bir eşya katalogda/yedekte yok. Desteklenmeyen öğeler arşivde kalır.",
  );
  // A V2 item UID can be imported once across accounts, not once per username.
  // Reject a conflict before any credit; never silently skip a selected item.
  for (const item of selected) {
    if (!item) continue;
    ensure(
      !(await first(sql, "SELECT id FROM items WHERE source_key=$1", [
        `legacy:${item.uid}`,
      ])),
      "Bu eski eşya kimliği daha önce aktarılmış. Yetkili sahiplik uzlaştırması gerekli.",
      409,
    );
  }
  await wallet(
    sql,
    row.user_id,
    input.balance,
    `migration:${row.id}`,
    "Yetkili onaylı V2 aktarımı",
    now,
  );
  for (const item of selected) {
    if (!item) continue;
    const { uid, skinId, ...metadata } = item;
    await addCatalogItem(
      sql,
      row.user_id,
      skinId,
      `legacy:${uid}`,
      metadata,
      now,
    );
  }
  await sql.query(
    "UPDATE migrations SET status='approved',verified=$1,reviewed_by=$2 WHERE id=$3",
    [
      json({ balance: input.balance, itemUids: input.itemUids }),
      user.id,
      row.id,
    ],
  );
  await sql.query(
    "UPDATE accounts SET migrated_at=$1,status='approved' WHERE id=$2",
    [now, row.user_id],
  );
  await audit(
    sql,
    user.id,
    "migration.approved",
    {
      requestId: row.id,
      verifiedBalance: input.balance,
      imported: selected.length,
      archived: snapshot.inventory.length - selected.length,
      note: input.note,
    },
    now,
  );
}
const clanSchema = z
  .object({
    name: z.string().trim().min(3).max(32),
    tag: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{2,5}$/)
      .transform((s) => s.toUpperCase()),
    emblem: z.enum(["🛡️", "🔥", "🌙", "⚡", "🌿", "💎"]),
  })
  .strict();
export async function createClan(sql: Sql, user: OnlineUser, raw: unknown) {
  const input = clanSchema.parse(raw);
  ensure(
    !(await first(sql, "SELECT * FROM clan_members WHERE user_id=$1", [
      user.id,
    ])),
    "Zaten bir klana üyesin.",
  );
  const clanId = id();
  await sql.query(
    "INSERT INTO clans(id,name,tag,emblem,code,leader_id) VALUES($1,$2,$3,$4,$5,$6)",
    [
      clanId,
      input.name,
      input.tag,
      input.emblem,
      randomBytes(6).toString("hex").toUpperCase(),
      user.id,
    ],
  );
  await sql.query("INSERT INTO clan_members VALUES($1,$2)", [user.id, clanId]);
  return { id: clanId };
}
export async function clanAction(sql: Sql, user: OnlineUser, raw: unknown) {
  const input = z
    .object({
      action: z.enum([
        "request",
        "invite",
        "accept",
        "reject",
        "leave",
        "transfer",
        "rotate",
      ]),
      clanId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      code: z.string().max(20).optional(),
    })
    .strict()
    .parse(raw);
  const own = await first(
    sql,
    "SELECT c.* FROM clans c JOIN clan_members m ON m.clan_id=c.id WHERE m.user_id=$1",
    [user.id],
  );
  if (input.action === "request" || input.action === "invite") {
    ensure(!own, "Önce mevcut klandan ayrıl.");
    const clan =
      input.action === "invite"
        ? await first(sql, "SELECT * FROM clans WHERE code=$1", [
            (input.code || "").trim().toUpperCase(),
          ])
        : await first(sql, "SELECT * FROM clans WHERE id=$1", [input.clanId]);
    ensure(clan, "Klan/davet kodu bulunamadı.", 404);
    const count = await first(
      sql,
      "SELECT count(*) AS count FROM clan_members WHERE clan_id=$1",
      [clan.id],
    );
    ensure(Number(count?.count) < 30, "Klan 30 üyelik sınırına ulaştı.");
    if (input.action === "invite") {
      await sql.query("INSERT INTO clan_members VALUES($1,$2)", [
        user.id,
        clan.id,
      ]);
      await sql.query("DELETE FROM clan_requests WHERE user_id=$1", [user.id]);
    } else
      await sql.query(
        "INSERT INTO clan_requests VALUES($1,$2) ON CONFLICT DO NOTHING",
        [clan.id, user.id],
      );
    return;
  }
  ensure(own, "Bir klana üye değilsin.");
  if (input.action === "leave") {
    const count = await first(
      sql,
      "SELECT count(*) AS count FROM clan_members WHERE clan_id=$1",
      [own.id],
    );
    ensure(
      own.leader_id !== user.id || Number(count?.count) === 1,
      "Ayrılmadan önce liderliği başka üyeye devret.",
    );
    await sql.query("DELETE FROM clan_members WHERE user_id=$1", [user.id]);
    if (Number(count?.count) === 1) {
      await sql.query("DELETE FROM clan_requests WHERE clan_id=$1", [own.id]);
      await sql.query("DELETE FROM clan_events WHERE clan_id=$1", [own.id]);
      await sql.query("DELETE FROM clans WHERE id=$1", [own.id]);
    }
    return;
  }
  ensure(own.leader_id === user.id, "Bu işlem klan liderine açık.", 403);
  if (input.action === "rotate") {
    await sql.query("UPDATE clans SET code=$1 WHERE id=$2", [
      randomBytes(6).toString("hex").toUpperCase(),
      own.id,
    ]);
    return;
  }
  ensure(input.userId, "Üye seç.");
  if (input.action === "transfer") {
    ensure(
      await first(
        sql,
        "SELECT * FROM clan_members WHERE clan_id=$1 AND user_id=$2",
        [own.id, input.userId],
      ),
      "Bu oyuncu klana üye değil.",
    );
    await sql.query("UPDATE clans SET leader_id=$1 WHERE id=$2", [
      input.userId,
      own.id,
    ]);
    return;
  }
  ensure(
    await first(
      sql,
      "SELECT * FROM clan_requests WHERE clan_id=$1 AND user_id=$2",
      [own.id, input.userId],
    ),
    "Katılım talebi yok.",
  );
  if (input.action === "accept") {
    ensure(
      await first(
        sql,
        "SELECT id FROM accounts WHERE id=$1 AND status='approved'",
        [input.userId],
      ),
      "Hesap aktif değil.",
    );
    const count = await first(
      sql,
      "SELECT count(*) AS count FROM clan_members WHERE clan_id=$1",
      [own.id],
    );
    ensure(Number(count?.count) < 30, "Klan dolu.");
    ensure(
      !(await first(sql, "SELECT * FROM clan_members WHERE user_id=$1", [
        input.userId,
      ])),
      "Oyuncu başka bir klana katılmış.",
    );
    await sql.query("INSERT INTO clan_members VALUES($1,$2)", [
      input.userId,
      own.id,
    ]);
    await sql.query("DELETE FROM clan_requests WHERE user_id=$1", [
      input.userId,
    ]);
  } else
    await sql.query(
      "DELETE FROM clan_requests WHERE clan_id=$1 AND user_id=$2",
      [own.id, input.userId],
    );
}
export async function claimCollection(
  sql: Sql,
  user: OnlineUser,
  collectionId: string,
  catalog: Catalog,
  now: number,
) {
  const collection = catalog.collections.find((c) => c.id === collectionId);
  ensure(collection, "Koleksiyon bulunamadı.", 404);
  const items = (
    await sql.query("SELECT catalog_id FROM items WHERE owner_id=$1", [user.id])
  ).rows;
  ensure(
    collection.ids.every((id) => items.some((i) => i.catalog_id === id)),
    "Koleksiyondaki tüm parçalara sahip olmalısın.",
  );
  await sql.query(
    "INSERT INTO collection_claims VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [user.id, collection.id, now],
  );
}
export async function submitDesign(
  sql: Sql,
  user: OnlineUser,
  raw: unknown,
  catalog: Catalog,
  now: number,
) {
  const input = z
    .object({
      kind: z.enum(["sticker", "case"]),
      title: z.string().trim().min(3).max(64),
      description: z.string().trim().max(500),
      payload: z.unknown(),
    })
    .strict()
    .parse(raw);
  let payload: unknown;
  if (input.kind === "sticker") payload = stickerInput.parse(input.payload);
  else {
    const parsed = z
      .object({
        skinIds: z.array(z.string().max(160)).min(4).max(12),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .strict()
      .parse(input.payload);
    ensure(
      new Set(parsed.skinIds).size === parsed.skinIds.length,
      "Kasa tasarımında skinler tekrarlanamaz.",
    );
    ensure(
      parsed.skinIds.every((id) => catalog.skins.some((s) => s.id === id)),
      "Katalog dışı skin var.",
    );
    payload = parsed;
  }
  const designId = id();
  await sql.query(
    "INSERT INTO designs(id,author_id,kind,title,description,payload,status,created_at) VALUES($1,$2,$3,$4,$5,$6,'pending',$7)",
    [
      designId,
      user.id,
      input.kind,
      input.title,
      input.description,
      json(payload),
      now,
    ],
  );
  return { id: designId };
}
export async function galleryAction(
  sql: Sql,
  user: OnlineUser,
  raw: unknown,
  now: number,
) {
  const input = z
    .object({
      action: z.enum(["publish", "like", "unlike", "report"]),
      id: z.string().uuid(),
      reason: z.string().trim().min(5).max(300).optional(),
    })
    .strict()
    .parse(raw);
  const design = await first(sql, "SELECT * FROM designs WHERE id=$1", [
    input.id,
  ]);
  ensure(design, "Tasarım bulunamadı.", 404);
  if (input.action === "publish") {
    ensure(design.author_id === user.id, "Bu tasarım sana ait değil.", 403);
    ensure(
      design.status === "draft",
      "Bu tasarım zaten gönderildi veya incelemeden geçmedi.",
    );
    await sql.query("UPDATE designs SET status='pending' WHERE id=$1", [
      design.id,
    ]);
    return;
  }
  ensure(design.status === "approved", "Tasarım yayınlanmış değil.");
  if (input.action === "report") {
    ensure(input.reason, "Rapor gerekçesini yaz.");
    await sql.query(
      "INSERT INTO reports VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [design.id, user.id, input.reason, now],
    );
    return;
  }
  ensure(design.author_id !== user.id, "Kendi tasarımını beğenemezsin.");
  if (input.action === "unlike")
    await sql.query("DELETE FROM likes WHERE design_id=$1 AND user_id=$2", [
      design.id,
      user.id,
    ]);
  else
    await sql.query("INSERT INTO likes VALUES($1,$2) ON CONFLICT DO NOTHING", [
      design.id,
      user.id,
    ]);
}
export async function approveDesign(
  sql: Sql,
  user: OnlineUser,
  designId: string,
  status: "approved" | "rejected",
  now: number,
) {
  requireAdmin(user);
  const row = await first(sql, "SELECT * FROM designs WHERE id=$1", [designId]);
  ensure(
    row && row.status !== "draft",
    "İnceleme için gönderilmiş tasarım bulunamadı.",
  );
  await sql.query(
    "UPDATE designs SET status=$1,featured_week=NULL WHERE id=$2",
    [status, designId],
  );
  if (status === "approved")
    await clanPoint(
      sql,
      row.author_id,
      `design:${designId}`,
      "Tasarım yayınlandı",
      10,
      now,
    );
  await audit(sql, user.id, `design.${status}`, { designId }, now);
}
