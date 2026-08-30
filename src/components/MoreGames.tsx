import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bomb, Diamond, Dices, Gem, RotateCcw, Target } from "lucide-react";
import { money } from "../config";
import { coinDing, goldWin, loseSound, reelStart, spinWhoosh, tick, click } from "../lib/audio";
import { clamp, randInt } from "../lib/rng";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";

export interface GameProps {
  bet: number;
  onStart: () => boolean;
  onEnd: (payout: number) => void;
}

/* ==================== RULET ==================== */

type Slot = "red" | "black" | "green";
const WHEEL: Slot[] = (() => {
  const out: Slot[] = [];
  for (let i = 0; i < 15; i++) {
    if (i === 0) out.push("green");
    else out.push(i % 2 === 0 ? "red" : "black");
  }
  return out;
})();

const SLOT_STYLE: Record<Slot, { bg: string; label: string; mult: number }> = {
  red: { bg: "#e0453c", label: "KIRMIZI", mult: 2 },
  black: { bg: "#242b3b", label: "SİYAH", mult: 2 },
  green: { bg: "#2fd673", label: "YEŞİL", mult: 14 },
};

const CELL = 74;

export function Roulette({ bet, onStart, onEnd }: GameProps) {
  const [pick, setPick] = useState<Slot>("red");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Slot | null>(null);
  const [x, setX] = useState(0);
  const [history, setHistory] = useState<Slot[]>(() =>
    Array.from({ length: 12 }, () => WHEEL[randInt(0, WHEEL.length - 1)])
  );
  const trackRef = useRef<HTMLDivElement>(null);

  const strip = useMemo(() => Array.from({ length: 90 }, (_, i) => WHEEL[i % WHEEL.length]), []);

  function spin() {
    if (spinning) return;
    if (!onStart()) return;
    setSpinning(true);
    setResult(null);
    spinWhoosh();

    const idx = randInt(55, 74);
    const landed = strip[idx];
    const container = trackRef.current?.parentElement?.clientWidth ?? 600;
    const target = -(idx * CELL) + container / 2 - CELL / 2 + randInt(-22, 22);

    setX(0);
    requestAnimationFrame(() => setX(target));

    window.setTimeout(() => {
      setResult(landed);
      setHistory((h) => [landed, ...h].slice(0, 12));
      setSpinning(false);
      const win = landed === pick;
      if (win) {
        const payout = Math.round(bet * SLOT_STYLE[landed].mult);
        onEnd(payout);
        landed === "green" ? goldWin() : coinDing();
      } else {
        onEnd(0);
        loseSound();
      }
    }, 4400);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
      {result === pick && <Confetti colors={["#2fd673", "#f98e1d", "#ffffff"]} />}

      {/* geçmiş */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {history.map((h, i) => (
          <span
            key={i}
            className="h-5 w-5 rounded"
            style={{ background: SLOT_STYLE[h].bg }}
            title={SLOT_STYLE[h].label}
          />
        ))}
      </div>

      {/* şerit */}
      <div className="relative overflow-hidden rounded-xl border border-line bg-ink-950 py-4">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-[3px] -translate-x-1/2 bg-brand-400 shadow-[0_0_16px_2px_rgba(249,142,29,0.8)]" />
        <div className="reel-mask overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-1.5"
            style={{
              width: "max-content",
              transform: `translate3d(${x}px,0,0)`,
              transition: spinning ? "transform 4.3s cubic-bezier(.12,.72,.06,1)" : "none",
            }}
          >
            {strip.map((s, i) => (
              <div
                key={i}
                className="flex h-16 shrink-0 items-center justify-center rounded-lg font-display text-xl font-black text-white/90"
                style={{ width: CELL - 6, background: SLOT_STYLE[s].bg }}
              >
                {s === "green" ? "★" : s === "red" ? "R" : "B"}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 h-7 text-center">
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "font-display text-xl font-black uppercase tracking-widest",
                result === pick ? "text-win" : "text-lose"
              )}
            >
              {result === pick
                ? `${SLOT_STYLE[result].label} — +${money(bet * SLOT_STYLE[result].mult - bet)}`
                : `${SLOT_STYLE[result].label} — kaybettin`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bahis seçimi */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["red", "green", "black"] as Slot[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setPick(s);
              click();
            }}
            disabled={spinning}
            className={cn(
              "rounded-xl border-2 py-3 font-display text-sm font-black uppercase tracking-wider text-white transition disabled:opacity-60",
              pick === s ? "border-white" : "border-transparent"
            )}
            style={{ background: SLOT_STYLE[s].bg }}
          >
            {SLOT_STYLE[s].label}
            <div className="text-[11px] opacity-80">×{SLOT_STYLE[s].mult}</div>
          </button>
        ))}
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className={cn(
          "mt-3 h-13 w-full rounded-xl font-display text-lg font-black uppercase tracking-widest transition",
          spinning
            ? "cursor-not-allowed bg-ink-600 text-white/30"
            : "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
        )}
        style={{ height: 52 }}
      >
        {spinning ? "Çark dönüyor…" : `${money(bet)} Yatır`}
      </button>
    </div>
  );
}

