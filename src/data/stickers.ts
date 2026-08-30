import { MIN_PRICE } from "../config";
import { badgeArt, type BadgeShape } from "./skinArt";
import { EXTRA_STICKERS } from "./extraStickers";

export type StickerRarity = "high" | "remarkable" | "exotic" | "extraordinary";

export interface Sticker {
  id: string;
  name: string;
  img: string;
  rarity: StickerRarity;
  price: number;
  /** Holo / Foil / Gold gibi efektler */
  effect?: "holo" | "foil" | "gold";
  /** e-spor takımı */
  team?: string;
  /** Major şampiyonluk hatırası */
  champion?: boolean;
  /** kullanıcı yapımı */
  custom?: boolean;
}

export const STICKER_RARITY: Record<
  StickerRarity,
  { tr: string; color: string; order: number }
> = {
  high: { tr: "Yüksek Kalite", color: "#4b69ff", order: 0 },
  remarkable: { tr: "Dikkat Çekici", color: "#8847ff", order: 1 },
  exotic: { tr: "Egzotik", color: "#d32ce6", order: 2 },
  extraordinary: { tr: "Olağanüstü", color: "#eb4b4b", order: 3 },
};

const CDN = "https://community.akamai.steamstatic.com/economy/image/";
const SP = "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1NHWT5ERxu";
const AG = "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMiuJm-Y6wQlpd-7-VDgfh";
const DH = "https://cdn.steamstatic.com/apps/730/icons/econ/stickers/dreamhack/";

