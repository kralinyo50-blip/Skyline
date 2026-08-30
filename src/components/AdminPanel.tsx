import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Banknote,
  Check,
  ClipboardCopy,
  CloudUpload,
  Clock,
  Coins,
  Minus,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Unplug,
  UserRoundCheck,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { ADMIN_NAME, mcHead, money } from "../config";
import { click, coinDing } from "../lib/audio";
import { useGame, levelFromSpent } from "../store/Game";
import { cn } from "../utils/cn";

type Sec = "users" | "deposits" | "players" | "sync";

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s} sn önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function Head({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <img
      src={mcHead(name, size * 2)}
      alt={name}
      className="shrink-0 rounded"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

export function AdminPanel() {
  const {
    pendingUserList,
    pendingDepositList,
    allUsers,
    allDeposits,
    approveUser,
    rejectUser,
    approveDeposit,
    rejectDeposit,
    adminAdjust,
    pushToast,
    syncUrl,
    syncStatus,
    setSyncUrl,
    syncCode,
    setSyncCode,
    syncNow,
  } = useGame();

  const [urlInput, setUrlInput] = useState(syncUrl ?? "");
  const [codeInput, setCodeInput] = useState(syncCode ?? "");
  const [copied, setCopied] = useState(false);

  const [sec, setSec] = useState<Sec>("deposits");
  const [q, setQ] = useState("");
  const [adjustInputs, setAdjustInputs] = useState<Record<string, string>>({});

  function applyAdjustment(key: string, name: string, direction: 1 | -1) {
    const raw = adjustInputs[key] ?? "";
    const amount = Math.round(Number(raw.replace(/[^\d]/g, "")) || 0);
    if (amount <= 0) {
      pushToast({ kind: "lose", title: "Geçerli bir tutar gir", sub: name });
      return;
    }
    adminAdjust(key, amount * direction);
    coinDing();
    pushToast({
      kind: direction > 0 ? "money" : "info",
      title: direction > 0 ? `${name} hesabına ${money(amount)} eklenecek` : `${name} hesabından ${money(amount)} silinecek`,
      sub: "Oyuncunun cihazına işlem gönderildi",
    });
    setAdjustInputs((prev) => ({ ...prev, [key]: "" }));
  }

  const players = useMemo(
    () =>
      allUsers
        .filter((u) => u.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => b.balance - a.balance),
    [allUsers, q]
  );

  const totalBalance = allUsers.reduce((a, u) => a + u.balance, 0);
  const approvedCount = allUsers.filter((u) => u.status === "approved").length;

  const SECTIONS: { key: Sec; label: string; Icon: typeof Users; badge: number }[] = [
    { key: "deposits", label: "Para Talepleri", Icon: Banknote, badge: pendingDepositList.length },
    { key: "users", label: "Üyelik Onayı", Icon: UserRoundCheck, badge: pendingUserList.length },
    { key: "players", label: "Oyuncular", Icon: Users, badge: 0 },
    { key: "sync", label: "Senkron", Icon: CloudUpload, badge: 0 },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      {/* başlık */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Yönetici Paneli
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Sunucu <span className="text-brand-400">Yönetimi</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Hoş geldin <span className="font-semibold text-brand-300">{ADMIN_NAME}</span> — başvuruları
            ve para taleplerini buradan yönet.
          </p>
        </div>
      </div>

      {/* istatistik kartları */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Kayıtlı oyuncu", val: allUsers.length.toString(), Icon: Users, color: "#4b69ff" },
          { label: "Onaylı oyuncu", val: approvedCount.toString(), Icon: BadgeCheck, color: "#2fd673" },
          { label: "Bekleyen talep", val: (pendingDepositList.length + pendingUserList.length).toString(), Icon: Clock, color: "#f98e1d" },
          { label: "Ekonomideki para", val: money(totalBalance), Icon: Coins, color: "#e4ae39" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-ink-900/70 p-4">
            <div
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: `${s.color}18`, color: s.color }}
            >
              <s.Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </div>
            <div className="font-display text-xl font-black text-white">{s.val}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/35">{s.label}</div>
          </div>
        ))}
      </div>

      {/* sekmeler */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SECTIONS.map(({ key, label, Icon, badge }) => (
          <button
            key={key}
            onClick={() => {
              setSec(key);
              click();
            }}
            className={cn(
              "relative flex items-center gap-2 rounded-xl border px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition",
              sec === key
                ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
                : "border-line bg-ink-800 text-white/45 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lose px-1.5 text-[10px] font-black text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---------------- PARA TALEPLERİ ---------------- */}
      {sec === "deposits" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Banknote className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Onay Bekleyen Para Talepleri
              </span>
              <span className="ml-auto text-xs text-white/35">{pendingDepositList.length} talep</span>
            </div>

            {pendingDepositList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <Check className="h-9 w-9 text-emerald-400/60" />
                <p className="text-sm text-white/40">Bekleyen para talebi yok</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                <AnimatePresence initial={false}>
                  {pendingDepositList.map((d) => (
                    <motion.div
                      key={d.id}
                      layout
                      exit={{ opacity: 0, x: 30 }}
                      className="flex flex-wrap items-center gap-3 p-4"
                      style={
                        d.kind === "withdraw"
                          ? { background: "linear-gradient(90deg, rgba(47,214,115,0.07), transparent 45%)" }
                          : undefined
                      }
                    >
                      <Head name={d.userName} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-display text-base font-bold text-white">{d.userName}</span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-black uppercase",
                              d.kind === "withdraw"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-brand-500/20 text-brand-300"
                            )}
                          >
                            {d.kind === "withdraw" ? "↑ Para Çekme" : "↓ Para Yatırma"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                          <span>{d.method}</span>
                          <span>•</span>
                          <span>{ago(d.ts)}</span>
                        </div>
                        {d.payTo && (
                          <div className="mt-1 truncate rounded bg-ink-900 px-2 py-1 font-mono text-[10px] text-white/55">
                            Ödeme: {d.payTo}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">
                          {d.kind === "withdraw" ? "Ödenecek (bloke)" : "Talep tutarı"}
                        </div>
                        <div
                          className={cn(
                            "font-display text-2xl font-black",
                            d.kind === "withdraw" ? "text-emerald-400" : "text-brand-300"
                          )}
                        >
                          {money(d.amount)}
                        </div>
                      </div>
                      <div className="flex w-full gap-2 sm:w-auto">
                        <button
                          onClick={() => {
                            approveDeposit(d.id);
                            coinDing();
                            pushToast({
                              kind: "money",
                              title: d.kind === "withdraw" ? "Çekim onaylandı" : "Yatırma onaylandı",
                              sub:
                                d.kind === "withdraw"
                                  ? `${d.userName} kişisine ${money(d.amount)} öde${d.payTo ? ` → ${d.payTo}` : ""}`
                                  : `${d.userName} → ${money(d.amount)}`,
                            });
                          }}
                          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 font-display text-sm font-bold text-ink-950 transition hover:brightness-110 sm:flex-none"
                        >
                          <Check className="h-4 w-4" strokeWidth={3} /> Onayla
                        </button>
                        <button
                          onClick={() => {
                            rejectDeposit(d.id);
                            pushToast({ kind: "lose", title: "Talep reddedildi", sub: d.userName });
                          }}
                          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-lose/40 bg-lose/10 px-5 font-display text-sm font-bold text-lose transition hover:bg-lose/20 sm:flex-none"
                        >
                          <X className="h-4 w-4" strokeWidth={3} /> Reddet
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* geçmiş */}
          <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
            <div className="border-b border-line px-4 py-3 font-display text-sm font-bold uppercase tracking-widest text-white/60">
              İşlem Geçmişi
            </div>
            {allDeposits.filter((d) => d.status !== "pending").length === 0 ? (
              <p className="py-8 text-center text-sm text-white/30">Henüz işlem yok</p>
            ) : (
              <div className="tiny-scroll max-h-72 divide-y divide-line overflow-y-auto">
                {allDeposits
                  .filter((d) => d.status !== "pending")
                  .map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <Head name={d.userName} size={24} />
                      <span className="font-semibold text-white/75">{d.userName}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1 py-0.5 text-[9px] font-black uppercase",
                          d.kind === "withdraw" ? "bg-emerald-500/15 text-emerald-400" : "bg-brand-500/15 text-brand-300"
                        )}
                      >
                        {d.kind === "withdraw" ? "Çekim" : "Yatır"}
                      </span>
                      <span className="font-display font-bold text-white/50">{money(d.amount)}</span>
                      <span className="ml-auto text-[11px] text-white/30">{ago(d.ts)}</span>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                          d.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-lose/15 text-lose"
                        )}
                      >
                        {d.status === "approved" ? "Onaylandı" : "Reddedildi"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- ÜYELİK ONAYI ---------------- */}
      {sec === "users" && (
        <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <UserRoundCheck className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
              Onay Bekleyen Üyelikler
            </span>
            <span className="ml-auto text-xs text-white/35">{pendingUserList.length} başvuru</span>
          </div>

          {pendingUserList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <Check className="h-9 w-9 text-emerald-400/60" />
              <p className="text-sm text-white/40">Bekleyen üyelik başvurusu yok</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {pendingUserList.map((u) => (
                  <motion.div key={u.key} layout exit={{ opacity: 0, x: 30 }} className="flex flex-wrap items-center gap-3 p-4">
                    <Head name={u.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-base font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-white/40">Başvuru {ago(u.createdAt)}</div>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <button
                        onClick={() => {
                          approveUser(u.key);
                          coinDing();
                          pushToast({
                            kind: "win",
                            title: "Oyuncu onaylandı",
                            sub: `${u.name} artık kasaları açabilir`,
                          });
                        }}
                        className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 font-display text-sm font-bold text-ink-950 transition hover:brightness-110 sm:flex-none"
                      >
                        <Check className="h-4 w-4" strokeWidth={3} /> Onayla
                      </button>
                      <button
                        onClick={() => {
                          rejectUser(u.key);
                          pushToast({ kind: "lose", title: "Başvuru reddedildi", sub: u.name });
                        }}
                        className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-lose/40 bg-lose/10 px-5 font-display text-sm font-bold text-lose transition hover:bg-lose/20 sm:flex-none"
                      >
                        <X className="h-4 w-4" strokeWidth={3} /> Reddet
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ---------------- OYUNCULAR ---------------- */}
      {/* ---------------- SENKRON AYARI ---------------- */}
      {sec === "sync" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ============ KOLAY MOD: SUNUCU KODU ============ */}
          <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/8 to-ink-900/70 p-5">
            <div className="flex items-center gap-2">
              <CloudUpload className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Sunucu Kodu ile Bağlan
              </span>
              <span
                className={cn(
                  "ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                  syncStatus === "ok"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : syncStatus === "error"
                      ? "bg-lose/15 text-lose"
                      : "bg-ink-600 text-white/40"
                )}
              >
                {syncStatus === "ok" ? (
                  <><Wifi className="h-3.5 w-3.5" /> Bağlı</>
                ) : syncStatus === "error" ? (
                  <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Yeniden deneniyor</>
                ) : syncStatus === "busy" ? (
                  <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Bağlanıyor</>
                ) : (
                  <><Unplug className="h-3.5 w-3.5" /> Kapalı</>
                )}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-white/50">
              Bu en kolay yol — <span className="font-bold text-white/75">kurulum gerektirmez.</span> Sen ve oyuncuların
              aynı kodu girin; talepler herkesin cihazına <span className="font-bold text-white/75">anında</span> düşer
              (offline olanlara da bağlanınca ulaşır).
            </p>

            <label className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-widest text-white/40">
              Sunucu Kodun
            </label>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="Örn: SKYLINE-7K2"
                maxLength={20}
                spellCheck={false}
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-ink-900 px-4 font-display text-lg font-bold uppercase tracking-widest text-white placeholder:text-white/20 focus:border-brand-500/60 focus:outline-none"
              />
              <button
                onClick={() => {
                  setSyncCode(codeInput.trim() ? codeInput : null);
                  click();
                }}
                className="h-12 shrink-0 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-5 font-display text-base font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110"
              >
                {syncCode ? "Güncelle" : "Bağlan"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {!syncCode && (
                <button
                  onClick={() => {
                    const c = `SKY-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(10 + Math.random() * 89)}`;
                    setCodeInput(c);
                    setSyncCode(c);
                    click();
                  }}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-ink-700 text-xs font-bold text-white/70 transition hover:text-white"
                >
                  Bana rastgele kod üret
                </button>
              )}
              {syncCode && (
                <>
                  <button
                    onClick={() => {
                      void navigator.clipboard?.writeText(syncCode);
                      setCopied(true);
                      coinDing();
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 text-xs font-bold text-brand-300 transition hover:bg-brand-500/20"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                    {copied ? "Kopyalandı!" : `Kodu Kopyala: ${syncCode}`}
                  </button>
                  <button
                    onClick={() => {
                      syncNow();
                      click();
                    }}
                    className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-700 px-3 text-xs font-bold text-white/60 transition hover:text-white"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" /> Yenile
                  </button>
                  <button
                    onClick={() => {
                      setSyncCode(null);
                      setCodeInput("");
                      pushToast({ kind: "info", title: "Senkron kapatıldı", sub: "Cihaz yalnızca yerelde çalışır" });
                    }}
                    className="flex h-9 items-center gap-1 rounded-lg border border-lose/40 bg-lose/10 px-3 text-xs font-bold text-lose transition hover:bg-lose/20"
                  >
                    <Unplug className="h-3.5 w-3.5" /> Kes
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/5 p-3 text-[11px] leading-relaxed text-white/50">
              Oyunculara göndermen gereken tek şey: <span className="font-bold text-brand-300">site adresi + bu kod.</span>{" "}
              Herkes Panel → Senkron sayfasından (kod girme ekranı girişteki sitede de görünür)
              aynı kodu yazınca otomatik bağlantı kurulur.
            </div>
          </div>

          {/* ============ GELİŞMİŞ: URL MODU ============ */}
          <div className="flex flex-col gap-4">
            <details className="group rounded-2xl border border-line bg-ink-900/70 p-5">
              <summary className="flex cursor-pointer list-none items-center gap-2">
                <CloudUpload className="h-4 w-4 text-white/40" />
                <span className="font-display text-sm font-bold uppercase tracking-widest text-white/60">
                  Gelişmiş: Kendi Depo URL'n (npoint vb.)
                </span>
                <span className="ml-auto text-[10px] font-bold text-white/30 group-open:hidden">Göster</span>
                <span className="ml-auto hidden text-[10px] font-bold text-white/30 group-open:block">Gizle</span>
              </summary>

              <div className="mt-4">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                  Depo URL'si
                </label>
                <div className="flex gap-2">
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://api.npoint.io/xxxxxxxxxx"
                    spellCheck={false}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-ink-900 px-3 text-xs text-white placeholder:text-white/25 focus:border-brand-500/60 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setSyncUrl(urlInput.trim() ? urlInput.trim() : null);
                      click();
                    }}
                    className="h-10 shrink-0 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 font-display text-sm font-bold text-brand-300 transition hover:bg-brand-500/20"
                  >
                    Bağla
                  </button>
                  {syncUrl && (
                    <button
                      onClick={() => {
                        setSyncUrl(null);
                        setUrlInput("");
                      }}
                      className="h-10 shrink-0 rounded-xl border border-lose/40 bg-lose/10 px-3 text-xs font-bold text-lose transition hover:bg-lose/20"
                    >
                      <Unplug className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-white/35">
                  Not: npoint kullanıyorsan <span className="font-mono">api.npoint.io</span> ile başlayan API
                  adresini yapıştır; <span className="font-mono">npoint.io/docs/...</span> sayfa linki ÇALIŞMAZ
                  (bağlantı hatası verir). Herhangi bir GET/PUT JSON uç noktası da olur.
                </p>
              </div>
            </details>

            {/* kurulum rehberi */}
            <div className="rounded-2xl border border-line bg-ink-900/70 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                  Oyuncuları nasıl bağlarım?
                </span>
              </div>
              <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-white/55">
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 font-display text-[11px] font-bold text-brand-300">1</span>
                  <span>Soldan bir kod belirle (ya da rastgele üret) ve <span className="font-bold text-white/80">Bağlan</span> de — durum yeşile dönünce hazırsın.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 font-display text-[11px] font-bold text-brand-300">2</span>
                  <span>Kodu kopyala, site adresiyle birlikte Discord'una/suna yaz.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 font-display text-[11px] font-bold text-brand-300">3</span>
                  <span>Aynı kodu giren herkesin talebi anında sana düşer — sen çevrimdışıyken gönderdikleri de sonradan ulaşır.</span>
                </li>
              </ol>
              <div className="mt-4 rounded-xl border border-line bg-ink-800/70 p-3 text-[11px] leading-relaxed text-white/40">
                Gizlilik: aynı kodu bilen herkes talep listesini görebilir; kod kimseyle
                paylaşılmamalıysa düzenli değiştir. Bakiye ve envanterler herkesin kendi
                cihazında durur; senin onayların uzaktan hesaplarına işlenir.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- OYUNCULAR ---------------- */}
      {sec === "players" && (
        <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <Users className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
              Tüm Oyuncular
            </span>
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-2.5">
              <Search className="h-3.5 w-3.5 text-white/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Oyuncu ara…"
                className="h-8 w-32 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none sm:w-44"
              />
            </div>
          </div>

          {players.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/30">Oyuncu bulunamadı</p>
          ) : (
            <div className="divide-y divide-line">
              {players.map((u) => (
                <div key={u.key} className="flex flex-wrap items-center gap-3 p-3.5">
                  <Head name={u.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-white">{u.name}</span>
                      {u.isAdmin && (
                        <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-brand-300">
                          Admin
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                          u.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : u.status === "pending"
                              ? "bg-brand-500/15 text-brand-300"
                              : "bg-lose/15 text-lose"
                        )}
                      >
                        {u.status === "approved" ? "Onaylı" : u.status === "pending" ? "Beklemede" : "Reddedildi"}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/35">
                      Seviye {levelFromSpent(u.stats.spent)} • {u.stats.opened} kasa • {u.inventory.length} eşya
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 font-display text-base font-black text-emerald-400">
                      {u.pub && Date.now() - u.pub.ts < 60000 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Çevrimiçi" />
                      )}
                      {money(u.pub?.balance ?? u.balance)}
                    </div>
                    {u.pub && (
                      <div className="text-[9px] text-white/25">uzaktan bildirim</div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex h-8 items-center gap-1 rounded-lg border border-line bg-ink-800 px-2 focus-within:border-brand-500/60">
                      <span className="text-[11px] font-bold text-white/30">$</span>
                      <input
                        value={adjustInputs[u.key] ?? ""}
                        onChange={(e) =>
                          setAdjustInputs((prev) => ({
                            ...prev,
                            [u.key]: e.target.value.replace(/[^\d]/g, ""),
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") applyAdjustment(u.key, u.name, 1);
                        }}
                        inputMode="numeric"
                        placeholder="Tutar"
                        className="h-full w-20 bg-transparent text-[11px] font-bold text-white placeholder:text-white/25 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => applyAdjustment(u.key, u.name, 1)}
                      className="flex h-8 items-center gap-0.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-500/20"
                    >
                      <Plus className="h-3 w-3" strokeWidth={3} /> Ekle
                    </button>
                    <button
                      onClick={() => applyAdjustment(u.key, u.name, -1)}
                      className="flex h-8 items-center gap-0.5 rounded-lg border border-lose/40 bg-lose/10 px-2 text-[11px] font-bold text-lose transition hover:bg-lose/20"
                    >
                      <Minus className="h-3 w-3" strokeWidth={3} /> Sil
                    </button>
                    {u.status !== "approved" && (
                      <button
                        onClick={() => approveUser(u.key)}
                        className="flex h-8 items-center rounded-lg border border-line bg-ink-700 px-2 text-[11px] font-bold text-white/60 hover:text-white"
                      >
                        Onayla
                      </button>
                    )}
                    {u.status === "approved" && !u.isAdmin && (
                      <button
                        onClick={() => rejectUser(u.key)}
                        className="flex h-8 items-center rounded-lg border border-line bg-ink-700 px-2 text-[11px] font-bold text-white/60 hover:text-lose"
                      >
                        Engelle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
