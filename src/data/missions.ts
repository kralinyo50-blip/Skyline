import { SCALE } from "../config";

export type MissionKey =
  | "cases"
  | "upgrades"
  | "battles"
  | "sales"
  | "wagered"
  | "games"
  | "keno"
  | "towers"
  | "hilo"
  | "slots"
  | "scratch"
  | "derby";

export interface MissionDef {
  id: string;
  key: MissionKey;
  label: string;
  goal: number;
  reward: number;
  icon: string;
}

export const MISSIONS: MissionDef[] = [
  { id: "m-case3", key: "cases", label: "3 kasa aç", goal: 3, reward: 8 * SCALE, icon: "📦" },
  { id: "m-case12", key: "cases", label: "12 kasa aç", goal: 12, reward: 26 * SCALE, icon: "🎁" },
  { id: "m-up1", key: "upgrades", label: "1 yükseltme kazan", goal: 1, reward: 14 * SCALE, icon: "⏫" },
  { id: "m-battle1", key: "battles", label: "1 kasa savaşı kazan", goal: 1, reward: 18 * SCALE, icon: "⚔️" },
  { id: "m-sale1", key: "sales", label: "Pazarda 1 eşya sat", goal: 1, reward: 10 * SCALE, icon: "🏪" },
  { id: "m-game3", key: "games", label: "3 şans oyunu oyna", goal: 3, reward: 12 * SCALE, icon: "🎲" },
  { id: "m-wager", key: "wagered", label: "50.000 çevrim yap", goal: 50_000, reward: 30 * SCALE, icon: "💰" },
  /* V2.0 yeni oyun misyonları */
  { id: "m-keno5", key: "keno", label: "5 Keno çekilişi yap", goal: 5, reward: 15 * SCALE, icon: "🎯" },
  { id: "m-towers3", key: "towers", label: "3 Kule turuna gir", goal: 3, reward: 15 * SCALE, icon: "🏰" },
  { id: "m-hilo5", key: "hilo", label: "5 Hilo zinciri başlat", goal: 5, reward: 15 * SCALE, icon: "🃏" },
  { id: "m-slots5", key: "slots", label: "5 Slots çevir", goal: 5, reward: 15 * SCALE, icon: "🎰" },
  { id: "m-scratch3", key: "scratch", label: "3 Kazı Kazan bilet kazı", goal: 3, reward: 15 * SCALE, icon: "🎟️" },
  { id: "m-derby3", key: "derby", label: "3 Derby koşusu oyna", goal: 3, reward: 15 * SCALE, icon: "🏇" },
];

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
