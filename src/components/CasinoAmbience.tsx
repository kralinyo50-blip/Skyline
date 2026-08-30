/* ----------------------------------------------------------------
   Casino Odası Ambiyansı — tüm siteyi saran yumuşak animasyonlu
   arka plan (ışık küreleri + neon grid + tarama çizgisi).
   Tamamen CSS, pointer-events yok, performans dostu.
---------------------------------------------------------------- */
const DOTS = [
  { left: "8%", top: "22%", delay: "0s" },
  { left: "16%", top: "68%", delay: "0.7s" },
  { left: "28%", top: "12%", delay: "1.4s" },
  { left: "41%", top: "58%", delay: "0.3s" },
  { left: "55%", top: "18%", delay: "1.9s" },
  { left: "63%", top: "74%", delay: "1.1s" },
  { left: "74%", top: "34%", delay: "2.3s" },
  { left: "84%", top: "62%", delay: "0.5s" },
  { left: "91%", top: "15%", delay: "1.6s" },
  { left: "47%", top: "86%", delay: "2.8s" },
];

export function CasinoAmbience() {
  return (
    <div className="casino-amb" aria-hidden>
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="grid" />
      <div className="scanline" />
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="neon-dot"
          style={{ left: d.left, top: d.top, animationDelay: d.delay }}
        />
      ))}
    </div>
  );
}
