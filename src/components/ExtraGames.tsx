import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleDot,
  Disc3,
  Gauge,
  RotateCcw,
  Sparkles,
  Spade,
  Zap,
} from "lucide-react";
import { money } from "../config";
import { click, coinDing, goldWin, loseSound, spinWhoosh, tick } from "../lib/audio";
import { randInt } from "../lib/rng";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";
import type { GameProps } from "./MoreGames";

/* ==================== BLACKJACK ==================== */

type Suit = "♠" | "♥" | "♦" | "♣";
interface CardC {
  rank: string;
  suit: Suit;
  black: boolean;
  val: number;
}

function makeDeck(): CardC[] {
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  const deck: CardC[] = [];
  ranks.forEach((r) =>
    suits.forEach((s) => {
      const val = r === "A" ? 11 : ["J", "Q", "K"].includes(r) ? 10 : Number(r);
      deck.push({ rank: r, suit: s, black: s === "♠" || s === "♣", val });
    })
  );
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handValue(cards: CardC[]): number {
  let total = cards.reduce((a, c) => a + c.val, 0);
  for (const c of cards) {
    if (total > 21 && c.rank === "A") total -= 10;
  }
  return total;
}

function CardChip({ card, hidden }: { card: CardC | null; hidden?: boolean }) {
  if (!card) return <div className="h-20 w-14 rounded-lg border border-dashed border-ink-500" />;
  return (
    <motion.div
      initial={{ y: -30, opacity: 0, rotateY: 90 }}
      animate={{ y: 0, opacity: 1, rotateY: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "flex h-20 w-14 flex-col items-center justify-center rounded-lg border font-display text-sm font-black shadow-lg",
        hidden
          ? "border-ink-500 bg-ink-700"
          : card.black
            ? "border-white/15 bg-ink-800 text-white"
            : "border-white/15 bg-ink-800 text-lose"
      )}
    >
      {hidden ? (
        <Sparkles className="h-6 w-6 text-brand-400" />
      ) : (
        <>
          <span className="text-lg leading-none">{card.rank}</span>
          <span className="mt-1 text-xl leading-none">{card.suit}</span>
        </>
      )}
    </motion.div>
  );
}

export function Blackjack({ bet, onStart, onEnd }: GameProps) {
  const [deck, setDeck] = useState<CardC[]>(() => makeDeck());
  const [player, setPlayer] = useState<CardC[]>([]);
  const [dealer, setDealer] = useState<CardC[]>([]);
  const [reveal, setReveal] = useState(false);
  const [phase, setPhase] = useState<"idle" | "player" | "dealer" | "done">("idle");
  const [result, setResult] = useState<{ label: string; won: 1 | 0 | -1 } | null>(null);
  const deckRef = useRef(deck);
  deckRef.current = deck;
  /* setState sonrası çağrılan gecikmeli/interval fonksiyonlarında
     eski render kapanışı (stale closure) okunmasın diye refs kullanılır */
  const playerRef = useRef<CardC[]>(player);
  playerRef.current = player;
  const dealerRef = useRef<CardC[]>(dealer);
  dealerRef.current = dealer;

  function draw(n: number): CardC[] {
    let d = deckRef.current;
    if (d.length < n + 10) d = makeDeck();
    const out = d.splice(0, n);
    deckRef.current = d;
    setDeck(d);
    return out;
  }

  function finish(win: 1 | 0 | -1, label: string, payout: number) {
    setPhase("done");
    setReveal(true);
    setResult({ label, won: win });
    onEnd(payout);
    if (win === 1) (payout > bet * 2 ? goldWin() : coinDing());
    else if (win === -1) loseSound();
    else coinDing();
  }

  function start() {
    if (!onStart()) return;
    spinWhoosh();
    setResult(null);
    setReveal(false);
    const p = draw(2);
    const d = draw(2);
    setPlayer(p);
    setDealer(d);
    const pv = handValue(p);
    const dv = handValue(d);
    if (pv === 21 && dv === 21) return finish(0, "Berabere (iki Blackjack)", bet);
    if (pv === 21) return finish(1, "BLACKJACK!", Math.round(bet * 2.5));
    setPhase("player");
  }

  function hit() {
    if (phase !== "player") return;
    click();
    const p = [...playerRef.current, ...draw(1)];
    playerRef.current = p;
    setPlayer(p);
    const v = handValue(p);
    if (v > 21) return finish(-1, "Bust — 21'i geçtin", 0);
    if (v === 21) {
      setPhase("dealer");
      /* Güncel eli ref üzerinden okuyan karşılaştırma fonksiyonu;
         21'e ulaşınca eski render'ın kapanışını kullanmaz */
      window.setTimeout(() => resolveStand(), 350);
    }
  }

  function resolveStand() {
    if (phase === "done") return;
    setReveal(true);
    setPhase("dealer");
    const finalPv = handValue(playerRef.current);
    let d = [...dealerRef.current];
    let dv = handValue(d);
    const iv = window.setInterval(() => {
      if (dv < 17) {
        d = [...d, ...draw(1)];
        dealerRef.current = d;
        setDealer(d);
        dv = handValue(d);
        tick();
      } else {
        clearInterval(iv);
        if (dv > 21 || finalPv > dv) finish(1, "Kazandın!", bet * 2);
        else if (finalPv === dv) finish(0, "Berabere", bet);
        else finish(-1, "Kaybettin", 0);
      }
    }, 550);
  }

  function stand() {
    if (phase !== "player") return;
    click();
    resolveStand();
  }

  const pv = handValue(player);
  const dv = handValue(dealer);
  const blackjack = phase === "idle" && result === null && player.length === 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
      {result?.won === 1 && <Confetti colors={["#f98e1d", "#ffffff", "#2fd673"]} />}

      {blackjack ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-3 text-white/25">
            {(["♠", "♥", "♦", "♣"] as Suit[]).map((s) => (
              <span key={s} className="text-4xl">{s}</span>
            ))}
          </div>
          <div>
            <div className="font-display text-2xl font-black uppercase tracking-widest text-white">
              Blackjack
            </div>
            <div className="mt-1 text-sm text-white/40">
              21'e ulaş — <span className="text-emerald-400 font-semibold">2x</span>, Blackjack{" "}
              <span className="text-brand-400 font-semibold">2.5x</span> öder
            </div>
          </div>
          <button
            onClick={start}
            className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-8 font-display text-base font-black uppercase tracking-widest text-ink-950 transition hover:brightness-110"
          >
            <Spade className="h-5 w-5" /> {money(bet)} Dağıt
          </button>
        </div>
      ) : (
        <>
          {/* krupiye */}
          <div className="mb-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
              Krupiye {reveal ? "" : "(kapalı kart)"}
            </div>
            <div className="flex gap-2">
              {dealer.map((c, i) => (
                <CardChip key={i} card={c} hidden={!reveal && i === 1} />
              ))}
              {dealer.length > 0 && (
                <div className="flex items-center font-display text-2xl font-black text-white/60">
                  {reveal ? dv : handValue([dealer[0]])}
                </div>
              )}
            </div>
          </div>

          {/* oyuncu */}
          <div className="mb-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
              Elin ({pv})
            </div>
            <div className="flex gap-2">
              {player.map((c, i) => (
                <CardChip key={i} card={c} />
              ))}
              {player.length === 0 && <CardChip card={null} />}
            </div>
          </div>

          <AnimatePresence>
            {phase === "player" && (
              <motion.div exit={{ opacity: 0 }} className="flex gap-2">
                <button
                  onClick={hit}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-sm font-black uppercase tracking-widest text-ink-950 hover:brightness-110"
                >
                  Kart Çek
                </button>
                <button
                  onClick={stand}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-ink-800 font-display text-sm font-black uppercase tracking-widest text-white/70 hover:border-ink-500 hover:text-white"
                >
                  Dur
                </button>
              </motion.div>
            )}
            {phase === "dealer" && (
              <div className="flex h-11 items-center justify-center text-sm text-white/40">
                Krupiye oynuyor…
              </div>
            )}
            {phase === "done" && result && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setPlayer([]);
                  setDealer([]);
                  setPhase("idle");
                  setResult(null);
                  setReveal(false);
                  deckRef.current = makeDeck();
                  setDeck(deckRef.current);
                }}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-black uppercase tracking-widest transition",
                  result.won === 1
                    ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                    : result.won === 0
                      ? "bg-ink-700 text-white/70"
                      : "bg-lose/15 text-lose hover:bg-lose/25"
                )}
              >
                <RotateCcw className="h-4 w-4" />
                {result.label} — Tekrar Oyna
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

