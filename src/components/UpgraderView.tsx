import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import {
  ArrowLeftRight,
  Check,
  CheckCheck,
  ChevronsUp,
  FlaskConical,
  Info,
  PackageOpen,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import { SKINS, SKIN_MAP, RARITY, fmtMoney, type Skin } from "../data/skins";
import { itemValue } from "../data/items";
import { loseSound, spinWhoosh, tick, winSound, goldWin } from "../lib/audio";
import { clamp } from "../lib/rng";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";
import { ContractView } from "./ContractView";
import { SkinCard, SkinImg } from "./SkinCard";

type Mode = "upgrade" | "contract";

function ModeSwitch({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="mb-5 grid max-w-md grid-cols-2 gap-2 rounded-xl border border-line bg-ink-900 p-1">
      {(
        [
          { k: "upgrade" as const, label: "Yükseltici", Icon: ChevronsUp },
          { k: "contract" as const, label: "Kontrat", Icon: FlaskConical },
        ]
      ).map(({ k, label, Icon }) => (
        <button
          key={k}
          onClick={() => setMode(k)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-display text-sm font-bold uppercase tracking-wider transition",
            mode === k ? "bg-brand-500/15 text-brand-300" : "text-white/35 hover:text-white/70"
          )}
        >
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  );
}

const CX = 160;
const R = 122;

function Ticks() {
  return (
    <>
      {Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2;
        const x1 = CX + Math.cos(a) * (R + 12);
        const y1 = CX + Math.sin(a) * (R + 12);
        const x2 = CX + Math.cos(a) * (R + (i % 5 === 0 ? 22 : 17));
        const y2 = CX + Math.sin(a) * (R + (i % 5 === 0 ? 22 : 17));
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={i % 5 === 0 ? "#3a4763" : "#232b3d"}
            strokeWidth={i % 5 === 0 ? 2 : 1.2}
          />
        );
      })}
    </>
  );
}

