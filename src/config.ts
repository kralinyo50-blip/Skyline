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

/* ---------------- VIP SINIFLARI (harcamaya göre) ---------------- */

export interface VipTier {
  id: "none" | "bakir" | "demir" | "altin" | "elmas" | "obsidyen" | "netherite";
  label: string;
  /** toplam harcama eşiği — bu kadar harcayınca sınıf aktif */
  minSpent: number;
  /** sınıf rozeti */
  icon: string;
  color: string;
  /** günlük ödül çarpanı */
  dailyMult: number;
  /** kaybedilen bahislerden geri ödeme oranı (0-1) */
  cashback: number;
  /** pazar satış komisyonu (0 = komisyonsuz) */
  fee: number;
  /** kasa açılışlarında indirim (%) */
  caseDisc: number;
}

/** VIP sınıfları — para harcadıkça yükselir, özellikler sınıfa göre artar */
export const VIP_TIERS: VipTier[] = [
  { id: "none", label: "Misafir", minSpent: 0, icon: "👤", color: "#8b98a5", dailyMult: 1, cashback: 0, fee: MARKET_FEE, caseDisc: 0 },
  { id: "bakir", label: "Bakır", minSpent: 250_000, icon: "🥉", color: "#c07a3e", dailyMult: 1.1, cashback: 0.02, fee: 0.045, caseDisc: 2 },
  { id: "demir", label: "Demir", minSpent: 1_000_000, icon: "⚙️", color: "#a8b2bd", dailyMult: 1.25, cashback: 0.04, fee: 0.04, caseDisc: 3 },
  { id: "altin", label: "Altın", minSpent: 5_000_000, icon: "🥇", color: "#ffd34d", dailyMult: 1.5, cashback: 0.06, fee: 0.03, caseDisc: 6 },
  { id: "elmas", label: "Elmas", minSpent: 15_000_000, icon: "💎", color: "#7fe3ff", dailyMult: 1.75, cashback: 0.09, fee: 0.02, caseDisc: 10 },
  { id: "obsidyen", label: "Obsidyen", minSpent: 40_000_000, icon: "🔮", color: "#b484ff", dailyMult: 2.5, cashback: 0.12, fee: 0.01, caseDisc: 15 },
  { id: "netherite", label: "Netherite", minSpent: 100_000_000, icon: "🌌", color: "#5eead4", dailyMult: 3, cashback: 0.18, fee: 0, caseDisc: 20 },
];

/** Harcamaya göre aktif VIP sınıfı */
export function vipTierOf(spent: number): VipTier {
  let cur = VIP_TIERS[0];
  for (const t of VIP_TIERS) if (spent >= t.minSpent) cur = t;
  return cur;
}

/** Bir sonraki VIP sınıfı (yoksa null) */
export function vipNextTier(spent: number): VipTier | null {
  return VIP_TIERS.find((t) => t.minSpent > spent) ?? null;
}

/** Kasa fiyat indirimi uygula (VIP sınıfına göre) */
export function applyVipCaseDisc(price: number, spent: number): number {
  const d = vipTierOf(spent).caseDisc;
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
