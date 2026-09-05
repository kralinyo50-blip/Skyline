/* ------------------------------------------------------------------
   Prosedürel skin sanatı — SVG data URI üretir.
   Silah siluetine desen/gradyan giydirir; sınırsız skin üretilebilir.
------------------------------------------------------------------ */

export type WeaponKind =
  | "rifle"
  | "pistol"
  | "knife"
  | "sniper"
  | "smg"
  | "heavy"
  | "gloves";

export type PatternKind =
  | "solid"
  | "stripes"
  | "camo"
  | "hex"
  | "splatter"
  | "scales"
  | "circuit"
  | "flames"
  | "sakura"
  | "teeth"
  | "neon"
  | "marble";

/** 200x100 viewBox içinde basitleştirilmiş silahlar */
const SIL: Record<WeaponKind, string> = {
  rifle:
    "M8,45 H62 V53 H8 Z M62,34 H150 V60 H62 Z M96,60 H122 L119,84 H98 Z M150,38 L193,45 V60 L150,57 Z M128,60 H145 L141,78 H126 Z",
  smg:
    "M26,38 H124 V57 H26 Z M70,57 H90 L88,83 H68 Z M124,42 H168 V55 H124 Z M104,57 H120 L117,74 H103 Z",
  sniper:
    "M4,46 H68 V53 H4 Z M68,36 H142 V59 H68 Z M84,22 H128 V33 H84 Z M92,33 H120 V36 H92 Z M142,40 L196,47 V60 L142,57 Z M120,59 H136 L133,76 H119 Z",
  pistol:
    "M30,38 H120 V53 H30 Z M84,53 H112 L103,92 H74 Z M46,53 H80 V58 H46 Z",
  heavy:
    "M10,42 H60 V52 H10 Z M60,32 H152 V62 H60 Z M100,62 H134 L131,88 H103 Z M152,38 H192 V60 H152 Z",
  knife:
    "M18,58 C42,26 92,16 124,28 L124,46 C92,38 52,48 32,66 Z M124,26 L182,40 V60 L124,50 Z",
  gloves:
    "M28,34 C24,58 34,80 58,84 C82,88 96,74 96,52 C96,34 84,24 62,24 C44,24 30,26 28,34 Z M108,30 C104,56 116,80 140,84 C164,88 176,72 176,50 C176,32 162,22 140,22 C122,22 110,24 108,30 Z",
};

export interface ArtSpec {
  kind: WeaponKind;
  pattern: PatternKind;
  /** 2-4 renk */
  colors: string[];
  /** parlaklık/glow efekti */
  glow?: boolean;
}

let uidCounter = 0;

