import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Minus,
  Package,
  Plus,
  RefreshCcw,
  Search,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import { MARKET_FEE, QUICK_SELL_RATE, mcHead, money } from "../config";
import { RARITY, SKIN_MAP, type Skin } from "../data/skins";
import { priceRatio, sellChance, bulkTotal, bulkUnitPrice, bulkMult, type Listing } from "../data/market";
import { STICKER_MAP } from "../data/stickers";
import { WEARS, wearFromFloat } from "../data/wear";
import { itemValue, type InvItem } from "../data/items";
import { type MarketListing } from "../store/db";
import { click } from "../lib/audio";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { SkinImg } from "./SkinCard";
import { FloatBar, WearFilterRow, WearBadge } from "./WearUi";
import { ItemDetailModal } from "./ItemDetailModal";

type Tab = "buy" | "shop" | "sell";
type Sort = "new" | "cheap" | "rich";
type WearFilter = "all" | "fn" | "mw" | "ft" | "ww" | "bs";
type ShopSource = "all" | "bot" | "player";

/** Dükkan sekmesi: bot + gerçek oyuncu ilanları bir arada */
type ShopItem =
  | { kind: "bot"; l: Listing }
  | { kind: "player"; l: MarketListing };

const PER_PAGE = 16;

/* ---------- sayfalama çubuğu ---------- */
function Pager({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;

  /* akıllı sayfa numarası listesi: 1 … 4 [5] 6 … 12 */
  const nums: (number | "…")[] = [];
  const push = (n: number | "…") => nums.push(n);
  const window = 1;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - window && i <= page + window)) push(i);
    else if (nums[nums.length - 1] !== "…") push("…");
  }

  const go = (p: number) => {
    onPage(Math.min(pages, Math.max(1, p)));
    click();
  };

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 text-xs font-bold text-white/55 transition hover:text-white disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" /> Önceki
      </button>

      <div className="flex items-center gap-1">
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-xs text-white/25">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => go(n)}
              className={cn(
                "h-9 min-w-9 rounded-lg border px-2.5 font-display text-sm font-bold transition",
                n === page
                  ? "border-brand-500 bg-brand-500/15 text-brand-300"
                  : "border-line bg-ink-800 text-white/45 hover:text-white"
              )}
            >
              {n}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => go(page + 1)}
        disabled={page === pages}
        className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 text-xs font-bold text-white/55 transition hover:text-white disabled:opacity-30"
      >
        Sonraki <ChevronRight className="h-4 w-4" />
      </button>

      <span className="ml-1 text-[11px] text-white/30">
        {total} ilan • sayfa {page}/{pages}
      </span>
    </div>
  );
}

function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  return `${Math.floor(m / 60)} sa önce`;
}

function ratioBadge(ratio: number) {
  if (ratio <= 0.95) return { text: "Fırsat", color: "#2fd673" };
  if (ratio <= 1.12) return { text: "Piyasa", color: "#5e98d9" };
  if (ratio <= 1.3) return { text: "Yüksek", color: "#f98e1d" };
  return { text: "Fahiş", color: "#eb4b4b" };
}

