import { money, priceOf, MIN_PRICE } from "../config";
import { STICKERS } from "./stickers";
import { EXTRA_SKINS } from "./extraSkins";
import { NEW_SKINS } from "./newSkins";
import { MARIN_SKINS } from "./marinSkins";
import { SKETCH_SKINS } from "./sketchSkins";
import { LEGEND_SKINS } from "./legends";

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

    { id: "pp-bizon-sand-dashed", weapon: "PP-Bizon", name: "Sand Dashed", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLzl4zv8x1I_826abRoH-ObAXWE_v13vuVWQyC0nQlp62XcyNygJCrDawR1WZIlQ7QL4xS_wNblPu_h7gOP3oJHynr8iHhK6zErvbioPrlsUA", rarity: "consumer", price: 0.04 },

/* ---------- INDUSTRIAL ---------- */
  { id: "negev-calicamo", weapon: "Negev", name: "CaliCamo", img: CDN + A + "_m5Hl6x1T9s24abZkI_GeAViUxP1zovVWQyC0nQlptzzdzougeHmfaFJxWcZyTLVbtBTulNS0ZbjlsQTYjN1Dm3j8iX4c6DErvbiLvYVdBg", rarity: "industrial", price: 0.14 },
  { id: "negev-bulkhead", weapon: "Negev", name: "Bulkhead", img: CDN + A + "_m5Hl6x1T9s2qfad5M8-KC2uczvlJvOhuRz39kB50sWmBw4moJXnGPFd1WJMjFLFZs0S9lNGxNuLg7weLg91BzCj73TQJsHg2tHPevg", rarity: "industrial", price: 0.18 },

    { id: "mp7-tall-grass", weapon: "MP7", name: "Tall Grass", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8jsHf9Ttk6-C3f6tiJM-UHGKVz9F6ueZhW2frxxlx4jnQw4yuJ3yfPQ4hDpd5QOVZsUa5l9XiNb6w5laPjosWyC6qkGoXuWq2Rgm4", rarity: "industrial", price: 0.5 },

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

    { id: "mp7-neon-ply", weapon: "MP7", name: "Neon Ply", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8jsHf_jdk4uL5V7ZoMPyaDWavzedxuPUnGS2wzBglsm6AnNyqJHLBOAdyCZV0ELIN5xC6kNThY-jqslbbid4WyjK-0H0WWbSZ_g", rarity: "restricted", price: 4 },
  { id: "pp-bizon-space-cat", weapon: "PP-Bizon", name: "Space Cat", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLzl4zv8x1Y-s2sYb5iLs-AHmaTxO13pN5lRi67gVN04jvcmYv6IHnGbw51XsYmQO5ftBG9xoexNrix4gPYjIJEzX_2iX9I8G81tOIzQC5J", rarity: "restricted", price: 5 },
  { id: "aug-arctic-wolf", weapon: "AUG", name: "Arctic Wolf", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwi5Hf_jdk7uepV7NlKeSWCGaextF6ueZhW2frxxtxsGrTw46sI33BOAUiXMElFO4L50O9xNLvNOyz4lDd3olMzX6skGoXude_sLiC", rarity: "restricted", price: 8 },
  { id: "awp-atheris", weapon: "AWP", name: "Atheris", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V7JkMPWBMWuZxuZi_rZsS3zgzU8isW3dnIr6eHKfPVAhDpojEe9YsUW4xta1Nuzm5FDci4NbjXKpmWVQppo", rarity: "restricted", price: 4.5 },
  { id: "awp-paw", weapon: "AWP", name: "PAW", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_C9k7uW-V7RsN-CSGVicyOl-pK84Tn-3xkgltWWGnI39c3LDaA4lD5V0QO8It0LqktfuMOrq7gDajYJG02yg2bUm5WIV", rarity: "restricted", price: 7 },
  { id: "five-seven-case-hardened", weapon: "Five-SeveN", name: "Case Hardened", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL3l4Dl7idN6vyRabVSL_mfC2OvzedxuPUnH3C1kRsi4jiAw4qtdXjCO1V2WcZxF-EO5xLsxtHmMeKw5g3fit4TnDK-0H1W4XC76Q", rarity: "restricted", price: 14 },
  { id: "xm1014-seasons", weapon: "XM1014", name: "Seasons", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLpk8ewrHZk7uORcKlSLPWSCFiWwOpzj-1gSCGn200i6mvRn4mpdCiVblRxDJd3FuILuxi7ktHuNb-04wzW2dpGzin-2ihXrnE8PcTco88", rarity: "restricted", price: 4 },

/* ---------- CLASSIFIED ---------- */
  { id: "m4a1s-atomic-alloy", weapon: "M4A1-S", name: "Atomic Alloy", img: CDN + A + "8ypexwjFS4_ega6F_H_GeMWrEwL87o95oQyW8jCIooTyLnYrGLSLANkI-D5d2FrENtRG7wNDvZe-3slfci9pFmHj8jSof6yZjtugEB6QtrKTXhxaBb-PhITXxPA", rarity: "classified", price: 22 },
  { id: "ak-redline", weapon: "AK-47", name: "Redline", img: "/images/skins/ak-redline.jpg", rarity: "classified", price: 46, ai: true },
  { id: "usp-kill-confirmed", weapon: "USP-S", name: "Kill Confirmed", img: "/images/skins/usp-kill-confirmed.jpg", rarity: "classified", price: 54, ai: true },
  { id: "ak-case-hardened", weapon: "AK-47", name: "Case Hardened", img: CDN + A + "wlcK3wiNK0P2nZKFpH_yaCW-Ej7sk5bE8Sn-2lEpz4zndzoyvdHuUPwFzWZYiE7EK4Bi4k9TlY-y24FbAy9USGSiZd5Q", rarity: "classified", price: 68 },
  { id: "m4a1s-hyper-beast", weapon: "M4A1-S", name: "Hyper Beast", img: "/images/skins/m4a1s-hyper-beast.jpg", rarity: "classified", price: 74, ai: true },
  { id: "deagle-hypnotic", weapon: "Desert Eagle", name: "Hypnotic", img: CDN + A + "1m5fn8Sdk7vORfqF_NPmUAVicyOl-pK9qSyyywxgjtmnVytyocnLGPA4iWcYmRLYIu0S-xtbuMLjg51DXjoJC02yg2VjGnh4J", rarity: "classified", price: 84 },
  { id: "awp-asiimov", weapon: "AWP", name: "Asiimov", img: "/images/skins/awp-asiimov.jpg", rarity: "classified", price: 98, ai: true },
  { id: "deagle-blaze", weapon: "Desert Eagle", name: "Blaze", img: "/images/skins/deagle-blaze.jpg", rarity: "classified", price: 545, ai: true },

    { id: "m4a1-s-decimator", weapon: "M4A1-S", name: "Decimator", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwjFS4_ega6F_H_eAMWrEwL9JtORqRiSygRI1jDGMnYftb3iUb1dxW5ImFLNftxCxktflZLm2tgaP2otGyn_-hytOvy9q5elQV_A7uvqA6CRSoZY", rarity: "classified", price: 46 },
  { id: "desert-eagle-mecha-industries", weapon: "Desert Eagle", name: "Mecha Industries", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL1m5fn8Sdk6OGRbKFsJ_yWMWqVwuZ3j-1gSCGn20h042vSyY2tdyjCZwIlXJBxQeNe4EWxxoHkMOq0sQGIid5Fnyr42HtXrnE8p4gbgvE", rarity: "classified", price: 52 },
  { id: "usp-s-orion", weapon: "USP-S", name: "Orion", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKn17jJk_PuibapuJeLdWGLFwL8i4eVsFiqxxUt34jmHnoysJ3qVOAYgCJZwQrRb5EPul4XlYvSiuVIHgy4Xvg", rarity: "classified", price: 38 },
  { id: "m4a4-tooth-fairy", weapon: "M4A4", name: "Tooth Fairy", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwiFO0P_6afBSMeWWC2mWwOdkqd5lRi67gVN35WyDwtv8IC-RblVxCpchQLIOuhK8xNG2YbnktAXZjthFxCiohntP8G81tOVu8Qhw", rarity: "classified", price: 28 },
  { id: "ump-45-primal-saber", weapon: "UMP-45", name: "Primal Saber", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLkk4a0qB1Y-s27ZbQ5dc-DHG6dwOJlseNsXRa_nBovp3PRn478JHmePQ8hDcF2Q7YDtxXrk92zYbyw7gXYjIhEyCn_3Hsbui44_a9cBklqRdMs", rarity: "classified", price: 8 },
  { id: "nova-hyper-beast", weapon: "Nova", name: "Hyper Beast", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL_kYDhwiFO0PyhfqVSKOmDC3WSxO9lpN5lRi67gVMhsGrTmd2seH6XbA4pDZR1EbMCtES8m4fiNenl4FDcid1Az32ri3tM8G81tMCTwFwB", rarity: "classified", price: 12 },
  { id: "famas-rapid-eye-movement", weapon: "FAMAS", name: "Rapid Eye Movement", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL3n5vh7h1c_M2oaalsM8-BD3eZxdFzqeR6cCW6khUz_WjRmN79JXmePABxDsB1QeZetxnqx9XhN-nk4A3f399CzX2qiCsa7yd1o7FVINiMH98", rarity: "classified", price: 7 },
  { id: "sg-553-colony-iv", weapon: "SG 553", name: "Colony IV", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLimcO1qx1Y-s29b_E4c8-BC2aT1eFkj-1gSCGn20Qit2yAn9n8IHKealB2DZIjTO8JsBW7ktDlYu_m5ADWit4Rznn63XtXrnE82sW2soE", rarity: "classified", price: 6 },
  { id: "mag-7-justice", weapon: "MAG-7", name: "Justice", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8n5G3wiVI0P-vb_NSKuWAGm6TxNF6ueZhW2fikUt36znWyNz_dn2ROgMhD5EiR7EO5BKxl4DlMLyx7gyNi4hAniz5kGoXuQ9OXJLa", rarity: "classified", price: 5 },
  { id: "mp5-sd-oxide-oasis", weapon: "MP5-SD", name: "Oxide Oasis", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8jsPz-R1c_M2jePFSLvWcAFiWzet9pOB7QRa_nBovp3OAmYr_cnLFOlN0A5d4Qu4KtRi6lYG2Mr7n4QCLg48Tm3_-3yxOvSdj_a9cBsgSaNGx", rarity: "classified", price: 3.5 },
  { id: "ump-45-momentum", weapon: "UMP-45", name: "Momentum", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLkk4a0qB1Y-s27ZbRSIeKBAXCD_uJ_t-l9ASzrx0txsWiBydv4JCmSaFdzDJt0TOYN5hbtwYWzNerl5QeIj4IXyX3gznQeadzF8t4", rarity: "classified", price: 3 },

/* ---------- COVERT ---------- */
  { id: "awp-lightning-strike", weapon: "AWP", name: "Lightning Strike", img: CDN + A + "wiYbf_C9k4_upYLBjKf6UMWaH0dF6ueZhW2frwU1_sW2EmNyvc32RZwMpCpcjQ-EJ4xbtmt3gYezk4wzb3tpAy3mrkGoXubsGIfVN", rarity: "covert", price: 118 },
  { id: "ak-fire-serpent", weapon: "AK-47", name: "Fire Serpent", img: "/images/skins/ak-fire-serpent.jpg", rarity: "covert", price: 1450, ai: true },
  { id: "awp-dragon-lore", weapon: "AWP", name: "Dragon Lore", img: "/images/skins/awp-dragon-lore.jpg", rarity: "covert", price: 3250, ai: true },
  { id: "m4a4-howl", weapon: "M4A4", name: "Howl", img: "/images/skins/m4a4-howl.jpg", rarity: "covert", price: 3400, ai: true },

    { id: "awp-gungnir", weapon: "AWP", name: "Gungnir", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf-jFk7uW-V6N4LvedB3WvzedxuPUnHnjnzUl0sWrdztitI3rDZgJzAsZ1QOFY4UPqldDgMO_l41HXit9AmTK-0H227dAsvQ", rarity: "covert", price: 4200 },
  { id: "awp-containment-breach", weapon: "AWP", name: "Containment Breach", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V7JkMuWAMWuZxuZi_rQ6SXq1xURysj_Vw4uhJHOVPQ8oCZt4QrRbtRi6ldPlPu_g4FHaiYNbjXKpcPI_17A", rarity: "covert", price: 240 },
  { id: "ak-47-neon-rider", weapon: "AK-47", name: "Neon Rider", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlV6poL_6sHG6UxPxJvOhuRz39xkQhsTnVzoygdy7Ea1UoCZQkRe9bs0brl9TvN-m0tVHYjY5CyS35jjQJsHhk4o5zcA", rarity: "covert", price: 190 },
  { id: "ak-47-vulcan", weapon: "AK-47", name: "Vulcan", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSMuWRDGKC_uJ_t-l9AXCxxEh14zjTztivci2ePQZ2W8NzTecD4BKwloLiYeqxtAOIj9gUyyngznQeF7I6QE8", rarity: "covert", price: 780 },
  { id: "ak-47-asiimov", weapon: "AK-47", name: "Asiimov", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSIeOaB2qf19F6ueZhW2e2wEt-t2jcytf6dymSO1JxA5oiRecLsRa5kIfkYr-241aLgotHz3-rkGoXuUp8oX57", rarity: "covert", price: 300 },
  { id: "m4a4-neo-noir", weapon: "M4A4", name: "Neo-Noir", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwiFO0P_6afBSLvWcMWmfyPxJvOhuRz39wE1142vSztmvInvBOgV0W5R1FLYNuxW4wIbgNrmx4g2Kj4tMmCX93zQJsHgJr0dqFw", rarity: "covert", price: 110 },
  { id: "m4a1-s-printstream", weapon: "M4A1-S", name: "Printstream", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwjFS4_ega6F_H_OGMWrEwL9lj_F7Rienhgk1tjyIpYPwJiPTcAAoCpsiEO5ZsUbpm9C2Zuni4VHW3o5EzSX62HxP7Sg96-hWVqYi_6TJz1aW0nxrkGs", rarity: "covert", price: 640 },
  { id: "usp-s-printstream", weapon: "USP-S", name: "Printstream", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLkjYbf7itX6vytbbZSI-WsG3SA_v5kue99XD2hkBwqjDGMnYftb3yUPFR0XsNyRrNc5kO5ltziMenr5lONj4kXyi2riywc7y9o5LtQAqQ7uvqAkScWnv4", rarity: "covert", price: 130 },
  { id: "awp-wildfire", weapon: "AWP", name: "Wildfire", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V7NkLPSVB3WV_uJ_t-l9AX7rxhl-tmzSwomtdC6TPwQnW5UkR-YD5kK-ltCzP-Ox4FfXiNoQyyrgznQeu9L0PzQ", rarity: "covert", price: 170 },
  { id: "p90-asiimov", weapon: "P90", name: "Asiimov", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLhx8bf_jdk_6v-JaV-KfmeAXGvzedxuPUnTSjikRgksjuBzoz4dXLFb1QoC8QlTLQD4EPqk4LvN-Pns1aMioNBzTK-0H3gQVv65g", rarity: "covert", price: 90 },
  { id: "m4a1-s-mecha-industries", weapon: "M4A1-S", name: "Mecha Industries", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwjFS4_ega6F_H_eAMWrEwL9JveRqRyiMnBMjpi6RiIb8MhTLN1F4TowiE7EMtRW7ltzlMbvi5wPej4pDmCT2i3tKuHo4sOoEWKFz8qPS3F7BL_Rjtn0I4s52", rarity: "covert", price: 65 },
  { id: "glock-18-neo-noir", weapon: "Glock-18", name: "Neo-Noir", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL2kpnj9h1Y-s2pZKtuK8-dAW6C_uJ_t-l9AXznwh9zsjjSn9j9dH-eb1V0CsF3QrNZ4xW8ltPlM-7h4QbYit5NzyzgznQecekkTuo", rarity: "covert", price: 42 },
  { id: "desert-eagle-code-red", weapon: "Desert Eagle", name: "Code Red", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL1m5fn8Sdk6OGRbKFsJ_yWMWaXxvxzo_JmXRa_nBovp3PRmNj4c3mTb1RxC5cjF-EItRnrlNzkYrnk5gaI3Y0UmyX52H9K7ixs_a9cBsGEcOCn", rarity: "covert", price: 60 },
  { id: "ak-47-bloodsport", weapon: "AK-47", name: "Bloodsport", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiVI0POlPPNSIvycAWOD0eFkpN5lRi67gVN15mmDw9egci_EPFAkDMQlTeZe4EXplNa0Yrvr5wbd345GyHioiC4b8G81tFuqg_k_", rarity: "covert", price: 240 },
  { id: "m4a1-s-golden-coil", weapon: "M4A1-S", name: "Golden Coil", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwjFS4_ega6F_H_eAMWrEwL9lj_JnTiK2lxQztgKClYP9HifOOV5kFJclQ-Jb5xW-m9CxPuLq4QTfjd0XzyX6jCpL6X5o5OgDVfYn_a2Ci1rfcepqgV49FrE", rarity: "covert", price: 165 },
  { id: "galil-ar-chatterbox", weapon: "Galil AR", name: "Chatterbox", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL2n5rp8SNJ0PG7V6NsLPmfMWaS0-9lue5ncCS2kRQyvnPXnIn7eSrEZ1AnD5NxTeII4ESwxN3jN7zl5QHXjdhAnyuo2y9Nv3xs_a9cBuAhdjfO", rarity: "covert", price: 15 },
  { id: "mp9-starlight-protector", weapon: "MP9", name: "Starlight Protector", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8js_f-jFk4uL3V7d5IeKfB2CY1dF6ueZhW2flkUtztz_SzYypJSqRalUhDJNwQO4PsBXtx9HkN-K37w3bgohGmHn3kGoXuZ3lRdvF", rarity: "covert", price: 14 },
  { id: "mac-10-neon-rider", weapon: "MAC-10", name: "Neon Rider", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8n5WxrR1Y-s2jaac8cM-dC2ie0-dytfNWQyC0nQlp5DzTntmgdC7COABxX5NxQrUOtUS5w4LgMu6zsVCK2IJCmyisjitM6DErvbicsEA0SQ", rarity: "covert", price: 10 },
  { id: "ssg-08-blood-in-the-water", weapon: "SSG 08", name: "Blood in the Water", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLijZGwpR1Y-s29YKV_K8-fB2CY1aAmsbFtFnDilkUl5j7UzoqsInmVaFd0XMMlELYDshbuxNPvP-yxtlCMlcsbmlWiixNl", rarity: "covert", price: 34 },
  { id: "p250-see-ya-later", weapon: "P250", name: "See Ya Later", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLhzMOwwiFO0OL8PfRSI-mRC3WT0-F1j-1gSCGn2x9ytmzWnN6pInjGOwMlDZp0EORe5BHsx93lP7zr5wzbiI5AyXr_jS9XrnE8gQrIgng", rarity: "covert", price: 55 },

/* ---------- RARE SPECIAL ---------- */
  { id: "bayonet-vanilla", weapon: "Bayonet", name: "Vanilla", img: CDN + B + "ni_DtU4fe6Jv07IfTDDT_JkL4htLI7HCvmwE9z42_Vzov4ci2Wa1IgWMN3R7IMuxCm0oqwYUAZNBA", rarity: "rare", price: 560 },
  { id: "gloves-duct-tape", weapon: "★ Hand Wraps", name: "Duct Tape", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhkysCmRm5_8HifOOV5kFJF5R7IIskW_kIXnNriz7w3eg4hMzCX-2nxP6SZo4u0LBKAi-aXV2V7fcepqgxTHW6A", rarity: "rare", price: 780 },
  { id: "gloves-shamagh", weapon: "★ Hand Wraps", name: "Desert Shamagh", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uh3svNgTBa7mggpty6RlYDtKRTILFd-XccfGb5d6lSmwdS1Zrzr4Q3Ygo5Ayiur23lL5idr5eZQBapzqPDRignHY-U058QHLOHnE0oCUw1MCg", rarity: "rare", price: 880 },
  { id: "gloves-ddpat", weapon: "★ Hand Wraps", name: "Spruce DDPAT", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_u13ve5WSDu2jCIrujqNjsH_InuUaQQmDJd2Fu4NshO7kIGyYeu24Affg98UxCX_iXhJ5i465bwHT-N7rXbV3WG0", rarity: "rare", price: 950 },
  { id: "gloves-arboreal", weapon: "★ Hand Wraps", name: "Arboreal", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhsmsS-MmbD-My7CMGlzW88vKrtT5Uj8jIblMbnksQfb2IlAzXqojCpP6ylp67kLAKBz_6aFjFnCN-I66ZQHdv-5DUPZjQpqjqQ", rarity: "rare", price: 990 },
  { id: "gloves-giraffe", weapon: "★ Hand Wraps", name: "Giraffe", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhsmsS-MmbD-KDnGOFB1Zc4pEr9OrBm6w9bgM-Pi4wLe34tNnCT3jCxJ53s_6rsBUqQkq63V2wnBZOJo55YdZKHw2FL19Wg", rarity: "rare", price: 1050 },
  { id: "gloves-badlands", weapon: "★ Hand Wraps", name: "Badlands", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uh3svNgTBa8hxwptDi6mY70LhTLN1F4ToxyQuIK5EPqkobkZrjm5lGI2NoTni-vhnwd5iZp4-YHAqJxq6DRhlzIL_Rjthe3KNwq", rarity: "rare", price: 1160 },
  { id: "gloves-overprint", weapon: "★ Hand Wraps", name: "Overprint", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhsmsS-MmbD-JCTKO0JiU8EfF7tP53_ky4O_c_Ti4wTe3t4Uy3j6jSxM5ic-4usBA6Mj-qTejAzJMbc14MRWd_v0SE-PRlxR734mHNkv", rarity: "rare", price: 1480 },
  { id: "gloves-caution", weapon: "★ Hand Wraps", name: "CAUTION!", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqh4mpimMlYHGLSLANkI-CcBxQeIMtEHsl4CyNOjm4QDa3dgTniWvjnhJ7Hk54bsEV_Ak-KWE3BaBb-Pt8HWajg", rarity: "rare", price: 1720 },
  { id: "gloves-cobalt", weapon: "★ Hand Wraps", name: "Cobalt Skulls", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_uJzsfVhSjuqqhsmsS-MmbD7LT7CAUV7T84sBohW60fg1srnZb6zsw2Ng41MmST43C1L7is9574CBKIh_q2Big_IMOdutcNRd_iuU13QD7PQAmaY", rarity: "rare", price: 1850 },
  { id: "karambit-doppler", weapon: "★ Karambit", name: "Doppler", img: "/images/skins/karambit-doppler.jpg", rarity: "rare", price: 3850, ai: true },
  { id: "butterfly-fade", weapon: "★ Butterfly Knife", name: "Fade", img: "/images/skins/butterfly-fade.jpg", rarity: "rare", price: 4900, ai: true },
  { id: "m9-bayonet-doppler", weapon: "★ M9 Bayonet", name: "Doppler", img: CDN + "-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf3qr3czxb49KzgL-Kmsj2P7rSnXtU6dd9teTA5475jV2urhcDPzCkfMKLcAE-aV3R-lO5l-e61sfqvZ2fyiBgvikqsXiMyRGw1U1Ja-dm06adSULeWfJvEZCxug", rarity: "rare", price: 1650 },
  { id: "talon-knife-fade", weapon: "★ Talon Knife", name: "Fade", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1M5vahf6lsK_WBMWaR_uh3tORWQyC0nQlpsmXcnNaoeHuTZwUiWMZzRrVZsxm9x9ThNrzj4QCPjdhNmHj73S9KujErvbhX2ACGeQ", rarity: "rare", price: 2100 },
  { id: "flip-knife-case-hardened", weapon: "★ Flip Knife", name: "Case Hardened", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1d4_u-V6V8H_-aAmKU_uJ_t-l9ASu2l0Qj4m7cnNf6JSqSZgAhA5NzFOALsBbrkILuPu625AXcjdpGz33gznQe1ZCqub0", rarity: "rare", price: 720 },
  { id: "karambit-fade", weapon: "★ Karambit", name: "Fade", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Q7uCvZaZkNM-SD1iWwOpzj-1gSCGn20tztm_UyIn_JHKUbgYlWMcmQ-ZcskSwldS0MOnntAfd3YlMzH35jntXrnE8SOGRGG8", rarity: "rare", price: 4300 },
  { id: "karambit-case-hardened", weapon: "★ Karambit", name: "Case Hardened", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Q7uCvZaZkNM-SH1ifyOJztN5lRi67gVNz5DvUmdj4eXuWOFAhAsF4RLFc5BC4xtbuY7yx7wDbgo9CzSj2h3xK8G81tB_XeHWq", rarity: "rare", price: 1500 },
  { id: "butterfly-knife-lore", weapon: "★ Butterfly Knife", name: "Lore", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Z-ua6bbZrLOmsDXKvw_tipOR7SSWqqhEooTi6lob-KT-JZw90XJMiTO8PukW4wIXmN-zq5gXf2tpBm37_2y4auylv5exUAKAi_7qX0V8Ly4BE2w", rarity: "rare", price: 2600 },
  { id: "sport-gloves-pandora-s-box", weapon: "★ Sport Gloves", name: "Pandora's Box", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Tk5UvzWCL2kpn2-DFk_OKherB0H-CGHHecxNF6ueZhW2exk01w4j7cmYn4eHPCbAMhApdwTOIN5BPsx9yyYu605FTeid0Uy3j3kGoXueKyz5wo", rarity: "rare", price: 6800 },
  { id: "specialist-gloves-fade", weapon: "★ Specialist Gloves", name: "Fade", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Tk71ruQBH4jYLf-i5U-fe9V7d9JfOaD2uZ0vpJtuBtSha_nBovp3PQy42sdX6eagIjW5AlQOVetBXuk92xNLvg4gOMjd5AmC2ointB53w__a9cBqntWBk3", rarity: "rare", price: 5600 },
  { id: "driver-gloves-king-snake", weapon: "★ Driver Gloves", name: "King Snake", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5T441rsfhr9kYDl7h1I4_utY5t-LvGYC3SbyOBJp-lgWyyMmRQguynLz4r6Iy7EbFchApNyR-dbtEbuw4XkN7jq7gHdjtoQzi37hiwYvytvt_FCD_Ql24JgJg", rarity: "rare", price: 2400 },
  { id: "moto-gloves-spearmint", weapon: "★ Moto Gloves", name: "Spearmint", img: CDN + "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4r7_lb1QgTykpPf-i5U-fe9V6liNP-BDX6TzetJvehnWxanhxQmvTqJn7D1KCzPKhgnW5UmRO4DsxXrlYbhPurmtAXai98UzS73in5I6S5p4OsAU_Zx-KHWkUifZsxBQgc2", rarity: "rare", price: 1900 },

];

/* ------------------------------------------------------------------ */
/* StatTrak™ varyantları — silahlar için %10 sürpriz şansı             */
/* ------------------------------------------------------------------ */

/* Sadece gerçek skinler — prosedürel SVG'ler kasadan kaldırıldı. */
export const BASE_SKINS: Skin[] = [...BASE];

/** Taban fiyatı sunucu eğrisine oturt (min 1200) — nadir kademeler daha değerli */
const RARITY_MULT: Record<RarityKey, number> = {
  consumer: 1,
  industrial: 1,
  milspec: 1,
  restricted: 1,
  classified: 1.5,
  covert: 2.3,
  /* bıçak/eldiven ★ Aşırı Nadir — düşmesi çok zor, fiyatı prestij (+%35 zam: 2.99 → 4.04) */
  rare: 4.04,
};

function scaledPrice(s: Skin): number {
  const raw = priceOf(s.price) * (RARITY_MULT[s.rarity] ?? 1);
  return Math.max(MIN_PRICE, Math.round(raw / 100) * 100);
}

const scaled = (s: Skin): Skin => ({ ...s, price: scaledPrice(s) });

/** StatTrak™ — kesim sayaçlı nadir varyant */
function makeSt(s: Skin): Skin {
  return {
    ...s,
    id: s.id + "-st",
    st: true,
    price: Math.max(MIN_PRICE, Math.round((scaledPrice(s) * 2.1) / 100) * 100),
  };
}

/** Hatıra (Souvenir) — turnuva paketlerinden çıkan altın varyant */
function makeSv(s: Skin): Skin {
  return {
    ...s,
    id: s.id + "-sv",
    sv: true,
    price: Math.max(MIN_PRICE, Math.round((scaledPrice(s) * 1.55) / 100) * 100),
  };
}

const ST_TIERS: RarityKey[] = ["milspec", "restricted", "classified", "covert"];
const SV_TIERS: RarityKey[] = ["industrial", "milspec", "restricted", "classified", "covert"];

/* Efsane (zaten final fiyatlı) varyantları — eğriye sokulmaz, doğrudan çarpan */
function makeLegendSt(s: Skin): Skin {
  return {
    ...s,
    id: s.id + "-st",
    st: true,
    price: Math.max(MIN_PRICE, Math.round((s.price * 2.1) / 100) * 100),
  };
}
function makeLegendSv(s: Skin): Skin {
  return {
    ...s,
    id: s.id + "-sv",
    sv: true,
    price: Math.max(MIN_PRICE, Math.round((s.price * 1.55) / 100) * 100),
  };
}

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

/* ------------------------------------------------------------------ */
/* Zor çıkan (classified/covert/rare) eşyalara +%15 zam               */
/* ------------------------------------------------------------------ */
const HARD_DROP_MULT: Record<RarityKey, number> = {
  consumer: 1,
  industrial: 1,
  milspec: 1,
  restricted: 1,
  classified: 1.15,
  covert: 1.15,
  rare: 1.15,
};

const hardBump = (s: Skin): Skin =>
  HARD_DROP_MULT[s.rarity] !== 1
    ? { ...s, price: Math.max(MIN_PRICE, Math.round((s.price * HARD_DROP_MULT[s.rarity]) / 100) * 100) }
    : s;

export const SKINS: Skin[] = [
  ...BASE_SKINS.map(scaled),
  ...EXTRA_SKINS.map(scaled),
  ...NEW_SKINS.map(scaled),
  ...MARIN_SKINS.map(scaled),
  ...SKETCH_SKINS.map(scaled),
  ...BASE_SKINS.filter((s) => ST_TIERS.includes(s.rarity)).map(makeSt),
  ...BASE_SKINS.filter((s) => SV_TIERS.includes(s.rarity)).map(makeSv),
  ...EXTRA_SKINS.filter((s) => ST_TIERS.includes(s.rarity)).map(makeSt),
  ...EXTRA_SKINS.filter((s) => SV_TIERS.includes(s.rarity)).map(makeSv),
  ...NEW_SKINS.filter((s) => ST_TIERS.includes(s.rarity)).map(makeSt),
  ...NEW_SKINS.filter((s) => SV_TIERS.includes(s.rarity)).map(makeSv),
  ...MARIN_SKINS.filter((s) => ST_TIERS.includes(s.rarity)).map(makeSt),
  ...MARIN_SKINS.filter((s) => SV_TIERS.includes(s.rarity)).map(makeSv),
  ...SKETCH_SKINS.filter((s) => ST_TIERS.includes(s.rarity)).map(makeSt),
  ...SKETCH_SKINS.filter((s) => SV_TIERS.includes(s.rarity)).map(makeSv),
  ...LEGEND_SKINS,
  ...LEGEND_SKINS.filter((s) => ST_TIERS.includes(s.rarity)).map(makeLegendSt),
  ...LEGEND_SKINS.filter((s) => SV_TIERS.includes(s.rarity)).map(makeLegendSv),
  ...STICKER_SKINS,
].map(hardBump);

/** Yalnızca silah/eşya skinleri (sticker hariç) */
export const WEAPON_SKINS: Skin[] = SKINS.filter((s) => !s.sticker);

export const SKIN_MAP: Record<string, Skin> = Object.fromEntries(
  SKINS.map((s) => [s.id, s])
);

export const fmtMoney = money;

/* ---------------- SKİN FİYAT YÖNETİMİ (admin) ---------------- */

/* orijinal (çarpansız) fiyatlar — modül yüklendiği anda ezberlenir.
 * DİKKAT: SKINS içinde aynı id farklı fiyatlarla birden fazla geçebilir ve
 * SKIN_MAP son kaydı tutar; ORIG de aynı şekilde SON kayıtla doldurulur
 * (ilk kaydı almak taban uygulamasında fiyat kaymasına yol açar). */
const ORIG_PRICES = new Map<string, number>();
for (const s of SKINS) ORIG_PRICES.set(s.id, s.price);

/* fiyat çarpanı revizyonu — React memolarının dep'inde kullanılır */
let priceRev = 0;
export function currentPriceRev(): number {
  return priceRev;
}

export interface PriceSettingsLike {
  global?: number;
  byRarity?: Partial<Record<RarityKey, number>>;
  bySkin?: Record<string, number>;
}

/** Ekonomik dalga (yapısal tip — store'a bağımlılık yok) */
export interface EconomyWaveLike {
  surge?: number;
  rareBoost?: number;
  endsAt?: number;
  cancelled?: boolean;
  direction?: "up" | "down";
  fadeInMin?: number;
  fadeOutMin?: number;
  permanent?: boolean;
  ts?: number;
}

/** Kademe bazlı dalga duyarlılığı: zor çıkanlar daha çok yükselir */
const WAVE_TIER: Record<RarityKey, number> = {
  consumer: 0.25,
  industrial: 0.3,
  milspec: 0.4,
  restricted: 0.55,
  classified: 0.75,
  covert: 1,
  rare: 1.5,
};

/** Saf kademe faktörü — zaman kontrolü yok (admin önizleme + kalıcı işleme) */
export function waveTierFactor(
  rarity: RarityKey,
  surge: number,
  rareBoost: number,
  direction: "up" | "down" = "up"
): number {
  let f = WAVE_TIER[rarity] ?? 0.5;
  const boost = 1 + Math.max(0, rareBoost) / 100;
  if (direction === "down") {
    /* çöküşte SADECE pahalılar ekstra düşer; tavan %85 düşüş */
    f = Math.min(f, 1);
    if (rarity === "covert" || rarity === "rare") f *= 1 + Math.max(0, rareBoost) / 400;
    return Math.max(0.15, 1 - (Math.max(0, surge) / 100) * f);
  }
  if (rarity === "covert" || rarity === "rare") f *= boost;
  return 1 + (Math.max(0, surge) / 100) * f;
}

/** Dalganın aktif olduğu son an — dalga bitince fiyatlar ulaştığı seviyede kalır. */
export function waveFadeEnd(wave?: EconomyWaveLike | null): number {
  if (!wave) return 0;
  return wave.endsAt ?? 0;
}

/* yumuşak geçiş eğrisi (smoothstep) */
function easeRamp(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return p * p * (3 - 2 * p);
}

/** Aktif dalga için kademe çarpanı — zaman kontrolü + yumuşak artış/düşüş.
 *  fadeInMin: tepeye yavaş yavaş çıkar; fadeOutMin: bitişten sonra yavaşça iner. */
export function waveMultiplierAt(rarity: RarityKey, wave?: EconomyWaveLike | null, at?: number): number {
  if (!wave || wave.cancelled || (wave.surge ?? 0) <= 0) return 1;
  const now = at ?? Date.now();
  const start = wave.ts ?? 0;
  const peak = waveTierFactor(rarity, wave.surge ?? 0, wave.rareBoost ?? 0, wave.direction ?? "up");
  const end = wave.endsAt ?? start;
  if (now <= start) return 1;

  const fadeIn = Math.max(0, wave.fadeInMin ?? 0) * 60000;
  if (now < start + fadeIn) {
    /* tepeye yumuşak çıkış */
    return 1 + (peak - 1) * easeRamp((now - start) / fadeIn);
  }
  if (now <= end) return peak;

  /* dalga bitti — geri dönüş yok: fiyatlar ulaştığı seviyede kalır.
     (kalıcı işleme, bir sonraki gözlemci adımında priceSettings'e fold edilir) */
  return peak;
}

export function waveMultiplier(rarity: RarityKey, wave?: EconomyWaveLike | null): number {
  return waveMultiplierAt(rarity, wave, Date.now());
}

/** Belirli bir andaki fiyatı hiçbir şeyi değiştirmeden hesapla (geçmiş grafiği).
 *  Çarpanlar: orijinal × global × nadirlik × skin bazlı × dalga(t). */
export function skinPriceAt(
  id: string,
  ps?: PriceSettingsLike | null,
  wave?: EconomyWaveLike | null,
  at?: number
): number {
  const s = SKIN_MAP[id];
  if (!s) return 0;
  const g = (ps?.global ?? 100) / 100;
  const r = (ps?.byRarity?.[s.rarity] ?? 100) / 100;
  const baseId = id.endsWith("-st") || id.endsWith("-sv") ? id.slice(0, -3) : id;
  const k = (ps?.bySkin?.[id] ?? ps?.bySkin?.[baseId] ?? 100) / 100;
  return Math.max(10, Math.round((ORIG_PRICES.get(id) ?? s.price) * g * r * k * waveMultiplierAt(s.rarity, wave, at)));
}

/** Hiçbir şeyi değiştirmeden varsayımsal fiyatı hesapla (admin önizlemesi). */
export function hypotheticalSkinPrice(
  id: string,
  ps?: PriceSettingsLike | null,
  wave?: EconomyWaveLike | null
): number {
  return skinPriceAt(id, ps, wave, Date.now());
}

/** Fiyat çarpanlarını SKIN_MAP'e uygula (100 = normal, 150 = +%50, 50 = yarı).
 *  Aktif ekonomik dalga varsa üstüne kademe bazlı dalga çarpanı biner.
 *  Herbir SKINS öğesi SKIN_MAP ile aynı referans olduğundan tüm ekranlar etkilenir.
 *  -st / -sv varyantları, taban skinin skin-bazlı çarpanını da devralır. */
export function applyPriceOverrides(ps?: PriceSettingsLike | null, wave?: EconomyWaveLike | null): void {
  for (const id of Object.keys(SKIN_MAP)) {
    const s = SKIN_MAP[id];
    const g = (ps?.global ?? 100) / 100;
    const r = (ps?.byRarity?.[s.rarity] ?? 100) / 100;
    const baseId = id.endsWith("-st") || id.endsWith("-sv") ? id.slice(0, -3) : id;
    const k = (ps?.bySkin?.[id] ?? ps?.bySkin?.[baseId] ?? 100) / 100;
    s.price = Math.max(
      10,
      Math.round((ORIG_PRICES.get(id) ?? s.price) * g * r * k * waveMultiplier(s.rarity, wave))
    );
  }
  priceRev++;
}

/** Çarpansız taban fiyatı (admin panelinde referans gösterimi) */
export function skinBasePrice(id: string): number {
  return ORIG_PRICES.get(id) ?? SKIN_MAP[id]?.price ?? 0;
}
