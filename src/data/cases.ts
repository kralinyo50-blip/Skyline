import { SKIN_MAP, BASE_SKINS, RARITY, type Skin, type RarityKey, TIER_ORDER } from "./skins";
import { EXTRA_SKINS } from "./extraSkins";
import { LEGEND_SKINS, LEGEND_IDS } from "./legends";
import { WEAPON_CAT } from "./weaponCats";
import { CASE_MARKUP, roundCasePrice } from "../config";
import { TEAM_STICKER_IDS, CHAMPION_HOLO_IDS, CHAMPION_FOIL_IDS, CHAMPION_GOLD_IDS, STICKER_MAP, EXTRA_STICKER_IDS, ELITE_STICKER_IDS } from "./stickers";
import { seededRng } from "../lib/rng";

const CDN = "https://community.akamai.steamstatic.com/economy/image/";
const CASE_P =
  "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_f";

export interface CaseDef {
  id: string;
  name: string;
  img: string;
  price: number;
  accent: string;
  tagline: string;
  hot?: boolean;
  /** Turnuva paketi — içinden Hatıra (Souvenir) eşya çıkar */
  souvenir?: boolean;
  /** Sticker kapsülü */
  capsule?: boolean;
  /** Çıkan silahlar stickerlı gelir */
  stickered?: boolean;
  /** Anime koleksiyon kasası */
  anime?: boolean;
  /** Katalog dağıtımından etkilenmez — içeriği zaten tam havuz */
  sealed?: boolean;
  contents: Partial<Record<RarityKey, string[]>>;
}

/* ------------------------------------------------------------------
   GLOBAL KATALOG — kasaların zengin havuzu
   (BASE + 1.947 gerçek Steam skin + 50 efsane; varyantlar hariç)
   Aynı id'ye sahip skinler tekilleştirilir (efsane fiyatı kazanır).
------------------------------------------------------------------ */
const GLOBAL_BY_ID = new Map<string, Skin>();
[...BASE_SKINS, ...EXTRA_SKINS, ...LEGEND_SKINS].forEach((s) => GLOBAL_BY_ID.set(s.id, s));
const GLOBAL_RAW: Skin[] = [...GLOBAL_BY_ID.values()];

const GLOBAL_TIER: Record<RarityKey, Skin[]> = {
  consumer: [],
  industrial: [],
  milspec: [],
  restricted: [],
  classified: [],
  covert: [],
  rare: [],
};
GLOBAL_RAW.forEach((s) => {
  if (!GLOBAL_TIER[s.rarity].some((x) => x.id === s.id)) GLOBAL_TIER[s.rarity].push(s);
});
GLOBAL_TIER.consumer.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
GLOBAL_TIER.industrial.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
GLOBAL_TIER.milspec.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
GLOBAL_TIER.restricted.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
GLOBAL_TIER.classified.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
GLOBAL_TIER.covert.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
GLOBAL_TIER.rare.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));

/* kategoriye göre havuz — yeni temalı kasalar için */
function catsOf(ids: string[]): Skin[] {
  return GLOBAL_RAW.filter((s) => ids.includes(WEAPON_CAT[s.weapon] ?? ""));
}
function tierOf(pool: Skin[], tier: RarityKey): string[] {
  return pool.filter((s) => s.rarity === tier).map((s) => s.id);
}

/* CS gerçek oranlarına yakın ağırlıklar (onbinde) —
   ★ Aşırı Nadir (bıçak/eldiven) bilinçli olarak çok nadir: ~%0.04 */
export const TIER_WEIGHTS: Record<RarityKey, number> = {
  consumer: 7000,
  industrial: 5000,
  milspec: 7992,
  restricted: 1598,
  classified: 320,
  covert: 64,
  rare: 4,
};

/* standart kasa ağırlıkları (milspec tabanlı) */
const W_CASE: Partial<Record<RarityKey, number>> = {
  milspec: 7992,
  restricted: 1598,
  classified: 320,
  covert: 64,
  rare: 4,
};

function byTier(tier: RarityKey): string[] {
  return GLOBAL_TIER[tier].map((s) => s.id);
}

/* --- temalı kasa havuzları --- */
const KNIFE_POOL = catsOf(["Knives", "Gloves"]);
const AK_POOL = GLOBAL_RAW.filter((s) => s.weapon === "AK-47");
const AWP_POOL = GLOBAL_RAW.filter((s) => s.weapon === "AWP");
const PISTOL_POOL = catsOf(["Pistols"]);

