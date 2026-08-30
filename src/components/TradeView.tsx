import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  Check,
  Handshake,
  Info,
  RefreshCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { mcHead, money } from "../config";
import { SKIN_MAP } from "../data/skins";
import { itemValue, isStickerItem, type InvItem } from "../data/items";
import { STICKER_MAP } from "../data/stickers";
import { WEARS, wearFromFloat } from "../data/wear";
import type { TradeOffer } from "../data/market";
import { click } from "../lib/audio";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { SkinImg } from "./SkinCard";

function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  return `${Math.floor(m / 60)} sa önce`;
}

function MiniItem({
  skinId,
  float,
  stickers,
  size = 60,
}: {
  skinId: string;
  float?: number;
  stickers?: string[];
  size?: number;
}) {
  const skin = SKIN_MAP[skinId];
  if (!skin) return null;
  const wear = typeof float === "number" ? wearFromFloat(float) : null;
  return (
    <div className="relative shrink-0 rounded-lg border border-line bg-ink-900 p-1" style={{ width: size }}>
      <SkinImg skin={skin} className="h-9 w-full" />
      {wear && (
        <span
          className="absolute right-0.5 top-0.5 rounded px-0.5 text-[7px] font-black"
          style={{ color: WEARS[wear].color, background: "rgba(7,9,15,0.8)" }}
        >
          {WEARS[wear].short}
        </span>
      )}
      {stickers && stickers.length > 0 && (
        <div className="absolute bottom-0.5 left-0.5 flex gap-px">
          {stickers.slice(0, 3).map((sid, i) => {
            const s = STICKER_MAP[sid];
            return s ? <img key={i} src={s.img} alt="" className="h-2.5 w-2.5" /> : null;
          })}
        </div>
      )}
    </div>
  );
}

