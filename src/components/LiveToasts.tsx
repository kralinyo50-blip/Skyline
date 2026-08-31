import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { BOT_NAMES } from "../data/fakers";
import { fmtMoney, SKIN_MAP } from "../data/skins";
import { pick, randInt, uid } from "../lib/rng";

interface ToastItem {
  id: string;
  text: string;
  sub?: string;
}

/* Sağ üstte kısa süreli "site şu an canlı" bildirimleri — bot kazançları.
   DB'ye yazmaz, sadece görsel canlılık. */
export function LiveToasts() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let alive = true;
    const timers: number[] = [];
    const push = (text: string, sub?: string) => {
      if (!alive) return;
      const it = { id: uid(), text, sub };
      setItems((prev) => [...prev, it].slice(-3));
      timers.push(window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== it.id)), 4200));
    };
    const spin = () => {
      if (!alive) return;
      const pool = Object.values(SKIN_MAP).filter((s) => !s.sticker);
      const s = pick(pool.length ? pool : Object.values(SKIN_MAP));
      const name = pick(BOT_NAMES);
      const amount = Math.max(1000, Math.round((s.price ?? 0) * (0.85 + Math.random() * 0.6)));
      push(`🎉 ${name} kasasından çıkardı`, `${s.weapon} | ${s.name} · ${fmtMoney(amount)}`);
      timers.push(window.setTimeout(spin, randInt(9000, 20000)));
    };
    timers.push(window.setTimeout(spin, 3000));
    return () => {
      alive = false;
      timers.forEach((id) => clearTimeout(id));
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-[74px] z-[80] flex w-[min(88vw,320px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-brand-500/30 bg-ink-800/95 p-2.5 shadow-2xl backdrop-blur-md"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-semibold text-white/85">{t.text}</div>
              {t.sub && (
                <div className="flex items-center gap-1 font-display text-[11px] font-bold text-emerald-400">
                  <TrendingUp className="h-3 w-3" /> {t.sub}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
