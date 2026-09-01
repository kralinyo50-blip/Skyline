import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Move } from "lucide-react";
import { money } from "../config";
import { itemTitle, itemValue, itemWear, type InvItem } from "../data/items";
import { SKIN_MAP, RARITY, type Skin } from "../data/skins";
import { STICKER_MAP, stickerBonus } from "../data/stickers";
import { floatPremium, WEARS } from "../data/wear";
import { SkinImg } from "./SkinCard";
import { FloatBar, WearBadge } from "./WearUi";
import { PriceHistoryChart } from "./PriceChart";

/* ---------- Zoomable skin view ---------- */
function ZoomableSkinView({ skin, stickers }: { skin: Skin; stickers?: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showHint, setShowHint] = useState(true);

  const clampScale = useCallback((s: number) => Math.min(4, Math.max(1, s)), []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale((prev) => clampScale(prev + delta * prev));
    setShowHint(false);
  }, [clampScale]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    if (scale === 1) setPos({ x: 0, y: 0 });
  }, [scale]);

  useEffect(() => {
    if (showHint) {
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showHint]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y });
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging || e.touches.length !== 1) return;
    setPos({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
  };
  const handleTouchEnd = () => setDragging(false);

  const handleDoubleClick = () => {
    if (scale === 1) setScale(2.5);
    else setScale(1);
    setShowHint(false);
  };

  return (
    <div
      ref={containerRef}
      className="group relative flex h-64 w-full select-none items-center justify-center overflow-hidden rounded-xl border border-line bg-ink-950 md:h-72"
      style={{
        backgroundImage: `radial-gradient(90% 80% at 50% 20%, ${RARITY[skin.rarity].color + "26"} 0%, transparent 70%)`,
        cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="flex h-full w-full items-center justify-center will-change-transform"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: dragging ? "none" : "transform 0.15s ease-out",
        }}
      >
        <SkinImg skin={skin} className="h-48 w-full object-contain md:h-56" />
      </div>

      {/* sticker overlay - also zoomable */}
      {(stickers ?? []).length > 0 && scale === 1 && (
        <div className="absolute bottom-2.5 left-2.5 flex gap-1">
          {(stickers ?? []).map((sid, i) => {
            const s = STICKER_MAP[sid];
            return s ? (
              <img key={i} src={s.img} alt={s.name} title={s.name} className="h-7 w-7 rounded-sm bg-ink-950/80 object-contain" />
            ) : null;
          })}
        </div>
      )}

      {/* zoom controls */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg border border-line bg-ink-900/90 p-1 shadow-lg backdrop-blur-sm">
        <button
          onClick={() => setScale((s) => clampScale(s - 0.5))}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-800 text-white/60 transition hover:bg-ink-700 hover:text-white"
          title="Uzaklaştır"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[38px] text-center font-display text-[11px] font-bold tabular-nums text-white/70">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => clampScale(s + 0.5))}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-800 text-white/60 transition hover:bg-ink-700 hover:text-white"
          title="Yakınlaştır"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="mx-0.5 h-4 w-px bg-line" />
        <button
          onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-800 text-white/60 transition hover:bg-ink-700 hover:text-white"
          title="Sıfırla"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* hint */}
      {showHint && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-line bg-ink-900/80 px-3 py-1 text-[10px] font-medium text-white/50 backdrop-blur-sm"
        >
          <span className="flex items-center gap-1.5">
            <Move className="h-3 w-3" /> Scroll ile zoom • Çift tıkla büyüt • Sürükle ile kaydır
          </span>
        </motion.div>
      )}

      <div className="pointer-events-none absolute left-2.5 top-2.5 rounded-md bg-ink-900/60 p-1.5 text-white/30 opacity-0 transition group-hover:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

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
          {/* görsel - ZOOMABLE */}
          <div className="relative">
            {skin ? (
              <ZoomableSkinView skin={skin} stickers={item.stickers ?? []} />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-line bg-ink-950">
                <Package className="h-16 w-16 text-white/20" />
              </div>
            )}
            <div className="absolute left-2.5 top-2.5 flex gap-1.5 pointer-events-none">
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
                className="pointer-events-none absolute right-2.5 top-2.5 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                style={{ color: RARITY[skin.rarity].color, background: `${RARITY[skin.rarity].color}1a` }}
              >
                {RARITY[skin.rarity].tr}
              </span>
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