/* ==================== MAYINLAR ==================== */

const GRID = 25;

export function Mines({ bet, onStart, onEnd }: GameProps) {
  const [mineCount, setMineCount] = useState(3);
  const [active, setActive] = useState(false);
  const [mines, setMines] = useState<number[]>([]);
  const [opened, setOpened] = useState<number[]>([]);
  const [dead, setDead] = useState(false);

  const safeTotal = GRID - mineCount;
  const mult = useMemo(() => {
    let m = 1;
    for (let i = 0; i < opened.length; i++) m *= (GRID - i) / (safeTotal - i);
    return Math.max(1, m * 0.96);
  }, [opened.length, safeTotal]);

  const nextMult = useMemo(() => {
    let m = 1;
    for (let i = 0; i <= opened.length; i++) m *= (GRID - i) / (safeTotal - i);
    return Math.max(1, m * 0.96);
  }, [opened.length, safeTotal]);

  function start() {
    if (active) return;
    if (!onStart()) return;
    const set = new Set<number>();
    while (set.size < mineCount) set.add(randInt(0, GRID - 1));
    setMines([...set]);
    setOpened([]);
    setDead(false);
    setActive(true);
    reelStart();
  }

  function reveal(i: number) {
    if (!active || opened.includes(i) || dead) return;
    if (mines.includes(i)) {
      setDead(true);
      setActive(false);
      onEnd(0);
      loseSound();
      return;
    }
    const next = [...opened, i];
    setOpened(next);
    tick(clamp(next.length / safeTotal, 0, 1));
    coinDing();
    if (next.length >= safeTotal) {
      onEnd(Math.round(bet * nextMult));
      setActive(false);
      goldWin();
    }
  }

  function cashout() {
    if (!active || opened.length === 0) return;
    onEnd(Math.round(bet * mult));
    setActive(false);
    setDead(false);
    goldWin();
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-2xl border border-line bg-ink-900/70 p-5">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
          {Array.from({ length: GRID }).map((_, i) => {
            const isOpen = opened.includes(i);
            const isMine = mines.includes(i);
            const show = dead && isMine;
            return (
              <button
                key={i}
                onClick={() => reveal(i)}
                disabled={!active || isOpen}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl border text-xl transition",
                  isOpen
                    ? "border-emerald-500/50 bg-emerald-500/15"
                    : show
                      ? "border-lose/60 bg-lose/20"
                      : active
                        ? "border-line bg-ink-800 hover:border-brand-500/50 hover:bg-ink-700"
                        : "border-line bg-ink-800/60"
                )}
              >
                {isOpen ? (
                  <Gem className="h-5 w-5 text-emerald-400" />
                ) : show ? (
                  <Bomb className="h-5 w-5 text-lose" />
                ) : null}
              </button>
            );
          })}
        </div>

        {dead && (
          <div className="mt-4 text-center font-display text-xl font-black uppercase tracking-widest text-lose">
            Mayına bastın!
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-ink-900/70 p-4">
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40">
            Mayın Sayısı
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 3, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => !active && setMineCount(n)}
                disabled={active}
                className={cn(
                  "rounded-lg border py-2 font-display text-sm font-bold transition disabled:opacity-40",
                  mineCount === n
                    ? "border-brand-500 bg-brand-500/10 text-brand-300"
                    : "border-line bg-ink-800 text-white/45"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-ink-800 p-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
            Güncel Çarpan
          </div>
          <div className="font-display text-3xl font-black text-brand-300">{mult.toFixed(2)}x</div>
          <div className="mt-1 text-[11px] text-white/40">
            Sonraki: <span className="font-bold text-emerald-400">{nextMult.toFixed(2)}x</span>
          </div>
        </div>

        {active ? (
          <button
            onClick={cashout}
            disabled={opened.length === 0}
            className="h-12 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 font-display text-base font-black uppercase tracking-widest text-ink-950 transition hover:brightness-110 disabled:opacity-40"
          >
            Çek {money(Math.round(bet * mult))}
          </button>
        ) : (
          <button
            onClick={start}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-base font-black uppercase tracking-widest text-ink-950 transition hover:brightness-110"
          >
            {dead ? <RotateCcw className="h-5 w-5" /> : <Bomb className="h-5 w-5" />}
            {dead ? "Tekrar" : `${money(bet)} Başlat`}
          </button>
        )}

        <p className="rounded-lg border border-line bg-ink-800 p-2.5 text-[10px] leading-relaxed text-white/35">
          Elmasları aç, çarpanı yükselt. Mayına basmadan çekmezsen her şeyi kaybedersin.
        </p>
      </div>
    </div>
  );
}

/* ==================== ZAR ==================== */

export function DiceGame({ bet, onStart, onEnd }: GameProps) {
  const [target, setTarget] = useState(50);
  const [over, setOver] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [history, setHistory] = useState<{ v: number; win: boolean }[]>([]);

  const chance = over ? 100 - target : target;
  const mult = Math.max(1.01, (99 / Math.max(1, chance)));

  function play() {
    if (rolling) return;
    if (!onStart()) return;
    setRolling(true);
    setRoll(null);
    spinWhoosh();

    let ticks = 0;
    const iv = window.setInterval(() => {
      setRoll(Math.round(Math.random() * 10000) / 100);
      tick(ticks / 22);
      if (++ticks > 20) {
        clearInterval(iv);
        const final = Math.round(Math.random() * 10000) / 100;
        setRoll(final);
        const win = over ? final > target : final < target;
        setHistory((h) => [{ v: final, win }, ...h].slice(0, 10));
        setRolling(false);
        if (win) {
          onEnd(Math.round(bet * mult));
          goldWin();
        } else {
          onEnd(0);
          loseSound();
        }
      }
    }, 60);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-2xl border border-line bg-ink-900/70 p-6">
        <div className="mb-6 text-center">
          <div
            className={cn(
              "font-display text-6xl font-black tabular-nums transition-colors",
              roll === null
                ? "text-white/25"
                : (over ? roll > target : roll < target)
                  ? "text-win"
                  : "text-lose"
            )}
          >
            {roll === null ? "00.00" : roll.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/35">
            Zar Sonucu
          </div>
        </div>

        {/* çubuk */}
        <div className="relative h-4 overflow-hidden rounded-full bg-lose/50">
          <div
            className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            style={
              over
                ? { left: `${target}%`, right: 0 }
                : { left: 0, width: `${target}%` }
            }
          />
          {roll !== null && (
            <div
              className="absolute -top-1 h-6 w-1 rounded bg-white shadow-lg"
              style={{ left: `calc(${roll}% - 2px)` }}
            />
          )}
        </div>

        <input
          type="range"
          min={2}
          max={98}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          disabled={rolling}
          className="mt-4 w-full accent-brand-500"
        />

        <div className="mt-2 flex justify-between text-[11px] font-bold text-white/40">
          <span>2</span>
          <span className="text-brand-300">Hedef: {target}</span>
          <span>98</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {history.map((h, i) => (
            <span
              key={i}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                h.win ? "bg-emerald-500/15 text-emerald-400" : "bg-lose/15 text-lose"
              )}
            >
              {h.v.toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: false, label: "Altında", Icon: Target },
            { k: true, label: "Üstünde", Icon: Diamond },
          ].map(({ k, label, Icon }) => (
            <button
              key={String(k)}
              onClick={() => {
                setOver(k);
                click();
              }}
              disabled={rolling}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border py-3 font-display text-sm font-bold uppercase transition disabled:opacity-50",
                over === k
                  ? "border-brand-500 bg-brand-500/10 text-brand-300"
                  : "border-line bg-ink-800 text-white/45"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5 rounded-xl border border-line bg-ink-800 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-white/45">Kazanma şansı</span>
            <span className="font-display font-bold text-white/85">%{chance.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/45">Çarpan</span>
            <span className="font-display font-bold text-brand-300">{mult.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5">
            <span className="text-white/45">Kazanç</span>
            <span className="font-display text-base font-black text-emerald-400">
              {money(Math.round(bet * mult))}
            </span>
          </div>
        </div>

        <button
          onClick={play}
          disabled={rolling}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-xl font-display text-base font-black uppercase tracking-widest transition",
            rolling
              ? "cursor-not-allowed bg-ink-600 text-white/30"
              : "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
          )}
        >
          <Dices className="h-5 w-5" />
          {rolling ? "Atılıyor…" : `${money(bet)} Zar At`}
        </button>
      </div>
    </div>
  );
}
