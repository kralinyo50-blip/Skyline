import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SKIN_RAFFLE_PRIZES,
  raffleSkins,
  raffleSkinLabel,
  prepareRaffleSkins,
  mergeRafflePrizes,
  rafflePayouts,
  missingRafflePayouts,
  type RaffleState,
  type RaffleSkinSelection,
} from "../src/store/raffle";

const catalog = {
  ak: { id: "ak", weapon: "AK-47", name: "Birinci" },
  "awp-st": { id: "awp-st", weapon: "AWP", name: "İkinci" },
  sticker: { id: "sticker", weapon: "Sticker", name: "Etiket", sticker: true },
};
const lookup = (id: string) => catalog[id as keyof typeof catalog];
const sticker = (id: string) => id.startsWith("sticker-");
const selection: RaffleSkinSelection[] = [
  { skinId: "ak", skinOpts: { float: 0.042, stickers: ["sticker-a"] } },
  {
    skinId: "awp-st",
    skinOpts: { float: 0.31, stickers: ["sticker-b", "sticker-c"] },
  },
  { skinId: "ak", skinOpts: { float: 0.75 } },
];
function bundle(): RaffleState {
  const prepared = prepareRaffleSkins(selection, lookup, sticker);
  assert(prepared.ok);
  return {
    id: "multi-skin-raffle",
    prize: 0,
    endsAt: 100,
    startedBy: "admin",
    drawn: true,
    winner: { key: "alice", name: "Alice", ts: 101 },
    participants: { alice: { name: "Alice", ts: 90 } },
    skinPrizes: prepared.prizes,
    ...prepared.prizes[0],
  };
}

test("old single-skin raffles remain readable and keep their original receipt ID", () => {
  const old: RaffleState = {
    id: "old",
    prize: 0,
    endsAt: 1,
    startedBy: "admin",
    drawn: true,
    winner: { key: "alice", name: "Alice", ts: 2 },
    skinId: "ak",
    skinName: "Eski ödül",
    skinOpts: { float: 0.08, stickers: ["sticker-a"] },
  };
  const original = JSON.stringify(old);
  assert.equal(raffleSkins(old).length, 1);
  assert.equal(raffleSkinLabel(old), "Eski ödül");
  const payout = rafflePayouts(old, 3);
  assert.equal(payout.length, 1);
  assert.equal(payout[0].id, "raffle:old");
  assert.equal(payout[0].skinId, "ak");
  assert.deepEqual(payout[0].skinOpts, old.skinOpts);
  payout[0].skinOpts!.stickers!.push("not-in-original");
  assert.equal(JSON.stringify(old), original);
});

test("multiple skins keep separate versions, floats and stickers; repeated models are separate rewards", () => {
  const before = JSON.stringify(selection),
    raffle = bundle();
  const prizes = raffleSkins(raffle);
  assert.deepEqual(
    prizes.map((p) => p.skinId),
    ["ak", "awp-st", "ak"],
  );
  assert.deepEqual(
    prizes.map((p) => p.skinOpts?.float),
    [0.042, 0.31, 0.75],
  );
  assert.deepEqual(prizes[1].skinOpts?.stickers, ["sticker-b", "sticker-c"]);
  assert.equal(raffleSkinLabel(raffle), "3 skinlik ödül paketi");
  prizes[0].skinOpts!.stickers!.push("separate-copy");
  assert.equal(JSON.stringify(selection), before);
  assert.deepEqual(raffle.skinPrizes![0].skinOpts?.stickers, ["sticker-a"]);
});

test("empty, oversized or partly invalid selections fail instead of silently dropping an item", () => {
  assert(!prepareRaffleSkins([], lookup, sticker).ok);
  assert(
    !prepareRaffleSkins([...selection, { skinId: "missing" }], lookup, sticker)
      .ok,
  );
  assert(!prepareRaffleSkins([{ skinId: "sticker" }], lookup, sticker).ok);
  assert(
    !prepareRaffleSkins(
      Array(MAX_SKIN_RAFFLE_PRIZES + 1).fill(selection[0]),
      lookup,
      sticker,
    ).ok,
  );
  const max = prepareRaffleSkins(
    Array(MAX_SKIN_RAFFLE_PRIZES).fill(selection[0]),
    lookup,
    sticker,
  );
  assert(max.ok);
  assert.equal(max.prizes.length, MAX_SKIN_RAFFLE_PRIZES);
});

test("each prize is sanitized separately without changing the chosen source objects", () => {
  const source = [
    {
      skinId: "ak",
      skinOpts: {
        float: 2,
        stickers: [
          "missing",
          "sticker-1",
          "sticker-2",
          "sticker-3",
          "sticker-4",
          "sticker-5",
        ],
      },
    },
    { skinId: "awp-st", skinOpts: { float: NaN } },
  ];
  const prepared = prepareRaffleSkins(source, lookup, sticker);
  assert(prepared.ok);
  assert.equal(prepared.prizes[0].skinOpts?.float, 1);
  assert.deepEqual(prepared.prizes[0].skinOpts?.stickers, [
    "sticker-1",
    "sticker-2",
    "sticker-3",
    "sticker-4",
  ]);
  assert.equal(prepared.prizes[1].skinOpts, undefined);
  assert.equal(source[0].skinOpts.float, 2);
  assert.equal(source[0].skinOpts.stickers?.length, 6);
});

