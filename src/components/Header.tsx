import { useEffect, useState } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import {
  Backpack,
  Banknote,
  Boxes,
  ChartNoAxesCombined,
  ChevronsUp,
  Check,
  Clock,
  Crown,
  Dices,
  Gift,
  Handshake,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Swords,
  Trophy,
  Unplug,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import { useGame, DAILY_COOLDOWN, type TabKey } from "../store/Game";
import { ADMIN_NAME, BRAND, CURRENCY, SCALE, VIP_TIERS, mcHead, money } from "../config";
import { DEFAULT_DEPOSIT_PACKS } from "../store/db";
import { CASES } from "../data/cases";
import { SKIN_MAP } from "../data/skins";
import { click, coinDing } from "../lib/audio";
import { loadPrefs, savePrefs, type Prefs } from "../lib/prefs";
import { cn } from "../utils/cn";
import { ReferralModal } from "./ReferralModal";

const TABS: { key: TabKey; label: string; Icon: typeof Boxes }[] = [
  { key: "cases", label: "Kasalar", Icon: Boxes },
  { key: "upgrader", label: "Upgrader", Icon: ChevronsUp },
  { key: "battle", label: "Savaş", Icon: Swords },
  { key: "games", label: "Oyunlar", Icon: Dices },
  { key: "jackpot", label: "Jackpot", Icon: Trophy },
  { key: "market", label: "Pazar", Icon: Store },
  { key: "trade", label: "Takas", Icon: Handshake },
  { key: "inventory", label: "Envanter", Icon: Backpack },
  { key: "stats", label: "Profilim", Icon: ChartNoAxesCombined },
  { key: "community", label: "Topluluk", Icon: Users },
];

function AnimatedMoney({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 140, damping: 22 });
  useEffect(() => spring.set(value), [value, spring]);
  const text = useTransform(spring, (v) => money(v));
  return <motion.span>{text}</motion.span>;
}

const PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];
const METHODS = ["Banka / IBAN", "Papara", "Oyun İçi Transfer", "Kripto"];
const MIN_WITHDRAW = 5000;

