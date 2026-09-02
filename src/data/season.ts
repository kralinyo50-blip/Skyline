/* ============================================================
   SEZON YOLU (Season Pass) — veri katmanı
   Her sezon 14 gün. XP: kasa +60, bahis 1/1000₺, dükkan satışı
   1/2000₺, günlük +25. 40 seviye · Free + Premium yol.
   Premium: sezon başına 5.500.000₺ — yüksek yatırım, efsane
   ödüller (bıçak/eldiven serisi + finalde Dragon Lore paketi).
============================================================ */

export const SEASON_LEN_MS = 14 * 24 * 3600 * 1000;
/** Sezon 1 başlangıcı: 2026-01-01 00:00 UTC */
export const SEASON_ANCHOR = 1767225600000;
/** Premium yol fiyatı (sezon başına) */
export const SEASON_PREMIUM_PRICE = 5_500_000;
/** Seviye sayısı */
export const SEASON_MAX_LEVEL = 40;

export interface SeasonWindow {
  id: number;
  startAt: number;
  endAt: number;
}

export function seasonOf(now: number): SeasonWindow {
  const idx = Math.floor((now - SEASON_ANCHOR) / SEASON_LEN_MS);
  const startAt = SEASON_ANCHOR + idx * SEASON_LEN_MS;
  return { id: idx + 1, startAt, endAt: startAt + SEASON_LEN_MS };
}

/** seviye n'e geçmek için gereken xp (n = 1..40) */
export function seasonNeedXp(level: number): number {
  if (level < 1) return 0;
  if (level >= SEASON_MAX_LEVEL) return 0;
  return 50 + 12 * (level - 1);
}

/** xp → ulaşılan seviye (1..40) */
export function seasonLevelOf(xp: number): number {
  let lvl = 1;
  let acc = 0;
  while (lvl < SEASON_MAX_LEVEL) {
    const need = seasonNeedXp(lvl);
    if (xp < acc + need) break;
    acc += need;
    lvl++;
  }
  return lvl;
}

/** seviye içi ilerleme (0..need-1) */
export function seasonInto(xp: number, level: number): number {
  let acc = 0;
  for (let l = 1; l < level; l++) acc += seasonNeedXp(l);
  return Math.max(0, xp - acc);
}

export type SeasonRewardKind = "money" | "skin" | "bundle";

export interface SeasonReward {
  kind: SeasonRewardKind;
  /** money: tutar · bundle: bonus para · skin: — */
  amount?: number;
  skinId?: string;
  /** bundle: birden fazla skin (final ödülü) */
  skins?: string[];
  label?: string;
}

export interface SeasonTier {
  level: number;
  need: number;
  free: SeasonReward;
  /** premium yolu ödülü — premium yoksa kilitli */
  prem?: SeasonReward;
}

/** Sezon sonu premium büyük ödülü — Dragon Lore + Karambit Fade + 2M₺ */
const PREM_FINAL: SeasonReward = {
  kind: "bundle",
  amount: 2_000_000,
  skins: ["awp-dragon-lore", "karambit-fade"],
  label: "AWP | Dragon Lore + Karambit | Fade + 2.000.000₺",
};

/** 40 seviyeli ödül yolu — deterministik üretilir.
 *  Premium: 5, 10, 15, 20, 25, 30, 35'te efsane bıçak/eldiven serisi,
 *  40'ta final paket; kalan seviyelerde yüksek para (toplam ~13,7M₺). */
export const SEASON_TIERS: SeasonTier[] = (() => {
  const skins: Record<number, { free: SeasonReward; prem?: SeasonReward }> = {
    5: { free: { kind: "skin", skinId: "ak-47-asiimov", label: "AK-47 | Asiimov" }, prem: { kind: "skin", skinId: "ex-kukri-void-viper", label: "Kukri Knife | Void Viper ✨" } },
    10: { free: { kind: "skin", skinId: "awp-asiimov", label: "AWP | Asiimov" }, prem: { kind: "skin", skinId: "butterfly-knife-fade", label: "Butterfly Knife | Fade" } },
    15: { free: { kind: "skin", skinId: "ak-47-vulcan", label: "AK-47 | Vulcan" }, prem: { kind: "skin", skinId: "ex-talon-emerald-queen", label: "Talon Knife | Emerald Queen ✨" } },
    20: { free: { kind: "skin", skinId: "awp-wildfire", label: "AWP | Wildfire" }, prem: { kind: "skin", skinId: "sport-gloves-vice", label: "Sport Gloves | Vice" } },
    25: { free: { kind: "skin", skinId: "awp-containment-breach", label: "AWP | Containment Breach" }, prem: { kind: "skin", skinId: "ex-skeleton-ghost", label: "Skeleton Knife | Ghost ✨" } },
    30: { free: { kind: "skin", skinId: "ak-47-bloodsport", label: "AK-47 | Bloodsport" }, prem: { kind: "skin", skinId: "awp-gungnir", label: "AWP | Gungnir" } },
    35: { free: { kind: "skin", skinId: "awp-atheris", label: "AWP | Atheris" }, prem: { kind: "skin", skinId: "awp-medusa", label: "AWP | Medusa" } },
    40: { free: { kind: "money", amount: 100_000, label: "100.000₺" }, prem: PREM_FINAL },
  };
  const out: SeasonTier[] = [];
  for (let lvl = 1; lvl <= SEASON_MAX_LEVEL; lvl++) {
    const sp = skins[lvl];
    const moneyAmt = 1_500 + (lvl - 1) * 1_200 + lvl * lvl * 15;
    /* premium para: ~13,7M₺ toplam, seviyeyle hızla büyür */
    const premMoney = 10_000 + (lvl - 1) * 10_000 + lvl * lvl * 250;
    out.push({
      level: lvl,
      need: seasonNeedXp(lvl),
      free: sp?.free ?? { kind: "money", amount: moneyAmt, label: `${moneyAmt.toLocaleString("tr-TR")}₺` },
      prem: sp?.prem ?? { kind: "money", amount: premMoney, label: `${premMoney.toLocaleString("tr-TR")}₺` },
    });
  }
  return out;
})();

export const SEASON_TIER_MAP: Record<number, SeasonTier> = Object.fromEntries(
  SEASON_TIERS.map((t) => [t.level, t])
);

/** XP kaynakları — açıklama tablosu */
export const SEASON_XP_SOURCES = [
  { icon: "🎰", label: "Kasa açılışı", value: "+60 XP" },
  { icon: "🎲", label: "Oyun bahsi", value: "1 XP / 1.000₺" },
  { icon: "🏪", label: "Dükkan satış geliri", value: "1 XP / 2.000₺" },
  { icon: "🎁", label: "Günlük ödül", value: "+25 XP" },
];
