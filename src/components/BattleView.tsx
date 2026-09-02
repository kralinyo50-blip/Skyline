import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Coins,
  Loader2,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { CASES, CASE_MAP, casePrice, rollCase } from "../data/cases";
import { COMMUNITY_USERS, BATTLE_VERBS } from "../data/fakers";
import { RARITY, fmtMoney, type Skin } from "../data/skins";
import { applyVipCaseDisc } from "../config";
import { goldWin, loseSound, reelStart, tick, click } from "../lib/audio";
import { pick, randInt } from "../lib/rng";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";
import { SkinImg } from "./SkinCard";

type Phase = "config" | "fighting" | "done";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function BattleSlot({ skin, rolling, won }: { skin: Skin | null; rolling: boolean; won: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-32 flex-col items-center justify-center rounded-xl border p-2 transition-all",
        skin ? "border-line bg-ink-800" : "border-dashed border-line/70 bg-ink-900/50"
      )}
      style={
        skin
          ? {
              backgroundImage: `radial-gradient(110% 80% at 50% 0%, ${RARITY[skin.rarity].color}16, transparent 60%)`,
              boxShadow: won ? `0 0 18px -4px ${RARITY[skin.rarity].color}66` : "none",
            }
          : undefined
      }
    >
      {rolling ? (
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      ) : skin ? (
        <>
          <SkinImg skin={skin} className="h-16 w-full" />
          <div className="mt-1 w-full truncate text-center text-[10px] font-medium text-white/60">
            {skin.st && <span className="text-[#cf6a32]">ST™ </span>}
            {skin.weapon} | {skin.name}
          </div>
          <div className={cn("font-display text-sm font-black", won ? "text-emerald-400" : "text-white/50")}>
            {fmtMoney(skin.price)}
          </div>
        </>
      ) : (
        <Swords className="h-5 w-5 text-white/15" />
      )}
    </div>
  );
}