/* ==================== PLINKO ==================== */

const PLINKO_ROWS = 12;
const PLINKO_SLOTS = PLINKO_ROWS + 1;
/* Binom (C(12,k)/4096) ağırlıklı ev ≈ 0.96 */
const PLINKO_MULTS = [
  10.5, 5.2, 2.6, 1.6, 1.05, 0.75, 0.55, 0.75, 1.05, 1.6, 2.6, 5.2, 10.5,
];
const PEG_GAP = 40;

export function Plinko({ bet, onStart, onEnd }: GameProps) {
  const [busy, setBusy] = useState(false);
  const [path, setPath] = useState<number[] | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [run, setRun] = useState(0);

  function drop() {
    if (busy) return;
    if (!onStart()) return;
    setBusy(true);
    setResult(null);
    spinWhoosh();
    /* pimlerden aşağı rastgele yürüyüş */
    const walk: number[] = [PLINKO_ROWS / 2];
    let pos = PLINKO_ROWS / 2;
    for (let r = 0; r < PLINKO_ROWS; r++) {
      pos += Math.random() < 0.5 ? -0.5 : 0.5;
      pos = Math.max(0, Math.min(PLINKO_SLOTS - 1, pos));
      walk.push(pos);
    }
    setPath(walk);
    setRun((r) => r + 1);
    const slot = Math.round(walk[walk.length - 1]);
    const mult = PLINKO_MULTS[slot];
    const payout = Math.round(bet * mult);

    window.setTimeout(() => {
      setBusy(false);
      setResult(mult);
      onEnd(payout);
      if (payout >= bet) coinDing();
      else loseSound();
    }, 2500);
  }

  /* Top merkez-göreli konumlandırılır (pimler de calc(50% + ...) ile aynı düzende).
     Noktalar: üstten düşüş → 0. sıra pimine çarpma → her sıra düzleminde doğru x →
     son nokta kazanılan yuvanın tam ortasına iniş. */
  const rowY = (r: number) => r * (PEG_GAP * 1.05) + 13; // pim merkezi hizası (top üst kenarı)
  const slotY = PLINKO_ROWS * (PEG_GAP * 1.05) + 90 - 37; // yuva merkezi hizası
  const xs = path ? [path[0] - PLINKO_ROWS / 2, ...path.map((p) => (p - PLINKO_ROWS / 2) * PEG_GAP)] : [];
  const ys = path ? [6, ...path.map((_, i) => (i < PLINKO_ROWS ? rowY(i) : slotY))] : [];
  const width = PLINKO_SLOTS * PEG_GAP;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
          {PLINKO_ROWS} sıra • {PLINKO_SLOTS} yuva
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <CircleDot className="h-3.5 w-3.5 text-brand-400" />
          <span className="font-display font-bold text-white/60">{money(bet)}</span>
        </div>
      </div>

      <div
        className="relative mx-auto overflow-hidden rounded-xl border border-line bg-ink-950"
        style={{ maxWidth: width, height: PLINKO_ROWS * PEG_GAP * 1.05 + 90 }}
      >
        {/* pimler */}
        {Array.from({ length: PLINKO_ROWS }).map((_, r) => {
          const count = r % 2 === 0 ? PLINKO_ROWS + 1 : PLINKO_ROWS;
          const mid = (count - 1) / 2;
          return (
            <div key={r} className="absolute inset-x-0" style={{ top: r * (PEG_GAP * 1.05) + 16 }}>
              {Array.from({ length: count }).map((_, c) => (
                <span
                  key={c}
                  className="absolute h-2 w-2 rounded-full bg-ink-500"
                  style={{ left: `calc(50% + ${(c - mid) * PEG_GAP - 4}px)` }}
                />
              ))}
            </div>
          );
        })}

        {/* yuvalar */}
        <div className="absolute inset-x-0 bottom-0 flex" style={{ height: 60 }}>
          {PLINKO_MULTS.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-1 items-center justify-center border-x border-ink-950 font-display text-[11px] font-black",
                m >= 1.2 ? "text-emerald-400" : "text-lose"
              )}
              style={{ background: m >= 1.2 ? "rgba(47,214,115,0.08)" : "rgba(224,69,60,0.08)" }}
            >
              {m}x
            </div>
          ))}
        </div>

        {/* top */}
        {busy && path && (
          <motion.span
            key={run}
            initial={{ x: xs[0], y: ys[0] }}
            animate={{ x: xs, y: ys }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
            className="absolute left-1/2 top-0 z-10 -ml-[7px] h-3.5 w-3.5 rounded-full bg-gradient-to-b from-brand-300 to-brand-600 shadow-[0_0_12px_2px_rgba(249,142,29,0.8)]"
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-ink-800 px-4 py-3">
        <div className="text-xs text-white/45">
          Sonuç:{" "}
          {result === null ? (
            <span className="text-white/25">—</span>
          ) : (
            <span className={cn("font-display font-black", result >= 1.2 ? "text-emerald-400" : "text-lose")}>
              {result}x{" "}
              {result >= 1.2
                ? `→ +${money(Math.round(bet * result) - bet)}`
                : `→ ${money(Math.round(bet * result))}`}
            </span>
          )}
        </div>
        <button
          onClick={drop}
          disabled={busy}
          className={cn(
            "flex h-11 items-center gap-2 rounded-xl px-6 font-display text-sm font-black uppercase tracking-widest transition",
            busy
              ? "cursor-not-allowed bg-ink-600 text-white/30"
              : "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
          )}
        >
          <CircleDot className="h-4 w-4" /> Topu Bırak
        </button>
      </div>
    </div>
  );
}

/* ==================== WHEEL (ÇARK) ==================== */

/* 6 kazanç + 6 kayıp; EV = 11.45 / 12 ≈ 0.954 (kasa lehine, adil oynanış) */
const WHEEL_SEGS = [
  { m: 0, c: "#e0453c" },
  { m: 0.5, c: "#35405a" },
  { m: 0, c: "#e0453c" },
  { m: 0.75, c: "#35405a" },
  { m: 0, c: "#e0453c" },
  { m: 1.2, c: "#2a3142" },
  { m: 0, c: "#e0453c" },
  { m: 1.5, c: "#2fd673" },
  { m: 0, c: "#e0453c" },
  { m: 2.5, c: "#f0b13f" },
  { m: 0, c: "#e0453c" },
  { m: 5, c: "#f0b13f" },
];

function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = [cx + r * Math.sin((a0 * Math.PI) / 180), cy - r * Math.cos((a0 * Math.PI) / 180)];
  const p1 = [cx + r * Math.sin((a1 * Math.PI) / 180), cy - r * Math.cos((a1 * Math.PI) / 180)];
  return `M ${cx} ${cy} L ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${r} ${r} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Z`;
}

