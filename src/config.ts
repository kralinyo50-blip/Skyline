/* ------------------------------------------------------------------
   SKYLINE — Sunucu yapılandırması
   Burayı değiştirerek marka / para birimi / admin ayarlarını yönet.
------------------------------------------------------------------ */

export const BRAND = {
  name: "SKYLINE",
  suffix: "RP",
  tagline: "Şehir Roleplay • Kasa Sistemi",
  ip: "play.skylinerp.net",
};

/** Sunucudaki ana yönetici — bu isimle giren kişi admin paneline erişir */
export const ADMIN_NAME = "Kaan9897";

/** MC sunucusundaki para birimi */
export const CURRENCY = {
  symbol: "$",
  name: "Skyline Parası",
  short: "SC",
};

/** Fiyatları MC ekonomisine uygun büyüklüğe çeker */
export const SCALE = 100;

/** Tüm yeni hesaplar sıfır bakiye ile başlar */
export const START_BALANCE = 0;

/** Davet edilen oyuncu bu seviyeye ulaşınca davet edene bonus verilir */
export const REFERRAL_LEVEL = 5;

/** Referans bonusu (SC) */
export const REFERRAL_BONUS = 250 * SCALE;

/* ---------------- ÇEKİLİŞ / ETKİNLİK ---------------- */

/** Günün ilk girişine verilecek ödül (SC) */
export const FIRST_LOGIN_REWARD = 100000;

/** Otomatik çekiliş: varsayılan frekans (ms) — 1 saat */
export const RAFFLE_FREQ_MS = 60 * 60 * 1000;

/** Otomatik çekiliş: varsayılan ödül (SC) */
export const RAFFLE_PRIZE = 100000;

/* ---------------- ADMIN GÜVENLİK ---------------- */

/** Admin bakiye işlemi: tek seferde en fazla bu kadar (SC) */
export const ADMIN_ADJUST_MAX = 50_000_000;

/** Admin bakiye işlemi: 24 saat içinde en fazla bu kadar (SC) */
export const ADMIN_ADJUST_DAILY = 250_000_000;

/* ---------------- PITY (GARANTİ) SİSTEMİ ---------------- */

/** Bu kadar açılışta covert/rare çıkmazsa bir sonraki garanti */
export const PITY_GUARANTEE = 5;

/** En ucuz skin fiyatı */
export const MIN_PRICE = 1200;

/** Kasadan/envanterden anında satış oranı (düşük) */
export const QUICK_SELL_RATE = 0.55;

/** Pazarda satışta kesilen komisyon */
export const MARKET_FEE = 0.05;

/** Kasa fiyatı = beklenen değer × bu çarpan */
export const CASE_MARKUP = 1.3;

/** En ucuz kasa fiyatı */
export const MIN_CASE_PRICE = 2500;

/* ---------------- VIP SINIFLARI (para ile satın alınır, 4'er kademe) ---------------- */

export interface VipPerks {
  /** günlük ödül çarpanı */
  dailyMult: number;
  /** kaybedilen bahislerden geri ödeme oranı (0-1) */
  cashback: number;
  /** pazar satış komisyonu (0 = komisyonsuz) */
  fee: number;
  /** kasa açılışlarında indirim (%) */
  caseDisc: number;
}

export interface VipTier {
  id: "none" | "bakir" | "demir" | "altin" | "elmas" | "obsidyen" | "netherite";
  label: string;
  icon: string;
  color: string;
}

export interface VipLevel extends VipPerks {
  /** 1-24 sıralı seviye (6 sınıf × 4 kademe) */
  id: string;
  tier: Exclude<VipTier["id"], "none">;
  kademe: 1 | 2 | 3 | 4;
  /** kademe etiketi (I, II, III, IV) */
  roman: string;
  label: string;
  price: number;
}

export const VIP_TIERS: VipTier[] = [
  { id: "none", label: "Misafir", icon: "👤", color: "#8b98a5" },
  { id: "bakir", label: "Bakır", icon: "🥉", color: "#c07a3e" },
  { id: "demir", label: "Demir", icon: "⚙️", color: "#a8b2bd" },
  { id: "altin", label: "Altın", icon: "🥇", color: "#ffd34d" },
  { id: "elmas", label: "Elmas", icon: "💎", color: "#7fe3ff" },
  { id: "obsidyen", label: "Obsidyen", icon: "🔮", color: "#b484ff" },
  { id: "netherite", label: "Netherite", icon: "🌌", color: "#5eead4" },
];

const ROMAN = ["I", "II", "III", "IV"] as const;

/** Sınıf tabanını tanımlar — kademeler bir sonraki sınıfa doğru kademeli artar */
const VIP_SPEC: {
  tier: Exclude<VipTier["id"], "none">;
  prices: [number, number, number, number];
  base: VipPerks;
}[] = [
  { tier: "bakir",    prices: [25_000, 60_000, 120_000, 220_000],    base: { dailyMult: 1.05, cashback: 0.01, fee: 0.05, caseDisc: 1 } },
  { tier: "demir",    prices: [400_000, 700_000, 1_100_000, 1_700_000], base: { dailyMult: 1.15, cashback: 0.02, fee: 0.045, caseDisc: 2 } },
  { tier: "altin",    prices: [2_500_000, 3_800_000, 5_500_000, 7_500_000], base: { dailyMult: 1.3, cashback: 0.04, fee: 0.04, caseDisc: 4 } },
  { tier: "elmas",    prices: [10_000_000, 14_000_000, 19_000_000, 25_000_000], base: { dailyMult: 1.5, cashback: 0.06, fee: 0.03, caseDisc: 6 } },
  { tier: "obsidyen", prices: [32_000_000, 42_000_000, 55_000_000, 70_000_000], base: { dailyMult: 2.0, cashback: 0.09, fee: 0.02, caseDisc: 9 } },
  { tier: "netherite", prices: [90_000_000, 115_000_000, 145_000_000, 180_000_000], base: { dailyMult: 2.5, cashback: 0.14, fee: 0.01, caseDisc: 12 } },
];