const CASES_RAW: CaseDef[] = [
  {
    id: "gift",
    name: "Hediye Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSQ7FBhpZf460DiU1P1yZfmrSEMu_Gta_w-caSQXTbEwrYh4LY5FyrjlBh0sm2Am4uqcyrDcEZ-XUgUbjls",
    price: 0.99,
    accent: "#ff8ad4",
    tagline: "Her şey çıkabilir! (2.000+ skin)",
    sealed: true,
    contents: {
      consumer: byTier("consumer"),
      industrial: byTier("industrial"),
      milspec: byTier("milspec"),
      restricted: byTier("restricted"),
      classified: byTier("classified"),
      covert: byTier("covert"),
      rare: byTier("rare"),
    },
  },
  {
    id: "parcel",
    name: "Topluluk Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSQ7FBhptLn-lzkVRzlkYTzs3Bf6aL4PvQ0dqjFWmWRkLYltrg5HC_lwEsmsTjUztb7eC-WOAFxCpBuBbldcTpm2K4",
    price: 1.49,
    accent: "#8ad4ff",
    tagline: "Ucuz ve bol içerikli",
    contents: {
      consumer: ["negev-boroque"],
      industrial: ["negev-calicamo", "negev-bulkhead"],
      milspec: byTier("milspec"),
      restricted: ["bizon-antique", "mac10-tatter", "mac10-curse", "aug-torque", "glock-dragon-tattoo"],
    },
  },
  {
    id: "snakebite",
    name: "Snakebite Case",
    img: CDN + CASE_P + "r3oVvvT4bfI4dvTLCGTCmLl16ec7TX_mk08k42iHwtqscy-WPVUmCZJ4R_lK7Ed8Q6OYtw",
    price: 2.99,
    accent: "#9ee05a",
    tagline: "Başlangıç için birebir",
    contents: {
      milspec: ["negev-boroque", "negev-calicamo", "negev-dazzle"],
      restricted: ["glock-dragon-tattoo", "mac10-tatter"],
      classified: ["usp-kill-confirmed"],
      rare: ["gloves-duct-tape", "gloves-giraffe"],
    },
  },
  {
    id: "revolution",
    name: "Revolution Case",
    img: CDN + CASE_P + "rnAVvfb6aqduc_TFVjTCxbx05OU4S3jilE9w4DzRnImtIy2Sa1JzDJEhRPlK7EcO4U8gfA",
    price: 4.99,
    accent: "#ff5a6e",
    tagline: "Topluluğun favorisi",
    hot: true,
    contents: {
      milspec: ["mp7-skulls", "aug-wings", "sg-ultraviolet", "negev-phoenix"],
      restricted: ["usp-dark-water", "glock-dragon-tattoo"],
      classified: ["ak-case-hardened"],
      covert: ["awp-lightning-strike"],
      rare: ["bayonet-vanilla", "gloves-ddpat", "gloves-arboreal"],
    },
  },
  {
    id: "clutch",
    name: "Clutch Case",
    img: CDN + CASE_P + "rHsVtqr8a_dsdKTAWDWVxLgjsrAwHSvgwEQk4m-ByYuqIC2eO1VyD5QiR_lK7EcxQQPYQA",
    price: 7.49,
    accent: "#ffb020",
    tagline: "Fire Serpent avı",
    contents: {
      milspec: ["negev-dazzle", "negev-calicamo", "negev-bulkhead"],
      restricted: ["m4a1s-dark-water", "usp-dark-water"],
      classified: ["ak-redline", "deagle-hypnotic"],
      covert: ["ak-fire-serpent"],
      rare: ["gloves-badlands", "gloves-overprint", "gloves-caution"],
    },
  },
  {
    id: "brokenfang",
    name: "Broken Fang Case",
    img: CDN + CASE_P + "r3UVu6P-MPQ0dKbCVzLGx7wgtbM6S3jhw0V25m-EnNj7JS7GaQ4nD8QiRflK7EfH0YGFHg",
    price: 8.99,
    accent: "#ffd24a",
    tagline: "Operasyonun ganimeti",
    contents: {
      milspec: ["p90-module", "p2000-pulse", "tec9-isaac"],
      restricted: ["mac10-tatter", "usp-dark-water"],
      classified: ["ak-redline", "usp-kill-confirmed"],
      covert: ["ak-fire-serpent"],
      rare: ["gloves-shamagh", "gloves-duct-tape", "gloves-caution", "karambit-doppler"],
    },
  },
  {
    id: "recoil",
    name: "Recoil Case",
    img: CDN + CASE_P + "rnMVu6b-avA-JqSSCjSWwuhz47U9TCzlxh9yt2WGnNqgIi-fbgUkWMNxFPlK7EdIJF6a2Q",
    price: 12.99,
    accent: "#53c8ff",
    tagline: "Karambit peşinde koş",
    hot: true,
    contents: {
      milspec: ["aug-wings", "mp7-skulls", "negev-phoenix"],
      restricted: ["usp-dark-water", "m4a1s-dark-water"],
      classified: ["m4a1s-hyper-beast", "awp-asiimov"],
      covert: ["m4a4-howl"],
      rare: ["gloves-cobalt", "gloves-caution", "karambit-doppler"],
    },
  },
  {
    id: "huntsman",
    name: "Huntsman Weapon Case",
    img: CDN + CASE_P + "rmxY6qr9OqU0cvbKCGTDk7dys7k-S36yzU114GrRmNaoeSmXaVV0WJp0W6dU5Q_KKWwm",
    price: 14.99,
    accent: "#b26bff",
    tagline: "Howl'un evidir",
    contents: {
      milspec: [
        "tec9-isaac",
        "ssg-slashed",
        "dualies-retribution",
        "galil-kami",
        "p90-desert-warfare",
        "cz-poison-dart",
        "cz-twist",
        "p2000-pulse",
      ],
      restricted: ["aug-torque", "bizon-antique", "mac10-curse", "xm-heaven-guard", "mac10-tatter"],
      classified: ["m4a1s-atomic-alloy"],
      covert: ["m4a4-howl"],
      rare: ["bayonet-vanilla", "gloves-ddpat"],
    },
  },
  {
    id: "hydra",
    name: "Operation Hydra Case",
    img: CDN + CASE_P + "rHUVt_b6PfY1JfOSXDXJxbgjtLFqHnDqx0Qmtm_Vzdf4ICmUZlJ2C5F2TPlK7EdjN0FcPg",
    price: 16.99,
    accent: "#6ee7ff",
    tagline: "Derin sulardan ganimet",
    contents: {
      milspec: ["galil-kami", "cz-twist", "dualies-retribution", "ssg-slashed"],
      restricted: ["xm-heaven-guard", "m4a1s-dark-water"],
      classified: ["m4a1s-atomic-alloy", "deagle-hypnotic"],
      covert: ["m4a4-howl"],
      rare: ["gloves-overprint", "gloves-badlands", "butterfly-fade"],
    },
  },
  {
    id: "gamma2",
    name: "Gamma 2 Case",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjz61TqQCKj0JfipHMN7aX2bfM9eaPDXT7Glbx1s7Y8HHHnw0sltWXSmYmqcH-UaAU-Sswn_16VNj0",
    price: 19.99,
    accent: "#c1ff3d",
    tagline: "Dragon Lore veya hiç",
    contents: {
      milspec: ["sg-ultraviolet", "aug-wings"],
      restricted: ["m4a1s-dark-water"],
      classified: ["awp-asiimov", "deagle-blaze"],
      covert: ["awp-dragon-lore", "ak-fire-serpent"],
      rare: ["butterfly-fade", "karambit-doppler"],
    },
  },
  {
    id: "glove",
    name: "Glove Case",
    img: CDN + CASE_P + "rHcVuPaoafU1JqiVWWSVkux15OQ8Giiylk0k5mvTnIqpd3PCaQIhWMYkE_lK7EcNeCKW-w",
    price: 24.99,
    accent: "#c69bff",
    tagline: "Eldiven deposu",
    contents: {
      milspec: ["negev-boroque", "negev-bulkhead"],
      restricted: ["glock-dragon-tattoo"],
      classified: ["deagle-hypnotic"],
      covert: ["awp-lightning-strike"],
      rare: [
        "gloves-duct-tape",
        "gloves-shamagh",
        "gloves-ddpat",
        "gloves-arboreal",
        "gloves-giraffe",
        "gloves-badlands",
        "gloves-overprint",
        "gloves-caution",
        "gloves-cobalt",
      ],
    },
  },
  {
    id: "kilowatt",
    name: "Kilowatt Case",
    img: CDN + CASE_P + "rnEVvqf_a6VoIfGSXz7Hlbwg57QwSS_mxhl15jiGyN37c3_GZw91W8BwRflK7EfKsa2sfw",
    price: 2.99,
    accent: "#ff5a6e",
    tagline: "2024'ün yeni nesli — Black Lotus & Chrome Cannon",
    hot: true,
    contents: {
      milspec: [
        "dual-berettas-hideout",
        "mac-10-light-box",
        "nova-dark-sigil",
        "ssg-08-dezastre",
        "tec-9-slag",
        "ump-45-motorized",
        "xm1014-irezumi",
      ],
      restricted: [
        "glock-18-block-18",
        "m4a4-etch-lord",
        "five-seven-hybrid",
        "mp7-just-smile",
        "sawed-off-analog-input",
      ],
      classified: ["m4a1-s-black-lotus", "zeus-x27-olympus", "usp-s-jawbreaker"],
      covert: ["awp-chrome-cannon", "ak-47-inheritance"],
    },
  },
  {
    id: "gallery",
    name: "Gallery Case",
    img: CDN + CASE_P + "rnYVuPD5baE6IfTFCmSRme0j5eU5SXrjkRwmt2rWnoqhdnjEPQQiDpRxTflK7EePRV2-Kg",
    price: 2.99,
    accent: "#53c8ff",
    tagline: "Sanat galerisi — Gold Toof & Vaporwave",
    hot: true,
    contents: {
      milspec: [
        "usp-s-27",
        "desert-eagle-calligraffiti",
        "mp5-sd-statics",
        "aug-luxe-trim",
        "m249-hypnosis",
        "r8-revolver-tango",
        "scar-20-trail-blazer",
      ],
      restricted: [
        "m4a4-turbine",
        "dual-berettas-hydro-strike",
        "mac-10-saib-oni",
        "p90-randy-rush",
        "ssg-08-rapid-transit",
      ],
      classified: ["ak-47-the-outsiders", "p250-epicenter", "ump-45-neo-noir"],
      covert: ["glock-18-gold-toof", "m4a1-s-vaporwave"],
    },
  },
  {
    id: "fever",
    name: "Fever Case",
    img: CDN + CASE_P + "rncVtqv7MPE8JaHHCj_Dl-wk4-NtFirikURy4jiGwo2udHqVaAEjDZp3EflK7EeSMnMs4w",
    price: 3.49,
    accent: "#c1ff3d",
    tagline: "2025'in en ateşli kasası — AWP Printstream",
    hot: true,
    contents: {
      milspec: [
        "m4a4-choppa",
        "mag-7-resupply",
        "ssg-08-memorial",
        "p2000-sure-grip",
        "usp-s-pc-grn",
        "mp9-nexus",
        "xm1014-mockingbird",
      ],
      restricted: [
        "desert-eagle-serpent-strike",
        "zeus-x27-tosai",
        "nova-rising-sun",
        "galil-ar-control",
        "p90-wave-breaker",
      ],
      classified: ["ak-47-searing-rage", "glock-18-shinobu", "ump-45-k-o-factory"],
      covert: ["famas-bad-trip", "awp-printstream"],
    },
  },
  {
    id: "vault",
    name: "Gizemli Sandık",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSQ7FBhrZf460DiUw6_mse3-yddvab2MfRrcqGWWGOVme10s7g_Fnm1wEx-6znRz4z7I32WaRhgVMUd4mX-iw",
    price: 34.99,
    accent: "#f2e14a",
    tagline: "Yüksek bahis, yüksek ödül",
    hot: true,
    contents: {
      milspec: ["mp7-skulls", "aug-wings", "sg-ultraviolet", "cz-poison-dart"],
      restricted: ["m4a1s-dark-water", "xm-heaven-guard", "aug-torque"],
      classified: ["ak-case-hardened", "awp-asiimov", "deagle-blaze", "m4a1s-atomic-alloy"],
      covert: ["awp-dragon-lore", "m4a4-howl", "ak-fire-serpent"],
      rare: ["karambit-doppler", "butterfly-fade", "gloves-cobalt", "gloves-caution"],
    },
  },
];