function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export function Header() {
  const {
    balance, tab, setTab, inventory, muted, toggleMute, pushToast,
    level, levelTitleStr, levelProgress, xpCurrent, xpNeeded,
    lastDaily, claimDaily, isAdmin, userName, logout,
    requestDeposit, requestWithdraw, heldBalance, myDeposits, pendingDepositList, pendingUserList,
    depositPacks, redeemCoupon, couponBonus, respondDepositOffer,
    syncCode, setSyncCode, syncStatus,
    vipTier, vipNext, vipSpent, vipActive,
  } = useGame();

  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [payTo, setPayTo] = useState("");

  const [connectOpen, setConnectOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [optsOpen, setOptsOpen] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>(() => loadPrefs());

  function updatePref(p: Partial<Prefs>) {
    const next = { ...prefs, ...p };
    setPrefsState(next);
    savePrefs(next);
    click();
  }

  const [depositOpen, setDepositOpen] = useState(false);
  const [amount, setAmount] = useState("10000");
  const [couponCode, setCouponCode] = useState("");
  const [method, setMethod] = useState(METHODS[0]);
  const [sent, setSent] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [claimed, setClaimed] = useState<number | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);

  const vipProgress = vipNext
    ? Math.min(100, Math.round((vipSpent / vipNext.minSpent) * 100))
    : 100;

  const dailyReady = !lastDaily || Date.now() - lastDaily >= DAILY_COOLDOWN;
  const dailyLeftMs = lastDaily ? Math.max(0, lastDaily + DAILY_COOLDOWN - Date.now()) : 0;
  const dailyLeftH = Math.floor(dailyLeftMs / 3600000);
  const dailyLeftM = Math.floor((dailyLeftMs % 3600000) / 60000);

  const myPending = myDeposits.filter((d) => d.status === "pending");
  const adminBadge = pendingDepositList.length + pendingUserList.length;
  const amountNum = Math.max(0, Math.round(Number(amount.replace(/[^\d]/g, "")) || 0));

  /* yatırma paketleri — admin panelinden değiştirilebilir */
  const packs = [...(depositPacks?.packs?.length ? depositPacks.packs : DEFAULT_DEPOSIT_PACKS)].sort(
    (a, b) => a.amount - b.amount
  );
  const activePack = mode === "deposit" ? packs.find((p) => p.amount === amountNum) : undefined;
  const credit = amountNum + Math.round((amountNum * (activePack?.bonus ?? 0)) / 100);
  const giftLabel = (g?: { kind: string; id: string; count: number }) => {
    if (!g) return null;
    if (g.kind === "case") {
      const c = CASES.find((x) => x.id === g.id);
      return `${g.count > 1 ? g.count + "× " : ""}${c ? c.name : g.id}`;
    }
    const sk = SKIN_MAP[g.id];
    return sk ? `${sk.weapon} | ${sk.name}` : g.id;
  };

  const allTabs: typeof TABS = isAdmin
    ? [...TABS, { key: "admin" as TabKey, label: "Panel", Icon: ShieldCheck }]
    : TABS;

  function submitRequest() {
    if (mode === "withdraw") {
      if (amountNum < MIN_WITHDRAW) {
        pushToast({ kind: "lose", title: "Çok düşük tutar", sub: `En az ${money(MIN_WITHDRAW)} çekebilirsin` });
        return;
      }
      if (amountNum > balance) {
        pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: `Kullanılabilir: ${money(balance)}` });
        return;
      }
      if (!payTo.trim()) {
        pushToast({ kind: "lose", title: "Ödeme bilgisi gerekli", sub: "IBAN / nick / cüzdan yaz" });
        return;
      }
      click();
      if (!requestWithdraw(amountNum, method, payTo.trim())) return;
    } else {
      if (amountNum < 100) {
        pushToast({ kind: "lose", title: "Geçersiz tutar", sub: `En az ${money(100)} talep edebilirsin` });
        return;
      }
      click();
      requestDeposit(amountNum, method);
    }
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setDepositOpen(false);
    }, 1700);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4">
          {/* logo */}
          <button onClick={() => setTab("cases")} className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_4px_16px_-4px_rgba(249,142,29,0.6)]">
              <Sparkles className="h-5 w-5 text-ink-950" strokeWidth={2.4} />
            </div>
            <div className="hidden font-display text-xl font-bold tracking-wide sm:block">
              {BRAND.name}
              <span className="text-brand-400">{BRAND.suffix}</span>
            </div>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* seviye */}
            <div
              className="hidden items-center gap-2 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 xl:flex"
              title={`Seviye ${level} ${levelTitleStr} — ${xpCurrent.toFixed(0)}/${xpNeeded.toFixed(0)} XP`}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-brand-600 font-display text-[11px] font-black text-ink-950">
                {level}
              </div>
              <div>
                <div className="text-[10px] font-bold leading-none text-white/80">{levelTitleStr}</div>
                <div className="mt-1 h-1 w-14 overflow-hidden rounded-full bg-ink-600">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
                    style={{ width: `${levelProgress * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* sunucu senkronu */}
            <button
              onClick={() => {
                setCodeDraft(syncCode ?? "");
                setConnectOpen(true);
                click();
              }}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg border transition",
                syncStatus === "ok"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : syncCode
                    ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
                    : "border-line bg-ink-800 text-white/40 hover:text-white/70"
              )}
              title={syncCode ? `Sunucuya bağlı: ${syncCode}` : "Sunucuya bağlan"}
            >
              <Wifi className="h-4 w-4" />
              {syncStatus === "ok" && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* günlük ödül */}
            <button
              onClick={() => {
                setDailyOpen(true);
                click();
              }}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg border transition",
                dailyReady
                  ? "border-brand-500/50 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20"
                  : "border-line bg-ink-800 text-white/40 hover:text-white/70"
              )}
              title="Günlük ödül"
            >
              <Gift className="h-4 w-4" />
              {dailyReady && (
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                  <span className="h-full w-full rounded-full bg-brand-400" />
                </span>
              )}
            </button>

            {/* VIP */}
            <button
              onClick={() => {
                setVipOpen(true);
                click();
              }}
              className={cn(
                "relative flex h-9 items-center justify-center gap-1 rounded-lg border px-2.5 font-display text-xs font-black uppercase tracking-wider transition",
                vipActive
                  ? "border-rar-rare/60 bg-gradient-to-b from-rar-rare/25 to-brand-600/20 text-rar-rare shadow-[0_0_16px_-4px_rgba(228,174,57,0.5)]"
                  : "border-line bg-ink-800 text-white/40 hover:text-rar-rare"
              )}
              title={vipActive ? `VIP sınıfı: ${vipTier.label}` : "Harcadıkça VIP sınıfı yükselir"}
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">{vipActive ? vipTier.label : "VIP"}</span>
              {vipActive && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full" style={{ background: vipTier.color }} />
              )}
            </button>

            {/* davet & ödül */}
            <button
              onClick={() => {
                setReferralOpen(true);
                click();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-800 text-white/40 transition hover:text-emerald-400"
              title="Davet et — seviye ödülü kazan"
            >
              <UserPlus className="h-4 w-4" />
            </button>

            {/* ayarlar merkezi */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => {
                  setOptsOpen((o) => !o);
                  click();
                }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border transition",
                  optsOpen
                    ? "border-brand-500/60 bg-brand-500/15 text-brand-300"
                    : "border-line bg-ink-800 text-white/50 hover:text-white"
                )}
                title="Ayarlar Merkezi"
              >
                <Settings className="h-4 w-4" />
                {prefs.sfx <= 0 || muted ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-lose" />
                ) : null}
              </button>
              <AnimatePresence>
                {optsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-line bg-ink-950/95 p-4 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Settings className="h-4 w-4 text-brand-300" />
                      <span className="font-display text-sm font-black uppercase tracking-widest text-white/85">
                        Ayarlar Merkezi
                      </span>
                      <button
                        onClick={() => setOptsOpen(false)}
                        className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg text-white/40 transition hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* ses */}
                    <div className="rounded-xl border border-line bg-ink-900/70 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ses</span>
                        <span className="font-display text-xs font-black text-brand-300">
                          {muted ? "Kapalı" : `%${Math.round(prefs.sfx)}`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(prefs.sfx)}
                        onChange={(e) => updatePref({ sfx: Number(e.target.value) })}
                        disabled={muted}
                        className="mt-2 w-full accent-brand-500 disabled:opacity-40"
                      />
                      <button
                        onClick={toggleMute}
                        className={cn(
                          "mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-[11px] font-bold transition",
                          muted
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border-lose/40 bg-lose/10 text-lose hover:bg-lose/20"
                        )}
                      >
                        {muted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                        {muted ? "Sesi Aç" : "Sesi Kapat"}
                      </button>
                    </div>

                    {/* tercihler */}
                    <div className="mt-3 space-y-2">
                      {(
                        [
                          { key: "effects", label: "Görsel Efektler", desc: "Kazanç parlamaları ve ışık patlamaları" },
                          { key: "shake", label: "Ekran Sarsıntısı", desc: "Yetersiz bakiye uyarısında sarsıntı" },
                          { key: "fastReels", label: "Hızlı Makara", desc: "Kasa açılışını hızlandır (kısa animasyon)" },
                        ] as { key: keyof Prefs; label: string; desc: string }[]
                      ).map((t) => (
                        <div key={t.key} className="flex items-center gap-3 rounded-xl border border-line bg-ink-900/70 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-white/80">{t.label}</div>
                            <div className="text-[9px] text-white/35">{t.desc}</div>
                          </div>
                          <button
                            onClick={() => updatePref({ [t.key]: !prefs[t.key] } as Partial<Prefs>)}
                            className={cn(
                              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                              prefs[t.key] ? "bg-emerald-500" : "bg-ink-600"
                            )}
                            aria-pressed={Boolean(prefs[t.key])}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                                prefs[t.key] ? "left-[22px]" : "left-0.5"
                              )}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* bakiye */}
            <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-ink-800">
              <div className="flex items-center gap-2 px-3">
                <Wallet className="h-4 w-4 text-brand-400" />
                <span className="font-display text-[15px] font-bold text-emerald-400 tabular-nums">
                  <AnimatedMoney value={balance} />
                </span>
              </div>
              <button
                onClick={() => {
                  setDepositOpen(true);
                  click();
                }}
                className="relative flex items-center gap-1 bg-gradient-to-b from-brand-400 to-brand-600 px-3 font-display text-sm font-bold text-ink-950 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                <span className="hidden sm:inline">Para Yatır</span>
                {myPending.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink-950 px-1 text-[9px] font-black text-brand-300">
                    {myPending.length}
                  </span>
                )}
              </button>
            </div>

            {/* profil */}
            <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-800 py-1 pl-1.5 pr-1">
              <img
                src={mcHead(userName, 48)}
                alt={userName}
                className="h-7 w-7 rounded"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="hidden leading-tight md:block">
                <div className="flex items-center gap-1 text-xs font-bold text-white">
                  {userName}
                  {isAdmin && <ShieldCheck className="h-3 w-3 text-brand-400" />}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-white/35">
                  {isAdmin ? "Yönetici" : "Vatandaş"}
                </div>
              </div>
              <button
                onClick={logout}
                title="Çıkış yap"
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition hover:bg-white/5 hover:text-lose"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* desktop nav — ikinci satır (dar ekranlarda kendiliğinden sarar, asla taşmaz) */}
        <nav className="hidden border-t border-line/60 lg:block">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-1 gap-y-1 px-4 py-1.5">
            {allTabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  click();
                }}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition-colors",
                  tab === key ? "text-white" : "text-white/45 hover:text-white/80"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {key === "inventory" && inventory.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-brand-500/20 px-1.5 text-[10px] font-bold text-brand-300">
                    {inventory.length}
                  </span>
                )}
                {key === "admin" && adminBadge > 0 && (
                  <span className="ml-0.5 flex items-center justify-center rounded-full bg-lose px-1.5 text-[10px] font-black text-white" style={{ height: 18, minWidth: 18 }}>
                    {adminBadge}
                  </span>
                )}
                {tab === key && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* mobil alt nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex overflow-x-auto border-t border-line bg-ink-950/95 backdrop-blur-md lg:hidden" style={{ scrollbarWidth: "none" }}>
        {allTabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "relative flex min-w-[62px] flex-1 flex-col items-center gap-1 overflow-hidden py-2.5 text-[9px] font-semibold uppercase tracking-wider",
              tab === key ? "text-brand-400" : "text-white/40"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
            {key === "inventory" && inventory.length > 0 && (
              <span className="absolute right-[calc(50%-22px)] top-1.5 rounded-full bg-brand-500 px-1 text-[9px] font-bold text-ink-950">
                {inventory.length}
              </span>
            )}
            {key === "admin" && adminBadge > 0 && (
              <span className="absolute right-[calc(50%-22px)] top-1.5 rounded-full bg-lose px-1 text-[9px] font-bold text-white">
                {adminBadge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ---------------- PARA YATIRMA (onaylı) ---------------- */}
      <AnimatePresence>
        {depositOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setDepositOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="tiny-scroll max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-ink-800 shadow-2xl"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-line bg-ink-800 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                    <Banknote className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold">Kasa İşlemleri</div>
                    <div className="text-[11px] text-white/40">{CURRENCY.name} • yetkili onaylı</div>
                  </div>
                </div>
                <button
                  onClick={() => setDepositOpen(false)}
                  className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                {/* yatır / çek sekmeleri */}
                {!sent && (
                  <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-line bg-ink-900 p-1">
                    {([
                      { k: "deposit" as const, label: "Para Yatır", Icon: Plus },
                      { k: "withdraw" as const, label: "Para Çek", Icon: Banknote },
                    ]).map(({ k, label, Icon }) => (
                      <button
                        key={k}
                        onClick={() => {
                          setMode(k);
                          click();
                        }}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-display text-sm font-bold uppercase tracking-wider transition",
                          mode === k
                            ? k === "withdraw"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-brand-500/15 text-brand-300"
                            : "text-white/35 hover:text-white/70"
                        )}
                      >
                        <Icon className="h-4 w-4" /> {label}
                      </button>
                    ))}
                  </div>
                )}

                {sent ? (
                  <div className="animate-rise flex flex-col items-center gap-3 py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                      <Clock className="h-8 w-8" />
                    </div>
                    <div className="font-display text-xl font-black text-white">Talep gönderildi</div>
                    <p className="max-w-xs text-sm text-white/45">
                      <span className="font-bold text-emerald-400">
                        {mode === "withdraw" ? money(amountNum) : money(credit)}
                      </span>{" "}
                      {mode === "withdraw"
                        ? "tutarındaki çekim talebin"
                        : activePack && (activePack.bonus > 0 || (activePack.gifts ?? []).length > 0)
                          ? `(+${money(credit - amountNum)} bonus ve ${
                              (activePack.gifts ?? []).length > 0
                                ? `${activePack.gifts!.map((g) => giftLabel(g)).filter(Boolean).join(", ")} hediyesi`
                                : ""
                            }) yatırma talebin`
                          : "tutarındaki yatırma talebin"}{" "}
                      <span className="font-semibold text-brand-300">{ADMIN_NAME}</span> onayına düştü.
                      {mode === "withdraw"
                        ? " Tutar bakiyenden bloke edildi, onaylanınca ödemen yapılacak."
                        : " Onaylanınca paran otomatik yüklenecek."}
                    </p>
                  </div>
                ) : (
                  <>
                    {mode === "withdraw" && (
                      <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-xs">
                        <span className="text-white/45">Çekilebilir bakiye</span>
                        <span className="font-display text-base font-black text-emerald-400">
                          {money(balance)}
                        </span>
                      </div>
                    )}
                    {mode === "withdraw" && heldBalance > 0 && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/5 px-3 py-2 text-[11px] text-brand-200">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {money(heldBalance)} onay bekleyen çekimde bloke
                      </div>
                    )}

                    {mode === "deposit" && (
                      <div className="mb-4 rounded-xl border border-dashed border-brand-500/35 bg-brand-500/5 p-3">
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40">
                          Kupon / Promosyon kodu
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="SKY20"
                            maxLength={24}
                            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-ink-900 px-3 font-mono text-sm font-bold tracking-widest text-white placeholder:text-white/20 focus:border-brand-500/60 focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const res = redeemCoupon(couponCode);
                              if (res.ok) {
                                setCouponCode("");
                                click();
                              } else pushToast({ kind: "lose", title: "Kupon geçersiz", sub: res.error });
                            }}
                            className="h-10 shrink-0 rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-4 font-display text-sm font-bold text-ink-950 transition hover:brightness-110"
                          >
                            Kullan
                          </button>
                        </div>
                        {couponBonus && couponBonus.until > Date.now() && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300">
                            🎟️ Aktif: Sonraki yatırmana +%{couponBonus.pct} bonus (~{Math.ceil((couponBonus.until - Date.now()) / 3600000)} saat kaldı)
                          </div>
                        )}
                      </div>
                    )}

                    {/* tutar girişi */}
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                      {mode === "withdraw" ? "Ne kadar çekmek istiyorsun?" : "Ne kadar yatırmak istiyorsun?"}
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-900 px-4 focus-within:border-brand-500/60">
                      <span className="font-display text-2xl font-black text-brand-400">
                        {CURRENCY.symbol}
                      </span>
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                        inputMode="numeric"
                        placeholder="0"
                        className="h-14 min-w-0 flex-1 bg-transparent font-display text-2xl font-black tabular-nums text-white placeholder:text-white/20 focus:outline-none"
                      />
                      <span className="shrink-0 text-xs font-bold text-white/30">{CURRENCY.short}</span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      {(mode === "deposit" ? packs.map((p) => p.amount) : PRESETS).map((p) => {
                        const pack = mode === "deposit" ? packs.find((x) => x.amount === p) : undefined;
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              setAmount(String(p));
                              click();
                            }}
                            className={cn(
                              "relative rounded-lg border py-2 font-display text-sm font-bold transition",
                              amountNum === p
                                ? "border-brand-500 bg-brand-500/10 text-brand-300"
                                : "border-line bg-ink-700 text-white/55 hover:text-white"
                            )}
                          >
                            {money(p)}
                            {pack && (pack.bonus > 0 || (pack.gifts ?? []).length > 0) && (
                              <span className="absolute -top-1.5 right-1 flex items-center gap-0.5 rounded-full bg-emerald-500 px-1 py-px text-[8px] font-black text-ink-950">
                                {pack.bonus > 0 && `+%${pack.bonus}`}
                                {(pack.gifts ?? []).length > 0 && <span>🎁</span>}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {mode === "deposit" && activePack && (activePack.bonus > 0 || (activePack.gifts ?? []).length > 0) && (
                      <div className="mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-white/55">
                            Paket bonusu <span className="font-black text-emerald-400">+%{activePack.bonus}</span>
                          </span>
                          <span className="font-display text-sm font-black text-emerald-400">
                            {money(credit)} yüklenecek
                          </span>
                        </div>
                        {(activePack.gifts ?? []).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-emerald-500/20 pt-1.5 text-[10px] text-white/60">
                            <span>🎁 Hediye:</span>
                            {activePack.gifts!.map((g, gi) => (
                              <span key={gi} className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-300">
                                {g.kind === "case" ? `Kasa · ${giftLabel(g)}` : giftLabel(g)}
                                {g.kind === "case" && " (onayda otomatik açılır)"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <label className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                      Ödeme yöntemi
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {METHODS.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setMethod(m);
                            click();
                          }}
                          className={cn(
                            "rounded-lg border py-2.5 text-xs font-semibold transition",
                            method === m
                              ? "border-brand-500 bg-brand-500/10 text-brand-300"
                              : "border-line bg-ink-700 text-white/50 hover:text-white"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    {mode === "withdraw" && (
                      <>
                        <label className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                          Ödeme yapılacak hesap / nick
                        </label>
                        <input
                          value={payTo}
                          onChange={(e) => setPayTo(e.target.value)}
                          placeholder={
                            method === "Oyun İçi Transfer" ? "Minecraft nickin" : "IBAN / Papara no / cüzdan adresi"
                          }
                          maxLength={64}
                          className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3 text-sm text-white placeholder:text-white/25 focus:border-brand-500/60 focus:outline-none"
                        />
                      </>
                    )}

                    <div
                      className={cn(
                        "mt-4 flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed text-white/50",
                        mode === "withdraw"
                          ? "border-emerald-500/25 bg-emerald-500/5"
                          : "border-brand-500/25 bg-brand-500/5"
                      )}
                    >
                      <ShieldCheck
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          mode === "withdraw" ? "text-emerald-400" : "text-brand-400"
                        )}
                      />
                      {mode === "withdraw" ? (
                        <span>
                          Talebin <span className="font-bold text-emerald-300">{ADMIN_NAME}</span> tarafından
                          incelenecek. Tutar hemen bloke edilir; reddedilirse bakiyene iade edilir.
                          En az {money(MIN_WITHDRAW)} çekebilirsin.
                        </span>
                      ) : (
                        <span>
                          Talebin <span className="font-bold text-brand-300">{ADMIN_NAME}</span> tarafından
                          incelenip onaylanacak. Onaylandığı anda {CURRENCY.name} bakiyene eklenir.
                        </span>
                      )}
                    </div>

                    <button
                      onClick={submitRequest}
                      className={cn(
                        "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-base font-black uppercase tracking-widest text-ink-950 transition hover:brightness-110",
                        mode === "withdraw"
                          ? "bg-gradient-to-b from-emerald-400 to-emerald-600"
                          : "bg-gradient-to-b from-brand-400 to-brand-600"
                      )}
                    >
                      {mode === "withdraw" ? money(amountNum) : money(credit)}{" "}
                      {mode === "withdraw" ? "Çekim Talebi" : "Yükle ve Al"}
                    </button>
                  </>
                )}

                {/* talep geçmişi */}
                {myDeposits.length > 0 && (
                  <div className="mt-5 border-t border-line pt-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                      Taleplerim
                    </div>
                    <div className="tiny-scroll max-h-40 space-y-1.5 overflow-y-auto">
                      {myDeposits.slice(0, 12).map((d) => {
                        const isOffer = d.status === "pending" && !!d.offerTs && !d.offerRespondedTs;
                        const netReq =
                          d.status === "approved"
                            ? Math.max(0, Math.round(((d.offered ?? d.amount) * (100 - Math.min(90, Math.max(0, d.commissionPct ?? 0)))) / 100))
                            : d.amount;
                        return (
                          <div key={d.id} className="rounded-lg bg-ink-900 p-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "shrink-0 rounded px-1 py-0.5 text-[9px] font-black uppercase",
                                  d.kind === "withdraw"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-brand-500/15 text-brand-300"
                                )}
                              >
                                {d.kind === "withdraw" ? "Çekim" : "Yatır"}
                              </span>
                              <span className="font-display font-bold text-white/80">{money(d.amount)}</span>
                              <span className="truncate text-[10px] text-white/30">{d.method}</span>
                              {(d.commissionPct ?? 0) > 0 && (
                                <span className="rounded bg-lose/10 px-1 py-0.5 text-[9px] font-black text-lose">
                                  -%{d.commissionPct}
                                </span>
                              )}
                              <span className="ml-auto shrink-0 text-[10px] text-white/25">{ago(d.ts)}</span>
                              <span
                                className={cn(
                                  "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                  d.status === "approved"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : d.status === "pending"
                                      ? isOffer
                                        ? "bg-amber-500/15 text-amber-300"
                                        : "bg-brand-500/15 text-brand-300"
                                      : "bg-lose/15 text-lose"
                                )}
                              >
                                {d.status === "approved" ? "Onaylandı" : isOffer ? "Teklif" : d.status === "pending" ? "Bekliyor" : "Reddedildi"}
                              </span>
                            </div>
                            {isOffer && (
                              <div className="mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
                                <div className="flex items-center justify-between text-[10px] text-white/55">
                                  <span>
                                    Teklif: <span className="font-black text-amber-300">{money(d.offered ?? 0)}</span>
                                    {d.offered! < d.amount ? ` (istedin: ${money(d.amount)})` : ""}
                                  </span>
                                  <span>
                                    {d.kind === "withdraw" ? "ödenecek" : "yüklenecek"}:{" "}
                                    <span className="font-black text-emerald-400">{money(netReq)}</span>
                                  </span>
                                </div>
                                <div className="mt-2 flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      const r = respondDepositOffer(d.id, true);
                                      if (!r.ok) pushToast({ kind: "lose", title: "Kabul edilemedi", sub: r.error });
                                      else click();
                                    }}
                                    className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 font-display text-[11px] font-bold text-ink-950 transition hover:brightness-110"
                                  >
                                    <Check className="h-3.5 w-3.5" strokeWidth={3} /> Kabul Et
                                  </button>
                                  <button
                                    onClick={() => {
                                      const r = respondDepositOffer(d.id, false);
                                      if (!r.ok) pushToast({ kind: "lose", title: "Reddedilemedi", sub: r.error });
                                      else click();
                                    }}
                                    className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-lose/40 bg-lose/10 text-[11px] font-bold text-lose transition hover:bg-lose/20"
                                  >
                                    <X className="h-3.5 w-3.5" strokeWidth={3} /> Reddet
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- SUNUCUYA BAĞLAN ---------------- */}
      <AnimatePresence>
        {connectOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setConnectOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-ink-800 p-6 shadow-2xl"
            >
              <button
                onClick={() => setConnectOpen(false)}
                className="absolute right-3 top-3 rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    syncStatus === "ok"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-brand-500/15 text-brand-400"
                  )}
                >
                  <Wifi className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-black">Sunucuya Bağlan</h3>
                  <div className="text-xs font-semibold">
                    {syncStatus === "ok" ? (
                      <span className="text-emerald-400">Bağlı — talepler anında akıyor</span>
                    ) : syncCode ? (
                      <span className="text-brand-300">Bağlanıyor…</span>
                    ) : (
                      <span className="text-white/40">Şu an yalnızca bu cihazda çalışıyorsun</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-white/45">
                Site adresiyle birlikte sana verilen <span className="font-bold text-white/70">sunucu kodunu</span> gir.
                Böylece para taleplerin yetkiliye anında ulaşır.
              </p>

              <div className="mt-4 flex gap-2">
                <input
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && codeDraft.trim().length >= 4) {
                      setSyncCode(codeDraft);
                      setConnectOpen(false);
                    }
                  }}
                  placeholder="Örn: SKYLINE-7K2"
                  maxLength={20}
                  spellCheck={false}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-ink-900 px-4 font-display text-base font-bold uppercase tracking-widest text-white placeholder:text-white/20 focus:border-brand-500/60 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (codeDraft.trim().length >= 4) {
                      setSyncCode(codeDraft);
                      setConnectOpen(false);
                    } else {
                      pushToast({ kind: "lose", title: "Kod çok kısa", sub: "En az 4 karakter gir" });
                    }
                  }}
                  className="h-12 shrink-0 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-4 font-display text-sm font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110"
                >
                  {syncCode ? "Güncelle" : "Bağlan"}
                </button>
              </div>

              {syncCode && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-xs font-semibold text-white/70">
                    Aktif kod: <span className="font-display font-bold text-emerald-300">{syncCode}</span>
                  </span>
                  <button
                    onClick={() => {
                      setSyncCode(null);
                      setCodeDraft("");
                    }}
                    className="ml-auto flex items-center gap-1 rounded-md bg-lose/10 px-2 py-1 text-[10px] font-bold text-lose hover:bg-lose/20"
                  >
                    <Unplug className="h-3 w-3" /> Kes
                  </button>
                </div>
              )}

              <p className="mt-3 text-center text-[10px] text-white/30">
                Kodu {BRAND.name} Discord kanalından edinebilirsin
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- GÜNLÜK ÖDÜL ---------------- */}
      <AnimatePresence>
        {dailyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setDailyOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-ink-800 p-6 text-center shadow-2xl"
            >
              <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-brand-500/15 blur-3xl" />
              <button
                onClick={() => setDailyOpen(false)}
                className="absolute right-3 top-3 rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="animate-floaty mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_16px_40px_-8px_rgba(249,142,29,0.6)]">
                <Gift className="h-9 w-9 text-ink-950" strokeWidth={2.2} />
              </div>

              <h3 className="mt-4 font-display text-2xl font-black">Günlük Ödül</h3>
              <p className="mt-1 text-xs text-white/45">
                Her 20 saatte bir {money(4 * SCALE)} – {money(18 * SCALE)} arası bedava {CURRENCY.name}
              </p>

              {claimed !== null ? (
                <div className="mt-5 animate-rise rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <div className="font-display text-3xl font-black text-emerald-400">
                    +{money(claimed)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-emerald-300/80">
                    Hesabına tanımlandı — yarın görüşürüz!
                  </div>
                </div>
              ) : dailyReady ? (
                <button
                  onClick={() => {
                    const r = claimDaily();
                    setClaimed(r);
                    if (r) coinDing();
                  }}
                  className="mt-5 h-12 w-full rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-base font-black uppercase tracking-widest text-ink-950 transition hover:brightness-110"
                >
                  Ödülü Topla
                </button>
              ) : (
                <div className="mt-5 rounded-xl border border-line bg-ink-900 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Sonraki ödüle kalan süre
                  </div>
                  <div className="mt-1 font-display text-2xl font-black tabular-nums text-white/80">
                    {dailyLeftH}s {dailyLeftM}d
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* davet & ödül modal */}
      <AnimatePresence>
        {referralOpen && <ReferralModal onClose={() => setReferralOpen(false)} />}
      </AnimatePresence>

      {/* VIP modal */}
      <AnimatePresence>
        {vipOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setVipOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="tiny-scroll max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-rar-rare/40 bg-ink-800 shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink-800 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rar-rare to-brand-600 text-ink-950">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-lg font-black tracking-wide text-white">VIP Sınıfları</div>
                    <div className="text-[11px] text-white/40">
                      {vipActive
                        ? `${vipTier.icon} ${vipTier.label} — harcadıkça yükselir`
                        : "Sınıflar: Bakır → Demir → Altın → Elmas → Obsidyen → Netherite"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setVipOpen(false)}
                  className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                {/* aktif sınıf */}
                <div
                  className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3"
                  style={{ borderColor: `${vipTier.color}55`, background: `${vipTier.color}0d` }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-xl"
                    style={{ background: `${vipTier.color}22` }}
                  >
                    {vipTier.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm font-black" style={{ color: vipTier.color }}>
                      {vipActive ? `VIP Sınıfın: ${vipTier.label}` : "Henüz VIP sınıfın yok"}
                    </div>
                    <div className="text-[11px] text-white/45">
                      Toplam harcama: <span className="font-bold text-white/70">{money(vipSpent)}</span>
                      {vipNext ? (
                        <>
                          {" "}· bir sonraki sınıf <span className="font-bold text-white/70">{vipNext.label}</span> için{" "}
                          <span className="font-bold text-white/70">{money(vipNext.minSpent)}</span> gerek
                        </>
                      ) : (
                        " · en üst sınıftasın 👑"
                      )}
                    </div>
                  </div>
                </div>

                {/* ilerleme */}
                {vipNext && (
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <span>{vipTier.icon} {vipTier.label}</span>
                      <span>{vipNext.icon} {vipNext.label} · %{vipProgress}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-600">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${vipProgress}%`, background: `linear-gradient(90deg, ${vipTier.color}, ${vipNext.color})` }}
                      />
                    </div>
                  </div>
                )}

                {/* sınıflar */}
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {VIP_TIERS.filter((t) => t.id !== "none").map((t) => {
                    const reached = vipSpent >= t.minSpent;
                    const isCurrent = vipTier.id === t.id;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "relative flex flex-col rounded-xl border p-3.5 transition",
                          isCurrent
                            ? "border-rar-rare/70 bg-rar-rare/10"
                            : reached
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-line bg-ink-900 hover:border-white/20"
                        )}
                      >
                        {isCurrent && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-rar-rare px-2 py-px text-[9px] font-black uppercase text-ink-950">
                            Sınıfın
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{t.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-display text-sm font-black uppercase tracking-wider" style={{ color: t.color }}>
                              {t.label}
                            </div>
                            <div className="text-[9px] font-bold uppercase text-white/35">
                              {money(t.minSpent)} harcama
                            </div>
                          </div>
                          {reached && <span className="text-[9px] font-black uppercase text-emerald-400">✓</span>}
                        </div>
                        <ul className="mt-2.5 flex flex-col gap-1 text-[10px] text-white/55">
                          <li>🎁 Günlük ödül ×{t.dailyMult}</li>
                          <li>💸 Kayıpta %{Math.round(t.cashback * 100)} cashback</li>
                          <li>🏪 Pazar komisyonu %{Math.round(t.fee * 100)}</li>
                          <li>🎰 Kasa açılışında %{t.caseDisc} indirim</li>
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-[10px] leading-relaxed text-white/35">
                  VIP sınıfı <span className="font-bold text-white/60">toplam harcamana</span> göre otomatik
                  belirlenir — süresi yok, satın alma yok. Harcadıkça yükselirsin:{" "}
                  {VIP_TIERS.filter((t) => t.id !== "none").map((t) => t.label).join(" → ")}. Cashback,
                  kaybettiğin her oyun bahsinde anında geri ödenir.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* admin uyarı şeridi */}
      {isAdmin && adminBadge > 0 && tab !== "admin" && (
        <button
          onClick={() => setTab("admin")}
          className="flex w-full items-center justify-center gap-2 border-b border-brand-500/30 bg-brand-500/10 py-2 text-xs font-bold text-brand-300 transition hover:bg-brand-500/15"
        >
          <ShieldCheck className="h-4 w-4" />
          {pendingDepositList.length > 0 && `${pendingDepositList.length} para talebi`}
          {pendingDepositList.length > 0 && pendingUserList.length > 0 && " • "}
          {pendingUserList.length > 0 && `${pendingUserList.length} üyelik başvurusu`} onayını bekliyor —
          panele git
        </button>
      )}
    </>
  );
}
