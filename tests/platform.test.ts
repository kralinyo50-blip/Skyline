import { before, after, beforeEach, test } from "node:test";
import { PNG } from "pngjs";
import assert from "node:assert/strict";
import { createServer, request as httpRequest, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { database, migrate, first, type Database } from "../server/db";
import { wallet, addCatalogItem } from "../server/core";
import {
  createQuote,
  queueGeneration,
  processOneJob,
  failJob,
  openAiProvider,
  validatePng,
  type AiSettings,
} from "../server/ai";
import {
  createAuction,
  bidAuction,
  settleAuction,
  cancelAuction,
} from "../server/market";
import {
  createBattle,
  joinBattle,
  cancelBattle,
  battleResult,
} from "../server/battles";
import {
  requestMigration,
  approveMigration,
  createClan,
  clanAction,
  claimCollection,
  submitDesign,
  galleryAction,
  approveDesign,
} from "../server/social";
import { settleDue, platformState } from "../server/state";
import { createApp } from "../server/app";
import { hashPassword, createSession } from "../server/auth";
import {
  studioPrice,
  type StudioInput,
  type Catalog,
  type OnlineUser,
} from "../shared/platform";
const catalog: Catalog = {
  version: "test",
  skins: [
    {
      id: "ak-test",
      name: "Test AK",
      weapon: "AK-47",
      price: 100,
      rarity: "milspec",
    },
    {
      id: "awp-test",
      name: "Test AWP",
      weapon: "AWP",
      price: 200,
      rarity: "restricted",
    },
  ],
  cases: [
    {
      id: "test-case",
      name: "Test kasası",
      price: 20,
      drops: [
        { id: "ak-test", weight: 4 },
        { id: "awp-test", weight: 1 },
      ],
    },
  ],
  collections: [
    {
      id: "test-album",
      name: "Test",
      description: "Test",
      reward: "Test rozeti",
      ids: ["ak-test", "awp-test"],
    },
  ],
};
const input: StudioInput = {
  name: "Neon Test",
  prompt: "Mor metal üzerinde ince neon çizgiler. Karanlık bir arka plan.",
  weapon: "AK-47",
  style: "Neon",
  quality: "medium",
  details: ["Metal gravür"],
};
const ai: AiSettings = {
  enabled: true,
  key: "unit-test-only-not-a-real-key",
  model: "gpt-image-1",
  userDaily: 3,
  globalDaily: 20,
};
const png = PNG.sync.write(new PNG({ width: 1, height: 1 }));
let db: Database, server: Server, url: string;
let a: OnlineUser, b: OnlineUser, c: OnlineUser, admin: OnlineUser;
let passwordHash: string;
before(async () => {
  db = await database();
  await migrate(db);
  passwordHash = await hashPassword("correct-test-password-123");
  server = createServer(
    createApp(db, catalog, {
      production: false,
      publicOrigin: "http://unit.test",
      adminName: "operator",
      ai,
    }),
  );
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  assert(address && typeof address !== "string");
  url = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await db.close();
});
async function account(name: string, role: "admin" | "player" = "player") {
  const user: OnlineUser = {
    id: randomUUID(),
    username: name,
    role,
    status: "approved",
    balance: 0,
    migratedAt: null,
  };
  await db.query(
    "INSERT INTO accounts(id,username,password_hash,role,status,created_at) VALUES($1,$2,$3,$4,$5,$6)",
    [user.id, name, passwordHash, role, "approved", Date.now()],
  );
  return user;
}
beforeEach(async () => {
  await db.query("TRUNCATE accounts CASCADE");
  await db.query("TRUNCATE rate_limits");
  a = await account("alice");
  b = await account("bob");
  c = await account("carol");
  admin = await account("operator", "admin");
});
async function balance(user: OnlineUser) {
  return Number(
    (await first(db, "SELECT balance FROM accounts WHERE id=$1", [user.id]))!
      .balance,
  );
}
async function fund(user: OnlineUser, value = 100000) {
  await db.tx((s) =>
    wallet(s, user.id, value, `fixture:${randomUUID()}`, "Test fixture"),
  );
}
async function tokenFor(user: OnlineUser) {
  return db.tx((s) => createSession(s, user.id));
}
async function post(
  path: string,
  body: unknown,
  token?: string,
  origin = "http://unit.test",
) {
  return fetch(`${url}/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(token ? { Cookie: `skyline_session=${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
test("tariff is deterministic; text/detail/quality costs are explicit, not resale value", () => {
  const basic = studioPrice({
    ...input,
    prompt: "Siyah metal üzerinde ince bir mor desen",
    details: [],
  });
  assert.equal(basic.total, 10000);
  assert.equal(
    studioPrice({
      ...input,
      prompt: "Siyah metal üzerinde ince bir mor desen",
      details: ["Metal gravür"],
    }).total,
    12500,
  );
  assert.equal(
    studioPrice({
      ...input,
      prompt: "Siyah metal üzerinde ince bir mor desen",
      details: [],
      quality: "high",
    }).total,
    25000,
  );
  assert.throws(() =>
    studioPrice({ ...input, details: ["Metal gravür", "Metal gravür"] }),
  );
});
test("AI disabled: cannot debit or create a paid job", async () => {
  await fund(a);
  const q = await db.tx((s) => createQuote(s, a, input, Date.now()));
  await assert.rejects(
    db.tx((s) =>
      queueGeneration(
        s,
        a,
        { quoteId: q.id },
        { ...ai, enabled: false },
        Date.now(),
      ),
    ),
    /yapılandırılmadı/,
  );
  assert.equal(await balance(a), 100000);
  assert.equal((await db.query("SELECT * FROM ai_jobs")).rows.length, 0);
});
test("AI quote is owner-bound, expiring, and cannot accept forged price fields", async () => {
  await fund(a);
  await fund(b);
  const now = Date.now(),
    q = await db.tx((s) => createQuote(s, a, input, now));
  await assert.rejects(
    db.tx((s) => queueGeneration(s, b, { quoteId: q.id }, ai, now)),
    /bulunamadı/,
  );
  await assert.rejects(
    db.tx((s) => queueGeneration(s, a, { quoteId: q.id, price: 0 }, ai, now)),
  );
  await assert.rejects(
    db.tx((s) =>
      queueGeneration(s, a, { quoteId: q.id }, ai, now + 16 * 60000),
    ),
    /süresi/,
  );
  assert.equal(await balance(a), 100000);
});
test("duplicate AI requests/workers debit once, call provider once, persist one image and inventory item", async () => {
  await fund(a);
  const q = await db.tx((s) => createQuote(s, a, input, Date.now()));
  const jobs = await Promise.all(
    [1, 2, 3].map(() =>
      db.tx((s) => queueGeneration(s, a, { quoteId: q.id }, ai, Date.now())),
    ),
  );
  assert.equal(new Set(jobs.map((j) => j.id)).size, 1);
  let calls = 0;
  const provider = {
    generate: async () => {
      calls++;
      return png;
    },
  };
  await Promise.all([
    processOneJob(db, provider, ai),
    processOneJob(db, provider, ai),
  ]);
  assert.equal(calls, 1);
  assert.equal(await balance(a), 100000 - q.price.total);
  assert.equal((await db.query("SELECT * FROM items")).rows.length, 1);
  const media = (await db.query("SELECT * FROM media")).rows[0];
  assert.deepEqual(Buffer.from(media.bytes), png);
  const guest = await fetch(`${url}/api/images/${media.design_id}`);
  assert.equal(guest.status, 404);
  const owner = await fetch(`${url}/api/images/${media.design_id}`, {
    headers: { Cookie: `skyline_session=${await tokenFor(a)}` },
  });
  assert.equal(owner.status, 200);
  assert.match(owner.headers.get("content-type") || "", /image\/png/);
});
test("provider failure, stale recovery, and repeated refunds cannot create extra SC", async () => {
  await fund(a);
  const q = await db.tx((s) => createQuote(s, a, input, Date.now()));
  const job = await db.tx((s) =>
    queueGeneration(s, a, { quoteId: q.id }, ai, Date.now()),
  );
  await processOneJob(
    db,
    {
      generate: async () => {
        throw new Error("simulated timeout");
      },
    },
    ai,
  );
  await db.tx((s) => failJob(s, job.id, "again", Date.now()));
  assert.equal(await balance(a), 100000);
  assert.equal(
    (await db.query("SELECT * FROM ledger WHERE cause LIKE 'ai-refund:%'")).rows
      .length,
    1,
  );
  assert.equal((await db.query("SELECT * FROM items")).rows.length, 0);
  const q2 = await db.tx((s) => createQuote(s, a, input, Date.now()));
  const job2 = await db.tx((s) =>
    queueGeneration(s, a, { quoteId: q2.id }, ai, Date.now()),
  );
  await db.query(
    "UPDATE ai_jobs SET status='running',started_at=$1 WHERE id=$2",
    [Date.now() - 11 * 60000, job2.id],
  );
  await db.tx((s) => settleDue(s, Date.now()));
  assert.equal(await balance(a), 100000);
});
test("auction escrow refunds outbid player and settlement transfers ownership exactly once", async () => {
  await fund(b, 1000);
  await fund(c, 1000);
  const item = await db.tx((s) =>
    addCatalogItem(s, a.id, "ak-test", "test-item"),
  );
  const auction = await db.tx((s) =>
    createAuction(
      s,
      a,
      { itemId: item, minimum: 100, buyout: 500, hours: 6 },
      Date.now(),
    ),
  );
  await assert.rejects(
    db.tx((s) =>
      createAuction(
        s,
        a,
        { itemId: item, minimum: 1, buyout: null, hours: 6 },
        Date.now(),
      ),
    ),
    /kilitli/,
  );
  await db.tx((s) =>
    bidAuction(s, b, { id: auction.id, amount: 100 }, Date.now()),
  );
  assert.equal(await balance(b), 900);
  await db.tx((s) =>
    bidAuction(s, c, { id: auction.id, amount: 200 }, Date.now()),
  );
  assert.equal(await balance(b), 1000);
  assert.equal(await balance(c), 800);
  await assert.rejects(
    db.tx((s) => cancelAuction(s, a, auction.id, Date.now())),
    /iptal/,
  );
  const row = (await first(db, "SELECT * FROM auctions WHERE id=$1", [
    auction.id,
  ]))!;
  await db.tx((s) => settleAuction(s, row, Date.now()));
  await db.tx((s) => settleDue(s, Date.now() + 7 * 3600000));
  assert.equal(await balance(a), 190);
  assert.equal(
    (await first(db, "SELECT * FROM items WHERE id=$1", [item]))!.owner_id,
    c.id,
  );
  assert.equal(
    (await first(db, "SELECT * FROM items WHERE id=$1", [item]))!.locked_by,
    null,
  );
});
test("failed and competing bids leave no unbacked/refunded escrow", async () => {
  await fund(b, 1000);
  await fund(c, 50);
  const item = await db.tx((s) =>
    addCatalogItem(s, a.id, "ak-test", "bid-test"),
  );
  const auction = await db.tx((s) =>
    createAuction(
      s,
      a,
      { itemId: item, minimum: 100, buyout: null, hours: 6 },
      Date.now(),
    ),
  );
  await db.tx((s) =>
    bidAuction(s, b, { id: auction.id, amount: 100 }, Date.now()),
  );
  await assert.rejects(
    db.tx((s) => bidAuction(s, c, { id: auction.id, amount: 200 }, Date.now())),
    /Yetersiz/,
  );
  assert.equal(await balance(b), 900);
  assert.equal(await balance(c), 50);
  assert.equal(
    Number(
      (await first(db, "SELECT highest FROM auctions WHERE id=$1", [
        auction.id,
      ]))!.highest,
    ),
    100,
  );
  await assert.rejects(
    db.tx((s) => bidAuction(s, a, { id: auction.id, amount: 300 }, Date.now())),
    /Kendi/,
  );
});
test("buyout and moderation cancellation release locks and refund the right owner", async () => {
  await fund(b, 1000);
  const item = await db.tx((s) => addCatalogItem(s, a.id, "ak-test", "buyout"));
  const auction = await db.tx((s) =>
    createAuction(
      s,
      a,
      { itemId: item, minimum: 100, buyout: 500, hours: 6 },
      Date.now(),
    ),
  );
  await db.tx((s) =>
    bidAuction(s, b, { id: auction.id, amount: 500, buyNow: true }, Date.now()),
  );
  assert.equal(await balance(a), 475);
  assert.equal(await balance(b), 500);
  await assert.rejects(
    db.tx((s) =>
      bidAuction(
        s,
        b,
        { id: auction.id, amount: 500, buyNow: true },
        Date.now(),
      ),
    ),
    /sona erdi/,
  );
});
test("migration never trusts claimed money, preserves item metadata, and cannot be imported twice", async () => {
  const snapshot = {
    name: "alice",
    balance: 900000000,
    inventory: [
      {
        uid: "v2-1",
        skinId: "ak-test",
        float: 0.12345,
        customName: "Eski eşyam",
        stickers: [],
      },
      { uid: "v2-2", skinId: "unknown-custom" },
    ],
  };
  const req = await db.tx((s) => requestMigration(s, a, snapshot, Date.now()));
  assert.equal(await balance(a), 0);
  await assert.rejects(
    db.tx((s) =>
      approveMigration(
        s,
        a,
        {
          id: req.id,
          balance: 1234,
          itemUids: ["v2-1"],
          note: "independent verified record",
          confirmed: true,
        },
        catalog,
        Date.now(),
      ),
    ),
    /yetkilisine/,
  );
  await db.tx((s) =>
    approveMigration(
      s,
      admin,
      {
        id: req.id,
        balance: 1234,
        itemUids: ["v2-1"],
        note: "independent verified record",
        confirmed: true,
      },
      catalog,
      Date.now(),
    ),
  );
  assert.equal(await balance(a), 1234);
  const stored = (await first(
    db,
    "SELECT snapshot,verified FROM migrations WHERE id=$1",
    [req.id],
  ))!;
  assert.deepEqual(stored.snapshot, snapshot);
  assert.equal(stored.verified.itemUids.length, 1);
  const item = (await db.query("SELECT * FROM items WHERE owner_id=$1", [a.id]))
    .rows[0];
  assert.equal(item.metadata.float, 0.12345);
  assert.equal(item.metadata.customName, "Eski eşyam");
  await assert.rejects(
    db.tx((s) =>
      approveMigration(
        s,
        admin,
        {
          id: req.id,
          balance: 1234,
          itemUids: ["v2-1"],
          note: "independent verified record",
          confirmed: true,
        },
        catalog,
        Date.now(),
      ),
    ),
    /zaten/,
  );
  assert.equal(await balance(a), 1234);
});
test("clan invites are private, requests require leader authority, collections award once", async () => {
  const clan = await db.tx((s) =>
    createClan(s, a, { name: "Test klanı", tag: "TEST", emblem: "🛡️" }),
  );
  await db.tx((s) => clanAction(s, b, { action: "request", clanId: clan.id }));
  await assert.rejects(
    db.tx((s) => clanAction(s, c, { action: "accept", userId: b.id })),
    /üye/,
  );
  const guest = await db.tx((s) =>
    platformState(s, c, catalog, ai, Date.now()),
  );
  assert.equal(guest.clans[0].code, undefined);
  assert.equal(guest.clans[0].requests, undefined);
  await db.tx((s) => clanAction(s, a, { action: "accept", userId: b.id }));
  await assert.rejects(
    db.tx((s) => clanAction(s, a, { action: "leave" })),
    /liderliği/,
  );
  await assert.rejects(
    db.tx((s) => claimCollection(s, a, "test-album", catalog, Date.now())),
    /tüm/,
  );
  await db.tx(async (s) => {
    await addCatalogItem(s, a.id, "ak-test", "album-a");
    await addCatalogItem(s, a.id, "awp-test", "album-b");
  });
  await db.tx((s) => claimCollection(s, a, "test-album", catalog, Date.now()));
  await db.tx((s) => claimCollection(s, a, "test-album", catalog, Date.now()));
  assert.equal(
    (await db.query("SELECT * FROM collection_claims")).rows.length,
    1,
  );
});
test("gallery is moderated, has unique likes, and does not accept arbitrary SVG/URLs", async () => {
  const design = await db.tx((s) =>
    submitDesign(
      s,
      a,
      {
        kind: "sticker",
        title: "Test sticker",
        description: "Test",
        payload: {
          text: "TEST",
          shape: "circle",
          color: "#ff9900",
          gradient: "#4400ff",
        },
      },
      catalog,
      Date.now(),
    ),
  );
  await assert.rejects(
    db.tx((s) =>
      galleryAction(s, b, { action: "like", id: design.id }, Date.now()),
    ),
    /yayınlanmış/,
  );
  await db.tx((s) =>
    approveDesign(s, admin, design.id, "approved", Date.now()),
  );
  await db.tx((s) =>
    galleryAction(s, b, { action: "like", id: design.id }, Date.now()),
  );
  await db.tx((s) =>
    galleryAction(s, b, { action: "like", id: design.id }, Date.now()),
  );
  assert.equal((await db.query("SELECT * FROM likes")).rows.length, 1);
  await assert.rejects(
    db.tx((s) =>
      submitDesign(
        s,
        a,
        {
          kind: "sticker",
          title: "Invalid",
          description: "",
          payload: {
            text: "X",
            shape: "circle",
            color: "url(javascript:bad)",
            gradient: "#ffffff",
          },
        },
        catalog,
        Date.now(),
      ),
    ),
  );
});
test("real rooms reserve all players, hide future results and seed, settle 2v2 once", async () => {
  const d = await account("dave");
  for (const user of [a, b, c, d]) await fund(user, 1000);
  const now = Date.now(),
    room = await db.tx((s) =>
      createBattle(
        s,
        a,
        { caseId: "test-case", rounds: 2, capacity: 4 },
        catalog,
        now,
      ),
    );
  for (const user of [b, c, d])
    await db.tx((s) => joinBattle(s, user, room.code, catalog, now));
  const hidden = await db.tx((s) => platformState(s, null, catalog, ai, now));
  assert.equal(hidden.battles[0].seed, undefined);
  assert.equal(hidden.battles[0].revealed.length, 0);
  assert.equal(hidden.battles[0].winnerTeam, undefined);
  for (const user of [a, b, c, d]) assert.equal(await balance(user), 960);
  await db.tx((s) => settleDue(s, now + 20000));
  await db.tx((s) => settleDue(s, now + 20000));
  const finished = await db.tx((s) =>
    platformState(s, a, catalog, ai, now + 20000),
  );
  const result = finished.battles[0];
  assert.equal(result.phase, "settled");
  assert(result.seed);
  const verify = battleResult(
    result.seed,
    catalog.cases[0],
    result.members.map((m) => ({ user_id: m.id, slot: m.slot })),
    2,
    catalog,
  );
  assert.deepEqual(verify.revealed, result.revealed);
  assert.equal(verify.winnerTeam, result.winnerTeam);
  const items = (await db.query("SELECT * FROM items")).rows;
  assert.equal(items.length, 8);
  const winners = result.members.filter(
    (m) => m.slot % 2 === result.winnerTeam,
  );
  assert(items.every((i) => winners.some((w) => w.id === i.owner_id)));
});
test("cancelled/expired waiting rooms refund every member exactly once", async () => {
  await fund(a, 1000);
  await fund(b, 1000);
  const now = Date.now();
  const room = await db.tx((s) =>
    createBattle(
      s,
      a,
      { caseId: "test-case", rounds: 1, capacity: 4 },
      catalog,
      now,
    ),
  );
  await db.tx((s) => joinBattle(s, b, room.code, catalog, now));
  const record = (await first(db, "SELECT * FROM battles WHERE id=$1", [
    room.id,
  ]))!;
  await db.tx((s) => cancelBattle(s, record, now));
  await db.tx((s) => settleDue(s, now + 3600000));
  assert.equal(await balance(a), 1000);
  assert.equal(await balance(b), 1000);
});
test("API rejects CSRF, forged admin roles, unauthenticated transfers and pending accounts", async () => {
  let result = await post("auth/register", {
    username: "evil",
    password: "correct-test-password-123",
    role: "admin",
  });
  assert.equal(result.status, 400);
  result = await post("auth/register", {
    username: "operator",
    password: "correct-test-password-123",
  });
  assert.equal(result.status, 400);
  result = await post(
    "auth/login",
    { username: "alice", password: "correct-test-password-123" },
    undefined,
    "https://attacker.test",
  );
  assert.equal(result.status, 403);
  result = await post(
    "admin/credit",
    {
      id: a.id,
      amount: 100,
      operationId: randomUUID(),
      note: "untrusted client",
    },
    await tokenFor(a),
  );
  assert.equal(result.status, 403);
  result = await post("ai/quote", input);
  assert.equal(result.status, 401);
  result = await post("auth/register", {
    username: "pending",
    password: "correct-test-password-123",
  });
  assert.equal(result.status, 201);
  assert.match(result.headers.get("set-cookie") || "", /HttpOnly/);
  const cookie = result.headers.get("set-cookie")!.split(";")[0];
  result = await fetch(`${url}/api/ai/quote`, {
    method: "POST",
    headers: {
      Origin: "http://unit.test",
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(input),
  });
  assert.equal(result.status, 403);
  const state = await fetch(`${url}/api/state`);
  const text = await state.text();
  assert(!text.includes("password_hash"));
  assert(!text.includes("unit-test-only-not-a-real-key"));
});
test("concurrent bidders cannot double-spend or leave a seller paid twice", async () => {
  await fund(b, 1000);
  await fund(c, 1000);
  const item = await db.tx((s) =>
    addCatalogItem(s, a.id, "ak-test", "concurrent"),
  );
  const auction = await db.tx((s) =>
    createAuction(
      s,
      a,
      { itemId: item, minimum: 100, buyout: null, hours: 6 },
      Date.now(),
    ),
  );
  await Promise.allSettled([
    db.tx((s) => bidAuction(s, b, { id: auction.id, amount: 100 }, Date.now())),
    db.tx((s) => bidAuction(s, c, { id: auction.id, amount: 200 }, Date.now())),
  ]);
  const current = (await first(db, "SELECT * FROM auctions WHERE id=$1", [
    auction.id,
  ]))!;
  assert.equal(Number(current.highest), 200);
  assert.equal(
    (await balance(b)) + (await balance(c)) + Number(current.highest),
    2000,
  );
  await db.tx((s) => settleDue(s, Date.now() + 7 * 3600000));
  await db.tx((s) => settleDue(s, Date.now() + 7 * 3600000));
  assert.equal(
    (await balance(a)) + (await balance(b)) + (await balance(c)),
    1990,
  );
});
test("fractional SC survives escrow and refund; balances reserve space for future refunds", async () => {
  await fund(b, 1234.67);
  const item = await db.tx((s) =>
    addCatalogItem(s, a.id, "ak-test", "fractional"),
  );
  const auction = await db.tx((s) =>
    createAuction(
      s,
      a,
      { itemId: item, minimum: 100, buyout: null, hours: 6 },
      Date.now(),
    ),
  );
  await db.tx((s) =>
    bidAuction(s, b, { id: auction.id, amount: 100 }, Date.now()),
  );
  assert.equal(await balance(b), 1134.67);
  await db.tx((s) =>
    settleAuction(
      s,
      {
        id: auction.id,
        seller_id: a.id,
        item_id: item,
        highest: 100,
        bidder_id: b.id,
        status: "active",
      },
      Date.now(),
      true,
    ),
  );
  assert.equal(await balance(b), 1234.67);
  await fund(c, 9_000_000_000_000);
  const room = await db.tx((s) =>
    createBattle(
      s,
      c,
      { caseId: "test-case", rounds: 1, capacity: 4 },
      catalog,
      Date.now(),
    ),
  );
  await assert.rejects(
    db.tx((s) =>
      wallet(s, c.id, 1, "test-overflow", "must reserve refund capacity"),
    ),
    /Bloke/,
  );
  await db.tx(async (s) =>
    cancelBattle(
      s,
      (await first(s, "SELECT * FROM battles WHERE id=$1", [room.id]))!,
      Date.now(),
    ),
  );
  assert.equal(await balance(c), 9_000_000_000_000);
});
test("AI budget counts failed attempts and stale jobs never restart the provider", async () => {
  await fund(a);
  const limited = { ...ai, userDaily: 1 };
  const quote = await db.tx((s) => createQuote(s, a, input, Date.now()));
  await db.tx((s) =>
    queueGeneration(s, a, { quoteId: quote.id }, limited, Date.now()),
  );
  let calls = 0;
  await processOneJob(
    db,
    {
      generate: async () => {
        calls++;
        throw new Error("provider down");
      },
    },
    limited,
  );
  const next = await db.tx((s) => createQuote(s, a, input, Date.now()));
  await assert.rejects(
    db.tx((s) =>
      queueGeneration(s, a, { quoteId: next.id }, limited, Date.now()),
    ),
    /Günlük/,
  );
  await processOneJob(
    db,
    {
      generate: async () => {
        calls++;
        return png;
      },
    },
    limited,
  );
  assert.equal(calls, 1);
  assert.equal(await balance(a), 100000);
});
test("OpenAI adapter moderates first, requests real PNG output, and does not retry paid requests", async () => {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const fake = async (url: unknown, options?: RequestInit) => {
    const address = String(url);
    requests.push({ url: address, body: JSON.parse(String(options?.body)) });
    return new Response(
      JSON.stringify(
        address.endsWith("/moderations")
          ? { results: [{ flagged: false }] }
          : { data: [{ b64_json: png.toString("base64") }] },
      ),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  assert.deepEqual(
    await openAiProvider(ai, fake as typeof fetch).generate(input),
    png,
  );
  assert.deepEqual(
    requests.map((r) => r.url),
    [
      "https://api.openai.com/v1/moderations",
      "https://api.openai.com/v1/images/generations",
    ],
  );
  assert.equal(requests[1].body.n, 1);
  assert.equal(requests[1].body.output_format, "png");
  assert.equal(requests[1].body.quality, "medium");
  let calls = 0;
  const rejected = async () => {
    calls++;
    return new Response(JSON.stringify({ results: [{ flagged: true }] }));
  };
  await assert.rejects(
    openAiProvider(ai, rejected as typeof fetch).generate(input),
    /denetimini/,
  );
  assert.equal(calls, 1);
  let paid = 0;
  const timeout = async (url: unknown) => {
    if (String(url).endsWith("/moderations"))
      return new Response(JSON.stringify({ results: [{ flagged: false }] }));
    paid++;
    throw new Error("timeout");
  };
  await assert.rejects(
    openAiProvider(ai, timeout as typeof fetch).generate(input),
  );
  assert.equal(paid, 1);
  const damaged = Buffer.from(png);
  damaged[damaged.length - 1] ^= 1;
  assert.throws(() => validatePng(damaged), /bozuk/);
});
test("owner cannot sell an unapproved AI design; rejection cancels active auctions safely", async () => {
  await fund(a);
  await fund(b, 1000);
  const quote = await db.tx((s) => createQuote(s, a, input, Date.now()));
  await db.tx((s) =>
    queueGeneration(s, a, { quoteId: quote.id }, ai, Date.now()),
  );
  await processOneJob(db, { generate: async () => png }, ai);
  const item = (await db.query("SELECT * FROM items")).rows[0];
  await assert.rejects(
    db.tx((s) =>
      createAuction(
        s,
        a,
        { itemId: item.id, minimum: 100, buyout: null, hours: 6 },
        Date.now(),
      ),
    ),
    /onayı/,
  );
  await db.tx((s) =>
    galleryAction(s, a, { action: "publish", id: item.design_id }, Date.now()),
  );
  await db.tx((s) =>
    approveDesign(s, admin, item.design_id, "approved", Date.now()),
  );
  const auction = await db.tx((s) =>
    createAuction(
      s,
      a,
      { itemId: item.id, minimum: 100, buyout: null, hours: 6 },
      Date.now(),
    ),
  );
  await db.tx((s) =>
    bidAuction(s, b, { id: auction.id, amount: 100 }, Date.now()),
  );
  const result = await post(
    "admin/design",
    { id: item.design_id, status: "rejected" },
    await tokenFor(admin),
  );
  assert.equal(result.status, 200);
  assert.equal(await balance(b), 1000);
  assert.equal(
    (await first(db, "SELECT locked_by FROM items WHERE id=$1", [item.id]))!
      .locked_by,
    null,
  );
});

test("upper-range migration keeps cents exact and rejects sub-cent or excess credit", async () => {
  const now = Date.now();
  const migration = await db.tx((s) =>
    requestMigration(
      s,
      a,
      { name: "alice", balance: 8_999_999_999_999.99, inventory: [] },
      now,
    ),
  );
  await db.tx((s) =>
    approveMigration(
      s,
      admin,
      {
        id: migration.id,
        balance: 8_999_999_999_999.99,
        itemUids: [],
        note: "Independent high-range fixture verification",
        confirmed: true,
      },
      catalog,
      now,
    ),
  );
  assert.equal(await balance(a), 8_999_999_999_999.99);
  await db.tx((s) =>
    wallet(s, a.id, 0.01, "test:last-cent", "Last valid cent"),
  );
  assert.equal(await balance(a), 9_000_000_000_000);
  await assert.rejects(
    db.tx((s) => wallet(s, a.id, 0.01, "test:excess-cent", "Must reject")),
    /Bakiye sınırı/,
  );
  await assert.rejects(
    db.tx((s) => wallet(s, a.id, -0.001, "test:sub-cent", "Must reject")),
    /ondalık/,
  );
  assert.equal(await balance(a), 9_000_000_000_000);
});

test("late provider completion cannot mint after the job has been refunded", async () => {
  await fund(a);
  const quote = await db.tx((s) => createQuote(s, a, input, Date.now()));
  const job = await db.tx((s) =>
    queueGeneration(s, a, { quoteId: quote.id }, ai, Date.now()),
  );
  let finish!: (value: Buffer) => void, started!: () => void;
  const ready = new Promise<void>((resolve) => (started = resolve));
  const task = processOneJob(
    db,
    {
      generate: async () => {
        started();
        return new Promise<Buffer>((resolve) => (finish = resolve));
      },
    },
    ai,
  );
  await ready;
  await db.tx((s) => failJob(s, job.id, "stale job recovery", Date.now()));
  finish(png);
  await task;
  assert.equal(await balance(a), 100000);
  assert.equal((await db.query("SELECT * FROM items")).rows.length, 0);
  assert.equal((await db.query("SELECT * FROM media")).rows.length, 0);
});

test("preview cookies are partitioned; production uses secure Lax cookies and rejects foreign Origin", async () => {
  const send = (
    target: string,
    options: { method: string; headers: Record<string, string>; body: string },
  ) =>
    new Promise<Response>((resolve, reject) => {
      const req = httpRequest(
        target,
        { method: options.method, headers: options.headers },
        (res) => {
          res.resume();
          res.on("end", () => {
            const headers = new Headers();
            for (const [key, value] of Object.entries(res.headers))
              if (value !== undefined)
                headers.set(
                  key,
                  Array.isArray(value) ? value.join(",") : value,
                );
            resolve(new Response(null, { status: res.statusCode, headers }));
          });
        },
      );
      req.on("error", reject);
      req.end(options.body);
    });
  const preview = createServer(
    createApp(db, catalog, { production: false, ai }),
  );
  const production = createServer(
    createApp(db, catalog, {
      production: true,
      publicOrigin: "https://game.example",
      ai,
    }),
  );
  try {
    for (const instance of [preview, production])
      await new Promise<void>((r) => instance.listen(0, "127.0.0.1", r));
    const address = (instance: Server) =>
      `http://127.0.0.1:${(instance.address() as { port: number }).port}`;
    const login = { username: "alice", password: "correct-test-password-123" };
    const p = await send(`${address(preview)}/api/auth/login`, {
      method: "POST",
      headers: {
        Host: "test.e2b.app",
        Origin: "https://test.e2b.app",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(login),
    });
    assert.equal(p.status, 200);
    assert.match(p.headers.get("set-cookie") || "", /HttpOnly/);
    assert.match(p.headers.get("set-cookie") || "", /Secure/);
    assert.match(p.headers.get("set-cookie") || "", /Partitioned/);
    assert.match(p.headers.get("set-cookie") || "", /SameSite=None/);
    const good = await send(`${address(production)}/api/auth/login`, {
      method: "POST",
      headers: {
        Origin: "https://game.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(login),
    });
    assert.equal(good.status, 200);
    assert.match(good.headers.get("set-cookie") || "", /SameSite=Lax/);
    assert.match(good.headers.get("set-cookie") || "", /Secure/);
    assert(!good.headers.get("set-cookie")?.includes("Partitioned"));
    const foreign = await send(`${address(preview)}/api/auth/login`, {
      method: "POST",
      headers: {
        Host: "test.e2b.app",
        Origin: "https://foreign.e2b.app",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(login),
    });
    assert.equal(foreign.status, 403);
  } finally {
    for (const instance of [preview, production])
      await new Promise<void>((r) => instance.close(() => r()));
  }
});

test("the same legacy item cannot be imported by a second account; conflicts roll back its SC", async () => {
  const now = Date.now();
  const snapshot = {
    name: "alice",
    balance: 100,
    inventory: [{ uid: "shared-legacy-uid", skinId: "ak-test" }],
  };
  const one = await db.tx((s) => requestMigration(s, a, snapshot, now));
  await db.tx((s) =>
    approveMigration(
      s,
      admin,
      {
        id: one.id,
        balance: 100,
        itemUids: ["shared-legacy-uid"],
        note: "Independent source ownership verified",
        confirmed: true,
      },
      catalog,
      now,
    ),
  );
  const two = await db.tx((s) =>
    requestMigration(s, b, { ...snapshot, name: "bob" }, now),
  );
  await assert.rejects(
    db.tx((s) =>
      approveMigration(
        s,
        admin,
        {
          id: two.id,
          balance: 100,
          itemUids: ["shared-legacy-uid"],
          note: "Duplicate source must not be minted",
          confirmed: true,
        },
        catalog,
        now,
      ),
    ),
    /daha önce aktarılmış/,
  );
  assert.equal(await balance(b), 0);
  assert.equal(
    (await first(db, "SELECT status FROM migrations WHERE id=$1", [two.id]))!
      .status,
    "pending",
  );
  assert.equal((await db.query("SELECT * FROM items")).rows.length, 1);
});
