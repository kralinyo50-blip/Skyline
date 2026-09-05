import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bomb, Castle, Gem, X } from "lucide-react";
import { money } from "../config";
import { click, coinDing, goldWin, loseSound, tick } from "../lib/audio";
import { randInt } from "../lib/rng";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";
import type { GameProps } from "./MoreGames";

/* ==================================================================
   V2.0 — YETENEK OYUNLARI: Keno · Kule (Towers) · Hilo
   Hepsi mevcut GameProps soketine uyar: onStart bahsi düşer,
   onEnd brüt kazanç yatırır (0 = kayıp).
================================================================== */

/* ==================== KENO ==================== */

/** seçim sayısı -> tutuş sayısı -> çarpan */
const KENO_PAY: Record<number, Record<number, number>> = {
  1: { 1: 3.8 },
  2: { 1: 1.1, 2: 9.3 },
  3: { 2: 3.4, 3: 40 },
  4: { 2: 2.2, 3: 7.6, 4: 83 },
  5: { 3: 6.7, 4: 32, 5: 321 },
  6: { 3: 3.9, 4: 13, 5: 65, 6: 541 },
  7: { 4: 12.7, 5: 48, 6: 255, 7: 1593 },
  8: { 4: 6.9, 5: 22, 6: 110, 7: 413, 8: 2754 },
  9: { 4: 4.6, 5: 11.3, 6: 46, 7: 136, 8: 682, 9: 4545 },
  10: { 5: 13.8, 6: 42, 7: 138, 8: 414, 9: 2071, 10: 13805 },
};
const KENO_MAX_PICK = 10;

