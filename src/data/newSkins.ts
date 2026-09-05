import { asset } from "../lib/asset";
/* ------------------------------------------------------------------
   YENİ SKİN PAKETİ — 30 özel eşya (15 bıçak + 15 silah)
   Bu paket oyuna özel: gerçek Steam kataloğunda olmayan, AI ile
   çizilmiş yeni desenler. Kasa → pazar → sezon → depo akışında
   diğer skinlerle aynı sistemde çalışır (SKINS / GLOBAL katmanı).
------------------------------------------------------------------ */
import { type Skin } from "./skins";

export const NEW_SKINS: Skin[] = [
  /* ----------------------- ★ BIÇAKLAR (15) ----------------------- */
  { id: "ex-kukri-void-viper", weapon: "Kukri Knife", name: "Void Viper", img: asset("/images/skins/ex-kukri-void-viper.jpg"), rarity: "rare", price: 2600, ai: true },
  { id: "ex-ursus-crimson-fang", weapon: "Ursus Knife", name: "Crimson Fang", img: asset("/images/skins/ex-ursus-crimson-fang.jpg"), rarity: "rare", price: 2400, ai: true },
  { id: "ex-nomad-solar-flare", weapon: "Nomad Knife", name: "Solar Flare", img: asset("/images/skins/ex-nomad-solar-flare.jpg"), rarity: "rare", price: 2200, ai: true },
  { id: "ex-stiletto-nightshade", weapon: "Stiletto Knife", name: "Nightshade", img: asset("/images/skins/ex-stiletto-nightshade.jpg"), rarity: "rare", price: 1900, ai: true },
  { id: "ex-survival-neon-camo", weapon: "Survival Knife", name: "Neon Camo", img: asset("/images/skins/ex-survival-neon-camo.jpg"), rarity: "rare", price: 1500, ai: true },
  { id: "ex-paracord-moonlight", weapon: "Paracord Knife", name: "Moonlight", img: asset("/images/skins/ex-paracord-moonlight.jpg"), rarity: "rare", price: 1700, ai: true },
  { id: "ex-navaja-golden-dragon", weapon: "Navaja Knife", name: "Golden Dragon", img: asset("/images/skins/ex-navaja-golden-dragon.jpg"), rarity: "rare", price: 2000, ai: true },
  { id: "ex-bowie-glacier", weapon: "Bowie Knife", name: "Glacier", img: asset("/images/skins/ex-bowie-glacier.jpg"), rarity: "rare", price: 2300, ai: true },
  { id: "ex-huntsman-obsidian", weapon: "Huntsman Knife", name: "Obsidian", img: asset("/images/skins/ex-huntsman-obsidian.jpg"), rarity: "rare", price: 2100, ai: true },
  { id: "ex-falchion-blood-moon", weapon: "Falchion Knife", name: "Blood Moon", img: asset("/images/skins/ex-falchion-blood-moon.jpg"), rarity: "rare", price: 1800, ai: true },
  { id: "ex-gut-inferno", weapon: "Gut Knife", name: "Inferno", img: asset("/images/skins/ex-gut-inferno.jpg"), rarity: "rare", price: 1400, ai: true },
  { id: "ex-shadow-shattered", weapon: "Shadow Daggers", name: "Shattered", img: asset("/images/skins/ex-shadow-shattered.jpg"), rarity: "rare", price: 1600, ai: true },
  { id: "ex-classic-abyss", weapon: "Classic Knife", name: "Abyss", img: asset("/images/skins/ex-classic-abyss.jpg"), rarity: "rare", price: 2500, ai: true },
  { id: "ex-talon-emerald-queen", weapon: "Talon Knife", name: "Emerald Queen", img: asset("/images/skins/ex-talon-emerald-queen.jpg"), rarity: "rare", price: 3200, ai: true },
  { id: "ex-skeleton-ghost", weapon: "Skeleton Knife", name: "Ghost", img: asset("/images/skins/ex-skeleton-ghost.jpg"), rarity: "rare", price: 2800, ai: true },

  /* ----------------------- SİLAHLAR (15) ------------------------- */
  { id: "ex-ak47-anubis-oath", weapon: "AK-47", name: "Anubis Oath", img: asset("/images/skins/ex-ak47-anubis-oath.jpg"), rarity: "covert", price: 950, ai: true },
  { id: "ex-ak47-thunderwolf", weapon: "AK-47", name: "Thunderwolf", img: asset("/images/skins/ex-ak47-thunderwolf.jpg"), rarity: "classified", price: 220, ai: true },
  { id: "ex-m4a4-nebula-storm", weapon: "M4A4", name: "Nebula Storm", img: asset("/images/skins/ex-m4a4-nebula-storm.jpg"), rarity: "covert", price: 780, ai: true },
  { id: "ex-m4a1s-galaxy-runner", weapon: "M4A1-S", name: "Galaxy Runner", img: asset("/images/skins/ex-m4a1s-galaxy-runner.jpg"), rarity: "covert", price: 850, ai: true },
  { id: "ex-awp-phoenix-rising", weapon: "AWP", name: "Phoenix Rising", img: asset("/images/skins/ex-awp-phoenix-rising.jpg"), rarity: "covert", price: 1100, ai: true },
  { id: "ex-awp-frostbite", weapon: "AWP", name: "Frostbite", img: asset("/images/skins/ex-awp-frostbite.jpg"), rarity: "classified", price: 260, ai: true },
  { id: "ex-deagle-cyber-pulse", weapon: "Desert Eagle", name: "Cyber Pulse", img: asset("/images/skins/ex-deagle-cyber-pulse.jpg"), rarity: "covert", price: 420, ai: true },
  { id: "ex-usp-golden-hour", weapon: "USP-S", name: "Golden Hour", img: asset("/images/skins/ex-usp-golden-hour.jpg"), rarity: "covert", price: 350, ai: true },
  { id: "ex-glock-dragon-breath", weapon: "Glock-18", name: "Dragon Breath", img: asset("/images/skins/ex-glock-dragon-breath.jpg"), rarity: "classified", price: 120, ai: true },
  { id: "ex-mp9-beehive", weapon: "MP9", name: "Beehive", img: asset("/images/skins/ex-mp9-beehive.jpg"), rarity: "classified", price: 90, ai: true },
  { id: "ex-mp7-topgun-ace", weapon: "MP7", name: "Top Gun Ace", img: asset("/images/skins/ex-mp7-topgun-ace.jpg"), rarity: "restricted", price: 45, ai: true },
  { id: "ex-p90-radioactive", weapon: "P90", name: "Radioactive", img: asset("/images/skins/ex-p90-radioactive.jpg"), rarity: "classified", price: 110, ai: true },
  { id: "ex-famas-matriarch", weapon: "FAMAS", name: "Matriarch", img: asset("/images/skins/ex-famas-matriarch.jpg"), rarity: "restricted", price: 55, ai: true },
  { id: "ex-galil-night-owl", weapon: "Galil AR", name: "Night Owl", img: asset("/images/skins/ex-galil-night-owl.jpg"), rarity: "classified", price: 75, ai: true },
  { id: "ex-ssg-skyfall", weapon: "SSG 08", name: "Skyfall", img: asset("/images/skins/ex-ssg-skyfall.jpg"), rarity: "covert", price: 300, ai: true },
];
