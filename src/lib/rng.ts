export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
  );
}

export function randHex(len: number): string {
  let out = "";
  const chars = "0123456789abcdef";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ------- PROVABLY FAIR: seed tabanlı deterministik RNG ------- */

/** Seed hex → 32-bit sayı (FNV-1a benzeri karıştırma) */
function seedToInt(seed: string, salt: string): number {
  let h = 2166136261;
  const s = seed + "::" + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — aynı seed + nonce her zaman aynı diziyi üretir */
export function seededRng(seed: string, nonce: number | string): () => number {
  let a = seedToInt(seed, String(nonce)) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* easeOutQuint — rulet hissi için */
export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/* CS style: başta küçük ivme, sonda uzun süzülme */
export function easeOutBack(t: number): number {
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