function patternDefs(p: PatternKind, c: string[], id: string): string {
  const [, b = "#444", d = "#ccc", e = "#fff"] = c;
  switch (p) {
    case "stripes":
      return `<pattern id="p${id}" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><rect width="26" height="26" fill="none"/><rect width="11" height="26" fill="${b}"/><rect x="16" width="4" height="26" fill="${d}"/></pattern>`;
    case "camo":
      return `<pattern id="p${id}" width="56" height="42" patternUnits="userSpaceOnUse"><ellipse cx="14" cy="12" rx="15" ry="10" fill="${b}"/><ellipse cx="44" cy="30" rx="17" ry="11" fill="${d}"/><ellipse cx="30" cy="6" rx="10" ry="7" fill="${e}" opacity=".5"/><ellipse cx="4" cy="36" rx="12" ry="8" fill="${b}"/></pattern>`;
    case "hex":
      return `<pattern id="p${id}" width="22" height="19" patternUnits="userSpaceOnUse"><polygon points="11,0 21,5.5 21,14 11,19 1,14 1,5.5" fill="none" stroke="${d}" stroke-width="2"/><polygon points="11,3 18,7 18,12 11,16 4,12 4,7" fill="${b}" opacity=".55"/></pattern>`;
    case "splatter":
      return `<pattern id="p${id}" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="10" cy="12" r="7" fill="${b}"/><circle cx="34" cy="8" r="4" fill="${d}"/><circle cx="40" cy="30" r="9" fill="${b}" opacity=".8"/><circle cx="16" cy="36" r="5" fill="${e}" opacity=".6"/><circle cx="26" cy="22" r="2.5" fill="${d}"/></pattern>`;
    case "scales":
      return `<pattern id="p${id}" width="20" height="14" patternUnits="userSpaceOnUse"><path d="M0,14 A10,10 0 0 1 20,14 Z" fill="${b}"/><path d="M-10,14 A10,10 0 0 1 10,14 Z" fill="${d}" opacity=".6"/></pattern>`;
    case "circuit":
      return `<pattern id="p${id}" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M4,4 H22 V18 H30 M4,20 V30 H18 M22,26 H30" stroke="${d}" stroke-width="2" fill="none"/><circle cx="22" cy="18" r="3" fill="${e}"/><circle cx="4" cy="20" r="2.5" fill="${d}"/><rect x="24" y="2" width="6" height="6" fill="${b}"/></pattern>`;
    case "flames":
      return `<pattern id="p${id}" width="40" height="50" patternUnits="userSpaceOnUse"><path d="M20,50 C6,36 16,28 14,14 C22,22 26,16 26,8 C34,20 36,34 20,50 Z" fill="${b}"/><path d="M20,50 C12,40 18,32 17,22 C23,28 25,24 25,18 C30,28 30,40 20,50 Z" fill="${d}"/></pattern>`;
    case "sakura":
      return `<pattern id="p${id}" width="44" height="44" patternUnits="userSpaceOnUse"><g fill="${d}"><circle cx="12" cy="10" r="3.4"/><circle cx="18" cy="14" r="3.4"/><circle cx="12" cy="18" r="3.4"/><circle cx="6" cy="14" r="3.4"/><circle cx="12" cy="14" r="2" fill="${e}"/></g><g fill="${b}" opacity=".85"><circle cx="32" cy="30" r="3"/><circle cx="37" cy="34" r="3"/><circle cx="32" cy="38" r="3"/><circle cx="27" cy="34" r="3"/><circle cx="32" cy="34" r="1.8" fill="${e}"/></g></pattern>`;
    case "teeth":
      return `<pattern id="p${id}" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M0,22 L8,8 L16,22 L24,8 L32,22 V30 H0 Z" fill="${b}"/><path d="M0,26 L8,14 L16,26 L24,14 L32,26 V30 H0 Z" fill="${d}" opacity=".7"/></pattern>`;
    case "neon":
      return `<pattern id="p${id}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="none"/><path d="M0,10 H40 M0,30 H40" stroke="${d}" stroke-width="3"/><path d="M10,0 V40" stroke="${b}" stroke-width="4" opacity=".8"/><circle cx="30" cy="20" r="5" fill="none" stroke="${e}" stroke-width="2.5"/></pattern>`;
    case "marble":
      return `<pattern id="p${id}" width="70" height="60" patternUnits="userSpaceOnUse"><path d="M0,40 C18,10 34,54 52,22 S74,38 84,12" stroke="${d}" stroke-width="9" fill="none"/><path d="M-8,16 C14,44 30,4 48,42 S72,20 88,48" stroke="${b}" stroke-width="7" fill="none" opacity=".85"/><path d="M0,58 C20,30 40,66 62,38" stroke="${e}" stroke-width="4" fill="none" opacity=".6"/></pattern>`;
    default:
      return `<pattern id="p${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="none"/></pattern>`;
  }
}

/** Skin görselini data URI olarak üretir */
export function skinArt(spec: ArtSpec): string {
  const id = (uidCounter++).toString(36);
  const [a = "#8892a6", b = "#3c4557", d = "#c9d3e6", e = "#ffffff"] = spec.colors;
  const sil = SIL[spec.kind];

  const glow = spec.glow
    ? `<filter id="f${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="bl"/><feMerge><feMergeNode in="bl"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
<defs>
<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${a}"/><stop offset="55%" stop-color="${b}"/><stop offset="100%" stop-color="${a}"/>
</linearGradient>
<linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#ffffff" stop-opacity=".38"/><stop offset="45%" stop-color="#ffffff" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity=".45"/>
</linearGradient>
${patternDefs(spec.pattern, [a, b, d, e], id)}
<clipPath id="c${id}"><path d="${sil}"/></clipPath>
${glow}
</defs>
<g clip-path="url(#c${id})"${spec.glow ? ` filter="url(#f${id})"` : ""}>
<rect width="200" height="100" fill="url(#g${id})"/>
<rect width="200" height="100" fill="url(#p${id})" opacity="0.72"/>
<rect width="200" height="100" fill="url(#s${id})"/>
</g>
<path d="${sil}" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="2" stroke-linejoin="round"/>
<path d="${sil}" fill="none" stroke="${d}" stroke-width="0.7" opacity="0.5"/>
</svg>`;

  return "data:image/svg+xml," + encodeURIComponent(svg.replace(/\n/g, ""));
}

