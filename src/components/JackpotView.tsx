import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  Coins,
  Crown,
  History,
  LogOut,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { mcHead, money, JACKPOT_ROUND_MS } from "../config";
import { SKIN_MAP } from "../data/skins";
import { itemTitle, itemValue } from "../data/items";
import { click, coinDing } from "../lib/audio";
import { useGame, levelFromSpent } from "../store/Game";
import { cn } from "../utils/cn";
import { SkinImg } from "./SkinCard";
import { Confetti } from "./CaseReel";

function useNow(ms = 500) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [ms]);
  return now;
}

function countdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* ---------- pota eşya katma modalı ---------- */
function JoinModal({ onClose }: { onClose: () => void }) {
  const { inventory, jackpotJoin, pushToast, priceVersion } = useGame();
  const [sel, setSel] = useState<Set<string>>(new Set());

  const sorted = useMemo(
    () => [...inventory].sort((a, b) => itemValue(b) - itemValue(a)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventory, priceVersion]
  );

  const selValue = useMemo(
    () => sorted.filter((i) => sel.has(i.uid)).reduce((a, i) => a + itemValue(i), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, sel, priceVersion]
  );

  function join() {
    if (!sel.size) {
      pushToast({ kind: "lose", title: "Eşya seç", sub: "Pota en az bir eşya koymalısın" });
      return;
    }
    const res = jackpotJoin([...sel]);
    if (!res.ok) {
      pushToast({ kind: "lose", title: "Katılınamadı", sub: res.error ?? "Tekrar dene" });
      return;
    }
    click();
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="tiny-scroll flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-line bg-ink-800 px-5 py-3.5">
          <PackageOpen className="h-4 w-4 text-brand-400" />
          <span className="font-display text-lg font-bold">Pota Eşya Koy</span>
          <span className="ml-auto rounded-lg border border-line bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-white/50">
            {sel.size} eşya · {money(selValue)}
          </span>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4">
          {sorted.length === 0 && (
            <p className="col-span-full py-10 text-center text-xs text-white/35">
              Envanterin boş — kasa açıp eşya kazan!
            </p>
          )}
          {sorted.map((it) => {
            const skin = SKIN_MAP[it.skinId];
            if (!skin) return null;
            const on = sel.has(it.uid);
            return (
              <button
                key={it.uid}
                onClick={() =>
                  setSel((prev) => {
                    const n = new Set(prev);
                    if (n.has(it.uid)) n.delete(it.uid);
                    else n.add(it.uid);
                    return n;
                  })
                }
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-xl border p-2 text-left transition",
                  on
                    ? "border-brand-500 bg-brand-500/10 shadow-[0_0_0_1px_#f98e1d]"
                    : "border-line bg-ink-800 hover:border-ink-500"
                )}
              >
                <SkinImg skin={skin} className="h-16 w-full" />
                <div className="mt-1 truncate text-[10px] font-medium text-white/60">
                  {itemTitle(it).main}
                </div>
                <div className="mt-0.5 font-display text-sm font-black text-emerald-400">
                  {money(itemValue(it))}
                </div>
                {on && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-black text-ink-950">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-ink-800 px-5 py-3.5">
          <p className="text-[10px] leading-relaxed text-white/35">
            Pota koyduğun eşyalar anında envanterden düşer. Tura katılmadıysan zaman dolmadan
            geri alabilirsin; tur bittiğinde pot sahibi hepsini alır.
          </p>
          <button
            onClick={join}
            disabled={!sel.size}
            className="ml-auto flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-6 font-display text-sm font-bold text-ink-950 transition hover:brightness-110 disabled:opacity-40"
          >
            <Crown className="h-4 w-4" /> Pota Gir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- ana ekran ---------- */
export function JackpotView() {
  const { jackpot, jackpotLeave, showcase, celebrateLocal, allUsers } = useGame();
  const now = useNow();
  const [joinOpen, setJoinOpen] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const jp = jackpot;
  const potTotal = useMemo(
    () => (jp?.entries ?? []).reduce((a, e) => a + e.total, 0),
    [jp]
  );
  const meEntry = jp?.entries.find((e) => e.me) ?? null;
  const meChance = potTotal > 0 && meEntry ? (meEntry.total / potTotal) * 100 : 0;
  const timeLeft = jp ? Math.max(0, jp.endsAt - now) : 0;
  const drawing = !!jp?.winner;
  const joined = !!meEntry;

  /* kazanınca vitrine otomatik en iyi 3'ü koy */
  useEffect(() => {
    if (jp?.winner?.me && !showJoin) {
      setShowJoin(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jp?.winner?.me]);

  useEffect(() => {
    if (jp?.winner?.me) celebrateLocal("JACKPOT!", `${money(jp.winner.value)} değerinde pot kazandın`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jp?.winner?.me]);

  const allItems = (jp?.entries ?? []).flatMap((e) =>
    e.items.map((it) => ({ it, owner: e.name, me: e.me }))
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rar-rare/40 bg-rar-rare/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rar-rare">
            <Crown className="h-3.5 w-3.5" /> Canlı Pot
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Jack<span className="text-brand-400">pot</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-3 py-2 text-[11px] font-semibold text-white/45">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Adil çekiliş — tüm pot tek kazananın
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ---------- pot alanı ---------- */}
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-2xl border border-rar-rare/30 bg-gradient-to-b from-rar-rare/10 to-ink-900/80 p-5">
            {/* pot başlığı */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rar-rare to-brand-600 shadow-[0_8px_28px_-8px_rgba(228,174,57,0.7)]">
                <Trophy className="h-7 w-7 text-ink-950" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Pot Değeri · #{jp?.round ?? "—"}
                </div>
                <div className="font-display text-3xl font-black text-emerald-400 drop-shadow-[0_0_24px_rgba(47,214,115,0.3)]">
                  {money(potTotal)}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {drawing ? "Çekiliş yapılıyor" : "Kalan süre"}
                </div>
                <div
                  className={cn(
                    "font-display text-3xl font-black tabular-nums",
                    drawing ? "animate-pulse text-rar-rare" : timeLeft < 10000 ? "text-lose" : "text-white"
                  )}
                >
                  {drawing ? "🎲" : countdown(timeLeft)}
                </div>
              </div>
            </div>

            {/* durum çubuğu */}
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-950/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 via-rar-rare to-brand-600"
                animate={{ width: `${jp ? Math.min(100, (1 - timeLeft / JACKPOT_ROUND_MS) * 100) : 0}%` }}
                transition={{ ease: "linear", duration: 0.5 }}
              />
            </div>

            {/* katılımcılar */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {(jp?.entries ?? []).map((e) => {
                const u = !e.bot && e.userId ? allUsers.find((x) => x.key === e.userId) : undefined;
                return (
                <div
                  key={e.id}
                  className={cn(
                    "rounded-xl border p-2.5 transition",
                    e.me ? "border-emerald-500/60 bg-emerald-500/5" : "border-line bg-ink-800/70"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <img src={mcHead(e.name, 40)} alt="" className="h-7 w-7 rounded" style={{ imageRendering: "pixelated" }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 truncate text-xs font-bold text-white">
                        {e.me ? "Sen" : e.name}
                        {e.me && <Crown className="h-3 w-3 shrink-0 text-emerald-400" />}
                        {!e.bot && !e.me && (
                          <span className="flex shrink-0 items-center gap-1 rounded bg-emerald-500/15 px-1 py-px text-[8px] font-black uppercase tracking-wider text-emerald-300">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                            CANLI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-display text-[11px] font-black text-emerald-400">
                        {money(e.total)}
                        {u && (
                          <span className="text-[8px] font-bold text-white/30">
                            Lv{levelFromSpent(u.stats.spent)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-0.5">
                    {e.items.slice(0, 6).map((it, i) => {
                      const s = SKIN_MAP[it.skinId];
                      return s ? (
                        <img
                          key={i}
                          src={s.img}
                          alt={s.name}
                          title={s.name}
                          className="h-5 w-5 rounded object-cover"
                          loading="lazy"
                        />
                      ) : null;
                    })}
                    {e.items.length > 6 && (
                      <span className="text-[9px] font-bold text-white/40">+{e.items.length - 6}</span>
                    )}
                  </div>
                </div>
                );
              })}
              {(jp?.entries ?? []).length === 0 && !drawing && (
                <p className="col-span-full py-6 text-center text-xs text-white/30">
                  Pot açıldı — oyuncular geliyor…
                </p>
              )}
            </div>

            {/* pottaki eşyalar */}
            {allItems.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <Sparkles className="h-3.5 w-3.5 text-brand-400" /> Pottaki Eşyalar ({allItems.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allItems.map(({ it, owner, me }, i) => {
                    const s = SKIN_MAP[it.skinId];
                    return s ? (
                      <div
                        key={i}
                        title={`${owner} — ${s.weapon} | ${s.name} — ${money(it.value)}`}
                        className={cn(
                          "flex items-center gap-1 rounded-lg border bg-ink-800/80 px-1.5 py-1",
                          me ? "border-emerald-500/40" : "border-line"
                        )}
                      >
                        <img src={s.img} alt="" className="h-8 w-10 object-cover" loading="lazy" />
                        <div className="pr-1">
                          <div className="max-w-24 truncate text-[9px] font-semibold text-white/60">
                            {s.weapon} | {s.name}
                          </div>
                          <div className="text-[10px] font-black text-emerald-400">{money(it.value)}</div>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* aksiyon bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!joined && !drawing && (
                <>
                  <button
                    onClick={() => {
                      setJoinOpen(true);
                      click();
                    }}
                    className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-7 font-display text-base font-black text-ink-950 transition hover:brightness-110 hover:shadow-[0_10px_32px_-8px_rgba(47,214,115,0.6)]"
                  >
                    <Coins className="h-5 w-5" /> Pota Katıl
                  </button>
                  <p className="max-w-xs text-[10px] leading-relaxed text-white/35">
                    Envanterinden eşya seç; pot kapanmadan 5 saniye öncesine kadar girebilirsin.
                  </p>
                </>
              )}
              {joined && !drawing && (
                <>
                  <div className="flex h-12 items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 font-display text-base font-black text-emerald-300">
                    <Crown className="h-5 w-5" /> Potta! %{meChance.toFixed(1)} şans
                  </div>
                  <button
                    onClick={() => {
                      jackpotLeave();
                      coinDing();
                    }}
                    className="flex h-12 items-center gap-2 rounded-xl border border-line bg-ink-800 px-5 font-display text-sm font-bold text-white/70 transition hover:border-lose/50 hover:text-lose"
                  >
                    <LogOut className="h-4 w-4" /> Çık ve Eşyalarımı Al
                  </button>
                </>
              )}
              {drawing && (
                <div className="flex h-12 items-center gap-2 rounded-xl border border-rar-rare/40 bg-rar-rare/10 px-5 font-display text-base font-black text-rar-rare">
                  <Trophy className="h-5 w-5" /> Çekiliş sonuçlanıyor…
                </div>
              )}
            </div>
          </div>

          {/* ---------- kazanan ekranı ---------- */}
          <AnimatePresence>
            {jp?.winner && (
              <motion.div
                initial={{ opacity: 0, y: 22, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "relative mt-4 overflow-hidden rounded-2xl border border-rar-rare/50 bg-gradient-to-b from-rar-rare/25 to-ink-900 p-5 text-center",
                  showJoin && "animate-goldring"
                )}
              >
                {jp.winner.me && <Confetti colors={["#2fd673", "#e4ae39", "#ffffff"]} />}
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
                  Tur Kazananı
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 font-display text-2xl font-black text-white">
                  <Trophy className="h-6 w-6 text-rar-rare" />
                  {jp.winner.me ? "SENSİN! 🎉" : jp.winner.name}
                </div>
                <div className="font-display text-3xl font-black text-emerald-400">
                  +{money(jp.winner.value)}
                </div>
                <p className="mt-1 text-[11px] text-white/40">
                  {jp.winner.me
                    ? "Tüm pot envanterine eklendi — vitrine de en değerlileri koymayı unutma!"
                    : "Bir sonraki turda pot senin olabilir — katıl!"}
                </p>
                <button
                  onClick={() => setShowJoin(false)}
                  className="mt-3 rounded-lg border border-line bg-ink-800 px-4 py-1.5 text-[11px] font-semibold text-white/50 hover:text-white"
                >
                  Kapat
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------- yan panel ---------- */}
        <div className="flex flex-col gap-4">
          {/* vitrin */}
          <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-black uppercase tracking-widest text-white/80">
                Vitrinin
              </span>
              <span className="ml-auto text-[10px] font-bold text-white/35">{showcase.length}/5</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => {
                const it = showcase[i];
                const skin = it ? SKIN_MAP[it.skinId] : null;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex aspect-square items-center justify-center overflow-hidden rounded-lg border",
                      skin ? "border-line bg-ink-800" : "border-dashed border-line/60"
                    )}
                  >
                    {skin ? (
                      <SkinImg skin={skin} className="h-full w-full" />
                    ) : (
                      <span className="text-[9px] font-bold text-white/20">BOŞ</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/35">
              Jackpot kazanınca en değerli eşyaların otomatik vitrine düşer. Profil sekmesinden
              dilediğini değiştirebilirsin.
            </p>
          </div>

          {/* geçmiş */}
          <div className="flex-1 rounded-2xl border border-line bg-ink-900/70 p-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-white/40" />
              <span className="font-display text-sm font-black uppercase tracking-widest text-white/80">
                Son Kazananlar
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {(jp?.history ?? []).slice(0, 8).map((h, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-ink-800/70 px-2.5 py-1.5">
                  <img src={mcHead(h.name, 32)} alt="" className="h-6 w-6 rounded" style={{ imageRendering: "pixelated" }} />
                  <span className={cn("min-w-0 truncate text-xs font-bold", h.me ? "text-emerald-300" : "text-white/70")}>
                    {h.me ? "Sen" : h.name}
                  </span>
                  <span className="ml-auto font-display text-xs font-black text-emerald-400">
                    {money(h.value)}
                  </span>
                </div>
              ))}
              {(jp?.history ?? []).length === 0 && (
                <p className="py-4 text-center text-[10px] text-white/25">Henüz kazanan yok</p>
              )}
            </div>
          </div>

          {/* nasıl çalışır */}
          <div className="rounded-2xl border border-line bg-ink-900/70 p-4 text-[10px] leading-relaxed text-white/40">
            <div className="mb-1.5 flex items-center gap-1.5 font-display text-xs font-black uppercase tracking-widest text-white/70">
              <ArrowLeftRight className="h-3.5 w-3.5 text-brand-400" /> Nasıl Çalışır?
            </div>
            1. Tur açılır, botlar pota eşya koyar.
            <br />
            2. Sen de envanterinden eşya koyarsın.
            <br />
            3. Süre dolunca ağırlıklı çekiliş yapılır — koyduğun değer arttıkça şansın artar.
            <br />
            4. Kazanan <b className="text-white/70">tüm potu</b> alır.
          </div>
        </div>
      </div>

      <AnimatePresence>{joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}</AnimatePresence>
    </div>
  );
}
