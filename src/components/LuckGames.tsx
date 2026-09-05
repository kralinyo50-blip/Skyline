import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clover, Flag, Ticket } from "lucide-react";
import { money } from "../config";
import { SKINS } from "../data/skins";
import { click, coinDing, goldWin, loseSound, reelStart, spinWhoosh, tick } from "../lib/audio";
import { pick, randInt } from "../lib/rng";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";
import type { GameProps } from "./MoreGames";

/* ==================================================================
   V2.0 — ŞANS OYUNLARI: Skyline Slots · Kazı Kazan · Derby
================================================================== */

interface Sym {
  k: string;
  e: string;
  w: number;
  pay: number;
}

const SLOT_SYMS: Sym[] = [
  { k: "coin", e: "🪙", w: 40, pay: 1.8 },
  { k: "knife", e: "🔪", w: 28, pay: 3 },
  { k: "awp", e: "🎯", w: 17, pay: 8 },
  { k: "dragon", e: "🐉", w: 10, pay: 25 },
  { k: "star", e: "⭐", w: 5, pay: 100 },
];

function wSym(list: Sym[]): Sym {
  const total = list.reduce((a, s) => a + s.w, 0);
  let r = randInt(1, total);
  for (const s of list) {
    r -= s.w;
    if (r <= 0) return s;
  }
  return list[list.length - 1];
}

/* ==================== SKYLINE SLOTS ==================== */

