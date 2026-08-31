import { useEffect, useMemo, useState } from "react";
import { money } from "../config";
import { skinBasePrice, skinPriceAt } from "../data/skins";
import { useGame } from "../store/Game";

/* ------------------------------------------------------------------
   Fiyat geçmişi grafiği (sparkline) — seçilen skinin son N saatteki
   BAZ fiyatı. Fiyat kareleri (priceSnaps) + dalga eğrisi deterministik
   olduğu için geçmiş, hiçbir yan etki olmadan yeniden kurulur.
------------------------------------------------------------------ */

interface Props {
  skinId: string;
  hours?: number;
}

export function PriceHistoryChart({ skinId, hours = 24 }: Props) {
  const { priceSnaps } = useGame();
  const [, setTick] = useState(0);

  /* grafik "şimdi" noktası canlı kalsın — hafif 30 sn tazeleme */
  useEffect(() => {
    const iv = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  const d = useMemo(() => {
    const snaps = [...(priceSnaps ?? [])]
      .filter((s) => s && s.id && Number.isFinite(s.ts))
      .sort((a, b) => a.ts - b.ts);
    const now = Date.now();
    const span = hours * 3600_000;
    const N = 64;
    const base = skinBasePrice(skinId);
    const dots: { t: number; p: number }[] = [];

    if (snaps.length === 0) {
      for (let i = 0; i < N; i++) dots.push({ t: now - span + (span * i) / (N - 1), p: base });
    } else {
      let si = 0;
      for (let i = 0; i < N; i++) {
        const t = now - span + (span * i) / (N - 1);
        while (si + 1 < snaps.length && snaps[si + 1].ts <= t) si++;
        const sn = snaps[si];
        const p =
          sn.ts <= t
            ? skinPriceAt(skinId, sn, sn.wave ?? null, t)
            : base;
        dots.push({ t, p });
      }
    }
    const cur = dots[dots.length - 1]?.p ?? base;
    const start = dots[0]?.p ?? base;
    const high = Math.max(...dots.map((x) => x.p));
    const low = Math.min(...dots.map((x) => x.p));
    return { dots, base, cur, start, high, low };
  }, [priceSnaps, skinId, hours]);

  const W = 340;
  const H = 92;
  const PAD = 6;
  const lo = d.low;
  const hi = Math.max(d.high, d.base, d.cur, 1);
  const range = Math.max(hi - lo, 1);
  const x = (i: number) => PAD + (i / Math.max(d.dots.length - 1, 1)) * (W - 2 * PAD);
  const y = (p: number) => H - PAD - ((p - lo) / range) * (H - 2 * PAD);
  const pts = d.dots.map((p, i) => `${x(i).toFixed(1)},${y(p.p).toFixed(1)}`).join(" ");
  const area = `${x(0).toFixed(1)},${y(d.dots[0].p).toFixed(1)} ${pts} ${x(d.dots.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} ${x(0).toFixed(1)},${(H - PAD).toFixed(1)}`;
  const baseY = y(d.base);
  const up = d.cur > d.start;
  const down = d.cur < d.start;
  const color = up ? "#34d399" : down ? "#f87171" : "#94a3b8";
  const gradId = `pg-${skinId.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-line bg-ink-950/70">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-[92px] w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* taban (orijinal) referans çizgisi */}
          <line
            x1={PAD}
            x2={W - PAD}
            y1={baseY}
            y2={baseY}
            stroke="#ffffff"
            strokeOpacity="0.14"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <polygon points={area} fill={`url(#${gradId})`} />
          <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(d.dots.length - 1)} cy={y(d.cur)} r="3.2" fill={color} stroke="#0b0f19" strokeWidth="1.5" />
        </svg>
        {/* yüksek / düşük rozetleri */}
        <div className="absolute left-2 top-1.5 rounded bg-ink-800/80 px-1.5 py-0.5 text-[8px] font-bold tabular-nums text-white/50">
          ▲ {money(d.high)}
        </div>
        <div className="absolute bottom-1 right-2 rounded bg-ink-800/80 px-1.5 py-0.5 text-[8px] font-bold tabular-nums text-white/50">
          ▼ {money(d.low)}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[9px]">
        <span className="text-white/30">
          {-hours} saat → şimdi
          <span className="ml-2 text-white/20">· kesikli çizgi = orijinal taban {money(d.base)}</span>
        </span>
        <span className="font-display text-sm font-black tabular-nums" style={{ color }}>
          {money(d.cur)}
          <span className="ml-1.5 text-[9px] font-bold text-white/40">
            {up ? `▲ %${Math.round(((d.cur - d.start) / Math.max(d.start, 1)) * 100)}` : down ? `▼ %${Math.round(((d.start - d.cur) / Math.max(d.start, 1)) * 100)}` : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}
