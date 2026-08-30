import { skinArt, type PatternKind, type WeaponKind } from "./skinArt";
import type { RarityKey } from "./skins";

export interface GenSkin {
  id: string;
  weapon: string;
  name: string;
  img: string;
  rarity: RarityKey;
  price: number;
}

/* ---------------- silahlar ---------------- */
const WEAPONS: [string, WeaponKind, number][] = [
  ["AK-47", "rifle", 1.9],
  ["M4A4", "rifle", 1.7],
  ["M4A1-S", "rifle", 1.8],
  ["AWP", "sniper", 2.4],
  ["SSG 08", "sniper", 0.8],
  ["Desert Eagle", "pistol", 1.4],
  ["USP-S", "pistol", 1.1],
  ["Glock-18", "pistol", 1.0],
  ["Five-SeveN", "pistol", 0.7],
  ["Tec-9", "pistol", 0.6],
  ["P250", "pistol", 0.5],
  ["MP9", "smg", 0.55],
  ["MAC-10", "smg", 0.6],
  ["UMP-45", "smg", 0.65],
  ["P90", "smg", 0.8],
  ["MP7", "smg", 0.5],
  ["Galil AR", "rifle", 0.7],
  ["FAMAS", "rifle", 0.75],
  ["AUG", "rifle", 0.9],
  ["SG 553", "rifle", 0.85],
  ["Nova", "heavy", 0.45],
  ["XM1014", "heavy", 0.5],
  ["Negev", "heavy", 0.4],
  ["SCAR-20", "sniper", 0.55],
  ["G3SG1", "sniper", 0.5],
  ["CZ75-Auto", "pistol", 0.55],
  ["Dual Berettas", "pistol", 0.45],
  ["R8 Revolver", "pistol", 0.6],
  ["PP-Bizon", "smg", 0.45],
  ["MAG-7", "heavy", 0.5],
];

/* ---------------- desenler ---------------- */
type Finish = {
  name: string;
  pattern: PatternKind;
  colors: string[];
  rarity: RarityKey;
  base: number;
  glow?: boolean;
};

const FINISHES: Finish[] = [
  { name: "Kum Fırtınası", pattern: "camo", colors: ["#c8b28a", "#7d6a48", "#e6d6b3", "#fff6e0"], rarity: "consumer", base: 0.4 },
  { name: "Gece Devriyesi", pattern: "camo", colors: ["#3c4557", "#1b2130", "#5a6883", "#8fa0bd"], rarity: "consumer", base: 0.5 },
  { name: "Orman Gölgesi", pattern: "camo", colors: ["#4a5c3a", "#26301d", "#6f8a55", "#a9c48a"], rarity: "industrial", base: 1.2 },
  { name: "Buz Kırağı", pattern: "scales", colors: ["#bcd9ea", "#5d8ba8", "#e8f6ff", "#ffffff"], rarity: "industrial", base: 1.6 },
  { name: "Çelik Damar", pattern: "marble", colors: ["#9aa6b8", "#4a5568", "#dbe4f0", "#ffffff"], rarity: "milspec", base: 3 },
  { name: "Mavi Devre", pattern: "circuit", colors: ["#1e3a5f", "#0d1b2e", "#4fc3f7", "#b3e5fc"], rarity: "milspec", base: 4 },
  { name: "Kobalt Pul", pattern: "scales", colors: ["#26408b", "#12204d", "#5f7de0", "#a8bcff"], rarity: "milspec", base: 5 },
  { name: "Petek Zırh", pattern: "hex", colors: ["#5b6472", "#2b3038", "#98a4b6", "#d6dee9"], rarity: "milspec", base: 6 },
  { name: "Asit Sıçraması", pattern: "splatter", colors: ["#2f3a20", "#161c0e", "#9fd63a", "#d8ff7a"], rarity: "restricted", base: 11 },
  { name: "Kızıl Şerit", pattern: "stripes", colors: ["#1a1a1e", "#0c0c10", "#d92b2b", "#ff6b6b"], rarity: "restricted", base: 14 },
  { name: "Mor Sis", pattern: "marble", colors: ["#4b2a6b", "#241137", "#a86ede", "#e0c2ff"], rarity: "restricted", base: 17 },
  { name: "Turuncu Alev", pattern: "flames", colors: ["#1c1410", "#0a0806", "#ff7a18", "#ffd166"], rarity: "restricted", base: 21 },
  { name: "Neon Sokak", pattern: "neon", colors: ["#141a2e", "#080b16", "#00e5ff", "#ff3df0"], rarity: "classified", base: 42, glow: true },
  { name: "Kan Kristali", pattern: "marble", colors: ["#5c0f18", "#25060a", "#ff2d4a", "#ffb3bd"], rarity: "classified", base: 58 },
  { name: "Altın Nakış", pattern: "sakura", colors: ["#2a2216", "#12100a", "#e4ae39", "#fff0b8"], rarity: "classified", base: 76 },
  { name: "Kuantum Devre", pattern: "circuit", colors: ["#0f2b2b", "#041212", "#2ffdc4", "#c8fff0"], rarity: "classified", base: 95, glow: true },
  { name: "Ejder Nefesi", pattern: "flames", colors: ["#2b0a0a", "#120303", "#ff4d00", "#ffe066"], rarity: "covert", base: 210, glow: true },
  { name: "Yıldız Tozu", pattern: "splatter", colors: ["#101a3a", "#050a1c", "#7f5bff", "#ffffff"], rarity: "covert", base: 320, glow: true },
  { name: "Kaos Prizma", pattern: "marble", colors: ["#12043a", "#05011a", "#ff35c8", "#4ff0ff"], rarity: "covert", base: 520, glow: true },
  { name: "Ölüm Dişlisi", pattern: "teeth", colors: ["#241010", "#0d0505", "#ff2b2b", "#ffd0d0"], rarity: "covert", base: 780, glow: true },
];

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const GEN_SKINS: GenSkin[] = [];

WEAPONS.forEach(([weapon, kind, mult], wi) => {
  for (let j = 0; j < 5; j++) {
    const f = FINISHES[(wi * 7 + j * 4 + j) % FINISHES.length];
    const id = `gen-${slug(weapon)}-${slug(f.name)}`;
    if (GEN_SKINS.some((s) => s.id === id)) continue;
    GEN_SKINS.push({
      id,
      weapon,
      name: f.name,
      img: skinArt({ kind, pattern: f.pattern, colors: f.colors, glow: f.glow }),
      rarity: f.rarity,
      price: Math.max(0.2, Math.round(f.base * mult * 100) / 100),
    });
  }
});

export const ALL_GENERATED: GenSkin[] = [...GEN_SKINS];