export function Wheel({ bet, onStart, onEnd }: GameProps) {
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const size = 300;
  const r = size / 2 - 8;
  const cx = size / 2;

  function spin() {
    if (spinning) return;
    if (!onStart()) return;
    setSpinning(true);
    setResult(null);
    spinWhoosh();
    const idx = randInt(0, WHEEL_SEGS.length - 1);
    const mid = idx * (360 / WHEEL_SEGS.length) + 360 / WHEEL_SEGS.length / 2;
    setRot((prev) => {
      const current = ((prev % 360) + 360) % 360;
      const need = (360 - mid) % 360;
      const delta = (((need - current) % 360) + 360) % 360;
      return prev + delta + 360 * 5;
    });
    const mult = WHEEL_SEGS[idx].m;

    window.setTimeout(() => {
      setSpinning(false);
      setResult(mult);
      onEnd(Math.round(bet * mult));
      if (mult > 1) goldWin();
      else loseSound();
    }, 4300);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
      {result !== null && result > 1 && <Confetti colors={["#f0b13f", "#f98e1d", "#ffffff"]} />}

      <div className="relative mx-auto" style={{ width: size, height: size }}>
        {/* ibre */}
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2"
          style={{ top: -4, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "14px solid #f98e1d" }}
        />
        <motion.div
          animate={{ rotate: rot }}
          transition={{ duration: 4.2, ease: [0.12, 0.72, 0.06, 1] }}
          className="absolute inset-0"
        >
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
            <circle cx={cx} cy={cx} r={r + 6} fill="rgba(7,9,15,0.9)" />
            {WHEEL_SEGS.map((s, i) => {
              const a0 = i * (360 / WHEEL_SEGS.length);
              const a1 = (i + 1) * (360 / WHEEL_SEGS.length);
              const mid = (a0 + a1) / 2;
              return (
                <g key={i}>
                  <path d={wedgePath(cx, cx, r, a0, a1)} fill={s.c} stroke="#07090f" strokeWidth={1.5} />
                  <text
                    x={cx + r * 0.66 * Math.sin((mid * Math.PI) / 180)}
                    y={cx - r * 0.66 * Math.cos((mid * Math.PI) / 180) + 5}
                    textAnchor="middle"
                    fontSize={s.m >= 2.5 ? 15 : 13}
                    fontWeight={900}
                    fill={s.m >= 2.5 ? "#141414" : "#ffffff"}
                    fontFamily="Rajdhani, sans-serif"
                  >
                    {s.m}x
                  </text>
                </g>
              );
            })}
            <circle cx={cx} cy={cx} r={26} fill="#07090f" stroke="#f98e1d" strokeWidth={2} />
          </svg>
        </motion.div>
      </div>

      <div className="mx-auto mt-3 flex max-w-md items-center justify-between rounded-xl border border-line bg-ink-800 px-4 py-3">
        <div className="text-xs text-white/45">
          Sonuç:{" "}
          {result === null ? (
            <span className="text-white/25">—</span>
          ) : (
            <span className={cn("font-display font-black", result > 1 ? "text-emerald-400" : result === 1 ? "text-white/70" : "text-lose")}>
              {result}x
              {result > 1
                ? ` → +${money(Math.round(bet * result) - bet)}`
                : result === 1
                  ? " → Bahis iade"
                  : " — Kaybettin"}
            </span>
          )}
        </div>
        <button
          onClick={spin}
          disabled={spinning}
          className={cn(
            "flex h-11 items-center gap-2 rounded-xl px-6 font-display text-sm font-black uppercase tracking-widest transition",
            spinning
              ? "cursor-not-allowed bg-ink-600 text-white/30"
              : "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
          )}
        >
          <Disc3 className={cn("h-4 w-4", spinning && "animate-spin")} /> Çevir
        </button>
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[9px] font-bold text-white/30">
        {WHEEL_SEGS.map((s, i) => (
          <span key={i} className="rounded border border-line bg-ink-800 px-1.5 py-0.5">
            {s.m}x
          </span>
        ))}
      </div>
    </div>
  );
}

