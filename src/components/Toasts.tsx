import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TrendingUp, X, XCircle } from "lucide-react";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";

const ICONS = {
  win: { Icon: CheckCircle2, color: "#e4ae39", bg: "rgba(228,174,57,0.12)" },
  lose: { Icon: XCircle, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  money: { Icon: TrendingUp, color: "#2fd673", bg: "rgba(47,214,115,0.12)" },
  info: { Icon: Info, color: "#5e98d9", bg: "rgba(94,152,217,0.12)" },
} as const;

export function Toasts() {
  const { toasts, dismissToast } = useGame();

  return (
    <div className="pointer-events-none fixed bottom-[72px] right-4 z-[90] flex w-[min(92vw,360px)] flex-col gap-2 md:bottom-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const { Icon, color, bg } = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-ink-800/95 p-3 shadow-2xl backdrop-blur-md"
            >
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: bg, color }}
              >
                <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-semibold text-white">{t.title}</div>
                {t.sub && <div className={cn("truncate text-xs text-white/55")}>{t.sub}</div>}
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="rounded-md p-1 text-white/35 transition hover:bg-white/5 hover:text-white/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
