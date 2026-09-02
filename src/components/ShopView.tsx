import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Hammer,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { MARKET_FEE, money } from "../config";
import {
  SHOP_CATEGORIES,
  SHOP_CATEGORY_KEYS,
  SHOP_MATERIALS,
  SHOP_MATERIAL_MAP,
  SHOP_PRODUCTS,
  SHOP_PRODUCT_MAP,
  SHOP_BOT_STORE_MAP,
  CUSTOM_RECIPES,
  recipeText,
  recipeCost,
  shopMargin,
  type ShopCategory,
  type ShopProductDef,
} from "../data/shop";
import { useGame } from "../store/Game";
import { type ShopCustom } from "../store/db";
import { click } from "../lib/audio";
import { cn } from "../utils/cn";

type Sub = "shops" | "mine" | "stock" | "craft";

const CAT_EMOJI: Record<string, string> = {
  giyim: "👕",
  yemek: "🍽️",
  icecek: "🥤",
  aksesuar: "💍",
  ev: "🛋️",
  elektronik: "📱",
};

function catLabel(cat: string): string {
  return (SHOP_CATEGORIES as Record<string, { label: string }>)[cat]?.label ?? cat;
}

function catEmoji(cat: string): string {
  return CAT_EMOJI[cat] ?? "🛍️";
}

/* ---------- ürün başlığı --- ---------- */
function itemLabel(productId: string, custom?: ShopCustom): { name: string; emoji: string; desc: string; attrs: string[]; cat: string } {
  if (custom) return { name: custom.name, emoji: custom.emoji, desc: custom.desc, attrs: custom.attrs ?? [], cat: custom.category };
  const def = SHOP_PRODUCT_MAP[productId];
  if (!def) return { name: productId, emoji: "📦", desc: "", attrs: [], cat: "" };
  return { name: def.name, emoji: def.emoji, desc: def.desc, attrs: def.attrs, cat: def.category };
}

/* ---------- ürün kartı (katalog) ---------- */
function ProductCard({ def, onBuy }: { def: ShopProductDef; onBuy: (d: ShopProductDef) => void }) {
  const cat = SHOP_CATEGORIES[def.category];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-ink-800/80 p-3.5 transition hover:border-brand-500/40">
      <div className="flex items-start gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl"
          style={{ background: `${cat.color}14`, boxShadow: `inset 0 0 0 1px ${cat.color}33` }}
        >
          {def.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: cat.color, background: `${cat.color}1a` }}>
              {cat.label}
            </span>
            <span className="h-4 w-4" title="Katalog ürünü">
              <ShieldCheckIcon />
            </span>
          </div>
          <h4 className="mt-1 truncate font-display text-sm font-black text-white">{def.name}</h4>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-white/45">{def.desc}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {def.attrs.slice(0, 3).map((a) => (
          <span key={a} className="rounded-md bg-ink-900/80 px-1.5 py-0.5 text-[9px] text-white/50">
            {a}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-line/60 pt-2.5">
        <div>
          <div className="text-[9px] text-white/35">Toptan maliyet</div>
          <div className="font-display text-sm font-black text-white/70">{money(def.cost)}</div>
          <div className="text-[9px] text-white/35">
            Önerilen {money(def.list)} · kâr %{shopMargin(def)}
          </div>
        </div>
        <button
          onClick={() => onBuy(def)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 text-xs font-bold text-brand-300 transition hover:bg-brand-500/25"
        >
          <ShoppingCart className="h-4 w-4" /> Stok Al
        </button>
      </div>
    </div>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/25" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ---------- ürün detayı (modal) ---------- */
function DetailModal({
  title,
  emoji,
  desc,
  attrs,
  extra,
  onClose,
}: {
  title: string;
  emoji: string;
  desc: string;
  attrs: string[];
  extra?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-ink-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between bg-ink-900/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ink-800 text-4xl">{emoji}</div>
            <div>
              <h3 className="font-display text-base font-black text-white">{title}</h3>
              <p className="text-[11px] text-white/40">{desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 transition hover:bg-ink-700 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 p-4">
          <div className="grid grid-cols-2 gap-1.5">
            {attrs.map((a, i) => {
              const [k, v] = a.split(":");
              return (
                <div key={i} className="rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                  <div className="text-[9px] uppercase tracking-wide text-white/30">{k?.trim()}</div>
                  <div className="text-xs font-bold text-white/80">{v?.trim() ?? a}</div>
                </div>
              );
            })}
          </div>
          {extra}
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- sayfalama ---------- */
function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  const push = (n: number | "…") => nums.push(n);
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) push(i);
    else if (nums[nums.length - 1] !== "…") push("…");
  }
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      <button onClick={() => onPage(page - 1)} disabled={page === 1} className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 text-xs font-bold text-white/55 transition hover:text-white disabled:opacity-30">
        <ChevronLeft className="h-4 w-4" /> Önceki
      </button>
      <div className="flex items-center gap-1">
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-xs text-white/25">…</span>
          ) : (
            <button key={n} onClick={() => onPage(n)} className={cn(
              "h-9 min-w-9 rounded-lg border px-2.5 font-display text-sm font-bold transition",
              n === page ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-line bg-ink-800 text-white/45 hover:text-white"
            )}>
              {n}
            </button>
          )
        )}
      </div>
      <button onClick={() => onPage(page + 1)} disabled={page === pages} className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 text-xs font-bold text-white/55 transition hover:text-white disabled:opacity-30">
        Sonraki <ChevronRight className="h-4 w-4" />
      </button>
      <span className="ml-1 text-[11px] text-white/30">{total} ürün • sayfa {page}/{pages}</span>
    </div>
  );
}

