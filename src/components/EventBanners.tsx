import { useEffect, useState } from "react";
import { BadgePercent, Gift, Megaphone, Ticket, Waves } from "lucide-react";
import { money } from "../config";
import { waveFadeEnd } from "../data/skins";
import { raffleSkins } from "../store/raffle";
import { rafflePrizeLabel } from "./RafflePrizes";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return now;
}

function cd(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function EventBanners() {
  const { announcement, raffle, raffleEntered, enterRaffle, setTab, caseSale, economyWave, ads } = useGame();
  const now = useNow();
  const active = raffle && !raffle.drawn && !raffle.cancelled && now < raffle.endsAt;
  const saleActive = !!caseSale && !caseSale.cancelled && now < caseSale.endsAt;
  const waveActive = !!economyWave && !economyWave.cancelled && now < waveFadeEnd(economyWave) && now >= (economyWave.ts ?? 0) - 1000;

  /* admin reklam şeridi — ana menünün hemen altında döner */
  const [adIx, setAdIx] = useState(0);
  const adList = ads ?? [];
  useEffect(() => {
    if (adList.length < 2) return;
    const iv = window.setInterval(() => setAdIx((i) => (i + 1) % adList.length), 6000);
    return () => clearInterval(iv);
  }, [adList.length]);
  useEffect(() => {
    if (adIx >= adList.length) setAdIx(0);
  }, [adList.length, adIx]);
  const ad = adList.length ? adList[Math.min(adIx, adList.length - 1)] : null;

  return (
    <div className="relative z-10 space-y-2 px-4 pt-3 md:px-6 xl:px-[292px]">
      {ad && (
        <a
          href={ad.link || undefined}
          target={ad.link ? "_blank" : undefined}
          rel={ad.link ? "noopener noreferrer" : undefined}
          onClick={ad.link ? undefined : () => setTab("shop")}
          className="group flex w-full items-center gap-3 rounded-xl border border-yellow-400/35 bg-gradient-to-r from-yellow-400/12 via-amber-400/8 to-ink-900/70 px-4 py-2.5 text-left transition hover:border-yellow-400/70"
        >
          <span className="mt-0.5 shrink-0 text-lg leading-none">{ad.emoji || "📣"}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-black uppercase tracking-widest text-yellow-300">
              {ad.title}
            </div>
            <div className="truncate text-xs text-white/75">{ad.text}</div>
          </div>
          <span className="shrink-0 rounded-lg bg-yellow-400/15 px-2.5 py-1.5 text-[10px] font-black uppercase text-yellow-300 transition group-hover:bg-yellow-400/25">
            {ad.link ? "Bilgi Al →" : "Dükkana Git →"}
          </span>
        </a>
      )}

      {announcement && (
        <button
          onClick={() => setTab("community")}
          className="flex w-full items-start gap-3 rounded-xl border border-brand-500/30 bg-gradient-to-r from-brand-500/12 to-ink-900/60 px-4 py-2.5 text-left transition hover:border-brand-500/60"
        >
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-300">Duyuru</div>
            <div className="truncate text-xs text-white/75">{announcement.text}</div>
          </div>
          <span className="mt-1 text-[9px] font-bold text-white/30">Topluluk →</span>
        </button>
      )}

      {waveActive && (
        <button
          onClick={() => setTab("cases")}
          className="flex w-full items-center gap-3 rounded-xl border border-sky-400/40 bg-gradient-to-r from-sky-400/12 to-ink-900/60 px-4 py-2.5 text-left transition hover:border-sky-400/70"
        >
          <Waves className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-sky-300">
              {economyWave.direction === "down"
                ? `Piyasa çöküşü — skinler %${economyWave.surge} ucuzluyor`
                : `Ekonomik dalga — skinler +%${economyWave.surge} yükseliyor`}
            </div>
            <div className="truncate text-xs text-white/75">
              {economyWave.rareBoost > 0
                ? economyWave.direction === "down"
                  ? `Pahalı skinler ekstra düşüyor · bitişe `
                  : `Zor çıkanlar ekstra yükseliyor · bitişe `
                : `Bitişe `}
              <span className="font-bold tabular-nums text-white">{cd(economyWave.endsAt - now)}</span>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-sky-400/15 px-2.5 py-1.5 text-[10px] font-black uppercase text-sky-300">
            Fırsatı Gör →
          </span>
        </button>
      )}

      {saleActive && (
        <button
          onClick={() => setTab("cases")}
          className="flex w-full items-center gap-3 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/12 to-ink-900/60 px-4 py-2.5 text-left transition hover:border-emerald-500/70"
        >
          <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Kasa indirimi — %{caseSale.discount} ucuz
            </div>
            <div className="truncate text-xs text-white/75">
              {caseSale.caseIds.length} kasa indirimli · bitişe{" "}
              <span className="font-bold tabular-nums text-white">{cd(caseSale.endsAt - now)}</span>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-black uppercase text-emerald-300">
            Kasalara Git →
          </span>
        </button>
      )}

      {active && (
        <button
          onClick={() => {
            if (!raffleEntered) enterRaffle();
            setTab("community");
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition",
            raffleEntered
              ? "border-emerald-500/40 bg-emerald-500/8"
              : "border-amber-400/40 bg-gradient-to-r from-amber-400/12 to-ink-900/60 hover:border-amber-400/70"
          )}
        >
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
              {raffleSkins(raffle).length
                ? `Skin çekilişi — ${rafflePrizeLabel(raffle)}`
                : `Otomatik çekiliş — ${money(raffle.prize)}`}
            </div>
            <div className="truncate text-xs text-white/75">
              {Object.keys(raffle.participants ?? {}).length} katılımcı · bitişe{" "}
              <span className="font-bold tabular-nums text-white">{cd(raffle.endsAt - now)}</span>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-[10px] font-black uppercase text-amber-300">
            <Ticket className="h-3.5 w-3.5" />
            {raffleEntered ? "Katıldın" : "Katıl"}
          </span>
        </button>
      )}
    </div>
  );
}
