import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Lock, Sparkles } from "lucide-react";
import { money } from "../config";
import { SKIN_MAP } from "../data/skins";
import {
  SEASON_MAX_LEVEL,
  SEASON_PREMIUM_PRICE,
  SEASON_TIERS,
  SEASON_XP_SOURCES,
  type SeasonReward,
} from "../data/season";
import { useGame } from "../store/Game";
import { click } from "../lib/audio";
import { cn } from "../utils/cn";

function rewardText(r: SeasonReward): { emoji: string; text: string; sub: string } {
  if (r.kind === "money") {
    return { emoji: "💵", text: money(r.amount ?? 0), sub: "hemen bakiyene" };
  }
  const s = r.skinId ? SKIN_MAP[r.skinId] : undefined;
  return {
    emoji: "🔫",
    text: s ? `${s.weapon} | ${s.name}` : r.label ?? r.skinId ?? "Skin",
    sub: "envantere düşer",
  };
}

function useCountdown(endsAt: number): string {
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const iv = window.setInterval(() => setLeft(Math.max(0, endsAt - Date.now())), 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return d > 0 ? `${d} gün ${h} sa` : h > 0 ? `${h} sa ${m} dk` : `${m} dk ${sec} sn`;
}

export function SeasonView() {
  const g = useGame();
  const [busy, setBusy] = useState(false);
  const countdown = useCountdown(g.season.endAt);

  const prog = g.seasonProgress;
  const level = g.seasonLevel;
  const need = g.seasonNeedXp || 1;
  const pct = Math.min(100, Math.round((g.seasonIntoXp / need) * 100));

  const claimable = useMemo(
    () => SEASON_TIERS.filter((t) => t.level <= level && !prog.claimed.includes(t.level)),
    [level, prog.claimed]
  );
  const claimablePrem = useMemo(
    () =>
      prog.premium
        ? SEASON_TIERS.filter((t) => t.level <= level && !prog.claimedPremium.includes(t.level))
        : [],
    [level, prog.premium, prog.claimedPremium]
  );

  function claimOne(lvl: number) {
    const r = g.claimSeasonReward(lvl);
    if (!r.ok && r.error) g.pushToast({ kind: "lose", title: "Ödül alınamadı", sub: r.error });
  }

  function claimAll() {
    setBusy(true);
    click();
    for (let l = 1; l <= level; l++) {
      if (!prog.claimed.includes(l)) g.claimSeasonReward(l);
      if (prog.premium && !prog.claimedPremium.includes(l)) g.claimSeasonReward(l);
    }
    setTimeout(() => setBusy(false), 250);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-24 pt-2 sm:px-4">
      {/* hero */}
      <div className="relative overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-400/30 to-orange-600/10 text-4xl ring-1 ring-amber-400/40">
            🏆
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
                Sezon {g.season.id} Yolu
              </h2>
              <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-brand-300">
                14 gün
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-white/40">
              ⏳ kalan: <span className="font-bold text-amber-300">{countdown}</span> · {SEASON_MAX_LEVEL} seviye · kasa, bahis, dükkan ve günlük ödülden XP kazan
            </div>
          </div>
          {!prog.premium && (
            <button
              onClick={() => {
                const r = g.buySeasonPremium();
                if (!r.ok && r.error) g.pushToast({ kind: "lose", title: "Premium", sub: r.error });
              }}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-orange-600 px-4 py-2.5 text-[12px] font-black uppercase text-ink-950 transition hover:brightness-110 active:scale-95"
            >
              <Crown className="h-4 w-4" /> Premium Yol — {money(SEASON_PREMIUM_PRICE)}
            </button>
          )}
          {prog.premium && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5 text-[11px] font-black uppercase text-amber-300">
              <Crown className="h-4 w-4" /> Premium Aktif
            </span>
          )}
        </div>

        {/* ilerleme */}
        <div className="relative mt-5">
          <div className="flex items-end justify-between text-[10px] text-white/45">
            <span>
              Seviye <span className="font-black text-white">{level}</span>
              {level >= SEASON_MAX_LEVEL && <span className="ml-1 text-emerald-400">Maksimum!</span>}
            </span>
            <span>
              {level < SEASON_MAX_LEVEL ? (
                <>
                  <span className="font-bold text-white">{g.seasonIntoXp}</span> / {need} XP
                </>
              ) : (
                "tamamlandı 🏁"
              )}
            </span>
          </div>
          <div className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-ink-950/80 ring-1 ring-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-fuchsia-500"
              initial={false}
              animate={{ width: `${level >= SEASON_MAX_LEVEL ? 100 : pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-white/35">
            {claimable.length > 0 && (
              <span className="font-bold text-emerald-400">
                🎁 {claimable.length} ücretsiz ödül hazır
              </span>
            )}
            {prog.premium && claimablePrem.length > 0 && (
              <span className="font-bold text-amber-300">
                👑 {claimablePrem.length} premium ödül hazır
              </span>
            )}
            {(claimable.length > 0 || claimablePrem.length > 0) && (
              <button
                onClick={claimAll}
                disabled={busy}
                className="rounded-lg bg-emerald-500/90 px-2.5 py-1 text-[10px] font-black text-ink-950 transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "…" : "Tümünü Al ⚡"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* ödül yolu */}
        <div className="rounded-2xl border border-line bg-ink-900/70 p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="text-[11px] font-black uppercase tracking-wide text-white/70">Ödül Yolu</div>
            <div className="flex items-center gap-3 text-[9px] text-white/35">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-white/30" /> Ücretsiz</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-400" /> Premium</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {SEASON_TIERS.map((t) => {
              const freeR = rewardText(t.free);
              const premR = t.prem ? rewardText(t.prem) : null;
              const freeClaimed = prog.claimed.includes(t.level);
              const premClaimed = prog.claimedPremium.includes(t.level);
              const freeReady = t.level <= level && !freeClaimed;
              const premReady = t.level <= level && !premClaimed && prog.premium;
              const lockedFree = t.level > level;
              return (
                <div
                  key={t.level}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition sm:gap-3",
                    lockedFree ? "border-line/50 bg-ink-950/40 opacity-60" : "border-line bg-ink-800/60"
                  )}
                >
                  {/* seviye */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg font-black",
                      freeReady ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950" : "bg-ink-900 text-white/50"
                    )}
                  >
                    <span className="text-[8px] leading-none uppercase">Sv</span>
                    <span className="text-sm leading-tight">{t.level}</span>
                  </div>
                  {/* xp ihtiyacı */}
                  <div className="hidden w-16 shrink-0 text-[8.5px] text-white/30 sm:block">
                    {t.need > 0 ? `${t.need} XP` : "🏁"}
                  </div>

                  {/* ücretsiz */}
                  <RewardCell
                    reward={freeR}
                    state={freeClaimed ? "claimed" : freeReady ? "ready" : "locked"}
                    onClick={() => freeReady && claimOne(t.level)}
                  />
                  {/* premium */}
                  <RewardCell
                    reward={premR ?? freeR}
                    prem
                    state={premClaimed ? "claimed" : premReady ? "ready" : "locked"}
                    onClick={() => premReady && claimOne(t.level)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* kenar panel */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-ink-900/70 p-3.5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-brand-300" /> Nasıl XP kazanılır?
            </div>
            <div className="space-y-1.5">
              {SEASON_XP_SOURCES.map((s) => (
                <div key={s.label} className="flex items-center justify-between rounded-lg bg-ink-800/70 px-2.5 py-2">
                  <span className="flex items-center gap-2 text-[10.5px] text-white/60">
                    <span className="text-base">{s.icon}</span> {s.label}
                  </span>
                  <span className="font-black text-brand-300">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 text-[9px] leading-relaxed text-white/30">
              Sezon bitince ilerleme sıfırlanır, yeni ödül yolu başlar. Premium yolu sezon başına bir kez satın alınır.
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-amber-300">
              <Crown className="h-3.5 w-3.5" /> Premium Öne Çıkanlar
            </div>
            <ul className="space-y-1 text-[10px] text-white/50">
              <li>• Ücretsiz yolun <b className="text-white/75">2 katı</b> para ödülleri</li>
              <li>• 5, 10, 15, 20, 25, 30, 35. seviye efsane skinler</li>
              <li>• 40. seviye: <b className="text-fuchsia-300">AWP | Dragon Lore</b></li>
              <li>• Sıralı zorunluluk yok — anında açılır</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-ink-900/70 p-3.5 text-[10px] leading-relaxed text-white/35">
            💡 <b className="text-white/60">İpucu:</b> Ödülleri tek tek de alabilirsin. Skin ödülleri doğrudan
            envantere düşer — pazarda satabilir ya da takasta kullanabilirsin.
          </div>
        </div>
      </div>
    </div>
  );
}

function RewardCell({
  reward,
  state,
  prem,
  onClick,
}: {
  reward: { emoji: string; text: string; sub: string };
  state: "ready" | "claimed" | "locked";
  prem?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state !== "ready"}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition",
        prem ? "border-amber-400/20 bg-amber-400/[0.04]" : "border-line bg-ink-900/60",
        state === "ready" && "cursor-pointer border-emerald-500/40 bg-emerald-500/[0.07] hover:brightness-110",
        state === "claimed" && "opacity-55"
      )}
    >
      <span className="shrink-0 text-lg">{state === "claimed" ? "✅" : state === "locked" ? <Lock className="h-3.5 w-3.5 text-white/25" /> : reward.emoji}</span>
      <span className="min-w-0">
        <span className="block truncate text-[10.5px] font-black text-white/85">{reward.text}</span>
        <span className="block text-[8.5px] text-white/35">{reward.sub}</span>
      </span>
      {state === "ready" && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-ink-950">
          Al
        </span>
      )}
      {prem && state !== "claimed" && (
        <Crown className={cn("ml-auto h-3 w-3 shrink-0", state === "locked" ? "text-white/15" : "text-amber-400/70")} />
      )}
    </button>
  );
}
