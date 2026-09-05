import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import {
  legacySnapshot,
  legacyRaw,
  legacyIsArchived,
  markArchived,
  ARCHIVE_KEY,
  ARCHIVE_EVENT,
} from "../src/platform/legacy";
const store = new Map<string, string>();
const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage"),
  oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  value: events,
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
  },
  configurable: true,
});
beforeEach(() => store.clear());
after(() => {
  if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
  if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
  else Reflect.deleteProperty(globalThis, "window");
});
test("raw legacy snapshot does not normalize, filter old generated items or touch unrelated settings", () => {
  const raw =
    ' {"users":{"alice":{"name":"Alice","balance":999.67,"inventory":[{"uid":"old","skinId":"gen-custom","float":0.042,"customName":"Özel","stickers":["s1"],"ts":1234}],"vip":true}},"session":"alice","privateSetting":"KEEP"} ';
  store.set("skyline:v1", raw);
  const snapshot = legacySnapshot();
  assert.equal(snapshot?.balance, 999.67);
  assert.equal(snapshot?.inventory[0].skinId, "gen-custom");
  assert.equal(legacyRaw(), raw);
  assert.deepEqual(
    legacySnapshot(JSON.stringify({ schema: "skyline-v2-backup-v1", raw })),
    snapshot,
  );
  assert.equal(legacySnapshot(raw, "someone_else"), null);
  assert.equal(legacySnapshot("broken"), null);
});
test("archive freezes the shared V2 document, emits once and never rewrites money or items", () => {
  const raw = JSON.stringify({
    session: "bob",
    users: {
      alice: { name: "Alice", balance: 1, inventory: [] },
      bob: { name: "Bob", balance: 99, inventory: [] },
    },
  });
  store.set("skyline:v1", raw);
  let called = 0;
  const listener = () => called++;
  events.addEventListener(ARCHIVE_EVENT, listener);
  assert.equal(legacyIsArchived(), false);
  markArchived("ALICE", 1234);
  markArchived("alice", 1234);
  assert.equal(called, 1);
  assert.equal(legacyIsArchived(), true);
  assert.equal(legacyRaw(), raw);
  events.removeEventListener(ARCHIVE_EVENT, listener);
});
test("username prototype names cannot masquerade as archive markers or bypass marking", () => {
  store.set(
    "skyline:v1",
    JSON.stringify({
      users: {
        constructor: { name: "constructor", balance: 1, inventory: [] },
      },
    }),
  );
  assert.equal(legacyIsArchived(), false);
  markArchived("__proto__", 42);
  assert.equal(JSON.parse(store.get(ARCHIVE_KEY)!).__proto__, 42);
  store.set(
    "skyline:v1",
    '{"users":{"__proto__":{"name":"__proto__","balance":1,"inventory":[]}}}',
  );
  assert.equal(legacyIsArchived(), true);
});
