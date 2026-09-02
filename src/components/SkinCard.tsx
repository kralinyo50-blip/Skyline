import React, { useState } from "react";
import { Package } from "lucide-react";
import { RARITY, fmtMoney, type Skin } from "../data/skins";
import { cn } from "../utils/cn";

/** Görsel — hata durumunda isimli fallback */
export function SkinImg({
  skin,
  className,
}: {
  skin: Skin;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  const color = RARITY[skin.rarity].color;

  if (err) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center gap-1.5", className)}
        style={{
          background: `radial-gradient(circle at 50% 40%, ${color}22, transparent 70%)`,
        }}
      >
        <Package className="h-8 w-8" style={{ color }} strokeWidth={1.5} />
        <span className="px-2 text-center font-display text-[10px] font-semibold tracking-wide text-white/70">
          {skin.weapon}
        </span>
      </div>
    );
  }

  return (
    <img
      src={skin.img}
      alt={`${skin.weapon} | ${skin.name}`}
      loading="lazy"
      draggable={false}
      onError={() => setErr(true)}
      className={cn(
        "skin-img-mask select-none object-contain transition-transform duration-300 ease-out hover:scale-[1.35] hover:z-10",
        className
      )}
      style={{
        filter: `drop-shadow(0 10px 18px rgba(0,0,0,0.55))`,
        imageRendering: "auto",
      }}
    />
  );
}

interface SkinCardProps {
  skin: Skin;
  size?: "xs" | "sm" | "md";
  price?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function SkinCard({
  skin,
  size = "md",
  price = true,
  selected,
  dimmed,
  badge,
  onClick,
  className,
}: SkinCardProps) {
  const r = RARITY[skin.rarity];

  const sizes = {
    xs: "p-2",
    sm: "p-2.5",
    md: "p-3",
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-gradient-to-b from-ink-700 to-ink-800 text-left transition-all duration-200 hover:z-20 hover:overflow-visible",
        selected ? "border-brand-500 shadow-[0_0_0_1px_#f98e1d,0_10px_30px_-10px_rgba(249,142,29,0.4)]" : "border-line hover:border-ink-500",
        onClick && "cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30",
        dimmed && "opacity-40 saturate-50",
        sizes,
        className
      )}
      style={{
        backgroundImage: `radial-gradient(120% 90% at 50% 0%, ${r.color}14 0%, transparent 55%), linear-gradient(to bottom, var(--color-ink-700), var(--color-ink-800))`,
      }}
    >
      {badge}
      {skin.st && (
        <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#cf6a32] px-1 py-px text-[8px] font-black uppercase tracking-wide text-white shadow-md">
          StatTrak™
        </span>
      )}
      {skin.sv && (
        <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#e4ae39] px-1 py-px text-[8px] font-black uppercase tracking-wide text-ink-950 shadow-md">
          Hatıra
        </span>
      )}
      <div className={cn("relative w-full overflow-visible", size === "xs" ? "h-16" : size === "sm" ? "h-20" : "h-24")}>
        <SkinImg skin={skin} className="mx-auto h-full w-full transition-all duration-300 ease-out group-hover:scale-[1.45] group-hover:z-10 group-hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]" />
      </div>
      <div className="mt-1.5 min-w-0">
        <div className="truncate text-[10px] font-medium uppercase tracking-wider text-white/45">
          {skin.weapon}
        </div>
        <div className="truncate font-display text-sm font-semibold leading-tight text-white/90">
          {skin.name}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ color: r.color, background: `${r.color}1c`, border: `1px solid ${r.color}33` }}
        >
          {r.tr}
        </span>
        {price && (
          <span className="font-display text-sm font-bold text-emerald-400">
            {fmtMoney(skin.price)}
          </span>
        )}
      </div>
      {/* alt rarity bar */}
      <div
        className="absolute inset-x-0 bottom-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }}
      />
    </button>
  );
}