/* ==================== LIMBO ==================== */

export function Limbo({ bet, onStart, onEnd }: GameProps) {
  const [chance, setChance] = useState(50);
  const [busy, setBusy] = useState(false);
  const [crash, setCrash] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const mult = Math.round((100 / chance) * 0.97 * 100) / 100;

  function play() {
    if (busy) return;
    if (!onStart()) return;
    setBusy(true);
    setWon(false);
    setCrash(null);
    spinWhoosh();
    const roll = Math.random() * 100;
    const win = roll <= chance;
    const crashAt = Math.round((100 / Math.max(0.1, roll)) * 0.97 * 100) / 100;
    const payout = win ? Math.round(bet * mult) : 0;
    window.setTimeout(() => {
      setBusy(false);
      setCrash(crashAt);
      setWon(win);
      onEnd(payout);
      if (win) coinDing();
      else loseSound();
    }, 1400);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
      <div className="mx-auto max-w-lg text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
          Kazanma şansını seç — çarpan buna göre belirlenir
        </div>

        <div className="mt-4 flex items-end justify-center gap-2">
          <span className="font-display text-6xl font-black leading-none text-white">
            {mult.toFixed(2)}
            <span className="text-2xl text-brand-400">x</span>
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-line bg-ink-800 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-white/45">%{chance.toFixed(1)} şans</span>
            <span className="text-emerald-400">{money(Math.round(bet * mult))}</span>
          </div>
          <input
            type="range"
            min={1}
            max={95}
            step={0.5}
            value={chance}
            onChange={(e) => {
              setChance(Number(e.target.value));
              click();
            }}
            className="mt-3 w-full accent-brand-500"
          />
        </div>

        <AnimatePresence mode="wait">
          {crash !== null ? (
            <motion.div
              key="r"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "mt-4 flex items-center justify-between rounded-xl border px-4 py-3",
                won ? "border-emerald-500/40 bg-emerald-500/10" : "border-lose/40 bg-lose/10"
              )}
            >
              <div className="text-xs font-bold text-white/60">
                Çarpan {crash.toFixed(2)}x'te durdu
              </div>
              <div className={cn("font-display text-base font-black", won ? "text-emerald-400" : "text-lose")}>
                {won ? `+${money(Math.round(bet * mult) - bet)}` : `-${money(bet)}`}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          onClick={play}
          disabled={busy}
          className={cn(
            "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-base font-black uppercase tracking-widest transition",
            busy
              ? "cursor-not-allowed bg-ink-600 text-white/30"
              : "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
          )}
        >
          <Zap className="h-5 w-5" />
          {busy ? "Yükseliyor…" : `${money(bet)} Oyna`}
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/30">
          <Gauge className="h-3.5 w-3.5" />
          %{chance} altı gelirse {mult}x kazanırsın
        </div>
      </div>
    </div>
  );
}
