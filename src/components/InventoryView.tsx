import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Backpack,
  ChevronsUp,
  Coins,
  History,
  PackageOpen,
  RefreshCcw,
  Search,
  Sticker as StickerIcon,
  Store,
  Wand2,
  X,
} from "lucide-react";
import { StickerStudio } from "./StickerStudio";
import { QUICK_SELL_RATE, money } from "../config";
import { SKIN_MAP } from "../data/skins";
import {
  isStickerItem,
  itemColor,
  itemTitle,
  itemValue,
  itemWear,
  type InvItem,
} from "../data/items";
import { MAX_STICKERS, STICKER_MAP } from "../data/stickers";
import { click } from "../lib/audio";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { SkinImg } from "./SkinCard";
import { FloatBar, WearFilterRow, WearBadge } from "./WearUi";
import { ItemDetailModal } from "./ItemDetailModal";

type SortKey = "value_desc" | "value_asc" | "newest" | "float";
type Filter = "all" | "weapons" | "stickers";
type WearFilter = "all" | "fn" | "mw" | "ft" | "ww" | "bs";

/* ---------- eşya kartı ---------- */
function ItemCard({
  item,
  onQuickSell,
  onMarket,
  onUpgrade,
  onSticker,
  onDetail,
  onShowcase,
  inShowcase,
}: {
  item: InvItem;
  onQuickSell: () => void;
  onMarket: () => void;
  onUpgrade: () => void;
  onSticker: () => void;
  onDetail: () => void;
  onShowcase: () => void;
  inShowcase: boolean;
}) {
  const skin = SKIN_MAP[item.skinId];
  const color = itemColor(item);
  const wear = itemWear(item);
  const val = itemValue(item);
  const isSticker = isStickerItem(item.skinId);
  const title = itemTitle(item);
  const applied = item.stickers ?? [];

  if (!skin) return null;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-line bg-ink-800"
      style={{ backgroundImage: `radial-gradient(120% 80% at 50% 0%, ${color}16, transparent 55%)` }}
    >
      <div className="relative cursor-pointer p-2.5" onClick={onDetail}>
        {/* vitrin yıldızı */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowcase();
          }}
          title={inShowcase ? "Vitrinden çıkar" : "Vitrine ekle"}
          className={cn(
            "absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition",
            inShowcase
              ? "border-rar-rare/70 bg-rar-rare/20 text-rar-rare shadow-[0_0_10px_-2px_rgba(228,174,57,0.6)]"
              : "border-line bg-ink-900/80 text-white/30 hover:text-rar-rare"
          )}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={inShowcase ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
          </svg>
        </button>
        {skin.st && (
          <span className="absolute left-2 top-2 z-10 rounded bg-[#cf6a32] px-1 py-px text-[8px] font-black text-white">
            ST™
          </span>
        )}
        {skin.sv && (
          <span className="absolute left-2 top-2 z-10 rounded bg-[#e4ae39] px-1 py-px text-[8px] font-black text-ink-950">
            HATIRA
          </span>
        )}
        <SkinImg skin={skin} className="mx-auto h-20 w-full" />

        {/* yapıştırılmış stickerlar */}
        {applied.length > 0 && (
          <div className="absolute bottom-1 left-2 flex gap-0.5">
            {applied.map((sid, i) => {
              const s = STICKER_MAP[sid];
              return s ? (
                <img
                  key={i}
                  src={s.img}
                  alt={s.name}
                  title={s.name}
                  className="h-5 w-5 rounded-sm bg-ink-950/60 object-contain"
                />
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="px-2.5 pb-2">
        <div className="truncate text-[10px] uppercase tracking-wider text-white/40">{title.top}</div>
        <div className="truncate font-display text-xs font-bold text-white/90">{title.main}</div>

        {wear && typeof item.float === "number" && (
          <div className="mt-1 flex items-center gap-1">
            <WearBadge wear={wear} />
            <FloatBar float={item.float} className="flex-1" />
            <span className="shrink-0 text-[9px] tabular-nums text-white/30">
              {item.float.toFixed(4)}
            </span>
          </div>
        )}
        {isSticker && (
          <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-brand-300">
            <StickerIcon className="h-3 w-3" /> Yapıştırılabilir
          </div>
        )}

        <div className="mt-1 font-display text-sm font-black text-emerald-400">{money(val)}</div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-px border-t border-line bg-line">
        {!isSticker ? (
          <>
            <button
              onClick={onUpgrade}
              title="Yükseltici"
              className="flex items-center justify-center bg-ink-800 py-1.5 text-[10px] font-bold text-rar-restricted transition hover:bg-ink-700"
            >
              <ChevronsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onSticker}
              title="Sticker yapıştır"
              className={cn(
                "flex items-center justify-center bg-ink-800 py-1.5 text-[10px] font-bold transition hover:bg-ink-700",
                applied.length >= MAX_STICKERS ? "text-white/20" : "text-brand-300"
              )}
            >
              <StickerIcon className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={onSticker}
            title="Silaha yapıştır"
            className="col-span-2 flex items-center justify-center gap-1 bg-ink-800 py-1.5 text-[10px] font-bold text-brand-300 transition hover:bg-ink-700"
          >
            <StickerIcon className="h-3.5 w-3.5" /> Yapıştır
          </button>
        )}
        <button
          onClick={onMarket}
          title="Pazarda sat"
          className="flex items-center justify-center bg-ink-800 py-1.5 text-[10px] font-bold text-emerald-400 transition hover:bg-ink-700"
        >
          <Store className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={onQuickSell}
        className="flex items-center justify-center gap-1 border-t border-line bg-ink-900 py-1.5 text-[10px] font-bold text-white/40 transition hover:text-lose"
      >
        <Coins className="h-3 w-3" /> Hızlı Sat {money(Math.round(val * QUICK_SELL_RATE))}
      </button>
    </div>
  );
}

/* ---------- sticker yapıştırma modalı ---------- */
function StickerModal({
  weaponUid,
  onClose,
}: {
  weaponUid: string;
  onClose: () => void;
}) {
  const { inventory, applySticker, scrapeSticker, pushToast } = useGame();
  const weapon = inventory.find((i) => i.uid === weaponUid);
  const stickers = inventory.filter((i) => isStickerItem(i.skinId));

  if (!weapon) return null;
  const skin = SKIN_MAP[weapon.skinId];
  const applied = weapon.stickers ?? [];
  const full = applied.length >= MAX_STICKERS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="tiny-scroll max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-ink-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <StickerIcon className="h-4 w-4 text-brand-400" />
            <span className="font-display text-lg font-bold">Sticker Yapıştır</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {/* silah önizleme */}
          <div className="rounded-xl border border-line bg-ink-900 p-3">
            {skin && <SkinImg skin={skin} className="mx-auto h-24 w-full" />}
            <div className="mt-1 text-center font-display text-sm font-bold text-white">
              {skin?.weapon} | {skin?.name}
            </div>
            <div className="mt-1 text-center font-display text-base font-black text-emerald-400">
              {money(itemValue(weapon))}
            </div>

            {/* 4 slot */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {Array.from({ length: MAX_STICKERS }).map((_, i) => {
                const sid = applied[i];
                const s = sid ? STICKER_MAP[sid] : null;
                return (
                  <div
                    key={i}
                    className={cn(
                      "group relative flex aspect-square items-center justify-center rounded-lg border",
                      s ? "border-line bg-ink-800" : "border-dashed border-line/60"
                    )}
                  >
                    {s ? (
                      <>
                        <img src={s.img} alt={s.name} className="h-full w-full object-contain p-1" />
                        <button
                          onClick={() => scrapeSticker(weaponUid, i)}
                          title="Kazı"
                          className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-lose text-white group-hover:flex"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <StickerIcon className="h-4 w-4 text-white/15" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-2 mt-4 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              Sticker Envanterin
            </span>
            <span className="text-[11px] text-white/30">{stickers.length} adet</span>
          </div>

          {stickers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line py-8 text-center text-xs text-white/35">
              Sticker'ın yok — Sticker Kapsülü açarak kazanabilirsin
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {stickers.map((si) => {
                const s = STICKER_MAP[si.skinId];
                if (!s) return null;
                return (
                  <button
                    key={si.uid}
                    disabled={full}
                    onClick={() => {
                      if (applySticker(weaponUid, si.uid)) {
                        pushToast({ kind: "win", title: "Sticker yapıştırıldı", sub: s.name });
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center rounded-lg border border-line bg-ink-900 p-1.5 transition",
                      full ? "cursor-not-allowed opacity-40" : "hover:border-brand-500/60 hover:bg-ink-700"
                    )}
                  >
                    <img src={s.img} alt={s.name} className="h-10 w-full object-contain" />
                    <span className="mt-1 w-full truncate text-center text-[9px] text-white/60">
                      {s.name}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400">{money(s.price)}</span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-3 rounded-lg border border-line bg-ink-900 p-2.5 text-[10px] leading-relaxed text-white/35">
            Yapıştırılan sticker'ın değerinin %22'si silahın fiyatına eklenir. Kazınan sticker
            kalıcı olarak kaybolur.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- ana görünüm ---------- */
export function InventoryView() {
  const {
    inventory,
    inventoryValue,
    quickSell,
    setUpgraderPick,
    setTab,
    pushToast,
    resetAll,
    showcase,
    toggleShowcase,
  } = useGame();
  const [sort, setSort] = useState<SortKey>("value_desc");
  const [filter, setFilter] = useState<Filter>("all");
  const [wearFilter, setWearFilter] = useState<WearFilter>("all");
  const [q, setQ] = useState("");
  const [stickerTarget, setStickerTarget] = useState<string | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InvItem | null>(null);

  const items = useMemo(() => {
    let arr = inventory.filter((i) => SKIN_MAP[i.skinId]);
    if (filter === "weapons") arr = arr.filter((i) => !isStickerItem(i.skinId));
    if (filter === "stickers") arr = arr.filter((i) => isStickerItem(i.skinId));
    if (wearFilter !== "all") {
      arr = arr.filter((i) => {
        const w = itemWear(i);
        return w === wearFilter;
      });
    }
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter((i) => {
        const s = SKIN_MAP[i.skinId];
        return `${s.weapon} ${s.name}`.toLowerCase().includes(t);
      });
    }
    const sorted = [...arr];
    switch (sort) {
      case "value_desc":
        sorted.sort((a, b) => itemValue(b) - itemValue(a));
        break;
      case "value_asc":
        sorted.sort((a, b) => itemValue(a) - itemValue(b));
        break;
      case "newest":
        sorted.sort((a, b) => b.ts - a.ts);
        break;
      case "float":
        sorted.sort((a, b) => (a.float ?? 1) - (b.float ?? 1));
        break;
    }
    return sorted;
  }, [inventory, sort, filter, wearFilter, q]);

  const stickerCount = inventory.filter((i) => isStickerItem(i.skinId)).length;

  function sellAll() {
    if (inventory.length === 0) return;
    click();
    const count = inventory.length;
    const payout = Math.round(inventoryValue * QUICK_SELL_RATE);
    inventory.forEach((i) => quickSell(i.uid));
    pushToast({
      kind: "money",
      title: `+${money(payout)}`,
      sub: `${count} eşya hızlı satıldı — pazarda ${money(inventoryValue)} ederdi`,
    });
  }

  const SortBtn = ({ k, Icon, label }: { k: SortKey; Icon: typeof History; label: string }) => (
    <button
      onClick={() => {
        setSort(k);
        click();
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition",
        sort === k
          ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
          : "border-line bg-ink-800 text-white/45 hover:text-white"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rar-milspec/40 bg-rar-milspec/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rar-milspec">
            <Backpack className="h-3.5 w-3.5" /> Envanter
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Eşyaların
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-line bg-ink-800 px-4 py-2 text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">
              Toplam Değer
            </div>
            <div className="font-display text-lg font-black text-emerald-400">
              {money(inventoryValue)}
            </div>
          </div>
          <button
            onClick={() => {
              setStudioOpen(true);
              click();
            }}
            className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 font-display text-sm font-bold text-brand-300 transition hover:bg-brand-500/20"
          >
            <Wand2 className="h-4 w-4" strokeWidth={2.5} />
            Sticker Yap
          </button>
          {inventory.length > 0 && (
            <button
              onClick={sellAll}
              title="Hızlı satış — pazarda daha çok kazanırsın"
              className="flex h-full flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2 font-display text-sm font-bold text-ink-950 transition hover:brightness-110"
            >
              <Coins className="h-4 w-4" strokeWidth={2.5} />
              Hepsini Sat
            </button>
          )}
        </div>
      </div>

      {inventory.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(
            [
              { k: "all" as Filter, label: `Tümü (${inventory.length})` },
              { k: "weapons" as Filter, label: `Silahlar (${inventory.length - stickerCount})` },
              { k: "stickers" as Filter, label: `Sticker (${stickerCount})` },
            ]
          ).map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[11px] font-bold transition",
                filter === k
                  ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
                  : "border-line bg-ink-800 text-white/45 hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
          <SortBtn k="value_desc" Icon={ArrowDownWideNarrow} label="Değer ↓" />
          <SortBtn k="value_asc" Icon={ArrowUpNarrowWide} label="Değer ↑" />
          <SortBtn k="float" Icon={History} label="Float ↓" />
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-2.5">
            <Search className="h-3.5 w-3.5 text-white/30" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara…"
              className="h-8 w-28 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none sm:w-40"
            />
          </div>
        </div>
      )}

      {/* durum (aşınma) filtresi */}
      {inventory.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink-900/50 p-2">
          <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-white/35">
            Durum
          </span>
          <WearFilterRow value={wearFilter} onChange={setWearFilter} />
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line bg-ink-900/50 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-line bg-ink-800 text-white/25">
            <PackageOpen className="h-9 w-9" />
          </div>
          <div>
            <div className="font-display text-xl font-bold text-white/80">
              {inventory.length === 0 ? "Envanterin bomboş" : "Sonuç yok"}
            </div>
            <p className="mt-1 text-sm text-white/40">Kasa açarak skin kazanmaya başla</p>
          </div>
          <button
            onClick={() => setTab("cases")}
            className="rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-6 py-3 font-display text-base font-bold text-ink-950 transition hover:brightness-110"
          >
            Kasalara Git
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <ItemCard
              key={item.uid}
              item={item}
              inShowcase={showcase.some((s) => s.uid === item.uid)}
              onShowcase={() => toggleShowcase(item.uid)}
              onDetail={() => setDetailItem(item)}
              onUpgrade={() => {
                setUpgraderPick(item.uid);
                setTab("upgrader");
                click();
              }}
              onMarket={() => {
                setTab("market");
                click();
              }}
              onSticker={() => {
                if (isStickerItem(item.skinId)) {
                  pushToast({
                    kind: "info",
                    title: "Silah seç",
                    sub: "Bir silahın sticker butonuna basarak yapıştırabilirsin",
                  });
                  setFilter("weapons");
                } else {
                  setStickerTarget(item.uid);
                }
                click();
              }}
              onQuickSell={() => {
                const res = quickSell(item.uid);
                if (res)
                  pushToast({
                    kind: "money",
                    title: `+${money(res.payout)}`,
                    sub: `${res.skin?.weapon} | ${res.skin?.name} hızlı satıldı`,
                  });
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-white/30 transition hover:text-lose"
        >
          <RefreshCcw className="h-3 w-3" /> Hesabımı sıfırla (bakiye + envanter)
        </button>
      </div>

      <AnimatePresence>
        {stickerTarget && (
          <StickerModal weaponUid={stickerTarget} onClose={() => setStickerTarget(null)} />
        )}
        {studioOpen && <StickerStudio onClose={() => setStudioOpen(false)} />}
        {detailItem && (
          <ItemDetailModal
            item={detailItem}
            onClose={() => setDetailItem(null)}
            actions={
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const res = quickSell(detailItem.uid);
                    if (res)
                      pushToast({
                        kind: "money",
                        title: `+${money(res.payout)}`,
                        sub: `${res.skin?.weapon} | ${res.skin?.name} hızlı satıldı`,
                      });
                    setDetailItem(null);
                  }}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs font-black uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20"
                >
                  <Coins className="h-3.5 w-3.5" /> Hızlı Sat
                </button>
                <button
                  onClick={() => {
                    setTab("market");
                    setDetailItem(null);
                    click();
                  }}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 text-xs font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110"
                >
                  <Store className="h-3.5 w-3.5" /> Pazara Koy
                </button>
              </div>
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