/* ---------------- Sticker sanatı (e-spor rozetleri & özel) ---------------- */

export type BadgeShape =
  | "circle"
  | "shield"
  | "star"
  | "hex"
  | "diamond"
  | "crown"
  | "bolt"
  | "heart"
  | "gem";

export interface BadgeSpec {
  text: string;
  bg: string;
  fg: string;
  accent?: string;
  shape: BadgeShape;
  effect?: "none" | "holo" | "foil" | "gold";
  /** V2.0: gradyan ikinci renk (yoksa koyu zemin) */
  bg2?: string;
  /** V2.0: yazı üstü emoji katmanı */
  emoji?: string;
  /** V2.0: yazı tipi */
  font?: "display" | "mono" | "serif";
}

const BADGE_FONT: Record<NonNullable<BadgeSpec["font"]>, string> = {
  display: "Rajdhani,Arial,sans-serif",
  mono: "'Courier New',monospace",
  serif: "Georgia,serif",
};

const SHAPE_PATH: Record<BadgeShape, string> = {
  circle: "M50,4 A46,46 0 1 1 49.9,4 Z",
  shield: "M50,3 L92,17 V52 C92,76 72,90 50,97 C28,90 8,76 8,52 V17 Z",
  star: "M50,3 L62,36 H97 L69,57 L80,92 L50,71 L20,92 L31,57 L3,36 H38 Z",
  hex: "M50,3 L91,26 V74 L50,97 L9,74 V26 Z",
  diamond: "M50,2 L98,50 L50,98 L2,50 Z",
  crown: "M8,28 L26,16 L40,30 L50,10 L60,30 L74,16 L92,28 V72 C92,88 72,95 50,95 C28,95 8,88 8,72 Z",
  bolt: "M55,2 L20,55 H45 L38,98 L80,42 H52 Z",
  heart: "M50,88 C20,66 6,48 6,32 C6,16 18,8 30,8 C40,8 47,14 50,20 C53,14 60,8 70,8 C82,8 94,16 94,32 C94,48 80,66 50,88 Z",
  gem: "M30,8 H70 L92,35 L50,95 L8,35 Z",
};

export function badgeArt(spec: BadgeSpec): string {
  const id = (uidCounter++).toString(36);
  const { text, bg, bg2, fg, accent = "#ffffff", shape, effect = "none", emoji, font = "display" } = spec;
  const path = SHAPE_PATH[shape];
  const label = text.slice(0, 12).toUpperCase().replace(/[<>&"']/g, "");
  const size = label.length <= 3 ? 34 : label.length <= 5 ? 25 : label.length <= 8 ? 17 : 13;

  const holo =
    effect === "holo"
      ? `<linearGradient id="h${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff4fd8"/><stop offset="25%" stop-color="#4fd8ff"/><stop offset="50%" stop-color="#7dff9b"/><stop offset="75%" stop-color="#ffe14f"/><stop offset="100%" stop-color="#ff4f6d"/></linearGradient>`
      : effect === "gold"
        ? `<linearGradient id="h${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff3b0"/><stop offset="45%" stop-color="#e4ae39"/><stop offset="100%" stop-color="#8a5a12"/></linearGradient>`
        : effect === "foil"
          ? `<linearGradient id="h${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#dbe6f5"/><stop offset="35%" stop-color="#9fb3cc"/><stop offset="65%" stop-color="#ffffff"/><stop offset="100%" stop-color="#8fa3bd"/></linearGradient>`
          : "";

  const ring =
    effect !== "none"
      ? `<path d="${path}" fill="none" stroke="url(#h${id})" stroke-width="6"/>`
      : `<path d="${path}" fill="none" stroke="${accent}" stroke-width="4" opacity=".8"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs>
<linearGradient id="b${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${bg2 ?? "#0b0e16"}"/></linearGradient>
${holo}
</defs>
<path d="${path}" fill="url(#b${id})"/>
${ring}
${emoji ? `<text x="50" y="${label ? 36 : 50}" text-anchor="middle" dominant-baseline="central" font-size="26">${emoji}</text>` : ""}<text x="50" y="${emoji && label ? 66 : 50}" text-anchor="middle" dominant-baseline="central" font-family="${BADGE_FONT[font]}" font-weight="700" font-size="${size}" fill="${effect === "none" ? fg : `url(#h${id})`}" letter-spacing="1">${label}</text>
</svg>`;

  return "data:image/svg+xml," + encodeURIComponent(svg.replace(/\n/g, ""));
}
