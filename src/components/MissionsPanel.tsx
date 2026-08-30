import { Gift, Target } from "lucide-react";
import { money } from "../config";
import { MISSIONS } from "../data/missions";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";

export function MissionsPanel() {
  const { missions, claimMission } = useGame();

  const done = MISSIONS.filter((m) => missions.claimed.includes(m.id)).length;

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-ink-900/70">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <Target className="h-4 w-4 text-brand-400" />
        <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
          Günlük Görevler
        </span>
        <span className="rounded-full bg-ink-600 px-2 py-0.5 text-[10px] font-bold text-white/45">
          {done}/{MISSIONS.length}
        </span>
        <span className="ml-auto text-[11px] text-white/30">Her gün yenilenir</span>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {MISSIONS.map((m) => {
          const cur = Math.min(missions[m.key] as number, m.goal);
          const pct = Math.min(100, (cur / m.goal) * 100);
          const ready = cur >= m.goal;
          const claimed = missions.claimed.includes(m.id);

          return (
            <div
              key={m.id}
              className={cn(
                "relative overflow-hidden rounded-xl border p-3 transition",
                claimed
                  ? "border-line bg-ink-800/50 opacity-60"
                  : ready
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-line bg-ink-800"
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none">{m.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-white/85">{m.label}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/40">
                    <Gift className="h-3 w-3 text-brand-400" />
                    <span className="font-display font-bold text-brand-300">{money(m.reward)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-600">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    ready ? "bg-emerald-400" : "bg-gradient-to-r from-brand-400 to-brand-600"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-bold tabular-nums text-white/40">
                  {m.key === "wagered" ? `${money(cur)} / ${money(m.goal)}` : `${cur} / ${m.goal}`}
                </span>
                <button
                  onClick={() => claimMission(m.id)}
                  disabled={!ready || claimed}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition",
                    claimed
                      ? "bg-ink-700 text-white/30"
                      : ready
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                        : "bg-ink-700 text-white/25"
                  )}
                >
                  {claimed ? "Alındı" : ready ? "Ödülü Al" : "Devam"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