/** Son sınıfın IV kademesi — en üst özellikler */
const VIP_MAX: VipPerks = { dailyMult: 3.5, cashback: 0.2, fee: 0, caseDisc: 20 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;
const round1 = (v: number) => Math.round(v * 10) / 10;

/** 24 VIP seviyesi — sıralı alım (önceki kademeye sahip olmak gerekir) */
export const VIP_LEVELS: VipLevel[] = VIP_SPEC.flatMap((spec, i) => {
  const next = VIP_SPEC[i + 1]?.base ?? VIP_MAX;
  const isLast = i === VIP_SPEC.length - 1;
  const tier = VIP_TIERS.find((t) => t.id === spec.tier)!;
  return spec.prices.map((price, k) => {
    /* I = sınıf tabanı, II-IV kademeli olarak alt sınıfa doğru yaklaşır;
       son sınıfın IV kademesi zirve (3.5× / %20 / %20) olur */
    const t = (k / 3) * (isLast ? 1 : 0.9);
    return {
      id: `${spec.tier}-${k + 1}`,
      tier: spec.tier,
      kademe: (k + 1) as VipLevel["kademe"],
      roman: ROMAN[k],
      label: `${tier.label} ${ROMAN[k]}`,
      price,
      dailyMult: round2(lerp(spec.base.dailyMult, next.dailyMult, t)),
      cashback: round3(lerp(spec.base.cashback, next.cashback, t)),
      fee: round3(lerp(spec.base.fee, next.fee, t)),
      caseDisc: round1(lerp(spec.base.caseDisc, next.caseDisc, t)),
    };
  });
});

/** Seviye (0-24) → sınıf meta (0 = Misafir) */
export function vipTierOfLevel(level: number): VipTier {
  if (level <= 0) return VIP_TIERS[0];
  const lv = VIP_LEVELS[Math.min(level, VIP_LEVELS.length) - 1];
  return VIP_TIERS.find((t) => t.id === lv.tier) ?? VIP_TIERS[0];
}

/** Seviye (0-24) → seviye detayı (0 = null) */
export function vipLevelEntry(level: number): VipLevel | null {
  if (level <= 0) return null;
  return VIP_LEVELS[Math.min(level, VIP_LEVELS.length) - 1];
}

/** Sıradaki satın alınabilir seviye (24 ise null) */
export function vipNextLevel(level: number): VipLevel | null {
  return level >= VIP_LEVELS.length ? null : VIP_LEVELS[level];
}

/** Kasa fiyat indirimi — oyuncunun VIP seviyesine göre */
export function applyVipCaseDisc(price: number, level: number): number {
  const d = vipLevelEntry(level)?.caseDisc ?? 0;
  return d > 0 ? Math.max(1, Math.round(price * (1 - d / 100))) : price;
}

/* ---------------- JACKPOT ---------------- */

/** Bir jackpot turu süresi */
export const JACKPOT_ROUND_MS = 60_000;
/** Potta en fazla bu kadar katılımcı olabilir */
export const JACKPOT_MAX_ENTRIES = 12;
/** Kazanan belirlendikten sonra yeni tur başlamadan önce bekleme */
export const JACKPOT_NEXT_MS = 6_000;

/** Tam tur çevrimi (oyun + kazanan ekranı) — tüm cihazlar bu programı paylaşır */
export const JACKPOT_CYCLE_MS = JACKPOT_ROUND_MS + JACKPOT_NEXT_MS;

/** Saate bağlı deterministik tur numarası — her cihaz aynı değeri bulur */
export function jackpotRoundAt(now: number): number {
  return Math.floor(now / JACKPOT_CYCLE_MS);
}

/** Tura ait deterministik zamanlama (başlangıç / bitiş / sonraki tur) */
export function jackpotSchedule(round: number): { start: number; endsAt: number; nextStartAt: number } {
  const start = round * JACKPOT_CYCLE_MS;
  return { start, endsAt: start + JACKPOT_ROUND_MS, nextStartAt: start + JACKPOT_CYCLE_MS };
}

/** Taban değeri sunucu ekonomisine oturtan fiyat eğrisi */
export function priceOf(base: number): number {
  const raw = MIN_PRICE * Math.pow(1 + base, 0.62);
  return Math.max(MIN_PRICE, Math.round(raw / 100) * 100);
}

/** Yuvarlak kasa fiyatı */
export function roundCasePrice(n: number): number {
  return Math.max(MIN_CASE_PRICE, Math.round(n / 100) * 100);
}

/** Para birimini biçimlendirir — 12.500 $ gibi */
export function money(n: number): string {
  const v = Math.round(n);
  return `${CURRENCY.symbol}${v.toLocaleString("tr-TR")}`;
}

/** MC kafa avatarı (gerçek skin) */
export function mcHead(name: string, size = 64): string {
  return `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;
}

/** MC tam vücut render */
export function mcBody(name: string, size = 128): string {
  return `https://mc-heads.net/body/${encodeURIComponent(name)}/${size}`;
}

export function isValidMcName(name: string): boolean {
  return /^[A-Za-z0-9_]{3,16}$/.test(name.trim());
}
