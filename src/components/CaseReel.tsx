import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  FastForward,
  Plus,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { rollCase, caseContentsDetailed, casePrice, type CaseDef } from "../data/cases";
import { QUICK_SELL_RATE } from "../config";
import { rollFloat, wearFromFloat, WEARS } from "../data/wear";
import { FloatBar, WearBadge } from "./WearUi";
import { STICKER_MAP, STICKERS, stickerBonus } from "../data/stickers";
import { STICKERED_DROP_CHANCE } from "../data/items";

const STICKER_IDS = STICKERS.map((s) => s.id);
import { RARITY, fmtMoney, type Skin } from "../data/skins";
import { goldWin, loseSound, reelStart, tick, winSound } from "../lib/audio";
import { loadPrefs, PREFS_EVENT } from "../lib/prefs";
import { clamp, easeOutQuint } from "../lib/rng";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { SkinCard, SkinImg } from "./SkinCard";

const ITEM_W = 168;
const STRIDE = 178;
const REEL_COUNT = 76;
/** Kasa içeriği önizlemesinde gösterilecek kart sayısı (binlerce skin varken performans) */
const PREVIEW_LIMIT = 48;
const WIN_AT = 68;
const SPIN_MS = 6800;
const FAST_SPIN_MS = 3600;
let PREF_FAST = false;
let PREF_SHAKE = true;
let PREF_EFFECTS = true;
function loadCasePrefs() {
  try {
    const p = loadPrefs();
    PREF_FAST = p.fastReels;
    PREF_SHAKE = p.shake;
    PREF_EFFECTS = p.effects;
  } catch {
    /* varsayılan */
  }
}
loadCasePrefs();
if (typeof window !== "undefined") window.addEventListener(PREFS_EVENT, loadCasePrefs);

type Phase = "info" | "spinning" | "landed" | "reveal";

function randomWear() {
  const f = rollFloat();
  return { float: f, wear: WEARS[wearFromFloat(f)] };
}

export function Confetti({ colors }: { colors: string[] }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 5 + Math.random() * 7,
        color: colors[i % colors.length],
        cx: `${(Math.random() - 0.5) * 160}px`,
        cr: `${360 + Math.random() * 720}deg`,
        cd: `${2.8 + Math.random() * 2.2}s`,
        cdel: `${Math.random() * 1.6}s`,
        round: Math.random() > 0.6,
      })),
    [colors]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b) => (
        <span
          key={b.id}
          className="confetti-bit"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.round ? b.size : b.size * 0.45,
            background: b.color,
            borderRadius: b.round ? "50%" : 1,
            ["--cx" as string]: b.cx,
            ["--cr" as string]: b.cr,
            ["--cd" as string]: b.cd,
            ["--cdel" as string]: b.cdel,
          }}
        />
      ))}
    </div>
  );
}

function ReelCard({ skin, highlight }: { skin: Skin; highlight: boolean }) {
  const r = RARITY[skin.rarity];
  return (
    <div
      className="relative flex h-[188px] shrink-0 flex-col items-center justify-between rounded-xl border bg-ink-800 py-3 transition-all duration-300"
      style={{
        width: ITEM_W,
        borderColor: highlight ? r.color : "var(--color-line)",
        backgroundImage: `radial-gradient(110% 80% at 50% 12%, ${r.color}${highlight ? "33" : "12"} 0%, transparent 58%), linear-gradient(to bottom, var(--color-ink-700), var(--color-ink-800))`,
        boxShadow: highlight ? `0 0 32px -4px ${r.color}88, inset 0 0 0 1px ${r.color}` : "none",
        transform: highlight ? "scale(1.05)" : undefined,
        zIndex: highlight ? 2 : 1,
      }}
    >
      <SkinImg skin={skin} className="h-[104px] w-[136px]" />
      {skin.st && (
        <span className="absolute left-2 top-2 z-10 rounded bg-[#cf6a32] px-1 py-px text-[8px] font-black uppercase text-white shadow">
          StatTrak™
        </span>
      )}
      {skin.sv && (
        <span className="absolute left-2 top-2 z-10 rounded bg-[#e4ae39] px-1 py-px text-[8px] font-black uppercase text-ink-950 shadow">
          Hatıra
        </span>
      )}
      <div className="w-full px-3 text-center">
        <div className="truncate text-[10px] font-medium uppercase tracking-wider text-white/40">
          {skin.weapon}
        </div>
        <div className="truncate font-display text-[13px] font-semibold leading-tight text-white/90">
          {skin.name}
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }}
      />
    </div>
  );
}

