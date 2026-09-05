// Isolated non-production smoke test. External development servers are opt-in.
// No provider API is invoked; registration/SC/market fixtures never touch production.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { database, migrate } from "../server/db.ts";
import { bootstrapAdmin } from "../server/auth.ts";
import { createApp } from "../server/app.ts";
import { readFile, mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
async function main() {
  let isolatedDb, isolatedServer, browser;
  try {
    let base = process.env.E2E_BASE_URL;
    let swRevision = 0;
    let adminName = process.env.SKYLINE_ADMIN_USER,
      adminPassword = process.env.SKYLINE_ADMIN_PASSWORD;
    if (!base) {
      isolatedDb = await database();
      await migrate(isolatedDb);
      adminName = "e2e_operator";
      adminPassword = randomUUID() + "Test!";
      await bootstrapAdmin(isolatedDb, adminName, adminPassword);
      const catalog = JSON.parse(await readFile("dist/catalog.json", "utf8"));
      const app = createApp(isolatedDb, catalog, {
        production: false,
        adminName,
        dist: "dist",
        ai: {
          enabled: false,
          model: "gpt-image-1",
          userDaily: 3,
          globalDaily: 20,
        },
      });
      const swSource = await readFile("dist/sw.js", "utf8");
      isolatedServer = createServer((req, res) => {
        if (req.url === "/sw.js" && swRevision) {
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-store");
          res.end(
            swSource.replace(
              "skyline-shell-v3-1",
              "skyline-shell-v3-e2e-update",
            ),
          );
          return;
        }
        app(req, res);
      });
      await new Promise((r) => isolatedServer.listen(0, "127.0.0.1", r));
      base = `http://127.0.0.1:${isolatedServer.address().port}`;
    }
    const initial = await fetch(`${base}/api/state`).then((r) => r.json());
    assert.equal(
      initial.environment,
      "development",
      "E2E refuses to create test users on a production server.",
    );
    assert(
      adminName && adminPassword,
      "Set the development administrator through environment variables.",
    );
    let launch = { headless: true };
    if (process.env.PW_BROWSER_MODULE) {
      const { default: binary } = await import(process.env.PW_BROWSER_MODULE);
      launch = {
        ...launch,
        executablePath: await binary.executablePath(),
        args: binary.args.filter(
          (a) =>
            !a.includes("disable-web-security") &&
            !a.includes("allow-running-insecure-content") &&
            !a.includes("single-process") &&
            !a.includes("in-process-gpu"),
        ),
      };
    } else if (process.env.PW_EXECUTABLE_PATH)
      launch = {
        ...launch,
        executablePath: process.env.PW_EXECUTABLE_PATH,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      };
    browser = await chromium.launch(launch);
    const admin = await browser.newContext({
      baseURL: base,
      viewport: { width: 1440, height: 1080 },
    });
    const alice = await browser.newContext({
      baseURL: base,
      viewport: { width: 1440, height: 1080 },
    });
    const bob = await browser.newContext({
      baseURL: base,
      viewport: { width: 1280, height: 900 },
    });
    for (const ctx of [admin, alice, bob])
      await ctx.route("**/*", (route) =>
        new URL(route.request().url()).origin === base
          ? route.continue()
          : route.abort(),
      );
    const ap = await alice.newPage(),
      bp = await bob.newPage(),
      op = await admin.newPage();
    const errors = [];
    for (const page of [ap, bp, op])
      page.on("pageerror", (e) => errors.push(e.message));
    const suffix = randomUUID().slice(0, 7),
      nameA = `qa_${suffix}`,
      nameB = `qb_${suffix}`,
      secret = randomUUID() + "Qa!";
    async function post(ctx, path, body) {
      const result = await ctx.request.post(`/api/${path}`, {
        data: body,
        headers: { Origin: base },
      });
      assert(result.ok(), `${path}: ${result.status()} ${await result.text()}`);
      return result.json();
    }
    async function state(ctx) {
      return (await ctx.request.get("/api/state")).json();
    }
    async function go(page, route) {
      await page.goto(`${base}/#platform/${route}`, {
        waitUntil: "domcontentloaded",
      });
      await page
        .getByText("Sunucu bağlı", { exact: true })
        .waitFor({ state: "attached" });
    }
    const check = (message) => console.log(`✓ ${message}`);
    try {
      await post(admin, "auth/login", {
        username: adminName,
        password: adminPassword,
      });
      await go(ap, "account");
      await ap
        .getByRole("button", { name: "İlk kez geliyorum, hesap oluştur" })
        .click();
      await ap
        .getByLabel("Minecraft kullanıcı adı", { exact: false })
        .fill(nameA);
      await ap.getByLabel("Şifre", { exact: false }).fill(secret);
      await ap
        .getByRole("button", { name: "Hesap oluştur", exact: true })
        .click();
      await expect
        .poll(async () => (await state(alice)).user?.username)
        .toBe(nameA);
      await post(bob, "auth/register", { username: nameB, password: secret });
      const users = (await state(admin)).admin.users;
      const ua = users.find((u) => u.username === nameA),
        ub = users.find((u) => u.username === nameB);
      assert(ua && ub);
      for (const user of [ua, ub]) {
        await post(admin, "admin/user", { id: user.id, status: "approved" });
        await post(admin, "admin/credit", {
          id: user.id,
          amount: 200000,
          note: "E2E development test allocation",
          operationId: randomUUID(),
        });
      }
      check(
        "UI registration, admin approval, cookie-bound sessions and SC allocation",
      );
      const catalog = await (await alice.request.get("/api/catalog")).json();
      const owned = catalog.collections[0].ids;
      const snapshot = {
        name: nameA,
        balance: 12345.67,
        inventory: owned.map((id, i) => ({
          uid: `qa-legacy-${suffix}-${i}`,
          skinId: id,
          ts: Date.now(),
          float: 0.12345,
          ...(i === 0 ? { customName: `QA Hatıra ${suffix}` } : {}),
        })),
      };
      const raw = JSON.stringify({
        session: nameA,
        users: { [nameA]: { ...snapshot, status: "approved", isAdmin: false } },
      });
      await ap.evaluate(({ raw }) => localStorage.setItem("skyline:v1", raw), {
        raw,
      });
      await go(ap, "account");
      const download = ap.waitForEvent("download");
      await ap
        .getByRole("button", { name: "V2 yedeği indir", exact: true })
        .click();
      await mkdir(".cache", { recursive: true });
      const downloaded = await download;
      await downloaded.saveAs(".cache/e2e-backup.json");
      assert.equal(
        JSON.parse(await readFile(".cache/e2e-backup.json", "utf8")).raw,
        raw,
      );
      await ap.locator(".pf-checkbox input").check();
      await ap
        .getByRole("button", { name: "İnceleme için aktarım talebi gönder" })
        .click();
      await expect
        .poll(async () => (await state(alice)).migration?.status)
        .toBe("pending");
      const migration = (await state(admin)).admin.migrations.find(
        (m) => m.username === nameA,
      );
      assert(migration);
      await post(admin, "admin/migration", {
        id: migration.id,
        balance: 12345.67,
        itemUids: snapshot.inventory.map((i) => i.uid),
        note: "E2E fixture independently verified; production data not used.",
        confirmed: true,
      });
      await expect
        .poll(async () => (await state(alice)).user.balance)
        .toBe(212345.67);
      assert.equal(
        await ap.evaluate(() => localStorage.getItem("skyline:v1")),
        raw,
      );
      check(
        "V2 backup is byte-preserved; reviewed migration preserves fractional SC and item metadata",
      );
      await ap.waitForFunction(
        () => !!localStorage.getItem("skyline:v3:archived-accounts"),
      );
      const archiveTab = await alice.newPage();
      archiveTab.on("pageerror", (e) => errors.push(e.message));
      await archiveTab.goto(`${base}/#legacy`);
      await archiveTab
        .getByRole("heading", { name: "V2 kayıt arşivin" })
        .waitFor();
      assert.equal(
        await archiveTab.evaluate(() => localStorage.getItem("skyline:v1")),
        raw,
      );
      const legacy = JSON.parse(raw);
      const sharedRaw = JSON.stringify({
        ...legacy,
        session: nameB,
        users: {
          ...legacy.users,
          [nameB]: { name: nameB, balance: 99, inventory: [] },
        },
      });
      await ap.evaluate(
        (value) => localStorage.setItem("skyline:v1", value),
        sharedRaw,
      );
      await expect(
        archiveTab.getByText(`Eski kayıttaki beyan · ${nameB}`, {
          exact: true,
        }),
      ).toBeVisible();
      assert.equal(
        await archiveTab.evaluate(() => localStorage.getItem("skyline:v1")),
        sharedRaw,
      );
      await ap.evaluate(
        (value) => localStorage.setItem("skyline:v1", value),
        raw,
      );
      await archiveTab.close();
      check(
        "V2 archive survives a cross-tab session change without starting the old data-normalizing store",
      );
      await go(ap, "collections");
      await ap
        .getByRole("button", { name: "Ünvanı al", exact: true })
        .first()
        .click();
      await expect
        .poll(async () =>
          (await state(alice)).claims.includes(catalog.collections[0].id),
        )
        .toBe(true);
      await go(ap, "studio");
      await ap.getByLabel("Skin adı").fill("QA Mor Fırtına");
      await ap
        .getByLabel("Aklındaki tasarımı anlat", { exact: false })
        .fill(
          "Mat siyah üzerinde ince mor elektrik damarları. Metal gravürlü bir yüzey.",
        );
      await ap
        .getByRole("button", { name: "Metal gravür", exact: true })
        .click();
      await ap.getByRole("button", { name: /Fiyatı doğrula/ }).click();
      await expect(ap.getByRole("dialog")).toBeVisible();
      await expect(
        ap.getByRole("button", { name: /öde ve üret/ }),
      ).toBeDisabled();
      await ap.getByRole("button", { name: "Kapat", exact: true }).click();
      assert.equal((await state(alice)).user.balance, 212345.67);
      check(
        "Collection claim and server price quote work; missing AI key prevents charging",
      );
      await go(ap, "clans");
      await ap.getByRole("button", { name: "Klan kur", exact: true }).click();
      await ap.getByLabel("Klan adı").fill(`QA Ekip ${suffix}`);
      await ap
        .getByLabel("Etiket", { exact: false })
        .fill("Q" + suffix.slice(0, 4).toUpperCase());
      await ap.getByRole("button", { name: "Klanı oluştur" }).click();
      await expect
        .poll(async () =>
          (await state(alice)).clans.some((c) => c.leaderId === ua.id),
        )
        .toBe(true);
      const clan = (await state(alice)).clans.find((c) => c.leaderId === ua.id);
      assert(clan);
      assert.equal(
        (await state(bob)).clans.find((c) => c.id === clan.id).code,
        undefined,
      );
      await post(bob, "clans/action", { action: "invite", code: clan.code });
      await expect
        .poll(
          async () =>
            (await state(alice)).clans.find((c) => c.id === clan.id).members
              .length,
        )
        .toBe(2);
      check("Real accounts share a clan; invite code stays private");
      await go(ap, "gallery");
      await ap.getByRole("button", { name: "Tasarım paylaş" }).click();
      await ap
        .getByLabel("Başlık", { exact: true })
        .fill(`QA Sticker ${suffix}`);
      await ap
        .getByLabel("Açıklama", { exact: true })
        .fill("Geliştirme ortamı testi; AI üretimi değildir.");
      await ap.getByRole("button", { name: "İncelemeye gönder" }).click();
      await expect
        .poll(async () =>
          (await state(alice)).designs.some(
            (d) => d.title === `QA Sticker ${suffix}`,
          ),
        )
        .toBe(true);
      const design = (await state(alice)).designs.find(
        (d) => d.title === `QA Sticker ${suffix}`,
      );
      assert(design);
      assert(!(await state(bob)).designs.some((d) => d.id === design.id));
      await go(op, "admin");
      await op.getByRole("button", { name: /Tasarım onayı/ }).click();
      const reviewCard = op.locator(".pf-panel").filter({
        has: op.getByRole("heading", {
          name: `QA Sticker ${suffix}`,
          exact: true,
        }),
      });
      await reviewCard
        .getByRole("button", { name: "Onayla", exact: true })
        .click();
      await expect
        .poll(async () =>
          (await state(bob)).designs.some((d) => d.id === design.id),
        )
        .toBe(true);
      await go(bp, "gallery");
      const publicCard = bp.locator("article").filter({
        has: bp.getByRole("heading", {
          name: `QA Sticker ${suffix}`,
          exact: true,
        }),
      });
      await publicCard.getByRole("button", { name: "0", exact: true }).click();
      await expect
        .poll(
          async () =>
            (await state(alice)).designs.find((d) => d.id === design.id).likes,
        )
        .toBe(1);
      check(
        "Sticker preview, moderation, cross-account gallery visibility and real likes",
      );
      await go(ap, "inventory");
      const itemCard = ap.locator("article").filter({
        has: ap.getByRole("heading", {
          name: `QA Hatıra ${suffix}`,
          exact: true,
        }),
      });
      await itemCard.getByRole("button", { name: "Satışa koy" }).click();
      await ap.getByLabel("Başlangıç fiyatı (SC)").fill("10000");
      await ap.getByLabel("Hemen al fiyatı", { exact: false }).fill("20000");
      await ap.getByRole("button", { name: "İlanı yayınla" }).click();
      await expect
        .poll(async () =>
          (await state(alice)).auctions.some(
            (a) => a.item.name === `QA Hatıra ${suffix}`,
          ),
        )
        .toBe(true);
      const auction = (await state(alice)).auctions.find(
        (a) => a.item.name === `QA Hatıra ${suffix}`,
      );
      assert(auction);
      await go(bp, "market");
      const marketCard = bp.locator("article").filter({
        has: bp.getByRole("heading", {
          name: `QA Hatıra ${suffix}`,
          exact: true,
        }),
      });
      await marketCard.getByRole("button", { name: "İlanı incele" }).click();
      await bp.getByLabel("Yeni teklif", { exact: false }).fill("15000");
      await bp
        .getByRole("button", { name: "15.000 SC teklif ver", exact: true })
        .click();
      await expect
        .poll(async () => (await state(bob)).user.balance)
        .toBe(185000);
      await marketCard.getByRole("button", { name: "İlanı incele" }).click();
      bp.once("dialog", (d) => d.accept());
      await bp
        .getByRole("button", { name: "Hemen al · 20.000 SC", exact: true })
        .click();
      await expect
        .poll(async () => (await state(bob)).user.balance)
        .toBe(180000);
      assert.equal((await state(alice)).user.balance, 231345.67);
      assert(
        (await state(bob)).inventory.some((i) => i.id === auction.item.id),
      );
      check(
        "UI auction creation, escrow bid, buyout, seller commission and ownership transfer",
      );
      await go(ap, "battles");
      await ap.getByRole("button", { name: "Oda kur", exact: true }).click();
      await ap.getByLabel("Tur sayısı").selectOption("1");
      await ap
        .getByRole("button", { name: "Katılım ücretini öde ve oda kur" })
        .click();
      await expect
        .poll(async () =>
          (await state(alice)).battles.some(
            (r) => r.hostId === ua.id && r.phase === "waiting",
          ),
        )
        .toBe(true);
      const room = (await state(alice)).battles.find(
        (r) => r.hostId === ua.id && r.phase === "waiting",
      );
      assert(room);
      await go(bp, "battles");
      await bp.getByLabel("Canlı oda kodu").fill(room.code);
      await bp
        .getByRole("button", { name: "Katıl", exact: true })
        .first()
        .click();
      await expect
        .poll(
          async () =>
            (await state(alice)).battles.find((r) => r.id === room.id).phase,
          { timeout: 20000 },
        )
        .toBe("settled");
      await ap
        .getByText("Çekiliş kaydı ve seed özeti", { exact: true })
        .click();
      await ap
        .getByRole("button", { name: "Seed ve açılışları doğrula" })
        .click();
      await expect(
        ap
          .getByRole("status")
          .filter({ hasText: "Seed özeti ve tüm açılışlar" }),
      ).toBeVisible();
      await ap.screenshot({ path: ".cache/e2e-battle.png", fullPage: true });
      check(
        "Two independent browsers play a real room; seed/drops verify and rewards settle",
      );
      await ap.setViewportSize({ width: 390, height: 844 });
      await go(ap, "account");
      assert.equal(
        await ap.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await ap.screenshot({
        path: ".cache/e2e-account-mobile.png",
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      check("Authenticated mobile layout has no overflow or JavaScript errors");
      await ap.evaluate(() => navigator.serviceWorker.ready);
      await ap.waitForFunction(() => !!navigator.serviceWorker.controller);
      await ap.reload({ waitUntil: "domcontentloaded" });
      await ap
        .getByText("Sunucu bağlı", { exact: true })
        .waitFor({ state: "attached" });
      const privateCached = await ap.evaluate(async () => {
        const urls = [];
        for (const key of await caches.keys())
          for (const request of await (await caches.open(key)).keys())
            if (/(^|\/)api(\/|$)/.test(new URL(request.url).pathname))
              urls.push(request.url);
        return urls;
      });
      assert.deepEqual(privateCached, []);
      await alice.setOffline(true);
      await ap.reload({ waitUntil: "domcontentloaded" });
      await ap
        .getByText("V3 sunucusu henüz bağlı değil.", { exact: true })
        .waitFor();
      const offlineResult = await ap.evaluate(() =>
        fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
          .then(() => false)
          .catch(() => true),
      );
      assert.equal(offlineResult, true);
      await alice.setOffline(false);
      check(
        "PWA shell opens offline; API/private data is not cached and offline writes fail",
      );
      if (isolatedServer) {
        await ap.reload({ waitUntil: "domcontentloaded" });
        await ap
          .getByText("Sunucu bağlı", { exact: true })
          .waitFor({ state: "attached" });
        swRevision = 1;
        await ap.evaluate(async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          await reg.update();
        });
        const update = ap.getByRole("button", {
          name: "Yeni sürüme geç",
          exact: true,
        });
        await expect(update).toBeVisible();
        assert(
          await ap.evaluate(
            async () =>
              !!(await navigator.serviceWorker.getRegistration()).waiting,
          ),
          "Update must wait for the player.",
        );
        ap.once("dialog", (dialog) => dialog.accept());
        await Promise.all([
          ap.waitForNavigation({ waitUntil: "domcontentloaded" }),
          update.click(),
        ]);
        await ap
          .getByText("Sunucu bağlı", { exact: true })
          .waitFor({ state: "attached" });
        const keys = await ap.evaluate(() => caches.keys());
        assert(keys.includes("skyline-shell-v3-e2e-update"));
        assert(!keys.includes("skyline-shell-v3-1"));
        assert.equal(
          await ap.evaluate(() => localStorage.getItem("skyline:v1")),
          raw,
        );
        check(
          "Service worker update waits for confirmation, activates and retains the original V2 record",
        );
      }
      console.log(
        "E2E smoke tests passed. No real AI calls or production balances were used.",
      );
    } catch (error) {
      await ap
        .screenshot({ path: ".cache/e2e-failure.png", fullPage: true })
        .catch(() => {});
      throw error;
    }
  } finally {
    await browser?.close().catch(() => {});
    if (isolatedServer)
      await new Promise((r) => {
        isolatedServer.close(r);
        isolatedServer.closeAllConnections();
      });
    if (isolatedDb) await isolatedDb.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