/* ---------------- satış modalı ---------------- */
function SellModal({
  uidKey,
  skin,
  baseValue,
  maxQty = 1,
  onClose,
}: {
  uidKey: string;
  skin: Skin;
  baseValue: number;
  /** envanterdeki aynı skin kopya sayısı (toptan için) */
  maxQty?: number;
  onClose: () => void;
}) {
  const { listOnMarket, pushToast } = useGame();
  const suggested = Math.round((baseValue * 1.02) / 100) * 100;
  const [price, setPrice] = useState(String(suggested));
  const [qty, setQty] = useState(1);

  const p = Math.max(100, Math.round((Number(price.replace(/[^\d]/g, "")) || 0) / 100) * 100);
  const pack = qty > 1;
  const total = pack ? bulkTotal(p, qty) : p;
  const net = pack ? Math.round(total * (1 - MARKET_FEE)) : Math.round(p * (1 - MARKET_FEE));
  const mult = bulkMult(qty);
  const discountPct = Math.round((1 - mult) * 100);
  const chance = sellChance({ skinId: skin.id, price: p, baseValue });
  const speed =
    chance >= 0.3 ? { t: "Çok hızlı satılır", c: "#2fd673" }
    : chance >= 0.15 ? { t: "Hızlı satılır", c: "#9ee05a" }
    : chance >= 0.07 ? { t: "Normal sürede satılır", c: "#f98e1d" }
    : { t: "Uzun sürebilir", c: "#eb4b4b" };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-brand-400" />
            <span className="font-display text-lg font-bold">Pazara Koy</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div
            className="flex items-center gap-3 rounded-xl border border-line bg-ink-900 p-3"
            style={{ boxShadow: `inset 0 -3px 0 0 ${RARITY[skin.rarity].color}` }}
          >
            <SkinImg skin={skin} className="h-14 w-20" />
            <div className="min-w-0">
              <div className="truncate text-[10px] uppercase tracking-wider text-white/40">
                {skin.st && <span className="text-[#cf6a32]">StatTrak™ </span>}
                {skin.sv && <span className="text-[#e4ae39]">Hatıra </span>}
                {skin.weapon}
              </div>
              <div className="truncate font-display text-sm font-bold text-white">{skin.name}</div>
              <div className="text-[11px] text-white/40">Piyasa değeri {money(baseValue)}</div>
            </div>
          </div>

          <label className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-widest text-white/40">
            İstediğin fiyat
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-900 px-4 focus-within:border-brand-500/60">
            <span className="font-display text-xl font-black text-brand-400">$</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              className="h-12 min-w-0 flex-1 bg-transparent font-display text-xl font-black tabular-nums text-white focus:outline-none"
            />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { label: "Hızlı", v: Math.round((baseValue * 0.8) / 100) * 100 },
              { label: "Önerilen", v: suggested },
              { label: "Yüksek", v: Math.round((baseValue * 1.25) / 100) * 100 },
            ].map((o) => (
              <button
                key={o.label}
                onClick={() => {
                  setPrice(String(o.v));
                  click();
                }}
                className={cn(
                  "rounded-lg border py-2 text-[11px] font-bold transition",
                  p === o.v
                    ? "border-brand-500 bg-brand-500/10 text-brand-300"
                    : "border-line bg-ink-700 text-white/50 hover:text-white"
                )}
              >
                {o.label}
                <div className="font-display text-xs">{money(o.v)}</div>
              </button>
            ))}
          </div>

          {/* toptan adet seçici */}
          {maxQty > 1 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40">
                  <Package className="h-3.5 w-3.5 text-brand-400" /> Adet (toptan)
                </label>
                {qty > 1 && (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    %{discountPct} birim indirim
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-900 px-3 py-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-700 text-white/60 hover:text-white"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="flex-1 text-center font-display text-lg font-black text-white">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-700 text-white/60 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <span className="w-14 text-right text-[10px] text-white/30">/ {maxQty}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[2, 5, 10, 25].filter((n) => n <= maxQty).map((n) => (
                  <button
                    key={n}
                    onClick={() => setQty(n)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[10px] font-bold transition",
                      qty === n
                        ? "border-brand-500 bg-brand-500/10 text-brand-300"
                        : "border-line bg-ink-700 text-white/45 hover:text-white"
                    )}
                  >
                    {n} adet
                  </button>
                ))}
                <button
                  onClick={() => setQty(maxQty)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[10px] font-bold transition",
                    qty === maxQty
                      ? "border-brand-500 bg-brand-500/10 text-brand-300"
                      : "border-line bg-ink-700 text-white/45 hover:text-white"
                  )}
                >
                  Hepsi ({maxQty})
                </button>
              </div>
              {qty > 1 && (
                <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-white/60">
                  Birim fiyat <span className="font-bold text-emerald-400">{money(bulkUnitPrice(p, qty))}</span>
                  {" "}× {qty} adet = <span className="font-bold text-white">{money(total)}</span>
                  <span className="ml-1 text-white/35">(paket)</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-1.5 rounded-xl border border-line bg-ink-900 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-white/45">Komisyon (%{MARKET_FEE * 100})</span>
              <span className="font-semibold text-lose">−{money(Math.round(total * MARKET_FEE))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/45">Eline geçecek</span>
              <span className="font-display text-base font-black text-emerald-400">{money(net)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-1.5">
              <span className="text-white/45">Satış hızı</span>
              <span className="font-bold" style={{ color: speed.c }}>{speed.t}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (listOnMarket(uidKey, p, qty)) {
                pushToast({
                  kind: "info",
                  title: qty > 1 ? "Toptan ilan yayınlandı" : "İlan yayınlandı",
                  sub: qty > 1
                    ? `${qty}× ${skin.weapon} | ${skin.name} — ${money(total)}`
                    : `${skin.weapon} | ${skin.name} — ${money(total)}`,
                });
                onClose();
              }
            }}
            className="mt-4 h-12 w-full rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-base font-black uppercase tracking-widest text-ink-950 transition hover:brightness-110"
          >
            {qty > 1 ? `Paketi Yayınla — ${money(total)}` : "İlanı Yayınla"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- dükkan alım modalı (bot + gerçek oyuncu) ---------------- */
function ShopBuyModal({
  item,
  onClose,
}: {
  item: ShopItem;
  onClose: () => void;
}) {
  const { buyShopListing, buyListing, pushToast, balance } = useGame();
  const listing = item.l;
  const isBot = item.kind === "bot";
  const unitPrice = item.kind === "bot" ? (item.l.unitPrice ?? item.l.price) : item.l.unitPrice;
  const maxQty = isBot ? Math.max(1, item.l.qty ?? 1) : Math.max(1, item.l.qty ?? 1);
  const sellerName = isBot ? item.l.seller : item.l.sellerName;
  const [qty, setQty] = useState(1);
  const skin = SKIN_MAP[listing.skinId];
  const total = bulkTotal(unitPrice, qty);
  const mult = bulkMult(qty);
  const discountPct = Math.round((1 - mult) * 100);
  const canAfford = balance >= total;

  if (!skin) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-brand-400" />
            <span className="font-display text-lg font-bold">Dükkandan Al</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div
            className="flex items-center gap-3 rounded-xl border border-line bg-ink-900 p-3"
            style={{ boxShadow: `inset 0 -3px 0 0 ${RARITY[skin.rarity].color}` }}
          >
            <SkinImg skin={skin} className="h-14 w-20" />
            <div className="min-w-0">
              <div className="truncate text-[10px] uppercase tracking-wider text-white/40">
                {skin.st && <span className="text-[#cf6a32]">StatTrak™ </span>}
                {skin.sv && <span className="text-[#e4ae39]">Hatıra </span>}
                {skin.weapon}
              </div>
              <div className="truncate font-display text-sm font-bold text-white">{skin.name}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40">
                <img
                  src={mcHead(sellerName, 24)}
                  alt=""
                  className="h-3.5 w-3.5 rounded"
                  style={{ imageRendering: "pixelated" }}
                />
                {sellerName}
                {isBot && (
                  <span className="rounded bg-white/10 px-1 py-px text-[8px] font-black uppercase text-white/50">
                    Bot
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-ink-900 px-3 py-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-700 text-white/60 hover:text-white"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="flex-1 text-center font-display text-lg font-black text-white">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-700 text-white/60 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <span className="w-14 text-right text-[10px] text-white/30">/ {maxQty}</span>
          </div>
          {(maxQty > 1) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[2, 5, 10, 25].filter((n) => n <= maxQty).map((n) => (
                <button
                  key={n}
                  onClick={() => setQty(n)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[10px] font-bold transition",
                    qty === n
                      ? "border-brand-500 bg-brand-500/10 text-brand-300"
                      : "border-line bg-ink-700 text-white/45 hover:text-white"
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setQty(maxQty)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] font-bold transition",
                  qty === maxQty
                    ? "border-brand-500 bg-brand-500/10 text-brand-300"
                    : "border-line bg-ink-700 text-white/45 hover:text-white"
                )}
              >
                Hepsi
              </button>
            </div>
          )}

          <div className="mt-3 space-y-1.5 rounded-xl border border-line bg-ink-900 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-white/45">Birim fiyat ({qty} adet)</span>
              <span className="font-semibold text-white">{money(bulkUnitPrice(unitPrice, qty))}</span>
            </div>
            {qty > 1 && (
              <div className="flex justify-between">
                <span className="text-white/45">Toplu indirim</span>
                <span className="font-bold text-emerald-400">−%{discountPct}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line pt-1.5">
              <span className="text-white/45">Toplam</span>
              <span className="font-display text-xl font-black text-emerald-400">{money(total)}</span>
            </div>
            <p className="text-[10px] text-white/30">
              {isBot
                ? "Bot dükkanı — komisyon yok, anında envantere düşer."
                : `Komisyon %${MARKET_FEE * 100} — satıcıya ${money(Math.round(total * (1 - MARKET_FEE)))} yatar.`}
            </p>
          </div>

          <button
            onClick={() => {
              const got = isBot ? buyListing(listing.id, qty) : buyShopListing(listing.id, qty);
              if (got) {
                pushToast({
                  kind: "money",
                  title: qty > 1 ? `Paket alındı (${qty} adet)` : "Satın alındı",
                  sub: `${skin.weapon} | ${skin.name} — ${money(total)}`,
                });
                onClose();
              }
            }}
            disabled={!canAfford}
            className={cn(
              "mt-4 h-12 w-full rounded-xl font-display text-base font-black uppercase tracking-widest transition",
              canAfford
                ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                : "cursor-not-allowed bg-ink-600 text-white/30"
            )}
          >
            {canAfford ? `Satın Al — ${money(total)}` : `Yetersiz — ${money(total)}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- hepsini sat modalı ---------------- */
function SellAllModal({ onClose }: { onClose: () => void }) {
  const { inventory, listAllOnMarket } = useGame();
  const [pct, setPct] = useState("10");

  const p = Math.max(0, Math.min(500, Number(pct.replace(/[^\d]/g, "")) || 0));
  const groups = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    inventory.forEach((i) => {
      const c = m.get(i.skinId);
      const v = itemValue(i);
      if (c) {
        c.count++;
        c.value += v;
      } else {
        m.set(i.skinId, { count: 1, value: v });
      }
    });
    return [...m.values()];
  }, [inventory]);
  const itemCount = inventory.length;
  const baseTotal = groups.reduce((a, g) => a + g.value, 0);
  const gross = inventory.reduce((a, i) => a + Math.max(100, Math.round((itemValue(i) * (1 + p / 100)) / 100) * 100), 0);
  const net = Math.round(gross * (1 - MARKET_FEE));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-400" />
            <span className="font-display text-lg font-bold">Envanterin Hepsini Sat</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between rounded-xl border border-line bg-ink-900 px-4 py-3 text-sm">
            <span className="text-white/50">Envanter</span>
            <span className="font-display font-black text-white">
              {itemCount} eşya • {groups.length} çeşit
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-ink-900 px-4 py-3 text-sm">
            <span className="text-white/50">Piyasa değeri</span>
            <span className="font-display font-black text-emerald-400">{money(baseTotal)}</span>
          </div>

          <label className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-widest text-white/40">
            Ne kadar kâr istiyorsun?
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-900 px-4 focus-within:border-brand-500/60">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <input
              value={pct}
              onChange={(e) => setPct(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              className="h-12 min-w-0 flex-1 bg-transparent font-display text-xl font-black tabular-nums text-white focus:outline-none"
            />
            <span className="font-display text-sm font-black text-white/40">%</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map((o) => (
              <button
                key={o}
                onClick={() => {
                  setPct(String(o));
                  click();
                }}
                className={cn(
                  "rounded-lg border py-2 text-[11px] font-bold transition",
                  p === o
                    ? "border-brand-500 bg-brand-500/10 text-brand-300"
                    : "border-line bg-ink-700 text-white/50 hover:text-white"
                )}
              >
                %{o}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 rounded-xl border border-line bg-ink-900 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/45">Hepsi satışta</span>
              <span className="font-display font-black text-white">{money(gross)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/45">Komisyon (%{MARKET_FEE * 100})</span>
              <span className="font-display font-bold text-white/60">−{money(gross - net)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-1.5">
              <span className="text-white/45">Satınca eline geçecek</span>
              <span className="font-display text-lg font-black text-emerald-400">{money(net)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (itemCount === 0) return;
              const r = listAllOnMarket(p);
              if (r.ok) onClose();
            }}
            disabled={itemCount === 0}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 font-display text-base font-black text-ink-950 transition hover:brightness-110 disabled:opacity-40"
          >
            <Tag className="h-5 w-5" />
            Hepsini Pazara Koy — {money(gross)}
          </button>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-white/35">
            Her eşya ayrı ilan olarak (aynı skinler paket) satışa çıkar — dilersen ilanları tek tek geri çekebilirsin.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MarketView() {
  const {
    botListings,
    myListings,
    buyListing,
    cancelListing,
    refreshMarket,
    inventory,
    balance,
    shopListings,
  } = useGame();

  const [tab, setTab] = useState<Tab>("buy");
  const [sort, setSort] = useState<Sort>("new");
  const [wearFilter, setWearFilter] = useState<WearFilter>("all");
  const [q, setQ] = useState("");
  const [sellTarget, setSellTarget] = useState<{ uid: string; skin: Skin } | null>(null);
  const [shopBuy, setShopBuy] = useState<ShopItem | null>(null);
  const [shopSource, setShopSource] = useState<ShopSource>("all");
  const [detail, setDetail] = useState<{ item: InvItem; listingId?: string } | null>(null);
  const [sellAllOpen, setSellAllOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [invPage, setInvPage] = useState(1);

  /* Dükkan: bot + gerçek oyuncu ilanları birleşik liste */
  const shopItems = useMemo(() => {
    const bots: ShopItem[] = botListings.map((l) => ({ kind: "bot" as const, l }));
    const players: ShopItem[] = shopListings.map((l) => ({ kind: "player" as const, l }));
    let out = [...bots, ...players];
    if (shopSource === "bot") out = out.filter((i) => i.kind === "bot");
    if (shopSource === "player") out = out.filter((i) => i.kind === "player");
    out = out.filter((i) => {
      const s = SKIN_MAP[i.l.skinId];
      if (!s) return false;
      const t = `${s.weapon} ${s.name}`.toLowerCase();
      return t.includes(q.trim().toLowerCase());
    });
    out.sort((a, b) => {
      const pa = a.kind === "bot" ? a.l.unitPrice ?? a.l.price : a.l.unitPrice;
      const pb = b.kind === "bot" ? b.l.unitPrice ?? b.l.price : b.l.unitPrice;
      if (sort === "cheap") return pa - pb;
      if (sort === "rich") return pb - pa;
      return b.l.ts - a.l.ts;
    });
    return out;
  }, [botListings, shopListings, q, sort, shopSource]);

  const listings = useMemo(() => {
    let out = botListings.filter((l) => {
      const s = SKIN_MAP[l.skinId];
      if (!s) return false;
      const t = `${s.weapon} ${s.name}`.toLowerCase();
      if (!t.includes(q.trim().toLowerCase())) return false;
      if (wearFilter !== "all") {
        if (typeof l.float !== "number" || wearFromFloat(l.float) !== wearFilter) return false;
      }
      return true;
    });
    if (sort === "cheap") out = [...out].sort((a, b) => a.price - b.price);
    else if (sort === "rich") out = [...out].sort((a, b) => b.price - a.price);
    else out = [...out].sort((a, b) => b.ts - a.ts);
    return out;
  }, [botListings, q, sort, wearFilter]);

  /* filtre/sıra değişince başa dön */
  useEffect(() => setPage(1), [q, sort, tab, wearFilter]);

  const pages = Math.max(1, Math.ceil(listings.length / PER_PAGE));
  const safePage = Math.min(page, pages);
  const pageItems = listings.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const invItems = useMemo(
    () =>
      inventory
        .map((i) => ({ item: i, skin: SKIN_MAP[i.skinId], val: itemValue(i) }))
        .filter((x) => x.skin)
        .sort((a, b) => b.val - a.val),
    [inventory]
  );

  const copyCounts = useMemo(() => {
    const m: Record<string, number> = {};
    inventory.forEach((i) => {
      m[i.skinId] = (m[i.skinId] ?? 0) + 1;
    });
    return m;
  }, [inventory]);

  const invPages = Math.max(1, Math.ceil(invItems.length / PER_PAGE));
  const safeInvPage = Math.min(invPage, invPages);
  const invPageItems = invItems.slice((safeInvPage - 1) * PER_PAGE, safeInvPage * PER_PAGE);

  const listedValue = myListings.reduce(
    (a, l) => a + bulkTotal(l.price, Math.max(1, l.qty ?? 1)),
    0
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      {/* başlık */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            <Store className="h-3.5 w-3.5" /> Pazar
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Skin <span className="text-brand-400">Pazarı</span>
          </h1>
          <p className="mt-1 max-w-lg text-sm text-white/50">
            Botlardan ya da <span className="font-semibold text-emerald-400">gerçek oyuncu dükkanlarından</span>{" "}
            satın al; botlar senin pazarından alsın. Birden fazla kopyan varsa{" "}
            <span className="font-semibold text-brand-300">toptan paket</span> yayınla — adet arttıkça birim
            fiyat düşer. Acelen varsa hızlı sat: sadece{" "}
            <span className="font-semibold text-lose">%{QUICK_SELL_RATE * 100}</span>.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-ink-800 px-4 py-2 text-right">
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">Bakiyen</div>
          <div className="font-display text-lg font-black text-emerald-400">{money(balance)}</div>
        </div>
      </div>

      {/* sekmeler */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setTab("buy");
            click();
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition",
            tab === "buy"
              ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
              : "border-line bg-ink-800 text-white/45 hover:text-white"
          )}
        >
          <ShoppingCart className="h-4 w-4" /> Satın Al
          <span className="rounded-full bg-ink-600 px-1.5 text-[10px]">{botListings.length}</span>
        </button>
        <button
          onClick={() => {
            setTab("shop");
            click();
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition",
            tab === "shop"
              ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
              : "border-line bg-ink-800 text-white/45 hover:text-white"
          )}
        >
          <Store className="h-4 w-4" /> Dükkan
          <span className="rounded-full bg-emerald-500/25 px-1.5 text-[10px] text-emerald-300">
            {shopItems.length}
          </span>
        </button>
        <button
          onClick={() => {
            setTab("sell");
            click();
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition",
            tab === "sell"
              ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
              : "border-line bg-ink-800 text-white/45 hover:text-white"
          )}
        >
          <Tag className="h-4 w-4" /> Sat
          {myListings.length > 0 && (
            <span className="rounded-full bg-brand-500/25 px-1.5 text-[10px] text-brand-200">
              {myListings.length}
            </span>
          )}
        </button>

        {tab === "buy" && (
          <>
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-2.5">
              <Search className="h-3.5 w-3.5 text-white/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Skin ara…"
                className="h-9 w-32 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none sm:w-48"
              />
            </div>
            <button
              onClick={() => setSort(sort === "cheap" ? "rich" : "cheap")}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 text-[11px] font-bold text-white/50 transition hover:text-white"
            >
              {sort === "cheap" ? <ArrowUpNarrowWide className="h-3.5 w-3.5" /> : <ArrowDownWideNarrow className="h-3.5 w-3.5" />}
              Fiyat
            </button>
            <button
              onClick={refreshMarket}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 text-[11px] font-bold text-brand-300 transition hover:bg-brand-500/20"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Yenile
            </button>
          </>
        )}
      </div>

      {/* ---------------- SATIN AL ---------------- */}
      {tab === "buy" && (
        <>
        {/* durum (aşınma) filtresi */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink-900/50 p-2">
          <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-white/35">
            Durum
          </span>
          <WearFilterRow value={wearFilter} onChange={setWearFilter} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence initial={false}>
            {pageItems.map((l) => {
              const s = SKIN_MAP[l.skinId];
              const r = RARITY[s.rarity];
              const ratio = priceRatio(l);
              const badge = ratioBadge(ratio);
              const canAfford = balance >= l.price;
              return (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className="flex flex-col overflow-hidden rounded-xl border border-line bg-ink-800"
                  style={{
                    backgroundImage: `radial-gradient(120% 80% at 50% 0%, ${r.color}14, transparent 55%)`,
                  }}
                >
                  <div
                    className="relative cursor-pointer p-2.5"
                    onClick={() =>
                      setDetail({
                        item: {
                          uid: l.id,
                          skinId: l.skinId,
                          ts: l.ts,
                          float: l.float,
                          stickers: l.stickers,
                        },
                        listingId: l.id,
                      })
                    }
                  >
                    <span
                      className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ color: badge.color, background: `${badge.color}1a` }}
                    >
                      {badge.text}
                    </span>
                    {l.qty && l.qty > 1 && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                        <Boxes className="h-3 w-3" /> x{l.qty}
                      </span>
                    )}
                    {s.st && (
                      <span className="absolute left-2 top-2 rounded bg-[#cf6a32] px-1 py-px text-[8px] font-black text-white">
                        ST™
                      </span>
                    )}
                    {s.sv && (
                      <span className="absolute left-2 top-2 rounded bg-[#e4ae39] px-1 py-px text-[8px] font-black text-ink-950">
                        HATIRA
                      </span>
                    )}
                    <SkinImg skin={s} className="mx-auto h-20 w-full" />
                    {l.stickers && l.stickers.length > 0 && (
                      <div className="absolute bottom-1 left-2 flex gap-0.5">
                        {l.stickers.slice(0, 4).map((sid, i) => {
                          const st = STICKER_MAP[sid];
                          return st ? (
                            <img key={i} src={st.img} alt="" title={st.name} className="h-4 w-4 rounded-sm bg-ink-950/70" />
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="mt-1 truncate text-[10px] uppercase tracking-wider text-white/40">
                      {s.weapon}
                    </div>
                    <div className="truncate font-display text-sm font-bold text-white/90">{s.name}</div>
                    {typeof l.float === "number" && (
                      <div className="mt-0.5">
                        <div className="flex items-center gap-1.5">
                          <WearBadge wear={wearFromFloat(l.float)} full />
                          <span className="text-[9px] tabular-nums text-white/30">{l.float.toFixed(4)}</span>
                        </div>
                        <FloatBar float={l.float} className="mt-1" />
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/35">
                      <img
                        src={mcHead(l.seller, 24)}
                        alt=""
                        className="h-4 w-4 rounded"
                        style={{ imageRendering: "pixelated" }}
                      />
                      <span className="truncate">{l.seller}</span>
                      <span className="ml-auto shrink-0">{ago(l.ts)}</span>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-line p-2.5">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-display text-base font-black text-white">{money(l.price)}</span>
                      <span className="text-[10px] text-white/30">
                        {l.qty && l.qty > 1 && l.unitPrice ? `${money(bulkUnitPrice(l.unitPrice, l.qty))}/adet` : `değer ${money(l.baseValue)}`}
                      </span>
                    </div>
                    <button
                      onClick={() => buyListing(l.id)}
                      disabled={!canAfford}
                      className={cn(
                        "flex h-9 w-full items-center justify-center gap-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition",
                        canAfford
                          ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                          : "cursor-not-allowed bg-ink-600 text-white/30"
                      )}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {l.qty && l.qty > 1 ? "Paketi Al" : canAfford ? "Satın Al" : "Yetersiz"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {listings.length === 0 && (
          <p className="py-16 text-center text-sm text-white/35">
            Aramanla eşleşen ilan yok
          </p>
        )}

        <Pager page={safePage} pages={pages} total={listings.length} onPage={setPage} />
        </>
      )}

      {/* ---------------- DÜKKAN (BOT + GERÇEK OYUNCULAR) ---------------- */}
      {tab === "shop" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink-900/50 p-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { key: "all" as const, label: "Hepsi" },
                  { key: "bot" as const, label: "🤖 Botlar" },
                  { key: "player" as const, label: "👤 Oyuncular" },
                ]
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setShopSource(f.key);
                    click();
                  }}
                  className={cn(
                    "flex h-9 items-center gap-1 rounded-lg border px-3 text-[11px] font-bold transition",
                    shopSource === f.key
                      ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
                      : "border-line bg-ink-800 text-white/45 hover:text-white"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-2.5">
              <Search className="h-3.5 w-3.5 text-white/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Skin ara…"
                className="h-9 w-32 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none sm:w-48"
              />
            </div>
            <button
              onClick={() => setSort((s) => (s === "cheap" ? "rich" : "cheap"))}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 text-[11px] font-bold text-white/50 transition hover:text-white"
            >
              {sort === "cheap" ? <ArrowUpNarrowWide className="h-3.5 w-3.5" /> : <ArrowDownWideNarrow className="h-3.5 w-3.5" />}
              Fiyat
            </button>
          </div>

          {shopItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-ink-900/40 py-16 text-center">
              <Store className="mx-auto h-10 w-10 text-white/20" />
              <p className="mt-3 text-sm font-semibold text-white/60">Şu an açık dükkan yok</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-white/35">
                Kendi ilanını <span className="font-bold text-brand-300">Sat</span> sekmesinden "Pazara Koy"
                dediğinde otomatik olarak burada yayınlanır. Diğer oyuncuların görebilmesi için
                senkron kodu girili olmalı.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence initial={false}>
                {shopItems.map((item) => {
                  const isBot = item.kind === "bot";
                  const l = item.l;
                  const unit = isBot ? (l as Listing).unitPrice ?? (l as Listing).price : (l as MarketListing).unitPrice;
                  const sellerName = isBot ? (l as Listing).seller : (l as MarketListing).sellerName;
                  const baseValue = l.baseValue ?? SKIN_MAP[l.skinId]?.price ?? 0;
                  const s = SKIN_MAP[l.skinId];
                  if (!s) return null;
                  const r = RARITY[s.rarity];
                  const ratio = priceRatio({ price: unit, baseValue, skinId: l.skinId });
                  const badge = ratioBadge(ratio);
                  const maxQty = Math.max(1, l.qty ?? 1);
                  const packTotal = maxQty > 1 ? bulkTotal(unit, maxQty) : unit;
                  const canAfford = balance >= unit;
                  return (
                    <motion.div
                      key={`${item.kind}:${l.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      className="flex flex-col overflow-hidden rounded-xl border border-line bg-ink-800"
                      style={{
                        backgroundImage: `radial-gradient(120% 80% at 50% 0%, ${r.color}14, transparent 55%)`,
                      }}
                    >
                      <div className="relative p-2.5">
                        <span
                          className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold"
                          style={{ color: badge.color, background: `${badge.color}1a` }}
                        >
                          {badge.text}
                        </span>
                        <span
                          className={cn(
                            "absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase",
                            isBot ? "bg-white/10 text-white/50" : "bg-brand-500/20 text-brand-300"
                          )}
                        >
                          {isBot ? "🤖 Bot" : "👤 Oyuncu"}
                        </span>
                        {maxQty > 1 && (
                          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                            <Boxes className="h-3 w-3" /> {maxQty} ADET
                          </span>
                        )}
                        <SkinImg skin={s} className="mx-auto h-20 w-full" />
                        <div className="mt-1 truncate text-[10px] uppercase tracking-wider text-white/40">
                          {s.weapon}
                        </div>
                        <div className="truncate font-display text-sm font-bold text-white/90">{s.name}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/35">
                          <img
                            src={mcHead(sellerName, 24)}
                            alt=""
                            className="h-4 w-4 rounded"
                            style={{ imageRendering: "pixelated" }}
                          />
                          <span className="truncate">{sellerName}</span>
                          <span className="ml-auto shrink-0">{ago(l.ts)}</span>
                        </div>
                      </div>

                      <div className="mt-auto border-t border-line p-2.5">
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <span className="font-display text-base font-black text-white">
                            {maxQty > 1 ? money(packTotal) : money(unit)}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {maxQty > 1 ? `${money(bulkUnitPrice(unit, maxQty))}/adet` : `değer ${money(baseValue)}`}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setShopBuy(item);
                            click();
                          }}
                          disabled={!canAfford}
                          className={cn(
                            "flex h-9 w-full items-center justify-center gap-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition",
                            canAfford
                              ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                              : "cursor-not-allowed bg-ink-600 text-white/30"
                          )}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {maxQty > 1 ? "Toptan Al" : "Satın Al"}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-line bg-ink-900/70 p-4 text-[11px] leading-relaxed text-white/45">
            <span className="font-bold text-white/70">Nasıl çalışır?</span> Dükkanda{" "}
            <span className="font-bold text-white/70">bot dükkanları</span> her zaman açıktır ve anında satış
            yapar; <span className="font-bold text-white/70">oyuncu dükkanları</span> ise diğer gerçek
            oyuncuların ilanlarıdır (görebilmek için senkron kodu girili olmalı). "Sat" sekmesinde bir skin için
            birden fazla kopyan varsa adet seçip <span className="font-bold text-brand-300">toptan paket</span>{" "}
            yayınlayabilirsin: 5, 10, 25… adet aldıkça birim fiyat düşer.
          </div>
        </>
      )}

      {/* ---------------- SAT ---------------- */}
      {tab === "sell" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          {/* envanter */}
          <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Tag className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Satılacak Eşyanı Seç
              </span>
              <span className="ml-auto text-xs text-white/35">{invItems.length} eşya</span>
              {invItems.length > 0 && (
                <button
                  onClick={() => {
                    setSellAllOpen(true);
                    click();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <Package className="h-3.5 w-3.5" /> Hepsini Sat
                </button>
              )}
            </div>

            {invItems.length === 0 ? (
              <p className="py-16 text-center text-sm text-white/35">
                Envanterin boş — önce kasa aç veya pazardan satın al
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 xl:grid-cols-4">
                  {invPageItems.map(({ item, skin, val }) => (
                    <div
                      key={item.uid}
                      className="flex flex-col overflow-hidden rounded-xl border border-line bg-ink-800"
                      style={{
                        backgroundImage: `radial-gradient(120% 80% at 50% 0%, ${RARITY[skin.rarity].color}14, transparent 55%)`,
                      }}
                    >
                      <div className="relative p-2.5">
                        <SkinImg skin={skin} className="mx-auto h-16 w-full" />
                        {(copyCounts[item.skinId] ?? 0) > 1 && (
                          <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-black text-brand-300">
                            <Boxes className="h-3 w-3" /> x{copyCounts[item.skinId]} kopya
                          </span>
                        )}
                        {item.stickers && item.stickers.length > 0 && (
                          <div className="absolute bottom-1 left-2 flex gap-0.5">
                            {item.stickers.slice(0, 4).map((sid, i) => {
                              const st = STICKER_MAP[sid];
                              return st ? (
                                <img key={i} src={st.img} alt="" className="h-3.5 w-3.5 rounded-sm bg-ink-950/70" />
                              ) : null;
                            })}
                          </div>
                        )}
                        <div className="truncate text-[10px] uppercase tracking-wider text-white/40">
                          {skin.st && <span className="text-[#cf6a32]">ST™ </span>}
                          {skin.sv && <span className="text-[#e4ae39]">Hatıra </span>}
                          {skin.weapon}
                        </div>
                        <div className="truncate font-display text-xs font-bold text-white/90">
                          {skin.name}
                        </div>
                        <div className="flex items-center gap-1">
                          {typeof item.float === "number" && (
                            <span
                              className="rounded px-1 py-px text-[8px] font-black"
                              style={{
                                color: WEARS[wearFromFloat(item.float)].color,
                                background: `${WEARS[wearFromFloat(item.float)].color}1a`,
                              }}
                            >
                              {WEARS[wearFromFloat(item.float)].short}
                            </span>
                          )}
                          <span className="font-display text-sm font-black text-emerald-400">
                            {money(val)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSellTarget({ uid: item.uid, skin });
                          click();
                        }}
                        className="mt-auto flex h-9 items-center justify-center gap-1.5 border-t border-line bg-brand-500/10 text-[11px] font-bold text-brand-300 transition hover:bg-brand-500/20"
                      >
                        <Tag className="h-3.5 w-3.5" /> Pazara Koy
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-3">
                  <Pager
                    page={safeInvPage}
                    pages={invPages}
                    total={invItems.length}
                    onPage={setInvPage}
                  />
                </div>
              </>
            )}
          </div>
          {/* aktif ilanlarım */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                  Aktif İlanlarım
                </span>
              </div>

              {myListings.length === 0 ? (
                <p className="py-10 text-center text-xs text-white/30">Henüz ilanın yok</p>
              ) : (
                <>
                  <div className="tiny-scroll max-h-[360px] divide-y divide-line overflow-y-auto">
                    {myListings.map((l) => {
                      const s = SKIN_MAP[l.skinId];
                      if (!s) return null;
                      const chance = sellChance(l);
                      return (
                        <div key={l.id} className="flex items-center gap-2.5 p-2.5">
                          <SkinImg skin={s} className="h-10 w-14 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] font-semibold text-white/85">
                              {s.weapon} | {s.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-white/35">
                              <Clock className="h-3 w-3" />
                              {ago(l.ts)} •{" "}
                              <span style={{ color: chance >= 0.15 ? "#2fd673" : chance >= 0.05 ? "#f98e1d" : "#eb4b4b" }}>
                                {chance >= 0.15 ? "hızlı" : chance >= 0.05 ? "normal" : "yavaş"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {(l.qty ?? 1) > 1 && (
                                <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                                  <Boxes className="h-2.5 w-2.5" /> x{l.qty} • {money(bulkUnitPrice(l.price, l.qty!))}/adet
                                </span>
                              )}
                              <span className="font-display text-xs font-black text-emerald-400">
                                {money(bulkTotal(l.price, Math.max(1, l.qty ?? 1)))}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => cancelListing(l.id)}
                            className="shrink-0 rounded-lg border border-lose/40 bg-lose/10 px-2 py-1 text-[10px] font-bold text-lose hover:bg-lose/20"
                          >
                            Geri Çek
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs">
                    <span className="text-white/45">Satışta toplam</span>
                    <span className="font-display font-bold text-emerald-400">{money(listedValue)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-brand-400" />
                <span className="font-display text-sm font-bold uppercase tracking-widest text-white/70">
                  Nasıl Çalışır?
                </span>
              </div>
              <ul className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-white/45">
                <li>
                  <span className="font-bold text-emerald-400">Pazarda sat:</span> fiyatını sen belirlersin,
                  komisyon sadece %{MARKET_FEE * 100}. Alıcı bulunca paran otomatik yatar.
                </li>
                <li>
                  <span className="font-bold text-brand-300">Toptan paket:</span> aynı skinden birden fazla
                  kopyan varsa adet seç (5, 10, 25…). Adet arttıkça birim fiyat düşer, paket{" "}
                  <span className="font-bold text-emerald-400">Dükkan</span> sekmesinde de yayınlanır.
                </li>
                <li>
                  <span className="font-bold text-lose">Hızlı sat:</span> envanterden anında satarsın ama
                  değerin sadece %{QUICK_SELL_RATE * 100}'ini alırsın.
                </li>
                <li>Ucuza koyarsan saniyeler içinde, pahalıya koyarsan uzun sürede satılır.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {sellTarget && (
          <SellModal
            uidKey={sellTarget.uid}
            skin={sellTarget.skin}
            baseValue={
              itemValue(inventory.find((i) => i.uid === sellTarget.uid) ?? {
                uid: "",
                skinId: sellTarget.skin.id,
                ts: 0,
              })
            }
            maxQty={inventory.filter((i) => i.skinId === sellTarget.skin.id).length}
            onClose={() => setSellTarget(null)}
          />
        )}
        {sellAllOpen && <SellAllModal onClose={() => setSellAllOpen(false)} />}
        {shopBuy && <ShopBuyModal item={shopBuy} onClose={() => setShopBuy(null)} />}
        {detail && (() => {
          const l = detail.listingId ? botListings.find((x) => x.id === detail.listingId) : null;
          const price = l?.price ?? 0;
          return (
            <ItemDetailModal
              item={detail.item}
              onClose={() => setDetail(null)}
              subtitle={
                l ? "Bu ilanı görüyorsun — fiyat, aşınma ve float'a göre belirlenmiştir." : undefined
              }
              actions={
                l ? (
                  <button
                    onClick={() => {
                      if (buyListing(l.id)) setDetail(null);
                    }}
                    disabled={balance < price}
                    className={cn(
                      "flex h-11 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-black uppercase tracking-widest transition",
                      balance >= price
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                        : "cursor-not-allowed bg-ink-600 text-white/30"
                    )}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {balance >= price
                      ? `${(l.qty ?? 1) > 1 ? "Paketi Al" : "Satın Al"} — ${money(price)}`
                      : "Yetersiz Bakiye"}
                  </button>
                ) : undefined
              }
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
