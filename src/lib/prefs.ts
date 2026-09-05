/* Kullanıcı tercihleri — sadece bu cihazda (localStorage) */

export type ThemeKey = "gece" | "kan" | "neon" | "altin" | "okyanus" | "gul";

export const THEMES: { key: ThemeKey; label: string; swatch: string }[] = [
  { key: "gece", label: "Gece (varsayılan)", swatch: "#f98e1d" },
  { key: "kan", label: "Kan", swatch: "#f43f2e" },
  { key: "neon", label: "Neon", swatch: "#0fd6a4" },
  { key: "altin", label: "Altın", swatch: "#f0b13f" },
  { key: "okyanus", label: "Okyanus", swatch: "#2f8ef7" },
  { key: "gul", label: "Gül", swatch: "#ff45a8" },
];

export type FxKey = "klasik" | "altin" | "neon" | "gul" | "sakin";

/** kutlama/konfeti efekt paketleri (V2.0) */
export const FX_PACKS: Record<FxKey, { label: string; colors: string[] }> = {
  klasik: { label: "Klasik", colors: ["#f98e1d", "#e4ae39", "#2fd673", "#5e98d9", "#ffffff"] },
  altin: { label: "Altın Yağmuru", colors: ["#f5d90a", "#f0b13f", "#e4ae39", "#fff7d6", "#ffffff"] },
  neon: { label: "Neon Patlama", colors: ["#34f5c5", "#4fd8ff", "#b06bff", "#ff45a8", "#ffffff"] },
  gul: { label: "Taç Yaprakları", colors: ["#ff45a8", "#ff7ab8", "#ffc0de", "#b06bff", "#ffffff"] },
  sakin: { label: "Sakin (konfetisiz)", colors: [] },
};

export interface Prefs {
  /** genel ses seviyesi 0–100 */
  sfx: number;
  /** konfeti/partikül efektleri */
  effects: boolean;
  /** ekran sarsıntısı (kazanma vb.) */
  shake: boolean;
  /** kasalarda hızlı açılış animasyonu */
  fastReels: boolean;
  /** site renk teması (V2.0) */
  theme: ThemeKey;
  /** kutlama konfeti paketi (V2.0) */
  fxPack: FxKey;
}

const KEY = "skyline:prefs";

const DEFAULTS: Prefs = {
  sfx: 80,
  effects: true,
  shake: true,
  fastReels: false,
  theme: "gece",
  fxPack: "klasik",
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULTS, ...p };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("skyline:prefs"));
  } catch {
    /* yoksay */
  }
}

export const PREFS_EVENT = "skyline:prefs";
