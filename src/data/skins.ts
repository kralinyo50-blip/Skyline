import { money, priceOf, MIN_PRICE } from "../config";
import { STICKERS } from "./stickers";

export type RarityKey =
  | "consumer"
  | "industrial"
  | "milspec"
  | "restricted"
  | "classified"
  | "covert"
  | "rare";

export interface Skin {
  id: string;
  weapon: string;
  name: string;
  img: string;
  rarity: RarityKey;
  price: number;
  ai?: boolean;
  /** StatTrak™ varyantı */
  st?: boolean;
  /** Hatıra (Souvenir) varyantı */
  sv?: boolean;
  /** Sticker eşyası */
  sticker?: boolean;
}

export const RARITY: Record<
  RarityKey,
  { tr: string; en: string; color: string; order: number }
> = {
  consumer:   { tr: "Tüketici",      en: "Consumer Grade",     color: "#b0c3d9", order: 0 },
  industrial: { tr: "Endüstriyel",   en: "Industrial Grade",   color: "#5e98d9", order: 1 },
  milspec:    { tr: "Mil-Spec",      en: "Mil-Spec Grade",     color: "#4b69ff", order: 2 },
  restricted: { tr: "Kısıtlı",       en: "Restricted",         color: "#8847ff", order: 3 },
  classified: { tr: "Gizli",         en: "Classified",         color: "#d32ce6", order: 4 },
  covert:     { tr: "Örtük",         en: "Covert",             color: "#eb4b4b", order: 5 },
  rare:       { tr: "★ Aşırı Nadir", en: "Rare Special Item",  color: "#e4ae39", order: 6 },
};

export const TIER_ORDER: RarityKey[] = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
  "rare",
];

const CDN = "https://community.akamai.steamstatic.com/economy/image/";
const A = "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL";
const B = "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kK";

/* ------------------------------------------------------------------ */
/* Taban katalog — gerçek Steam görselleri + AI ikonikler              */
/* ------------------------------------------------------------------ */