/* ---------------- EFSANELER KASASI (50 ikonik skin) ---------------- */
{
  const L = LEGEND_IDS;
  CASES_RAW.push({
    id: "legends",
    name: "Efsaneler Kasası",
    /* Chroma Case — Karambit Fade/Doppler'in geldiği ikonik kasa */
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fq2wP7qr6bqI5cvHDCzfBlbcv57JqF3zrxRkj4W6Dwo34dy6QPQAoC5ZyW6dU5cxvklfG",
    price: 0,
    accent: "#e4ae39",
    tagline: "50 efsane — Dragon Lore, Fire Serpent, Karambit Fade…",
    hot: true,
    sealed: true,
    contents: {
      classified: L.classified,
      covert: L.covert,
      rare: L.rare,
    },
  });
}

/* ---------------- YENİ TEMALI KASALAR (katalog dağıtımı) ---------------- */
{
  /* AK-47 Kasası */
  CASES_RAW.push({
    id: "ak-case",
    name: "AK-47 Kasası",
    /* Operation Bravo Case — Fire Serpent'in geldiği efsane kasa */
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj7-lz1QAn4kZjf9CsVuvf7OfQ5IabBVzbHlb915bcwHCjikEp_sTnTn4z6eH6RblQlC8RwFPlK7EdXSP0Ibg",
    price: 0,
    accent: "#ff8a3d",
    tagline: "61+ AK deseni tek kasada",
    sealed: true,
    contents: {
      milspec: tierOf(AK_POOL, "milspec"),
      restricted: tierOf(AK_POOL, "restricted"),
      classified: tierOf(AK_POOL, "classified"),
      covert: tierOf(AK_POOL, "covert"),
    },
  });

  /* AWP Kasası */
  CASES_RAW.push({
    id: "awp-case",
    name: "AWP Kasası",
    /* Operation Phoenix Weapon Case — AWP Asiimov'un geldiği kasa */
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr2wPtqP5PKVvJPSQDWSSl7sn6eMxHC3hwhl3sDuDztivJHrEagJzWZd3W6dU5fXcT7oM",
    price: 0,
    accent: "#57d6ff",
    tagline: "52+ AWP — Dragon Lore'dan Gungnir'e",
    sealed: true,
    contents: {
      milspec: tierOf(AWP_POOL, "milspec"),
      restricted: tierOf(AWP_POOL, "restricted"),
      classified: tierOf(AWP_POOL, "classified"),
      covert: tierOf(AWP_POOL, "covert"),
    },
  });

  /* Pistol Kasası */
  CASES_RAW.push({
    id: "pistols-case",
    name: "Pistol Kasası",
    /* eSports 2013 Case — klasik ilk CS:GO kasası */
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjx-UnoUwniocSwrHEV7KaobPdud6HEWjXGmbYl6LIwHn2ywhgh5GzXzdmsc3yRalAkD5R3FvlK7Ed7JoXDRQ",
    price: 0,
    accent: "#b6f05a",
    tagline: "436 pistol — uygun başlangıç",
    sealed: true,
    contents: {
      consumer: tierOf(PISTOL_POOL, "consumer"),
      industrial: tierOf(PISTOL_POOL, "industrial"),
      milspec: tierOf(PISTOL_POOL, "milspec"),
      restricted: tierOf(PISTOL_POOL, "restricted"),
      classified: tierOf(PISTOL_POOL, "classified"),
      covert: tierOf(PISTOL_POOL, "covert"),
    },
  });

  /* Zeus Kasası — yeni elektroşok ailesinin tamamı */
  CASES_RAW.push({
    id: "zeus-case",
    name: "Zeus Kasası",
    /* Kilowatt Case görseli — Zeus Olympus'un geldiği gerçek kasa */
    img: CDN + CASE_P + "rnEVvqf_a6VoIfGSXz7Hlbwg57QwSS_mxhl15jiGyN37c3_GZw91W8BwRflK7EfKsa2sfw",
    price: 0,
    accent: "#ffd24a",
    tagline: "7 Zeus x27 — elektroşok avı!",
    hot: true,
    sealed: true,
    contents: {
      consumer: ["zeus-x27-swamp-ddpat"],
      industrial: ["zeus-x27-electric-blue"],
      milspec: ["zeus-x27-earth-mandala"],
      restricted: ["zeus-x27-charged-up", "zeus-x27-tosai"],
      classified: ["zeus-x27-olympus", "zeus-x27-dragon-snore"],
    },
  });

  /* Bıçak & Eldiven Kasası — her açılışta garantili bıçak/eldiven */
  CASES_RAW.push({
    id: "knife-case",
    name: "Bıçak & Eldiven Kasası",
    /* Falchion Case — bıçaklı ilk modern kasa */
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fpWwI7Pb-P6Y5dvPEDGSSlrsh57U8HHHiwx5yt2-Dwo7_JSnCOw8oCJF0W6dU5dgrLNA1",
    price: 0,
    accent: "#e4ae39",
    tagline: "539 bıçak/eldiven — hepsi çıkabilir!",
    hot: true,
    sealed: true,
    contents: {
      rare: KNIFE_POOL.map((s) => s.id),
    },
  });

  /* Efsane StatTrak™ Kasası — 1M+ seviye */
  CASES_RAW.push({
    id: "ultra-case",
    name: "Efsane StatTrak™ Kasası",
    /* Shattered Web Case — en yüksek değerli modern kasa */
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3EVvKD6MKU_cKPKXWHFxLkls7FsSnDqwUl_sWTczoqheHifbwMmD5F1RvlK7Ec_KL6Q_A",
    price: 0,
    accent: "#ff5f9e",
    tagline: "StatTrak™ Dragon Lore, Howl, Fire Serpent…",
    hot: true,
    sealed: true,
    contents: {
      covert: LEGEND_IDS.covert.map((id) => id + "-st"),
    },
  });
}