export const STICKERS: Sticker[] = [
  /* ---------- Klasik kapsül ---------- */
  {
    id: "st-lucky13",
    name: "Lucky 13",
    img: CDN + SP + "5P840vzRBj_0JPlqiYP6ff6OPM0cvLBDGORmbYhs7NsTii2zBt_tT_Qn9iscH3GO1A-SswnhsokpHo",
    rarity: "high",
    price: MIN_PRICE * 0.7,
  },
  {
    id: "st-aces",
    name: "Aces High",
    img: CDN + SP + "4b370rYSRT2ltjlriQMvPOrafI1c6mXXDCSlL515rg-Hi3gl0V052TTz9_8cHiTbVdxFNIuEvTpD7o7",
    rarity: "high",
    price: MIN_PRICE * 0.9,
  },
  {
    id: "st-aces-holo",
    name: "Aces High (Holo)",
    img: CDN + SP + "4b370rYSRT2lqno8i5UoaH8OaU6c6SVX2bIx7lz6eAxTXnizUVx4GTXnompcSjEPQR1A5slEe4U8k7vp1iwRKc",
    rarity: "remarkable",
    price: MIN_PRICE * 3.4,
    effect: "holo",
  },
  {
    id: "st-conquered",
    name: "I Conquered",
    img: CDN + SP + "4T75EjyRA_0mtjk_yZdtquqPqc-IaXGXjKTwOgj5rg7TXy3wh5152_Sy4ugdymWbgEiFNIuEt4TmcQ2",
    rarity: "high",
    price: MIN_PRICE * 1.1,
  },
  {
    id: "st-destroy",
    name: "Seek & Destroy",
    img: CDN + SP + "4Px-U31TgS_m8-xqCAIuaX4OKI6dKPLWWPHwr905eM8G3mylE10tW_cmdb8IHyVOhhgVMXsEjxLBQ",
    rarity: "high",
    price: MIN_PRICE * 0.8,
  },
  {
    id: "st-blackdog",
    name: "Black Dog",
    img: CDN + SP + "4P9-UnmVR750MTm-yMCvfT_PPI1caXKVjTDxb1w5uNrF3zrlE0k6mSDntepcHjFaVQ-SswnqwuJhOA",
    rarity: "high",
    price: MIN_PRICE * 0.75,
  },
  {
    id: "st-fearsome",
    name: "Fearsome",
    img: CDN + SP + "4Hx60v0ThD00MDk_3IK7qT6PqFsI_OVCj_Bl7Z3s7FrSijrxxkl62WAyIn4dCmfP1c-SswnLVkRVWg",
    rarity: "high",
    price: MIN_PRICE * 0.85,
  },
  {
    id: "st-fearsome-holo",
    name: "Fearsome (Holo)",
    img: CDN + SP + "4Hx60v0ThD0oZ7v8S0V6fb2PKI8dfbGWzSSxbcisbg6Siq1wU9y4T6DzoqpIy-Vbw8pApRyQ_lK7EcfSGVkVQ",
    rarity: "remarkable",
    price: MIN_PRICE * 3.8,
    effect: "holo",
  },

  /* ---------- DreamHack 2013 (nostaljik) ---------- */
  {
    id: "st-shooter",
    name: "Shooter",
    img: DH + "dh_gologo1.9cb84d29f38fe347f001e7057a188696bda6f67b.png",
    rarity: "high",
    price: MIN_PRICE * 1.4,
  },
  {
    id: "st-shooter-foil",
    name: "Shooter (Foil)",
    img: DH + "dh_gologo1_holo.b36272bc491f7df2964deede00ec90cb95c4de6a.png",
    rarity: "remarkable",
    price: MIN_PRICE * 4.2,
    effect: "foil",
  },
  {
    id: "st-snowflake",
    name: "Mavi Kar Tanesi",
    img: DH + "dh_snowflake2.806f44cd8fc0fd47869cabe85e4b75ca9cdd04b0.png",
    rarity: "high",
    price: MIN_PRICE * 1.2,
  },
  {
    id: "st-snowflake-foil",
    name: "Mavi Kar Tanesi (Foil)",
    img: DH + "dh_snowflake3.f54af72447dd90e11b64e097cd6ff0bcc0ddf28b.png",
    rarity: "remarkable",
    price: MIN_PRICE * 3.6,
    effect: "foil",
  },
  {
    id: "st-bears",
    name: "Kutup Ayıları",
    img: DH + "dh_bears.928002e08dc7f5a4cd1295febf05a481b2a83ae6.png",
    rarity: "high",
    price: MIN_PRICE * 1.3,
  },
  {
    id: "st-bears-foil",
    name: "Kutup Ayıları (Foil)",
    img: DH + "dh_bears_holo.ecdd51be5d57bd8ac8ea359ac895a090cf991a5a.png",
    rarity: "exotic",
    price: MIN_PRICE * 6.5,
    effect: "foil",
  },
  {
    id: "st-mountain",
    name: "Dağ",
    img: DH + "dh_mountain.6525110ca2bfe335997b07265a8fb08ca8262764.png",
    rarity: "high",
    price: MIN_PRICE * 1.15,
  },
  {
    id: "st-mountain-foil",
    name: "Dağ (Foil)",
    img: DH + "dh_mountain_holo.4ba34bb6e1ff2776070b8fbc47fdc6512d62b4fe.png",
    rarity: "remarkable",
    price: MIN_PRICE * 4.8,
    effect: "foil",
  },
  {
    id: "st-frosty",
    name: "Frosty the Hitman",
    img: DH + "dh_snowman.1e17bac140a6b7f8e4a27b4a20244d20a4c7307e.png",
    rarity: "remarkable",
    price: MIN_PRICE * 2.6,
  },
  {
    id: "st-frosty-foil",
    name: "Frosty the Hitman (Foil)",
    img: DH + "dh_snowman_holo.45260ad35d4d902edf5795ec90764f520517f379.png",
    rarity: "exotic",
    price: MIN_PRICE * 8.5,
    effect: "foil",
  },

  /* ---------- İmzalı (Boston 2018 efsaneleri) ---------- */
  {
    id: "st-coldzera",
    name: "coldzera | Boston 2018",
    img: CDN + AG + "7-kpL6-DBaoaCoavFuI6WVXmOUmLYl5blrHn7ilEl2t27Xydn4cy7GOgciApJ1EeMU8k7v83lDiR8",
    rarity: "high",
    price: MIN_PRICE * 2.2,
  },
  {
    id: "st-coldzera-foil",
    name: "coldzera (Foil) | Boston 2018",
    img: CDN + AG + "7-kpL6-DBa0PShYagjIfbHDWbJk79w57E8H3rhxUtw5jnQnN6qI3uUPAMgWcYiFOIDshTrkcqnab0vX43XFw",
    rarity: "remarkable",
    price: MIN_PRICE * 7,
    effect: "foil",
  },
  {
    id: "st-coldzera-gold",
    name: "coldzera (Altın) | Boston 2018",
    img: CDN + AG + "7-kpL6-DBa0PWhZKAjc6bCV2bEw7x3srNsHi3lwUp3527Xz9eudnuSbAZyDpMkTeEMuhK4kMqnab3-vCH2sw",
    rarity: "extraordinary",
    price: MIN_PRICE * 26,
    effect: "gold",
  },
  {
    id: "st-fallen",
    name: "FalleN | Boston 2018",
    img: CDN + AG + "vwkprl82wMuaT6P6c6cKOSDDOUmLgi4OI5HSu2kUlw5muAw97_IHrFbg5xApZ3W6dU5aJBm2n2",
    rarity: "high",
    price: MIN_PRICE * 2.4,
  },
  {
    id: "st-fallen-foil",
    name: "FalleN (Foil) | Boston 2018",
    img: CDN + AG + "vwkprl8x1d4PuiJqI6IvbGVmPExOogtLFvHiy3k01ytmvQw96hcyjEO1V0D8clTbNeuxOm0oqw276p9MI",
    rarity: "remarkable",
    price: MIN_PRICE * 7.5,
    effect: "foil",
  },
  {
    id: "st-fallen-gold",
    name: "FalleN (Altın) | Boston 2018",
    img: CDN + AG + "vwkprl8x1c4P6qJvFpI_LEDDKTk-1y4uM_Gnnnxkp-tzzVz9j_JX-VZgN2A5R5EOYItEKm0oqwQJHCHN4",
    rarity: "extraordinary",
    price: MIN_PRICE * 29,
    effect: "gold",
  },
  {
    id: "st-felps",
    name: "felps | Boston 2018",
    img: CDN + AG + "v0kobzsyFZ7PH4OKc4d_bHC2HAwu13s7JsH3-yxUok62SDzYn7IHiSOw4nCsBuBbldY6CuHYM",
    rarity: "high",
    price: MIN_PRICE * 1.9,
  },
  {
    id: "st-felps-foil",
    name: "felps (Foil) | Boston 2018",
    img: CDN + AG + "v0kobzwiRU5v7gOqZrJqiVWz-SwOgg4eRtHH7nkRlwtWrRzd6tc32XZ1MlDJp1QeBc4w74zIMlj8bZPg",
    rarity: "remarkable",
    price: MIN_PRICE * 6.2,
    effect: "foil",
  },
  {
    id: "st-felps-gold",
    name: "felps (Altın) | Boston 2018",
    img: CDN + AG + "v0kobzwiVU4_bgOP00d6XGCj_Fx-hz4LRoGHuyxRkjsT6Eztf6di_FZlclCZImE-cD5A74zINn_BXPAA",
    rarity: "extraordinary",
    price: MIN_PRICE * 24,
    effect: "gold",
  },
];

