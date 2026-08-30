import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bomb,
  CircleDot,
  Coins,
  Dice5,
  Dices,
  Disc3,
  Flame,
  Gauge,
  History,
  Rocket,
  ShieldCheck,
  Spade,
  TrendingUp,
  Users,
} from "lucide-react";
import { mcHead, money } from "../config";
import { COMMUNITY_USERS } from "../data/fakers";
import { click, coinDing, goldWin, loseSound, reelStart, tick, spinWhoosh } from "../lib/audio";
import { clamp, pick, randInt, uid } from "../lib/rng";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";
import { Roulette, Mines, DiceGame } from "./MoreGames";
import { Blackjack, Limbo, Plinko, Wheel } from "./ExtraGames";

type Game = "coinflip" | "crash" | "roulette" | "mines" | "dice" | "blackjack" | "plinko" | "wheel" | "limbo";

const BETS = [1000, 5000, 10000, 25000, 50000];
const HOUSE_CUT = 0.05;

/* ================= COINFLIP ================= */

type Side = "ct" | "t";
const SIDES: Record<Side, { label: string; color: string; emoji: string }> = {
  ct: { label: "CT", color: "#5e98d9", emoji: "🛡️" },
  t: { label: "T", color: "#e0a03c", emoji: "🔥" },
};

interface GameProps {
  bet: number;
  /** bahsi düşer, yetmezse false */
  onStart: () => boolean;
  /** tur bitti — kazanılan brüt tutar (0 = kayıp) */
  onEnd: (payout: number) => void;
}

