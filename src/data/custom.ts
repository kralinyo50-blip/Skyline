import { SKIN_MAP, type Skin } from "./skins";
import { registerStickerDef, type Sticker } from "./stickers";
import { badgeArt, type BadgeShape } from "./skinArt";

export interface CustomStickerInput {
  text: string;
  bg: string;
  fg: string;
  shape: BadgeShape;
  effect: "none" | "holo" | "foil" | "gold";
}

const EFFECT_MULT = { none: 1, foil: 1.6, holo: 2.2, gold: 3.4 } as const;

/** Kullanıcının tasarladığı sticker'ı üret */
export function buildCustomSticker(input: CustomStickerInput, cost: number): Sticker {
  const id = `st-custom-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    name: input.text.slice(0, 12).toUpperCase() || "ÖZEL",
    img: badgeArt(input),
    rarity: input.effect === "gold" ? "exotic" : input.effect === "none" ? "high" : "remarkable",
    price: Math.round(cost * EFFECT_MULT[input.effect]),
    effect: input.effect === "none" ? undefined : input.effect,
    custom: true,
  };
}

/** Sticker'ı hem sticker hem skin haritasına kaydet (envanterde görünsün) */
export function registerCustomSticker(s: Sticker) {
  registerStickerDef(s);
  const asSkin: Skin = {
    id: s.id,
    weapon: "Özel Sticker",
    name: s.name,
    img: s.img,
    rarity: s.rarity === "exotic" ? "classified" : s.rarity === "remarkable" ? "restricted" : "milspec",
    price: s.price,
    sticker: true,
  };
  SKIN_MAP[s.id] = asSkin;
}

/** Kaydedilmiş tüm özel stickerları yeniden yükle */
export function hydrateCustomStickers(list: Sticker[] | undefined) {
  (list ?? []).forEach(registerCustomSticker);
}
