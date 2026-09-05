import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hammer, Package, Search, Trash2, X } from "lucide-react";
import { money } from "../config";
import { SKINS, SKIN_MAP, RARITY } from "../data/skins";
import { click, coinDing, goldWin, loseSound, reelStart, tick } from "../lib/audio";
import { useGame } from "../store/Game";
import type { PlayerCase } from "../store/db";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";
import { SkinImg } from "./SkinCard";

/* ==================================================================
   V2.0 — KENDİ KASANI KUR
   Oyuncu kasaları Account.myCases'te tutulur, pub ile yayınlanır;
   topluluk kasaları diğer cihazlardan açılabilir.
================================================================== */

const CASE_COLORS = ["#f98e1d", "#4b69ff", "#8847ff", "#d32ce6", "#eb4b4b", "#2fd673", "#e4ae39", "#ff45a8"];

export function casePrice(skinIds: string[]): number {
  const prices = skinIds.map((id) => SKIN_MAP[id]?.price ?? 0);
  const avg = prices.reduce((a, b) => a + b, 0) / Math.max(1, prices.length);
  return Math.max(500, Math.round((avg * 1.3) / 100) * 100);
}

/* ---------------- KASA KURMA MODALI ---------------- */

export function CaseBuilderModal({ onClose }: { onClose: () => void }) {
  const { createPlayerCase, pushToast } = useGame();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CASE_COLORS[0]);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const pool = useMemo(() => {
    const term = q.trim().toLowerCase();
    return SKINS.filter(
      (s) =>
        !s.sticker &&
        !s.st &&
        !s.sv &&
        (term === "" || `${s.weapon} ${s.name}`.toLowerCase().includes(term))
    ).slice(0, 60);
  }, [q]);

  function create() {
    const r = createPlayerCase(name, color, picked);
    if (r.ok) {
      pushToast({ kind: "win", title: "Kasan kuruldu!", sub: `${name.trim()} · ${money(casePrice(picked))}` });
      onClose();
    } else {
      pushToast({ kind: "lose", title: "Olmadı", sub: r.error });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="tiny-scroll max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-ink-800/95 px-5 py-3.5 backdrop-blur">
          <Hammer className="h-4 w-4 text-brand-400" />
          <span className="font-display text-sm font-black uppercase tracking-wider text-white">
            Kendi Kasanı Kur
          </span>
          <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-brand-300">
            V2.0
          </span>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_260px]">
          {/* skin seçici */}
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Skin ara… (6-12 seçim)"
                className="h-10 w-full rounded-xl border border-line bg-ink-900 pl-9 pr-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-brand-500/60 focus:outline-none"
              />
            </div>
            <div className="tiny-scroll grid max-h-72 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
              {pool.map((s) => {
                const on = picked.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setPicked((p) => (on ? p.filter((x) => x !== s.id) : p.length >= 12 ? p : [...p, s.id]));
                      click();
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-2 transition",
                      on ? "border-brand-500/70 bg-brand-500/10" : "border-line bg-ink-900 hover:border-ink-500"
                    )}
                  >
                    <SkinImg skin={s} className="h-12 w-full" />
                    <span className="w-full truncate text-center text-[9px] font-bold text-white/60">
                      {s.weapon} | {s.name}
                    </span>
                    <span
                      className="font-display text-[9px] font-black tabular-nums"
                      style={{ color: RARITY[s.rarity].color }}
                    >
                      {money(s.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* özet */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/35">
                Kasa Adı
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                placeholder="Örn: Efsane Kutusu"
                className="h-10 w-full rounded-xl border border-line bg-ink-900 px-3 text-sm font-bold text-white placeholder:text-white/25 focus:border-brand-500/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/35">
                Renk
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CASE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-lg border-2 transition",
                      color === c ? "border-white" : "border-transparent"
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-ink-900 p-3">
              <div className="flex justify-between text-[11px] font-bold text-white/50">
                <span>Seçim</span>
                <span className={picked.length >= 6 ? "text-emerald-400" : "text-rose-400"}>
                  {picked.length}/12 (min 6)
                </span>
              </div>
              <div className="mt-1 flex justify-between text-[11px] font-bold text-white/50">
                <span>Açılış fiyatı</span>
                <span className="font-display text-emerald-400">
                  {picked.length ? money(casePrice(picked)) : "—"}
                </span>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-white/30">
                Fiyat, seçtiğin skinlerin ortalama değerinin ×1,3'ü (standart kasa formülü). Her açılışta
                havuzdan eşit şansla bir skin düşer.
              </p>
            </div>
            <button
              onClick={create}
              disabled={picked.length < 6 || name.trim().length < 3}
              className={cn(
                "w-full rounded-xl px-4 py-3 font-display text-sm font-black uppercase tracking-wider transition",
                picked.length >= 6 && name.trim().length >= 3
                  ? "bg-brand-500 text-black hover:bg-brand-400"
                  : "cursor-not-allowed bg-ink-700 text-white/30"
              )}
            >
              Kasayı Kur
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- KASA AÇMA MODALI ---------------- */

export function PlayerCaseOpenModal({
  def,
  ownerKey,
  ownerName,
  onClose,
}: {
  def: PlayerCase;
  ownerKey: string;
  ownerName: string;
  onClose: () => void;
}) {
  const { openPlayerCase, balance } = useGame();
  const [phase, setPhase] = useState<"idle" | "spin" | "done">("idle");
  const [idx, setIdx] = useState(0);
  const [win, setWin] = useState<{ skinId: string; value: number } | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearInterval(t)), []);

  function open() {
    if (phase === "spin") return;
    const r = openPlayerCase(ownerKey, def.id);
    if (!r.ok || !r.skinId) {
      loseSound();
      return;
    }
    setPhase("spin");
    setWin(null);
    reelStart();
    const target = r.skinId;
    const cycler = window.setInterval(() => {
      setIdx((i) => (i + 1) % def.skinIds.length);
      tick();
    }, 75);
    timers.current.push(cycler);
    timers.current.push(
      window.setTimeout(() => {
        window.clearInterval(cycler);
        setIdx(def.skinIds.indexOf(target));
        setWin({ skinId: target, value: r.value ?? 0 });
        setPhase("done");
        if ((r.value ?? 0) >= def.price) goldWin();
        else coinDing();
      }, 2400)
    );
  }

  const winSkin = win ? SKIN_MAP[win.skinId] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-line bg-ink-800 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: def.color }} />
          <span className="font-display text-sm font-black uppercase tracking-wider text-white">{def.name}</span>
          <span className="text-[10px] text-white/35">· {ownerName}</span>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* makara */}
        <div className="relative overflow-hidden rounded-xl border border-line bg-ink-900 p-3">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-brand-400 shadow-[0_0_12px_rgba(249,142,29,0.8)]" />
          <div className="flex gap-2">
            {def.skinIds.map((sid, i) => {
              const s = SKIN_MAP[sid];
              const active = phase !== "idle" && i === idx;
              return (
                <div
                  key={sid + i}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg border p-2 transition",
                    active ? "border-brand-500/70 bg-brand-500/10" : "border-line/60 bg-ink-800/60",
                    phase === "done" && win?.skinId === sid && i === idx && "border-emerald-400/70 bg-emerald-500/10"
                  )}
                >
                  {s && <SkinImg skin={s} className="h-10 w-full" />}
                  <span className="w-full truncate text-center text-[8px] font-bold text-white/45">
                    {s?.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/40">
            {phase === "done" && winSkin && win ? (
              <span className="font-display text-base font-black text-emerald-400">
                {winSkin.weapon} | {winSkin.name} · {money(win.value)}
              </span>
            ) : (
              <span>
                {def.skinIds.length} skin · eşit şans · {def.opens} açılış
              </span>
            )}
          </div>
          <button
            onClick={open}
            disabled={phase === "spin" || balance < def.price}
            className={cn(
              "shrink-0 rounded-xl px-5 py-2.5 font-display text-sm font-black uppercase tracking-wider transition",
              phase === "spin" || balance < def.price
                ? "cursor-not-allowed bg-ink-700 text-white/30"
                : "bg-brand-500 text-black hover:bg-brand-400"
            )}
          >
            {phase === "spin" ? "Açılıyor…" : `Aç · ${money(def.price)}`}
          </button>
        </div>
        {phase === "done" && win && winSkin && (winSkin.rarity === "rare" || winSkin.rarity === "covert") && (
          <Confetti colors={[RARITY[winSkin.rarity].color, "#ffffff", "#f98e1d"]} />
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------------- KASALAR BÖLÜMÜ (CasesView içine) ---------------- */

export function PlayerCasesSection() {
  const { user, allUsers, deletePlayerCase, pushToast } = useGame();
  const [builder, setBuilder] = useState(false);
  const [opening, setOpening] = useState<{ def: PlayerCase; ownerKey: string; ownerName: string } | null>(null);

  const mine = user?.myCases ?? [];
  const community = useMemo(
    () =>
      allUsers
        .filter((u) => u.key !== user?.key)
        .flatMap((u) => (u.pub?.myCases ?? []).map((c) => ({ def: c, ownerKey: u.key, ownerName: u.name })))
        .slice(0, 12),
    [allUsers, user?.key]
  );

  const card = (def: PlayerCase, ownerKey: string, ownerName: string, isMine: boolean) => (
    <div
      key={def.id + ownerKey}
      className="flex flex-col gap-2 rounded-2xl border border-line bg-ink-900/70 p-3"
      style={{ boxShadow: `inset 0 2px 24px ${def.color}22` }}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${def.color}22` }}>
          <Package className="h-4 w-4" style={{ color: def.color }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-black uppercase tracking-wider text-white">
            {def.name}
          </div>
          <div className="truncate text-[10px] text-white/35">
            {isMine ? "Kasan" : ownerName} · {def.skinIds.length} skin · {def.opens} açılış
          </div>
        </div>
        {isMine && (
          <button
            onClick={() => {
              deletePlayerCase(def.id);
              pushToast({ kind: "info", title: "Kasa silindi", sub: def.name });
            }}
            className="rounded-lg border border-line bg-ink-800 p-1.5 text-white/40 transition hover:text-lose"
            title="Kasayı sil"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex -space-x-2">
        {def.skinIds.slice(0, 6).map((sid) => {
          const s = SKIN_MAP[sid];
          return s ? (
            <img
              key={sid}
              src={s.img}
              alt={s.name}
              title={`${s.weapon} | ${s.name}`}
              className="h-8 w-10 rounded border border-line bg-ink-800 object-contain"
              loading="lazy"
            />
          ) : null;
        })}
        {def.skinIds.length > 6 && (
          <span className="grid h-8 w-8 place-items-center rounded border border-line bg-ink-800 text-[9px] font-black text-white/50">
            +{def.skinIds.length - 6}
          </span>
        )}
      </div>
      <button
        onClick={() => {
          click();
          setOpening({ def, ownerKey, ownerName });
        }}
        className="mt-auto rounded-xl bg-brand-500/15 px-3 py-2 font-display text-xs font-black uppercase tracking-wider text-brand-300 transition hover:bg-brand-500/25"
      >
        Aç · {money(def.price)}
      </button>
    </div>
  );

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase tracking-wider text-white">
          <Hammer className="h-4 w-4 text-brand-400" /> Kendi Kasanı Kur
        </h2>
        <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-brand-300">
          V2.0
        </span>
        <button
          onClick={() => setBuilder(true)}
          disabled={mine.length >= 3}
          className={cn(
            "ml-auto rounded-xl px-4 py-2 font-display text-xs font-black uppercase tracking-wider transition",
            mine.length >= 3
              ? "cursor-not-allowed bg-ink-700 text-white/30"
              : "bg-brand-500 text-black hover:bg-brand-400"
          )}
        >
          {mine.length >= 3 ? "3 kasa limitin dolu" : "+ Kasa Kur"}
        </button>
      </div>

      {mine.length === 0 && community.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-ink-900/40 p-6 text-center text-xs text-white/35">
          Henüz oyuncu kasası yok — ilk kasayı sen kur, topluluk sekmesinde herkes açsın.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mine.map((c) => card(c, user!.key, user!.name, true))}
          {community.map(({ def, ownerKey, ownerName }) => card(def, ownerKey, ownerName, false))}
        </div>
      )}

      <AnimatePresence>
        {builder && <CaseBuilderModal onClose={() => setBuilder(false)} />}
        {opening && (
          <PlayerCaseOpenModal
            def={opening.def}
            ownerKey={opening.ownerKey}
            ownerName={opening.ownerName}
            onClose={() => setOpening(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
