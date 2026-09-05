/* ============================================================
   V2.0 KİMLİK KİTİ — banner / çerçeve / ünvan / avatar / isim rengi
   Profil görünümü Account.look alanında tutulur ve pub ile
   diğer cihazlara yayınlanır (sohbet, liderlik, topluluk).
============================================================ */

export interface BannerDef {
  key: string;
  label: string;
  css: string;
}

export const BANNERS: BannerDef[] = [
  { key: "gece", label: "Gece", css: "linear-gradient(120deg,#10141f,#1c2333)" },
  {
    key: "kor",
    label: "Kor",
    css: "radial-gradient(80% 130% at 18% 0%, rgba(249,142,29,0.4), transparent 60%), linear-gradient(120deg,#1a0f08,#241207)",
  },
  {
    key: "neon",
    label: "Neon",
    css: "linear-gradient(120deg, rgba(176,107,255,0.4), rgba(79,216,255,0.28) 60%, transparent), #10141f",
  },
  { key: "okyanus", label: "Okyanus", css: "linear-gradient(120deg,#0a1a2f,#123a5e)" },
  { key: "kan", label: "Kan", css: "linear-gradient(120deg,#2a0a0a,#4a1010)" },
  { key: "zumrut", label: "Zümrüt", css: "linear-gradient(120deg,#06251a,#0d3f2a)" },
  {
    key: "altin",
    label: "Altın",
    css: "repeating-linear-gradient(45deg, rgba(228,174,57,0.16) 0 12px, transparent 12px 24px), linear-gradient(120deg,#241a06,#3a2a08)",
  },
  {
    key: "galaksi",
    label: "Galaksi",
    css: "radial-gradient(60% 110% at 72% 0%, rgba(211,44,230,0.32), transparent 60%), radial-gradient(50% 90% at 18% 10%, rgba(75,105,255,0.38), transparent 60%), #0a0d16",
  },
  {
    key: "cizgi",
    label: "Devre",
    css: "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 16px), linear-gradient(120deg,#0d1420,#16202f)",
  },
  { key: "gul", label: "Gül", css: "linear-gradient(120deg,#2a0a1e,#4a1034)" },
];

export interface FrameDef {
  key: string;
  label: string;
  color: string;
}

export const FRAMES: FrameDef[] = [
  { key: "none", label: "Standart", color: "#212a3d" },
  { key: "mavi", label: "Mil-Spec", color: "#4b69ff" },
  { key: "mor", label: "Restricted", color: "#8847ff" },
  { key: "pembe", label: "Classified", color: "#d32ce6" },
  { key: "kirmizi", label: "Covert", color: "#eb4b4b" },
  { key: "altin", label: "Altın", color: "#e4ae39" },
  { key: "turkuaz", label: "Turkuaz", color: "#34f5c5" },
];

export const AVATARS: string[] = [
  "\u{1F60E}", "\u{1F43A}", "\u{1F451}", "\u{1F3AF}", "\u{1F985}", "\u{1F340}", "\u{1F409}", "\u{1F981}", "\u{1F480}", "\u{1F47B}",
  "\u{1F525}", "\u{26A1}", "\u{1F319}", "\u{2744}\u{FE0F}", "\u{1F422}", "\u{1F982}", "\u{1F30B}", "\u{1F48E}", "\u{1F3B2}", "\u{1F3A9}",
  "\u{1F9FF}", "\u{1F42F}", "\u{1F98A}", "\u{1F419}",
];

export interface NameColorDef {
  key: string;
  label: string;
  c: string;
}

export const NAME_COLORS: NameColorDef[] = [
  { key: "default", label: "Beyaz", c: "#e6ebf5" },
  { key: "brand", label: "Turuncu", c: "#ffb020" },
  { key: "yesil", label: "Zümrüt", c: "#2fd673" },
  { key: "cyan", label: "Camgöbeği", c: "#4fd8ff" },
  { key: "mor", label: "Mor", c: "#b06bff" },
  { key: "pembe", label: "Pembe", c: "#ff45a8" },
  { key: "altin", label: "Altın", c: "#e4ae39" },
  { key: "kirmizi", label: "Kırmızı", c: "#eb4b4b" },
];

/** ünvan kilidi için hesap özeti */
export interface TitleStats {
  level: number;
  opened: number;
  spent: number;
  bestDrop: number;
  inv: number;
  vip: number;
}

export interface TitleDef {
  key: string;
  label: string;
  hint: string;
  cond: (s: TitleStats) => boolean;
}

export const TITLES: TitleDef[] = [
  { key: "caylak", label: "Çaylak", hint: "Herkesin başlangıcı", cond: () => true },
  { key: "avci", label: "Kasa Avcısı", hint: "100 kasa aç", cond: (s) => s.opened >= 100 },
  { key: "koleksiyoncu", label: "Koleksiyoncu", hint: "75 eşyalık envanter", cond: (s) => s.inv >= 75 },
  { key: "keskin", label: "Keskin Göz", hint: "250K+ en iyi düşüş", cond: (s) => s.bestDrop >= 250_000 },
  { key: "balina", label: "Balina", hint: "25M+ toplam harcama", cond: (s) => s.spent >= 25_000_000 },
  { key: "efsane", label: "Efsane", hint: "Seviye 25", cond: (s) => s.level >= 25 },
  { key: "baron", label: "VIP Baron", hint: "VIP 5. kademe", cond: (s) => s.vip >= 5 },
  { key: "kral", label: "Skyline Kralı", hint: "Seviye 40 + VIP 10", cond: (s) => s.level >= 40 && s.vip >= 10 },
];

/* ---------- yardımcılar ---------- */

export function bannerCss(key?: string): string {
  return (BANNERS.find((b) => b.key === key) ?? BANNERS[0]).css;
}

export function frameColor(key?: string): string {
  return (FRAMES.find((f) => f.key === key) ?? FRAMES[0]).color;
}

export function titleLabel(key?: string): string | null {
  return TITLES.find((t) => t.key === key)?.label ?? null;
}

export function nameColorOf(key?: string): string | undefined {
  const c = NAME_COLORS.find((n) => n.key === key)?.c;
  return c && c !== "#e6ebf5" ? c : undefined;
}