const PER_PAGE = 12;

export function ShopView() {
  const g = useGame();
  const [sub, setSub] = useState<Sub>("shops");
  const [cat, setCat] = useState<"all" | ShopCategory>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  /* modallar */
  const [listItem, setListItem] = useState<{ productId: string; label: string; emoji: string; stock: number } | null>(null);
  const [listPrice, setListPrice] = useState("");
  const [listQty, setListQty] = useState("1");
  const [buyDef, setBuyDef] = useState<ShopProductDef | null>(null);
  const [buyQty, setBuyQty] = useState("1");
  const [craftP, setCraftP] = useState<ShopProductDef | null>(null);
  const [craftQty, setCraftQty] = useState("1");
  const [customOpen, setCustomOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmoji, setCEmoji] = useState("🎁");
  const [cCat, setCCat] = useState<ShopCategory>("giyim");
  const [cDesc, setCDesc] = useState("");
  const [cAttr, setCAttr] = useState<string[]>(["", "", ""]);
  const [profileName, setProfileName] = useState(g.shopProfile?.name ?? "");
  const [profileEmoji, setProfileEmoji] = useState(g.shopProfile?.emoji ?? "🏪");
  const [profileDesc, setProfileDesc] = useState(g.shopProfile?.desc ?? "");
  const [detailInfo, setDetailInfo] = useState<{ title: string; emoji: string; desc: string; attrs: string[]; extra?: React.ReactNode } | null>(null);

  const stockEntries = useMemo(
    () =>
      Object.entries(g.shopStock)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => ({ id, n, info: itemLabel(id, g.shopCustoms.find((c) => c.id === id)) })),
    [g.shopStock, g.shopCustoms]
  );

  const materialEntries = useMemo(
    () => Object.entries(g.shopMaterials).filter(([, n]) => n > 0),
    [g.shopMaterials]
  );

  const filteredCatalog = useMemo(() => {
    let list = SHOP_PRODUCTS;
    if (cat !== "all") list = list.filter((p) => p.category === cat);
    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(t) || p.desc.toLowerCase().includes(t) || p.attrs.some((a) => a.toLowerCase().includes(t))
      );
    }
    return list;
  }, [cat, q]);

  const catalogPages = Math.max(1, Math.ceil(filteredCatalog.length / PER_PAGE));
  const catalogPage = Math.min(page, catalogPages);
  const catalogSlice = filteredCatalog.slice((catalogPage - 1) * PER_PAGE, catalogPage * PER_PAGE);

  const activeListings = g.shopAllListings.filter((l) => !l.removed && l.qty > 0 && l.sellerKey !== g.user?.key);

  /* seçili dükkan vitrini (bot + oyuncu) */
  const [selStore, setSelStore] = useState<string | null>(null);
  const storeGroups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; shopName: string; emoji: string; desc: string; isBot: boolean; count: number; stock: number }>();
    for (const l of activeListings) {
      const isBot = !!l.botStore || l.sellerKey.startsWith("botstore-");
      let e = map.get(l.sellerKey);
      if (!e) {
        const bot = isBot ? SHOP_BOT_STORE_MAP[l.sellerKey.replace(/^botstore-/, "")] : undefined;
        const info = itemLabel(l.productId, l.custom);
        e = {
          key: l.sellerKey,
          name: l.shopName || l.sellerName,
          shopName: l.sellerName,
          emoji: bot?.emoji ?? info.emoji,
          desc: bot?.desc ?? "Oyuncu dükkanı",
          isBot,
          count: 0,
          stock: 0,
        };
        map.set(l.sellerKey, e);
      }
      e.count++;
      e.stock += l.qty;
    }
    return [...map.values()].sort((a, b) => Number(b.isBot) - Number(a.isBot) || b.stock - a.stock);
  }, [activeListings]);
  const listingPool = selStore ? activeListings.filter((l) => l.sellerKey === selStore) : activeListings;
  const selStoreInfo = selStore ? storeGroups.find((s) => s.key === selStore) : null;

  /* ---------- yardımcılar ---------- */
  const toNum = (s: string, def = 1) => {
    const n = Math.round(Number(s.replace(/[^\d.]/g, "")));
    return Number.isFinite(n) && n > 0 ? n : def;
  };

  const openList = (productId: string, label: string, emoji: string, stock: number) => {
    setListItem({ productId, label, emoji, stock });
    setListPrice("");
    setListQty("1");
  };

  const openDetail = (l: { productId: string; custom?: ShopCustom; unitPrice: number }) => {
    const info = itemLabel(l.productId, l.custom);
    setDetailInfo({
      title: info.name,
      emoji: info.emoji,
      desc: info.desc,
      attrs: info.attrs,
      extra: (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-2.5">
          <div className="text-[11px] text-white/50">Birim fiyat</div>
          <div className="font-display text-base font-black text-brand-300">{money(l.unitPrice)}</div>
        </div>
      ),
    });
  };

  /* ---------- alt sekmeler ---------- */
  const tabs: { key: Sub; label: string; Icon: typeof Store }[] = [
    { key: "shops", label: "Mağazalar", Icon: Store },
    { key: "mine", label: "Dükkanım", Icon: ShoppingBag },
    { key: "stock", label: "Depom", Icon: Package },
    { key: "craft", label: "Üretim", Icon: Hammer },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-4 sm:px-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-white">
            🛍️ Sanal Dükkan
          </h1>
          <p className="text-[11px] text-white/40">
            Stok al, üret, vitrine koy — botlar ve oyuncular mağazana gelir. Ürünlerin normal pazara girmez, sadece dükkanında.
          </p>
        </div>
        <div className="hidden rounded-2xl border border-line bg-ink-800/70 px-4 py-2.5 text-right sm:block">
          <div className="text-[10px] text-white/35">Depomdaki stok</div>
          <div className="font-display text-lg font-black text-white">
            {stockEntries.reduce((a, e) => a + e.n, 0)} <span className="text-xs font-bold text-white/40">ürün</span>
          </div>
        </div>
      </div>

      {/* alt sekmeler */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setSub(key); setSelStore(null); click(); }}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition",
              sub === key ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-line bg-ink-800 text-white/50 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ============ MAĞAZALAR (alışveriş) ============ */}
      {sub === "shops" && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Ürün, özellik ara… (ör. deri, kalori, beden)"
                className="h-10 w-full rounded-xl border border-line bg-ink-800 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setCat("all")}
                className={cn("h-10 rounded-xl border px-3 text-xs font-bold transition", cat === "all" ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-line bg-ink-800 text-white/45 hover:text-white")}
              >
                Hepsi
              </button>
              {SHOP_CATEGORY_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => setCat(k)}
                  className={cn("h-10 rounded-xl border px-3 text-xs font-bold transition", cat === k ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-line bg-ink-800 text-white/45 hover:text-white")}
                >
                  {SHOP_CATEGORIES[k].emoji} {SHOP_CATEGORIES[k].label}
                </button>
              ))}
            </div>
          </div>

          {/* dükkanlar — bot + oyuncu, senkronize tek sistem */}
          {!selStore && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-black text-white/80">🗂️ Dükkanlar</h2>
                <span className="text-[10px] text-white/30">{storeGroups.length} dükkan · {activeListings.length} ilan</span>
              </div>
              {storeGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-ink-900/40 py-8 text-center">
                  <div className="text-3xl">🏪</div>
                  <div className="mt-1 text-xs text-white/50">Dükkanlar hazırlanıyor — az sonra bot vitrinleri açılır.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {storeGroups.slice(0, 24).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSelStore(s.key)}
                      className="group rounded-2xl border border-line bg-ink-800/80 p-3.5 text-left transition hover:border-brand-500/50 hover:bg-ink-800"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-2xl transition group-hover:scale-105">
                          {s.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-display text-sm font-black text-white">{s.name}</span>
                            <span className={cn(
                              "rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase",
                              s.isBot ? "bg-sky-400/15 text-sky-300" : "bg-emerald-400/15 text-emerald-300"
                            )}>
                              {s.isBot ? "🤖 Bot" : "👤 Oyuncu"}
                            </span>
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-[10px] text-white/40">{s.desc}</div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2 text-[10px] font-bold text-white/45">
                        <span>{s.count} ürün</span>
                        <span className="text-brand-300">{s.stock} adet stok</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {selStore && (
            <div className="mb-3 flex items-center gap-2.5">
              <button
                onClick={() => setSelStore(null)}
                className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 text-xs font-bold text-white/60 transition hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" /> Tümü
              </button>
              <span className="text-xl">{selStoreInfo?.emoji ?? "🏪"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-display text-sm font-black text-white">{selStoreInfo?.name ?? "Dükkan"}</span>
                  {selStoreInfo?.isBot && (
                    <span className="rounded-md bg-sky-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-sky-300">🤖 Bot</span>
                  )}
                </div>
                <div className="truncate text-[10px] text-white/40">
                  {selStoreInfo?.desc} · {listingPool.length} ürün · {selStoreInfo?.stock ?? 0} stok
                </div>
              </div>
            </div>
          )}

          {/* canlı ilanlar */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-black text-white/80">🔥 Canlı vitrinler</h2>
            <span className="text-[10px] text-white/30">{listingPool.length} aktif ilan</span>
          </div>
          {listingPool.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-ink-900/40 py-12 text-center">
              <div className="text-4xl">🏪</div>
              <div className="mt-2 text-sm font-bold text-white/60">Henüz vitrinde ürün yok</div>
              <div className="mt-1 text-[11px] text-white/35">Dükkanım sekmesinden ürün koy — bot müşteriler popülerliğe göre gelir; reklam yayınlarsan akış artar.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {listingPool.slice(0, 18).map((l) => {
                const info = itemLabel(l.productId, l.custom);
                const def = SHOP_PRODUCT_MAP[l.productId];
                return (
                  <div key={l.id} className="rounded-2xl border border-line bg-ink-800/80 p-3.5 transition hover:border-brand-500/40">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => openDetail(l)}
                        className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-3xl transition hover:scale-105"
                        style={{ width: 52, height: 52 }}
                      >
                        {info.emoji}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-ink-900 px-1.5 py-0.5 text-[9px] font-bold text-white/40">
                            {catEmoji(info.cat)} {catLabel(info.cat)}
                          </span>
                          {def && (
                            <span className="text-[9px] text-white/25">katalog</span>
                          )}
                        </div>
                        <button onClick={() => openDetail(l)} className="mt-1 block truncate font-display text-sm font-black text-white hover:text-brand-300">
                          {info.name}
                        </button>
                        <div className="mt-0.5 truncate text-[10px] text-white/40">
                          {l.botStore ? "🤖 " : ""}{l.sellerName} · {l.shopName} · {l.qty} adet
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2.5">
                      <div>
                        <div className="font-display text-base font-black text-brand-300">{money(l.unitPrice)}</div>
                        <div className="text-[9px] text-white/30">{def ? `önerilen ${money(def.list)}` : "özel ürün"}</div>
                      </div>
                      <button
                        onClick={() => { setDetailInfo(null); g.buyShopProduct(l.id, 1); }}
                        className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-500/15 px-3.5 text-xs font-bold text-brand-300 transition hover:bg-brand-500/25"
                      >
                        <ShoppingCart className="h-4 w-4" /> Al
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* katalog */}
          <div className="mb-3 mt-8 flex items-center justify-between">
            <h2 className="font-display text-sm font-black text-white/80">📦 Toptancı kataloğu</h2>
            <span className="text-[10px] text-white/30">{filteredCatalog.length} ürün</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {catalogSlice.map((def) => (
              <ProductCard key={def.id} def={def} onBuy={(d) => { setBuyDef(d); setBuyQty("1"); }} />
            ))}
          </div>
          <Pager page={catalogPage} pages={catalogPages} total={filteredCatalog.length} onPage={setPage} />

          {/* ürün detay */}
          <AnimatePresence>
            {detailInfo && (
              <DetailModal {...detailInfo} onClose={() => setDetailInfo(null)} />
            )}
          </AnimatePresence>

          {/* toptan al modal */}
          <AnimatePresence>
            {buyDef && (
              <DetailModal
                title={buyDef.name}
                emoji={buyDef.emoji}
                desc={buyDef.desc}
                attrs={buyDef.attrs}
                extra={
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Adet</span>
                      <input
                        value={buyQty}
                        onChange={(e) => setBuyQty(e.target.value)}
                        className="h-9 w-24 rounded-lg border border-line bg-ink-900 px-2.5 text-sm text-white outline-none focus:border-brand-500/50"
                      />
                      <span className="ml-auto text-[10px] text-white/35">depoda {g.shopStock[buyDef.id] ?? 0} adet</span>
                    </div>
                    {buyDef.recipe && buyDef.recipe.length > 0 && (
                      <div className="rounded-lg bg-ink-900/60 px-2.5 py-2 text-[10px] text-white/45">
                        ✨ Üretilebilir: {recipeText(buyDef.recipe)} → bu maliyete karşılık malzemen varsa üretim daha kârlı olabilir.
                      </div>
                    )}
                    <button
                      onClick={() => { g.buyShopStock(buyDef.id, toNum(buyQty)); setBuyDef(null); }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500/15 text-sm font-bold text-brand-300 transition hover:bg-brand-500/25"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      {money(Math.round(buyDef.cost * toNum(buyQty)))} karşılığında {toNum(buyQty)} adet al
                    </button>
                  </div>
                }
                onClose={() => setBuyDef(null)}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ============ DÜKKANIM ============ */}
      {sub === "mine" && (
        <div className="space-y-4">
          {/* vitrin profili */}
          <div className="rounded-2xl border border-line bg-ink-800/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Store className="h-4 w-4 text-brand-300" />
              <h2 className="font-display text-sm font-black text-white">Mağaza vitrini</h2>
            </div>
            <div className="grid grid-cols-[auto_1fr_1fr] gap-2.5 sm:grid-cols-[auto_1fr_1fr_auto]">
              <input
                value={profileEmoji}
                onChange={(e) => setProfileEmoji(e.target.value)}
                placeholder="🏪"
                maxLength={4}
                className="h-11 w-14 rounded-xl border border-line bg-ink-900 text-center text-xl outline-none focus:border-brand-500/50"
              />
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Mağaza adı (örn. Kaan'ın Butiği)"
                maxLength={24}
                className="h-11 rounded-xl border border-line bg-ink-900 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-500/50"
              />
              <input
                value={profileDesc}
                onChange={(e) => setProfileDesc(e.target.value)}
                placeholder="Kısa açıklama (zorunlu değil)"
                maxLength={90}
                className="h-11 rounded-xl border border-line bg-ink-900 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-500/50 sm:col-span-1 col-span-2"
              />
              <button
                onClick={() => g.saveShopProfile({ name: profileName, emoji: profileEmoji, desc: profileDesc })}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-brand-500/15 px-4 text-xs font-bold text-brand-300 transition hover:bg-brand-500/25"
              >
                <Check className="h-4 w-4" /> Kaydet
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-ink-900/50 px-3 py-2 text-[10px] text-white/40">
              💡 Bot müşteriler mağazaları gezer: herkes kendi zevkine göre (giyim, yemek, elektronik...) ve bütçesine göre alışveriş yapar. Vitrin ne kadar doluysa, reklam yayındaysa ve fiyatlar makulse o kadar çok müşteri gelir.
            </div>
          </div>

          {/* vitrindeki ürünlerim */}
          <div className="rounded-2xl border border-line bg-ink-800/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-brand-300" />
                <h2 className="font-display text-sm font-black text-white">Vitrindeki ürünlerim</h2>
              </div>
              <span className="text-[10px] text-white/30">{g.shopMyListings.length} ilan</span>
            </div>
            {g.shopMyListings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-ink-900/40 py-8 text-center text-xs text-white/35">
                Vitrin boş — Depom'dan ürün seçip satışa çıkar.
              </div>
            ) : (
              <div className="space-y-2">
                {g.shopMyListings.map((l) => {
                  const info = itemLabel(l.productId, l.custom);
                  return (
                    <div key={l.id} className="flex items-center gap-3 rounded-xl border border-line/60 bg-ink-900/50 p-2.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-800 text-2xl">{info.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{info.name}</div>
                        <div className="text-[10px] text-white/35">
                          {l.qty} adet · {money(l.unitPrice)}/birim · {l.sellerKey === g.user?.key ? "senin mağazan" : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-sm font-black text-brand-300">{money(l.unitPrice * l.qty)}</div>
                        <div className="text-[9px] text-white/35">~{money(Math.round(l.unitPrice * l.qty * 0.95))} kazanç</div>
                      </div>
                      <button
                        onClick={() => g.unlistShopItem(l.id)}
                        className="rounded-lg p-2 text-white/35 transition hover:bg-red-500/10 hover:text-red-400"
                        title="Geri çek"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* satış geçmişi */}
          <div className="rounded-2xl border border-line bg-ink-800/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4 text-brand-300" />
              <h2 className="font-display text-sm font-black text-white">Son satışlarım</h2>
            </div>
            {g.shopMyPayments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-ink-900/40 py-8 text-center text-xs text-white/35">
                Henüz satış yok — ürün koy, müşteriler gelsin.
              </div>
            ) : (
              <div className="space-y-1.5">
                {g.shopMyPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-ink-900/50 px-3 py-2 text-xs">
                    <div className="text-white/55">
                      {p.buyerName} <span className="text-white/30">· {p.qty} adet</span>
                    </div>
                    <div className="font-display font-black text-emerald-400">+{money(p.net)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ DEPOM ============ */}
      {sub === "stock" && (
        <div className="space-y-4">
          {/* stok */}
          <div className="rounded-2xl border border-line bg-ink-800/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-300" />
                <h2 className="font-display text-sm font-black text-white">Depom — dükkan ürünleri</h2>
              </div>
              <span className="text-[10px] text-white/30">{stockEntries.reduce((a, e) => a + e.n, 0)} adet</span>
            </div>
            {stockEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-ink-900/40 py-10 text-center">
                <div className="text-3xl">📦</div>
                <div className="mt-2 text-xs font-bold text-white/50">Depo boş</div>
                <div className="mt-1 text-[10px] text-white/30">Mağazalar → Toptancı kataloğundan stok al ya da Üretim'de malzemeden üret.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {stockEntries.map((e) => (
                  <div key={e.id} className="rounded-xl border border-line/60 bg-ink-900/50 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-800 text-2xl">{e.info.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{e.info.name}</div>
                        <div className="text-[10px] text-white/35">
                          {e.n} adet · {catEmoji(e.info.cat)} {catLabel(e.info.cat)}
                        </div>
                      </div>
                      <button
                        onClick={() => openList(e.id, e.info.name, e.info.emoji, e.n)}
                        className="flex h-9 items-center gap-1 rounded-lg bg-brand-500/15 px-2.5 text-[11px] font-bold text-brand-300 transition hover:bg-brand-500/25"
                      >
                        <Plus className="h-3.5 w-3.5" /> Vitrine koy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* malzemeler */}
          <div className="rounded-2xl border border-line bg-ink-800/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-brand-300" />
                <h2 className="font-display text-sm font-black text-white">Malzeme depom</h2>
              </div>
              <span className="text-[10px] text-white/30">{materialEntries.length} çeşit</span>
            </div>
            {materialEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-ink-900/40 py-8 text-center text-xs text-white/35">
                Malzeme yok — Üretim sekmesinden toptancıdan malzeme al.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {materialEntries.map(([id, n]) => (
                  <div key={id} className="flex items-center gap-1.5 rounded-lg border border-line/60 bg-ink-900/60 px-2.5 py-1.5 text-xs">
                    <span className="text-base">{SHOP_MATERIAL_MAP[id]?.emoji ?? "🧰"}</span>
                    <span className="font-bold text-white/75">{SHOP_MATERIAL_MAP[id]?.name ?? id}</span>
                    <span className="text-white/35">× {n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ ÜRETİM ============ */}
      {sub === "craft" && (
        <div className="space-y-4">
          {/* malzeme toptancısı */}
          <div className="rounded-2xl border border-line bg-ink-800/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-brand-300" />
              <h2 className="font-display text-sm font-black text-white">Toptancı — ham madde al</h2>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {SHOP_MATERIALS.map((m) => {
                const have = g.shopMaterials[m.id] ?? 0;
                return (
                  <div key={m.id} className="rounded-xl border border-line/60 bg-ink-900/50 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.emoji}</span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-white/80">{m.name}</div>
                        <div className="text-[9px] text-white/35">depoda {have}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-white/45">{money(m.price)}/adet</span>
                      <button
                        onClick={() => g.buyShopMaterial(m.id, 10)}
                        className="rounded-lg bg-brand-500/15 px-2 py-1 text-[10px] font-bold text-brand-300 transition hover:bg-brand-500/25"
                      >
                        +10 al
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* üretilebilir ürünler */}
          <div className="rounded-2xl border border-line bg-ink-800/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-brand-300" />
                <h2 className="font-display text-sm font-black text-white">Üretim tezgâhı</h2>
              </div>
              <span className="text-[10px] text-white/30">malzemeleri tüketir, ürünü depoya koyar</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SHOP_PRODUCTS.filter((p) => p.recipe && p.recipe.length > 0).map((def) => {
                const cost = recipeCost(def.recipe!);
                const can = def.recipe!.every((r) => (g.shopMaterials[r.mat] ?? 0) >= r.qty);
                return (
                  <div key={def.id} className={cn("rounded-xl border p-3 transition", can ? "border-emerald-500/25 bg-ink-900/50" : "border-line/60 bg-ink-900/40")}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-800 text-2xl">{def.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{def.name}</div>
                        <div className="text-[10px] text-white/35">malzeme değeri {money(cost)} · önerilen {money(def.list)}</div>
                      </div>
                      <button
                        disabled={!can}
                        onClick={() => { setCraftP(def); setCraftQty("1"); }}
                        className={cn("flex h-9 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold transition", can ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "bg-ink-800 text-white/25")}
                      >
                        <Hammer className="h-3.5 w-3.5" /> Üret
                      </button>
                    </div>
                    <div className="mt-2 text-[10px] leading-relaxed text-white/40">
                      📋 {recipeText(def.recipe)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* özel tasarım */}
          <div className="rounded-2xl border border-line bg-ink-800/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-brand-300" />
                <h2 className="font-display text-sm font-black text-white">Kendi ürününü tasarla</h2>
              </div>
              <button
                onClick={() => { setCustomOpen(true); setCName(""); setCDesc(""); setCAttr(["", "", ""]); setCEmoji("🎁"); setCCat("giyim"); }}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 text-xs font-bold text-brand-300 transition hover:bg-brand-500/25"
              >
                <Plus className="h-4 w-4" /> Yeni tasarım
              </button>
            </div>
            <div className="text-[10px] text-white/40">
              {g.shopCustoms.length}/30 tasarım · Her tasarım kategoriye özel malzeme tarifiyle üretilir:{" "}
              {SHOP_CATEGORY_KEYS.map((k) => `${SHOP_CATEGORIES[k].emoji} ${recipeText(CUSTOM_RECIPES[k])}`).join(" · ")}
            </div>
            {g.shopCustoms.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.shopCustoms.map((c) => (
                  <div key={c.id} className="rounded-xl border border-line/60 bg-ink-900/50 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-800 text-2xl">{c.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{c.name}</div>
                        <div className="text-[10px] text-white/35">{catEmoji(c.category)} {catLabel(c.category)} · depoda {g.shopStock[c.id] ?? 0}</div>
                      </div>
                      <button
                        onClick={() => {
                          if (g.craftShopCustom({ name: c.name, emoji: c.emoji, category: c.category, desc: c.desc, attrs: c.attrs }))
                            click();
                        }}
                        className="flex h-9 items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                      >
                        <Hammer className="h-3.5 w-3.5" /> Üret
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* vitrine koy modal */}
      <AnimatePresence>
        {listItem && (
          <DetailModal
            title={`${listItem.label} — vitrine koy`}
            emoji={listItem.emoji}
            desc={`Depodaki stok: ${listItem.stock} adet`}
            attrs={[]}
            extra={
              <div className="mt-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="mb-1 text-[10px] text-white/40">Birim fiyat (SC)</div>
                    <input
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      placeholder="örn. 1500"
                      className="h-10 w-full rounded-lg border border-line bg-ink-900 px-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-500/50"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] text-white/40">Adet (1–{listItem.stock})</div>
                    <input
                      value={listQty}
                      onChange={(e) => setListQty(e.target.value)}
                      className="h-10 w-full rounded-lg border border-line bg-ink-900 px-2.5 text-sm text-white outline-none focus:border-brand-500/50"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    const ok = g.listShopItem(listItem.productId, toNum(listPrice), toNum(listQty));
                    if (ok) setListItem(null);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500/15 text-sm font-bold text-brand-300 transition hover:bg-brand-500/25"
                >
                  <ArrowUpFromLine className="h-4 w-4" /> Vitrine koy
                </button>
                <div className="text-center text-[10px] text-white/35">
                  Komisyon %{Math.round(MARKET_FEE * 100)} — satışta net kazanç gösterilir.
                </div>
              </div>
            }
            onClose={() => setListItem(null)}
          />
        )}
      </AnimatePresence>

      {/* üret modal */}
      <AnimatePresence>
        {craftP && (
          <DetailModal
            title={craftP.name}
            emoji={craftP.emoji}
            desc={craftP.desc}
            attrs={craftP.attrs}
            extra={
              <div className="mt-3 space-y-2.5">
                <div className="rounded-lg bg-ink-900/60 px-2.5 py-2 text-[10px] text-white/45">
                  📋 Gerekli: {recipeText(craftP.recipe)} · Malzeme değeri {money(recipeCost(craftP.recipe!))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Adet</span>
                  <input
                    value={craftQty}
                    onChange={(e) => setCraftQty(e.target.value)}
                    className="h-9 w-24 rounded-lg border border-line bg-ink-900 px-2.5 text-sm text-white outline-none focus:border-brand-500/50"
                  />
                </div>
                <button
                  onClick={() => {
                    const ok = g.craftShopProduct(craftP.id, toNum(craftQty));
                    if (ok) setCraftP(null);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                >
                  <Hammer className="h-4 w-4" /> Üret ve depoya koy
                </button>
              </div>
            }
            onClose={() => setCraftP(null)}
          />
        )}
      </AnimatePresence>

      {/* özel tasarım modal */}
      <AnimatePresence>
        {customOpen && (
          <DetailModal
            title="Yeni ürün tasarla"
            emoji={cEmoji}
            desc="Ürettikten sonra vitrine koyup kendi fiyatından satarsın."
            attrs={[]}
            extra={
              <div className="mt-3 space-y-2.5">
                <div className="grid grid-cols-[auto_1fr] gap-2.5">
                  <input
                    value={cEmoji}
                    onChange={(e) => setCEmoji(e.target.value)}
                    maxLength={4}
                    className="h-10 w-14 rounded-lg border border-line bg-ink-900 text-center text-xl outline-none focus:border-brand-500/50"
                  />
                  <input
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="Ürün adı (örn. Kaan'ın Özel Hoodie)"
                    maxLength={24}
                    className="h-10 rounded-lg border border-line bg-ink-900 px-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-500/50"
                  />
                </div>
                <input
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                  placeholder="Kısa açıklama"
                  maxLength={90}
                  className="h-10 w-full rounded-lg border border-line bg-ink-900 px-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-500/50"
                />
                <div className="flex flex-wrap gap-1">
                  {SHOP_CATEGORY_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => setCCat(k)}
                      className={cn("h-9 rounded-lg border px-2.5 text-[11px] font-bold transition", cCat === k ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-line bg-ink-900 text-white/45 hover:text-white")}
                    >
                      {SHOP_CATEGORIES[k].emoji} {SHOP_CATEGORIES[k].label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {cAttr.map((a, i) => (
                    <input
                      key={i}
                      value={a}
                      onChange={(e) => setCAttr((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                      placeholder={i === 0 ? "Özellik (örn. Beden: L)" : i === 1 ? "Özellik (örn. Kumaş: Pamuk)" : "Özellik (örn. Renk: Siyah)"}
                      maxLength={40}
                      className="h-10 w-full rounded-lg border border-line bg-ink-900 px-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-500/50"
                    />
                  ))}
                </div>
                <div className="rounded-lg bg-ink-900/60 px-2.5 py-2 text-[10px] text-white/45">
                  📋 Üretim tarifi: {recipeText(CUSTOM_RECIPES[cCat])} — tasarım başarılı olursa 1 adet depoya girer.
                </div>
                <button
                  onClick={() => {
                    const ok = g.craftShopCustom({ name: cName, emoji: cEmoji, category: cCat, desc: cDesc, attrs: cAttr });
                    if (ok) setCustomOpen(false);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500/15 text-sm font-bold text-brand-300 transition hover:bg-brand-500/25"
                >
                  <Wand2 className="h-4 w-4" /> Tasarla & üret
                </button>
              </div>
            }
            onClose={() => setCustomOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
