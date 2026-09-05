// V2 multi-skin raffle smoke: fresh browser storage, no external HTTP/MQTT,
// and no V3 API writes. An existing local Vite server can be used to save RAM.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

async function main() {
  let vite, browser, page;
  try {
    let base = process.env.RAFFLE_E2E_URL;
    if (!base) {
      const { createServer } = await import("vite");
      vite = await createServer({
        cacheDir: ".cache/raffle-vite",
        server: { host: "0.0.0.0", port: 0 },
        clearScreen: false,
      });
      await vite.listen();
      base = `http://127.0.0.1:${vite.httpServer.address().port}`;
    }
    const origin = new URL(base).origin;
    assert(
      ["127.0.0.1", "localhost"].includes(new URL(origin).hostname),
      "Raffle smoke is restricted to a local test server.",
    );
    const viteClient = await fetch(`${origin}/@vite/client`);
    assert(
      viteClient.ok &&
        /javascript/.test(viteClient.headers.get("content-type") || ""),
      "Run this test against local Vite, never a deployed game.",
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
    } else if (process.env.PW_EXECUTABLE_PATH) {
      launch = {
        ...launch,
        executablePath: process.env.PW_EXECUTABLE_PATH,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      };
    }
    browser = await chromium.launch(launch);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.origin === origin &&
        !url.pathname.startsWith("/api") &&
        route.request().method() === "GET"
        ? route.continue()
        : route.abort();
    });
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${origin}/#platform`, { waitUntil: "domcontentloaded" });
    const fixture = await page.evaluate(async () => {
      const { emptyDB, newAccount, saveDB } = await import("/src/store/db.ts");
      const { ADMIN_NAME } = await import("/src/config.ts");
      const { SKIN_MAP } = await import("/src/data/skins.ts");
      const { STICKERS } = await import("/src/data/stickers.ts");
      const skins = Object.values(SKIN_MAP).filter(
        (s) => !s.st && !s.sv && !s.sticker && !s.id.startsWith("gen-"),
      );
      const first = skins.find((s) => SKIN_MAP[`${s.id}-st`]);
      const second = skins.find(
        (s) => s.id !== first.id && s.weapon !== first.weapon,
      );
      const admin = newAccount(ADMIN_NAME),
        player = newAccount("raffle_tester");
      admin.balance = 12345.67;
      player.status = "approved";
      player.balance = 76543.21;
      admin.inventory = [
        {
          uid: "keep-admin-item",
          skinId: first.id,
          float: 0.42,
          ts: Date.now(),
          customName: "Admin original",
        },
      ];
      player.inventory = [
        {
          uid: "keep-player-item",
          skinId: second.id,
          float: 0.123,
          ts: Date.now(),
          customName: "Player original",
        },
      ];
      const db = emptyDB();
      db.users = { [admin.key]: admin, [player.key]: player };
      db.session = admin.key;
      saveDB(db);
      localStorage.setItem("skyline-tab", "admin");
      sessionStorage.setItem("skyline-adm-sec", "events");
      return {
        first: { id: first.id, name: first.name },
        second: { id: second.id, name: second.name },
        sticker: { id: STICKERS[0].id, name: STICKERS[0].name },
        admin,
        player,
      };
    });
    const saved = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("skyline:v1")));
    await page.goto(`${origin}/#legacy`, { waitUntil: "domcontentloaded" });
    const section = page.getByRole("region", {
      name: "Skin çekilişi yönetimi",
    });
    await expect(section).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Çekilişi Başlat", exact: true }),
    ).toBeDisabled();
    await section
      .getByRole("button", { name: "Ödül skini ekle", exact: true })
      .click();
    const search = page.getByPlaceholder(
      "Silah veya skin ara… (örn. AWP, Karambit, Redline)",
    );
    const choose = async (id) => {
      await search.fill(id);
      await page.locator(`[data-skin-id="${id}"]`).click();
    };
    await choose(fixture.first.id);
    await page.getByRole("button", { name: "StatTrak™", exact: true }).click();
    await page.getByRole("button", { name: "FN", exact: true }).click();
    await page
      .getByRole("button", { name: fixture.sticker.name, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ödül listesine ekle", exact: true })
      .click();
    await expect(
      page.getByText("1 / 20 skin seçildi", { exact: true }),
    ).toBeVisible();
    await choose(fixture.second.id);
    await page.getByRole("button", { name: "FT", exact: true }).click();
    const secondFloat = Number(
      (await page.getByText(/^Float: \d/).textContent()).replace("Float: ", ""),
    );
    await page
      .getByRole("button", { name: "Ödül listesine ekle", exact: true })
      .click();
    await expect(
      page.getByText("2 / 20 skin seçildi", { exact: true }),
    ).toBeVisible();
    await choose(fixture.first.id);
    await page
      .getByRole("button", { name: "Ödül listesine ekle", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Seçimi tamamla", exact: true })
      .click();
    const selectionList = section.getByRole("list", {
      name: "Seçilen çekiliş ödülleri",
    });
    await expect(selectionList.getByRole("listitem")).toHaveCount(3);
    await section
      .getByRole("button", { name: "3. ödülü listeden çıkar", exact: true })
      .click();
    await expect(selectionList.getByRole("listitem")).toHaveCount(2);
    await section
      .getByRole("button", {
        name: "1. ödülün ayarlarını düzenle",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "MW", exact: true }).click();
    const firstFloat = Number(
      (await page.getByText(/^Float: \d/).textContent()).replace("Float: ", ""),
    );
    await page
      .getByRole("button", {
        name: "Ödül değişikliklerini kaydet",
        exact: true,
      })
      .click();
    await expect(selectionList.getByRole("listitem")).toHaveCount(2);
    assert.equal(
      (await saved()).raffle,
      null,
      "Picking/editing rewards must not start a draw.",
    );
    await section.getByLabel("Süre (dakika)", { exact: true }).fill("1");
    await page.setViewportSize({ width: 390, height: 844 });
    await mkdir(".cache", { recursive: true });
    assert((await section.boundingBox()).width <= 390);
    await section
      .getByRole("button", { name: "Çekilişi Başlat", exact: true })
      .click();
    await expect
      .poll(async () => (await saved()).raffle?.skinPrizes?.length)
      .toBe(2);
    const started = await saved(),
      raffle = started.raffle;
    assert.equal(raffle.prize, 0);
    assert.equal(raffle.skinId, `${fixture.first.id}-st`);
    assert.equal(raffle.skinPrizes[0].skinOpts.float, firstFloat);
    assert.deepEqual(raffle.skinPrizes[0].skinOpts.stickers, [
      fixture.sticker.id,
    ]);
    assert.equal(raffle.skinPrizes[1].skinOpts.float, secondFloat);
    assert.equal(
      started.users[fixture.admin.key].balance,
      fixture.admin.balance,
    );
    assert.deepEqual(
      started.users[fixture.admin.key].inventory,
      fixture.admin.inventory,
    );
    console.log(
      "✓ Multi-pick, removal, per-skin edit, variant/float/sticker metadata and mobile selection",
    );

    await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem("skyline:v1"));
      db.session = key;
      localStorage.setItem("skyline:v1", JSON.stringify(db));
      localStorage.setItem("skyline-tab", "community");
    }, fixture.player.key);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page
        .getByRole("list", { name: "Çekiliş skin ödülleri" })
        .getByRole("listitem"),
    ).toHaveCount(2);
    await expect(
      page.getByText("2 skinlik ödül paketi", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Çekilişe Katıl", exact: true })
      .click();
    await expect
      .poll(async () => Object.keys((await saved()).raffle.participants).length)
      .toBe(1);
    await page.clock.setFixedTime(new Date(raffle.endsAt + 90000));
    await expect
      .poll(
        async () => (await saved()).users[fixture.player.key].inventory.length,
        { timeout: 20000 },
      )
      .toBe(3);
    const done = await saved(),
      winner = done.users[fixture.player.key];
    assert.equal(done.raffle.winner.key, fixture.player.key);
    assert.equal(winner.balance, fixture.player.balance);
    assert.deepEqual(
      winner.inventory.find((i) => i.uid === "keep-player-item"),
      fixture.player.inventory[0],
    );
    assert.equal(done.users[fixture.admin.key].balance, fixture.admin.balance);
    assert.deepEqual(
      done.users[fixture.admin.key].inventory,
      fixture.admin.inventory,
    );
    const rewards = done.deposits.filter((d) =>
      d.id.startsWith(`raffle:${raffle.id}`),
    );
    assert.equal(rewards.length, 2);
    assert(
      rewards.every((d) => d.amount === 0 && d.userKey === fixture.player.key),
    );
    assert.equal(
      winner.inventory.find(
        (i) =>
          i.uid !== "keep-player-item" && i.skinId === `${fixture.first.id}-st`,
      ).float,
      firstFloat,
    );
    assert.deepEqual(
      winner.inventory.find((i) => i.skinId === `${fixture.first.id}-st`)
        .stickers,
      [fixture.sticker.id],
    );
    assert.equal(
      winner.inventory.find(
        (i) => i.uid !== "keep-player-item" && i.skinId === fixture.second.id,
      ).float,
      secondFloat,
    );
    await expect(
      page.getByText("2 skinin tamamını kazandı!", { exact: true }),
    ).toBeVisible();

    console.log(
      "✓ Both skins reached the single winner; existing items and fractional SC stayed unchanged",
    );
    const uids = winner.inventory.map((i) => i.uid).sort();
    await page.clock.setFixedTime(new Date(raffle.endsAt + 135000));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("2 skinin tamamını kazandı!", { exact: true }),
    ).toBeVisible();
    assert.deepEqual(
      (await saved()).users[fixture.player.key].inventory
        .map((i) => i.uid)
        .sort(),
      uids,
    );
    assert.equal(
      (await saved()).deposits.filter((d) =>
        d.id.startsWith(`raffle:${raffle.id}`),
      ).length,
      2,
    );
    assert.deepEqual(errors, []);
    console.log(
      "✓ Reload/repeated draw checks do not duplicate rewards. No public sync or real account data used.",
    );
  } catch (error) {
    await mkdir(".cache", { recursive: true });
    await page
      ?.screenshot({ path: ".cache/raffle-failure.png", timeout: 5000 })
      .catch(() => {});
    throw error;
  } finally {
    await browser?.close().catch(() => {});
    await vite?.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