function OfferCard({ offer, onOpen }: { offer: TradeOffer; onOpen: () => void }) {
  const good = offer.ratio >= 1;
  const giveValue = offer.give.reduce((a, g) => a + g.value, 0);

  return (
    <div
      className="flex flex-col rounded-2xl border bg-ink-900/70 p-4 transition hover:-translate-y-0.5"
      style={{ borderColor: good ? "rgba(47,214,115,0.4)" : "var(--color-line)" }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <img
          src={mcHead(offer.trader, 48)}
          alt=""
          className="h-8 w-8 rounded"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-bold text-white">{offer.trader}</div>
          <div className="text-[10px] text-white/35">{ago(offer.ts)}</div>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
            good ? "bg-emerald-500/15 text-emerald-400" : "bg-lose/15 text-lose"
          )}
        >
          {good ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {offer.ratio.toFixed(2)}x
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {offer.give.map((g, i) => (
            <MiniItem key={i} skinId={g.skinId} float={g.float} stickers={g.stickers} />
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-1 rounded-lg border border-line bg-ink-800 p-2.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-white/45">Alacağın</span>
          <span className="font-display font-bold text-emerald-400">
            {money(giveValue)}
            {offer.cash ? ` + ${money(offer.cash)} nakit` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/45">Vermen gereken</span>
          <span className="font-display font-bold text-white/80">{money(offer.wantValue)}</span>
        </div>
      </div>

      <button
        onClick={onOpen}
        className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-sm font-bold uppercase tracking-wider text-ink-950 transition hover:brightness-110"
      >
        <Handshake className="h-4 w-4" /> Teklifi İncele
      </button>
    </div>
  );
}

function TradeModal({ offer, onClose }: { offer: TradeOffer; onClose: () => void }) {
  const { inventory, acceptTrade } = useGame();
  const [sel, setSel] = useState<string[]>([]);

  const items = useMemo(
    () => inventory.filter((i) => SKIN_MAP[i.skinId]).sort((a, b) => itemValue(b) - itemValue(a)),
    [inventory]
  );

  const myValue = sel.reduce((a, u) => {
    const it = inventory.find((i) => i.uid === u);
    return a + (it ? itemValue(it) : 0);
  }, 0);
  const enough = myValue >= offer.wantValue * 0.97;
  const giveValue = offer.give.reduce((a, g) => a + g.value, 0) + (offer.cash ?? 0);
  const profit = giveValue - myValue;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="tiny-scroll max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center gap-2.5 border-b border-line bg-ink-800 px-5 py-3.5">
          <img
            src={mcHead(offer.trader, 48)}
            alt=""
            className="h-8 w-8 rounded"
            style={{ imageRendering: "pixelated" }}
          />
          <div>
            <div className="font-display text-lg font-bold">{offer.trader}</div>
            <div className="text-[11px] text-white/40">Takas teklifi</div>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* karşılaştırma */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Alacaksın
              </div>
              <div className="flex flex-wrap gap-1.5">
                {offer.give.map((g, i) => (
                  <MiniItem key={i} skinId={g.skinId} float={g.float} stickers={g.stickers} size={54} />
                ))}
              </div>
              <div className="mt-2 font-display text-base font-black text-emerald-400">
                {money(giveValue)}
              </div>
            </div>

            <ArrowLeftRight className="h-5 w-5 text-brand-400" />

            <div className="rounded-xl border border-line bg-ink-900 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                Vereceksin ({sel.length})
              </div>
              {sel.length === 0 ? (
                <div className="flex h-[54px] items-center justify-center text-[11px] text-white/25">
                  Aşağıdan eşya seç
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {sel.slice(0, 6).map((u) => {
                    const it = inventory.find((i) => i.uid === u);
                    return it ? (
                      <MiniItem key={u} skinId={it.skinId} float={it.float} stickers={it.stickers} size={54} />
                    ) : null;
                  })}
                </div>
              )}
              <div
                className={cn(
                  "mt-2 font-display text-base font-black",
                  enough ? "text-emerald-400" : "text-white/60"
                )}
              >
                {money(myValue)}{" "}
                <span className="text-[11px] font-bold text-white/35">/ {money(offer.wantValue)}</span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "mt-3 flex items-center justify-between rounded-xl border p-3 text-xs",
              profit >= 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-lose/30 bg-lose/5"
            )}
          >
            <span className="text-white/50">Takas kârın</span>
            <span
              className={cn("font-display text-base font-black", profit >= 0 ? "text-emerald-400" : "text-lose")}
            >
              {profit >= 0 ? "+" : ""}
              {money(profit)}
            </span>
          </div>

          {/* envanter seçimi */}
          <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest text-white/40">
            Envanterinden Seç
          </div>
          <div className="tiny-scroll grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
            {items.map((it: InvItem) => {
              const skin = SKIN_MAP[it.skinId];
              const selected = sel.includes(it.uid);
              const wear = typeof it.float === "number" ? wearFromFloat(it.float) : null;
              return (
                <button
                  key={it.uid}
                  onClick={() => {
                    click();
                    setSel((p) => (p.includes(it.uid) ? p.filter((x) => x !== it.uid) : [...p, it.uid]));
                  }}
                  className={cn(
                    "relative rounded-lg border p-1.5 transition",
                    selected
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-line bg-ink-900 hover:border-ink-500"
                  )}
                >
                  {selected && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-ink-950">
                      <Check className="h-2.5 w-2.5" strokeWidth={4} />
                    </span>
                  )}
                  <SkinImg skin={skin} className="h-10 w-full" />
                  <div className="truncate text-[9px] text-white/55">{skin.name}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-emerald-400">{money(itemValue(it))}</span>
                    {wear && (
                      <span className="text-[8px] font-bold" style={{ color: WEARS[wear].color }}>
                        {WEARS[wear].short}
                      </span>
                    )}
                  </div>
                  {isStickerItem(it.skinId) && (
                    <span className="absolute left-1 top-1 rounded bg-brand-500/80 px-0.5 text-[7px] font-black text-ink-950">
                      S
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (acceptTrade(offer.id, sel)) onClose();
            }}
            disabled={!enough}
            className={cn(
              "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-base font-black uppercase tracking-widest transition",
              enough
                ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                : "cursor-not-allowed bg-ink-600 text-white/30"
            )}
          >
            <Handshake className="h-5 w-5" />
            {enough ? "Takası Onayla" : `${money(Math.max(0, offer.wantValue - myValue))} daha gerekli`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function TradeView() {
  const { tradeOffers, refreshTrades, inventoryValue } = useGame();
  const [open, setOpen] = useState<TradeOffer | null>(null);
  const [onlyGood, setOnlyGood] = useState(false);

  const list = onlyGood ? tradeOffers.filter((o) => o.ratio >= 1) : tradeOffers;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rar-industrial/40 bg-rar-industrial/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rar-industrial">
            <Handshake className="h-3.5 w-3.5" /> Takas
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Eşya <span className="text-brand-400">Takası</span>
          </h1>
          <p className="mt-1 max-w-lg text-sm text-white/50">
            Oyuncular sana teklif gönderiyor. <span className="text-emerald-400 font-semibold">1.00x üstü</span> teklifler
            senin lehine — envanterindeki eşyalarla karşıla.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-line bg-ink-800 px-4 py-2 text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">Envanterin</div>
            <div className="font-display text-base font-black text-emerald-400">
              {money(inventoryValue)}
            </div>
          </div>
          <button
            onClick={refreshTrades}
            className="flex h-full items-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 text-xs font-bold text-brand-300 transition hover:bg-brand-500/20"
          >
            <RefreshCcw className="h-4 w-4" /> Yenile
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setOnlyGood(!onlyGood)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition",
            onlyGood
              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
              : "border-line bg-ink-800 text-white/45 hover:text-white"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Sadece kârlı teklifler
        </button>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/35">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> {list.length} aktif teklif
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((o) => (
          <OfferCard key={o.id} offer={o} onOpen={() => setOpen(o)} />
        ))}
      </div>

      {list.length === 0 && (
        <p className="py-16 text-center text-sm text-white/35">Uygun teklif yok — yenilemeyi dene</p>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-2xl border border-line bg-ink-900/70 p-4 text-[11px] leading-relaxed text-white/45">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
        <span>
          Takasta aşınma (float) ve yapıştırılmış stickerlar değere dahildir. Bot tüccarlar
          bazen kârlı teklifler sunar — oranı yüksek olanları kaçırma. Verdiğin eşyaların toplam
          değeri istenen tutarı karşılamalıdır.
        </span>
      </div>

      <AnimatePresence>
        {open && <TradeModal offer={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}