export function Slots({ bet, onStart, onEnd }: GameProps) {
  const [reels, setReels] = useState<string[]>(["🪙", "", ""]);
  const [spinning, setSpinning] = useState<boolean[]>([false, false, false]);
  const [busy, setBusy] = useState(false);
  const [lastPay, setLastPay] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearInterval(t)), []);

  function spin() {
    if (busy) return;
    if (!onStart()) return;
    setBusy(true);
    setLastPay(0);
    reelStart();
    spinWhoosh();
    const result = [wSym(SLOT_SYMS), wSym(SLOT_SYMS), wSym(SLOT_SYMS)];
    setSpinning([true, true, true]);
    /* her makara kendi döngüsünde çılgın gibi döner */
    const cyclers = [0, 1, 2].map((i) =>
      window.setInterval(() => {
        setReels((prev) => {
          const next = [...prev];
          next[i] = pick(SLOT_SYMS).e;
          return next;
        });
      }, 70)
    );
    [0, 1, 2].forEach((i) => {
      timers.current.push(
        window.setTimeout(() => {
          window.clearInterval(cyclers[i]);
          setReels((prev) => {
            const next = [...prev];
            next[i] = result[i].e;
            return next;
          });
          setSpinning((prev) => {
            const next = [...prev];
            next[i] = false;
            return next;
          });
          tick();
          if (i === 2) {
            /* değerlendir */
            let mult = 0;
            if (result[0].k === result[1].k && result[1].k === result[2].k) mult = result[0].pay;
            else {
              const stars = result.filter((s) => s.k === "star").length;
              if (stars === 2) mult = 4;
            }
            setLastPay(mult);
            setBusy(false);
            if (mult > 0) {
              if (mult >= 25) goldWin();
              else coinDing();
            } else loseSound();
            onEnd(Math.round(bet * mult));
          }
        }, 600 + i * 420)
      );
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-2xl border border-line bg-ink-900/70 p-6">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Clover className="h-5 w-5 text-brand-400" />
          <span className="font-display text-sm font-black uppercase tracking-widest text-brand-300">
            Skyline Slots
          </span>
        </div>
        <div className="flex items-center justify-center gap-3">
          {reels.map((e, i) => (
            <motion.div
              key={i}
              animate={spinning[i] ? { y: [0, -6, 0] } : { y: 0 }}
              transition={spinning[i] ? { repeat: Infinity, duration: 0.14 } : { duration: 0.1 }}
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-2xl border-2 text-5xl shadow-inner sm:h-28 sm:w-28",
                spinning[i]
                  ? "border-brand-500/50 bg-ink-700 blur-[1px]"
                  : "border-line bg-ink-800",
                !spinning[i] && lastPay > 0 && "border-amber-400/70 shadow-[0_0_24px_rgba(228,174,57,0.25)]"
              )}
            >
              {e}
            </motion.div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={spin}
            disabled={busy}
            className={cn(
              "rounded-xl px-8 py-3 font-display text-sm font-black uppercase tracking-wider transition",
              busy ? "cursor-not-allowed bg-ink-700 text-white/30" : "bg-brand-500 text-black hover:bg-brand-400"
            )}
          >
            {busy ? "Dönüyor…" : "Çevir"}
          </button>
          {lastPay > 0 && !busy && (
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-xl font-black text-emerald-400"
            >
              ×{lastPay} · +{money(Math.round(bet * lastPay))}
            </motion.span>
          )}
        </div>
        {lastPay >= 25 && !busy && <Confetti colors={["#f5d90a", "#f98e1d", "#ffffff"]} />}
      </div>
      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">Ödemeler (3 aynı)</div>
        <div className="space-y-1.5">
          {[...SLOT_SYMS].reverse().map((s) => (
            <div key={s.k} className="flex items-center justify-between rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-xs font-bold text-white/60">
              <span className="text-base">{s.e} {s.e} {s.e}</span>
              <span className="font-display tabular-nums text-brand-300">×{s.pay}</span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-xs font-bold text-white/60">
            <span className="text-base">⭐ ⭐</span>
            <span className="font-display tabular-nums text-brand-300">×4</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== KAZI KAZAN ==================== */

const SCRATCH_SYMS: Sym[] = [
  { k: "coin", e: "🪙", w: 34, pay: 1.8 },
  { k: "knife", e: "🔪", w: 26, pay: 3 },
  { k: "awp", e: "🎯", w: 20, pay: 8 },
  { k: "dragon", e: "🐉", w: 12, pay: 25 },
  { k: "star", e: "⭐", w: 8, pay: 100 },
];

export function Scratch({ bet, onStart, onEnd }: GameProps) {
  const { addItem, pushToast } = useGame();
  const [cells, setCells] = useState<{ e: string; k: string; open: boolean }[]>([]);
  const [phase, setPhase] = useState<"idle" | "scratch" | "done">("idle");
  const [lastMult, setLastMult] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function buy() {
    if (phase === "scratch") return;
    if (!onStart()) return;
    click();
    setCells(Array.from({ length: 9 }, () => ({ ...wSym(SCRATCH_SYMS), open: false })));
    setLastMult(0);
    setPhase("scratch");
  }

  function finish(grid: { e: string; k: string; open: boolean }[]) {
    const counts: Record<string, number> = {};
    grid.forEach((c) => (counts[c.k] = (counts[c.k] ?? 0) + 1));
    let mult = 0;
    for (const s of SCRATCH_SYMS) if ((counts[s.k] ?? 0) >= 3 && s.pay > mult) mult = s.pay;
    setLastMult(mult);
    setPhase("done");
    if (mult > 0) {
      if (mult >= 25) goldWin();
      else coinDing();
    } else loseSound();
    onEnd(Math.round(bet * mult));
    /* 3 yıldız = bilet serisi: skin hediyesi */
    if ((counts["star"] ?? 0) >= 3) {
      const pool = SKINS.filter((s) => !s.sticker && s.price >= bet * 5 && s.price <= bet * 60);
      const widen = SKINS.filter((s) => !s.sticker && s.price >= bet * 2 && s.price <= bet * 100);
      const skin = pick(pool.length ? pool : widen);
      if (skin) {
        addItem(skin.id);
        pushToast({ kind: "win", title: "🎟️ Biletten skin çıktı!", sub: `${skin.weapon} | ${skin.name}` });
      }
    }
  }

  function reveal(i: number) {
    if (phase !== "scratch" || cells[i]?.open) return;
    tick();
    const next = cells.map((c, j) => (j === i ? { ...c, open: true } : c));
    setCells(next);
    if (next.every((c) => c.open)) finish(next);
  }

  function revealAll() {
    if (phase !== "scratch") return;
    click();
    cells.forEach((c, i) => {
      if (c.open) return;
      timers.current.push(
        window.setTimeout(() => {
          setCells((prev) => {
            const next = prev.map((cc, j) => (j === i ? { ...cc, open: true } : cc));
            if (next.every((cc) => cc.open)) timers.current.push(window.setTimeout(() => finish(next), 120));
            return next;
          });
          tick();
        }, 90 * (i + 1))
      );
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-2xl border border-line bg-ink-900/70 p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-widest text-brand-300">
            <Ticket className="h-5 w-5" /> Kazı Kazan
          </span>
          <span className="rounded-full border border-line bg-ink-800 px-2.5 py-1 text-[11px] font-bold text-white/50">
            Bilet: {money(bet)}
          </span>
        </div>
        {phase === "idle" ? (
          <button
            onClick={buy}
            className="mx-auto flex h-56 w-full max-w-sm flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-500/40 bg-brand-500/5 font-display text-sm font-black uppercase tracking-widest text-brand-300 transition hover:bg-brand-500/10"
          >
            <Ticket className="h-10 w-10" />
            Bilet Al · {money(bet)}
          </button>
        ) : (
          <>
            <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
              {cells.map((c, i) => (
                <button
                  key={i}
                  onClick={() => reveal(i)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border text-3xl transition",
                    c.open
                      ? "border-line bg-ink-800"
                      : "border-amber-400/30 bg-gradient-to-br from-ink-500 via-ink-600 to-ink-700 hover:border-amber-400/60"
                  )}
                >
                  {c.open ? (
                    <motion.span initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}>
                      {c.e}
                    </motion.span>
                  ) : (
                    <span className="text-lg text-amber-200/40">✦</span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              {phase === "scratch" && (
                <button
                  onClick={revealAll}
                  className="rounded-xl border border-line bg-ink-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/60 transition hover:text-white"
                >
                  Tümünü Kazı
                </button>
              )}
              {phase === "done" && (
                <>
                  <span
                    className={cn(
                      "font-display text-lg font-black",
                      lastMult > 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {lastMult > 0 ? `×${lastMult} · +${money(Math.round(bet * lastMult))}` : "Kazıyan kazanır, bir dahaki sefere"}
                  </span>
                  <button
                    onClick={buy}
                    className="rounded-xl bg-brand-500 px-4 py-2 font-display text-xs font-black uppercase tracking-wider text-black transition hover:bg-brand-400"
                  >
                    Yeni Bilet
                  </button>
                </>
              )}
            </div>
          </>
        )}
        {lastMult >= 25 && phase === "done" && <Confetti colors={["#f5d90a", "#ff45a8", "#ffffff"]} />}
      </div>
      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">3 Aynı = Ödül</div>
        <div className="space-y-1.5">
          {[...SCRATCH_SYMS].reverse().map((s) => (
            <div key={s.k} className="flex items-center justify-between rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-xs font-bold text-white/60">
              <span className="text-base">{s.e} {s.e} {s.e}</span>
              <span className="font-display tabular-nums text-brand-300">×{s.pay}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/35">
          3 × ⭐ hizalarsan bilet serisi yapar: bahis dilimine uygun bir skin envanterine düşer.
        </p>
      </div>
    </div>
  );
}

/* ==================== DERBY ==================== */

const DERBY_RUNNERS = [
  { name: "Şimşek", color: "#f5d90a" },
  { name: "Kara İnci", color: "#8fa0bd" },
  { name: "Bozkır Rüzgarı", color: "#2fd673" },
  { name: "Altın Tozu", color: "#f98e1d" },
  { name: "Gece Avcısı", color: "#b06bff" },
  { name: "Deli Fırtına", color: "#ff45a8" },
];
const DERBY_ODDS = [2.2, 3.5, 5, 7, 10, 15];

export function Derby({ bet, onStart, onEnd }: GameProps) {
  const { pushToast } = useGame();
  const [odds, setOdds] = useState<number[]>(() => [...DERBY_ODDS].sort(() => Math.random() - 0.5));
  const [picked, setPicked] = useState<number | null>(null);
  const [mode, setMode] = useState<"win" | "place">("win");
  const [pos, setPos] = useState<number[]>(Array(6).fill(0));
  const [phase, setPhase] = useState<"idle" | "race" | "done">("idle");
  const [order, setOrder] = useState<number[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  function start() {
    if (picked === null || phase === "race") return;
    if (!onStart()) return;
    click();
    setPhase("race");
    setOrder([]);
    setPos(Array(6).fill(0));
    const skill = odds.map((o) => 1 / o);
    const sum = skill.reduce((a, b) => a + b, 0);
    const finished: number[] = [];
    timer.current = window.setInterval(() => {
      setPos((prev) => {
        const next = prev.map((p, i) =>
          finished.includes(i) ? p : p + (skill[i] / sum) * (100 / 80) * (0.55 + Math.random() * 0.9)
        );
        next.forEach((p, i) => {
          if (p >= 100 && !finished.includes(i)) finished.push(i);
        });
        if (finished.length === 6 && timer.current) {
          window.clearInterval(timer.current);
          timer.current = null;
          window.setTimeout(() => settle(finished), 250);
        }
        return next;
      });
      tick();
    }, 80);
  }

  function settle(fin: number[]) {
    setOrder(fin);
    setPhase("done");
    setOdds((o) => [...o].sort(() => Math.random() - 0.5));
    if (picked === null) return;
    let mult = 0;
    if (mode === "win" && fin[0] === picked) mult = odds[picked];
    if (mode === "place" && fin.indexOf(picked) < 2) mult = Math.round((1 + (odds[picked] - 1) * 0.35) * 100) / 100;
    if (mult > 0) {
      goldWin();
      pushToast({
        kind: "money",
        title: `🏇 ${DERBY_RUNNERS[picked].name} ${mode === "win" ? "kazandı" : "tabelada"}`,
        sub: `×${mult} · +${money(Math.round(bet * mult))}`,
      });
    } else {
      loseSound();
      pushToast({ kind: "lose", title: `🏇 ${DERBY_RUNNERS[fin[0]].name} geçti`, sub: "Bir sonraki koşuda görüşürüz" });
    }
    onEnd(Math.round(bet * mult));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-widest text-brand-300">
            <Flag className="h-5 w-5" /> Skyline Derby
          </span>
          {phase === "race" && (
            <span className="animate-pulse rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-rose-300">
              Canlı Koşu
            </span>
          )}
        </div>
        <div className="space-y-2">
          {DERBY_RUNNERS.map((r, i) => (
            <div key={r.name} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-[11px] font-bold" style={{ color: r.color }}>
                {r.name}
              </span>
              <div className="relative h-8 flex-1 overflow-hidden rounded-lg border border-line bg-ink-800">
                <div
                  className="absolute inset-y-0 left-0 opacity-15"
                  style={{ width: `${Math.min(100, pos[i])}%`, background: r.color }}
                />
                <motion.span
                  className="absolute top-1/2 -translate-y-1/2 text-lg"
                  style={{ left: `calc(${Math.min(94, pos[i])}% )` }}
                >
                  🐎
                </motion.span>
                {order.indexOf(i) >= 0 && phase === "done" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-black/50 px-1.5 py-0.5 font-display text-[10px] font-black text-white">
                    {order.indexOf(i) + 1}.
                  </span>
                )}
              </div>
              <span className="w-12 shrink-0 text-right font-display text-[11px] font-bold tabular-nums text-white/50">
                ×{odds[i]}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          {phase !== "race" ? (
            <button
              onClick={start}
              disabled={picked === null}
              className={cn(
                "rounded-xl px-8 py-3 font-display text-sm font-black uppercase tracking-wider transition",
                picked === null
                  ? "cursor-not-allowed bg-ink-700 text-white/30"
                  : "bg-brand-500 text-black hover:bg-brand-400"
              )}
            >
              Koşuyu Başlat
            </button>
          ) : (
            <span className="font-display text-sm font-black uppercase tracking-widest text-white/40">
              Koşuluyor…
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-line bg-ink-900/70 p-4">
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40">Bahis Türü</div>
          <div className="flex gap-1.5">
            {(["win", "place"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  click();
                }}
                disabled={phase === "race"}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider transition",
                  mode === m
                    ? "border-brand-500 bg-brand-500/10 text-brand-300"
                    : "border-line bg-ink-800 text-white/50 hover:text-white"
                )}
              >
                {m === "win" ? "Kazanır" : "Tabela (ilk 2)"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40">Atını Seç</div>
          <div className="grid grid-cols-2 gap-1.5">
            {DERBY_RUNNERS.map((r, i) => (
              <button
                key={r.name}
                onClick={() => {
                  if (phase === "race") return;
                  setPicked(i);
                  click();
                }}
                disabled={phase === "race"}
                className={cn(
                  "rounded-lg border px-2 py-2 text-left transition",
                  picked === i
                    ? "border-brand-500/70 bg-brand-500/10"
                    : "border-line bg-ink-800 hover:border-ink-500"
                )}
              >
                <div className="truncate text-[11px] font-bold" style={{ color: r.color }}>
                  {r.name}
                </div>
                <div className="font-display text-[10px] font-bold tabular-nums text-white/40">
                  {mode === "win" ? `×${odds[i]}` : `×${Math.round((1 + (odds[i] - 1) * 0.35) * 100) / 100}`}
                </div>
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-white/35">
          Oranlar her koşu öncesi karılır. Favoriler hızlı ama ödeme düşük; Deli Fırtına tutarsa ×15.
        </p>
      </div>
    </div>
  );
}
