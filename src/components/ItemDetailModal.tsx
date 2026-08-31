import { motion } from "framer-motion";
import { Package, X } from "lucide-react";
import { money } from "../config";
import { itemTitle, itemValue, itemWear, type InvItem } from "../data/items";
import { SKIN_MAP, RARITY } from "../data/skins";
import { STICKER_MAP, stickerBonus } from "../data/stickers";
import { floatPremium, WEARS } from "../data/wear";
import { SkinImg } from "./SkinCard";
import { FloatBar, WearBadge } from "./WearUi";
import { PriceHistoryChart } from "./PriceChart";

/* ------------------------------------------------------------------
   Eşya detay modalı — CS tarzı:
   büyük görsel + durum + float bar + değer dökümü (baz × aşınma × prim)
------------------------------------------------------------------ */

interface Props {
  item: InvItem;
  onClose: () => void;
  /** modal altına yerleştirilecek aksiyon butonları */
  actions?: React.ReactNode;
  subtitle?: string;
}

export function ItemDetailModal({ item, onClose, actions, subtitle }: Props) {
  const skin = SKIN_MAP[item.skinId];
  const wear = itemWear(item);
  const value = itemValue(item);
  const title = itemTitle(item);
  const isSticker = !!skin?.sticker;

  /* değer dökümü */
  const base = skin?.price ?? 0;
  const wMult = wear && typeof item.float === "number" ? WEARS[wear].mult : 1;
  const premium = wear && typeof item.float === "number" ? floatPremium(item.float) : 1;
  const bonus = stickerBonus(item.stickers ?? []);
  const afterWear = Math.round(base * wMult * premium);
  const totalCalc = afterWear + bonus;

  const rows: { label: string; value: string }[] = [];
  if (!isSticker) {
    rows.push({ label: "Baz fiyat", value: money(base) });
    if (wear && typeof item.float === "number") {
      rows.push({
        label: `Aşınma · ${WEARS[wear].tr}`,
        value: `×${wMult.toFixed(2)}`,
      });
      if (premium !== 1)
        rows.push({ label: "Float primi (koleksiyoncu)", value: `×${premium.toFixed(2)}` });
    }
    if (bonus > 0) rows.push({ label: `Sticker bonusu (${item.stickers?.length ?? 0})`, value: `+${money(bonus)}` });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="tiny-scroll max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        {/* başlık */}
        <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-line bg-ink-800 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-bold uppercase tracking-widest text-white/40">
              {title.top}
            </div>
            <div className="truncate font-display text-lg font-bold text-white">
              {title.main}
              {wear && <span style={{ color: WEARS[wear].color }}> ({WEARS[wear].tr})</span>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {/* görsel */}
          <div
            className="relative flex h-52 items-center justify-center overflow-hidden rounded-xl border border-line bg-ink-950"
            style={{
              backgroundImage: `radial-gradient(90% 80% at 50% 20%, ${skin ? RARITY[skin.rarity].color + "26" : "#888"} 0%, transparent 70%)`,
            }}
          >
            {skin ? (
              <SkinImg skin={skin} className="h-44 w-full object-contain" />
            ) : (
              <Package className="h-16 w-16 text-white/20" />
            )}
            <div className="absolute left-2.5 top-2.5 flex gap-1.5">
              {skin?.st && (
                <span className="rounded bg-[#cf6a32] px-1.5 py-px text-[9px] font-black uppercase text-white">
                  StatTrak™
                </span>
              )}
              {skin?.sv && (
                <span className="rounded bg-[#e4ae39] px-1.5 py-px text-[9px] font-black uppercase text-ink-950">
                  Hatıra
                </span>
              )}
            </div>
            {skin && (
              <span
                className="absolute right-2.5 top-2.5 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                style={{ color: RARITY[skin.rarity].color, background: `${RARITY[skin.rarity].color}1a` }}
              >
                {RARITY[skin.rarity].tr}
              </span>
            )}
            {/* yapıştırılmış stickerlar */}
            {(item.stickers ?? []).length > 0 && (
              <div className="absolute bottom-2.5 left-2.5 flex gap-1">
                {(item.stickers ?? []).map((sid, i) => {
                  const s = STICKER_MAP[sid];
                  return s ? (
                    <img key={i} src={s.img} alt={s.name} title={s.name} className="h-7 w-7 rounded-sm bg-ink-950/80 object-contain" />
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* durum + float bar */}
          {wear && typeof item.float === "number" ? (
            <div className="mt-4 rounded-xl border border-line bg-ink-900 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WearBadge wear={wear} full />
                  <span className="text-[10px] text-white/35">Float</span>
                </div>
                <span className="font-display text-sm font-black tabular-nums" style={{ color: WEARS[wear].color }}>
                  {item.float.toFixed(4)}
                </span>
              </div>
              <FloatBar float={item.float} />
            </div>
          ) : (
            isSticker && (
              <div className="mt-4 rounded-xl border border-line bg-ink-900 px-3.5 py-2.5 text-[11px] text-white/45">
                Sticker eşyası — silaha uygulanabilir, değeri silah fiyatına eklenir.
              </div>
            )
          )}

          {/* değer dökümü */}
          <div className="mt-3 rounded-xl border border-line bg-ink-900 p-3.5 text-[11px]">
            {rows.length > 0 && (
              <div className="space-y-1.5">
                {rows.map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-white/45">{r.label}</span>
                    <span className="font-display font-bold text-white/80">{r.value}</span>
                  </div>
                ))}
                <div className="border-t border-line pt-1.5" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-white/50">Toplam değer</span>
              <span className="font-display text-lg font-black text-emerald-400">
                {money(isSticker ? value : totalCalc)}
              </span>
            </div>
            {!isSticker && (
              <div className="mt-1 text-right text-[9px] tabular-nums text-white/25">
                hesaplanan: {money(base)} × {wMult.toFixed(2)}{premium !== 1 ? ` × ${premium.toFixed(2)}` : ""}
                {bonus > 0 ? ` + ${money(bonus)}` : ""}
              </div>
            )}
          </div>

          {!isSticker && skin && (
            <div className="mt-3 rounded-xl border border-line bg-ink-900 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Fiyat Geçmişi · Son 24 saat
                </span>
                <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[8px] font-bold uppercase text-white/35">
                  Baz fiyat
                </span>
              </div>
              <PriceHistoryChart skinId={skin.id} />
            </div>
          )}

          {subtitle && <p className="mt-3 text-[10px] text-white/35">{subtitle}</p>}

          {actions && <div className="mt-4">{actions}</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}