/* ---------------- E-SPOR TAKIM STICKERLARI ---------------- */

interface TeamDef {
  tag: string;
  name: string;
  bg: string;
  fg: string;
  shape: BadgeShape;
}

const TEAMS: TeamDef[] = [
  { tag: "NAVI", name: "Natus Vincere", bg: "#f5d90a", fg: "#1a1a1a", shape: "shield" },
  { tag: "FAZE", name: "FaZe Clan", bg: "#e43d30", fg: "#ffffff", shape: "diamond" },
  { tag: "G2", name: "G2 Esports", bg: "#111111", fg: "#f0f0f0", shape: "hex" },
  { tag: "VIT", name: "Team Vitality", bg: "#f2e40d", fg: "#111111", shape: "hex" },
  { tag: "SPRT", name: "Team Spirit", bg: "#1f2c5c", fg: "#ffd23f", shape: "shield" },
  { tag: "AST", name: "Astralis", bg: "#e4232d", fg: "#ffffff", shape: "star" },
  { tag: "MOUZ", name: "MOUZ", bg: "#e2372a", fg: "#ffffff", shape: "circle" },
  { tag: "LIQ", name: "Team Liquid", bg: "#0a1e3c", fg: "#3aa7ff", shape: "shield" },
  { tag: "C9", name: "Cloud9", bg: "#0f7ec8", fg: "#ffffff", shape: "circle" },
  { tag: "FNC", name: "Fnatic", bg: "#ff5900", fg: "#101010", shape: "circle" },
  { tag: "NIP", name: "Ninjas in Pyjamas", bg: "#1b1b1b", fg: "#ffe600", shape: "diamond" },
  { tag: "HRC", name: "Heroic", bg: "#0d1b2a", fg: "#59d0ff", shape: "shield" },
  { tag: "FUR", name: "FURIA", bg: "#101010", fg: "#c8ff2e", shape: "hex" },
  { tag: "PAIN", name: "paiN Gaming", bg: "#c8102e", fg: "#ffffff", shape: "shield" },
  { tag: "COL", name: "Complexity", bg: "#0b2a5b", fg: "#ffffff", shape: "diamond" },
  { tag: "EF", name: "Eternal Fire", bg: "#d92b2b", fg: "#ffd166", shape: "star" },
  { tag: "FLCN", name: "Team Falcons", bg: "#0a4a3c", fg: "#4bffc3", shape: "hex" },
  { tag: "AUR", name: "Aurora Gaming", bg: "#4b1f6f", fg: "#c58bff", shape: "circle" },
  { tag: "MNGL", name: "The MongolZ", bg: "#1a1f2e", fg: "#e8b64c", shape: "shield" },
  { tag: "VP", name: "Virtus.pro", bg: "#12100e", fg: "#ff8a00", shape: "diamond" },
  { tag: "ENC", name: "ENCE", bg: "#12234a", fg: "#f5f7fa", shape: "shield" },
  { tag: "GL", name: "GamerLegion", bg: "#12003d", fg: "#7c4dff", shape: "diamond" },
  { tag: "9Z", name: "9z Team", bg: "#0e3d2c", fg: "#c9ff3d", shape: "hex" },
  { tag: "SAW", name: "SAW", bg: "#f4f4f4", fg: "#12301f", shape: "star" },
  { tag: "LGC", name: "Legacy", bg: "#2a0f3d", fg: "#d8b4ff", shape: "circle" },
  { tag: "BIG", name: "BIG", bg: "#101010", fg: "#ffe600", shape: "hex" },
  { tag: "IMP", name: "Imperial", bg: "#0b0b0b", fg: "#e4ae39", shape: "diamond" },
  { tag: "RA", name: "Rare Atom", bg: "#3a0d0d", fg: "#ffd7c2", shape: "shield" },
];

