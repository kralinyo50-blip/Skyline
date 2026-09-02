import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { useGame } from "../store/Game";
import { Confetti } from "./CaseReel";

/* Site geneli / yerel kutlamalar — konfeti + mesaj patlatır.
   Aynı ts/id bir daha gösterilmez. */
export function CelebrationOverlay() {
  const { celebration, localCelebration } = useGame();
  const [shown, setShown] = useState<{ key: string; text: string; sub?: string } | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const timer = useRef<number | null>(null);

  /* site geneli kutlama (tüm cihazlar) */
  useEffect(() => {
    const target = celebration ? `site:${celebration.ts}` : null;
    if (target && celebration && !seen.current.has(target)) {
      seen.current.add(target);
      /* eski kutlamalar (10 dk) tekrar oynatılmaz */
      if (Date.now() - celebration.ts > 10 * 60 * 1000) return;
      setShown({ key: target, text: celebration.text });
    }
  }, [celebration]);

  useEffect(() => {
    if (localCelebration) {
      const key = `local:${localCelebration.id}`;
      if (!seen.current.has(key)) {
        seen.current.add(key);
        setShown({ key, text: localCelebration.text, sub: localCelebration.sub });
      }
    }
  }, [localCelebration]);

  useEffect(() => {
    /* kapalı kutlamaları sınırlı tut — 200 kayıt */
    if (seen.current.size > 200) {
      const arr = [...seen.current];
      seen.current = new Set(arr.slice(-150));
    }
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(null), 6000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [shown]);

  const colors = useMemo(() => ["#f98e1d", "#e4ae39", "#2fd673", "#5e98d9", "#ffffff"], []);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={shown.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[90] flex items-start justify-center"
        >
          <Confetti colors={colors} />
          <motion.div
            initial={{ y: -40, scale: 0.85, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -16, scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mt-24 flex max-w-[92vw] flex-col items-center rounded-3xl border border-amber-400/40 bg-gradient-to-b from-ink-800/95 to-ink-900/95 px-10 py-7 text-center shadow-[0_0_80px_rgba(244,180,63,0.25)] backdrop-blur"
          >
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
              <PartyPopper className="h-6 w-6" />
            </span>
            <div className="font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              {shown.text}
            </div>
            {shown.sub && <div className="mt-1.5 text-sm font-bold text-amber-300">{shown.sub}</div>}
            <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Kutlama 🎉
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
