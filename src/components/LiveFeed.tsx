import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, Users } from "lucide-react";
import { CASES, FEED_ACTIONS, FEED_USERS, toCaseDef, type CaseDef } from "../data/cases";
import { RARITY, SKIN_MAP, fmtMoney, type RarityKey, type Skin } from "../data/skins";
import { mcHead } from "../config";
import { pick, randInt, uid } from "../lib/rng";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";

interface Drop {
  id: string;
  user: string;
  skin: Skin;
  caseName: string;
  ts: number;
}

function rollDrop(ts?: number, customCases?: CaseDef[]): Drop {
  const total = FEED_ACTIONS.reduce((a, t) => a + t.weight, 0);
  let r = Math.random() * total;
  let tier: RarityKey = "milspec";
  for (const t of FEED_ACTIONS) {
    r -= t.weight;
    if (r <= 0) {
      tier = t.tier;
      break;
    }
  }
  const pool = [...CASES, ...(customCases ?? [])];
  const candidates = pool.filter((c) => (c.contents[tier]?.length ?? 0) > 0);
  const c = pick(candidates);
  const skinId = pick(c.contents[tier]!);
  let skin = SKIN_MAP[skinId];
  if (tier !== "rare" && Math.random() < 0.1) {
    const st = SKIN_MAP[skin.id + "-st"];
    if (st) skin = st;
  }
  return {
    id: uid(),
    user: pick(FEED_USERS),
    skin,
    caseName: c.name,
    ts: ts ?? Date.now(),
  };
}

const AV_COLORS = ["#f98e1d", "#4b69ff", "#d32ce6", "#2fd673", "#53c8ff", "#eb4b4b", "#8847ff"];

function Avatar({ name }: { name: string }) {
  const idx = name.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length;
  const [err, setErr] = useState(false);
  if (err)
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded font-display text-[11px] font-bold text-ink-950"
        style={{ background: `linear-gradient(135deg, ${AV_COLORS[idx]}, ${AV_COLORS[(idx + 2) % AV_COLORS.length]})` }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  return (
    <img
      src={mcHead(name, 56)}
      alt={name}
      onError={() => setErr(true)}
      className="h-7 w-7 shrink-0 rounded"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function ago(ts: number, now: number): string {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 10) return "şimdi";
  if (s < 60) return `${s} sn önce`;
  return `${Math.floor(s / 60)} dk önce`;
}

/** Mobil / tablet — kayan şerit */
export function LiveTicker() {
  const { customCases } = useGame();
  const ccDefs = useMemo(() => customCases.filter((c) => c.stock > 0).map(toCaseDef), [customCases]);
  const items = useMemo(() => {
    const out: Drop[] = [];
    for (let i = 0; i < 16; i++) out.push(rollDrop(Date.now() - randInt(10, 900) * 1000, ccDefs));
    return out;
  }, [ccDefs]);

  return (
    <div className="relative h-11 overflow-hidden border-b border-line bg-ink-900/60 xl:hidden">
      <div className="animate-marquee absolute flex h-full items-center gap-6 whitespace-nowrap pl-4" style={{ width: "max-content" }}>
        {[...items, ...items].map((d, i) => {
          const r = RARITY[d.skin.rarity];
          return (
            <span key={d.id + i} className="flex items-center gap-1.5 text-[11px]">
              <img src={d.skin.img} alt="" className="h-6 w-6 rounded object-cover" />
              <span className="font-semibold text-white/80">{d.user}</span>
              <span className="text-white/35">kazandı:</span>
              <span className="font-semibold" style={{ color: r.color }}>
                {d.skin.st && <span style={{ color: "#cf6a32" }}>StatTrak™ </span>}
                {d.skin.weapon} | {d.skin.name}
              </span>
              <span className="font-display font-bold text-emerald-400">{fmtMoney(d.skin.price)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Masaüstü — sol sabit ray */
export function FeedRail() {
  const { customCases } = useGame();
  const ccDefs = useMemo(() => customCases.filter((c) => c.stock > 0).map(toCaseDef), [customCases]);
  const [items, setItems] = useState<Drop[]>(() => {
    const now = Date.now();
    return Array.from({ length: 8 }, (_, i) =>
      rollDrop(now - randInt(8, 220) * 1000 - i * 5000, customCases.filter((c) => c.stock > 0).map(toCaseDef))
    ).sort((a, b) => b.ts - a.ts);
  });
  const [now, setNow] = useState(Date.now());
  const [online, setOnline] = useState(2847);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        if (!alive.current) return;
        setItems((prev) => [rollDrop(undefined, ccDefs), ...prev].slice(0, 9));
        loop();
      }, randInt(2800, 6800));
    };
    loop();
    const tickNow = window.setInterval(() => setNow(Date.now()), 5000);
    const tickOnline = window.setInterval(
      () => setOnline((o) => Math.min(3900, Math.max(2200, o + randInt(-70, 75)))),
      4000
    );
    return () => {
      alive.current = false;
      clearTimeout(t);
      clearInterval(tickNow);
      clearInterval(tickOnline);
    };
  }, [ccDefs]);

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-[292px] flex-col border-r border-line bg-ink-950/70 backdrop-blur-sm xl:flex">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Radio className="h-4 w-4 text-emerald-400" />
        <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
          Canlı Düşüşler
        </span>
        <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
        <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-white/40">
          <Users className="h-3.5 w-3.5" />
          {online.toLocaleString("tr-TR")}
        </span>
      </div>

      <div className="tiny-scroll flex-1 space-y-1.5 overflow-y-auto p-2.5">
        <AnimatePresence initial={false}>
          {items.map((d) => {
            const r = RARITY[d.skin.rarity];
            const big = d.skin.rarity === "covert" || d.skin.rarity === "rare";
            return (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: -18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2",
                  big ? "border-transparent" : "border-line bg-ink-800/80"
                )}
                style={
                  big
                    ? {
                        background: `linear-gradient(120deg, ${r.color}26, rgba(16,20,31,0.9) 55%)`,
                        boxShadow: `inset 0 0 0 1px ${r.color}55`,
                      }
                    : undefined
                }
              >
                <Avatar name={d.user} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-[12px] font-semibold text-white/90">{d.user}</span>
                    <span className="shrink-0 text-[10px] text-white/35">{ago(d.ts, now)}</span>
                  </div>
                  <div className="truncate text-[11px] font-medium" style={{ color: r.color }}>
                    {d.skin.st && <span style={{ color: "#cf6a32" }}>StatTrak™ </span>}
                    {d.skin.weapon} | {d.skin.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/35">
                    <span className="truncate">{d.caseName}</span>
                    <span>•</span>
                    <span className="font-display font-bold text-emerald-400/90">{fmtMoney(d.skin.price)}</span>
                  </div>
                </div>
                <img
                  src={d.skin.img}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-lg object-cover"
                  style={{ boxShadow: `0 4px 14px -4px ${r.color}66` }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="border-t border-line px-4 py-2.5 text-[10px] leading-relaxed text-white/30">
        Düşüşler simülasyon verisidir — eğlence amaçlıdır.
      </div>
    </aside>
  );
}