function Coinflip({ bet, onStart, onEnd }: GameProps) {
  const { balance, userName } = useGame();
  const [side, setSide] = useState<Side>("ct");
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<Side | null>(null);
  const [spin, setSpin] = useState(0);
  const [opponent, setOpponent] = useState(() => pick(COMMUNITY_USERS));
  const [log, setLog] = useState<{ id: string; user: string; won: boolean; amount: number }[]>([]);

  const pot = Math.round(bet * 2 * (1 - HOUSE_CUT));
  const canPlay = balance >= bet && !flipping;

  function flip() {
    if (!canPlay) return;
    if (!onStart()) return;
    setFlipping(true);
    setResult(null);
    spinWhoosh();
    const win = Math.random() < 0.5;
    const landed: Side = win ? side : side === "ct" ? "t" : "ct";
    const turns = 6 + Math.floor(Math.random() * 3);
    /* Son tur mod 360 = landed yüzü olacak şekilde hesapla (üst üste aynı yüz gelince de doğru) */
    setSpin((s) => {
      const cur = ((s % 360) + 360) % 360;
      const want = landed === "ct" ? 0 : 180;
      const delta = (((want - cur) % 360) + 360) % 360;
      return s + delta + turns * 360;
    });

    window.setTimeout(() => {
      setResult(landed);
      setFlipping(false);
      onEnd(win ? pot : 0);
      if (win) goldWin();
      else loseSound();
      setLog((prev) =>
        [{ id: uid(), user: userName, won: win, amount: win ? pot - bet : -bet }, ...prev].slice(0, 6)
      );
      setOpponent(pick(COMMUNITY_USERS));
    }, 3000);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-6">
        {result && result === side && <Confetti colors={["#f98e1d", "#2fd673", "#ffffff"]} />}

        {/* rakipler */}
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {[
            { name: userName, s: side, me: true },
            { name: opponent, s: side === "ct" ? ("t" as Side) : ("ct" as Side), me: false },
          ].map((p) => (
            <div
              key={p.name + String(p.me)}
              className={cn("rounded-xl border p-3 text-center", p.me ? "order-1" : "order-3")}
              style={{
                borderColor: `${SIDES[p.s].color}55`,
                background: `linear-gradient(180deg, ${SIDES[p.s].color}12, transparent)`,
              }}
            >
              <img
                src={mcHead(p.name, 56)}
                alt=""
                className="mx-auto h-9 w-9 rounded"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="mt-1.5 truncate font-display text-sm font-bold text-white">
                {p.me ? "Sen" : p.name}
              </div>
              <div className="text-[11px] font-bold" style={{ color: SIDES[p.s].color }}>
                {SIDES[p.s].emoji} {SIDES[p.s].label}
              </div>
            </div>
          ))}
          <div className="order-2 font-display text-lg font-black text-white/25">VS</div>
        </div>

        {/* madeni para */}
        <div className="flex flex-col items-center">
          <div className="relative h-36 w-36" style={{ perspective: 900 }}>
            <motion.div
              animate={{ rotateY: spin }}
              transition={{ duration: 3, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative h-full w-full"
              style={{ transformStyle: "preserve-3d" }}
            >
              {(["ct", "t"] as Side[]).map((s, i) => (
                <div
                  key={s}
                  className="absolute inset-0 flex items-center justify-center rounded-full border-4 text-4xl shadow-2xl"
                  style={{
                    borderColor: SIDES[s].color,
                    background: `radial-gradient(circle at 35% 30%, ${SIDES[s].color}55, #10141f 70%)`,
                    backfaceVisibility: "hidden",
                    transform: i === 1 ? "rotateY(180deg)" : undefined,
                  }}
                >
                  {SIDES[s].emoji}
                </div>
              ))}
            </motion.div>
          </div>

          <div className="mt-4 h-7">
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "font-display text-xl font-black uppercase tracking-widest",
                    result === side ? "text-win" : "text-lose"
                  )}
                >
                  {result === side ? `Kazandın +${money(pot - bet)}` : `Kaybettin −${money(bet)}`}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* taraf seçimi */}
          <div className="mt-3 grid w-full max-w-sm grid-cols-2 gap-2">
            {(["ct", "t"] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSide(s);
                  click();
                }}
                disabled={flipping}
                className={cn(
                  "rounded-xl border py-3 font-display text-base font-black uppercase tracking-wider transition disabled:opacity-50",
                  side === s ? "text-ink-950" : "border-line bg-ink-800 text-white/50 hover:text-white"
                )}
                style={
                  side === s
                    ? { background: SIDES[s].color, borderColor: SIDES[s].color }
                    : undefined
                }
              >
                {SIDES[s].emoji} {SIDES[s].label}
              </button>
            ))}
          </div>

          <button
            onClick={flip}
            disabled={!canPlay}
            className={cn(
              "mt-3 h-13 w-full max-w-sm rounded-xl font-display text-lg font-black uppercase tracking-widest transition",
              canPlay
                ? "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
                : "cursor-not-allowed bg-ink-600 text-white/30"
            )}
            style={{ height: 52 }}
          >
            {flipping ? "Havada…" : `${money(bet)} Yatır — Kazanç ${money(pot)}`}
          </button>
        </div>
      </div>

      {/* geçmiş */}
      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-brand-400" />
          <span className="font-display text-sm font-bold uppercase tracking-widest text-white/70">
            Son Atışlarım
          </span>
        </div>
        {log.length === 0 ? (
          <p className="py-8 text-center text-xs text-white/30">Henüz oynamadın</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {log.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs",
                  l.won ? "bg-emerald-500/10" : "bg-lose/10"
                )}
              >
                <span className="font-semibold text-white/70">{l.won ? "Kazandı" : "Kaybetti"}</span>
                <span className={cn("font-display font-black", l.won ? "text-emerald-400" : "text-lose")}>
                  {l.won ? "+" : ""}
                  {money(l.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-lg border border-line bg-ink-800 p-2.5 text-[10px] leading-relaxed text-white/35">
          %50 şans, kazanan potun %{100 - HOUSE_CUT * 100}'ini alır. Kalan %{HOUSE_CUT * 100} kasa payıdır.
        </div>
      </div>
    </div>
  );
}

/* ================= CRASH ================= */

interface CrashPlayer {
  id: string;
  name: string;
  cashAt: number;
  out: boolean;
  bet: number;
}

function Crash({ bet, onStart, onEnd }: GameProps) {
  const { balance, userName, pushToast } = useGame();
  const [phase, setPhase] = useState<"idle" | "running" | "crashed">("idle");
  const [mult, setMult] = useState(1);
  const [inRound, setInRound] = useState(false);
  const [cashedAt, setCashedAt] = useState<number | null>(null);
  const [autoCash, setAutoCash] = useState("2.00");
  const [history, setHistory] = useState<number[]>(() =>
    Array.from({ length: 12 }, () => Math.round((1 + Math.random() * 4) * 100) / 100)
  );
  const [players, setPlayers] = useState<CrashPlayer[]>([]);
  const raf = useRef(0);
  const startRef = useRef(0);
  const lastTick = useRef(0);
  const stateRef = useRef({ inRound: false, cashed: false, crashAt: 0 });

  const canPlay = balance >= bet && phase === "idle";
  const autoNum = clamp(Number(autoCash.replace(",", ".")) || 0, 1.01, 100);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function genCrash(): number {
    const r = Math.random();
    if (r < 0.03) return 1; // anında patlama
    return Math.max(1.01, Math.floor((99 / (1 - r)) ) / 100);
  }

  function startRound(joined: boolean) {
    const target = genCrash();
    setMult(1);
    setCashedAt(null);
    setPhase("running");
    stateRef.current = { inRound: joined, cashed: false, crashAt: target };
    reelStart();

    /* sahte oyuncular */
    setPlayers(
      Array.from({ length: randInt(4, 7) }, () => ({
        id: uid(),
        name: pick(COMMUNITY_USERS),
        cashAt: Math.round((1.15 + Math.random() * 3.4) * 100) / 100,
        out: false,
        bet: pick(BETS),
      }))
    );

    startRef.current = performance.now();
    lastTick.current = 0;

    const loop = (t: number) => {
      const el = (t - startRef.current) / 1000;
      const m = Math.pow(Math.E, 0.19 * el);
      const cur = Math.round(m * 100) / 100;

      if (cur >= stateRef.current.crashAt) {
        setMult(stateRef.current.crashAt);
        setPhase("crashed");
        setHistory((h) => [stateRef.current.crashAt, ...h].slice(0, 14));
        if (stateRef.current.inRound && !stateRef.current.cashed) {
          onEnd(0);
          loseSound();
        }
        setInRound(false);
        window.setTimeout(() => setPhase("idle"), 2600);
        return;
      }

      setMult(cur);
      /* botları çıkar */
      setPlayers((prev) =>
        prev.map((p) => (!p.out && cur >= p.cashAt ? { ...p, out: true } : p))
      );
      /* otomatik çekme */
      if (stateRef.current.inRound && !stateRef.current.cashed && autoNum > 1 && cur >= autoNum) {
        doCash(cur);
      }
      if (Math.floor(cur * 10) !== lastTick.current) {
        lastTick.current = Math.floor(cur * 10);
        tick(Math.min(0.95, (cur - 1) / 8));
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }

  function doCash(at: number) {
    if (!stateRef.current.inRound || stateRef.current.cashed) return;
    stateRef.current.cashed = true;
    setCashedAt(at);
    setInRound(false);
    const payout = Math.round(bet * at);
    onEnd(payout);
    coinDing();
    pushToast({ kind: "money", title: `${at.toFixed(2)}x ile çektin`, sub: `+${money(payout - bet)}` });
  }

  const curve = useMemo(() => {
    const pts: string[] = [];
    const max = Math.max(2, mult);
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      const m = 1 + (max - 1) * Math.pow(p, 1.7);
      const x = 10 + p * 280;
      const y = 150 - ((m - 1) / Math.max(0.6, max - 1)) * 120;
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  }, [mult]);

  const color = phase === "crashed" ? "#ef4444" : cashedAt ? "#2fd673" : "#f98e1d";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
        {/* geçmiş */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {history.map((h, i) => (
            <span
              key={i}
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                color: h >= 2 ? "#2fd673" : h >= 1.4 ? "#f98e1d" : "#ef4444",
                background: h >= 2 ? "#2fd67318" : h >= 1.4 ? "#f98e1d18" : "#ef444418",
              }}
            >
              {h.toFixed(2)}x
            </span>
          ))}
        </div>

        {/* grafik */}
        <div className="relative h-48 overflow-hidden rounded-xl border border-line bg-ink-950">
          <svg viewBox="0 0 300 160" className="h-full w-full" preserveAspectRatio="none">
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={0} y1={30 + i * 35} x2={300} y2={30 + i * 35} stroke="#1c2333" strokeWidth={1} />
            ))}
            <polyline
              points={curve}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              key={phase}
              animate={phase === "crashed" ? { scale: [1, 1.15, 1] } : {}}
              className="font-display text-6xl font-black tabular-nums drop-shadow-lg"
              style={{ color }}
            >
              {mult.toFixed(2)}x
            </motion.div>
            {phase === "crashed" && (
              <div className="mt-1 font-display text-lg font-black uppercase tracking-widest text-lose">
                Patladı!
              </div>
            )}
            {cashedAt && phase === "running" && (
              <div className="mt-1 font-display text-sm font-bold text-emerald-400">
                {cashedAt.toFixed(2)}x ile çıktın
              </div>
            )}
          </div>
        </div>

        {/* kontroller */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <button
            onClick={() => {
              if (phase === "running" && inRound) {
                doCash(mult);
              } else if (canPlay) {
                if (!onStart()) return;
                setInRound(true);
                startRound(true);
              }
            }}
            disabled={phase === "crashed" || (phase === "idle" && !canPlay) || (phase === "running" && !inRound)}
            className={cn(
              "h-13 rounded-xl font-display text-lg font-black uppercase tracking-widest transition",
              phase === "running" && inRound
                ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                : phase === "idle" && canPlay
                  ? "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
                  : "cursor-not-allowed bg-ink-600 text-white/30"
            )}
            style={{ height: 52 }}
          >
            {phase === "running" && inRound
              ? `Çek — ${money(Math.round(bet * mult))}`
              : phase === "running"
                ? "Tur devam ediyor"
                : phase === "crashed"
                  ? "Yeni tur bekleniyor…"
                  : `${money(bet)} ile Bin`}
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-800 px-3">
            <span className="text-[10px] font-bold uppercase text-white/35">Oto</span>
            <input
              value={autoCash}
              onChange={(e) => setAutoCash(e.target.value.replace(/[^\d.,]/g, ""))}
              className="h-11 w-16 bg-transparent text-center font-display text-base font-bold text-white focus:outline-none"
            />
            <span className="text-sm font-bold text-brand-400">x</span>
          </div>
        </div>
      </div>

      {/* tur oyuncuları */}
      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-400" />
          <span className="font-display text-sm font-bold uppercase tracking-widest text-white/70">
            Turdakiler
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          {inRound && (
            <div className="flex items-center gap-2 rounded-lg border border-brand-500/40 bg-brand-500/10 px-2.5 py-2">
              <img src={mcHead(userName, 40)} alt="" className="h-5 w-5 rounded" style={{ imageRendering: "pixelated" }} />
              <span className="truncate text-xs font-bold text-brand-200">Sen</span>
              <span className="ml-auto font-display text-xs font-bold text-white/70">{money(bet)}</span>
            </div>
          )}
          {players.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 transition",
                p.out ? "bg-emerald-500/10" : "bg-ink-800"
              )}
            >
              <img src={mcHead(p.name, 40)} alt="" className="h-5 w-5 rounded" style={{ imageRendering: "pixelated" }} />
              <span className="truncate text-xs text-white/70">{p.name}</span>
              <span
                className={cn(
                  "ml-auto font-display text-xs font-bold",
                  p.out ? "text-emerald-400" : "text-white/35"
                )}
              >
                {p.out ? `${p.cashAt.toFixed(2)}x` : money(p.bet)}
              </span>
            </div>
          ))}
          {players.length === 0 && !inRound && (
            <p className="py-6 text-center text-xs text-white/30">Tur bekleniyor…</p>
          )}
        </div>
        <div className="mt-4 rounded-lg border border-line bg-ink-800 p-2.5 text-[10px] leading-relaxed text-white/35">
          Roket patlamadan önce çek. Oto-çekme değeri girersen o çarpanda otomatik çıkarsın.
        </div>
      </div>
    </div>
  );
}