const TEAM_STICKERS: Sticker[] = TEAMS.flatMap((t) => [
  {
    id: `st-team-${t.tag.toLowerCase()}`,
    name: `${t.name}`,
    img: badgeArt({ text: t.tag, bg: t.bg, fg: t.fg, shape: t.shape }),
    rarity: "high" as StickerRarity,
    price: MIN_PRICE * (1 + Math.round((t.tag.length % 3) * 0.4 * 10) / 10),
    team: t.name,
  },
  {
    id: `st-team-${t.tag.toLowerCase()}-holo`,
    name: `${t.name} (Holo)`,
    img: badgeArt({ text: t.tag, bg: t.bg, fg: t.fg, shape: t.shape, effect: "holo" }),
    rarity: "remarkable" as StickerRarity,
    price: MIN_PRICE * 6.5,
    effect: "holo" as const,
    team: t.name,
  },
  {
    id: `st-team-${t.tag.toLowerCase()}-foil`,
    name: `${t.name} (Foil)`,
    img: badgeArt({ text: t.tag, bg: t.bg, fg: t.fg, shape: t.shape, effect: "foil" }),
    rarity: "exotic" as StickerRarity,
    price: MIN_PRICE * 12,
    effect: "foil" as const,
    team: t.name,
  },
  {
    id: `st-team-${t.tag.toLowerCase()}-gold`,
    name: `${t.name} (Altın)`,
    img: badgeArt({ text: t.tag, bg: t.bg, fg: t.fg, shape: t.shape, effect: "gold" }),
    rarity: "extraordinary" as StickerRarity,
    price: MIN_PRICE * 26,
    effect: "gold" as const,
    team: t.name,
  },
]);

STICKERS.push(...TEAM_STICKERS);

export const TEAM_STICKER_IDS = TEAM_STICKERS.map((s) => s.id);

/* ---------- MAJOR ŞAMPİYONLARI (çok değerli) ---------- */
const CHAMPIONS: TeamDef[] = [
  { tag: "NAVI", name: "Natus Vincere", bg: "#f5d90a", fg: "#1a1a1a", shape: "crown" },
  { tag: "SPRT", name: "Team Spirit", bg: "#1f2c5c", fg: "#ffd23f", shape: "crown" },
  { tag: "VIT", name: "Team Vitality", bg: "#f2e40d", fg: "#111111", shape: "crown" },
  { tag: "FAZE", name: "FaZe Clan", bg: "#e43d30", fg: "#ffffff", shape: "crown" },
  { tag: "MOUZ", name: "MOUZ", bg: "#e2372a", fg: "#ffffff", shape: "crown" },
];