/* ---------------- Sticker kapsülleri & stickerlı kasa ---------------- */
const STICKER_CASES: CaseDef[] = [
  {
    id: "capsule-classic",
    name: "Sticker Kapsülü",
    img:
      CDN +
      "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ikLvrz-PfRpcKeQCzPEk-p147M_SXrglx8l4m2EnoqvJS2eagchCZQiQeADrFDmxXUYlhnp",
    price: 0,
    accent: "#4b69ff",
    tagline: "Silahlarını süsle",
    capsule: true,
    contents: {
      milspec: [
        "st-lucky13",
        "st-aces",
        "st-conquered",
        "st-destroy",
        "st-blackdog",
        "st-fearsome",
        "st-shooter",
        "st-snowflake",
        "st-bears",
        "st-mountain",
      ],
      restricted: [
        "st-aces-holo",
        "st-fearsome-holo",
        "st-shooter-foil",
        "st-snowflake-foil",
        "st-mountain-foil",
        "st-frosty",
      ],
      classified: ["st-bears-foil", "st-frosty-foil"],
    },
  },
  {
    id: "capsule-legends",
    name: "İmza Kapsülü — Efsaneler",
    img:
      CDN +
      "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ilk7f29fKtjcqDCVliX0-FjoN5lSi62mxk0_WjUyYn8dyiSbwUmXsRyQeQP5hGwwdO2M-3n4VbZgoxMnij9jCJO7Ch1o7FVq6FnCr0",
    price: 0,
    accent: "#e4ae39",
    tagline: "Altın imza avı",
    capsule: true,
    hot: true,
    contents: {
      milspec: ["st-coldzera", "st-fallen", "st-felps", "st-aces", "st-shooter"],
      restricted: ["st-coldzera-foil", "st-fallen-foil", "st-felps-foil", "st-frosty"],
      classified: ["st-bears-foil", "st-frosty-foil"],
      covert: ["st-coldzera-gold", "st-fallen-gold", "st-felps-gold"],
    },
  },
  {
    id: "capsule-elite",
    name: "Elit Sticker Kapsülü",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ilk7OKmOvQ_dM-UHGiF0dF1uOBkXyC8mw5psDjTwt-vI3rDPwMlWJd0ROMP5xPskdLmNe7n5AeI2YJBmST9iyoavzErvbi0sb1FJQ",
    price: 0,
    accent: "#e4ae39",
    tagline: "300 elit sticker — 5.000$'dan başlar, Gold'a kadar",
    capsule: true,
    hot: true,
    contents: {
      milspec: ELITE_STICKER_IDS.filter((id) => STICKER_MAP[id]?.rarity === "high"),
      restricted: ELITE_STICKER_IDS.filter((id) => STICKER_MAP[id]?.rarity === "remarkable"),
      classified: ELITE_STICKER_IDS.filter((id) => STICKER_MAP[id]?.rarity === "exotic"),
      covert: ELITE_STICKER_IDS.filter((id) => STICKER_MAP[id]?.rarity === "extraordinary"),
    },
  },
  {
    id: "capsule-steam",
    name: "Steam Sticker Kapsülü",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ikLvrz-PfRpcKeQCzPEk-p147M_SXrglx8l4m2EnoqvJS2eagchCZQiQeADrFDmxXUYlhnp",
    price: 0,
    accent: "#2fd673",
    tagline: "300 gerçek Steam sticker — 150$'dan başlar",
    capsule: true,
    hot: true,
    contents: {
      milspec: EXTRA_STICKER_IDS.filter((id) => STICKER_MAP[id]?.rarity === "high"),
      restricted: EXTRA_STICKER_IDS.filter((id) => STICKER_MAP[id]?.rarity === "remarkable"),
      classified: EXTRA_STICKER_IDS.filter((id) => STICKER_MAP[id]?.rarity === "exotic"),
      covert: EXTRA_STICKER_IDS.filter((id) => STICKER_MAP[id]?.rarity === "extraordinary"),
    },
  },
  {
    id: "capsule-esports",
    name: "E-Spor Takım Kapsülü",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ilk7P2jZbFjKeSKXDfCkNF1sfF6WiW22xsjtm7XmImsJHzFPw8gXpMhRbVfs0Lrx9blNO-07wzbi4IXyHqqjCpXrnE8kTJtUHk",
    price: 0,
    accent: "#4b69ff",
    tagline: "Takımını silahına taşı",
    capsule: true,
    hot: true,
    contents: {
      milspec: TEAM_STICKER_IDS.filter((id) => !id.endsWith("-holo") && !id.endsWith("-foil") && !id.endsWith("-gold")),
      restricted: TEAM_STICKER_IDS.filter((id) => id.endsWith("-holo")),
      classified: TEAM_STICKER_IDS.filter((id) => id.endsWith("-foil")),
      covert: TEAM_STICKER_IDS.filter((id) => id.endsWith("-gold")),
    },
  },
  {
    id: "capsule-champions",
    name: "Major Şampiyon Kapsülü",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjn_lDkShjjoYbh_ilk7OKmOvQ_dM-UHGiF0dF1uOBkXyC8mw5psDjTwt-vI3rDPwMlWJd0ROMP5xPskdLmNe7n5AeI2YJBmST9iyoavzErvbi0sb1FJQ",
    price: 0,
    accent: "#e4ae39",
    tagline: "Sadece Major şampiyonları — çok değerli",
    capsule: true,
    hot: true,
    contents: {
      restricted: CHAMPION_HOLO_IDS,
      classified: CHAMPION_FOIL_IDS,
      covert: CHAMPION_GOLD_IDS,
    },
  },
  {
    id: "graffiti-ops",
    name: "Graffiti Operasyon Kasası",
    img:
      CDN +
      "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3UVu6P-MPQ0dKbCVzLGx7wgtbM6S3jhw0V25m-EnNj7JS7GaQ4nD8QiRflK7EfH0YGFHg",
    price: 0,
    accent: "#ff8ad4",
    tagline: "Stickerlı silah garantili",
    stickered: true,
    hot: true,
    contents: {
      milspec: ["mp7-skulls", "aug-wings", "sg-ultraviolet", "p90-module", "cz-twist", "tec9-isaac"],
      restricted: ["usp-dark-water", "m4a1s-dark-water", "aug-torque", "mac10-curse"],
      classified: ["ak-redline", "usp-kill-confirmed", "m4a1s-hyper-beast"],
      covert: ["ak-fire-serpent", "awp-lightning-strike"],
      rare: ["gloves-caution", "karambit-doppler"],
    },
  },
];



