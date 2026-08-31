import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  BadgePercent,
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  CloudUpload,
  Clock,
  Coins,
  Crown,
  Dices,
  Gift,
  Medal,
  Megaphone,
  Minus,
  Package,
  PartyPopper,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Unplug,
  Waves,
  UserRoundCheck,
  Users,
  Wifi,
  X,
} from "lucide-react";
import {
  ADMIN_NAME,
  FIRST_LOGIN_REWARD,
  RAFFLE_FREQ_MS,
  RAFFLE_PRIZE,
  ADMIN_ADJUST_MAX,
  ADMIN_ADJUST_DAILY,
  mcHead,
  money,
} from "../config";
import { click, coinDing } from "../lib/audio";
import { useGame, levelFromSpent, weeklyStats } from "../store/Game";
import { SKIN_MAP, RARITY, hypotheticalSkinPrice, type Skin } from "../data/skins";
import { CASES, previewCasePrice } from "../data/cases";
import { MAX_STICKERS, STICKERS } from "../data/stickers";
import { WEARS, rollFloat, type WearKey } from "../data/wear";
import { FloatBar } from "./WearUi";
import { cn } from "../utils/cn";

type Sec = "users" | "deposits" | "players" | "sync" | "events" | "settings";

/* ---------------- SKİN HEDİYESİ — seçim taslağı ---------------- */
type SkinDraft = {
  id: string;
  version: "base" | "st" | "sv";
  wear: WearKey | "random";
  float: number;
  stickers: string[];
};

const WEAR_KEYS: WearKey[] = ["fn", "mw", "ft", "ww", "bs"];

function newSkinDraft(s: Skin): SkinDraft {
  return { id: s.id, version: "base", wear: "random", float: rollFloat(), stickers: [] };
}

function wearFloat(w: WearKey): number {
  const d = WEARS[w];
  return Math.round((d.min + Math.random() * (d.max - d.min)) * 1000) / 1000;
}