const CHAMPION_STICKERS: Sticker[] = CHAMPIONS.flatMap((t, i) => [
  {
    id: `st-champ-${t.tag.toLowerCase()}-holo`,
    name: `${t.name} (Şampiyon Holo) | Major`,
    img: badgeArt({ text: t.tag, bg: t.bg, fg: t.fg, shape: t.shape, effect: "holo" }),
    rarity: "remarkable" as StickerRarity,
    price: MIN_PRICE * (16 + i * 3),
    effect: "holo" as const,
    team: t.name,
    champion: true,
  },
  {
    id: `st-champ-${t.tag.toLowerCase()}-foil`,
    name: `${t.name} (Şampiyon Foil) | Major`,
    img: badgeArt({ text: t.tag, bg: t.bg, fg: t.fg, shape: t.shape, effect: "foil" }),
    rarity: "exotic" as StickerRarity,
    price: MIN_PRICE * (34 + i * 4),
    effect: "foil" as const,
    team: t.name,
    champion: true,
  },
  {
    id: `st-champ-${t.tag.toLowerCase()}-gold`,
    name: `${t.name} (Şampiyon Altın) | Major`,
    img: badgeArt({ text: t.tag, bg: t.bg, fg: t.fg, shape: t.shape, effect: "gold" }),
    rarity: "extraordinary" as StickerRarity,
    price: MIN_PRICE * (68 + i * 7),
    effect: "gold" as const,
    team: t.name,
    champion: true,
  },
]);

STICKERS.push(...CHAMPION_STICKERS);

/* ---------- GERÇEK STEAM STICKER KOLEKSİYONU (150-800 SC) ---------- */
STICKERS.push(...EXTRA_STICKERS);

export const CHAMPION_HOLO_IDS = CHAMPION_STICKERS.filter((s) => s.id.endsWith("-holo")).map((s) => s.id);
export const CHAMPION_FOIL_IDS = CHAMPION_STICKERS.filter((s) => s.id.endsWith("-foil")).map((s) => s.id);
export const CHAMPION_GOLD_IDS = CHAMPION_STICKERS.filter((s) => s.id.endsWith("-gold")).map((s) => s.id);
export const CHAMPION_STICKER_IDS = CHAMPION_STICKERS.map((s) => s.id);

export const STICKER_MAP: Record<string, Sticker> = Object.fromEntries(
  STICKERS.map((s) => [s.id, s])
);

/** Gerçek Steam koleksiyonu (150-800 SC) */
export const EXTRA_STICKER_IDS = EXTRA_STICKERS.map((s) => s.id);

/** Özel (kullanıcı yapımı) sticker'ı çalışma zamanında kaydet */
export function registerStickerDef(s: Sticker) {
  STICKER_MAP[s.id] = s;
}

/** Özel sticker fiyatı */
export const CUSTOM_STICKER_COST = 500;

/** Silaha yapıştırılan stickerların kattığı ek değer */
export const STICKER_ABSORB = 0.45;

/** Nadir stickerlar değerlerinin daha büyük kısmını silaha aktarır */
export const STICKER_RARITY_BOOST: Record<StickerRarity, number> = {
  high: 0.7,
  remarkable: 1,
  exotic: 1.35,
  extraordinary: 1.8,
};

export function stickerBonus(ids: string[]): number {
  return ids.reduce((a, id) => {
    const s = STICKER_MAP[id];
    if (!s) return a;
    return a + Math.round(s.price * STICKER_ABSORB * STICKER_RARITY_BOOST[s.rarity]);
  }, 0);
}

export const MAX_STICKERS = 4;

/** Kapsül içeriği — ağırlıklı çekiliş */
const CAPSULE_WEIGHTS: Record<StickerRarity, number> = {
  high: 80,
  remarkable: 16,
  exotic: 3.2,
  extraordinary: 0.8,
};

export function rollSticker(pool: string[]): Sticker {
  const items = pool.map((id) => STICKER_MAP[id]).filter(Boolean);
  const total = items.reduce((a, s) => a + CAPSULE_WEIGHTS[s.rarity], 0) || 1;
  let r = Math.random() * total;
  for (const s of items) {
    r -= CAPSULE_WEIGHTS[s.rarity];
    if (r <= 0) return s;
  }
  return items[items.length - 1];
}
