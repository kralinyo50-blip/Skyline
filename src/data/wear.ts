/* CS tarzı silah durumu (exterior) sistemi */

export type WearKey = "fn" | "mw" | "ft" | "ww" | "bs";

export interface WearDef {
  key: WearKey;
  tr: string;
  short: string;
  en: string;
  min: number;
  max: number;
  /** fiyat çarpanı */
  mult: number;
  /** düşme ağırlığı */
  weight: number;
  color: string;
}

export const WEARS: Record<WearKey, WearDef> = {
  fn: {
    key: "fn",
    tr: "Fabrikadan Yeni Çıkmış",
    short: "FN",
    en: "Factory New",
    min: 0,
    max: 0.07,
    mult: 1.75,
    weight: 7,
    color: "#2fd673",
  },
  mw: {
    key: "mw",
    tr: "Az Aşınmış",
    short: "MW",
    en: "Minimal Wear",
    min: 0.07,
    max: 0.15,
    mult: 1.3,
    weight: 15,
    color: "#9ee05a",
  },
  ft: {
    key: "ft",
    tr: "Sahada Test Edilmiş",
    short: "FT",
    en: "Field-Tested",
    min: 0.15,
    max: 0.38,
    mult: 1,
    weight: 40,
    color: "#f2c94c",
  },
  ww: {
    key: "ww",
    tr: "Çok Aşınmış",
    short: "WW",
    en: "Well-Worn",
    min: 0.38,
    max: 0.45,
    mult: 0.82,
    weight: 20,
    color: "#f2994a",
  },
  bs: {
    key: "bs",
    tr: "Savaş Yorgunu",
    short: "BS",
    en: "Battle-Scarred",
    min: 0.45,
    max: 1,
    mult: 0.66,
    weight: 18,
    color: "#eb4b4b",
  },
};

export const WEAR_ORDER: WearKey[] = ["fn", "mw", "ft", "ww", "bs"];

/** Float değerinden durumu bul */
export function wearFromFloat(f: number): WearKey {
  if (f < 0.07) return "fn";
  if (f < 0.15) return "mw";
  if (f < 0.38) return "ft";
  if (f < 0.45) return "ww";
  return "bs";
}

/** Ağırlıklı rastgele float üret */
export function rollFloat(): number {
  const total = WEAR_ORDER.reduce((a, k) => a + WEARS[k].weight, 0);
  let r = Math.random() * total;
  let picked: WearKey = "ft";
  for (const k of WEAR_ORDER) {
    r -= WEARS[k].weight;
    if (r <= 0) {
      picked = k;
      break;
    }
  }
  const d = WEARS[picked];
  const f = d.min + Math.random() * (d.max - d.min);
  return Math.round(f * 10000) / 10000;
}

/** Düşük float bonusu — 0.0001 gibi değerler koleksiyoncu primi taşır */
export function floatPremium(f: number): number {
  if (f < 0.002) return 1.35;
  if (f < 0.01) return 1.12;
  if (f > 0.995) return 1.18; // "max float" da değerlidir
  return 1;
}