export function UpgraderView() {
  const {
    inventory,
    removeItem,
    addItem,
    upgraderPick,
    setUpgraderPick,
    setTab,
    pushToast,
    nonce,
    trackWager,
    trackMission,
  } = useGame();

  const [mode, setMode] = useState<Mode>("upgrade");
  const [selUids, setSelUids] = useState<string[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rot, setRot] = useState(0);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const lastTickRef = useRef(0);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  /* seçili eşyalar + toplam değer */
  const selSkins = useMemo(
    () =>
      selUids
        .map((u) => inventory.find((i) => i.uid === u))
        .filter(Boolean)
        .map((i) => SKIN_MAP[i!.skinId])
        .filter(Boolean) as Skin[],
    [selUids, inventory]
  );
  const totalSel = useMemo(
    () =>
      selUids.reduce((a, u) => {
        const it = inventory.find((i) => i.uid === u);
        return a + (it ? itemValue(it) : 0);
      }, 0),
    [selUids, inventory]
  );
  const target: Skin | null = targetId ? SKIN_MAP[targetId] : null;

  /* envanteri değere göre sıralı göster */
  const sortedInventory = useMemo(
    () =>
      [...inventory].sort(
        (a, b) => (SKIN_MAP[b.skinId]?.price ?? 0) - (SKIN_MAP[a.skinId]?.price ?? 0)
      ),
    [inventory]
  );

  /* ön seçim (envanterden "Yükselt" ile gel) */
  useEffect(() => {
    if (upgraderPick) {
      setSelUids((prev) => (prev.includes(upgraderPick) ? prev : [...prev, upgraderPick]));
      setUpgraderPick(null);
    }
  }, [upgraderPick, setUpgraderPick]);

  /* seçilen eşya envanterden düştüyse listeden temizle */
  useEffect(() => {
    setSelUids((prev) => prev.filter((u) => inventory.some((i) => i.uid === u)));
  }, [inventory]);

  const chance = useMemo(() => {
    if (totalSel <= 0 || !target) return null;
    return clamp((totalSel / target.price) * 0.95, 0.03, 0.95);
  }, [totalSel, target]);

  const targets = useMemo(() => {
    if (totalSel <= 0) return [];
    return SKINS.filter((s) => s.price > totalSel * 1.02)
      .sort((a, b) => a.price - b.price)
      .slice(0, 42);
  }, [totalSel]);

  /* hedef geçersizleşirse temizle */
  useEffect(() => {
    if (target && target.price <= totalSel * 1.02) setTargetId(null);
  }, [totalSel, target]);

  const multiplier = chance ? 1 / chance : null;

  function toggleItem(uidKey: string) {
    if (spinning) return;
    setSelUids((prev) =>
      prev.includes(uidKey) ? prev.filter((u) => u !== uidKey) : [...prev, uidKey]
    );
  }

  function selectAll() {
    if (spinning) return;
    setSelUids(inventory.map((i) => i.uid));
  }

  function spin() {
    if (totalSel <= 0 || !target || chance === null || spinning) return;
    setSpinning(true);
    setResult(null);
    trackWager(totalSel);
    spinWhoosh();

    const count = selUids.length;
    const win = Math.random() < chance;
    const winDeg = chance * 360;
    const a = win
      ? 5 + Math.random() * Math.max(3, winDeg - 10)
      : winDeg + 5 + Math.random() * Math.max(3, 355 - winDeg);
    const R_total = 360 * 6 - a;

    setRot(0);
    lastTickRef.current = 0;
    controlsRef.current?.stop();
    controlsRef.current = animate(0, R_total, {
      duration: 5,
      ease: [0.13, 0.78, 0.05, 1],
      onUpdate: (v) => {
        setRot(v);
        const step = Math.floor(v / 12);
        if (step !== lastTickRef.current) {
          lastTickRef.current = step;
          tick(clamp(v / R_total, 0, 1));
        }
      },
      onComplete: () => {
        const won = win;
        setResult(won ? "win" : "lose");
        selUids.forEach((u) => removeItem(u));
        if (won) {
          addItem(target.id);
          trackMission("upgrades");
          if (target.rarity === "rare" || target.price > 1200) goldWin();
          else winSound(true);
          pushToast({
            kind: "win",
            title: "Yükseltme başarılı!",
            sub: `${count} eşya → ${target.weapon} | ${target.name}`,
          });
        } else {
          loseSound();
          pushToast({
            kind: "lose",
            title: "Yükseltme başarısız",
            sub: `${count} eşya kaybedildi`,
          });
        }
        setTargetId(null);
        window.setTimeout(() => {
          setSpinning(false);
          setRot(0);
        }, 2600);
        window.setTimeout(() => setResult(null), 3400);
      },
    });
  }

  const winDeg = (chance ?? 0) * 360;

  if (mode === "contract") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
        <ModeSwitch mode={mode} setMode={setMode} />
        <ContractView />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      <ModeSwitch mode={mode} setMode={setMode} />
      {/* başlık */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rar-restricted/40 bg-rar-restricted/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rar-restricted">
            <ChevronsUp className="h-3.5 w-3.5" /> Skin Upgrader
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Eşyalarını <span className="text-brand-400">Katla</span>
          </h1>
          <p className="mt-1 max-w-md text-sm text-white/50">
            Bir veya birden fazla eşya seç — şansın, seçtiklerinin toplam değerine göre
            hesaplanır. <span className="text-white/35">%5 kasa payı uygulanır.</span>
          </p>
        </div>
        <div className="hidden items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 py-2 text-[11px] font-semibold text-white/45 sm:flex">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Provably Fair • Tur #{nonce.toLocaleString("tr-TR")}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px_1fr]">
        {/* ---------------- SOL: EŞYALARIN ---------------- */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-900/70">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <PackageOpen className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
              Eşyalarını Seç
            </span>
            {selUids.length > 0 && (
              <button
                onClick={() => !spinning && setSelUids([])}
                className="flex items-center gap-1 rounded-md bg-ink-700 px-2 py-1 text-[10px] font-semibold text-white/50 hover:text-white"
              >
                <X className="h-3 w-3" /> Temizle
              </button>
            )}
            <button
              onClick={selectAll}
              disabled={inventory.length === 0 || spinning}
              className="ml-auto flex items-center gap-1 rounded-md border border-brand-500/40 bg-brand-500/10 px-2 py-1 text-[10px] font-bold text-brand-300 transition hover:bg-brand-500/20 disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Tümünü Seç
            </button>
          </div>

          <div className="tiny-scroll max-h-[430px] flex-1 overflow-y-auto p-3 lg:max-h-[480px]">
            {inventory.length === 0 ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-line bg-ink-800 text-white/25">
                  <PackageOpen className="h-7 w-7" />
                </div>
                <p className="text-sm text-white/45">Envanterin boş</p>
                <button
                  onClick={() => setTab("cases")}
                  className="rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-4 py-2 font-display text-sm font-bold text-ink-950"
                >
                  Hemen Kasa Aç
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {sortedInventory.map((item) => {
                  const s = SKIN_MAP[item.skinId];
                  if (!s) return null;
                  const selected = selUids.includes(item.uid);
                  return (
                    <SkinCard
                      key={item.uid}
                      skin={s}
                      size="xs"
                      selected={selected}
                      onClick={() => toggleItem(item.uid)}
                      badge={
                        selected ? (
                          <span className="absolute right-1.5 top-1.5 z-10 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand-500 text-ink-950 shadow" style={{ width: 18, height: 18 }}>
                            <Check className="h-3 w-3" strokeWidth={3.5} />
                          </span>
                        ) : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* seçim özeti */}
          <div
            className={cn(
              "flex items-center justify-between border-t px-4 py-2.5 text-xs transition-colors",
              selUids.length > 0 ? "border-brand-500/30 bg-brand-500/5" : "border-line bg-ink-800/50"
            )}
          >
            <span className="font-semibold text-white/50">
              {selUids.length > 0 ? `${selUids.length} eşya seçildi` : "Seçim yok"}
            </span>
            <span
              className={cn(
                "font-display font-bold",
                selUids.length > 0 ? "text-emerald-400" : "text-white/25"
              )}
            >
              {fmtMoney(totalSel)}
            </span>
          </div>
        </div>

        {/* ---------------- ORTA: ÇARK ---------------- */}
        <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(60% 40% at 50% 30%, rgba(136,71,255,0.09), transparent), radial-gradient(50% 30% at 50% 80%, rgba(249,142,29,0.07), transparent)",
            }}
          />
          {result === "win" && <Confetti colors={["#2fd673", "#e4ae39", "#ffffff"]} />}

          {/* bilgi satırı: kaynak → hedef */}
          <div className="relative mb-4 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* verdiğin */}
            <div className="order-1">
              <div
                className={cn(
                  "rounded-xl border bg-ink-800 p-2 text-center",
                  selSkins.length > 0 ? "border-line" : "border-dashed border-line/70"
                )}
                style={
                  selSkins.length > 0
                    ? {
                        boxShadow: `inset 0 -3px 0 0 ${
                          RARITY[
                            selSkins.reduce((a, s) =>
                              RARITY[s.rarity].order > RARITY[a.rarity].order ? s : a
                            ).rarity
                          ].color
                        }`,
                      }
                    : undefined
                }
              >
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">
                  Verdiğin {selSkins.length > 1 && `(${selSkins.length})`}
                </div>
                {selSkins.length === 0 ? (
                  <div className="flex h-[86px] items-center justify-center text-white/20">
                    <PackageOpen className="h-6 w-6" />
                  </div>
                ) : selSkins.length === 1 ? (
                  <>
                    <SkinImg skin={selSkins[0]} className="mx-auto h-14 w-full" />
                    <div className="truncate text-[11px] font-semibold text-white/85">
                      {selSkins[0].weapon} | {selSkins[0].name}
                    </div>
                    <div className="font-display text-xs font-bold text-emerald-400">
                      {fmtMoney(selSkins[0].price)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid h-[62px] grid-cols-4 gap-1 py-1">
                      {selSkins.slice(0, 7).map((s, i) => (
                        <div
                          key={`${s.id}-${i}`}
                          className="relative flex items-center justify-center overflow-hidden rounded bg-ink-900/80"
                          style={{ boxShadow: `inset 0 -2px 0 0 ${RARITY[s.rarity].color}` }}
                        >
                          <SkinImg skin={s} className="h-full w-full" />
                        </div>
                      ))}
                      {selSkins.length > 7 && (
                        <div className="flex items-center justify-center rounded bg-brand-500/20 font-display text-[10px] font-bold text-brand-300">
                          +{selSkins.length - 7}
                        </div>
                      )}
                      {selSkins.length <= 7 &&
                        Array.from({ length: 8 - Math.min(selSkins.length, 7) }).map((_, i) => (
                          <div key={i} className="rounded border border-dashed border-line/40" />
                        ))}
                    </div>
                    <div className="mt-1 truncate text-[10px] font-semibold text-white/60">
                      toplam değer
                    </div>
                    <div className="font-display text-xs font-bold text-emerald-400">
                      {fmtMoney(totalSel)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* hedef */}
            <div className="order-3">
              <div
                className={cn(
                  "rounded-xl border bg-ink-800 p-2 text-center",
                  target ? "border-line" : "border-dashed border-line/70"
                )}
                style={
                  target
                    ? { boxShadow: `inset 0 -3px 0 0 ${RARITY[target.rarity].color}` }
                    : undefined
                }
              >
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">Hedef</div>
                {target ? (
                  <>
                    <SkinImg skin={target} className="mx-auto h-14 w-full" />
                    <div className="truncate text-[11px] font-semibold text-white/85">
                      {target.weapon} | {target.name}
                    </div>
                    <div className="font-display text-xs font-bold text-emerald-400">
                      {fmtMoney(target.price)}
                    </div>
                  </>
                ) : (
                  <div className="flex h-[86px] items-center justify-center text-white/20">
                    <Target className="h-6 w-6" />
                  </div>
                )}
              </div>
            </div>

            <div className="order-2 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-ink-800 text-brand-400">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
          </div>

          {/* ÇARK */}
          <div className="relative h-[300px] w-[300px] sm:h-[320px] sm:w-[320px]">
            <svg viewBox="0 0 320 320" className="h-full w-full">
              <defs>
                <linearGradient id="winGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2fd673" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
              <Ticks />
              <g transform={`translate(${CX} ${CX}) rotate(${rot})`}>
                <circle r={R} fill="none" stroke="#38141c" strokeWidth={26} />
                <circle
                  r={R}
                  fill="none"
                  stroke="url(#winGrad)"
                  strokeWidth={26}
                  pathLength={100}
                  strokeDasharray={`${(winDeg / 360) * 100} 100`}
                  transform="rotate(-90)"
                  style={{ filter: "drop-shadow(0 0 10px rgba(47,214,115,0.45))" }}
                />
                <circle
                  r={R}
                  fill="none"
                  stroke="rgba(239,68,68,0.35)"
                  strokeWidth={26}
                  pathLength={100}
                  strokeDasharray={`${100 - (winDeg / 360) * 100} 100`}
                  strokeDashoffset={-(winDeg / 360) * 100}
                  transform="rotate(-90)"
                />
              </g>
            </svg>

            {/* ibre */}
            <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2">
              <div className="h-0 w-0 border-x-[11px] border-t-[18px] border-x-transparent border-t-brand-400 drop-shadow-[0_0_10px_rgba(249,142,29,0.8)]" />
            </div>

            {/* merkez */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="animate-spin-slower absolute h-[152px] w-[152px] rounded-full border border-dashed border-line/60" />
              {chance !== null ? (
                <>
                  <div className="font-display text-5xl font-black tabular-nums text-white drop-shadow-lg">
                    %{(chance * 100).toFixed(1)}
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                    Kazanma Şansı
                  </div>
                  <div className="mt-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-0.5 font-display text-sm font-bold text-brand-300">
                    x{multiplier!.toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="px-8 text-xs font-semibold leading-relaxed text-white/35">
                  Soldan eşyalarını,
                  <br />
                  sağdan hedefi seç
                </div>
              )}
            </div>

            {/* sonuç katmanı */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-full backdrop-blur-[2px]"
                  style={{
                    background:
                      result === "win"
                        ? "radial-gradient(circle, rgba(7,9,15,0.88) 30%, rgba(47,214,115,0.18))"
                        : "radial-gradient(circle, rgba(7,9,15,0.88) 30%, rgba(239,68,68,0.18))",
                  }}
                >
                  <div className="text-center">
                    <div
                      className={cn(
                        "font-display text-4xl font-black tracking-wide",
                        result === "win" ? "text-win" : "text-lose"
                      )}
                      style={{
                        textShadow:
                          result === "win"
                            ? "0 0 30px rgba(47,214,115,0.6)"
                            : "0 0 30px rgba(239,68,68,0.6)",
                      }}
                    >
                      {result === "win" ? "KAZANDIN!" : "KAYBETTİN"}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-white/50">
                      {result === "win" ? "Hedef eşya envanterinde" : "Eşyalar gitti…"}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={spin}
            disabled={totalSel <= 0 || !target || spinning}
            className={cn(
              "relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl font-display text-lg font-black uppercase tracking-widest transition",
              totalSel > 0 && target && !spinning
                ? "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110 hover:shadow-[0_10px_36px_-8px_rgba(249,142,29,0.7)]"
                : "cursor-not-allowed bg-ink-600 text-white/30"
            )}
            style={{ height: 52 }}
          >
            <ChevronsUp className="h-5 w-5" strokeWidth={2.8} />
            {spinning
              ? "Çark Dönüyor…"
              : selUids.length > 1
                ? `${selUids.length} Eşyayı Yükselt`
                : "Yükselt"}
          </button>

          {totalSel > 0 && target && chance !== null && (
            <div className="mt-3 flex w-full items-center justify-between rounded-lg border border-line bg-ink-800 px-3 py-2 text-[11px] text-white/45">
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Beklenen değer
              </span>
              <span className="font-display font-bold text-white/75">
                {fmtMoney(totalSel)} → <span className="text-emerald-400">{fmtMoney(target.price)}</span>
              </span>
            </div>
          )}
        </div>

        {/* ---------------- SAĞ: HEDEF ---------------- */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-900/70">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Target className="h-4 w-4 text-emerald-400" />
            <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
              Hedef Seç
            </span>
            <span className="ml-auto text-xs text-white/35">
              {totalSel > 0 ? `${targets.length} hedef müsait` : "—"}
            </span>
            {target && (
              <button
                onClick={() => setTargetId(null)}
                className="flex items-center gap-1 rounded-md bg-ink-700 px-2 py-1 text-[10px] font-semibold text-white/50 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="tiny-scroll max-h-[430px] flex-1 overflow-y-auto p-3 lg:max-h-[480px]">
            {totalSel <= 0 ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-line bg-ink-800 text-white/25">
                  <Target className="h-7 w-7" />
                </div>
                <p className="max-w-[220px] text-sm text-white/45">
                  Önce soldan yükseltilecek eşyaları seç
                </p>
              </div>
            ) : targets.length === 0 ? (
              <div className="flex h-full min-h-[300px] items-center justify-center p-6 text-center text-sm text-white/45">
                Bu değerden daha yüksek hedef kalmadı. Zirvedesin!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {targets.map((s) => (
                  <SkinCard
                    key={s.id}
                    skin={s}
                    size="xs"
                    selected={targetId === s.id}
                    onClick={() => !spinning && setTargetId(targetId === s.id ? null : s.id)}
                    badge={
                      <span
                        className="absolute right-1.5 top-1.5 rounded px-1 text-[9px] font-bold"
                        style={{
                          color: RARITY[s.rarity].color,
                          background: "rgba(7,9,15,0.7)",
                        }}
                      >
                        x{(s.price / totalSel).toFixed(1)}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
