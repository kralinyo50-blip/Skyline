import { WEAR_ORDER, WEARS, wearFromFloat, type WearKey } from "../data/wear";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------
   CS tarzı durum (exterior) UI parçaları:
   - WearBadge : renkli durum rozeti (kısa / tam Türkçe ad)
   - FloatBar  : 0.00 → 1.00 float çubuğu + işaretçi + kademe çizgileri
------------------------------------------------------------------ */

export function WearBadge({
  wear,
  float,
  full = false,
  className,
}: {
  wear: WearKey;
  float?: number;
  full?: boolean;
  className?: string;
}) {
  const w = WEARS[wear];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-black uppercase tracking-wide shadow-sm",
        full ? "px-1.5 py-0.5 text-[9px]" : "px-1 py-px text-[8px]",
        className
      )}
      style={{ color: w.color, background: `${w.color}1a`, border: `1px solid ${w.color}33` }}
      title={float !== undefined ? `${w.tr} — float ${float.toFixed(4)}` : w.tr}
    >
      {full ? w.tr : w.short}
    </span>
  );
}

/** Durum adını "AWP | Gungnir (Fabrikadan Yeni Çıkmış)" biçiminde üret */
export function wearTitle(weapon: string, name: string, float?: number): string {
  const w = float === undefined ? null : WEARS[wearFromFloat(float)];
  return w ? `${weapon} | ${name} (${w.tr})` : `${weapon} | ${name}`;
}

const BOUNDS: { at: number; color: string }[] = [
  { at: 0.07, color: WEARS.mw.color },
  { at: 0.15, color: WEARS.ft.color },
  { at: 0.38, color: WEARS.ww.color },
  { at: 0.45, color: WEARS.bs.color },
];

export function FloatBar({
  float,
  className,
}: {
  float: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, float)) * 100;
  const wear = wearFromFloat(float);
  const color = WEARS[wear].color;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2 w-full overflow-visible rounded-full bg-ink-950/80 ring-1 ring-white/5">
        {/* kademe gradyanı */}
        <div
          className="absolute inset-0 rounded-full opacity-90"
          style={{
            background: `linear-gradient(90deg, ${WEARS.fn.color} 0%, ${WEARS.fn.color} 7%, ${WEARS.mw.color} 15%, ${WEARS.ft.color} 38%, ${WEARS.ww.color} 45%, ${WEARS.bs.color} 100%)`,
          }}
        />
        {/* kademe sınır çizgileri */}
        {BOUNDS.map((b) => (
          <span
            key={b.at}
            className="absolute top-0 h-full w-px bg-ink-950/70"
            style={{ left: `${b.at * 100}%` }}
          />
        ))}
        {/* float işaretçisi */}
        <span
          className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] shadow-[0_0_8px_2px_rgba(0,0,0,0.5)]"
          style={{ left: `${pct}%`, background: color, border: "1.5px solid rgba(255,255,255,0.85)" }}
        />
      </div>
      {/* min/max etiketleri */}
      <div className="mt-1 flex justify-between text-[8px] font-bold tabular-nums text-white/25">
        <span>0.00</span>
        <span>{float.toFixed(4)}</span>
        <span>1.00</span>
      </div>
    </div>
  );
}

/** Durum filtre butonu — envanter / pazar için ortak */
export function WearFilterRow({
  value,
  onChange,
  className,
}: {
  value: WearKey | "all";
  onChange: (v: WearKey | "all") => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <button
        onClick={() => onChange("all")}
        className={cn(
          "rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition",
          value === "all"
            ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
            : "border-line bg-ink-800 text-white/45 hover:text-white"
        )}
      >
        Tümü
      </button>
      {WEAR_ORDER.map((k) => {
        const w = WEARS[k];
        return (
          <button
            key={k}
            onClick={() => onChange(value === k ? "all" : k)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition",
              value === k ? "" : "border-line bg-ink-800 text-white/45 hover:text-white"
            )}
            style={
              value === k
                ? { color: w.color, background: `${w.color}1a`, borderColor: `${w.color}66` }
                : undefined
            }
          >
            {w.short}
          </button>
        );
      })}
    </div>
  );
}