/* ================= ANA GÖRÜNÜM ================= */

export function GamesView() {
  const { balance, trySpend, credit, trackWager, trackMission, pushToast } = useGame();
  const [game, setGame] = useState<Game>("coinflip");
  const [bet, setBet] = useState(BETS[1]);

  /** tur başlarken bahsi düş */
  function onStart(): boolean {
    if (!trySpend(bet)) {
      pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: `Bu tur için ${money(bet)} gerekli` });
      return false;
    }
    trackWager(bet);
    trackMission("games");
    return true;
  }

  /** tur bitti — brüt kazanç yatır (0 ise kayıp) */
  function onEnd(payout: number) {
    if (payout > 0) credit(payout);
  }

  const games: { key: Game; label: string; Icon: typeof Dices; desc: string }[] = [
    { key: "coinflip", label: "Yazı Tura", Icon: Dices, desc: "1v1 %50 şans" },
    { key: "crash", label: "Crash", Icon: Rocket, desc: "Patlamadan çek" },
    { key: "roulette", label: "Rulet", Icon: CircleDot, desc: "Kırmızı · Siyah · Yeşil" },
    { key: "mines", label: "Mayınlar", Icon: Bomb, desc: "Elmas topla, çekil" },
    { key: "dice", label: "Zar", Icon: Dice5, desc: "Alt / üst tahmini" },
    { key: "blackjack", label: "Blackjack", Icon: Spade, desc: "21'e ulaş, 2.5x" },
    { key: "plinko", label: "Plinko", Icon: CircleDot, desc: "Top düş, çarpan kap" },
    { key: "wheel", label: "Çark", Icon: Disc3, desc: "Şans çarkı · 10x" },
    { key: "limbo", label: "Limbo", Icon: Gauge, desc: "Şansı seç, çarpanı al" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rar-classified/40 bg-rar-classified/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rar-classified">
            <Flame className="h-3.5 w-3.5" /> Şans Oyunları
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Kasa <span className="text-brand-400">Oyunları</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-3 py-2 text-[11px] font-semibold text-white/45">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Provably Fair
        </div>
      </div>

      {/* oyun seçimi */}
      <div className="mb-4 flex flex-wrap gap-2">
        {games.map(({ key, label, Icon, desc }) => (
          <button
            key={key}
            onClick={() => {
              setGame(key);
              click();
            }}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition",
              game === key
                ? "border-brand-500/60 bg-brand-500/10"
                : "border-line bg-ink-800 hover:border-ink-500"
            )}
          >
            <Icon className={cn("h-5 w-5", game === key ? "text-brand-400" : "text-white/40")} />
            <div>
              <div
                className={cn(
                  "font-display text-sm font-bold uppercase tracking-wider",
                  game === key ? "text-brand-300" : "text-white/60"
                )}
              >
                {label}
              </div>
              <div className="text-[10px] text-white/35">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* bahis seçimi */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-ink-900/70 p-3">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/45">
          <Coins className="h-4 w-4 text-brand-400" /> Bahis
        </span>
        {BETS.map((b) => (
          <button
            key={b}
            onClick={() => {
              setBet(b);
              click();
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 font-display text-sm font-bold transition",
              bet === b
                ? "border-brand-500 bg-brand-500/10 text-brand-300"
                : "border-line bg-ink-800 text-white/50 hover:text-white"
            )}
          >
            {money(b)}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-white/40">Bakiye</span>
          <span className="font-display font-bold text-emerald-400">{money(balance)}</span>
        </span>
      </div>

      {game === "coinflip" && <Coinflip bet={bet} onStart={onStart} onEnd={onEnd} />}
      {game === "crash" && <Crash bet={bet} onStart={onStart} onEnd={onEnd} />}
      {game === "roulette" && <Roulette bet={bet} onStart={onStart} onEnd={onEnd} />}
      {game === "mines" && <Mines bet={bet} onStart={onStart} onEnd={onEnd} />}
      {game === "dice" && <DiceGame bet={bet} onStart={onStart} onEnd={onEnd} />}
      {game === "blackjack" && <Blackjack bet={bet} onStart={onStart} onEnd={onEnd} />}
      {game === "plinko" && <Plinko bet={bet} onStart={onStart} onEnd={onEnd} />}
      {game === "wheel" && <Wheel bet={bet} onStart={onStart} onEnd={onEnd} />}
      {game === "limbo" && <Limbo bet={bet} onStart={onStart} onEnd={onEnd} />}
    </div>
  );
}