interface BatchHit {
  skin: Skin;
  seed: string;
  nonce: number;
  forced: boolean;
  float: number;
  stickers: string[];
}

export function CaseModal({ def, onClose }: { def: CaseDef; onClose: () => void }) {
  const { balance, credit, addItem, pushToast, openCase, caseSale, priceSettings, priceVersion } = useGame();
  const price = casePrice(def, caseSale, priceSettings);
  const saleOn = price < def.price;
  const waveOn = price > def.price;
  const [phase, setPhase] = useState<Phase>("info");
  const [winner, setWinner] = useState<Skin | null>(null);
  const [reel, setReel] = useState<Skin[]>([]);
  const [tickFlash, setTickFlash] = useState(0);
  const [handled, setHandled] = useState(false);
  const [shake, setShake] = useState(0);
  const [lastRoll, setLastRoll] = useState<{ seed: string; nonce: number } | null>(null);
  const [batch, setBatch] = useState<BatchHit[] | null>(null);
  const [batchHandled, setBatchHandled] = useState(false);
  const [bigFlash, setBigFlash] = useState(0);
  const wear = useMemo(randomWear, [winner]);

  /* kasadan çıkan silaha stickerlar yapışabilir */
  const dropStickers = useMemo(() => {
    if (!winner || winner.sticker) return [] as string[];
    const chance = def.stickered ? 0.85 : STICKERED_DROP_CHANCE;
    if (Math.random() > chance) return [] as string[];
    const n = Math.random() < 0.5 ? 1 : Math.random() < 0.82 ? 2 : Math.random() < 0.95 ? 3 : 4;
    return Array.from({ length: n }, () => STICKER_IDS[Math.floor(Math.random() * STICKER_IDS.length)]);
  }, [winner, def.stickered]);

  const finalValue = useMemo(() => {
    if (!winner) return 0;
    if (winner.sticker) return winner.price;
    const w = WEARS[wearFromFloat(wear.float)];
    return Math.round(winner.price * w.mult + stickerBonus(dropStickers));
  }, [winner, wear.float, dropStickers]);

  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("info");
  phaseRef.current = phase;

    const { items: contentItems, odds } = useMemo(() => caseContentsDetailed(def), [def, priceVersion]);
  const afford = balance >= price;

  const animateX = (from: number, to: number, dur: number, done: () => void) => {
    const c = containerRef.current;
    const track = trackRef.current;
    if (!c || !track) return;
    const center = c.clientWidth / 2;
    let lastB = Math.floor((center - from) / STRIDE);
    const t0 = performance.now();
    cancelAnimationFrame(animRef.current);
    const loop = (t: number) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const e = easeOutQuint(p);
      const x = from + (to - from) * e;
      track.style.transform = `translate3d(${x}px,0,0)`;
      const b = Math.floor((center - x) / STRIDE);
      if (b !== lastB) {
        lastB = b;
        tick(p);
        setTickFlash((f) => f + 1);
      }
      if (p < 1) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        done();
      }
    };
    animRef.current = requestAnimationFrame(loop);
  };

  const finishSpin = () => {
    setPhase("landed");
    setTimeout(() => {
      setPhase("reveal");
      const r = winnerRef.current;
      if (!r) return;
      if (r.rarity === "rare") goldWin();
      else if (r.rarity === "covert" || r.rarity === "classified") winSound(true);
      else if (r.rarity === "restricted") winSound(false);
      else loseSound();
    }, 550);
  };

  const winnerRef = useRef<Skin | null>(null);
  winnerRef.current = winner;

  const startOpen = () => {
    if (phase === "spinning") return;
    if (balance < price) {
      if (PREF_SHAKE) setShake((s) => s + 1);
      pushToast({
        kind: "lose",
        title: "Yetersiz bakiye",
        sub: "Para Yatır butonundan yetkili onaylı talep oluşturabilirsin",
      });
      return;
    }
    const { skin: w, seed, nonce, forced } = openCase(def);
    setLastRoll({ seed, nonce });
    const items: Skin[] = Array.from({ length: REEL_COUNT }, () => rollCase(def));
    items[WIN_AT] = w;
    setWinner(w);
    setReel(items);
    setHandled(false);
    setPhase("spinning");
    if (forced && PREF_SHAKE) setShake((s) => s + 1);
    reelStart();

    requestAnimationFrame(() => {
      const c = containerRef.current;
      if (!c) return;
      const center = c.clientWidth / 2;
      const jitter = (Math.random() * 2 - 1) * (ITEM_W / 2 - 30);
      const x0 = center - 4 * STRIDE;
      const xf = center - (WIN_AT * STRIDE + ITEM_W / 2) - jitter;
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${x0}px,0,0)`;
      animateX(x0, xf, PREF_FAST ? FAST_SPIN_MS : SPIN_MS, finishSpin);
    });
  };

  const skip = () => {
    const c = containerRef.current;
    const track = trackRef.current;
    if (!c || !track) return;
    const center = c.clientWidth / 2;
    const cur = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
    const xf = center - (WIN_AT * STRIDE + ITEM_W / 2);
    animateX(cur, xf, 1100, finishSpin);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const close = () => {
    if (phase === "spinning") return;
    if (winner && !handled) {
      addItem(winner.id, dropOpts());
      pushToast({ kind: "info", title: "Envantere eklendi", sub: `${winner.weapon} | ${winner.name}` });
    }
    if (batch && !batchHandled) {
      batch.forEach((h) => {
        addItem(h.skin.id, {
          float: h.skin.sticker ? undefined : h.float,
          stickers: h.stickers.length ? h.stickers : undefined,
        });
      });
      pushToast({ kind: "info", title: "Toplu açılış envantere eklendi", sub: `${batch.length} eşya` });
    }
    cancelAnimationFrame(animRef.current);
    onClose();
  };

  const dropOpts = () => ({
    float: winner?.sticker ? undefined : wear.float,
    stickers: dropStickers.length ? dropStickers : undefined,
  });

  const keepItem = () => {
    if (!winner || handled) return;
    addItem(winner.id, dropOpts());
    setHandled(true);
    pushToast({ kind: "win", title: "Envantere eklendi", sub: `${winner.weapon} | ${winner.name}` });
  };

  const sellWin = () => {
    if (!winner || handled) return;
    const payout = Math.round(finalValue * QUICK_SELL_RATE);
    credit(payout);
    setHandled(true);
    pushToast({
      kind: "money",
      title: `+${fmtMoney(payout)}`,
      sub: `Hızlı satıldı — pazarda ${fmtMoney(finalValue)} eder`,
    });
  };

  const winnerRarity = winner ? RARITY[winner.rarity] : null;
  const bigWin = winner?.rarity === "covert" || winner?.rarity === "rare";

  /* ---------- ×10 TOPLU AÇILIŞ ---------- */
  const batchRoll = (count: number): BatchHit[] => {
    const hits: BatchHit[] = [];
    for (let i = 0; i < count; i++) {
      const { skin: w, seed, nonce, forced } = openCase(def);
      if (!w) break;
      const f = w.sticker ? 0 : rollFloat();
      const chance = def.stickered ? 0.85 : STICKERED_DROP_CHANCE;
      let stickers: string[] = [];
      if (!w.sticker && Math.random() <= chance) {
        const n = Math.random() < 0.5 ? 1 : Math.random() < 0.82 ? 2 : Math.random() < 0.95 ? 3 : 4;
        stickers = Array.from({ length: n }, () => STICKER_IDS[Math.floor(Math.random() * STICKER_IDS.length)]);
      }
      hits.push({ skin: w, seed, nonce, forced, float: f, stickers });
    }
    return hits;
  };

  const batchValue = (h: BatchHit) => {
    if (h.skin.sticker) return h.skin.price;
    const w = WEARS[wearFromFloat(h.float)];
    return Math.round(h.skin.price * w.mult + stickerBonus(h.stickers));
  };

  const startBatch = () => {
    if (phase === "spinning") return;
    const cost = price * 10;
    if (balance < cost) {
      if (PREF_SHAKE) setShake((s) => s + 1);
      pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: `×10 için ${fmtMoney(cost)} gerekli` });
      return;
    }
    const hits = batchRoll(10);
    setBatch(hits);
    setBatchHandled(false);
    setPhase("reveal");
    const big = hits.filter((h) => h.skin.rarity === "covert" || h.skin.rarity === "rare");
    if (big.length) {
      if (PREF_EFFECTS) setBigFlash((f) => f + 1);
      goldWin();
    } else {
      winSound(false);
    }
  };

  const keepBatch = () => {
    if (!batch || batchHandled) return;
    batch.forEach((h) => {
      addItem(h.skin.id, {
        float: h.skin.sticker ? undefined : h.float,
        stickers: h.stickers.length ? h.stickers : undefined,
      });
    });
    setBatchHandled(true);
    pushToast({ kind: "win", title: "Toplu açılış envantere eklendi", sub: `${batch.length} eşya` });
  };

  const sellBatch = () => {
    if (!batch || batchHandled) return;
    const total = batch.reduce((a, h) => a + batchValue(h), 0);
    credit(Math.round(total * QUICK_SELL_RATE));
    setBatchHandled(true);
    pushToast({ kind: "money", title: `Toplu satıldı: +${fmtMoney(Math.round(total * QUICK_SELL_RATE))}`, sub: `${batch.length} eşya — pazarda ${fmtMoney(total)} ederdi` });
  };

  const batchTotal = batch ? batch.reduce((a, h) => a + batchValue(h), 0) : 0;
  const batchBig = batch?.some((h) => h.skin.rarity === "covert" || h.skin.rarity === "rare") ?? false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      onClick={close}
    >
      <motion.div
        initial={{ scale: 0.94, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 12, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-2xl"
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <img src={def.img} alt="" className="h-10 w-10 object-contain" />
          <div>
            <div className="font-display text-lg font-bold leading-none">{def.name}</div>
            <div className="mt-1 text-[11px] text-white/40">{def.tagline}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-[10px] font-semibold text-white/45 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              #{lastRoll?.nonce.toLocaleString("tr-TR") ?? "—"}
            </span>
            {phase !== "spinning" && (
              <button
                onClick={close}
                className="rounded-lg border border-line bg-ink-800 p-2 text-white/50 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ---------- BİLGİ EKRANI ---------- */}
        {phase === "info" && (
          <div className="tiny-scroll overflow-y-auto">
            <div className="flex flex-col items-center gap-5 px-5 pb-6 pt-5">
              <div className="relative">
                <div
                  className="absolute inset-0 -z-0 blur-3xl"
                  style={{ background: `radial-gradient(circle, ${def.accent}30, transparent 65%)` }}
                />
                <img src={def.img} alt={def.name} className="animate-floaty relative h-44 object-contain drop-shadow-2xl" />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {(Object.keys(odds) as (keyof typeof odds)[]).map((t) => {
                  const r = RARITY[t];
                  return (
                    <span
                      key={t}
                      className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: r.color, borderColor: `${r.color}44`, background: `${r.color}12` }}
                    >
                      {r.tr} %{odds[t]!.toFixed(2)}
                    </span>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {saleOn && !phase.includes("landed") && (
                  <span className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                    🔥 %{Math.round((1 - price / def.price) * 100)} İndirimli
                  </span>
                )}
                {!saleOn && waveOn && !phase.includes("landed") && (
                  <span className="flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/50 bg-sky-400/15 px-3 text-[11px] font-black uppercase tracking-wider text-sky-300">
                    🌊 %{Math.round((price / def.price - 1) * 100)} Dalga
                  </span>
                )}
                <motion.button
                  key={shake}
                  onClick={startOpen}
                  className={cn(
                    "group flex h-13 items-center gap-3 rounded-xl px-8 font-display text-lg font-bold tracking-wide transition",
                    afford
                      ? saleOn
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110 hover:shadow-[0_10px_36px_-8px_rgba(47,214,115,0.7)]"
                        : "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110 hover:shadow-[0_10px_36px_-8px_rgba(249,142,29,0.7)]"
                      : "cursor-not-allowed border border-lose/40 bg-lose/10 text-lose",
                    shake > 0 && !afford && "animate-shake"
                  )}
                  style={{ height: 52 }}
                >
                  {afford ? (
                    <>
                      Kasayı Aç
                      <span className="flex items-center gap-1 rounded-lg bg-black/25 px-2.5 py-1 text-base">
                        <Coins className="h-4 w-4" />
                        {fmtMoney(price)}
                        {saleOn && <s className="text-xs text-white/50 line-through">{fmtMoney(def.price)}</s>}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5" /> Yetersiz Bakiye — {fmtMoney(price)}
                    </>
                  )}
                </motion.button>

                {/* ×10 toplu açılış */}
                <button
                  onClick={startBatch}
                  disabled={balance < price * 10}
                  className="flex h-[52px] items-center gap-2 rounded-xl border border-rar-classified/50 bg-rar-classified/10 px-5 font-display text-base font-bold tracking-wide text-rar-classified transition hover:bg-rar-classified/20 disabled:cursor-not-allowed disabled:opacity-35"
                  title="Aynı anda 10 kasa aç — sonuçları tek ekranda gör"
                >
                  <span className="flex items-center gap-1 rounded-md bg-black/25 px-2 py-1 text-sm">
                    <Coins className="h-4 w-4" /> ×10
                  </span>
                  Toplu Aç
                  <span className="text-xs font-semibold text-white/45">{fmtMoney(price * 10)}</span>
                </button>
              </div>
              {!afford && (
                <button
                  onClick={() => pushToast({ kind: "info", title: "Nasıl para yatırılır?", sub: "Sağ üstteki Para Yatır → tutarı gir → yetkili onaylasın" })}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-300 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Nasıl para yatırırım?
                </button>
              )}

              <div className="w-full">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="font-display text-sm font-bold uppercase tracking-widest text-white/60">
                    Kasa İçeriği
                  </span>
                  <span className="text-[11px] text-white/35">
                    {contentItems.length} eşya
                    {contentItems.length > PREVIEW_LIMIT && (
                      <span className="text-white/25"> · en değerli {PREVIEW_LIMIT} gösteriliyor</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {contentItems.slice(0, PREVIEW_LIMIT).map((s) => (
                    <SkinCard key={s.id} skin={s} size="xs" />
                  ))}
                </div>
                {contentItems.length > PREVIEW_LIMIT && (
                  <p className="mt-3 rounded-lg border border-line bg-ink-800/60 px-3 py-2 text-center text-[10px] text-white/35">
                    … ve {contentItems.length - PREVIEW_LIMIT} eşya daha — hepsi eşit şansla düşebilir
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------- RULET ---------- */}
        {(phase === "spinning" || phase === "landed" || phase === "reveal") && (
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-0 py-8">
            {/* merkez gösterge */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2">
              <div className={cn("absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2", phase === "spinning" && "tick-flash")} key={tickFlash}>
                <div className="h-full w-full bg-gradient-to-b from-brand-300 via-brand-500 to-brand-300 shadow-[0_0_18px_2px_rgba(249,142,29,0.75)]" />
              </div>
              <ChevronDown className="absolute -top-1 left-1/2 h-6 w-6 -translate-x-1/2 text-brand-300 drop-shadow-[0_0_8px_rgba(249,142,29,0.9)]" />
              <ChevronUp className="absolute -bottom-1 left-1/2 h-6 w-6 -translate-x-1/2 text-brand-300 drop-shadow-[0_0_8px_rgba(249,142,29,0.9)]" />
            </div>

            <div ref={containerRef} className="reel-mask relative w-full overflow-hidden">
              <div ref={trackRef} className="flex gap-[10px] will-change-transform" style={{ width: "max-content" }}>
                {reel.map((s, i) => (
                  <ReelCard key={i} skin={s} highlight={i === WIN_AT && phase !== "spinning"} />
                ))}
              </div>
            </div>

            <div className="mt-6 flex h-12 items-center gap-3">
              {phase === "spinning" ? (
                <>
                  <span className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-white/40">
                    Açılıyor…
                  </span>
                  <button
                    onClick={skip}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-brand-500/50 hover:text-white"
                  >
                    <FastForward className="h-3.5 w-3.5" /> Atla
                  </button>
                </>
              ) : (
                <span className="font-display text-sm font-bold uppercase tracking-[0.3em]" style={{ color: winnerRarity?.color }}>
                  {winnerRarity?.tr}
                </span>
              )}
            </div>

            {/* ---------- ×10 TOPLU SONUÇ ---------- */}
            <AnimatePresence>
              {phase === "reveal" && batch && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex overflow-y-auto bg-ink-950/92 px-4 py-4 backdrop-blur-[6px]"
                >
                  {batchBig && <Confetti colors={["#d32ce6", "#ffffff", "#f98e1d"]} />}
                  {batchBig && bigFlash > 0 && (
                    <div className="pointer-events-none fixed inset-0 z-30 animate-[flash_0.7s_ease-out] bg-white" style={{ animationIterationCount: 1 }} />
                  )}

                  <div className="animate-result relative m-auto w-full max-w-4xl rounded-2xl border border-line bg-ink-800/90 p-4 shadow-2xl sm:p-5">
                    {/* başlık */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rar-classified to-brand-600 font-display text-sm font-black text-white">
                          ×10
                        </div>
                        <div>
                          <div className="font-display text-base font-bold text-white">Toplu Açılış</div>
                          <div className="text-[10px] text-white/40">{def.name} · 10 kasa</div>
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">Toplam Değer</div>
                        <div className="font-display text-xl font-black text-emerald-400">{fmtMoney(batchTotal)}</div>
                      </div>
                    </div>

                    {/* sonuç ızgarası */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                      {batch.map((h, i) => {
                        const r = RARITY[h.skin.rarity];
                        const v = batchValue(h);
                        const big = h.skin.rarity === "covert" || h.skin.rarity === "rare";
                        return (
                          <motion.div
                            key={h.seed + i}
                            initial={{ opacity: 0, y: 14, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: i * 0.07 + 0.15, type: "spring", stiffness: 260, damping: 20 }}
                            className={cn(
                              "relative flex flex-col overflow-hidden rounded-xl border bg-ink-900 p-2",
                              big && "animate-goldring border-rar-rare/60"
                            )}
                            style={{
                              backgroundImage: `radial-gradient(120% 90% at 50% 0%, ${r.color}18, transparent 55%)`,
                            }}
                          >
                            {h.forced && (
                              <span className="absolute right-1.5 top-1.5 z-10 rounded bg-brand-500 px-1 py-px text-[8px] font-black text-ink-950">
                                GARANTİ
                              </span>
                            )}
                            <SkinImg skin={h.skin} className="h-16 w-full sm:h-20" />
                            <div className="mt-1 h-5 truncate text-center text-[9px] font-medium text-white/60">
                              {h.skin.st && <span className="text-[#cf6a32]">ST™ </span>}
                              {h.skin.weapon} | {h.skin.name}
                            </div>
                            <div className="text-center text-[10px] font-bold" style={{ color: r.color }}>
                              {r.tr}
                            </div>
                            <div className="mt-0.5 text-center font-display text-sm font-black text-emerald-400">
                              {fmtMoney(v)}
                            </div>
                            {h.stickers.length > 0 && (
                              <div className="mt-1 flex items-center justify-center gap-0.5">
                                {h.stickers.slice(0, 4).map((sid, si) => {
                                  const s = STICKER_MAP[sid];
                                  return s ? (
                                    <img key={si} src={s.img} alt={s.name} className="h-4 w-4 object-contain" />
                                  ) : null;
                                })}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* aksiyonlar */}
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <button
                        onClick={keepBatch}
                        disabled={batchHandled}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-ink-700 font-display text-sm font-bold text-white transition hover:border-brand-500/60 hover:bg-ink-600 disabled:opacity-40"
                      >
                        {batchHandled ? <Check className="h-5 w-5 text-emerald-400" /> : "Hepsini Envantere Al"}
                      </button>
                      <button
                        onClick={sellBatch}
                        disabled={batchHandled}
                        className="flex h-11 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 font-display text-sm font-bold leading-none text-ink-950 transition hover:brightness-110 disabled:opacity-40"
                      >
                        <span>Hepsini Hızlı Sat</span>
                        <span className="text-[11px] font-black">{fmtMoney(Math.round(batchTotal * QUICK_SELL_RATE))}</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!batchHandled) keepBatch();
                          setBatch(null);
                          setPhase("info");
                          setBatchHandled(false);
                        }}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-sm font-bold text-ink-950 transition hover:brightness-110"
                      >
                        <RotateCcw className="h-4 w-4" /> Tekrar Aç
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---------- SONUÇ ---------- */}
            <AnimatePresence>
              {phase === "reveal" && !batch && winner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex overflow-y-auto bg-ink-950/92 px-4 py-3 backdrop-blur-[6px]"
                >
                  {bigWin && (
                    <Confetti colors={[winnerRarity!.color, "#ffffff", "#f98e1d"]} />
                  )}
                  {bigWin && (
                    <div className="pointer-events-none fixed inset-0 z-30 animate-[flash_0.8s_ease-out] bg-white" style={{ animationIterationCount: 1 }} />
                  )}

                  <div className={cn("relative m-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-line bg-ink-800/90 p-4 text-center shadow-2xl sm:p-6", bigWin ? "animate-win-zoom" : "animate-result")}>
                    {bigWin && (
                      <div className="pointer-events-none absolute inset-x-0 inset-y-0 m-auto h-64 w-64 rounded-full text-white">
                        <span className="drop-shockwave" style={{ color: winnerRarity!.color }} />
                        <span className="drop-shockwave" style={{ color: winnerRarity!.color, animationDelay: "0.14s" }} />
                        <span className="drop-shockwave" style={{ color: winnerRarity!.color, animationDelay: "0.28s" }} />
                      </div>
                    )}
                    <div
                      className="absolute inset-x-0 top-0 h-40 rounded-t-2xl opacity-60"
                      style={{ background: `radial-gradient(60% 100% at 50% 0%, ${winnerRarity!.color}33, transparent)` }}
                    />
                    <span
                      className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: winnerRarity!.color, borderColor: `${winnerRarity!.color}55`, background: `${winnerRarity!.color}15` }}
                    >
                      {winnerRarity!.tr}
                    </span>

                    <div className="relative mt-1 h-36 w-60 sm:h-40 sm:w-64">
                      <div className="animate-spin-slower absolute inset-0 -z-0 opacity-70" style={{ background: `conic-gradient(from 0deg, transparent 0 40%, ${winnerRarity!.color}22 50%, transparent 60% 100%)`, borderRadius: "50%" }} />
                      <SkinImg skin={winner} className="relative h-full w-full" />
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/45">
                      {winner.st && (
                        <span className="rounded bg-[#cf6a32] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                          StatTrak™
                        </span>
                      )}
                      {winner.sv && (
                        <span className="rounded bg-[#e4ae39] px-1.5 py-0.5 text-[9px] font-black uppercase text-ink-950">
                          Hatıra
                        </span>
                      )}
                      {winner.weapon}
                    </div>
                    <div className="font-display text-2xl font-bold text-white">{winner.name}</div>

                    {!winner.sticker && (
                      <div className="mx-auto mt-2 w-full max-w-xs text-[11px]">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <WearBadge wear={wearFromFloat(wear.float)} full />
                          <span className="rounded bg-ink-600 px-2 py-0.5 font-semibold tabular-nums text-white/50">
                            float: {wear.float.toFixed(4)}
                          </span>
                        </div>
                        <FloatBar float={wear.float} className="mt-1.5" />
                      </div>
                    )}

                    {dropStickers.length > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/5 px-2 py-1.5">
                        {dropStickers.map((sid, i) => {
                          const s = STICKER_MAP[sid];
                          return s ? (
                            <img key={i} src={s.img} alt={s.name} title={s.name} className="h-6 w-6 object-contain" />
                          ) : null;
                        })}
                        <span className="text-[10px] font-bold text-brand-300">Stickerlı!</span>
                      </div>
                    )}

                    <div className="mt-3 font-display text-2xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(47,214,115,0.35)] sm:text-3xl">
                      {fmtMoney(finalValue)}
                    </div>

                    <div className="mt-4 grid w-full grid-cols-3 gap-2">
                      <button
                        onClick={sellWin}
                        disabled={handled}
                        title={`Pazarda ${fmtMoney(winner.price)} eder`}
                        className="flex h-11 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 font-display text-sm font-bold leading-none text-ink-950 transition hover:brightness-110 disabled:opacity-40"
                      >
                        <span>Hızlı Sat</span>
                        <span className="text-[11px] font-black">
                          {fmtMoney(Math.round(finalValue * QUICK_SELL_RATE))}
                        </span>
                      </button>
                      <button
                        onClick={keepItem}
                        disabled={handled}
                        className="h-11 rounded-xl border border-line bg-ink-700 font-display text-sm font-bold text-white transition hover:border-brand-500/60 hover:bg-ink-600 disabled:opacity-40"
                      >
                        {handled ? <Check className="mx-auto h-5 w-5 text-emerald-400" /> : "Envantere Al"}
                      </button>
                      <button
                        onClick={() => {
                          if (winner && !handled) {
                            addItem(winner.id, dropOpts());
                            pushToast({ kind: "info", title: "Envantere eklendi", sub: `${winner.weapon} | ${winner.name}` });
                          }
                          setWinner(null);
                          setPhase("info");
                          /* kasayı anında yeniden aç */
                          requestAnimationFrame(() => startOpen());
                        }}
                        disabled={balance < price}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-sm font-bold text-ink-950 transition hover:brightness-110 disabled:opacity-40"
                      >
                        <RotateCcw className="h-4 w-4" strokeWidth={2.6} /> Tekrar Aç
                      </button>
                    </div>

                    <div className="mt-4 w-full truncate rounded-lg border border-line bg-ink-900 px-3 py-2 text-left text-[10px] text-white/35">
                      <span className="text-white/55">Seed:</span> {lastRoll?.seed.slice(0, 40) ?? "—"}… <span className="text-white/55">Nonce:</span> {lastRoll?.nonce ?? "—"} — <span className="text-white/55">Bu sonucu Profilim → Doğrula ile kontrol edebilirsin</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
