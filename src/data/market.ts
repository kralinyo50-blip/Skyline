import { SKINS, WEAPON_SKINS, SKIN_MAP, type Skin } from "./skins";
import { COMMUNITY_USERS } from "./fakers";
import { itemValue, pinnedWearOf, type InvItem } from "./items";
import { STICKERS } from "./stickers";
import { pick, randInt, uid } from "../lib/rng";

export interface Listing {
  id: string;
  skinId: string;
  price: number;
  seller: string;
  ts: number;
  float?: number;
  stickers?: string[];
  /** aşınma + sticker dahil gerçek değeri */
  baseValue: number;
  /** toptan paket: kopya sayısı (1 = tekil) */
  qty?: number;
  /** toptan paket: birim fiyat */
  unitPrice?: number;
}

/* ---------------- TOPLU (WHOLESALE) FİYATLANDIRMA ---------------- */

/** Adet arttıkça birim fiyat düşer */
export const BULK_TIERS: { min: number; mult: number }[] = [
  { min: 50, mult: 0.84 },
  { min: 20, mult: 0.88 },
  { min: 10, mult: 0.92 },
  { min: 5, mult: 0.96 },
  { min: 1, mult: 1 },
];

export function bulkMult(qty: number): number {
  for (const t of BULK_TIERS) if (qty >= t.min) return t.mult;
  return 1;
}

/** Belirtilen adet için birim fiyat (yüzliğe yuvarlanır) */
export function bulkUnitPrice(unit: number, qty: number): number {
  return Math.max(100, Math.round((unit * bulkMult(qty)) / 100) * 100);
}

/** Belirtilen adet için toplam fiyat */
export function bulkTotal(unit: number, qty: number): number {
  return Math.max(100, bulkUnitPrice(unit, qty) * qty);
}

const STICKER_IDS = STICKERS.map((s) => s.id);

/** Bot satıcı ilanı üret — rastgele aşınma ve bazen stickerlı */
export function makeBotListing(skin?: Skin): Listing {
  const s = skin ?? pick(SKINS);
  const isSticker = !!s.sticker;
  const float = isSticker ? undefined : pinnedWearOf(s.id);

  let stickers: string[] | undefined;
  if (!isSticker && Math.random() < 0.16) {
    stickers = Array.from({ length: randInt(1, 4) }, () => pick(STICKER_IDS));
  }

  const probe: InvItem = { uid: "probe", skinId: s.id, ts: 0, float, stickers };
  const base = itemValue(probe);
  const mult = 1.02 + Math.random() * 0.3;
  const unit = Math.max(100, Math.round((base * mult) / 100) * 100);

  /* %18 ihtimalle toptan paket — 3-12 kopya, birim fiyat düşer */
  if (!isSticker && Math.random() < 0.18) {
    const qty = randInt(3, 12);
    return {
      id: uid(),
      skinId: s.id,
      price: bulkTotal(unit, qty),
      unitPrice: unit,
      qty,
      seller: pick(COMMUNITY_USERS),
      ts: Date.now() - randInt(20, 5400) * 1000,
      float,
      stickers,
      baseValue: base,
    };
  }

  return {
    id: uid(),
    skinId: s.id,
    price: unit,
    seller: pick(COMMUNITY_USERS),
    ts: Date.now() - randInt(20, 5400) * 1000,
    float,
    stickers,
    baseValue: base,
  };
}

/** Pazar tezgahını doldur */
export function generateBotListings(count = 96): Listing[] {
  return Array.from({ length: count }, () => makeBotListing()).sort((a, b) => b.ts - a.ts);
}

export function priceRatio(l: {
  price: number;
  baseValue?: number;
  skinId: string;
  unitPrice?: number;
}): number {
  const base = l.baseValue ?? SKIN_MAP[l.skinId]?.price ?? 1;
  return (l.unitPrice ?? l.price) / Math.max(1, base);
}

/**
 * Bir tur içinde kendi ilanımızın satılma olasılığı.
 * Ucuza koyarsan hızlı, pahalıya koyarsan yavaş satılır.
 */
export function sellChance(l: { price: number; baseValue?: number; skinId: string }): number {
  const r = priceRatio(l);
  if (r <= 0.75) return 0.55;
  if (r <= 0.9) return 0.34;
  if (r <= 1.0) return 0.2;
  if (r <= 1.15) return 0.1;
  if (r <= 1.35) return 0.04;
  return 0.012;
}

/* ==================== TAKAS ==================== */

export interface TradeItem {
  skinId: string;
  float?: number;
  stickers?: string[];
  value: number;
}

export interface TradeOffer {
  id: string;
  trader: string;
  /** botun vereceği eşyalar */
  give: TradeItem[];
  /** botun karşılığında istediği toplam değer */
  wantValue: number;
  /** üste verilen nakit */
  cash?: number;
  ts: number;
  /** takas cazibesi: 1'in üstü senin lehine */
  ratio: number;
}

function makeTradeItem(skin: Skin): TradeItem {
  const float = skin.sticker ? undefined : pinnedWearOf(skin.id);
  const stickers =
    !skin.sticker && Math.random() < 0.2
      ? Array.from({ length: randInt(1, 3) }, () => pick(STICKER_IDS))
      : undefined;
  const probe: InvItem = { uid: "p", skinId: skin.id, ts: 0, float, stickers };
  return { skinId: skin.id, float, stickers, value: itemValue(probe) };
}

export function makeTradeOffer(): TradeOffer {
  const count = randInt(1, 3);
  const give = Array.from({ length: count }, () => makeTradeItem(pick(WEAPON_SKINS)));
  const giveValue = give.reduce((a, g) => a + g.value, 0);

  /* botun istediği karşılık — bazen senin lehine, bazen aleyhine */
  const roll = Math.random();
  const ratio =
    roll < 0.2
      ? 1.12 + Math.random() * 0.2
      : roll < 0.65
        ? 0.94 + Math.random() * 0.14
        : 0.72 + Math.random() * 0.18;
  const wantValue = Math.max(100, Math.round(giveValue / ratio / 100) * 100);
  const cash = Math.random() < 0.25 ? Math.round((giveValue * 0.05) / 100) * 100 : undefined;

  return {
    id: uid(),
    trader: pick(COMMUNITY_USERS),
    give,
    wantValue,
    cash,
    ts: Date.now() - randInt(10, 3000) * 1000,
    ratio: Math.round(ratio * 100) / 100,
  };
}

export function generateTradeOffers(count = 10): TradeOffer[] {
  return Array.from({ length: count }, makeTradeOffer).sort((a, b) => b.ratio - a.ratio);
}
