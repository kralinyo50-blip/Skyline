import type { Account } from "../store/db";
import { levelFromSpent } from "../store/Game";

/* ------------------------------------------------------------------
   Başarım tanımları — istatistik/envanter temelli otomatik rozetler
------------------------------------------------------------------ */

export interface AchievementDef {
  id: string;
  label: string;
  desc: string;
  icon: string;
  reward: number;
  /** bu başarımın tamamlanıp tamamlanmadığını kontrol et */
  check: (a: Account) => boolean;
  /** ilerleme yüzdesi (0-100) — opsiyonel */
  progress?: (a: Account) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-case",
    label: "İlk Kasa",
    desc: "İlk kasanı aç",
    icon: "🎁",
    reward: 5000,
    check: (a) => a.stats.opened >= 1,
    progress: (a) => Math.min(100, a.stats.opened),
  },
  {
    id: "cases-10",
    label: "Kasa Tutkunu",
    desc: "10 kasa aç",
    icon: "📦",
    reward: 15000,
    check: (a) => a.stats.opened >= 10,
    progress: (a) => Math.min(100, (a.stats.opened / 10) * 100),
  },
  {
    id: "cases-50",
    label: "Kasa Kralı",
    desc: "50 kasa aç",
    icon: "👑",
    reward: 50000,
    check: (a) => a.stats.opened >= 50,
    progress: (a) => Math.min(100, (a.stats.opened / 50) * 100),
  },
  {
    id: "boss-drop",
    label: "Efsane Avcısı",
    desc: "Bir kasadan Örtük veya ★ Aşırı Nadir çıkar",
    icon: "🐉",
    reward: 25000,
    check: (a) => (a.rollLogs ?? []).some((r) => r.rarity === "covert" || r.rarity === "rare"),
  },
  {
    id: "rich-100k",
    label: "Zenginlik",
    desc: "100.000$ bakiyeye ulaş",
    icon: "💰",
    reward: 10000,
    check: (a) => a.balance >= 100000,
    progress: (a) => Math.min(100, (a.balance / 100000) * 100),
  },
  {
    id: "rich-1m",
    label: "Milyoner",
    desc: "1.000.000$ bakiyeye ulaş",
    icon: "💎",
    reward: 100000,
    check: (a) => a.balance >= 1000000,
    progress: (a) => Math.min(100, (a.balance / 1000000) * 100),
  },
  {
    id: "upgrade-5",
    label: "Yükselici",
    desc: "5 kez upgrader kullan",
    icon: "⬆️",
    reward: 10000,
    check: (a) => (a.missions?.upgrades ?? 0) >= 5,
    progress: (a) => Math.min(100, ((a.missions?.upgrades ?? 0) / 5) * 100),
  },
  {
    id: "trader",
    label: "Tüccar",
    desc: "Pazarda 5 ilan sat",
    icon: "🛒",
    reward: 15000,
    check: (a) => (a.missions?.sales ?? 0) >= 5,
    progress: (a) => Math.min(100, ((a.missions?.sales ?? 0) / 5) * 100),
  },
  {
    id: "level-5",
    label: "Seviye 5",
    desc: "Seviye 5'e ulaş",
    icon: "🏅",
    reward: 20000,
    check: (a) => levelFromSpent(a.stats.spent) >= 5,
    progress: (a) => Math.min(100, (levelFromSpent(a.stats.spent) / 5) * 100),
  },
  {
    id: "snake-1",
    label: "Koleksiyoncu",
    desc: "Envanterinde 10 eşya bulun",
    icon: "🎒",
    reward: 10000,
    check: (a) => a.inventory.length >= 10,
    progress: (a) => Math.min(100, (a.inventory.length / 10) * 100),
  },
];

export const ACH_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);