test("all package receipts target one winner and contain no SC award", () => {
  const raffle = bundle(),
    rewards = rafflePayouts(raffle, 200);
  assert.deepEqual(
    rewards.map((r) => r.id),
    [
      "raffle:multi-skin-raffle",
      "raffle:multi-skin-raffle:skin:1",
      "raffle:multi-skin-raffle:skin:2",
    ],
  );
  assert(
    rewards.every(
      (r) => r.userKey === "alice" && r.amount === 0 && r.status === "approved",
    ),
  );
  assert.deepEqual(
    rewards.map((r) => r.skinId),
    selection.map((p) => p.skinId),
  );
  assert.deepEqual(
    rewards.map((r) => r.skinOpts),
    selection.map((p) => ({ ...p.skinOpts, stickers: p.skinOpts?.stickers })),
  );
});

test("repeated draw checks and reconnects add only missing skin receipts", () => {
  const raffle = bundle(),
    first = rafflePayouts(raffle, 200)[0];
  // Compatibility: an older client already issued/claimed the first skin.
  const missing = missingRafflePayouts(raffle, [first], 300);
  assert.equal(missing.length, 2);
  assert(!missing.some((r) => r.id === first.id));
  const all = [first, ...missing];
  assert.equal(missingRafflePayouts(raffle, all, 400).length, 0);
  assert.deepEqual(first, rafflePayouts(raffle, 200)[0]);
  assert.equal(new Set(all.map((r) => r.id)).size, 3);
});

test("cancelled, unfinished and empty draws cannot award a package", () => {
  const raffle = bundle();
  assert.deepEqual(rafflePayouts({ ...raffle, cancelled: true }, 200), []);
  assert.deepEqual(rafflePayouts({ ...raffle, drawn: false }, 200), []);
  assert.deepEqual(rafflePayouts({ ...raffle, winner: undefined }, 200), []);
  assert.deepEqual(
    rafflePayouts(
      { ...raffle, winner: { key: "", name: "Katılımcı yok", ts: 200 } },
      200,
    ),
    [],
  );
});

test("cash raffles retain the original amount and are not interpreted as skin packages", () => {
  const cash: RaffleState = {
    id: "cash",
    prize: 50000,
    endsAt: 1,
    startedBy: "admin",
    drawn: true,
    winner: { key: "bob", name: "Bob", ts: 2 },
  };
  assert.equal(raffleSkins(cash).length, 0);
  assert.equal(raffleSkinLabel(cash), null);
  const rewards = rafflePayouts(cash, 3);
  assert.equal(rewards.length, 1);
  assert.equal(rewards[0].id, "raffle:cash");
  assert.equal(rewards[0].amount, 50000);
  assert.equal(rewards[0].skinId, undefined);
});

test("sync recovers the complete package from an old first-skin view without mutating either source", () => {
  const remote = bundle();
  const local = {
    ...remote,
    skinPrizes: undefined,
    drawn: false,
    winner: undefined,
  };
  const original = JSON.stringify({ local, remote });
  const merged = mergeRafflePrizes(local, remote);
  assert.equal(raffleSkins(merged).length, 3);
  assert.equal(merged.drawn, false);
  assert.equal(merged.skinId, remote.skinPrizes![0].skinId);
  assert.strictEqual(mergeRafflePrizes(remote, local), remote);
  merged.skinPrizes![0].skinOpts!.stickers!.push("local-copy");
  assert.equal(JSON.stringify({ local, remote }), original);
  assert.strictEqual(
    mergeRafflePrizes({ ...local, id: "different" }, remote).skinPrizes,
    undefined,
  );
});

test("a conflicting existing recipient cannot be overwritten or given the rest of the bundle", () => {
  const raffle = bundle();
  const conflict = [{ id: `raffle:${raffle.id}`, userKey: "different-winner" }];
  assert.deepEqual(missingRafflePayouts(raffle, conflict, 200), []);
  assert.equal(conflict[0].userKey, "different-winner");
});

test("prize payloads cannot replace the raffle identity or redirect its recipient", () => {
  const raffle = bundle();
  const first = raffle.skinPrizes![0];
  const extra = {
    ...first,
    id: "wrong-raffle",
    userKey: "mallory",
    amount: 999999,
    winner: { key: "mallory", name: "Mallory", ts: 0 },
  };
  raffle.skinPrizes = [extra];
  const payout = rafflePayouts(raffle, 200)[0];
  assert.equal(payout.id, `raffle:${raffle.id}`);
  assert.equal(payout.userKey, "alice");
  assert.equal(payout.amount, 0);
  const merged = mergeRafflePrizes(
    { ...raffle, skinPrizes: undefined },
    raffle,
  );
  assert.equal(merged.id, raffle.id);
  assert.equal(merged.winner?.key, "alice");
});
