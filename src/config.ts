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
