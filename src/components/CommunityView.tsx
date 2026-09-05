import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  Gift,
  Megaphone,
  Medal,
  PartyPopper,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { ADMIN_NAME, mcHead, money, vipLevelEntry, vipTierOfLevel } from "../config";
import { click, coinDing } from "../lib/audio";
import { SKIN_MAP } from "../data/skins";
import { raffleSkins } from "../store/raffle";
import { RafflePrizes, rafflePrizeLabel } from "./RafflePrizes";
import { useGame, levelFromSpent } from "../store/Game";
import { nameColorOf, titleLabel } from "../data/looks";
import { cn } from "../utils/cn";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return now;
}

function countdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function CommunityView() {
  const {
    announcement,
    raffle,
    raffleEntered,
    enterRaffle,
    firstLoginEvent,
    allUsers,
    weekWinner,
  } = useGame();
  const now = useNow();
  const skinPrizes = raffleSkins(raffle);
  /* süre bitti ama çekiliş henüz sonuçlanmadı — senkron toleransı (60 sn) */
  const raffleDrawing = !!raffle && !raffle.drawn && !raffle.cancelled && now >= raffle.endsAt;

  const leaderboard = useMemo(
    () =>
      allUsers
        .filter((u) => u.status === "approved" && !u.isAdmin)
        .map((u) => ({
          u,
          spent: u.pub?.spent ?? u.stats.spent,
          bestDrop: u.pub?.bestDrop ?? u.stats.bestDrop,
          opened: u.pub?.opened ?? u.stats.opened,
          balance: u.pub?.balance ?? u.balance,
        }))
        .sort((a, b) => b.spent - a.spent || b.bestDrop - a.bestDrop)
        .slice(0, 10),
    [allUsers]
  );

  const isWeekWinner = (key: string) => !!weekWinner && weekWinner.key === key;

  const raffleOpen = raffle && !raffle.drawn && !raffle.cancelled && now < raffle.endsAt;
  const raffleDone = raffle && raffle.drawn && !raffle.cancelled;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-300">
          <Users className="h-3.5 w-3.5" /> Topluluk
        </div>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          Etkinlikler &amp; <span className="text-brand-400">Liderlik</span>
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------- ÇEKİLİŞ ---------- */}
        <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/10 to-ink-900/70 p-5">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-black uppercase tracking-widest text-white/85">
              Otomatik Çekiliş
            </span>
            {raffleOpen && (
              <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
                Aktif
              </span>
            )}
          </div>

          {!raffle && (
            <p className="mt-4 py-6 text-center text-xs text-white/35">
              Şu an aktif çekiliş yok — yetkili bir sonraki çekilişi panelden başlatacak.
            </p>
          )}

          {raffle && (
            <>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">{skinPrizes.length ? "Skin ödülleri · tek kazanan" : "Ödül"}</div>
                  <div className="break-words font-display text-2xl font-black text-brand-300 sm:text-3xl">{rafflePrizeLabel(raffle)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    {raffleOpen ? "Kalan süre" : raffleDone ? "Kazanan" : raffleDrawing ? "Çekiliş yapılıyor…" : "Sona erdi"}
                  </div>
                  <div className="font-display text-2xl font-black tabular-nums text-white">
                    {raffleOpen ? countdown(raffle.endsAt - now) : raffle.winner?.name ?? "—"}
                  </div>
                </div>
              </div>

              <RafflePrizes raffle={raffle} />
              {skinPrizes.length > 1 && <p className="mt-2 text-[11px] text-white/45">Yukarıdaki {skinPrizes.length} skinin tamamı aynı kazananın envanterine eklenir.</p>}

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-ink-900/70 px-3 py-2 text-[11px] text-white/50">
                <Ticket className="h-3.5 w-3.5 text-brand-400" />
                {Object.keys(raffle.participants ?? {}).length} katılımcı
                <span className="ml-auto text-white/30">Başlatan: {raffle.startedBy ?? ADMIN_NAME}</span>
              </div>

              {raffleOpen && (
                <button
                  onClick={() => {
                    if (raffleEntered) return;
                    enterRaffle();
                    click();
                    coinDing();
                  }}
                  disabled={raffleEntered}
                  className={cn(
                    "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-base font-black uppercase tracking-wider transition",
                    raffleEntered
                      ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
                  )}
                >
                  {raffleEntered ? (
                    <><Sparkles className="h-4 w-4" /> Katıldın — iyi şanslar!</>
                  ) : (
                    <><Ticket className="h-4 w-4" /> Çekilişe Katıl</>
                  )}
                </button>
              )}

              {raffleDone && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                  <Crown className="h-5 w-5 text-emerald-400" />
                  <div className="min-w-0">
                    <div className="font-display text-sm font-black uppercase text-emerald-400">
                      {raffle.winner?.name ?? "Katılımcı yok"}
                    </div>
                    <div className="text-[10px] text-white/45">
                      {raffle.winner?.key
                        ? skinPrizes.length > 1
                          ? `${skinPrizes.length} skinin tamamını kazandı!`
                          : skinPrizes.length === 1
                            ? `"${rafflePrizeLabel(raffle)}" skinini kazandı!`
                            : `${money(raffle.prize)} ödülü kazandı!`
                        : "Çekiliş ödülsüz tamamlandı"}
                    </div>
                  </div>
                </div>
              )}

              {raffle?.cancelled && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-lose/40 bg-lose/10 px-4 py-3">
                  <X className="h-5 w-5 text-lose" />
                  <div>
                    <div className="font-display text-sm font-black uppercase text-lose">Çekiliş iptal edildi</div>
                    <div className="text-[10px] text-white/45">Yetkili çekilişi sonlandırdı</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ---------- GÜNÜN İLK GİRİŞİ ---------- */}
        <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/10 to-ink-900/70 p-5">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-black uppercase tracking-widest text-white/85">
              Günün İlk Giriş Ödülü
            </span>
            {firstLoginEvent?.active && (
              <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
                Aktif
              </span>
            )}
          </div>

          {!firstLoginEvent?.active ? (
            <p className="mt-4 py-6 text-center text-xs text-white/35">
              Bugün etkinlik kapalı — yetkili panelden başlatabilir.
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">Ödül</div>
                  <div className="font-display text-3xl font-black text-brand-300">{money(firstLoginEvent.reward)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">Durum</div>
                  <div className="font-display text-lg font-black text-white">
                    {firstLoginEvent.winner ? "Kazanan belli" : "İlk girişi bekliyor"}
                  </div>
                </div>
              </div>
              {firstLoginEvent.winner ? (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                  <Crown className="h-5 w-5 text-emerald-400" />
                  <div>
                    <div className="font-display text-sm font-black uppercase text-emerald-400">
                      {firstLoginEvent.winner.name}
                    </div>
                    <div className="text-[10px] text-white/45">
                      Bugünün ilk girişini yaptı ve {money(firstLoginEvent.reward)} kazandı
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-line bg-ink-900/70 px-4 py-3 text-[11px] leading-relaxed text-white/50">
                  Bugün <span className="font-bold text-brand-300">{money(firstLoginEvent.reward)}</span> kazanmak için
                  ilk giriş yapan sen ol — hesaplar onaylıysa otomatik verilir.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ---------- DUYURU ---------- */}
      <div className="mt-4 rounded-2xl border border-line bg-ink-900/70 p-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-brand-400" />
          <span className="font-display text-sm font-black uppercase tracking-widest text-white/85">
            Duyuru
          </span>
          {announcement && (
            <span className="ml-auto text-[10px] font-bold text-white/30">
              {new Date(announcement.ts).toLocaleString("tr-TR")}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {announcement?.text ?? "Bekleyen duyuru yok."}
        </p>
      </div>

      {/* ---------- HAFTANIN OYUNCUSU ---------- */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-ink-900/70">
        <div className="flex flex-wrap items-center gap-3 border-b border-amber-400/20 px-5 py-4">
          <Medal className="h-5 w-5 text-amber-300" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-black uppercase tracking-widest text-amber-300">
              Haftanın Oyuncusu
            </div>
            <div className="text-[10px] text-white/40">Bu hafta en çok harcayan oyuncu — Pazartesi 00:00'da yenilenir</div>
          </div>
        </div>
        {weekWinner ? (
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <img src={mcHead(weekWinner.name, 96)} alt={weekWinner.name} className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-black text-white">{weekWinner.name}</span>
                <Crown className="h-4 w-4 shrink-0 text-amber-300" fill="currentColor" strokeWidth={0} />
              </div>
              <div className="mt-0.5 text-[11px] text-white/45">
                Bu hafta <span className="font-bold text-amber-300">{money(weekWinner.spent)}</span> harcadı ·{" "}
                {weekWinner.opened} kasa açtı
              </div>
            </div>
            <span className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-300">
              Altın Rozet
            </span>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-xs text-white/35">
            Bu hafta henüz harcama yapan yok — ilk kasanı açan şampiyon olabilir!
          </p>
        )}
      </div>

      {/* ---------- LİDERLİK ---------- */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink-900/70">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="font-display text-sm font-black uppercase tracking-widest text-white/85">
            Liderlik Tablosu
          </span>
          <span className="ml-auto text-[10px] font-bold text-white/30">Toplam harcamaya göre</span>
        </div>

        {leaderboard.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/30">Henüz veri yok</p>
        ) : (
          <div className="divide-y divide-line">
            {leaderboard.map(({ u, spent, bestDrop, opened, balance }, i) => (
              <div key={u.key} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-black",
                    i === 0
                      ? "bg-amber-400/20 text-amber-300"
                      : i === 1
                        ? "bg-slate-300/15 text-slate-200"
                        : i === 2
                          ? "bg-orange-700/20 text-orange-400"
                          : "bg-ink-700 text-white/40"
                  )}
                >
                  {i + 1}
                </span>
                {u.pub?.look?.avatar ? (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-ink-700 text-lg">
                    {u.pub.look.avatar}
                  </div>
                ) : (
                  <img src={mcHead(u.name, 64)} alt={u.name} className="h-9 w-9 shrink-0 rounded" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="truncate font-display text-sm font-bold text-white"
                      style={{ color: nameColorOf(u.pub?.look?.nameColor) }}
                    >
                      {u.name}
                    </span>
                    {titleLabel(u.pub?.look?.unvan) && (
                      <span className="shrink-0 rounded bg-brand-500/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-brand-300">
                        {titleLabel(u.pub?.look?.unvan)}
                      </span>
                    )}
                    {isWeekWinner(u.key) && (
                      <span className="flex shrink-0 items-center gap-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300">
                        <Medal className="h-3 w-3" /> Haftanın Oyuncusu
                      </span>
                    )}
                    {(() => {
                      const lv = vipLevelEntry(u.pub?.vipLevel ?? 0);
                      const t = vipTierOfLevel(u.pub?.vipLevel ?? 0);
                      return lv ? (
                        <span
                          className="flex shrink-0 items-center gap-0.5 rounded px-1 text-[8px] font-black uppercase"
                          style={{ background: `${t.color}22`, color: t.color }}
                        >
                          {t.icon} {lv.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/35">
                    <span>
                      Seviye {levelFromSpent(spent)} · {opened} kasa · {money(balance)} bakiye
                    </span>
                    {(u.pub?.showcase ?? []).slice(0, 5).map((sid, si) => {
                      const s = SKIN_MAP[sid];
                      return s ? (
                        <img
                          key={si}
                          src={s.img}
                          alt={s.name}
                          title={`${s.weapon} | ${s.name}`}
                          className="h-4 w-5 rounded object-cover"
                          loading="lazy"
                        />
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-black text-brand-300">{money(spent)}</div>
                  <div className="text-[9px] text-white/30">en iyi: {money(bestDrop)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