/* ---------------- Turnuva (Hatıra) paketleri ---------------- */
const SOUVENIR_CASES: CaseDef[] = [
  {
    id: "sv-austin25",
    name: "Austin 2025 Hatıra Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJG5zlm-UfvRzd6yenqC9gQlptK76UvmVRjOn4Pzr3IJus2-eqtgL8-XC1ie1OVz_rY9S37kwh8h52_Qy92qcnmTOA8lDZNxQLQDsRe6mtW0ZezmtFPX2NpbjXKpvhIYpf8",
    price: 0,
    accent: "#ffd24a",
    tagline: "Major sahnesinden altın eşyalar",
    souvenir: true,
    contents: {
      industrial: ["negev-calicamo", "negev-bulkhead"],
      milspec: ["tec9-isaac", "ssg-slashed", "galil-kami", "p2000-pulse", "cz-twist"],
      restricted: ["aug-torque", "mac10-curse", "xm-heaven-guard"],
      classified: ["ak-redline", "m4a1s-atomic-alloy"],
      covert: ["awp-lightning-strike"],
    },
  },
  {
    id: "sv-budapest25",
    name: "Budapest 2025 Hatıra Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJG5zlm-UfvRzd6yenmC4QQlptK76UvmVRjOnIPkr3IJus2-eqtgL8-XC1ie1OVz_uA7SS_ilEUm5mnXntv9JymQZlAhDZp3TLUD4BC-mtzjNLvns1Tb2YlbjXKp2Yke3b8",
    price: 0,
    accent: "#7ee081",
    tagline: "Sahnenin en yeni hatıraları",
    souvenir: true,
    contents: {
      industrial: ["negev-bulkhead"],
      milspec: ["p90-module", "p90-desert-warfare", "dualies-retribution", "cz-poison-dart"],
      restricted: ["bizon-antique", "mac10-tatter", "usp-dark-water"],
      classified: ["usp-kill-confirmed", "deagle-hypnotic"],
      covert: ["ak-fire-serpent"],
    },
  },
  {
    id: "sv-shanghai24",
    name: "Shanghai 2024 Hatıra Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJG5zlm-UfvRzd6yemif5AQlptO76UvmVRjOjZ7hr3IJu82-eqtgL8-XC1ie1OVz_rA6H3-2kUQltTvRn46qeHmUbw92X5B0FLFe4xW6lYfjPrzjsQDYiINbjXKpXYSSkrU",
    price: 0,
    accent: "#ff6b8a",
    tagline: "Doğu'nun altın kasası",
    souvenir: true,
    contents: {
      industrial: ["negev-calicamo"],
      milspec: ["mp7-skulls", "aug-wings", "sg-ultraviolet"],
      restricted: ["m4a1s-dark-water", "glock-dragon-tattoo"],
      classified: ["awp-asiimov", "ak-case-hardened"],
      covert: ["m4a4-howl"],
    },
  },
  {
    id: "sv-paris23",
    name: "Paris 2023 Hatıra Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjk60vuUk-hzMXf7TBU4v2RbKFSLuWYCymRlbYgsuI8HX7rlhhxt2_Umdj9JXLGagcnDpIhE-MD5xe8wdXiMOjk-UWA3JoAHXbP",
    price: 0,
    accent: "#8ab4ff",
    tagline: "Son CS:GO Major'ının anısı",
    souvenir: true,
    contents: {
      milspec: ["negev-dazzle", "negev-phoenix", "tec9-isaac"],
      restricted: ["aug-torque", "usp-dark-water"],
      classified: ["m4a1s-hyper-beast", "deagle-blaze"],
      covert: ["awp-dragon-lore"],
    },
  },
  {
    id: "sv-rio22",
    name: "Rio 2022 Hatıra Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjm41a1EU-joYby8i9U0ParV6p4K_XdWTCVmO0m6bQ7THzlwx8i52WHnIqrcy-Wa1B1C8RxTLEO4Rm_l4XlNfSiuVKkZ-_svg",
    price: 0,
    accent: "#5ee0b8",
    tagline: "Karnaval coşkusu",
    souvenir: true,
    contents: {
      industrial: ["negev-bulkhead", "negev-calicamo"],
      milspec: ["galil-kami", "cz-twist", "p2000-pulse", "ssg-slashed"],
      restricted: ["mac10-curse", "xm-heaven-guard"],
      classified: ["ak-redline"],
      covert: ["awp-lightning-strike"],
    },
  },
  {
    id: "sv-antwerp22",
    name: "Antwerp 2022 Hatıra Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj15E3wRA_hzMayrx1L_f2jZ5tpJc-dG2yVj7oi4rhtSXiwkRwk5W_VzI2rdniTbVUhWJBxTeBe5kS5lYfmYe3h4lfAy9USZI7vLEE",
    price: 0,
    accent: "#c69bff",
    tagline: "Belçika'dan altın ganimet",
    souvenir: true,
    contents: {
      milspec: ["mp7-skulls", "p90-module", "cz-poison-dart"],
      restricted: ["bizon-antique", "m4a1s-dark-water"],
      classified: ["m4a1s-atomic-alloy", "awp-asiimov"],
      covert: ["ak-fire-serpent"],
    },
  },
];

