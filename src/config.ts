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

/* ---------------- VIP & CASHBACK ---------------- */

/** VIP paketleri — bakiyeyle satın alınır */
export const VIP_PLANS: {
  id: string;
  label: string;
  days: number;
  price: number;
  /** kaybedilen bahislerden geri ödeme oranı */
  cashback: number;
  /** günlük ödül çarpanı */
  dailyMult: number;
  /** pazar komisyonu (0 = VIP satıcı komisyonsuz satış) */
  fee: number;
}[] = [
  { id: "vip-1", label: "VIP 1 Gün", days: 1, price: 250_000, cashback: 0.02, dailyMult: 1.1, fee: 0 },
  { id: "vip-7", label: "VIP 7 Gün", days: 7, price: 1_500_000, cashback: 0.05, dailyMult: 1.25, fee: 0 },
  { id: "vip-30", label: "VIP 30 Gün", days: 30, price: 4_500_000, cashback: 0.08, dailyMult: 1.5, fee: 0 },
  { id: "vip-365", label: "VIP 365 Gün", days: 365, price: 8_800_000, cashback: 0.15, dailyMult: 2.5, fee: 0 },
];

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
