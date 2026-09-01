/* ============================================================
   SEZON YOLU (Season Pass) — veri katmanı
   Her sezon 14 gün. XP: kasa +60, bahis 1/1000₺, dükkan satışı
   1/2000₺, günlük +25. 40 seviye · Free + Premium yol.
   Premium: sezon başına 75.000₺ — istenen an doğrudan alınır
   (VIP kademeleri gibi sıralı zorunluluk yok).
============================================================ */

export const SEASON_LEN_MS = 14 * 24 * 3600 * 1000;
/** Sezon 1 başlangıcı: 2026-01-01 00:00 UTC */
export const SEASON_ANCHOR = 1767225600000;
/** Premium yol fiyatı (sezon başına) */
export const SEASON_PREMIUM_PRICE = 75_000;
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

export type SeasonRewardKind = "money" | "skin";

export interface SeasonReward {
  kind: SeasonRewardKind;
  /** money: tutar · skin: skinId */
  amount?: number;
  skinId?: string;
  label?: string;
}

export interface SeasonTier {
  level: number;
  need: number;
  free: SeasonReward;
  /** premium yolu ödülü — premium yoksa kilitli */
  prem?: SeasonReward;
}

/** Sezon sonu premium büyük ödülü */
const PREM_FINAL: SeasonReward = { kind: "skin", skinId: "awp-dragon-lore", label: "AWP | Dragon Lore" };

/** 40 seviyeli ödül yolu — deterministik üretilir */
export const SEASON_TIERS: SeasonTier[] = (() => {
  const skins: Record<number, { free: SeasonReward; prem?: SeasonReward }> = {
    5: { free: { kind: "skin", skinId: "ak-47-asiimov", label: "AK-47 | Asiimov" }, prem: { kind: "money", amount: 20_000, label: "20.000₺" } },
    10: { free: { kind: "skin", skinId: "awp-asiimov", label: "AWP | Asiimov" }, prem: { kind: "money", amount: 35_000, label: "35.000₺" } },
    15: { free: { kind: "skin", skinId: "ak-47-vulcan", label: "AK-47 | Vulcan" }, prem: { kind: "money", amount: 55_000, label: "55.000₺" } },
    20: { free: { kind: "skin", skinId: "awp-wildfire", label: "AWP | Wildfire" }, prem: { kind: "money", amount: 80_000, label: "80.000₺" } },
    25: { free: { kind: "skin", skinId: "awp-containment-breach", label: "AWP | Containment Breach" }, prem: { kind: "money", amount: 110_000, label: "110.000₺" } },
    30: { free: { kind: "skin", skinId: "ak-47-bloodsport", label: "AK-47 | Bloodsport" }, prem: { kind: "money", amount: 150_000, label: "150.000₺" } },
    35: { free: { kind: "skin", skinId: "awp-atheris", label: "AWP | Atheris" }, prem: { kind: "money", amount: 200_000, label: "200.000₺" } },
    40: { free: { kind: "money", amount: 100_000, label: "100.000₺" }, prem: PREM_FINAL },
  };
  const out: SeasonTier[] = [];
  for (let lvl = 1; lvl <= SEASON_MAX_LEVEL; lvl++) {
    const sp = skins[lvl];
    const moneyAmt = 1_500 + (lvl - 1) * 1_200 + lvl * lvl * 15;
    const premMoney = Math.round(moneyAmt * 2);
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