/** Görsel — tam görünür (object-contain), hata ise isimli fallback */
function PickImg({ s, className }: { s: Skin; className?: string }) {
  const [err, setErr] = useState(false);
  const color = RARITY[s.rarity].color;
  if (err)
    return (
      <div className={cn("flex flex-col items-center justify-center", className)}>
        <Package className="h-6 w-6" style={{ color }} />
        <span className="mt-1 px-2 text-center text-[9px] font-bold text-white/60">{s.weapon}</span>
      </div>
    );
  return (
    <img
      src={s.img}
      alt={`${s.weapon} | ${s.name}`}
      loading="lazy"
      draggable={false}
      onError={() => setErr(true)}
      className={cn("select-none object-contain", className)}
      style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.5))" }}
    />
  );
}

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
    adminGiveSkin,
    pushToast,
    syncUrl,
    syncStatus,
    setSyncUrl,
    syncCode,
    setSyncCode,
    syncNow,
    raffle,
    startRaffle,
    cancelRaffle,
    firstLoginEvent,
    startFirstLoginEvent,
    stopFirstLoginEvent,
    announcement,
    setAnnouncement,
    clearAnnouncement,
    autoSettings,
    setAutoApproval,
    adminLog,
    celebration,
    celebrate,
    moneyReset,
    resetAllMoney,
    startSkinRaffle,
    /* yeni özellikler */
    caseSale,
    startCaseSale,
    cancelCaseSale,
    priceSettings,
    setPriceSettings,
    skinBasePrice,
    weekWinner,
    weekPin,
    pinWeekWinner,
    clearWeekPin,
    adminListings,
    adminCreateListing,
    adminCancelListing,
    economyWave,
    economyConfig,
    startEconomyWave,
    cancelEconomyWave,
    setEconomyConfig,
  } = useGame();

  const [urlInput, setUrlInput] = useState(syncUrl ?? "");
  const [codeInput, setCodeInput] = useState(syncCode ?? "");
  const [copied, setCopied] = useState(false);

  const [sec, setSecState] = useState<Sec>(() => {
    /* F5'te panelin alt sekmesi korunur */
    const s = sessionStorage.getItem("skyline-adm-sec") as Sec | null;
    return s === "users" || s === "deposits" || s === "players" || s === "sync" || s === "events" || s === "settings"
      ? s
      : "deposits";
  });
  const setSec = useCallback((s: Sec) => {
    setSecState(s);
    try {
      sessionStorage.setItem("skyline-adm-sec", s);
    } catch {
      /* yoksay */
    }
  }, []);
  const [q, setQ] = useState("");
  const [adjustInputs, setAdjustInputs] = useState<Record<string, string>>({});
  /* onay akışı: işlem uygulanmadan önce gerekçe + onay şart */
  const [confirmAdj, setConfirmAdj] = useState<{
    key: string;
    name: string;
    amount: number;
    dir: 1 | -1;
  } | null>(null);
  const [adjReason, setAdjReason] = useState("");
  const [confirmTyped, setConfirmTyped] = useState("");
  /* kutlama */
  const [celebText, setCelebText] = useState("");
  const [celebArmed, setCelebArmed] = useState(false);

  /* etkinlik ayarları */
  const [raffleMin, setRaffleMin] = useState(String(Math.round(RAFFLE_FREQ_MS / 60000)));
  const [rafflePrize, setRafflePrize] = useState(String(RAFFLE_PRIZE));
  const [loginReward, setLoginReward] = useState(String(FIRST_LOGIN_REWARD));
  const [annText, setAnnText] = useState("");
  const [skinFor, setSkinFor] = useState<{ key: string; name: string } | null>(null);
  /* skin seçici modu: "give" = oyuncuya hediye, "raffle" = çekiliş ödülü seç */
  const [skinPickMode, setSkinPickMode] = useState<"give" | "raffle">("give");
  const [skinQuery, setSkinQuery] = useState("");
  const [skinRarity, setSkinRarity] = useState<string>("all");
  const [skinPageRaw, setSkinPageRaw] = useState(0);
  const [skinDetail, setSkinDetail] = useState<SkinDraft | null>(null);
  /* skin çekilişi durumu */
  const [raffleSkin, setRaffleSkin] = useState<SkinDraft | null>(null);
  const [skinRaffleMin, setSkinRaffleMin] = useState("60");
  /* toplu bakiye sıfırlama onayı */
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [resetTyped, setResetTyped] = useState("");

  /* kasa indirimi etkinliği */
  const [saleCaseSel, setSaleCaseSel] = useState<string[]>([]);
  const [saleDiscount, setSaleDiscount] = useState("50");
  const [saleMins, setSaleMins] = useState("60");
  const [saleAll, setSaleAll] = useState(true);
  /* skin fiyat yönetimi */
  const [priceGlobal, setPriceGlobal] = useState(() => String((priceSettings?.global ?? 100) / 100 * 100));
  const [priceRar, setPriceRar] = useState<Record<string, string>>({});
  const [priceSkinId, setPriceSkinId] = useState("");
  const [priceSkinVal, setPriceSkinVal] = useState("100");
  /* admin pazar ilanı */
  const [listSkinId, setListSkinId] = useState("");
  const [listPrice, setListPrice] = useState("100");
  const [listQty, setListQty] = useState("1");
  const [listQuery, setListQuery] = useState("");
  /* haftanın oyuncusu pin */
  const [pinQuery, setPinQuery] = useState("");

  /* ekonomik dalga — hazır seçenekler: yön / şiddet / nadir / süre / bitiş / otomatik */
  const ECO_STRENGTHS: Record<string, { label: string; down: string; surge: number }> = {
    light: { label: "Hafif", down: "Hafif", surge: 25 },
    medium: { label: "Orta", down: "Orta", surge: 50 },
    strong: { label: "Güçlü", down: "Sert", surge: 100 },
    extreme: { label: "Aşırı", down: "Çöküş", surge: 200 },
    epic: { label: "Efsanevi", down: "Büyük Çöküş", surge: 400 },
  };
  const ECO_RARES: Record<string, { label: string; boost: number; note: string }> = {
    off: { label: "Kapalı", boost: 0, note: "Herkes eşit" },
    mid: { label: "Orta", boost: 200, note: "Pahalılar 2 katı" },
    high: { label: "Aşırı", boost: 400, note: "Pahalılar 3 katı" },
  };
  const ECO_DURATIONS = [15, 30, 60, 180, 720, 1440];
  const ECO_FREQS = [15, 30, 60, 180, 360, 720, 1440];
  const ecoFmt = (m: number) => (m < 60 ? `${m} dk` : m % 60 === 0 ? `${m / 60} saat` : `${m} dk`);
  const ecoDirLabel = (d: "up" | "down") => (d === "up" ? "Yükseliş" : "Çöküş");

  const [ecoDir, setEcoDirState] = useState<"up" | "down">("up");
  const [ecoStrong, setEcoStrongState] = useState("medium");
  const [ecoRareLvl, setEcoRareLvlState] = useState("mid");
  const [ecoDur, setEcoDurState] = useState(30);
  const [ecoAfter, setEcoAfterState] = useState<"temp" | "perm">("temp");
  const [ecoAuto, setEcoAutoState] = useState(false);
  const [ecoFreq, setEcoFreqState] = useState(60);
  const [ecoAutoDir, setEcoAutoDirState] = useState<"up" | "down" | "mix">("up");
  const ecoRef = useRef({
    dir: "up" as "up" | "down",
    strong: "medium",
    rareLvl: "mid",
    dur: 30,
    after: "temp" as "temp" | "perm",
    auto: false,
    freq: 60,
    autoDir: "up" as "up" | "down" | "mix",
  });

  /* her değişiklikte otomatik kaydet — ayrı "Kaydet" butonu yok */
  const saveEco = (
    patch: Partial<{
      dir: "up" | "down";
      strong: string;
      rareLvl: string;
      dur: number;
      after: "temp" | "perm";
      auto: boolean;
      freq: number;
      autoDir: "up" | "down" | "mix";
    }>
  ) => {
    const next = { ...ecoRef.current, ...patch };
    ecoRef.current = next;
    setEcoDirState(next.dir);
    setEcoStrongState(next.strong);
    setEcoRareLvlState(next.rareLvl);
    setEcoDurState(next.dur);
    setEcoAfterState(next.after);
    setEcoAutoState(next.auto);
    setEcoFreqState(next.freq);
    setEcoAutoDirState(next.autoDir);
    const conf = ECO_STRENGTHS[next.strong] ?? ECO_STRENGTHS.medium;
    const rare = ECO_RARES[next.rareLvl] ?? ECO_RARES.mid;
    setEconomyConfig({
      enabled: next.auto,
      intervalMin: next.auto ? next.freq : 0,
      surge: conf.surge,
      rareBoost: rare.boost,
      durationMin: next.dur,
      /* otomatik açıksa otomatik yönü, kapalıysa manuel yönü sakla */
      direction: next.auto ? next.autoDir : next.dir,
    });
  };

  /* başka cihazdan/sync'ten gelen global çarpanı panele yansıt */
  useEffect(() => {
    setPriceGlobal(String(priceSettings?.global ?? 100));
  }, [priceSettings?.ts]); // eslint-disable-line react-hooks/exhaustive-deps

  /* dalga ayarları sync'ten geldiğinde panele yansıt */
  useEffect(() => {
    if (!economyConfig) return;
    const bestStrong =
      Object.entries(ECO_STRENGTHS).sort(
        (a, b) => Math.abs(a[1].surge - economyConfig.surge) - Math.abs(b[1].surge - economyConfig.surge)
      )[0]?.[0] ?? "medium";
    const bestRare = Object.entries(ECO_RARES).sort(
      (a, b) => Math.abs(a[1].boost - (economyConfig.rareBoost ?? 0)) - Math.abs(b[1].boost - (economyConfig.rareBoost ?? 0))
    )[0]?.[0] ?? "mid";
    const next = {
      dir: (economyConfig.direction === "down" ? "down" : "up") as "up" | "down",
      strong: bestStrong,
      rareLvl: bestRare,
      dur: economyConfig.durationMin,
      after: "temp" as "temp" | "perm",
      auto: economyConfig.enabled,
      freq: economyConfig.intervalMin > 0 ? economyConfig.intervalMin : 60,
      autoDir: (economyConfig.direction === "mix" ? "mix" : economyConfig.direction === "down" ? "down" : "up") as "up" | "down" | "mix",
    };
    ecoRef.current = next;
    setEcoDirState(next.dir);
    setEcoStrongState(next.strong);
    setEcoRareLvlState(next.rareLvl);
    setEcoDurState(next.dur);
    setEcoAfterState(next.after);
    setEcoAutoState(next.auto);
    setEcoFreqState(next.freq);
    setEcoAutoDirState(next.autoDir);
  }, [economyConfig?.ts]); // eslint-disable-line react-hooks/exhaustive-deps

  const skinResults = useMemo(() => {
    const qq = skinQuery.trim().toLowerCase();
    return Object.values(SKIN_MAP)
      .filter((s) => !s.sticker)
      .filter((s) => skinRarity === "all" || s.rarity === skinRarity)
      .filter(
        (s) =>
          !qq ||
          s.name.toLowerCase().includes(qq) ||
          s.weapon.toLowerCase().includes(qq) ||
          s.id.includes(qq)
      )
      .sort((a, b) => RARITY[b.rarity].order - RARITY[a.rarity].order || a.name.localeCompare(b.name));
  }, [skinQuery, skinRarity]);

  const SKIN_PAGE = 24;
  const skinPages = Math.max(1, Math.ceil(skinResults.length / SKIN_PAGE));
  const skinPage = Math.min(skinPageRaw, skinPages - 1);
  const skinPageItems = useMemo(
    () => skinResults.slice(skinPage * SKIN_PAGE, (skinPage + 1) * SKIN_PAGE),
    [skinResults, skinPage]
  );

  /* etkinlik geri sayımı için canlı saat (30 sn'de bir tazelenir) */
  const [admNow, setAdmNow] = useState(Date.now());
  useEffect(() => {
    const iv = window.setInterval(() => setAdmNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);
  const saleActiveNow = !!caseSale && !caseSale.cancelled && caseSale.endsAt > admNow;

  /* ekonomik dalga — canlı durum + önizleme */
  const economyActive = !!economyWave && !economyWave.cancelled && economyWave.endsAt > admNow;
  const ecoConf = ECO_STRENGTHS[ecoStrong] ?? ECO_STRENGTHS.medium;
  const ecoRare = ECO_RARES[ecoRareLvl] ?? ECO_RARES.mid;
  const ecoSign = ecoDir === "up" ? "+" : "-";
  const draftWave = { surge: ecoConf.surge, rareBoost: ecoRare.boost, endsAt: Infinity, direction: ecoDir };
  const ecoGift = CASES.find((c) => c.id === "gift") ?? CASES[0];
  const ecoKnife = skinBasePrice("karambit-crimson-web");
  const ecoNormal = skinBasePrice("negev-boroque");

  /* fiyat yönetimi — uygulanmış %'ler */
  const rarKeys = Object.keys(RARITY) as (keyof typeof RARITY)[];
  const eff = (v: string) => Math.max(10, Math.min(1000, Math.round(Number(v.replace(/[^\d]/g, "")) || 100)));

  /* admin ilan skin adayları */
  const listingSkins = useMemo(() => {
    const qq = listQuery.trim().toLowerCase();
    return Object.values(SKIN_MAP)
      .filter((s) => !s.sticker && !s.st && !s.sv)
      .filter((s) => !qq || s.name.toLowerCase().includes(qq) || s.weapon.toLowerCase().includes(qq) || s.id.includes(qq))
      .sort((a, b) => RARITY[b.rarity].order - RARITY[a.rarity].order || a.name.localeCompare(b.name))
      .slice(0, 12);
  }, [listQuery]);

  /* haftanın oyuncusu adayları */
  const pinCandidates = useMemo(() => {
    const qq = pinQuery.trim().toLowerCase();
    return Object.values(allUsers)
      .filter((u) => u.status === "approved" && !u.isAdmin)
      .filter((u) => !qq || u.name.toLowerCase().includes(qq))
      .map((u) => {
        const w = weeklyStats(u);
        const pub = u.pub?.week;
        return { u, spent: pub?.spent ?? w.spent, opened: pub?.opened ?? w.opened };
      })
      .filter((x) => x.spent > 0 || x.opened > 0)
      .sort((a, b) => b.spent - a.spent || b.opened - a.opened)
      .slice(0, 12);
  }, [allUsers, pinQuery]);

  /** onay modalını aç — doğrudan işlem yapılmaz */
  function requestAdjustment(key: string, name: string, direction: 1 | -1) {
    const raw = adjustInputs[key] ?? "";
    const amount = Math.round(Number(raw.replace(/[^\d]/g, "")) || 0);
    if (amount <= 0) {
      pushToast({ kind: "lose", title: "Geçerli bir tutar gir", sub: name });
      return;
    }
    if (Math.abs(amount) > ADMIN_ADJUST_MAX) {
      pushToast({
        kind: "lose",
        title: "Tek işlem sınırı aşıldı",
        sub: `En fazla ${money(ADMIN_ADJUST_MAX)} — 24 saatte ${money(ADMIN_ADJUST_DAILY)}`,
      });
      return;
    }
    click();
    setConfirmAdj({ key, name, amount, dir: direction });
    setAdjReason("");
    setConfirmTyped("");
  }

  /** onay modalından işlemi uygula — gerekçe + "ONAY" yazılması zorunlu */
  function applyAdjustment() {
    if (!confirmAdj) return;
    const { key, name, amount, dir } = confirmAdj;
    const reason = adjReason.trim();
    if (reason.length < 3) {
      pushToast({ kind: "lose", title: "İşlem gerekçesi yaz", sub: "En az 3 karakter — denetim kaydı için zorunlu" });
      return;
    }
    if (confirmTyped.trim().toUpperCase() !== "ONAY") {
      pushToast({ kind: "lose", title: "Onay için ONAY yaz", sub: "Kötüye kullanımı önlemek için zorunlu" });
      return;
    }
    const res = adminAdjust(key, amount * dir, reason);
    if (!res.ok) {
      pushToast({ kind: "lose", title: "İşlem reddedildi", sub: res.error ?? "Bilinmeyen hata" });
      return;
    }
    coinDing();
    pushToast({
      kind: dir > 0 ? "money" : "info",
      title: dir > 0 ? `${name} hesabına ${money(amount)} eklendi` : `${name} hesabından ${money(amount)} silindi`,
      sub: `Gerekçe: ${reason.slice(0, 60)}`,
    });
    setAdjustInputs((prev) => ({ ...prev, [key]: "" }));
    setConfirmAdj(null);
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
    { key: "events", label: "Etkinlikler", Icon: PartyPopper, badge: raffle && !raffle.drawn && !raffle.cancelled ? 1 : 0 },
    { key: "settings", label: "Ayarlar", Icon: Settings, badge: 0 },
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
      {/* ---------------- ETKİNLİKLER ---------------- */}
      {sec === "events" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ============ KASA İNDİRİMİ ETKİNLİĞİ ============ */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/8 to-ink-900/70 p-5">
            <div className="flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-emerald-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Kasa İndirimi Etkinliği
              </span>
              {saleActiveNow ? (
                <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
                  Aktif
                </span>
              ) : (
                <span className="ml-auto rounded-full bg-ink-600 px-2.5 py-1 text-[10px] font-black uppercase text-white/35">
                  Kapalı
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              Seçilen kasaların açılış fiyatı tüm sitenin <span className="font-bold text-emerald-400">etkinlik süresi boyunca düşer</span>.
            </p>

            {caseSale && !caseSale.cancelled && (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-ink-900/70 px-4 py-2.5 text-[11px] text-white/60">
                <div className="font-bold text-emerald-400">
                  %{caseSale.discount} indirim · {caseSale.caseIds.length} kasa ·{" "}
                  {Math.max(0, Math.round((caseSale.endsAt - admNow) / 60000))} dk kaldı
                </div>
                <div className="mt-0.5 text-white/40">{caseSale.caseIds.slice(0, 6).join(", ")}...</div>
              </div>
            )}

            {!saleActiveNow ? (
              <>
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-[11px] font-bold text-white/60">
                  <input
                    type="checkbox"
                    checked={saleAll}
                    onChange={(e) => setSaleAll(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  Tüm kasalar
                </label>
                {!saleAll && (
                  <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                    {Object.values(CASES).map((c) => {
                      const on = saleCaseSel.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() =>
                            setSaleCaseSel((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                          }
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition",
                            on
                              ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                              : "border-line bg-ink-800 text-white/45 hover:text-white/70"
                          )}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                      İndirim (%)
                    </span>
                    <input
                      value={saleDiscount}
                      onChange={(e) => setSaleDiscount(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3 font-display text-base font-bold text-white focus:border-emerald-500/60 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                      Süre (dakika)
                    </span>
                    <input
                      value={saleMins}
                      onChange={(e) => setSaleMins(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3 font-display text-base font-bold text-white focus:border-emerald-500/60 focus:outline-none"
                    />
                  </label>
                </div>
                <button
                  onClick={() => {
                    const ids = saleAll
                      ? Object.keys(CASES)
                      : saleCaseSel;
                    const disc = Math.round(Number(saleDiscount) || 0);
                    const mins = Math.round(Number(saleMins) || 0);
                    if (!ids.length || disc < 5 || disc > 90 || mins < 1) {
                      pushToast({ kind: "lose", title: "Geçersiz indirim", sub: "En az 1 kasa, %5–90 indirim, 1+ dakika" });
                      return;
                    }
                    const res = startCaseSale(ids, disc, mins);
                    if (res.ok) {
                      pushToast({ kind: "money", title: "Kasa indirimi başladı", sub: `%${disc} · ${ids.length} kasa · ${mins} dk` });
                      coinDing();
                    } else pushToast({ kind: "lose", title: "İndirim başlatılamadı", sub: res.error });
                  }}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 font-display text-sm font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110"
                >
                  <Play className="h-4 w-4" /> İndirimi Başlat
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm("Kasa indirimi şimdi sona ersin mi? Tüm cihazlara yayılır.")) cancelCaseSale();
                }}
                className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-lose/40 bg-lose/10 font-display text-sm font-bold text-lose transition hover:bg-lose/20"
              >
                <X className="h-4 w-4" /> Etkinliği Şimdi Bitir
              </button>
            )}
          </div>

          {/* ============ EKONOMİK DALGA ============ */}
          <div className="rounded-2xl border border-sky-400/30 bg-gradient-to-b from-sky-400/8 to-ink-900/70 p-5">
            <div className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-sky-300" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Ekonomik Dalga
              </span>
              {economyActive ? (
                <span className="ml-auto rounded-full bg-sky-400/15 px-2.5 py-1 text-[10px] font-black uppercase text-sky-300">
                  {economyWave!.direction === "down" ? "Çöküş" : "Yükseliş"} · {Math.max(0, Math.round((economyWave!.endsAt - admNow) / 60000))} dk
                </span>
              ) : (
                <span className="ml-auto rounded-full bg-ink-600 px-2.5 py-1 text-[10px] font-black uppercase text-white/35">
                  {ecoAuto ? `Otomatik · her ${ecoFmt(ecoFreq)}` : "Kapalı"}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              Seçtiğin süre boyunca fiyatlar hareket eder, sonra normale döner. Kasa ve pazar da otomatik etkilenir.
            </p>

            {/* 1. yön */}
            <div className="mt-4">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">1 · Fiyatlar ne yapsın?</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => saveEco({ dir: "up" })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center transition",
                    ecoDir === "up" ? "border-emerald-400/70 bg-emerald-400/15" : "border-line bg-ink-800 hover:border-emerald-400/40"
                  )}
                >
                  <div className={cn("font-display text-sm font-black", ecoDir === "up" ? "text-emerald-400" : "text-white/70")}>📈 Yükseliş</div>
                  <div className="text-[9px] font-bold text-white/35">Fiyatlar artar</div>
                </button>
                <button
                  onClick={() => saveEco({ dir: "down" })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center transition",
                    ecoDir === "down" ? "border-lose/70 bg-lose/15" : "border-line bg-ink-800 hover:border-lose/40"
                  )}
                >
                  <div className={cn("font-display text-sm font-black", ecoDir === "down" ? "text-lose" : "text-white/70")}>📉 Çöküş</div>
                  <div className="text-[9px] font-bold text-white/35">Fiyatlar düşer</div>
                </button>
              </div>
            </div>

            {/* 2. şiddet */}
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">2 · Ne kadar?</div>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(ECO_STRENGTHS).map(([key, st]) => (
                  <button
                    key={key}
                    onClick={() => saveEco({ strong: key })}
                    className={cn(
                      "rounded-xl border px-1 py-2.5 text-center transition",
                      ecoStrong === key
                        ? ecoDir === "up"
                          ? "border-emerald-400/70 bg-emerald-400/15"
                          : "border-lose/70 bg-lose/15"
                        : "border-line bg-ink-800 hover:border-sky-400/40"
                    )}
                  >
                    <div className={cn("font-display text-[13px] font-black leading-tight", ecoStrong === key ? (ecoDir === "up" ? "text-emerald-400" : "text-lose") : "text-white/70")}>
                      {ecoDir === "up" ? st.label : st.down}
                    </div>
                    <div className="text-[9px] font-bold text-white/35">{ecoSign}%{st.surge}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. nadir etkisi */}
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                3 · Pahalı skinler etkilensin mi?
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(ECO_RARES).map(([key, r]) => (
                  <button
                    key={key}
                    onClick={() => saveEco({ rareLvl: key })}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-center transition",
                      ecoRareLvl === key
                        ? "border-sky-400/70 bg-sky-400/15"
                        : "border-line bg-ink-800 hover:border-sky-400/40"
                    )}
                  >
                    <div className={cn("font-display text-xs font-black", ecoRareLvl === key ? "text-sky-300" : "text-white/70")}>{r.label}</div>
                    <div className="text-[9px] font-bold text-white/35">{r.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. süre */}
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">4 · Ne kadar sürsün?</div>
              <div className="flex flex-wrap gap-1.5">
                {ECO_DURATIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => saveEco({ dur: m })}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-[11px] font-bold transition",
                      ecoDur === m
                        ? "border-sky-400/70 bg-sky-400/15 text-sky-300"
                        : "border-line bg-ink-800 text-white/50 hover:border-sky-400/40"
                    )}
                  >
                    {ecoFmt(m)}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. bitince */}
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">5 · Dalga bitince ne olsun?</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => saveEco({ after: "temp" })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center transition",
                    ecoAfter === "temp" ? "border-sky-400/70 bg-sky-400/15" : "border-line bg-ink-800 hover:border-sky-400/40"
                  )}
                >
                  <div className={cn("font-display text-xs font-black", ecoAfter === "temp" ? "text-sky-300" : "text-white/70")}>Normal dönsün</div>
                  <div className="text-[9px] font-bold text-white/35">Eski fiyatlara döner</div>
                </button>
                <button
                  onClick={() => saveEco({ after: "perm" })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center transition",
                    ecoAfter === "perm" ? "border-amber-400/70 bg-amber-400/15" : "border-line bg-ink-800 hover:border-amber-400/40"
                  )}
                >
                  <div className={cn("font-display text-xs font-black", ecoAfter === "perm" ? "text-amber-300" : "text-white/70")}>Yeni seviye kalsın</div>
                  <div className="text-[9px] font-bold text-white/35">Kalıcı ekonomik değişim</div>
                </button>
              </div>
            </div>

            {/* 6. otomatik */}
            <div className="mt-3 rounded-xl border border-line bg-ink-900/60 p-3">
              <button onClick={() => saveEco({ auto: !ecoAuto })} className="flex w-full items-center gap-3 text-left">
                <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", ecoAuto ? "bg-sky-500" : "bg-ink-600")}>
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", ecoAuto ? "left-[22px]" : "left-0.5")} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-white/80">6 · Kendiliğinden tekrarlasın mı?</span>
                  <span className="block text-[9px] text-white/35">
                    {ecoAuto ? `Her ${ecoFmt(ecoFreq)} bir dalga otomatik başlar` : "Kapalıysa sadece aşağıdaki butonla başlatırsın"}
                  </span>
                </span>
              </button>
              {ecoAuto && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {ECO_FREQS.map((m) => (
                      <button
                        key={m}
                        onClick={() => saveEco({ freq: m })}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition",
                          ecoFreq === m ? "border-sky-400/70 bg-sky-400/15 text-sky-300" : "border-line bg-ink-800 text-white/45 hover:border-sky-400/40"
                        )}
                      >
                        {ecoFmt(m)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/35">Yön:</span>
                    {(["up", "down", "mix"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => saveEco({ autoDir: d })}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition",
                          ecoAutoDir === d
                            ? "border-sky-400/70 bg-sky-400/15 text-sky-300"
                            : "border-line bg-ink-800 text-white/45 hover:border-sky-400/40"
                        )}
                      >
                        {d === "up" ? "📈 Yükseliş" : d === "down" ? "📉 Çöküş" : "🎲 Karışık"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* önizleme */}
            <div className="mt-3 rounded-xl border border-sky-400/25 bg-ink-900/70 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-sky-300/80">
                Örnek · {ecoDirLabel(ecoDir)} {ecoSign}%{ecoConf.surge}
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-[11px] text-white/60">
                    Kasa <span className="font-bold text-white/80">{money(ecoGift.price)}</span> →{" "}
                    <span className={cn("font-display text-sm font-black", ecoDir === "up" ? "text-emerald-400" : "text-lose")}>
                      {money(previewCasePrice(ecoGift, priceSettings, draftWave))}
                    </span>
                  </span>
                  <span className="text-[11px] text-white/60">
                    Normal <span className="font-bold text-white/80">{money(ecoNormal)}</span> →{" "}
                    <span className={cn("font-display text-sm font-black", ecoDir === "up" ? "text-emerald-400" : "text-lose")}>
                      {money(hypotheticalSkinPrice("negev-boroque", priceSettings, draftWave))}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-[11px] text-white/60">
                    Bıçak <span className="font-bold text-white/80">{money(ecoKnife)}</span> →{" "}
                    <span className={cn("font-display text-sm font-black", ecoDir === "up" ? "text-amber-300" : "text-lose")}>
                      {money(hypotheticalSkinPrice("karambit-crimson-web", priceSettings, draftWave))}
                    </span>
                  </span>
                  <span className="text-[9px] text-white/35">
                    {ecoRareLvl === "off" ? "Pahalılar normal etkilenir" : `Pahalılar ${ecoRare.note}`}
                    {ecoAfter === "perm" && " · kalıcı"}
                  </span>
                </div>
              </div>
            </div>

            {/* ana buton */}
            {economyActive ? (
              <button
                onClick={() => {
                  if (window.confirm("Ekonomik dalga şimdi sona ersin mi?")) cancelEconomyWave();
                }}
                className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-lose/40 bg-lose/10 font-display text-sm font-black uppercase tracking-wider text-lose transition hover:bg-lose/20"
              >
                <X className="h-4 w-4" /> Dalgayı Şimdi Durdur
              </button>
            ) : (
              <button
                onClick={() => {
                  const res = startEconomyWave(ecoConf.surge, ecoRare.boost, ecoDur, ecoDir, ecoAfter === "perm");
                  if (res.ok) {
                    pushToast({
                      kind: "money",
                      title: ecoDir === "up" ? "Ekonomik dalga başladı" : "Piyasa çöküşü başladı",
                      sub: `${ecoSign}%${ecoConf.surge} · ${ecoFmt(ecoDur)}${ecoAfter === "perm" ? " · kalıcı" : ""}`,
                    });
                    coinDing();
                  } else pushToast({ kind: "lose", title: "Başlatılamadı", sub: res.error });
                }}
                className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 font-display text-sm font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110"
              >
                <Waves className="h-4 w-4" /> {ecoDir === "up" ? "Dalgayı Hemen Başlat" : "Çöküşü Hemen Başlat"}
              </button>
            )}
            <p className="mt-2 text-center text-[9px] text-white/30">
              Seçimler otomatik kaydedilir ve tüm cihazlara yayılır.
            </p>
          </div>

          {/* ============ HAFTANIN OYUNCUSU ============ */}
          <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/8 to-ink-900/70 p-5">
            <div className="flex items-center gap-2">
              <Medal className="h-4 w-4 text-amber-300" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Haftanın Oyuncusu
              </span>
              {weekPin && (
                <span className="ml-auto rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black uppercase text-amber-300">
                  Sabitlendi
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              Her Pazartesi otomatik yenilenir. İstatistiğe göre en çok harcayan oyuncu kazanır — admin istediğini sabitleyebilir.
            </p>

            <div className="mt-4 rounded-xl border border-amber-400/30 bg-ink-900/70 px-4 py-3">
              {weekWinner ? (
                <div className="flex items-center gap-3">
                  <Head name={weekWinner.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base font-black text-amber-300">{weekWinner.name}</div>
                    <div className="text-[10px] text-white/40">
                      {money(weekWinner.spent)} harcama · {weekWinner.opened} kasa
                    </div>
                  </div>
                  <Crown className="h-5 w-5 shrink-0 text-amber-300" fill="currentColor" strokeWidth={0} />
                </div>
              ) : (
                <div className="py-3 text-center text-[11px] text-white/35">Bu hafta henüz kazanan yok</div>
              )}
            </div>

            <div className="mt-3">
              <input
                value={pinQuery}
                onChange={(e) => setPinQuery(e.target.value)}
                placeholder="Oyuncu ara ve sabitle…"
                className="h-10 w-full rounded-xl border border-line bg-ink-900 px-3 text-xs text-white placeholder:text-white/25 focus:border-amber-400/60 focus:outline-none"
              />
              <div className="mt-2 flex max-h-36 flex-col gap-1.5 overflow-y-auto">
                {pinCandidates.map(({ u, spent, opened }) => (
                  <button
                    key={u.key}
                    onClick={() => {
                      const res = pinWeekWinner(u.key);
                      if (res.ok) coinDing();
                      else pushToast({ kind: "lose", title: "Sabitlenemedi", sub: res.error });
                    }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition",
                      weekPin?.key === u.key
                        ? "border-amber-400/60 bg-amber-400/15"
                        : "border-line bg-ink-800 hover:border-amber-400/40"
                    )}
                  >
                    <Head name={u.name} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-white/80">{u.name}</div>
                      <div className="text-[9px] text-white/35">{money(spent)} · {opened} kasa</div>
                    </div>
                    {weekPin?.key === u.key && <Check className="h-4 w-4 shrink-0 text-amber-300" />}
                  </button>
                ))}
                {pinCandidates.length === 0 && (
                  <div className="py-3 text-center text-[10px] text-white/30">Eşleşen oyuncu yok</div>
                )}
              </div>
              {weekPin && (
                <button
                  onClick={() => clearWeekPin()}
                  className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-400/15"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Sabitlemeyi Kaldır (otomatik)
                </button>
              )}
            </div>
          </div>

          {/* ============ OTOMATİK ÇEKİLİŞ ============ */}
          <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/8 to-ink-900/70 p-5">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Otomatik Çekiliş
              </span>
              {raffle && !raffle.drawn && !raffle.cancelled && (
                <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
                  Aktif
                </span>
              )}
              {raffle?.cancelled && (
                <span className="ml-auto rounded-full bg-lose/15 px-2.5 py-1 text-[10px] font-black uppercase text-lose">
                  İptal
                </span>
              )}
            </div>

            {raffle && (
              <div className="mt-3 rounded-xl border border-line bg-ink-900/70 px-4 py-3 text-[11px] text-white/55">
                {raffle.drawn ? (
                  <>
                    <span className="font-bold text-white/80">Sonuçlandı:</span>{" "}
                    {raffle.winner?.name ?? "Katılımcı yok"} — {money(raffle.prize)}
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white/80">
                      {money(raffle.prize)} ödül ·{" "}
                      {Math.round((raffle.endsAt - Date.now()) / 60000)} dk kaldı
                    </span>{" "}
                    · {Object.keys(raffle.participants ?? {}).length} katılımcı
                  </>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Süre (dakika)
                </span>
                <input
                  value={raffleMin}
                  onChange={(e) => setRaffleMin(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3 font-display text-base font-bold text-white focus:border-brand-500/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Ödül ($)
                </span>
                <input
                  value={rafflePrize}
                  onChange={(e) => setRafflePrize(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3 font-display text-base font-bold text-white focus:border-brand-500/60 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const m = Math.max(1, Number(raffleMin) || 60);
                  const p = Math.max(1000, Number(rafflePrize) || RAFFLE_PRIZE);
                  startRaffle(m, p);
                  coinDing();
                }}
                disabled={!!(raffle && !raffle.drawn)}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-sm font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110 disabled:opacity-40"
              >
                <PartyPopper className="h-4 w-4" /> Başlat
              </button>
              <button
                onClick={() => {
                  cancelRaffle();
                  pushToast({ kind: "info", title: "Çekiliş iptal edildi", sub: "Katılımcılar boşa çıktı" });
                }}
                disabled={!raffle}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-lose/40 bg-lose/10 font-display text-sm font-bold text-lose transition hover:bg-lose/20 disabled:opacity-40"
              >
                <X className="h-4 w-4" /> İptal Et
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/35">
              Süre bitince sistem her cihazda aynı seed ile kazananı belirler; ödül kazananın hesabına otomatik
              eklenir. Varsayılan: {Math.round(RAFFLE_FREQ_MS / 60000)} dk / {money(RAFFLE_PRIZE)}.
            </p>
          </div>

          {/* ============ SKİN ÇEKİLİŞİ ============ */}
          <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/8 to-ink-900/70 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Skin Çekilişi
              </span>
              {raffle && !raffle.drawn && !raffle.cancelled && raffle.skinId && (
                <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
                  Aktif
                </span>
              )}
            </div>

            {raffle?.skinId && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-ink-900/70 px-4 py-3">
                {(() => {
                  const s = SKIN_MAP[raffle.skinId!];
                  return s ? (
                    <img src={s.img} alt={s.name} className="h-12 w-12 shrink-0 object-contain" />
                  ) : null;
                })()}
                <div className="min-w-0 flex-1 text-[11px] text-white/55">
                  {raffle.drawn ? (
                    <>
                      <span className="font-bold text-white/80">Kazanan:</span> {raffle.winner?.name ?? "—"}
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-white/80">{raffle.skinName}</span> ·{" "}
                      {Math.max(0, Math.round((raffle.endsAt - Date.now()) / 60000))} dk kaldı
                    </>
                  )}
                  <div className="text-white/35">
                    {Object.keys(raffle.participants ?? {}).length} katılımcı
                    {raffle.winner?.name && raffle.drawn ? ` · ödül: ${raffle.skinName}` : ""}
                  </div>
                </div>
              </div>
            )}

            {/* seçilen ödül */}
            <div className="mt-4 rounded-xl border border-amber-400/25 bg-ink-900/70 p-3">
              <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/45">
                Çekiliş Ödülü (skin)
              </div>
              {raffleSkin ? (
                (() => {
                  const baseId = raffleSkin.id.replace(/-(st|sv)$/, "");
                  const finalId =
                    raffleSkin.version === "st"
                      ? baseId + "-st"
                      : raffleSkin.version === "sv"
                        ? baseId + "-sv"
                        : baseId;
                  const s = SKIN_MAP[finalId] ?? SKIN_MAP[baseId];
                  if (!s) return null;
                  const r = RARITY[s.rarity];
                  return (
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                        style={{ background: `radial-gradient(100% 80% at 50% 0%, ${r.color}1a, #0a0d16)` }}
                      >
                        <img src={s.img} alt={s.name} className="h-full w-full object-contain p-1" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-white/85">
                          {s.weapon} | {s.name}
                        </div>
                        <div className="text-[10px] text-white/45">
                          {s.id.includes("-st") ? "StatTrak™ · " : s.id.includes("-sv") ? "Hatıra · " : ""}
                          {raffleSkin.wear !== "random" && raffleSkin.wear ? `${WEARS[raffleSkin.wear].tr} · ` : ""}
                          <span style={{ color: r.color }}>{r.tr}</span> · {money(s.price)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSkinPickMode("raffle");
                          setSkinFor({ key: "", name: "" });
                          setSkinQuery("");
                          setSkinRarity("all");
                          setSkinPageRaw(0);
                          setSkinDetail(null);
                          click();
                        }}
                        className="flex h-9 items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 text-[11px] font-bold text-amber-300 transition hover:bg-amber-400/20"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" /> Değiştir
                      </button>
                    </div>
                  );
                })()
              ) : (
                <button
                  onClick={() => {
                    setSkinPickMode("raffle");
                    setSkinFor({ key: "", name: "" });
                    setSkinQuery("");
                    setSkinRarity("all");
                    setSkinPageRaw(0);
                    setSkinDetail(null);
                    click();
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 text-xs font-bold text-amber-300 transition hover:bg-amber-400/10"
                >
                  <Gift className="h-4 w-4" /> Ödül skinini seç
                </button>
              )}
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                Süre (dakika)
              </span>
              <input
                value={skinRaffleMin}
                onChange={(e) => setSkinRaffleMin(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3 font-display text-base font-bold text-white focus:border-amber-400/60 focus:outline-none"
              />
            </label>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  if (!raffleSkin) {
                    pushToast({ kind: "lose", title: "Önce ödül skinini seç", sub: "Çekiliş ödülü olmadan başlatılamaz" });
                    return;
                  }
                  const baseId = raffleSkin.id.replace(/-(st|sv)$/, "");
                  const finalId =
                    raffleSkin.version === "st"
                      ? baseId + "-st"
                      : raffleSkin.version === "sv"
                        ? baseId + "-sv"
                        : baseId;
                  const m = Math.max(1, Number(skinRaffleMin) || 60);
                  const opts: { float?: number; stickers?: string[] } = {};
                  if (raffleSkin.wear !== "random") opts.float = raffleSkin.float;
                  if (raffleSkin.stickers.length) opts.stickers = raffleSkin.stickers;
                  const res = startSkinRaffle(m, finalId, opts);
                  if (!res.ok) {
                    pushToast({ kind: "lose", title: "Çekiliş başlatılamadı", sub: res.error ?? "Bilinmeyen hata" });
                    return;
                  }
                  coinDing();
                  pushToast({
                    kind: "money",
                    title: "Skin çekilişi başlatıldı 🎲",
                    sub: `${m} dk — ödül: ${SKIN_MAP[finalId]?.weapon ?? ""} ${SKIN_MAP[finalId]?.name ?? ""}`,
                  });
                }}
                disabled={!!(raffle && !raffle.drawn && !raffle.cancelled)}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 font-display text-sm font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110 disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" /> Çekilişi Başlat
              </button>
              <button
                onClick={() => {
                  cancelRaffle();
                  pushToast({ kind: "info", title: "Çekiliş iptal edildi", sub: "Katılımcılar boşa çıktı" });
                }}
                disabled={!raffle || !raffle.skinId}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-lose/40 bg-lose/10 font-display text-sm font-bold text-lose transition hover:bg-lose/20 disabled:opacity-40"
              >
                <X className="h-4 w-4" /> İptal Et
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/35">
              Aktifken oyuncular Topluluk sayfasından ücretsiz katılır; süre bitince kazananın envanterine otomatik
              eklenir. Para değil, gerçek skin ödülü çekilir.
            </p>
          </div>

          {/* ============ GÜNÜN İLK GİRİŞİ ============ */}
          <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/8 to-ink-900/70 p-5">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Günün İlk Giriş Ödülü
              </span>
              {firstLoginEvent?.active && (
                <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
                  Aktif
                </span>
              )}
            </div>

            {firstLoginEvent && (
              <div className="mt-3 rounded-xl border border-line bg-ink-900/70 px-4 py-3 text-[11px] text-white/55">
                {firstLoginEvent.winner ? (
                  <>
                    <span className="font-bold text-white/80">Kazanan:</span> {firstLoginEvent.winner.name} —{" "}
                    {money(firstLoginEvent.reward)}
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white/80">{money(firstLoginEvent.reward)}</span> — ilk giriş
                    yapan henüz belli değil
                  </>
                )}
              </div>
            )}

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                Ödül ($)
              </span>
              <input
                value={loginReward}
                onChange={(e) => setLoginReward(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3 font-display text-base font-bold text-white focus:border-brand-500/60 focus:outline-none"
              />
            </label>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  startFirstLoginEvent(Math.max(1000, Number(loginReward) || FIRST_LOGIN_REWARD));
                  coinDing();
                }}
                disabled={!!firstLoginEvent?.active}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-sm font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110 disabled:opacity-40"
              >
                <PartyPopper className="h-4 w-4" /> Başlat
              </button>
              <button
                onClick={() => {
                  stopFirstLoginEvent();
                  pushToast({ kind: "info", title: "İlk giriş etkinliği kapatıldı" });
                }}
                disabled={!firstLoginEvent?.active}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-lose/40 bg-lose/10 font-display text-sm font-bold text-lose transition hover:bg-lose/20 disabled:opacity-40"
              >
                <X className="h-4 w-4" /> Kapat
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/35">
              Aktifken günü ilk kez giriş yapan onaylı oyuncuya ödül otomatik verilir. Varsayılan:{" "}
              {money(FIRST_LOGIN_REWARD)}.
            </p>
          </div>

          {/* ============ KUTLAMA ============ */}
          <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/8 to-ink-900/70 p-5">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-amber-300" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Site Geneli Kutlama
              </span>
              {celebration && Date.now() - celebration.ts < 60 * 60 * 1000 && (
                <span className="ml-auto rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black uppercase text-amber-300">
                  Yayında
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              Tüm cihazlarda konfeti + mesaj patlatır. Büyük ödüller, çekilişler ve özel günler için kullan.
            </p>
            <input
              value={celebText}
              onChange={(e) => setCelebText(e.target.value)}
              maxLength={90}
              placeholder="Örn: Çekiliş kazananı belli oldu! 🎉"
              className="mt-4 h-11 w-full rounded-xl border border-line bg-ink-900 px-3 text-sm text-white placeholder:text-white/25 focus:border-amber-400/60 focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const t = celebText.trim();
                  if (!t) {
                    pushToast({ kind: "lose", title: "Kutlama metnini yaz", sub: "Boş kutlama gönderilemez" });
                    return;
                  }
                  if (!celebArmed) {
                    setCelebArmed(true);
                    pushToast({
                      kind: "info",
                      title: "Kutlama silahlandı",
                      sub: "Yanlışlıkla göndermemek için bir kez daha bas — tekrar basmadan gönderilmez",
                    });
                    return;
                  }
                  celebrate(t);
                  setCelebText("");
                  setCelebArmed(false);
                  pushToast({ kind: "money", title: "Kutlama yayınlandı 🎉", sub: t.slice(0, 60) });
                }}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl font-display text-sm font-black uppercase tracking-wider transition",
                  celebArmed
                    ? "bg-gradient-to-b from-lose to-red-700 text-white hover:brightness-110"
                    : "bg-gradient-to-b from-amber-400 to-amber-600 text-ink-950 hover:brightness-110"
                )}
              >
                <PartyPopper className="h-4 w-4" />
                {celebArmed ? "Emin misin? Onayla" : "Kutla"}
              </button>
              {celebArmed && (
                <button
                  onClick={() => setCelebArmed(false)}
                  className="flex h-11 w-16 items-center justify-center rounded-xl border border-line bg-ink-800 font-display text-sm font-bold text-white/50 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/35">
              Yanlışlıkla gönderimi önlemek için iki aşamalı onay kullanılır: önce <b>Kutla</b>, sonra tekrar
              basarak yayınla. Kutlama tüm cihazlara senkronlanır.
            </p>
          </div>

          {/* ============ DUYURU ============ */}
          <div className="rounded-2xl border border-line bg-ink-900/70 p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Site Duyurusu
              </span>
              {announcement && (
                <span className="ml-auto rounded-full bg-brand-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-brand-300">
                  Yayında
                </span>
              )}
            </div>

            <textarea
              value={annText}
              onChange={(e) => setAnnText(e.target.value)}
              rows={2}
              maxLength={220}
              placeholder={announcement?.text ?? "Örn: Bu akşam 21:00'de 500.000$ çekiliş var!"}
              className="mt-4 w-full resize-none rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-brand-500/60 focus:outline-none"
            />

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const t = annText.trim();
                  if (!t) {
                    pushToast({ kind: "lose", title: "Duyuru metnini yaz", sub: "Boş duyuru yayınlanamaz" });
                    return;
                  }
                  setAnnouncement(t);
                  setAnnText("");
                  pushToast({ kind: "money", title: "Duyuru yayınlandı", sub: t.slice(0, 60) });
                  coinDing();
                }}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-sm font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110"
              >
                <Megaphone className="h-4 w-4" /> Yayınla
              </button>
              {announcement && (
                <button
                  onClick={() => {
                    clearAnnouncement();
                    pushToast({ kind: "info", title: "Duyuru kaldırıldı" });
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-lose/40 bg-lose/10 font-display text-sm font-bold text-lose transition hover:bg-lose/20"
                >
                  <X className="h-4 w-4" /> Kaldır
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- AYARLAR ---------------- */}
      {sec === "settings" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ============ SKİN FİYAT YÖNETİMİ ============ */}
          <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/8 to-ink-900/70 p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="h-4 w-4 text-brand-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
                Skin Fiyatları (Global Zam / İndirim)
              </span>
              <span className="ml-auto rounded-full bg-brand-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-brand-300">
                {priceSettings ? `Son değişim: ${priceSettings.by}` : "Varsayılan (%100)"}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              %100 = normal. %150 = %50 zam, %50 = yarı fiyat. Çarpanlar{" "}
              <span className="font-bold text-white/75">kasa değerleri, pazar ve envanter değerine anında yansır</span>, tüm cihazlara yayılır.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {/* global */}
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Global <span className="text-brand-300">%{eff(priceGlobal)}</span>
                </span>
                <input
                  type="range"
                  min={10}
                  max={1000}
                  value={eff(priceGlobal)}
                  onChange={(e) => setPriceGlobal(e.target.value)}
                  className="w-full accent-brand-500"
                />
                <div className="mt-1.5 rounded-lg bg-ink-800/70 px-2.5 py-1.5 text-[9px] leading-relaxed text-white/40">
                  Örnek: <span className="text-white/60">1200 ₺ → </span>
                  <span className="font-bold text-emerald-400">
                    {money(Math.max(10, Math.round(1200 * (eff(priceGlobal) / 100))))}
                  </span>{" "}
                  · <span className="text-white/60">500.000 ₺ → </span>
                  <span className="font-bold text-amber-300">
                    {money(Math.max(10, Math.round(500000 * (eff(priceGlobal) / 100))))}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    value={priceGlobal}
                    onChange={(e) => setPriceGlobal(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    className="h-9 w-full rounded-lg border border-line bg-ink-900 px-2.5 text-xs font-bold text-white focus:border-brand-500/60 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const res = setPriceSettings({ global: eff(priceGlobal) });
                      if (res.ok) {
                        pushToast({ kind: "money", title: "Global fiyat güncellendi", sub: `%${eff(priceGlobal)}` });
                        coinDing();
                      } else pushToast({ kind: "lose", title: "Güncellenemedi", sub: res.error });
                    }}
                    className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-3 text-[10px] font-black uppercase text-ink-950 transition hover:brightness-110"
                  >
                    <Check className="h-3.5 w-3.5" /> Uygula
                  </button>
                </div>
              </label>

              {/* rarity */}
              <div className="rounded-xl border border-line bg-ink-900/70 p-3">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Nadirliğe Göre
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {rarKeys.map((r) => {
                    const cur = String(priceSettings?.byRarity?.[r] ?? 100);
                    const val = priceRar[r] ?? cur;
                    return (
                      <div key={r} className="flex items-center gap-2">
                        <span className="w-20 truncate text-[10px] font-bold" style={{ color: RARITY[r].color }}>
                          {RARITY[r].tr}
                        </span>
                        <input
                          value={val}
                          onChange={(e) => setPriceRar((p) => ({ ...p, [r]: e.target.value.replace(/\D/g, "") }))}
                          inputMode="numeric"
                          className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-ink-800 px-2 text-xs font-bold text-white focus:border-brand-500/60 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const v = eff(val);
                            const res = setPriceSettings({
                              byRarity: { ...(priceSettings?.byRarity ?? {}), [r]: v },
                            });
                            if (res.ok) {
                              pushToast({ kind: "money", title: `${RARITY[r].tr} fiyatı güncellendi`, sub: `%${v}` });
                              coinDing();
                            } else pushToast({ kind: "lose", title: "Güncellenemedi", sub: res.error });
                          }}
                          className="h-8 shrink-0 rounded-lg bg-brand-500/15 px-2 text-[9px] font-black uppercase text-brand-300 transition hover:bg-brand-500/30"
                        >
                          Set
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* skin bazlı */}
              <div className="rounded-xl border border-line bg-ink-900/70 p-3">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Skin Bazlı
                </span>
                <select
                  value={priceSkinId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPriceSkinId(id);
                    setPriceSkinVal(String(priceSettings?.bySkin?.[id] ?? 100));
                  }}
                  className="h-9 w-full rounded-lg border border-line bg-ink-900 px-2 text-xs font-bold text-white focus:border-brand-500/60 focus:outline-none"
                >
                  <option value="">Skin seç…</option>
                  {Object.values(SKIN_MAP)
                    .filter((s) => !s.sticker && !s.st && !s.sv)
                    .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.weapon} | {s.name} — {money(skinBasePrice(s.id))}
                      </option>
                    ))}
                </select>
                {priceSkinId && (
                  <>
                    <div className="mt-2 flex items-center gap-1.5">
                      <input
                        value={priceSkinVal}
                        onChange={(e) => setPriceSkinVal(e.target.value.replace(/\D/g, ""))}
                        inputMode="numeric"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-ink-800 px-2.5 text-xs font-bold text-white focus:border-brand-500/60 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const v = eff(priceSkinVal);
                          const res = setPriceSettings({
                            bySkin: { ...(priceSettings?.bySkin ?? {}), [priceSkinId]: v },
                          });
                          if (res.ok) {
                            pushToast({ kind: "money", title: "Skin fiyatı güncellendi", sub: `%${v}` });
                            coinDing();
                          } else pushToast({ kind: "lose", title: "Güncellenemedi", sub: res.error });
                        }}
                        className="h-9 shrink-0 rounded-lg bg-brand-500/15 px-2.5 text-[9px] font-black uppercase text-brand-300 transition hover:bg-brand-500/30"
                      >
                        Set
                      </button>
                    </div>
                    <div className="mt-2 text-[9px] text-white/35">
                      Taban: {money(skinBasePrice(priceSkinId))} → Etkin:{" "}
                      <span className="font-bold text-emerald-400">{money(SKIN_MAP[priceSkinId]?.price ?? 0)}</span>
                    </div>
                  </>
                )}
                <button
                  onClick={() => {
                    const res = setPriceSettings({ global: 100, byRarity: {}, bySkin: {} });
                    if (res.ok) {
                      setPriceGlobal("100");
                      setPriceRar({});
                      setPriceSkinVal("100");
                      setPriceSkinId("");
                      pushToast({ kind: "info", title: "Fiyatlar sıfırlandı", sub: "Tüm çarpanlar %100" });
                      coinDing();
                    }
                  }}
                  className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-ink-800 text-[10px] font-bold text-white/60 transition hover:bg-ink-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Tümünü Sıfırla
                </button>
              </div>

              {/* admin ilanı */}
              <div className="rounded-xl border border-line bg-ink-900/70 p-3">
                <span className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <Store className="h-3.5 w-3.5 text-brand-300" /> Admin Pazar İlanı
                </span>
                <input
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Skin ara…"
                  className="h-9 w-full rounded-lg border border-line bg-ink-900 px-2.5 text-xs text-white placeholder:text-white/25 focus:border-brand-500/60 focus:outline-none"
                />
                <div className="mt-2 flex max-h-28 flex-col gap-1 overflow-y-auto">
                  {listingSkins.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setListSkinId(s.id);
                        setListPrice(String(Math.max(1, Math.round(s.price))));
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition",
                        listSkinId === s.id
                          ? "border-brand-500/60 bg-brand-500/15"
                          : "border-line bg-ink-800 hover:border-brand-500/40"
                      )}
                    >
                      <PickImg s={s} className="h-6 w-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] font-bold text-white/80">
                          {s.weapon} | {s.name}
                        </div>
                        <div className="text-[8px] text-white/35">{money(s.price)}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {listSkinId && (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-[9px] font-bold uppercase text-white/35">Birim fiyat</span>
                        <input
                          value={listPrice}
                          onChange={(e) => setListPrice(e.target.value.replace(/\D/g, ""))}
                          inputMode="numeric"
                          className="h-9 w-full rounded-lg border border-line bg-ink-800 px-2 text-xs font-bold text-white focus:border-brand-500/60 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[9px] font-bold uppercase text-white/35">Adet (1–10)</span>
                        <input
                          value={listQty}
                          onChange={(e) => setListQty(e.target.value.replace(/\D/g, ""))}
                          inputMode="numeric"
                          className="h-9 w-full rounded-lg border border-line bg-ink-800 px-2 text-xs font-bold text-white focus:border-brand-500/60 focus:outline-none"
                        />
                      </label>
                    </div>
                    <button
                      onClick={() => {
                        const price = Math.max(1, Math.round(Number(listPrice) || 0));
                        const qty = Math.max(1, Math.min(10, Math.round(Number(listQty) || 1)));
                        const res = adminCreateListing(listSkinId, price, qty);
                        if (res.ok) {
                          pushToast({ kind: "money", title: "İlan yayınlandı", sub: `×${qty} — ${money(price)}/adet` });
                          coinDing();
                          setListSkinId("");
                          setListQuery("");
                        } else pushToast({ kind: "lose", title: "İlan oluşturulamadı", sub: res.error });
                      }}
                      className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 text-[10px] font-black uppercase text-ink-950 transition hover:brightness-110"
                    >
                      <Store className="h-3.5 w-3.5" /> İlanı Yayınla
                    </button>
                  </>
                )}
                {adminListings.length > 0 && (
                  <div className="mt-2 flex max-h-24 flex-col gap-1 overflow-y-auto">
                    {adminListings.slice(0, 5).map((l) => {
                      const s = SKIN_MAP[l.skinId];
                      return (
                        <div key={l.id} className="flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-2 py-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[9px] font-bold text-white/70">
                              {s ? `${s.weapon} | ${s.name}` : l.skinId} ×{l.qty}
                            </div>
                            <div className="text-[8px] text-emerald-400">{money(l.unitPrice)}/adet</div>
                          </div>
                          {l.qty > 0 && (
                            <button
                              onClick={() => {
                                const r = adminCancelListing(l.id);
                                if (r.ok) pushToast({ kind: "info", title: "İlan kaldırıldı" });
                              }}
                              className="rounded-lg bg-lose/10 px-2 py-1 text-[8px] font-black uppercase text-lose transition hover:bg-lose/20"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============ OTOMATİK KABUL ============ */}
          {(
            [
              {
                key: "users" as const,
                on: autoSettings.autoApproveUsers,
                set: (v: boolean) => setAutoApproval({ autoApproveUsers: v }),
                Icon: UserRoundCheck,
                title: "Üyelikleri Otomatik Kabul Et",
                desc: "Yeni kayıt olan oyuncular onay beklemeden anında kasaları açabilir. Kapatırsan başvurular tek tek senin onayına düşer.",
                color: "#2fd673",
              },
              {
                key: "deposits" as const,
                on: autoSettings.autoApproveDeposits,
                set: (v: boolean) => setAutoApproval({ autoApproveDeposits: v }),
                Icon: Banknote,
                title: "Para Taleplerini Otomatik Kabul Et",
                desc: "Oyuncuların yatırma talepleri onay bekletilmeden anında bakiyeye işlenir. Kapatırsan her talep senin onayından geçer.",
                color: "#f98e1d",
              },
            ]
          ).map(({ on, set, Icon, title, desc, color }) => (
            <div key={title} className="flex items-start gap-4 rounded-2xl border border-line bg-ink-900/70 p-5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${color}18`, color }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-bold uppercase tracking-wider text-white/85">{title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">{desc}</p>
              </div>
              <button
                onClick={() => {
                  set(!on);
                  pushToast({
                    kind: on ? "info" : "money",
                    title: !on ? "Otomatik kabul açıldı" : "Otomatik kabul kapatıldı",
                    sub: title,
                  });
                  coinDing();
                }}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                  on ? "bg-emerald-500" : "bg-ink-600"
                )}
                aria-pressed={on}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                    on ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
            </div>
          ))}

          <div className="rounded-2xl border border-brand-500/25 bg-brand-500/5 p-4 text-[11px] leading-relaxed text-white/50 lg:col-span-2">
            <ShieldCheck className="mb-1 h-4 w-4 text-brand-300" />
            Ayarlar <span className="font-bold text-white/75">tüm cihazlara otomatik yayınlanır</span> (senkron kodu
            giren herkes aynı ayarı kullanır). Çekim talepleri (para çekme) güvenlik için{" "}
            <span className="font-bold text-white/75">her zaman manuel onay</span> gerektirir.
          </div>
        </div>
      )}

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
        <>
        {/* hızlı araçlar */}
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-500/25 bg-brand-500/5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <Dices className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold uppercase tracking-wider text-white/85">
                Rastgele Skin Hediye
              </div>
              <p className="text-[11px] leading-relaxed text-white/40">
                Şanslı bir oyuncuya popüler bir skin (nadirlik ağırlıklı) gönderir.
              </p>
            </div>
            <button
              onClick={() => {
                const candidates = Object.values(SKIN_MAP).filter(
                  (s) =>
                    !s.sticker &&
                    !s.id.endsWith("-st") &&
                    !s.id.endsWith("-sv") &&
                    !/-(fn|mw|ft|ww|bs)$/.test(s.id) &&
                    (s.rarity === "covert" || s.rarity === "classified" || s.rarity === "rare")
                );
                const players = allUsers.filter((u) => u.status === "approved" && !u.isAdmin);
                if (!players.length || !candidates.length) {
                  pushToast({ kind: "lose", title: "Uygun oyuncu/skin bulunamadı" });
                  return;
                }
                const u = players[Math.floor(Math.random() * players.length)];
                const s = candidates[Math.floor(Math.random() * candidates.length)];
                const res = adminGiveSkin(u.key, s.id, { float: rollFloat() });
                if (!res.ok) {
                  pushToast({ kind: "lose", title: "Hediye gönderilemedi", sub: res.error ?? "Bilinmeyen hata" });
                  return;
                }
                coinDing();
                pushToast({
                  kind: "win",
                  title: "🎁 Rastgele hediye gönderildi",
                  sub: `${u.name} → ${s.weapon} | ${s.name} (${money(s.price)})`,
                });
              }}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-4 font-display text-xs font-black uppercase tracking-wider text-ink-950 transition hover:brightness-110"
            >
              <Gift className="h-4 w-4" /> Hediye Et
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-lose/30 bg-lose/5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lose/15 text-lose">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold uppercase tracking-wider text-white/85">
                Tehlikeli Bölge
              </div>
              <p className="text-[11px] leading-relaxed text-white/40">
                {approvedCount} hesap · toplam {money(totalBalance)} —{" "}
                <span className="font-bold text-lose">admin dahil herkesin bakiyesi 0$ olur.</span>
                {moneyReset && (
                  <span className="block pt-0.5 text-white/30">
                    Son sıfırlama: {ago(moneyReset.ts)} ({moneyReset.reason.slice(0, 40)})
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setConfirmReset(true);
                setResetReason("");
                setResetTyped("");
                click();
              }}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-lose/50 bg-lose/15 px-4 font-display text-xs font-black uppercase tracking-wider text-lose transition hover:bg-lose/25"
            >
              <AlertTriangle className="h-4 w-4" /> Hepsi 0$
            </button>
          </div>
        </div>

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
                    {(() => {
                      const fresh = u.pub && Date.now() - u.pub.ts < 60000;
                      return (
                        <div className="flex items-center justify-end gap-1.5 font-display text-base font-black text-emerald-400">
                          {fresh && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Çevrimiçi" />}
                          {money(fresh ? u.pub!.balance : u.balance)}
                        </div>
                      );
                    })()}
                    {u.pub && Date.now() - u.pub.ts < 60000 ? (
                      <div className="text-[9px] text-white/25">canlı bakiye</div>
                    ) : (
                      <div className="text-[9px] text-white/25">yerel kayıt</div>
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
                          if (e.key === "Enter") requestAdjustment(u.key, u.name, 1);
                        }}
                        inputMode="numeric"
                        placeholder="Tutar"
                        className="h-full w-20 bg-transparent text-[11px] font-bold text-white placeholder:text-white/25 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => requestAdjustment(u.key, u.name, 1)}
                      className="flex h-8 items-center gap-0.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-500/20"
                    >
                      <Plus className="h-3 w-3" strokeWidth={3} /> Ekle
                    </button>
                    <button
                      onClick={() => requestAdjustment(u.key, u.name, -1)}
                      className="flex h-8 items-center gap-0.5 rounded-lg border border-lose/40 bg-lose/10 px-2 text-[11px] font-bold text-lose transition hover:bg-lose/20"
                    >
                      <Minus className="h-3 w-3" strokeWidth={3} /> Sil
                    </button>
                    <button
                      onClick={() => {
                        setSkinPickMode("give");
                        setSkinFor({ key: u.key, name: u.name });
                        setSkinQuery("");
                        setSkinRarity("all");
                        setSkinPageRaw(0);
                        setSkinDetail(null);
                        click();
                      }}
                      className="flex h-8 items-center gap-0.5 rounded-lg border border-brand-500/40 bg-brand-500/10 px-2 text-[11px] font-bold text-brand-300 transition hover:bg-brand-500/20"
                    >
                      <Gift className="h-3 w-3" strokeWidth={2.6} /> Skin
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
        </>
      )}

      {/* ---------------- DENETİM KAYDI ---------------- */}
      {sec === "players" && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink-900/70">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
              Denetim Kaydı
            </span>
            <span className="ml-auto text-[10px] font-bold text-white/30">
              {adminLog.filter((l) => Date.now() - l.ts < 24 * 3600 * 1000).length} işlem / 24s • tek işlem{" "}
              {money(ADMIN_ADJUST_MAX)} • 24s {money(ADMIN_ADJUST_DAILY)}
            </span>
          </div>
          {adminLog.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/30">Henüz bakiye işlemi yapılmadı</p>
          ) : (
            <div className="divide-y divide-line">
              {adminLog.slice(0, 12).map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span className="text-[10px] font-bold text-white/25">{ago(l.ts)}</span>
                  <span className="text-xs font-bold text-white/60">{l.actor}</span>
                  <span className="text-white/25">→</span>
                  <span className="text-xs font-bold text-white">{l.targetName}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-display text-[11px] font-black",
                      l.amount > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-lose/15 text-lose"
                    )}
                  >
                    {l.amount > 0 ? "+" : ""}
                    {money(l.amount)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white/35" title={l.reason}>
                    {l.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- BAKİYE İŞLEMİ ONAY MODALI ---------------- */}
      <AnimatePresence>
        {confirmAdj && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur"
            onClick={() => setConfirmAdj(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-line bg-ink-900 p-5"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-400" />
                <span className="font-display text-base font-bold uppercase tracking-wider text-white/90">
                  İşlemi Onayla
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-line bg-ink-800 px-4 py-3 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Hesap</span>
                  <span className="font-bold text-white">{confirmAdj.name}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-white/60">
                  <span>İşlem</span>
                  <span
                    className={cn(
                      "font-display font-black",
                      confirmAdj.dir > 0 ? "text-emerald-400" : "text-lose"
                    )}
                  >
                    {confirmAdj.dir > 0 ? "+" : "−"}
                    {money(confirmAdj.amount)}
                  </span>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  İşlem Gerekçesi (denetim kaydı — zorunlu)
                </span>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  rows={2}
                  maxLength={140}
                  placeholder="Örn: Çekiliş ödülü manuel teslim"
                  autoFocus
                  className="w-full resize-none rounded-xl border border-line bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-brand-500/60 focus:outline-none"
                />
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Onay için <span className="text-brand-300">ONAY</span> yaz
                </span>
                <input
                  value={confirmTyped}
                  onChange={(e) => setConfirmTyped(e.target.value)}
                  placeholder="ONAY"
                  className="h-11 w-full rounded-xl border border-line bg-ink-800 px-3 font-display text-sm font-bold uppercase text-white placeholder:text-white/20 focus:border-brand-500/60 focus:outline-none"
                />
              </label>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setConfirmAdj(null)}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-ink-800 font-display text-sm font-bold text-white/60 transition hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  onClick={applyAdjustment}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl font-display text-sm font-black uppercase tracking-wider transition",
                    confirmAdj.dir > 0
                      ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950 hover:brightness-110"
                      : "bg-gradient-to-b from-lose to-red-700 text-white hover:brightness-110"
                  )}
                >
                  <Check className="h-4 w-4" strokeWidth={3} /> Onayla
                </button>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-white/30">
                Sınırlar: tek işlem {money(ADMIN_ADJUST_MAX)}, 24 saatte {money(ADMIN_ADJUST_DAILY)}. Admin
                hesaplarına işlem yapılamaz; her işlem gerekçesiyle denetim kaydına yazılır.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- TOPLU BAKİYE SIFIRLAMA ONAY MODALI ---------------- */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur"
            onClick={() => setConfirmReset(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-lose/40 bg-ink-900 p-5"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-lose" />
                <span className="font-display text-base font-bold uppercase tracking-wider text-lose">
                  Tüm Bakiyeleri Sıfırla
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-lose/30 bg-lose/10 px-4 py-3 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Etkilenecek hesap</span>
                  <span className="font-bold text-white">{approvedCount} onaylı oyuncu</span>
                </div>
                <div className="mt-1.5 flex justify-between text-white/60">
                  <span>Toplam sıfırlanacak</span>
                  <span className="font-display font-black text-lose">{money(totalBalance)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-white/60">
                  <span>Sen dahil</span>
                  <span className="font-bold text-white">✅ {ADMIN_NAME} hesabı da 0$ olur</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                Bu işlem <span className="font-bold text-white/70">geri alınamaz</span> ve tüm cihazlara yayılır —
                envanterler silinmez, yalnızca paralar sıfırlanır. Ekonomicide kalan para geri çekilir.
              </p>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Sıfırlama Gerekçesi (denetim kaydı — zorunlu)
                </span>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  rows={2}
                  maxLength={140}
                  placeholder="Örn: Yeni sezon ekonomisi — tüm bakiyeler 0'dan başlıyor"
                  autoFocus
                  className="w-full resize-none rounded-xl border border-line bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-lose/60 focus:outline-none"
                />
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Onay için <span className="text-lose">SUPR</span> yaz
                </span>
                <input
                  value={resetTyped}
                  onChange={(e) => setResetTyped(e.target.value)}
                  placeholder="SUPR"
                  className="h-11 w-full rounded-xl border border-line bg-ink-800 px-3 font-display text-sm font-bold uppercase text-white placeholder:text-white/20 focus:border-lose/60 focus:outline-none"
                />
              </label>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-ink-800 font-display text-sm font-bold text-white/60 transition hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => {
                    const reason = resetReason.trim();
                    if (reason.length < 3) {
                      pushToast({ kind: "lose", title: "Gerekçe yaz", sub: "En az 3 karakter — denetim kaydı için zorunlu" });
                      return;
                    }
                    if (resetTyped.trim().toUpperCase() !== "SUPR") {
                      pushToast({ kind: "lose", title: "Onay için SUPR yaz", sub: "Yanlışlıkla sıfırlamayı önlemek için zorunlu" });
                      return;
                    }
                    const res = resetAllMoney(reason);
                    if (!res.ok) {
                      pushToast({ kind: "lose", title: "Sıfırlama başarısız", sub: res.error ?? "Bilinmeyen hata" });
                      return;
                    }
                    setConfirmReset(false);
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-lose to-red-700 font-display text-sm font-black uppercase tracking-wider text-white transition hover:brightness-110"
                >
                  <AlertTriangle className="h-4 w-4" /> Hepsini Sıfırla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- SKİN HEDİYE MODALI (TAM EKRAN) ---------------- */}
      <AnimatePresence>
        {skinFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex flex-col bg-ink-950/98 backdrop-blur-md"
          >
            {/* başlık */}
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              {skinDetail && (
                <button
                  onClick={() => setSkinDetail(null)}
                  className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 text-xs font-bold text-white/60 transition hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" /> Geri
                </button>
              )}
              <Gift className="h-5 w-5 text-brand-400" />
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-bold leading-tight">
                  {skinDetail
                    ? "Skin Detayı"
                    : skinPickMode === "raffle"
                      ? "Çekiliş Ödülü Seç"
                      : "Skin Hediye Et"}
                </div>
                <div className="truncate text-[11px] text-white/40">
                  {skinPickMode === "raffle" ? (
                    <span>
                      Ödül olacak skin — <span className="font-bold text-white/70">çekilişe katılan kazanır</span>
                    </span>
                  ) : (
                    <>
                      Oyuncu: <span className="font-bold text-white/70">{skinFor.name}</span>
                    </>
                  )}
                  {!skinDetail && ` · ${skinResults.length.toLocaleString("tr-TR")} skin`}
                </div>
              </div>
              <button
                onClick={() => {
                  setSkinFor(null);
                  setSkinDetail(null);
                }}
                className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!skinDetail ? (
              <>
                {/* arama + filtre */}
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                  <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-ink-900 px-3">
                    <Search className="h-4 w-4 shrink-0 text-white/30" />
                    <input
                      value={skinQuery}
                      onChange={(e) => {
                        setSkinQuery(e.target.value);
                        setSkinPageRaw(0);
                      }}
                      placeholder="Silah veya skin ara… (örn. AWP, Karambit, Redline)"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
                    />
                  </div>
                  <select
                    value={skinRarity}
                    onChange={(e) => {
                      setSkinRarity(e.target.value);
                      setSkinPageRaw(0);
                    }}
                    className="h-10 rounded-xl border border-line bg-ink-900 px-3 text-[11px] font-bold text-white/70 focus:outline-none"
                  >
                    <option value="all">Tüm nadirlikler</option>
                    {Object.entries(RARITY)
                      .sort((a, b) => b[1].order - a[1].order)
                      .map(([k, r]) => (
                        <option key={k} value={k}>
                          {r.tr}
                        </option>
                      ))}
                  </select>
                </div>

                {/* grid */}
                <div className="tiny-scroll min-h-0 flex-1 overflow-y-auto p-4">
                  {skinPageItems.length === 0 ? (
                    <p className="py-16 text-center text-sm text-white/35">Skin bulunamadı — aramayı değiştir</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                      {skinPageItems.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSkinDetail(newSkinDraft(s));
                            click();
                          }}
                          className="group overflow-hidden rounded-xl border border-line bg-ink-900/80 text-left transition hover:-translate-y-0.5 hover:border-brand-500/60 hover:shadow-lg"
                        >
                          <div
                            className="relative h-24 w-full"
                            style={{
                              background: `radial-gradient(120% 90% at 50% 0%, ${RARITY[s.rarity].color}1a 0%, transparent 60%), linear-gradient(to bottom, #10131d, #0a0d16)`,
                            }}
                          >
                            <PickImg s={s} className="h-full w-full p-1.5 transition group-hover:scale-105" />
                            <span
                              className="absolute bottom-1.5 right-1.5 rounded bg-ink-950/80 px-1.5 py-0.5 text-[9px] font-black"
                              style={{ color: RARITY[s.rarity].color }}
                            >
                              {RARITY[s.rarity].tr.slice(0, 4)}
                            </span>
                          </div>
                          <div className="border-t border-line/70 px-2 py-1.5">
                            <div className="truncate text-[10px] font-bold text-white/80">{s.weapon}</div>
                            <div className="truncate text-[10px] text-white/40">{s.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* sayfalama */}
                <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line px-4 py-3">
                  <button
                    onClick={() => setSkinPageRaw((p) => Math.max(0, p - 1))}
                    disabled={skinPage === 0}
                    className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 text-xs font-bold text-white/60 transition hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" /> Önceki
                  </button>
                  <span className="px-2 text-xs font-bold text-white/50">
                    Sayfa {skinPage + 1} / {skinPages} · {skinResults.length} skin
                  </span>
                  <button
                    onClick={() => setSkinPageRaw((p) => Math.min(skinPages - 1, p + 1))}
                    disabled={skinPage >= skinPages - 1}
                    className="flex h-9 items-center gap-1 rounded-lg border border-line bg-ink-800 px-3 text-xs font-bold text-white/60 transition hover:text-white disabled:opacity-30"
                  >
                    Sonraki <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <SkinDetailPanel
                draft={skinDetail}
                setDraft={setSkinDetail}
                playerName={skinFor.name}
                playerKey={skinFor.key}
                mode={skinPickMode}
                onClose={() => {
                  setSkinFor(null);
                  setSkinDetail(null);
                }}
                onSent={() => {
                  pushToast({
                    kind: "money",
                    title: `Skin gönderildi: ${SKIN_MAP[skinDetail.id]?.weapon ?? ""} ${SKIN_MAP[skinDetail.id]?.name ?? ""}`,
                    sub: `${skinFor.name} envanterine eklenecek`,
                  });
                  coinDing();
                  setSkinFor(null);
                  setSkinDetail(null);
                }}
                onPick={(draft) => {
                  setRaffleSkin(draft);
                  pushToast({
                    kind: "win",
                    title: "Çekiliş ödülü seçildi 🎁",
                    sub: `${SKIN_MAP[skinDetail.id]?.weapon ?? ""} ${SKIN_MAP[skinDetail.id]?.name ?? ""} — çekilişi başlatabilirsin`,
                  });
                  coinDing();
                  setSkinFor(null);
                  setSkinDetail(null);
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- SKİN DETAY PANELİ — durum/versiyon/sticker seç, yolla ---------------- */
function SkinDetailPanel({
  draft,
  setDraft,
  playerName,
  playerKey,
  mode,
  onClose,
  onSent,
  onPick,
}: {
  draft: SkinDraft;
  setDraft: (d: SkinDraft) => void;
  playerName: string;
  playerKey: string;
  mode: "give" | "raffle";
  onClose: () => void;
  onSent: () => void;
  onPick: (d: SkinDraft) => void;
}) {
  const { adminGiveSkin, pushToast } = useGame();
  const baseId = draft.id.replace(/-(st|sv)$/, "");
  const skin = SKIN_MAP[baseId];
  if (!skin) return null;
  const r = RARITY[skin.rarity];
  const stExists = !!SKIN_MAP[baseId + "-st"];
  const svExists = !!SKIN_MAP[baseId + "-sv"];
  const wear = draft.wear === "random" ? null : WEARS[draft.wear];
  const finalId = draft.version === "st" ? baseId + "-st" : draft.version === "sv" ? baseId + "-sv" : baseId;

  function send() {
    const opts: { float?: number; stickers?: string[] } = {};
    if (draft.wear !== "random") opts.float = draft.float;
    if (draft.stickers.length) opts.stickers = draft.stickers;
    if (mode === "raffle") {
      onPick(draft);
      return;
    }
    const res = adminGiveSkin(playerKey, finalId, opts);
    if (!res.ok) {
      pushToast({ kind: "lose", title: "Skin gönderilemedi", sub: res.error ?? "Bilinmeyen hata" });
      return;
    }
    onSent();
  }

  return (
    <div className="tiny-scroll min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------- büyük görsel + bilgi ---------- */}
        <div className="rounded-2xl border border-line bg-ink-900/80 p-4">
          <div
            className="relative flex h-52 items-center justify-center overflow-hidden rounded-xl sm:h-80"
            style={{
              background: `radial-gradient(130% 100% at 50% 0%, ${r.color}24 0%, transparent 60%), linear-gradient(to bottom, #10131d, #0a0d16)`,
            }}
          >
            <PickImg s={skin} className="h-full w-full p-3 sm:p-6" />
            <span
              className="absolute left-3 top-3 rounded bg-ink-950/80 px-2 py-1 text-[10px] font-black uppercase tracking-wider"
              style={{ color: r.color }}
            >
              {r.tr}
            </span>
            {(draft.version === "st" || draft.version === "sv") && (
              <span className="absolute right-3 top-3 rounded bg-ink-950/80 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-brand-300">
                {draft.version === "st" ? "StatTrak™" : "Hatıra"}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">{skin.weapon}</div>
              <div className="font-display text-2xl font-black text-white">{skin.name}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-white/35">Değer</div>
              <div className="font-display text-xl font-black text-emerald-400">{money(skin.price)}</div>
            </div>
          </div>

          {wear && (
            <div className="mt-4 rounded-xl border border-line bg-ink-800/70 p-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                <span style={{ color: wear.color }}>{wear.tr}</span>
                <span className="tabular-nums text-white/70">
                  {draft.float.toFixed(4)} · x{wear.mult.toFixed(2)}
                </span>
              </div>
              <FloatBar float={draft.float} />
            </div>
          )}
        </div>

        {/* ---------- ayarlar ---------- */}
        <div className="space-y-4">
          {/* versiyon */}
          <div className="rounded-2xl border border-line bg-ink-900/80 p-4">
            <div className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-white/45">Versiyon</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { k: "base", label: "Normal", ok: true },
                  { k: "st", label: "StatTrak™", ok: stExists },
                  { k: "sv", label: "Hatıra", ok: svExists },
                ] as const
              ).map((v) => (
                <button
                  key={v.k}
                  disabled={!v.ok}
                  onClick={() => setDraft({ ...draft, version: v.k })}
                  className={cn(
                    "h-10 rounded-xl border text-[11px] font-bold transition",
                    draft.version === v.k
                      ? "border-brand-500/70 bg-brand-500/15 text-brand-300"
                      : "border-line bg-ink-800 text-white/45 hover:text-white",
                    !v.ok && "cursor-not-allowed opacity-30"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* durum */}
          <div className="rounded-2xl border border-line bg-ink-900/80 p-4">
            <div className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-white/45">
              Durum (Aşınma)
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setDraft({ ...draft, wear: "random" })}
                className={cn(
                  "h-9 rounded-lg border px-3 text-[11px] font-bold transition",
                  draft.wear === "random"
                    ? "border-brand-500/70 bg-brand-500/15 text-brand-300"
                    : "border-line bg-ink-800 text-white/45 hover:text-white"
                )}
              >
                🎲 Rastgele
              </button>
              {WEAR_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => setDraft({ ...draft, wear: k, float: wearFloat(k) })}
                  className={cn(
                    "h-9 rounded-lg border px-3 text-[11px] font-bold transition",
                    draft.wear === k
                      ? "border-brand-500/70 bg-brand-500/15 text-brand-300"
                      : "border-line bg-ink-800 text-white/45 hover:text-white"
                  )}
                >
                  {WEARS[k].short}
                </button>
              ))}
            </div>
            {draft.wear !== "random" && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span style={{ color: wear?.color }}>{wear?.tr}</span>
                  <button
                    onClick={() => setDraft({ ...draft, float: wearFloat(draft.wear as WearKey) })}
                    className="flex items-center gap-1 rounded-lg border border-line bg-ink-800 px-2 py-1 text-[10px] font-bold text-white/55 transition hover:text-white"
                  >
                    <Dices className="h-3 w-3" /> Yeni değer
                  </button>
                </div>
                <div className="rounded-lg border border-line bg-ink-800/70 px-3 py-2 font-mono text-sm font-bold tabular-nums text-white/85">
                  Float: {draft.float.toFixed(4)}
                </div>
              </div>
            )}
          </div>

          {/* sticker */}
          <div className="rounded-2xl border border-line bg-ink-900/80 p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/45">
                Sticker ({draft.stickers.length}/{MAX_STICKERS})
              </div>
              {draft.stickers.length > 0 && (
                <button
                  onClick={() => setDraft({ ...draft, stickers: [] })}
                  className="text-[10px] font-bold text-lose hover:underline"
                >
                  Temizle
                </button>
              )}
            </div>
            <p className="mb-2.5 text-[10px] text-white/30">
              İsteğe bağlı — seçtiklerin eşyaya yapışık gönderilir.
            </p>
            <div className="tiny-scroll flex gap-1.5 overflow-x-auto pb-1">
              {STICKERS.map((s2) => {
                const sel = draft.stickers.includes(s2.id);
                const full = !sel && draft.stickers.length >= MAX_STICKERS;
                return (
                  <button
                    key={s2.id}
                    disabled={full}
                    title={`${s2.name} — ${money(s2.price)}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        stickers: sel
                          ? draft.stickers.filter((x) => x !== s2.id)
                          : [...draft.stickers, s2.id].slice(0, MAX_STICKERS),
                      })
                    }
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-ink-950 transition",
                      sel
                        ? "border-brand-500 bg-brand-500/15"
                        : "border-line hover:border-white/30",
                      full && "opacity-30"
                    )}
                  >
                    <img src={s2.img} alt={s2.name} className="h-8 w-8 object-contain" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* gönder / ödül olarak seç */}
          <button
            onClick={send}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-black uppercase tracking-wider transition hover:brightness-110",
              mode === "raffle"
                ? "bg-gradient-to-b from-amber-400 to-amber-600 text-ink-950"
                : "bg-gradient-to-b from-emerald-400 to-emerald-600 text-ink-950"
            )}
          >
            <Gift className="h-4 w-4" />
            {mode === "raffle" ? "Çekiliş ödülü olarak seç" : `${playerName} kişisine gönder`}
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center rounded-xl border border-line bg-ink-800 text-xs font-bold text-white/50 transition hover:text-white"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