/* Kasa fiyatı = beklenen değer × kâr payı (otomatik dengeli) */
function expectedValue(c: CaseDef): number {
  const weights = weightsFor(c);
  const tiers = (Object.keys(c.contents) as RarityKey[]).filter(
    (t) => (c.contents[t]?.length ?? 0) > 0 && (weights[t] ?? 0) > 0
  );
  const total = tiers.reduce((a, t) => a + (weights[t] ?? 0), 0) || 1;
  return tiers.reduce((acc, t) => {
    const pool = c.contents[t]!.map((id) => SKIN_MAP[id]).filter(Boolean);
    if (!pool.length) return acc;
    const avg = pool.reduce((s, k) => s + k.price, 0) / pool.length;
    /* hatıra paketlerinde eşyalar altın varyant olarak çıkar */
    const mult = c.souvenir ? 1.55 : 1;
    return acc + ((weights[t] ?? 0) / total) * avg * mult;
  }, 0);
}

/* ------------------------------------------------------------------
   Her kasadan en az N farklı skin düşebilsin.
   Eksik kasalar kendi kademelerinden genel havuzla tamamlanır.
   Hediye Paketi'ne (gift) hiç dokunulmaz — içeriği ve fiyatı korunur.
------------------------------------------------------------------ */
const MIN_CASE_SKINS = 11;

