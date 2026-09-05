import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Flame, Package, PackageOpen, TrendingUp, Users } from "lucide-react";
import { CASES, casePrice, toCaseDef, type CaseDef } from "../data/cases";
import { fmtMoney, SKINS } from "../data/skins";
import { click, hoverPop } from "../lib/audio";
import { BRAND, CURRENCY, applyVipCaseDisc } from "../config";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { CaseModal } from "./CaseReel";
import { MissionsPanel } from "./MissionsPanel";

function CaseCard({ def, onSelect }: { def: CaseDef; onSelect: () => void }) {
  const { caseSale, priceSettings, vipLevel } = useGame();
  const price = applyVipCaseDisc(casePrice(def, caseSale, priceSettings), vipLevel);
  /* indirim, dalga sırasında da GÖRÜNÜR: rozet fiyat karşılaştırmasına değil
     etkinlik durumuna bakar (dalga güçlüyken indirimli fiyat bazın üstünde kalabilir) */
  const saleActive =
    !!caseSale && !caseSale.cancelled && caseSale.endsAt > Date.now() && caseSale.caseIds.includes(def.id);
  const saleOn = saleActive;
  const regPrice = saleActive ? casePrice(def, null, priceSettings) : price;
  const waveOn = !saleOn && price > def.price;
  const limited = def.limited || typeof def.stock === "number";
  return (
    <button
      onClick={() => {
        click();
        onSelect();
      }}
      onMouseEnter={hoverPop}
      className="card-sheen group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-ink-700 to-ink-900 p-5 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
      style={{
        backgroundImage: `radial-gradient(130% 90% at 50% -10%, ${def.accent}16 0%, transparent 55%), linear-gradient(to bottom, var(--color-ink-700), var(--color-ink-900))`,
      }}
    >
      {def.id === "sketch-case" && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink-950 shadow-lg">
          ✏️ El Çizimi Özel
        </span>
      )}
      {def.hot && def.id !== "sketch-case" && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-lose/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-lg">
          <Flame className="h-3 w-3" /> Popüler
        </span>
      )}
      {limited && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink-950 shadow-lg">
          <Package className="h-3 w-3" /> Sınırlı · {def.stock} kaldı
        </span>
      )}
      {saleOn && (
        <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink-950 shadow-lg">
          %{caseSale!.discount} İndirim
        </span>
      )}
      {!saleOn && waveOn && (
        <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-sky-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink-950 shadow-lg">
          {price > def.price ? "+" : "-"}%{Math.abs(Math.round((price / def.price - 1) * 100))} Dalga
        </span>
      )}
      <span
        className="absolute inset-x-0 top-0 h-[2px] opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${def.accent}, transparent)` }}
      />

      <div className="relative mx-auto h-40 w-full">
        <div
          className="absolute inset-4 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
          style={{ background: `${def.accent}40` }}
        />
        <img
          src={def.img}
          alt={def.name}
          draggable={false}
          className="relative h-full w-full object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.55)] transition-transform duration-300 group-hover:scale-[1.07] group-hover:-rotate-1"
        />
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <div className="font-display text-lg font-bold text-white">{def.name}</div>
          <span className="rounded bg-ink-600 px-1.5 py-0.5 text-[9px] font-bold text-white/40">
            {Object.values(def.contents).flat().length} eşya
          </span>
        </div>
        <div className="text-xs text-white/40">{def.tagline}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn("font-display text-lg font-black", saleOn ? "text-emerald-400" : "text-brand-300")}>
            {fmtMoney(price)}
          </span>
          {saleOn && <s className="text-xs font-bold text-white/35">{fmtMoney(regPrice)}</s>}
        </div>
        <span className="flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-3.5 py-1.5 font-display text-sm font-bold text-ink-950 transition group-hover:brightness-110 group-hover:shadow-[0_6px_20px_-6px_rgba(249,142,29,0.8)]">
          <PackageOpen className="h-4 w-4" strokeWidth={2.4} />
          Aç
        </span>
      </div>
    </button>
  );
}

import { PlayerCasesSection } from "./PlayerCases";

export function CasesView() {
  const [selected, setSelected] = useState<CaseDef | null>(null);
  const { userName, customCases } = useGame();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      {/* HERO */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-rar-milspec/10 blur-3xl" />

        <div className="relative flex flex-col items-start gap-6 p-6 sm:p-10 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-300">
              <Package className="h-3.5 w-3.5" /> {BRAND.name}
              {BRAND.suffix} Kasa Sistemi
            </div>
            <h1 className="font-display text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl">
              MERHABA {userName.toUpperCase()},
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-brand-600 bg-clip-text text-transparent">
                ŞANSINI DENE.
              </span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
              Şehirde kazandığın {CURRENCY.name} ile kasa aç, envanterini doldur,
              upgrader'da katla veya kasa savaşında rakiplerini ez.
            </p>

            <div className="mt-6 flex flex-wrap gap-5">
              {[
                { Icon: PackageOpen, label: "Farklı kasa", val: `${CASES.length}` },
                { Icon: Users, label: "Skin çeşidi", val: `${SKINS.length}+` },
                { Icon: TrendingUp, label: "En büyük kazanç", val: "$14,205" },
              ].map(({ Icon, label, val }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-800 text-brand-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-display text-base font-bold leading-none text-white">{val}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/35">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden shrink-0 md:block">
            <div className="absolute inset-8 rounded-full bg-brand-500/25 blur-3xl" />
            <img
              src={CASES[1].img}
              alt=""
              className="animate-floaty relative h-52 w-52 object-contain drop-shadow-2xl lg:h-64 lg:w-64"
            />
          </div>
        </div>
      </div>

      <MissionsPanel />

      <PlayerCasesSection />

      {/* KASA IZGARASI */}
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-xl font-bold uppercase tracking-widest text-white/85">
          Tüm Kasalar
        </h2>
        <span className="text-xs text-white/35">v2.0 · {CASES.length} kasa</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customCases
          .filter((c) => c.active && c.stock > 0)
          .map((c) => {
            const def = toCaseDef(c);
            return <CaseCard key={c.id} def={def} onSelect={() => setSelected(def)} />;
          })}
        {CASES.map((c) => (
          <CaseCard key={c.id} def={c} onSelect={() => setSelected(c)} />
        ))}
      </div>

      <AnimatePresence>
        {selected && <CaseModal def={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