const BASE: Skin[] = [
  /* ---------- CONSUMER ---------- */
  { id: "negev-boroque", weapon: "Negev", name: "Boroque Sand", img: CDN + A + "_m5Hl6x1T9s24bapoNP-sGmae_uJ_t-l9AX3glxh142zUzIz_dXiWPVMjX8EhF-MP40K8l9TiMr_j7lPXiYxGzyzgznQeGMlgK6w", rarity: "consumer", price: 0.06 },

  /* ---------- INDUSTRIAL ---------- */
  { id: "negev-calicamo", weapon: "Negev", name: "CaliCamo", img: CDN + A + "_m5Hl6x1T9s24abZkI_GeAViUxP1zovVWQyC0nQlptzzdzougeHmfaFJxWcZyTLVbtBTulNS0ZbjlsQTYjN1Dm3j8iX4c6DErvbiLvYVdBg", rarity: "industrial", price: 0.14 },
  { id: "negev-bulkhead", weapon: "Negev", name: "Bulkhead", img: CDN + A + "_m5Hl6x1T9s2qfad5M8-KC2uczvlJvOhuRz39kB50sWmBw4moJXnGPFd1WJMjFLFZs0S9lNGxNuLg7weLg91BzCj73TQJsHg2tHPevg", rarity: "industrial", price: 0.18 },

  /* ---------- MIL-SPEC ---------- */
  { id: "negev-dazzle", weapon: "Negev", name: "Dazzle", img: CDN + A + "_m5Hl6x1T9s2gbaNoNs-XD32KzetJvOhuRz39xxxzsmWEz9v9I3zFaQQiA5pzE7YLt0WwwdHkZrjktQXeg4gXyXj62zQJsHixNFIgjA", rarity: "milspec", price: 0.45 },
  { id: "negev-phoenix", weapon: "Negev", name: "Phoenix Stencil", img: CDN + A + "_m5Hl6x1T9s2-YKtoLvmLMXORxv1JouRtcCW6khUz_WzTy96heC-VbwMkDJB0FLMPtBi7x9XlN76x5VfYg98UySv3h35A7yd1o7FV05NZ2dU", rarity: "milspec", price: 0.6 },
  { id: "cz-twist", weapon: "CZ75-Auto", name: "Twist", img: CDN + A + "yhMG1_B1a4s2pcbZsNPWsAm6Xyfo45bY7TXzjxk5w42XXn93_cnLFOFN1C5t0ROANsBLtx9ziNu6x4FHejpUFk3uH-TvaLw", rarity: "milspec", price: 0.6 },
  { id: "ssg-slashed", weapon: "SSG 08", name: "Slashed", img: CDN + A + "ijZGwpR1Y-s29e6M9eM-aA2qf0_p3vN5kSi26gBBp62XXyon_eHKXagYoC5ZwFLQNska7lIfiY-rgtVCN2IxExX_9h34buDErvbiGjEi-fQ", rarity: "milspec", price: 0.7 },
  { id: "p90-module", weapon: "P90", name: "Module", img: CDN + A + "hx8bf_Cxk_f23aahvLPWWClicyOl-pK8_Sn_rwE1x5z6AyY6qeXmRb1cgWMNwR7Ff4Bm_m9y0Przq4A3b348Q02yg2QQMyM9M", rarity: "milspec", price: 0.7 },
  { id: "p2000-pulse", weapon: "P2000", name: "Pulse", img: CDN + A + "5lYayrXIL0PG7V7Q_cKDDMXeFzf1zj-1gSCGn201wsTnRm9egcS7DaABxDZckQe5Ys0S6xtKxZO-wsQDbi9lMxSv-jS5XrnE8fJdFk9o", rarity: "milspec", price: 0.8 },
  { id: "galil-kami", weapon: "Galil AR", name: "Kami", img: CDN + A + "2n5rp8SNJ0Pq3V6NsLPmfMWyRzOdJvOhuRz39wkl142uEwtqsJ3OealV1DZYmFuNZ4xTtx4HnZuPl4gaLjdpNnHqt3TQJsHjaThnzjg", rarity: "milspec", price: 0.8 },
  { id: "p90-desert-warfare", weapon: "P90", name: "Desert Warfare", img: CDN + B + "nwpHIVvfOsPfI9dqDCWDDGkb4j5OU_Fy_kx0l1tj6DnoqseC2TP1cpAsF2QPlK7EcMYXqtDg", rarity: "milspec", price: 0.9 },
  { id: "tec9-isaac", weapon: "Tec-9", name: "Isaac", img: CDN + A + "lm5W5wiFO0Oara_1SIeOaB2qf19F6ueZhW2frlEpz6zyAy477dXrEagFxDcclRO4C5EK8wIa1Nem3s1TdiotNzCn5kGoXuYgN6W8t", rarity: "milspec", price: 1.1 },
  { id: "aug-wings", weapon: "AUG", name: "Wings", img: CDN + A + "wi5Hf9Ttk6fevfKxoMuOsD3KX_uJ_t-l9AX7qzE5_sGmEw9uoJCrBOgMoDsN2ReMI4EPrm4fvY-m04ASPgt8Uz3_gznQePzx-iqc", rarity: "milspec", price: 1.2 },
  { id: "cz-poison-dart", weapon: "CZ75-Auto", name: "Poison Dart", img: CDN + B + "nj53UO7ryvaac0dKiVW2XBlrwmsuA6GH3hkE9062qEz9aoeCmVawchW8dwEe4MrFDmxWPDR_Ga", rarity: "milspec", price: 1.5 },
  { id: "sg-ultraviolet", weapon: "SG 553", name: "Ultraviolet", img: CDN + A + "imcO1qx1I4M2-fbZ9LPWsAm6Xyfo44bQ-Tn7gwRt-t2uAw96tIn7FOAF1CsckQLUJ4xXskdO2NLzrtAyIi5UFk3tU_MwgmA", rarity: "milspec", price: 1.6 },
  { id: "dualies-retribution", weapon: "Dual Berettas", name: "Retribution", img: CDN + B + "nl8StP6ryvOqJpJqjACjbBkb93srg-Fn7ilBhysWXSyNarJSqUZlIpCMclTbMCrFDmxYRwJ9Kk", rarity: "milspec", price: 1.8 },
  { id: "mp7-skulls", weapon: "MP7", name: "Skulls", img: CDN + A + "8jsHf9Ttk_Pm7ZKh-H_yaCW-Ej7l35OBoTCrmzUQht2mDwon7cHuWPFUlDcFxQ7EDtxbpx4W1Y-LltAfAy9USYNky6pY", rarity: "milspec", price: 3.4 },

  /* ---------- RESTRICTED ---------- */
  { id: "bizon-antique", weapon: "PP-Bizon", name: "Antique", img: CDN + A + "zl4zv8x1Y-s2sYb5iLs-SAHOZ0Ptzj-1gSCGn20sj4DnTyN2pdyjFOg4oXJV5Qu5c5xS9w4bjNL7q7gHd2INGxCn_iyxXrnE83Efvvd0", rarity: "restricted", price: 2.2 },
  { id: "mac10-tatter", weapon: "MAC-10", name: "Tatter", img: CDN + A + "8n5WxrR1Y-s2lZ7Z4MOSsAm6Xyfo4tbY7H3q1xRt152TWyt6tc3ifaVcmDppxReVethawlYHmNO6ztQbciJUFk3uxmhdQIQ", rarity: "restricted", price: 2.6 },
  { id: "mac10-curse", weapon: "MAC-10", name: "Curse", img: CDN + B + "nt_CEKv7yrP_I4dvXLWDLBk7Yis7ZqTHHrwktwtz7Sz4mtdHyUPAQpDpV5F-cLrFDmxRuwA7jf", rarity: "restricted", price: 3 },
  { id: "aug-torque", weapon: "AUG", name: "Torque", img: CDN + A + "wi5Hf_jdk7uepV7R_L_eBC3SDyPhJvOhuRz39lxhxsm_WzN37Iy7CbAcmC8B2QuYPtRCwx9HvNr-xtQPaj95EmS__3TQJsHjrLu4xbg", rarity: "restricted", price: 4.5 },
  { id: "xm-heaven-guard", weapon: "XM1014", name: "Heaven Guard", img: CDN + A + "pk8ewrHZk7OeRcKk8cKHHMW-VwPhzvt5uWiihkSIrujqNjsH7cHLFPwd1WZsiFrJYuhC4lNTuNu3n5ASN3YxEniStjSMa6H45675UT-N7rZnbv6eE", rarity: "restricted", price: 5.5 },
  { id: "glock-dragon-tattoo", weapon: "Glock-18", name: "Dragon Tattoo", img: CDN + A + "2kpnj9h1a4s2qeqVqL_6sCWufwuVJvOhuRz39xUl-6miDzI37dHyXOlIkA8MmROVfshO9w9G1Ye-ztgPX34tEyi74jjQJsHi_DRfxVg", rarity: "restricted", price: 6.5 },
  { id: "usp-dark-water", weapon: "USP-S", name: "Dark Water", img: CDN + A + "kjYbf7itX6vytbbZSIf2sFGKS0-9JtOB7RBa_nBovp3OHy9v8J3vFbgIhC5UmQ7UIsxm7wNDnNr_rswOMiNlGmCWoiH9Juis9_a9cBl2xnYuj", rarity: "restricted", price: 9.2 },
  { id: "m4a1s-dark-water", weapon: "M4A1-S", name: "Dark Water", img: CDN + A + "8ypexwjFS4_ega6F_H_GeMX2Vw_x3j-VoXSKMmRQguynLzI6td3-TPQAlD5slR-EJ5hDux9XmMe7i71CI2t8UzSuthi9OvSlo6vFCD_TltxSe0A", rarity: "restricted", price: 12.4 },

  { id: "mp9-galaxy-runner", weapon: "MP9", name: "Galaxy Runner", img: "/images/skins/mp9-galaxy-runner.jpg", rarity: "restricted", price: 14, ai: true },

  /* ---------- CLASSIFIED ---------- */
  { id: "m4a1s-atomic-alloy", weapon: "M4A1-S", name: "Atomic Alloy", img: CDN + A + "8ypexwjFS4_ega6F_H_GeMWrEwL87o95oQyW8jCIooTyLnYrGLSLANkI-D5d2FrENtRG7wNDvZe-3slfci9pFmHj8jSof6yZjtugEB6QtrKTXhxaBb-PhITXxPA", rarity: "classified", price: 22 },
  { id: "ak-redline", weapon: "AK-47", name: "Redline", img: "/images/skins/ak-redline.jpg", rarity: "classified", price: 46, ai: true },
  { id: "usp-kill-confirmed", weapon: "USP-S", name: "Kill Confirmed", img: "/images/skins/usp-kill-confirmed.jpg", rarity: "classified", price: 54, ai: true },
  { id: "ak-case-hardened", weapon: "AK-47", name: "Case Hardened", img: CDN + A + "wlcK3wiNK0P2nZKFpH_yaCW-Ej7sk5bE8Sn-2lEpz4zndzoyvdHuUPwFzWZYiE7EK4Bi4k9TlY-y24FbAy9USGSiZd5Q", rarity: "classified", price: 68 },
  { id: "m4a1s-hyper-beast", weapon: "M4A1-S", name: "Hyper Beast", img: "/images/skins/m4a1s-hyper-beast.jpg", rarity: "classified", price: 74, ai: true },
  { id: "deagle-hypnotic", weapon: "Desert Eagle", name: "Hypnotic", img: CDN + A + "1m5fn8Sdk7vORfqF_NPmUAVicyOl-pK9qSyyywxgjtmnVytyocnLGPA4iWcYmRLYIu0S-xtbuMLjg51DXjoJC02yg2VjGnh4J", rarity: "classified", price: 84 },
  { id: "awp-asiimov", weapon: "AWP", name: "Asiimov", img: "/images/skins/awp-asiimov.jpg", rarity: "classified", price: 98, ai: true },
  { id: "m4a1s-nebula-storm", weapon: "M4A1-S", name: "Nebula Storm", img: "/images/skins/m4a1s-nebula-storm.jpg", rarity: "classified", price: 190, ai: true },
  { id: "deagle-blaze", weapon: "Desert Eagle", name: "Blaze", img: "/images/skins/deagle-blaze.jpg", rarity: "classified", price: 545, ai: true },

  /* ---------- COVERT ---------- */
  { id: "awp-lightning-strike", weapon: "AWP", name: "Lightning Strike", img: CDN + A + "wiYbf_C9k4_upYLBjKf6UMWaH0dF6ueZhW2frwU1_sW2EmNyvc32RZwMpCpcjQ-EJ4xbtmt3gYezk4wzb3tpAy3mrkGoXubsGIfVN", rarity: "covert", price: 118 },
  { id: "deagle-anubis-oath", weapon: "Desert Eagle", name: "Anubis Oath", img: "/images/skins/deagle-anubis-oath.jpg", rarity: "covert", price: 620, ai: true },
  { id: "m4a4-phoenix-rising", weapon: "M4A4", name: "Phoenix Rising", img: "/images/skins/m4a4-phoenix-rising.jpg", rarity: "covert", price: 760, ai: true },
  { id: "ak-thunderwolf", weapon: "AK-47", name: "Thunderwolf", img: "/images/skins/ak-thunderwolf.jpg", rarity: "covert", price: 880, ai: true },
  { id: "ak-fire-serpent", weapon: "AK-47", name: "Fire Serpent", img: "/images/skins/ak-fire-serpent.jpg", rarity: "covert", price: 1450, ai: true },
  { id: "awp-dragon-lore", weapon: "AWP", name: "Dragon Lore", img: "/images/skins/awp-dragon-lore.jpg", rarity: "covert", price: 3250, ai: true },
  { id: "m4a4-howl", weapon: "M4A4", name: "Howl", img: "/images/skins/m4a4-howl.jpg", rarity: "covert", price: 3400, ai: true },

  /* ---------- RARE SPECIAL ---------- */
  { id: "bayonet-vanilla", weapon: "★ Bayonet", name: "Vanilla", img: CDN + B + "ni_DtU4fe6Jv07IfTDDT_JkL4htLI7HCvmwE9z42_Vzov4ci2Wa1IgWMN3R7IMuxCm0oqwYUAZNBA", rarity: "rare", price: 560 },
  { id: "gloves-duct-tape", weapon: "★ Hand Wraps", name: "Duct Tape", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhkysCmRm5_8HifOOV5kFJF5R7IIskW_kIXnNriz7w3eg4hMzCX-2nxP6SZo4u0LBKAi-aXV2V7fcepqgxTHW6A", rarity: "rare", price: 780 },
  { id: "gloves-shamagh", weapon: "★ Hand Wraps", name: "Desert Shamagh", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uh3svNgTBa7mggpty6RlYDtKRTILFd-XccfGb5d6lSmwdS1Zrzr4Q3Ygo5Ayiur23lL5idr5eZQBapzqPDRignHY-U058QHLOHnE0oCUw1MCg", rarity: "rare", price: 880 },
  { id: "gloves-ddpat", weapon: "★ Hand Wraps", name: "Spruce DDPAT", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_u13ve5WSDu2jCIrujqNjsH_InuUaQQmDJd2Fu4NshO7kIGyYeu24Affg98UxCX_iXhJ5i465bwHT-N7rXbV3WG0", rarity: "rare", price: 950 },
  { id: "gloves-arboreal", weapon: "★ Hand Wraps", name: "Arboreal", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhsmsS-MmbD-My7CMGlzW88vKrtT5Uj8jIblMbnksQfb2IlAzXqojCpP6ylp67kLAKBz_6aFjFnCN-I66ZQHdv-5DUPZjQpqjqQ", rarity: "rare", price: 990 },
  { id: "gloves-giraffe", weapon: "★ Hand Wraps", name: "Giraffe", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhsmsS-MmbD-KDnGOFB1Zc4pEr9OrBm6w9bgM-Pi4wLe34tNnCT3jCxJ53s_6rsBUqQkq63V2wnBZOJo55YdZKHw2FL19Wg", rarity: "rare", price: 1050 },
  { id: "gloves-badlands", weapon: "★ Hand Wraps", name: "Badlands", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uh3svNgTBa8hxwptDi6mY70LhTLN1F4ToxyQuIK5EPqkobkZrjm5lGI2NoTni-vhnwd5iZp4-YHAqJxq6DRhlzIL_Rjthe3KNwq", rarity: "rare", price: 1160 },
  { id: "gloves-overprint", weapon: "★ Hand Wraps", name: "Overprint", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhsmsS-MmbD-JCTKO0JiU8EfF7tP53_ky4O_c_Ti4wTe3t4Uy3j6jSxM5ic-4usBA6Mj-qTejAzJMbc14MRWd_v0SE-PRlxR734mHNkv", rarity: "rare", price: 1480 },
  { id: "gloves-caution", weapon: "★ Hand Wraps", name: "CAUTION!", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqh4mpimMlYHGLSLANkI-CcBxQeIMtEHsl4CyNOjm4QDa3dgTniWvjnhJ7Hk54bsEV_Ak-KWE3BaBb-Pt8HWajg", rarity: "rare", price: 1720 },
  { id: "gloves-cobalt", weapon: "★ Hand Wraps", name: "Cobalt Skulls", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhsmsS-MmbD7LT7CAUV7T84sBohW60fg1srnZb6zsw2Ng41MmST43C1L7is9574CBKIh_q2Big_IMOdutcNRd_iuU13QD7PQAmaY", rarity: "rare", price: 1850 },
  { id: "shadow-shattered", weapon: "★ Shadow Daggers", name: "Shattered", img: "/images/skins/shadow-shattered.jpg", rarity: "rare", price: 1600, ai: true },
  { id: "gut-inferno", weapon: "★ Gut Knife", name: "Inferno", img: "/images/skins/gut-inferno.jpg", rarity: "rare", price: 1900, ai: true },
  { id: "classic-abyss", weapon: "★ Classic Knife", name: "Abyss", img: "/images/skins/classic-abyss.jpg", rarity: "rare", price: 2400, ai: true },
  { id: "karambit-doppler", weapon: "★ Karambit", name: "Doppler", img: "/images/skins/karambit-doppler.jpg", rarity: "rare", price: 3850, ai: true },
  { id: "skeleton-ghost", weapon: "★ Skeleton Knife", name: "Ghost", img: "/images/skins/skeleton-ghost.jpg", rarity: "rare", price: 4300, ai: true },
  { id: "butterfly-fade", weapon: "★ Butterfly Knife", name: "Fade", img: "/images/skins/butterfly-fade.jpg", rarity: "rare", price: 4900, ai: true },
  { id: "talon-emerald-queen", weapon: "★ Talon Knife", name: "Emerald Queen", img: "/images/skins/talon-emerald-queen.jpg", rarity: "rare", price: 5200, ai: true },
];

/* ------------------------------------------------------------------ */
/* StatTrak™ varyantları — silahlar için %10 sürpriz şansı             */
/* ------------------------------------------------------------------ */

/* Sadece gerçek skinler — prosedürel SVG'ler kasadan kaldırıldı. */
export const BASE_SKINS: Skin[] = [...BASE];

/** Taban fiyatı sunucu eğrisine oturt (min 1200) */
const scaled = (s: Skin): Skin => ({ ...s, price: priceOf(s.price) });

/** StatTrak™ — kesim sayaçlı nadir varyant */
function makeSt(s: Skin): Skin {
  return {
    ...s,
    id: s.id + "-st",
    st: true,
    price: Math.max(MIN_PRICE, Math.round((priceOf(s.price) * 2.1) / 100) * 100),
  };
}

/** Hatıra (Souvenir) — turnuva paketlerinden çıkan altın varyant */
function makeSv(s: Skin): Skin {
  return {
    ...s,
    id: s.id + "-sv",
    sv: true,
    price: Math.max(MIN_PRICE, Math.round((priceOf(s.price) * 1.55) / 100) * 100),
  };
}

const ST_TIERS: RarityKey[] = ["milspec", "restricted", "classified", "covert"];
const SV_TIERS: RarityKey[] = ["industrial", "milspec", "restricted", "classified", "covert"];

/* Sticker'lar da evrensel eşya listesine katılır (kasa/pazar/envanter uyumu) */
const STICKER_TIER: Record<string, RarityKey> = {
  high: "milspec",
  remarkable: "restricted",
  exotic: "classified",
  extraordinary: "covert",
};

const STICKER_SKINS: Skin[] = STICKERS.map((s) => ({
  id: s.id,
  weapon: "Sticker",
  name: s.name,
  img: s.img,
  rarity: STICKER_TIER[s.rarity] ?? "milspec",
  price: Math.round(s.price),
  sticker: true,
}));

export const SKINS: Skin[] = [
  ...BASE_SKINS.map(scaled),
  ...BASE_SKINS.filter((s) => ST_TIERS.includes(s.rarity)).map(makeSt),
  ...BASE_SKINS.filter((s) => SV_TIERS.includes(s.rarity)).map(makeSv),
  ...STICKER_SKINS,
];

/** Yalnızca silah/eşya skinleri (sticker hariç) */
export const WEAPON_SKINS: Skin[] = SKINS.filter((s) => !s.sticker);

export const SKIN_MAP: Record<string, Skin> = Object.fromEntries(
  SKINS.map((s) => [s.id, s])
);

export const fmtMoney = money;