export function BattleView() {
  const { balance, trySpend, addItem, pushToast, userName, level, trackWager, trackMission, bumpNonce, nonce, caseSale, priceSettings, vipLevel } =
    useGame();

  const [caseId, setCaseId] = useState(CASES[3].id);
  const [rounds, setRounds] = useState(2);
  const [bot, setBot] = useState(() => ({ name: pick(COMMUNITY_USERS), level: randInt(4, 38) }));
  const [phase, setPhase] = useState<Phase>("config");
  const [playerItems, setPlayerItems] = useState<Skin[]>([]);
  const [botItems, setBotItems] = useState<Skin[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<"player" | "bot" | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const caseDef = CASE_MAP[caseId];
  /* ekonomik dalga + kasa indirimi + VIP indirimi — normal kasa fiyatıyla aynı */
  const caseCost = applyVipCaseDisc(casePrice(caseDef, caseSale, priceSettings), vipLevel);
  const buyIn = Math.round(caseCost * rounds * 100) / 100;
  const pot = Math.round(buyIn * 2 * 100) / 100;
  const afford = balance >= buyIn;

  const pTotal = playerItems.reduce((a, s) => a + s.price, 0);
  const bTotal = botItems.reduce((a, s) => a + s.price, 0);
  const share = pTotal + bTotal > 0 ? (pTotal / (pTotal + bTotal)) * 100 : 50;

  async function startBattle() {
    if (!trySpend(buyIn)) {
      pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: "Daha ucuz bir kasa seç veya bakiye yükle" });
      return;
    }
    click();
    bumpNonce();
    trackWager(buyIn);
    setPhase("fighting");
    setWinner(null);
    setPlayerItems([]);
    setBotItems([]);
    setCurrentRound(0);

    const ps: Skin[] = [];
    const bs: Skin[] = [];

    for (let r = 0; r < rounds; r++) {
      setCurrentRound(r);
      setRolling(true);
      reelStart();
      await sleep(1150 + Math.random() * 450);
      if (!alive.current) return;
      const pi = rollCase(caseDef);
      const bi = rollCase(caseDef);
      ps.push(pi);
      bs.push(bi);
      setPlayerItems([...ps]);
      setBotItems([...bs]);
      tick(0.9);
      setRolling(false);
      await sleep(650);
      if (!alive.current) return;
    }

    const pt = ps.reduce((a, s) => a + s.price, 0);
    const bt = bs.reduce((a, s) => a + s.price, 0);
    const w = pt > bt ? "player" : pt < bt ? "bot" : Math.random() < 0.5 ? "player" : "bot";
    setWinner(w);

    if (w === "player") {
      [...ps, ...bs].forEach((s) => addItem(s.id));
      trackMission("battles");
      goldWin();
      pushToast({
        kind: "win",
        title: "Savaşı kazandın!",
        sub: `${ps.length + bs.length} eşya (${fmtMoney(pt + bt)}) envanterine eklendi`,
      });
    } else {
      loseSound();
      pushToast({
        kind: "lose",
        title: "Savaşı kaybettin",
        sub: `${bot.name} tüm eşyaları aldı`,
      });
    }
    await sleep(400);
    if (alive.current) setPhase("done");
  }

  function reset() {
    setPhase("config");
    setWinner(null);
    setPlayerItems([]);
    setBotItems([]);
    setBot({ name: pick(COMMUNITY_USERS.filter((u) => u !== bot.name)), level: randInt(4, 38) });
  }

  const recentBattles = useMemo(
    () =>
      Array.from({ length: 7 }, () => {
        const a = pick(COMMUNITY_USERS);
        let b = pick(COMMUNITY_USERS);
        while (b === a) b = pick(COMMUNITY_USERS);
        const c = pick(CASES);
        const r = pick([1, 2, 3]);
        return {
          a,
          b,
          verb: pick(BATTLE_VERBS),
          winner: Math.random() < 0.5 ? a : b,
          caseName: c.name,
          rounds: r,
          pot: Math.round(casePrice(c, caseSale, priceSettings) * r * 2 * 100) / 100,
        };
      }),
    [caseSale, priceSettings]
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-lose/40 bg-lose/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-lose">
            <Swords className="h-3.5 w-3.5" /> Kasa Savaşı
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            1v1 <span className="text-brand-400">Düello</span>
          </h1>
          <p className="mt-1 max-w-md text-sm text-white/50">
            Rakiple aynı kasaları açarsınız — toplam değeri yüksek olan
            <span className="font-semibold text-white/70"> HER ŞEYİ</span> kapar.
          </p>
        </div>
        <div className="hidden items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 py-2 text-[11px] font-semibold text-white/45 sm:flex">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Tur #{nonce.toLocaleString("tr-TR")}
        </div>
      </div>

      {/* ---------------- AYAR EKRANI ---------------- */}
      {phase === "config" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-line bg-ink-900/70 p-5">
            <div className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-white/60">
              Kasa Seç
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
              {CASES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCaseId(c.id);
                    click();
                  }}
                  className={cn(
                    "group relative flex flex-col items-center rounded-xl border p-2.5 transition",
                    caseId === c.id
                      ? "border-brand-500 bg-brand-500/10 shadow-[0_0_0_1px_#f98e1d]"
                      : "border-line bg-ink-800 hover:border-ink-500"
                  )}
                >
                  <img src={c.img} alt="" className="h-14 w-14 object-contain transition-transform group-hover:scale-110" />
                  <span className="mt-1.5 w-full truncate text-center text-[9px] font-semibold text-white/70">
                    {c.name}
                  </span>
                  <span className="font-display text-[10px] font-bold text-emerald-400">
                    {fmtMoney(applyVipCaseDisc(casePrice(c, caseSale, priceSettings), vipLevel))}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 mb-3 font-display text-sm font-bold uppercase tracking-widest text-white/60">
              El Sayısı
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRounds(r);
                    click();
                  }}
                  className={cn(
                    "flex-1 rounded-xl border py-3 font-display text-lg font-black transition",
                    rounds === r
                      ? "border-brand-500 bg-brand-500/10 text-brand-300 shadow-[0_0_0_1px_#f98e1d]"
                      : "border-line bg-ink-800 text-white/40 hover:text-white"
                  )}
                >
                  x{r}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-ink-800 p-3">
              <img src={caseDef.img} alt="" className="h-16 w-16 object-contain" />
              <div className="flex-1">
                <div className="font-display text-base font-bold">{caseDef.name} × {rounds}</div>
                <div className="text-xs text-white/40">Kazanan {rounds * 2} eşyanın tamamını alır</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">Buy-in</div>
                <div className="font-display text-xl font-black text-emerald-400">{fmtMoney(buyIn)}</div>
              </div>
            </div>

            <button
              onClick={startBattle}
              disabled={!afford}
              className={cn(
                "mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-xl font-display text-xl font-black uppercase tracking-widest transition",
                afford
                  ? "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110 hover:shadow-[0_12px_40px_-8px_rgba(249,142,29,0.8)]"
                  : "cursor-not-allowed bg-ink-600 text-white/30"
              )}
            >
              {afford ? (
                <>
                  <Swords className="h-6 w-6" strokeWidth={2.5} /> Savaş Başlasın
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5" /> Yetersiz Bakiye
                </>
              )}
            </button>
          </div>

          {/* rakip + geçmiş */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-sm font-bold uppercase tracking-widest text-white/60">Rakibin</span>
                <button
                  onClick={() => {
                    setBot({ name: pick(COMMUNITY_USERS.filter((u) => u !== bot.name)), level: randInt(4, 38) });
                    click();
                  }}
                  className="flex items-center gap-1 rounded-md bg-ink-700 px-2 py-1 text-[10px] font-semibold text-white/50 hover:text-white"
                >
                  <RefreshCcw className="h-3 w-3" /> Değiştir
                </button>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-lose/30 bg-lose/5 p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-lose to-rar-restricted font-display text-base font-bold text-white">
                  {bot.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-display text-base font-bold text-white">{bot.name}</div>
                  <div className="text-[11px] text-white/40">Seviye {bot.level} • Çevrimiçi</div>
                </div>
                <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-800 px-3 py-2 text-[11px] text-white/45">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-[#e4ae39]" /> Ödül havuzu
                </span>
                <span className="font-display font-bold text-[#e4ae39]">{fmtMoney(pot)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
              <div className="mb-2.5 font-display text-sm font-bold uppercase tracking-widest text-white/60">
                Son Savaşlar
              </div>
              <div className="space-y-1.5">
                {recentBattles.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-ink-800/70 px-2.5 py-2 text-[11px]">
                    <span className={cn("font-semibold", b.winner === b.a ? "text-emerald-400" : "text-white/60")}>{b.a}</span>
                    <span className="text-white/30">{b.verb}</span>
                    <span className={cn("font-semibold", b.winner === b.b ? "text-emerald-400" : "text-white/60")}>{b.b}</span>
                    <span className="ml-auto shrink-0 text-white/35">{fmtMoney(b.pot)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ARENA ---------------- */}
      {(phase === "fighting" || phase === "done") && (
        <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
          {phase === "done" && winner === "player" && (
            <Confetti colors={["#f98e1d", "#e4ae39", "#ffffff"]} />
          )}

          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={reset}
              disabled={phase === "fighting"}
              className="flex items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:text-white disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Vazgeç
            </button>
            <div className="flex items-center gap-2 font-display text-lg font-black uppercase tracking-widest">
              <Coins className="h-5 w-5 text-[#e4ae39]" />
              <span className="text-[#e4ae39]">{fmtMoney(pot)}</span>
              <span className="text-white/30">pot</span>
            </div>
            <span className="rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-xs font-semibold text-white/50">
              {caseDef.name} × {rounds}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                me: true,
                name: userName,
                lvl: level,
                items: playerItems,
                total: pTotal,
                accent: "#f98e1d",
              },
              { me: false, name: bot.name, lvl: bot.level, items: botItems, total: bTotal, accent: "#eb4b4b" },
            ].map((side) => (
              <div
                key={side.name}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: `${side.accent}55`,
                  background: `linear-gradient(180deg, ${side.accent}0d, transparent 40%)`,
                }}
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold text-ink-950"
                    style={{ background: `linear-gradient(135deg, ${side.accent}, ${side.accent}88)` }}
                  >
                    {side.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-base font-bold text-white">
                      {side.me ? `${side.name} (Sen)` : side.name}
                    </div>
                    <div className="text-[10px] text-white/40">Seviye {side.lvl}</div>
                  </div>
                  <motion.div
                    key={side.total.toFixed(2)}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    className="font-display text-2xl font-black tabular-nums"
                    style={{ color: side.accent }}
                  >
                    {fmtMoney(side.total)}
                  </motion.div>
                </div>

                <div className={cn("grid gap-2", rounds === 1 ? "grid-cols-1" : rounds === 2 ? "grid-cols-2" : "grid-cols-3")}>
                  {Array.from({ length: rounds }).map((_, r) => (
                    <BattleSlot
                      key={r}
                      skin={side.items[r] ?? null}
                      rolling={rolling && currentRound === r && phase === "fighting"}
                      won={!!side.items[r] && side.items[r].price >= ((side.me ? botItems : playerItems)[r]?.price ?? -1)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* karşılaştırma çubuğu */}
          <div className="mt-5">
            <div className="relative h-3 overflow-hidden rounded-full bg-lose/60">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                animate={{ width: `${share}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-bold uppercase tracking-widest">
              <span className="text-brand-300">Sen %{share.toFixed(0)}</span>
              <span className="text-lose">{bot.name} %{(100 - share).toFixed(0)}</span>
            </div>
          </div>

          {/* sonuç */}
          <AnimatePresence>
            {phase === "done" && winner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex flex-col items-center rounded-2xl border border-line bg-ink-800/80 p-6 text-center"
              >
                <div
                  className={cn(
                    "font-display text-4xl font-black tracking-wide",
                    winner === "player" ? "text-win" : "text-lose"
                  )}
                  style={{
                    textShadow:
                      winner === "player"
                        ? "0 0 30px rgba(47,214,115,0.5)"
                        : "0 0 30px rgba(239,68,68,0.5)",
                  }}
                >
                  {winner === "player" ? "ZAFER SENİN!" : `${bot.name.toUpperCase()} KAZANDI`}
                </div>
                <p className="mt-1 text-sm text-white/50">
                  {winner === "player"
                    ? `${rounds * 2} eşya envanterine eklendi (${fmtMoney(pTotal + bTotal)})`
                    : `Rakip ${fmtMoney(pTotal + bTotal)} değerindeki tüm eşyaları aldı`}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setWinner(null);
                      setPlayerItems([]);
                      setBotItems([]);
                      startBattle();
                    }}
                    disabled={balance < buyIn}
                    className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-6 font-display text-sm font-bold text-ink-950 transition hover:brightness-110 disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2.6} /> Rövanş — {fmtMoney(buyIn)}
                  </button>
                  <button
                    onClick={reset}
                    className="h-11 rounded-xl border border-line bg-ink-700 px-6 font-display text-sm font-bold text-white transition hover:bg-ink-600"
                  >
                    Yeni Savaş
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
