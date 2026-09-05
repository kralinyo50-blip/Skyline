import { RARITY, SKIN_MAP, type RarityKey } from "./skins";
import { STICKER_MAP, STICKER_RARITY, stickerBonus, type Sticker } from "./stickers";
import { WEARS, floatPremium, rollFloat, wearFromFloat, type WearKey } from "./wear";
import { uid } from "../lib/rng";

export interface InvItem {
  uid: string;
  /** skin id ya da "st-" ile başlayan sticker id */
  skinId: string;
  ts: number;
  /** silahlar için aşınma değeri */
  float?: number;
  /** yapıştırılmış sticker id'leri */
  stickers?: string[];
  /** V2.0 name tag — kullanıcının verdiği özel ad */
  customName?: string;
}

/* V2.0 atölye ücretleri */
export const NAME_TAG_COST = 25_000;
export const FLOAT_REROLL_COST = 50_000;

export function isStickerItem(id: string): boolean {
  return id.startsWith("st-") && !!STICKER_MAP[id];
}

export function itemSticker(item: InvItem): Sticker | null {
  return isStickerItem(item.skinId) ? STICKER_MAP[item.skinId] ?? null : null;
}

/** Eşyanın güncel piyasa değeri — aşınma + sticker dahil */
export function itemValue(item: InvItem): number {
  const st = itemSticker(item);
  if (st) return st.price;

  const skin = SKIN_MAP[item.skinId];
  if (!skin) return 0;

  /* bıçak/eldiven vanilya bazıları aşınmasız sayılır ama yine de float taşır */
  const f = item.float;
  let base = skin.price;
  if (typeof f === "number") {
    const w = WEARS[wearFromFloat(f)];
    base = base * w.mult * floatPremium(f);
  }
  const bonus = stickerBonus(item.stickers ?? []);
  return Math.max(1, Math.round(base + bonus));
}

export function itemWear(item: InvItem): WearKey | null {
  if (isStickerItem(item.skinId)) return null;
  return typeof item.float === "number" ? wearFromFloat(item.float) : null;
}

export function itemImage(item: InvItem): string {
  const st = itemSticker(item);
  if (st) return st.img;
  return SKIN_MAP[item.skinId]?.img ?? "";
}

export function itemTitle(item: InvItem): { top: string; main: string } {
  const st = itemSticker(item);
  if (st) return { top: "Sticker", main: st.name };
  const s = SKIN_MAP[item.skinId];
  if (!s) return { top: "—", main: "Bilinmeyen" };
  /* V2.0 name tag: CS tarzı özel ad */
  if (item.customName) return { top: s.weapon, main: `"${item.customName}"` };
  return { top: s.weapon, main: s.name };
}

export function itemColor(item: InvItem): string {
  const st = itemSticker(item);
  if (st) return STICKER_RARITY[st.rarity].color;
  const s = SKIN_MAP[item.skinId];
  return s ? RARITY[s.rarity].color : "#5e98d9";
}

export function itemRarity(item: InvItem): RarityKey | null {
  if (isStickerItem(item.skinId)) return null;
  return SKIN_MAP[item.skinId]?.rarity ?? null;
}

/** Yeni silah eşyası — düşerken aşınma ve (şansa göre) sticker alır */
export function makeSkinItem(skinId: string, opts?: { stickered?: boolean }): InvItem {
  const item: InvItem = { uid: uid(), skinId, ts: Date.now(), float: pinnedWearOf(skinId) };
  if (opts?.stickered) item.stickers = [];
  return item;
}

/**
 * SKYLINE Serisi aşınma baskıları (…-fn/-mw/-ft/-ww/-bs ve -st/-sv varyantları)
 * temsilî aşınma ile gelir: görsel/vurgu yanlış görünmesin, float rastgele atanmaz.
 */
export function pinnedWearOf(skinId: string): number | undefined {
  const m = /-(fn|mw|ft|ww|bs)(-st|-sv)?$/.exec(skinId);
  if (!m) return rollFloat();
  return m[1] === "fn" ? 0.02 : m[1] === "mw" ? 0.1 : m[1] === "ft" ? 0.25 : m[1] === "ww" ? 0.41 : 0.6;
}

export function makeStickerItem(stickerId: string): InvItem {
  return { uid: uid(), skinId: stickerId, ts: Date.now() };
}

/** Kasadan çıkan silaha %12 ihtimalle sticker yapıştırılmış gelir */
export const STICKERED_DROP_CHANCE = 0.12;

export function maybeAttachStickers(item: InvItem, pool: string[]): InvItem {
  if (isStickerItem(item.skinId)) return item;
  if (Math.random() > STICKERED_DROP_CHANCE) return item;
  const count = Math.random() < 0.55 ? 1 : Math.random() < 0.85 ? 2 : Math.random() < 0.96 ? 3 : 4;
  const chosen: string[] = [];
  for (let i = 0; i < count; i++) {
    chosen.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return { ...item, stickers: chosen };
}
