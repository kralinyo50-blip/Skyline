import { SKIN_MAP, BASE_SKINS, RARITY, type Skin, type RarityKey, TIER_ORDER } from "./skins";
import { LEGEND_IDS } from "./legends";
import { CASE_MARKUP, roundCasePrice } from "../config";
import { TEAM_STICKER_IDS } from "./stickers";
import { seededRng } from "../lib/rng";

/** Anime kasaları için SVG kapak görseli */
function caseArt(colors: string[], emoji: string): string {
  const [a, b, c] = colors;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">
<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="60%" stop-color="${b}"/><stop offset="100%" stop-color="${a}"/></linearGradient>
<linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity=".35"/><stop offset="55%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".5"/></linearGradient></defs>
<path d="M10,30 L60,10 L110,30 V74 L60,94 L10,74 Z" fill="url(#cg)"/>
<path d="M10,30 L60,50 L110,30" fill="none" stroke="${c}" stroke-width="3"/>
<path d="M60,50 V94" stroke="${c}" stroke-width="3"/>
<path d="M10,30 L60,10 L110,30 V74 L60,94 L10,74 Z" fill="url(#cs)"/>
<path d="M10,30 L60,10 L110,30 V74 L60,94 L10,74 Z" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="2.5"/>
<text x="60" y="66" text-anchor="middle" font-size="26">${emoji}</text>
</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg.replace(/\n/g, ""));
}

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
  contents: Partial<Record<RarityKey, string[]>>;
}

/* CS gerçek oranlarına yakın ağırlıklar (onbinde) */
export const TIER_WEIGHTS: Record<RarityKey, number> = {
  consumer: 7000,
  industrial: 5000,
  milspec: 7992,
  restricted: 1598,
  classified: 320,
  covert: 64,
  rare: 26,
};

/* standart kasa ağırlıkları (milspec tabanlı) */
const W_CASE: Partial<Record<RarityKey, number>> = {
  milspec: 7992,
  restricted: 1598,
  classified: 320,
  covert: 64,
  rare: 26,
};

function byTier(tier: RarityKey): string[] {
  return BASE_SKINS.filter((s) => s.rarity === tier).map((s) => s.id);
}

const CASES_RAW: CaseDef[] = [
  {
    id: "gift",
    name: "Hediye Paketi",
    img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSQ7FBhpZf460DiU1P1yZfmrSEMu_Gta_w-caSQXTbEwrYh4LY5FyrjlBh0sm2Am4uqcyrDcEZ-XUgUbjls",
    price: 0.99,
    accent: "#ff8ad4",
    tagline: "Her şey çıkabilir!",
    contents: {
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
    img: caseArt(["#ffd75e", "#b8860b", "#7a5c00"], "🐉"),
    price: 0,
    accent: "#e4ae39",
    tagline: "50 efsane — Dragon Lore, Fire Serpent, Karambit Fade…",
    hot: true,
    contents: {
      classified: L.classified,
      covert: L.covert,
      rare: L.rare,
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
    id: "capsule-esports",
    name: "E-Spor Takım Kapsülü",
    img: caseArt(["#4b69ff", "#101a3d", "#ffd166"], "🏆"),
    price: 0,
    accent: "#4b69ff",
    tagline: "Takımını silahına taşı",
    capsule: true,
    hot: true,
    contents: {
      milspec: TEAM_STICKER_IDS.filter((id) => !id.endsWith("-holo") && !id.endsWith("-gold")),
      restricted: TEAM_STICKER_IDS.filter((id) => id.endsWith("-holo")),
      covert: TEAM_STICKER_IDS.filter((id) => id.endsWith("-gold")),
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

function ensureSkinCount(c: CaseDef): CaseDef {
  if (c.id === "gift") return c;
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
  const e = ensureSkinCount(c);
  return {
    ...e,
    /* Hediye Paketi: değeri sabit tutulur, zor skin zammından etkilenmez */
    price:
      c.id === "gift"
        ? 4200
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
   doğrudan yüksek kademe havuzundan döndür (deterministik değil, oyun içi kural) */
export function rollCasePity(caseDef: CaseDef): Skin {
  const weights = weightsFor(caseDef);
  const tiers = (Object.keys(caseDef.contents) as RarityKey[]).filter(
    (t) => (caseDef.contents[t]?.length ?? 0) > 0 && (weights[t] ?? 0) > 0
  );
  const high = tiers.filter((t) => t === "covert" || t === "rare");
  if (!high.length) return rollCase(caseDef);
  const pool = high.flatMap((t) => caseDef.contents[t]!);
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

  const items = tiers
    .flatMap((t) =>
      caseDef.contents[t]!.map((id) => (caseDef.souvenir ? SKIN_MAP[id + "-sv"] ?? SKIN_MAP[id] : SKIN_MAP[id]))
    )
    .filter(Boolean)
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