/* Katalog dağıtımı — her mevcut kasa kendi kademelerinden geniş bir alt havuz alır */
const ENRICH_CAPS: Record<RarityKey, number> = {
  consumer: 150,
  industrial: 130,
  milspec: 110,
  restricted: 75,
  classified: 45,
  covert: 30,
  rare: 45,
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Kasa kimliğine göre deterministik rotasyon — her kasa farklı ama dengeli alt küme alır */
function enrichCase(c: CaseDef): CaseDef {
  /* sticker kapsülleri dışında her kasa katalogdan geniş alt havuz alır */
  if (c.sealed || c.capsule) return c;
  const contents: CaseDef["contents"] = Object.fromEntries(
    Object.entries(c.contents).map(([k, v]) => [k, [...(v ?? [])]])
  ) as CaseDef["contents"];
  (Object.keys(contents) as RarityKey[]).forEach((t) => {
    const existing = contents[t] ?? [];
    const pool = byTier(t).filter((id) => !existing.includes(id));
    const cap = ENRICH_CAPS[t] ?? 30;
    if (existing.length >= cap || pool.length === 0) return;
    const start = hashStr(c.id + "::" + t) % pool.length;
    for (let i = 0; i < pool.length && contents[t]!.length < cap; i++) {
      contents[t]!.push(pool[(start + i) % pool.length]);
    }
  });
  return { ...c, contents };
}

function ensureSkinCount(c: CaseDef): CaseDef {
  /* sealed kasalar (gift, zeus-case vb.) içerikleri korunur — tamamlayıcı eklenmez */
  if (c.sealed) return c;
  const contents: CaseDef["contents"] = Object.fromEntries(
    Object.entries(c.contents).map(([k, v]) => [k, [...(v ?? [])]])
  ) as CaseDef["contents"];
  const tiers = (Object.keys(contents) as RarityKey[]).filter(
    (t) => (contents[t]?.length ?? 0) > 0
  );
  const total = () => tiers.reduce((a, t) => a + (contents[t]?.length ?? 0), 0);
  let guard = 0;
  while (total() < MIN_CASE_SKINS && guard++ < 40) {
    let added = false;
    for (const t of tiers) {
      if (total() >= MIN_CASE_SKINS) break;
      const pool = byTier(t).filter((id) => !(contents[t] ?? []).includes(id));
      if (pool.length) {
        contents[t] = [...(contents[t] ?? []), pool[0]];
        added = true;
      }
    }
    if (!added) break;
  }
  return { ...c, contents };
}

export const CASES: CaseDef[] = [
  ...CASES_RAW,
  ...STICKER_CASES,
  ...SOUVENIR_CASES,
].map((c) => {
  const e = enrichCase(ensureSkinCount(c));
  return {
    ...e,
    /* Hediye Paketi: değeri sabit tutulur (4200$) — zor skin zammından etkilenmez */
    /* Bıçak & Eldiven Kasası: +%45 zam (bıçak/eldiven zammının üzerine) */
    price:
      c.id === "gift"
        ? 4200
        : c.id === "knife-case"
          ? roundCasePrice(expectedValue(e) * CASE_MARKUP * 1.45 * (e.stickered ? 1.15 : 1))
          : roundCasePrice(expectedValue(e) * CASE_MARKUP * (e.stickered ? 1.15 : 1)),
  };
});

export const CASE_MAP: Record<string, CaseDef> = Object.fromEntries(
  CASES.map((c) => [c.id, c])
);

/* Kasada tüketici/endüstriyel kademe varsa oranları ona göre dağıt */
function weightsFor(caseDef: CaseDef): Partial<Record<RarityKey, number>> {
  const hasLow = (caseDef.contents.consumer?.length ?? 0) > 0 || (caseDef.contents.industrial?.length ?? 0) > 0;
  return hasLow
    ? TIER_WEIGHTS
    : W_CASE;
}

/* Bir kasadan ağırlıklı rastgele skin seç (+%10 StatTrak şansı) */
export function rollCase(caseDef: CaseDef): Skin {
  return rollCaseWith(caseDef, Math.random);
}

/* Provably Fair: seed + nonce ile deterministik sonuç —
   aynı seed/nonce her zaman aynı skin'i üretir (doğrulanabilir) */
export function rollCaseSeeded(caseDef: CaseDef, seed: string, nonce: number): Skin {
  const rng = seededRng(seed, nonce);
  return rollCaseWith(caseDef, rng);
}

function rollCaseWith(caseDef: CaseDef, rng: () => number): Skin {
  const weights = weightsFor(caseDef);
  const tiers = (Object.keys(caseDef.contents) as RarityKey[]).filter(
    (t) => (caseDef.contents[t]?.length ?? 0) > 0 && (weights[t] ?? 0) > 0
  );
  const totalW = tiers.reduce((acc, t) => acc + (weights[t] ?? 0), 0);
  let roll = rng() * totalW;
  let pickedTier: RarityKey = tiers[0];
  for (const t of tiers) {
    roll -= weights[t] ?? 0;
    if (roll <= 0) {
      pickedTier = t;
      break;
    }
  }
  const pool = caseDef.contents[pickedTier]!;
  const id = pool[Math.floor(rng() * pool.length)];
  let skin = SKIN_MAP[id];

  if (caseDef.souvenir) {
    /* turnuva paketlerinden her zaman Hatıra varyantı çıkar */
    const sv = SKIN_MAP[skin.id + "-sv"];
    if (sv) skin = sv;
  } else if (
    !skin.st &&
    skin.rarity !== "rare" &&
    skin.rarity !== "consumer" &&
    skin.rarity !== "industrial" &&
    rng() < 0.1
  ) {
    /* %10 StatTrak sürprizi */
    const st = SKIN_MAP[skin.id + "-st"];
    if (st) skin = st;
  }
  return skin;
}

/* Pity: kasadan covert/rare çekme garantisi — garanti dolduysa
   doğrudan yüksek kademe havuzundan döndür (deterministik değil, oyun içi kural).
   Bıçak/eldiven (rare) pity'de bile çok nadir: kademe ağırlığıyla seçilir
   (covert:rare ≈ 64:6), yani garanti neredeyse her zaman covert olur. */
export function rollCasePity(caseDef: CaseDef): Skin {
  const weights = weightsFor(caseDef);
  const tiers = (Object.keys(caseDef.contents) as RarityKey[]).filter(
    (t) => (caseDef.contents[t]?.length ?? 0) > 0 && (weights[t] ?? 0) > 0
  );
  const high = tiers.filter((t) => t === "covert" || t === "rare");
  if (!high.length) return rollCase(caseDef);
  /* yüksek kademe içinde kademe ağırlığıyla seç (rare ≈ %8.6) */
  const totalW = high.reduce((a, t) => a + (weights[t] ?? 0), 0);
  let roll = Math.random() * totalW;
  let tier: RarityKey = high[0];
  for (const t of high) {
    roll -= weights[t] ?? 0;
    if (roll <= 0) {
      tier = t;
      break;
    }
  }
  const pool = caseDef.contents[tier]!;
  const id = pool[Math.floor(Math.random() * pool.length)];
  let skin = SKIN_MAP[id];
  if (skin && skin.rarity !== "rare" && Math.random() < 0.1) {
    const st = SKIN_MAP[skin.id + "-st"];
    if (st) skin = st;
  }
  return skin ?? rollCase(caseDef);
}

/* Kasa içeriğini gösterim için sırala + gerçek olasılıkları hesapla */
export function caseContentsDetailed(caseDef: CaseDef) {
  const weights = weightsFor(caseDef);
  const tiers = (Object.keys(caseDef.contents) as RarityKey[]).filter(
    (t) => (caseDef.contents[t]?.length ?? 0) > 0 && (weights[t] ?? 0) > 0
  );
  const totalW = tiers.reduce((acc, t) => acc + (weights[t] ?? 0), 0);
  const odds: Partial<Record<RarityKey, number>> = {};
  tiers.forEach((t) => (odds[t] = ((weights[t] ?? 0) / totalW) * 100));

  const seen = new Set<string>();
  const items = tiers
    .flatMap((t) =>
      caseDef.contents[t]!.map((id) => (caseDef.souvenir ? SKIN_MAP[id + "-sv"] ?? SKIN_MAP[id] : SKIN_MAP[id]))
    )
    .filter(Boolean)
    /* aynı id iki kez görünmesin (havuz kopyalarına karşı güvence) */
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .sort(
      (a, b) =>
        RARITY[b.rarity].order - RARITY[a.rarity].order || b.price - a.price
    );

  return { items, odds };
}

export { TIER_ORDER };

/* Canlı düşüş akışı için sahte kullanıcı adları */
export const FEED_USERS = [
  "xKarambitx", "awpKrali34", "burak.exe", "NoScopeNiyazi", "DragonSlayerTR",
  "emirhan_fps", "ClutchKral", "S1mpleFan35", "Headshot_Hamdi", "yusuf2024",
  "RustyScout", "MDWKtl", "kaan_deagle", "b0ckwurst", "shadowstep06",
  "TRLegendV2", "ace_avcisi", "MidOrFeed", "serkan_aim", "GoldNovaTR",
  "pushw_34", "donkJr", "silentD3ath", "kripto_efe", "VandalBaron55",
  "zort_", "osi_official", "TapTapGoKill", "BeyazBarel", "nix0x",
  "MirageMusa", "InfernoIbo", "CacheCeto", "OverpassOzi", "AncientArda",
];

export const FEED_ACTIONS: { tier: RarityKey; weight: number }[] = [
  { tier: "milspec", weight: 42 },
  { tier: "restricted", weight: 30 },
  { tier: "classified", weight: 18 },
  { tier: "covert", weight: 7.5 },
  { tier: "rare", weight: 2.5 },
];