export function Keno({ bet, onStart, onEnd }: GameProps) {
  const [picks, setPicks] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [phase, setPhase] = useState<"idle" | "draw" | "done">("idle");
  const [lastMult, setLastMult] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const hits = picks.filter((p) => drawn.includes(p)).length;

  function toggle(n: number) {
    if (phase !== "idle") return;
    click();
    setPicks((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length >= KENO_MAX_PICK ? prev : [...prev, n]
    );
  }

  function clear() {
    if (phase !== "idle") return;
    click();
    setPicks([]);
    setDrawn([]);
    setPhase("idle");
  }

  function start() {
    if (phase !== "idle" || picks.length === 0) return;
    if (!onStart()) return;
    /* 40 sayıdan 10 tanesini karıştır */
    const pool = Array.from({ length: 40 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const result = pool.slice(0, 10);
    setDrawn([]);
    setPhase("draw");
    setLastMult(0);
    result.forEach((n, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setDrawn((prev) => [...prev, n]);
          tick();
        }, 320 * (i + 1))
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        const h = picks.filter((p) => result.includes(p)).length;
        const mult = KENO_PAY[picks.length]?.[h] ?? 0;
        setLastMult(mult);
        setPhase("done");
        if (mult > 0) {
          if (mult >= 10) goldWin();
          else coinDing();
        } else loseSound();
        onEnd(Math.round(bet * mult));
      }, 320 * 11)
    );
  }

  const payRow = KENO_PAY[picks.length] ?? {};

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
            1–{KENO_MAX_PICK} sayı seç · 10 çekiliş
          </span>
          <span className="rounded-full border border-line bg-ink-800 px-2.5 py-1 text-[11px] font-bold text-white/60">
            Seçim: <span className="text-brand-300">{picks.length}</span> · Tutuş:{" "}
            <span className="text-emerald-400">{hits}</span>
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => {
            const picked = picks.includes(n);
            const isDrawn = drawn.includes(n);
            const isHit = picked && isDrawn;
            return (
              <button
                key={n}
                onClick={() => toggle(n)}
                disabled={phase !== "idle"}
                className={cn(
                  "aspect-square rounded-lg border font-display text-sm font-bold tabular-nums transition",
                  isHit
                    ? "border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-[0_0_14px_rgba(47,214,115,0.35)]"
                    : picked
                      ? "border-brand-500/70 bg-brand-500/15 text-brand-200"
                      : isDrawn
                        ? "border-line bg-ink-700 text-white/45"
                        : "border-line bg-ink-800 text-white/55 hover:border-ink-500 hover:text-white",
                  phase !== "idle" && !isDrawn && !picked && "opacity-60"
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={start}
            disabled={phase !== "idle" || picks.length === 0}
            className={cn(
              "rounded-xl px-5 py-2.5 font-display text-sm font-black uppercase tracking-wider transition",
              phase === "idle" && picks.length > 0
                ? "bg-brand-500 text-black hover:bg-brand-400"
                : "cursor-not-allowed bg-ink-700 text-white/30"
            )}
          >
            {phase === "draw" ? "Çekiliyor…" : "Çekilişi Başlat"}
          </button>
          <button
            onClick={clear}
            disabled={phase !== "idle"}
            className="rounded-xl border border-line bg-ink-800 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/50 transition hover:text-white disabled:opacity-40"
          >
            Temizle
          </button>
          {phase === "done" && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "ml-auto font-display text-lg font-black",
                lastMult > 0 ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {lastMult > 0 ? `×${lastMult} · +${money(Math.round(bet * lastMult))}` : "Bu sefer olmadı"}
            </motion.span>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">Ödeme Tablosu</div>
        {picks.length === 0 ? (
          <p className="text-xs leading-relaxed text-white/35">
            Sayı seçtikçe ödeme tablosu burada belirir. Ne kadar çok sayı, o kadar büyük çarpan.
          </p>
        ) : (
          <div className="space-y-1.5">
            {Object.entries(payRow).map(([h, m]) => (
              <div
                key={h}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-bold",
                  Number(h) === hits && phase !== "idle"
                    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
                    : "border-line bg-ink-800 text-white/60"
                )}
              >
                <span>{h} tutuş</span>
                <span className="font-display tabular-nums">×{m}</span>
              </div>
            ))}
          </div>
        )}
        {lastMult >= 10 && phase === "done" && <Confetti colors={["#2fd673", "#f5d90a", "#ffffff"]} />}
      </div>
    </div>
  );
}

/* ==================== KULE (TOWERS) ==================== */

const TOWER_FLOORS = 12;
const TOWER_TILES = 4;

function towerFactor(mines: number): number {
  return (TOWER_TILES / (TOWER_TILES - mines)) * 0.97;
}

export function Towers({ bet, onStart, onEnd }: GameProps) {
  const [mines, setMines] = useState(1);
  const [phase, setPhase] = useState<"idle" | "climb" | "dead" | "cashed">("idle");
  const [safe, setSafe] = useState<number[]>([]);
  const [path, setPath] = useState<{ tile: number; ok: boolean }[]>([]);
  const [floor, setFloor] = useState(0);
  const [mult, setMult] = useState(1);

  const factor = towerFactor(mines);
  const nextMult = Math.round(mult * factor * 100) / 100;

  function start() {
    if (phase === "climb") return;
    if (!onStart()) return;
    click();
    setSafe(Array.from({ length: TOWER_FLOORS }, () => randInt(0, TOWER_TILES - 1)));
    setPath([]);
    setFloor(0);
    setMult(1);
    setPhase("climb");
  }

  function pickTile(t: number) {
    if (phase !== "climb") return;
    const isSafe = t === safe[floor];
    tick();
    const nextPath = [...path, { tile: t, ok: isSafe }];
    setPath(nextPath);
    if (!isSafe) {
      setPhase("dead");
      loseSound();
      onEnd(0);
      return;
    }
    const nm = Math.round(mult * factor * 100) / 100;
    const nf = floor + 1;
    setMult(nm);
    setFloor(nf);
    if (nf >= TOWER_FLOORS) {
      setPhase("cashed");
      goldWin();
      onEnd(Math.round(bet * nm));
    } else {
      coinDing();
    }
  }

  function cashout() {
    if (phase !== "climb" || floor === 0) return;
    setPhase("cashed");
    if (mult >= 5) goldWin();
    else coinDing();
    onEnd(Math.round(bet * mult));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="mx-auto flex max-w-sm flex-col-reverse gap-1.5">
          {Array.from({ length: TOWER_FLOORS }, (_, f) => {
            const choice = path[f];
            const isCurrent = phase === "climb" && f === floor;
            const cum = Math.round(Math.pow(factor, f) * 100) / 100;
            return (
              <div key={f} className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-14 shrink-0 text-right font-display text-[10px] font-bold tabular-nums",
                    isCurrent ? "text-brand-300" : "text-white/30"
                  )}
                >
                  ×{cum}
                </span>
                <div className="grid flex-1 grid-cols-4 gap-1.5">
                  {Array.from({ length: TOWER_TILES }, (_, t) => {
                    const chosen = choice?.tile === t;
                    const revealSafe = choice ? t === safe[f] : false;
                    return (
                      <button
                        key={t}
                        onClick={() => pickTile(t)}
                        disabled={!isCurrent}
                        className={cn(
                          "flex h-9 items-center justify-center rounded-lg border transition",
                          chosen && choice!.ok
                            ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-300"
                            : chosen && !choice!.ok
                              ? "border-rose-500/70 bg-rose-500/20 text-rose-300"
                              : isCurrent
                                ? "border-line bg-ink-700 text-white/40 hover:border-brand-500/60 hover:bg-brand-500/10 hover:text-brand-200"
                                : "border-line/60 bg-ink-800/50 text-white/15",
                          phase === "dead" && !chosen && revealSafe && f === path.length - 1 && "border-emerald-400/40 text-emerald-400/60"
                        )}
                      >
                        {chosen ? (
                          choice!.ok ? (
                            <Gem className="h-4 w-4" />
                          ) : (
                            <Bomb className="h-4 w-4" />
                          )
                        ) : phase === "dead" && revealSafe && f === path.length - 1 ? (
                          <Gem className="h-3.5 w-3.5 opacity-60" />
                        ) : isCurrent ? (
                          <span className="text-xs">?</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-line bg-ink-900/70 p-4">
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40">Mayın Sayısı</div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((m) => (
              <button
                key={m}
                onClick={() => {
                  if (phase === "climb") return;
                  setMines(m);
                  click();
                }}
                disabled={phase === "climb"}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-1.5 font-display text-xs font-bold transition",
                  mines === m
                    ? "border-brand-500 bg-brand-500/10 text-brand-300"
                    : "border-line bg-ink-800 text-white/50 hover:text-white",
                  phase === "climb" && "opacity-50"
                )}
              >
                {m} mayın · ×{Math.round(towerFactor(m) * 100) / 100}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-ink-800 p-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">Mevcut Çarpan</div>
          <div className="font-display text-3xl font-black tabular-nums text-emerald-400">×{mult}</div>
          <div className="mt-1 text-[11px] text-white/40">
            Sonraki kat: <span className="font-bold text-brand-300">×{nextMult}</span>
          </div>
        </div>
        {phase === "idle" || phase === "dead" || phase === "cashed" ? (
          <button
            onClick={start}
            className="w-full rounded-xl bg-brand-500 px-4 py-3 font-display text-sm font-black uppercase tracking-wider text-black transition hover:bg-brand-400"
          >
            <Castle className="mr-1.5 inline h-4 w-4" /> Kuleye Gir
          </button>
        ) : (
          <button
            onClick={cashout}
            disabled={floor === 0}
            className={cn(
              "w-full rounded-xl px-4 py-3 font-display text-sm font-black uppercase tracking-wider transition",
              floor === 0
                ? "cursor-not-allowed bg-ink-700 text-white/30"
                : "bg-emerald-500 text-black hover:bg-emerald-400"
            )}
          >
            Cashout · {money(Math.round(bet * mult))}
          </button>
        )}
        {phase === "dead" && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">
            <X className="h-4 w-4" /> Mayına bastın — kule düştü.
          </div>
        )}
        {phase === "cashed" && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
            <Gem className="h-4 w-4" /> ×{mult} ile zirveden indin · +{money(Math.round(bet * mult))}
          </div>
        )}
        {mult >= 5 && phase === "cashed" && <Confetti colors={["#2fd673", "#f0b13f", "#ffffff"]} />}
      </div>
    </div>
  );
}

/* ==================== HILO ==================== */

const HILO_MAX_CHAIN = 12;
const RANK_LABEL = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"] as const;

interface HiloCard {
  rank: number;
  suit: (typeof SUITS)[number];
}

export function Hilo({ bet, onStart, onEnd }: GameProps) {
  const [counts, setCounts] = useState<number[]>(Array(14).fill(4));
  const [card, setCard] = useState<HiloCard | null>(null);
  const [history, setHistory] = useState<HiloCard[]>([]);
  const [chain, setChain] = useState(0);
  const [mult, setMult] = useState(1);
  const [phase, setPhase] = useState<"idle" | "play" | "dead" | "cashed">("idle");

  const remaining = counts.reduce((a, b) => a + b, 0);

  function dealFrom(c: number[]): { card: HiloCard; counts: number[] } {
    const total = c.reduce((a, b) => a + b, 0);
    let r = randInt(1, total);
    let rank = 1;
    for (let i = 1; i <= 13; i++) {
      r -= c[i];
      if (r <= 0) {
        rank = i;
        break;
      }
    }
    const next = [...c];
    next[rank] -= 1;
    return { card: { rank, suit: SUITS[randInt(0, 3)] }, counts: next };
  }

  function start() {
    if (phase === "play") return;
    if (!onStart()) return;
    click();
    const fresh = Array(14).fill(4) as number[];
    const d = dealFrom(fresh);
    setCounts(d.counts);
    setCard(d.card);
    setHistory([]);
    setChain(0);
    setMult(1);
    setPhase("play");
  }

  function probs() {
    if (!card) return { hi: 0, lo: 0, eq: 0 };
    let hi = 0;
    let lo = 0;
    for (let i = 1; i <= 13; i++) {
      if (i > card.rank) hi += counts[i];
      if (i < card.rank) lo += counts[i];
    }
    const eq = counts[card.rank];
    return { hi: hi / remaining, lo: lo / remaining, eq: eq / remaining };
  }

  function guess(kind: "hi" | "lo" | "eq") {
    if (phase !== "play" || !card) return;
    const p = probs();
    const prob = kind === "hi" ? p.hi : kind === "lo" ? p.lo : p.eq;
    if (prob <= 0) return;
    const stepMult = Math.round((0.97 / prob) * 100) / 100;
    const d = dealFrom(counts);
    setCounts(d.counts);
    setHistory((h) => [...h, card]);
    const ok =
      kind === "hi" ? d.card.rank > card.rank : kind === "lo" ? d.card.rank < card.rank : d.card.rank === card.rank;
    setCard(d.card);
    if (!ok) {
      setPhase("dead");
      loseSound();
      onEnd(0);
      return;
    }
    const nm = Math.round(mult * stepMult * 100) / 100;
    setMult(nm);
    const nc = chain + 1;
    setChain(nc);
    tick();
    if (nc >= HILO_MAX_CHAIN) {
      setPhase("cashed");
      goldWin();
      onEnd(Math.round(bet * nm));
    }
  }

  function cashout() {
    if (phase !== "play" || chain === 0) return;
    setPhase("cashed");
    if (mult >= 5) goldWin();
    else coinDing();
    onEnd(Math.round(bet * mult));
  }

  const p = probs();
  const btn = (kind: "hi" | "lo" | "eq", label: string, prob: number, color: string) => {
    const m = prob > 0 ? Math.round((0.97 / prob) * 100) / 100 : 0;
    return (
      <button
        onClick={() => guess(kind)}
        disabled={phase !== "play" || prob <= 0}
        className={cn(
          "flex-1 rounded-xl border px-3 py-3 font-display text-sm font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40",
          color
        )}
      >
        {label}
        <span className="mt-0.5 block text-[10px] font-bold normal-case tracking-normal opacity-70">
          ×{m} · %{Math.round(prob * 100)}
        </span>
      </button>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-2xl border border-line bg-ink-900/70 p-6">
        <div className="flex items-center justify-center gap-6">
          <div className="flex -space-x-6 opacity-50">
            {history.slice(-4).map((h, i) => (
              <div
                key={i}
                className="flex h-20 w-14 items-center justify-center rounded-lg border border-line bg-ink-700 font-display text-sm font-bold"
              >
                <span className={h.suit === "♥" || h.suit === "♦" ? "text-rose-400" : "text-white/70"}>
                  {RANK_LABEL[h.rank]}
                  {h.suit}
                </span>
              </div>
            ))}
          </div>
          {card ? (
            <motion.div
              key={history.length}
              initial={{ rotateY: 90, scale: 0.9 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex h-40 w-28 flex-col items-center justify-center rounded-2xl border-2 border-white/20 bg-white shadow-2xl"
            >
              <span
                className={cn(
                  "font-display text-4xl font-black",
                  card.suit === "♥" || card.suit === "♦" ? "text-rose-600" : "text-slate-900"
                )}
              >
                {RANK_LABEL[card.rank]}
              </span>
              <span
                className={cn(
                  "text-3xl",
                  card.suit === "♥" || card.suit === "♦" ? "text-rose-600" : "text-slate-900"
                )}
              >
                {card.suit}
              </span>
            </motion.div>
          ) : (
            <div className="flex h-40 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-line bg-ink-800 font-display text-xs font-bold uppercase tracking-widest text-white/30">
              Kart
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-2">
          {btn("hi", "Yüksek", p.hi, "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20")}
          {btn("eq", "Eşit", p.eq, "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20")}
          {btn("lo", "Düşük", p.lo, "border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20")}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="rounded-xl border border-line bg-ink-800 p-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">Zincir</div>
          <div className="font-display text-2xl font-black tabular-nums text-white">
            {chain}<span className="text-white/30">/{HILO_MAX_CHAIN}</span>
          </div>
          <div className="mt-1 font-display text-xl font-black tabular-nums text-emerald-400">×{mult}</div>
        </div>
        {phase === "play" ? (
          <button
            onClick={cashout}
            disabled={chain === 0}
            className={cn(
              "w-full rounded-xl px-4 py-3 font-display text-sm font-black uppercase tracking-wider transition",
              chain === 0
                ? "cursor-not-allowed bg-ink-700 text-white/30"
                : "bg-emerald-500 text-black hover:bg-emerald-400"
            )}
          >
            Cashout · {money(Math.round(bet * mult))}
          </button>
        ) : (
          <button
            onClick={start}
            className="w-full rounded-xl bg-brand-500 px-4 py-3 font-display text-sm font-black uppercase tracking-wider text-black transition hover:bg-brand-400"
          >
            Zinciri Başlat
          </button>
        )}
        <p className="text-[11px] leading-relaxed text-white/35">
          Her doğru tahmin çarpanı olasılığa göre büyütür. Eşit tahmini riskli ama ödeme devasa. 12 zincirde
          otomatik cashout.
        </p>
        {phase === "dead" && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">
            Zincir koptu — {chain} tahminde kaldın.
          </div>
        )}
        {mult >= 5 && phase === "cashed" && <Confetti colors={["#2fd673", "#4fd8ff", "#ffffff"]} />}
      </div>
    </div>
  );
}
