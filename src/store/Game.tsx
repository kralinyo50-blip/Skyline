import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SKIN_MAP, SKINS, TIER_ORDER, type Skin } from "../data/skins";
import {
  isStickerItem,
  itemValue,
  makeSkinItem,
  makeStickerItem,
  maybeAttachStickers,
} from "../data/items";
import { rollFloat } from "../data/wear";
import { MAX_STICKERS, STICKERS, STICKER_MAP, CUSTOM_STICKER_COST } from "../data/stickers";
import {
  buildCustomSticker,
  registerCustomSticker,
  type CustomStickerInput,
} from "../data/custom";

const STICKER_POOL = STICKERS.map((s) => s.id);
import { setAudioMuted, coinDing, click } from "../lib/audio";
import { randHex, seededRng, uid } from "../lib/rng";
import {
  SCALE,
  START_BALANCE,
  money,
  ADMIN_NAME,
  QUICK_SELL_RATE,
  MARKET_FEE,
  REFERRAL_LEVEL,
  REFERRAL_BONUS,
  PITY_GUARANTEE,
  FIRST_LOGIN_REWARD,
  RAFFLE_FREQ_MS,
  RAFFLE_PRIZE,
  isValidMcName,
} from "../config";
import {
  generateBotListings,
  makeBotListing,
  generateTradeOffers,
  makeTradeOffer,
  sellChance,
  type Listing,
  type TradeOffer,
} from "../data/market";
import {
  loadDB,
  saveDB,
  newAccount,
  normKey,
  currentUser,
  pendingUsers,
  pendingDeposits,
  getSyncUrl,
  setSyncUrlLS,
  getSyncCode,
  setSyncCodeLS,
  emptyMissions,
  type Account,
  type DB,
  type DepositReq,
  type InvItem,
  type MissionProgress,
  type MyListing,
  type Stats,
  type RollLog,
  type Announcement,
  type RaffleState,
  type FirstLoginEvent,
  type AutoSettings,
} from "./db";
import { MISSIONS, todayKey, type MissionKey } from "../data/missions";
import { ACHIEVEMENTS, ACH_MAP, type AchievementDef } from "../data/achievements";
import { rollCaseSeeded, rollCasePity, type CaseDef } from "../data/cases";
import {
  startSync,
  stopSync,
  forceSync,
  toCloudDoc,
  type SyncStatus,
} from "./sync";
import { startMqtt, stopMqtt, normalizeCode, notifyDbChanged } from "./syncMqtt";
import {
  startTradeNet,
  stopTradeNet,
  sendTradeMsg,
  tradeScope,
  type TradeMsg,
  type TradeItemPayload,
} from "./tradeNet";

export type { InvItem, Stats, Account, DepositReq };

export type TabKey =
  | "cases"
  | "upgrader"
  | "battle"
  | "games"
  | "market"
  | "trade"
  | "inventory"
  | "admin"
  | "stats"
  | "community";

export interface Toast {
  id: string;
  kind: "win" | "lose" | "info" | "money";
  title: string;
  sub?: string;
}

/* ---------------- canlı P2P takas ---------------- */

/** Gelen (henüz yanıtlanmamış) teklif */
export interface P2pOffer {
  id: string;
  room: string;
  from: string;
  fromKey: string;
  items: TradeItemPayload[];
  wantCash: number;
  note?: string;
  ts: number;
}

export type P2pRoomStatus =
  | "waiting" // teklif iletildi, yanıt bekleniyor
  | "accepted" // karşı taraf kabul etti, işlem yapılıyor
  | "done" // takas tamamlandı
  | "declined"
  | "cancelled"
  | "failed"; // eşyalar artık envanterde yok

export interface P2pRoom {
  id: string;
  room: string;
  role: "sender" | "receiver";
  partner: string;
  partnerKey: string;
  /** benim koyduğum eşyaların uid'leri */
  myUids: string[];
  /** benim koyduğum eşyaların iletim paketi */
  givePayload: TradeItemPayload[];
  /** karşı taraftan alacağım eşyalar */
  theirItems?: TradeItemPayload[];
  /** karşı taraftan alacağım / ödeyeceğim nakit */
  cash?: number;
  wantCash: number;
  note?: string;
  status: P2pRoomStatus;
  ts: number;
}

export const LEVEL_TITLES: { min: number; title: string }[] = [
  { min: 30, title: "Efsane" },
  { min: 20, title: "Elmas" },
  { min: 15, title: "Platin" },
  { min: 10, title: "Altın" },
  { min: 5, title: "Gümüş" },
  { min: 1, title: "Bronz" },
];

function xpCum(level: number): number {
  return 40 * SCALE * Math.pow(level - 1, 1.6);
}

export function levelFromSpent(spent: number): number {
  let lvl = 1;
  while (xpCum(lvl + 1) <= spent && lvl < 99) lvl++;
  return lvl;
}

export function levelTitle(level: number): string {
  for (const t of LEVEL_TITLES) if (level >= t.min) return t.title;
  return "Bronz";
}

export const DAILY_COOLDOWN = 20 * 60 * 60 * 1000;

interface GameState {
  db: DB;
  user: Account | null;
  loggedIn: boolean;
  isAdmin: boolean;
  userName: string;
  login: (name: string, refCode?: string) => { ok: boolean; error?: string };
  logout: () => void;

  balance: number;
  inventory: InvItem[];
  inventoryValue: number;
  stats: Stats;
  nonce: number;
  serverSeed: string;
  lastDaily: number | null;
  level: number;
  levelTitleStr: string;
  levelProgress: number;
  xpCurrent: number;
  xpNeeded: number;

  muted: boolean;
  tab: TabKey;
  toasts: Toast[];
  upgraderPick: string | null;
  setTab: (t: TabKey) => void;
  setUpgraderPick: (uidKey: string | null) => void;
  toggleMute: () => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;

  addFunds: (n: number) => void;
  trySpend: (n: number) => boolean;
  credit: (n: number) => void;
  addItem: (
    skinId: string,
    opts?: { stickered?: boolean; float?: number; stickers?: string[] }
  ) => InvItem;
  removeItem: (uidKey: string) => void;
  sellItem: (uidKey: string) => Skin | null;
  bumpNonce: () => void;
  trackOpen: (price: number) => void;
  trackWager: (amount: number) => void;
  trackDrop: (value: number) => void;
  claimDaily: () => number | null;

  myDeposits: DepositReq[];
  requestDeposit: (amount: number, method: string) => void;
  requestWithdraw: (amount: number, method: string, payTo: string) => boolean;
  heldBalance: number;

  /* görevler */
  missions: MissionProgress;
  trackMission: (key: MissionKey, amount?: number) => void;
  claimMission: (id: string) => void;

  /* trade-up kontratı */
  tradeUp: (uidKeys: string[]) => Skin | null;

  /* sticker */
  applySticker: (weaponUid: string, stickerUid: string) => boolean;
  scrapeSticker: (weaponUid: string, index: number) => void;
  createCustomSticker: (input: CustomStickerInput) => boolean;

  /* takas */
  tradeOffers: TradeOffer[];
  refreshTrades: () => void;
  acceptTrade: (offerId: string, myUids: string[]) => boolean;

  /* canlı P2P takas */
  p2pOffers: P2pOffer[];
  p2pRooms: P2pRoom[];
  p2pStatus: "off" | "busy" | "ok" | "error";
  p2pScope: string;
  sendOffer: (
    targetName: string,
    myUids: string[],
    wantCash: number,
    note?: string
  ) => { ok: boolean; error?: string };
  respondOffer: (offerId: string, accept: boolean, myUids?: string[]) => boolean;
  cancelOffer: (roomId: string) => boolean;

  /* referans sistemi */
  refCode: string;
  refLevel: number;
  refBonus: number;
  referralFriends: Account[];
  refInvited: boolean;

  /* kasa geçmişi + provably fair */
  rollLogs: RollLog[];
  openCase: (def: CaseDef) => { skin: import("../data/skins").Skin; seed: string; nonce: number; forced: boolean };
  verifyRoll: (seed: string, nonce: number, def: CaseDef) => import("../data/skins").Skin;

  /* başarımlar */
  achievements: AchievementDef[];
  unlockedAch: string[];
  claimAch: (id: string) => void;

  /* admin: skin hediyesi */
  adminGiveSkin: (key: string, skinId: string, opts?: { float?: number; stickers?: string[] }) => void;

  /* duyuru */
  announcement: Announcement | null;
  setAnnouncement: (text: string) => void;
  clearAnnouncement: () => void;

  /* otomatik çekiliş */
  raffle: RaffleState | null;
  raffleEntered: boolean;
  toastRaffle: string | null;
  startRaffle: (minutes: number, prize: number) => void;
  cancelRaffle: () => void;
  enterRaffle: () => void;

  /* günün ilk giriş ödülü */
  firstLoginEvent: FirstLoginEvent | null;
  startFirstLoginEvent: (reward: number) => void;
  stopFirstLoginEvent: () => void;

  /* admin otomatik kabul ayarları */
  autoSettings: AutoSettings;
  setAutoApproval: (p: Partial<Pick<AutoSettings, "autoApproveUsers" | "autoApproveDeposits">>) => void;

  /* pazar */
  botListings: Listing[];
  myListings: MyListing[];
  quickSell: (uidKey: string) => { skin: Skin | null; payout: number } | null;
  listOnMarket: (uidKey: string, price: number) => boolean;
  cancelListing: (listingId: string) => void;
  buyListing: (listingId: string) => boolean;
  refreshMarket: () => void;

  pendingUserList: Account[];
  pendingDepositList: DepositReq[];
  allUsers: Account[];
  allDeposits: DepositReq[];
  approveUser: (key: string) => void;
  rejectUser: (key: string) => void;
  approveDeposit: (id: string) => void;
  rejectDeposit: (id: string) => void;
  adminAdjust: (key: string, delta: number) => void;
  resetAll: () => void;

  syncUrl: string | null;
  syncStatus: SyncStatus;
  setSyncUrl: (url: string | null) => void;
  syncCode: string | null;
  setSyncCode: (code: string | null) => void;
  syncNow: () => void;
}

const GameCtx = createContext<GameState | null>(null);

/** geçerli sekme anahtarları — F5 sonrası geri yükleme doğrulaması için */
const TAB_KEYS: Record<TabKey, true> = {
  cases: true,
  upgrader: true,
  battle: true,
  games: true,
  market: true,
  trade: true,
  inventory: true,
  admin: true,
  stats: true,
  community: true,
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB());
  const [muted, setMuted] = useState(false);
  const [tab, setTabState] = useState<TabKey>(() => {
    /* F5'te kullanıcı aynı sekmede kalır */
    const t = localStorage.getItem("skyline-tab") as TabKey | null;
    return t && t in TAB_KEYS ? t : "cases";
  });
  const setTab = useCallback((t: TabKey) => {
    setTabState(t);
    try {
      localStorage.setItem("skyline-tab", t);
    } catch {
      /* yoksay */
    }
  }, []);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [upgraderPick, setUpgraderPick] = useState<string | null>(null);
  const [serverSeed, setServerSeed] = useState(randHex(64));
  const [syncUrl, setSyncUrlState] = useState<string | null>(() => getSyncUrl());
  const [syncCode, setSyncCodeState] = useState<string | null>(() => getSyncCode());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncCode() || getSyncUrl() ? "busy" : "off");
  const [botListings, setBotListings] = useState<Listing[]>(() => generateBotListings());
  const botListingsRef = useRef(botListings);
  botListingsRef.current = botListings;
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>(() => generateTradeOffers());
  const tradeOffersRef = useRef(tradeOffers);
  tradeOffersRef.current = tradeOffers;
  /* --- canlı P2P takas durumu --- */
  const [p2pOffers, setP2pOffers] = useState<P2pOffer[]>([]);
  const p2pOffersRef = useRef(p2pOffers);
  p2pOffersRef.current = p2pOffers;
  const [p2pRooms, setP2pRooms] = useState<P2pRoom[]>([]);
  const p2pRoomsRef = useRef(p2pRooms);
  p2pRoomsRef.current = p2pRooms;
  const [p2pStatus, setP2pStatus] = useState<"off" | "busy" | "ok" | "error">("off");
  /* bir tarafta takas yalnızca bir kez işlensin */
  const p2pExecutedRef = useRef<Set<string>>(new Set());
  const toastTimers = useRef<number[]>([]);
  const levelRef = useRef(1);
  const seenDepositRef = useRef<Set<string>>(new Set());
  const dbRef = useRef(db);
  dbRef.current = db;

  const user = currentUser(db);

  useEffect(() => setAudioMuted(muted), [muted]);
  useEffect(() => () => toastTimers.current.forEach(clearTimeout), []);

  const mutate = useCallback((fn: (draft: DB) => void) => {
    const fresh = loadDB();
    fn(fresh);
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
  }, []);

  /* aynı tarayıcıdaki sekmeler arası senkron */
  useEffect(() => {
    const sync = () => setDb(loadDB());
    window.addEventListener("storage", sync);
    const iv = window.setInterval(sync, 1500);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(iv);
    };
  }, []);

  /* sunucu kodu (MQTT) senkronu — kod varsa öncelik bu */
  useEffect(() => {
    if (!syncCode) {
      stopMqtt();
      return;
    }
    setSyncStatus("busy");
    startMqtt(syncCode, {
      getLocal: () => dbRef.current,
      apply: (merged) => {
        saveDB(merged);
        setDb(merged);
      },
      toDoc: (d) => JSON.stringify(toCloudDoc(d)),
      onStatus: setSyncStatus,
    });
    return () => stopMqtt();
  }, [syncCode]);

  /* bulut senkron motoru (URL/yedek mod) */
  useEffect(() => {
    stopSync();
    if (syncCode) {
      /* kod modu aktifken URL modu kapalı */
      return;
    }
    if (!syncUrl) {
      setSyncStatus((s) => (syncCode ? s : "off"));
      return;
    }
    setSyncStatus("busy");
    startSync(syncUrl, {
      getLocal: () => dbRef.current,
      apply: (merged) => {
        saveDB(merged);
        setDb(merged);
      },
      onStatus: setSyncStatus,
    });
    return () => stopSync();
  }, [syncUrl, syncCode]);

  const setSyncUrl = useCallback((url: string | null) => {
    setSyncUrlLS(url);
    setSyncUrlState(url);
    if (url) pushToastSafe.current({ kind: "info", title: "Bulut senkronu aktif", sub: "Talepler artık tüm cihazlara düşer" });
  }, []);

  const setSyncCode = useCallback((code: string | null) => {
    const normalized = code ? normalizeCode(code) : null;
    const finalCode = normalized && normalized.length >= 4 ? normalized : null;
    setSyncCodeLS(finalCode);
    setSyncCodeState(finalCode);
    if (finalCode)
      pushToastSafe.current({
        kind: "info",
        title: `Sunucu kodu aktif: ${finalCode}`,
        sub: "Aynı kodu giren herkesle anında senkronizsun",
      });
  }, []);

  const pushToastSafe = useRef<(t: Omit<Toast, "id">) => void>(() => {});

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = uid();
      setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
      const timer = window.setTimeout(() => dismissToast(id), 4600);
      toastTimers.current.push(timer);
    },
    [dismissToast]
  );
  pushToastSafe.current = pushToast;

  const updateMe = useCallback(
    (fn: (acc: Account) => void) => {
      mutate((draft) => {
        if (!draft.session) return;
        const me = draft.users[draft.session];
        if (!me) return;
        fn(me);
      });
    },
    [mutate]
  );

  /* günün ilk giriş kazananı — login sonrası toast için */
  const firstLoginWin = useRef<{ name: string; reward: number } | null>(null);

  const login = useCallback(
    (name: string, refCode?: string): { ok: boolean; error?: string } => {
      const key = normKey(name);
      let error: string | undefined;
      let invited = false;
      let autoApproved = false;
      const ref = refCode?.trim();
      const refOk =
        !!ref &&
        isValidMcName(ref) &&
        normKey(ref) !== key &&
        normKey(ref) !== normKey(ADMIN_NAME);
      mutate((draft) => {
        let acc = draft.users[key];
        if (!acc) {
          const refData = refOk ? { code: ref!, name: ref! } : undefined;
          acc = newAccount(name, refData);
          invited = refOk;
          draft.users[key] = acc;
        }
        if (acc.status === "rejected") {
          error = "Bu hesabın başvurusu reddedilmiş. Yetkiliyle iletişime geç.";
        }
        acc.name = acc.isAdmin ? ADMIN_NAME : name.trim();
        if (!acc.referralCode) acc.referralCode = key;
        if (refOk && !acc.referredBy && acc.status === "pending" && !acc.isAdmin) {
          acc.referredBy = normKey(ref!);
          acc.referredByName = ref;
          invited = true;
        }
        /* OTOMATİK KABUL: admin açtıysa bekleyen yeni üyelikler anında onaylanır
           (davet bağlantısı önce kurulur, sonra onay verilir) */
        if (acc.status === "pending" && !acc.isAdmin && draft.settings?.autoApproveUsers) {
          acc.status = "approved";
          if (acc.stats.opened === 0 && acc.inventory.length === 0) acc.balance = 0;
          autoApproved = true;
        }
        draft.session = key;

        /* GÜNÜN İLK GİRİŞ ÖDÜLÜ — etkinlik aktifse ve bugün kazanan yoksa */
        const ev = draft.firstLogin;
        const day = todayKey();
        if (ev && ev.active && ev.day === day && !ev.winner && acc.status === "approved" && !acc.isAdmin) {
          ev.winner = { key: acc.key, name: acc.name, ts: Date.now() };
          ev.ts = Date.now();
          draft.deposits.unshift({
            id: `firstlogin:${day}`,
            userKey: acc.key,
            userName: acc.name,
            amount: ev.reward,
            method: "Günün İlk Giriş Ödülü",
            status: "approved",
            ts: Date.now(),
            decidedTs: Date.now(),
            decidedBy: "Sistem",
          });
          firstLoginWin.current = { name: acc.name, reward: ev.reward };
        }
      });
      if (autoApproved) {
        pushToastSafe.current({
          kind: "win",
          title: "Üyeliğin otomatik onaylandı",
          sub: "Hemen kasa açmaya başlayabilirsin",
        });
      }
      if (invited) {
        pushToastSafe.current({
          kind: "info",
          title: `${ref} davet kodu kabul edildi`,
          sub: `${ref} Seviye ${REFERRAL_LEVEL}'e ulaşınca ${money(REFERRAL_BONUS)} kazanacak`,
        });
      }
      const fl = firstLoginWin.current;
      if (fl) {
        firstLoginWin.current = null;
        pushToastSafe.current({
          kind: "win",
          title: `Günün ilk girişi: +${money(fl.reward)} 🎉`,
          sub: `${fl.name} bugünün ilk giriş ödülünü kazandı`,
        });
      }
      return { ok: !error, error };
    },
    [mutate]
  );

  /* oturum açıkken de "günün ilk girişi" say — site her açılışta bir kez kontrol edilir */
  useEffect(() => {
    if (!user || user.status !== "approved" || user.isAdmin) return;
    const day = todayKey();
    const ev = db.firstLogin;
    if (!ev || !ev.active || ev.day !== day || ev.winner) return;
    if (db.claimed[`firstlogin:${day}`]) return;
    mutate((draft) => {
      const me = currentUser(draft);
      const e = draft.firstLogin;
      if (!me || !e || !e.active || e.day !== day || e.winner) return;
      if (draft.claimed[`firstlogin:${day}`]) return;
      e.winner = { key: me.key, name: me.name, ts: Date.now() };
      e.ts = Date.now();
      draft.deposits.unshift({
        id: `firstlogin:${day}`,
        userKey: me.key,
        userName: me.name,
        amount: e.reward,
        method: "Günün İlk Giriş Ödülü",
        status: "approved",
        ts: Date.now(),
        decidedTs: Date.now(),
        decidedBy: "Sistem",
      });
      firstLoginWin.current = { name: me.name, reward: e.reward };
    });
    const fl = firstLoginWin.current;
    if (fl) {
      firstLoginWin.current = null;
      pushToastSafe.current({
        kind: "win",
        title: `Günün ilk girişi: +${money(fl.reward)} 🎉`,
        sub: `${fl.name} bugünün ilk giriş ödülünü kazandı`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    mutate((draft) => {
      draft.session = null;
    });
    setTab("cases");
  }, [mutate]);

  useEffect(() => {
    if (user) levelRef.current = levelFromSpent(user.stats.spent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.key]);

  const checkLevelUp = useCallback(
    (newSpent: number, acc: Account) => {
      const newLevel = levelFromSpent(newSpent);
      if (newLevel > levelRef.current) {
        const reward = (newLevel * 3 + 2) * SCALE;
        levelRef.current = newLevel;
        acc.balance = Math.round(acc.balance + reward);
        pushToast({
          kind: "win",
          title: `Seviye ${newLevel} — ${levelTitle(newLevel)}!`,
          sub: `Seviye ödülü ${money(reward)} hesabına yatırıldı`,
        });
        coinDing();
      }
    },
    [pushToast]
  );

  /* --------- REFERANS: davet edilen seviye 5 olunca davet edene bonus --------- */
  const checkReferralReward = useCallback(() => {
    const probe = currentUser(dbRef.current);
    if (!probe || !probe.referredBy || probe.refRewarded) return;
    if (levelFromSpent(probe.stats.spent) < REFERRAL_LEVEL) return;
    let who = "";
    let paid = 0;
    mutate((draft) => {
      const me = draft.users[draft.session ?? ""];
      if (!me || !me.referredBy || me.refRewarded) return;
      if (levelFromSpent(me.stats.spent) < REFERRAL_LEVEL) return;
      me.refRewarded = true;
      me.refRewardedAt = Date.now();
      who = me.name;
      paid = REFERRAL_BONUS;
      /* Ödül, davet edenin cihazına onaylanmış talep olarak gider —
         claim sistemi bakiyeyi otomatik yükler. */
      draft.deposits.unshift({
        id: uid(),
        userKey: me.referredBy,
        userName: me.referredByName ?? me.referredBy,
        amount: REFERRAL_BONUS,
        method: "Referans Bonusu",
        status: "approved",
        ts: Date.now(),
        decidedTs: Date.now(),
        decidedBy: "Sistem",
      });
    });
    if (paid) {
      pushToast({
        kind: "money",
        title: `Davet ödülü kazanıldı: +${money(paid)}`,
        sub: `${who} Seviye ${REFERRAL_LEVEL}'e ulaştı — davet eden kişiye bonus gönderildi`,
      });
      coinDing();
    }
  }, [mutate, pushToast]);

  const addFunds = useCallback(
    (n: number) => updateMe((me) => void (me.balance = Math.round(me.balance + n))),
    [updateMe]
  );
  const credit = addFunds;

  const trySpend = useCallback((n: number) => {
    const fresh = loadDB();
    const me = currentUser(fresh);
    if (!me || me.balance < n - 1e-9) return false;
    me.balance = Math.round(me.balance - n);
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
    return true;
  }, []);

  const addItem = useCallback(
    (skinId: string, opts?: { stickered?: boolean; float?: number; stickers?: string[] }): InvItem => {
      let item: InvItem = isStickerItem(skinId) ? makeStickerItem(skinId) : makeSkinItem(skinId);
      if (typeof opts?.float === "number") item.float = opts.float;
      if (opts?.stickers) item.stickers = opts.stickers;
      else if (opts?.stickered) item = maybeAttachStickers(item, STICKER_POOL);
      updateMe((me) => void me.inventory.unshift(item));
      return item;
    },
    [updateMe]
  );

  /** Silaha sticker yapıştır */
  const applySticker = useCallback(
    (weaponUid: string, stickerUid: string): boolean => {
      let ok = false;
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me) return;
        const weapon = me.inventory.find((i) => i.uid === weaponUid);
        const sticker = me.inventory.find((i) => i.uid === stickerUid);
        if (!weapon || !sticker || !isStickerItem(sticker.skinId) || isStickerItem(weapon.skinId)) return;
        const cur = weapon.stickers ?? [];
        if (cur.length >= MAX_STICKERS) return;
        weapon.stickers = [...cur, sticker.skinId];
        me.inventory = me.inventory.filter((i) => i.uid !== stickerUid);
        ok = true;
      });
      if (ok) coinDing();
      return ok;
    },
    [mutate]
  );

  /** Özel sticker tasarla — ücret karşılığı */
  const createCustomSticker = useCallback(
    (input: CustomStickerInput): boolean => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;
      if (me.balance < CUSTOM_STICKER_COST) {
        pushToast({
          kind: "lose",
          title: "Yetersiz bakiye",
          sub: `Sticker tasarlamak ${money(CUSTOM_STICKER_COST)} tutuyor`,
        });
        return false;
      }
      const def = buildCustomSticker(input, CUSTOM_STICKER_COST);
      registerCustomSticker(def);

      me.balance = Math.round(me.balance - CUSTOM_STICKER_COST);
      me.customStickers = [...(me.customStickers ?? []), def];
      me.inventory.unshift(makeStickerItem(def.id));
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      coinDing();
      pushToast({
        kind: "win",
        title: "Sticker üretildi!",
        sub: `${def.name} envanterine eklendi`,
      });
      return true;
    },
    [pushToast]
  );

  /** Sticker'ı kazı (kalıcı olarak silinir) */
  const scrapeSticker = useCallback(
    (weaponUid: string, index: number) => {
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        const weapon = me?.inventory.find((i) => i.uid === weaponUid);
        if (!weapon?.stickers) return;
        weapon.stickers = weapon.stickers.filter((_, i) => i !== index);
      });
      pushToast({ kind: "info", title: "Sticker kazındı", sub: "Sticker kalıcı olarak silindi" });
    },
    [mutate, pushToast]
  );

  const removeItem = useCallback(
    (uidKey: string) => updateMe((me) => void (me.inventory = me.inventory.filter((i) => i.uid !== uidKey))),
    [updateMe]
  );

  const sellItem = useCallback((uidKey: string): Skin | null => {
    const fresh = loadDB();
    const me = currentUser(fresh);
    if (!me) return null;
    const found = me.inventory.find((i) => i.uid === uidKey);
    if (!found) return null;
    const skin = SKIN_MAP[found.skinId] ?? null;
    me.inventory = me.inventory.filter((i) => i.uid !== uidKey);
    if (skin) me.balance = Math.round(me.balance + skin.price);
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
    if (skin) coinDing();
    return skin;
  }, []);

  const bumpNonce = useCallback(() => {
    updateMe((me) => void me.nonce++);
    setServerSeed(randHex(64));
  }, [updateMe]);

  /* ---------------- PAZAR ---------------- */

  /** Kasadan/envanterden anında sat — düşük fiyat */
  const quickSell = useCallback((uidKey: string): { skin: Skin | null; payout: number } | null => {
    const fresh = loadDB();
    const me = currentUser(fresh);
    if (!me) return null;
    const found = me.inventory.find((i) => i.uid === uidKey);
    if (!found) return null;
    const skin = SKIN_MAP[found.skinId] ?? null;
    const payout = Math.round(itemValue(found) * QUICK_SELL_RATE);
    me.inventory = me.inventory.filter((i) => i.uid !== uidKey);
    me.balance = Math.round(me.balance + payout);
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
    coinDing();
    return { skin, payout };
  }, []);

  /** Pazara koy — komisyon düşülür, alıcı bekler */
  const listOnMarket = useCallback(
    (uidKey: string, price: number): boolean => {
      let ok = false;
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me) return;
        const item = me.inventory.find((i) => i.uid === uidKey);
        if (!item) return;
        const p = Math.max(100, Math.round(price / 100) * 100);
        me.inventory = me.inventory.filter((i) => i.uid !== uidKey);
        me.listings = [
          {
            id: uid(),
            skinId: item.skinId,
            price: p,
            ts: Date.now(),
            float: item.float,
            stickers: item.stickers,
            baseValue: itemValue(item),
          },
          ...(me.listings ?? []),
        ];
        ok = true;
      });
      if (ok) click();
      return ok;
    },
    [mutate]
  );

  /** İlanı geri çek */
  const cancelListing = useCallback(
    (listingId: string) => {
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me?.listings) return;
        const l = me.listings.find((x) => x.id === listingId);
        if (!l) return;
        me.listings = me.listings.filter((x) => x.id !== listingId);
        me.inventory.unshift({ uid: uid(), skinId: l.skinId, ts: Date.now() });
      });
      pushToast({ kind: "info", title: "İlan geri çekildi", sub: "Eşya envanterine döndü" });
    },
    [mutate, pushToast]
  );

  /** Bot ilanından satın al */
  const buyListing = useCallback(
    (listingId: string): boolean => {
      const l = botListingsRef.current.find((x) => x.id === listingId);
      if (!l) return false;
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me || me.balance < l.price) {
        pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: "Bu ilanı alamıyorsun" });
        return false;
      }
      me.balance = Math.round(me.balance - l.price);
      me.inventory.unshift({ uid: uid(), skinId: l.skinId, ts: Date.now() });
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      const skin = SKIN_MAP[l.skinId];
      me.inventory[0].float = l.float;
      if (l.stickers) me.inventory[0].stickers = l.stickers;
      saveDB(fresh);
      setDb(fresh);
      setBotListings((prev) => prev.filter((x) => x.id !== listingId).concat(makeBotListing()));
      coinDing();
      pushToast({
        kind: "money",
        title: "Satın alındı",
        sub: `${skin?.weapon} | ${skin?.name} — ${money(l.price)}`,
      });
      return true;
    },
    [pushToast]
  );

  const refreshMarket = useCallback(() => {
    setBotListings(generateBotListings());
    click();
  }, []);

  /* ---------------- TAKAS ---------------- */
  const refreshTrades = useCallback(() => {
    setTradeOffers(generateTradeOffers());
    click();
  }, []);

  const acceptTrade = useCallback(
    (offerId: string, myUids: string[]): boolean => {
      const offer = tradeOffersRef.current.find((o) => o.id === offerId);
      if (!offer) return false;
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;

      const given = myUids
        .map((u) => me.inventory.find((i) => i.uid === u))
        .filter(Boolean) as InvItem[];
      if (given.length !== myUids.length) return false;

      const givenValue = given.reduce((a, i) => a + itemValue(i), 0);
      if (givenValue < offer.wantValue * 0.97) {
        pushToast({
          kind: "lose",
          title: "Teklif yetersiz",
          sub: `En az ${money(offer.wantValue)} değerinde eşya koymalısın`,
        });
        return false;
      }

      const keys = new Set(myUids);
      me.inventory = me.inventory.filter((i) => !keys.has(i.uid));
      offer.give.forEach((g) => {
        const it = isStickerItem(g.skinId) ? makeStickerItem(g.skinId) : makeSkinItem(g.skinId);
        if (typeof g.float === "number") it.float = g.float;
        if (g.stickers) it.stickers = g.stickers;
        me.inventory.unshift(it);
      });
      if (offer.cash) me.balance = Math.round(me.balance + offer.cash);

      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      coinDing();
      setTradeOffers((prev) => prev.filter((o) => o.id !== offerId).concat(makeTradeOffer()));
      pushToast({
        kind: "win",
        title: "Takas tamamlandı",
        sub: `${offer.trader} ile ${offer.give.length} eşya takası yapıldı`,
      });
      return true;
    },
    [pushToast]
  );

  /* ---------------- CANLI P2P TAKAS (MQTT) ---------------- */

  const toPayload = (it: InvItem): TradeItemPayload => ({
    skinId: it.skinId,
    float: it.float,
    stickers: it.stickers,
  });

  /** Takasın eşya alışverişini yerelde uygula — her iki taraf kendi cihazında yapar */
  const doExchange = useCallback(
    (myUids: string[], theirItems: TradeItemPayload[], cash: number): boolean => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;
      const keys = new Set(myUids);
      const have = me.inventory.filter((i) => keys.has(i.uid));
      if (have.length !== myUids.length) return false; /* biri artık yok */
      me.inventory = me.inventory.filter((i) => !keys.has(i.uid));
      theirItems.forEach((p) => {
        const it = isStickerItem(p.skinId) ? makeStickerItem(p.skinId) : makeSkinItem(p.skinId);
        if (typeof p.float === "number") it.float = p.float;
        if (p.stickers) it.stickers = p.stickers;
        me.inventory.unshift(it);
      });
      me.balance = Math.max(0, Math.round(me.balance + cash));
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      return true;
    },
    []
  );

  const upsertRoom = useCallback((room: P2pRoom) => {
    setP2pRooms((prev) => {
      const exists = prev.some((r) => r.id === room.id);
      const out = exists ? prev.map((r) => (r.id === room.id ? room : r)) : [room, ...prev];
      p2pRoomsRef.current = out;
      return out;
    });
  }, []);

  const handleTradeMsg = useCallback(
    (msg: TradeMsg) => {
      const me = currentUser(dbRef.current);
      if (!me) return;

      if (msg.t === "offer") {
        if (msg.toKey !== me.key) return;
        const exists = p2pOffersRef.current.some((o) => o.id === msg.id);
        if (exists) return;
        const offer: P2pOffer = {
          id: msg.id,
          room: msg.room,
          from: msg.from,
          fromKey: msg.fromKey,
          items: msg.items,
          wantCash: msg.wantCash,
          note: msg.note,
          ts: msg.ts,
        };
        setP2pOffers((prev) => {
          const out = [offer, ...prev];
          p2pOffersRef.current = out;
          return out;
        });
        pushToastSafe.current({
          kind: "info",
          title: "Yeni takas teklifi",
          sub: `${msg.from} sana ${msg.items.length} eşya teklif ediyor`,
        });
        click();
        return;
      }

      if (msg.t === "accept") {
        if (msg.toKey !== me.key) return;
        const room = p2pRoomsRef.current.find((r) => r.id === msg.room);
        if (!room || room.role !== "sender") return;
        const execKey = `done:${msg.room}`;
        if (p2pExecutedRef.current.has(execKey)) return;
        if (!doExchange(room.myUids, msg.items, msg.cash)) {
          upsertRoom({ ...room, status: "failed" });
          pushToastSafe.current({
            kind: "lose",
            title: "Takas başarısız",
            sub: "Koyduğun eşyalardan biri artık envanterinde yok",
          });
          return;
        }
        p2pExecutedRef.current.add(execKey);
        upsertRoom({ ...room, status: "done", theirItems: msg.items, cash: msg.cash });
        coinDing();
        pushToastSafe.current({
          kind: "win",
          title: "Takas tamamlandı!",
          sub: `${msg.from}: ${msg.items.length} eşya + ${money(msg.cash)} aldın`,
        });
        sendTradeMsg(getSyncCode(), msg.fromKey, {
          t: "done",
          id: msg.id,
          room: msg.room,
          from: me.name,
          ts: Date.now(),
        });
        return;
      }

      if (msg.t === "decline") {
        const room = p2pRoomsRef.current.find((r) => r.id === msg.room);
        if (!room) return;
        upsertRoom({ ...room, status: "declined" });
        pushToastSafe.current({
          kind: "lose",
          title: "Teklif reddedildi",
          sub: `${room.partner} teklifini kabul etmedi`,
        });
        return;
      }

      if (msg.t === "cancel") {
        setP2pOffers((prev) => {
          const out = prev.filter((o) => o.id !== msg.id);
          p2pOffersRef.current = out;
          return out;
        });
        const room = p2pRoomsRef.current.find((r) => r.id === msg.room);
        if (!room) return;
        upsertRoom({ ...room, status: "cancelled" });
        pushToastSafe.current({
          kind: "lose",
          title: "Teklif iptal edildi",
          sub: `${room.partner} teklifini geri çekti`,
        });
        return;
      }

      if (msg.t === "done") {
        const room = p2pRoomsRef.current.find((r) => r.id === msg.room);
        if (!room) return;
        upsertRoom({ ...room, status: "done" });
      }
    },
    [doExchange, upsertRoom]
  );

  /* takas ağı — giriş yapıldıysa ve onaylandıysa bağlan */
  useEffect(() => {
    if (!user || user.status !== "approved") {
      stopTradeNet();
      setP2pStatus("off");
      return;
    }
    setP2pStatus("busy");
    startTradeNet(syncCode, user.key, {
      onMsg: handleTradeMsg,
      onStatus: setP2pStatus,
    });
    return () => stopTradeNet();
  }, [user?.key, user?.status, syncCode, handleTradeMsg]);

  /** Teklif gönder — karşı oyuncunun inbox kanalına MQTT ile yazılır */
  const sendOffer = useCallback(
    (
      targetName: string,
      myUids: string[],
      wantCash: number,
      note?: string
    ): { ok: boolean; error?: string } => {
      const target = targetName.trim();
      if (!isValidMcName(target)) return { ok: false, error: "Geçerli bir oyuncu adı gir (3-16 karakter)" };
      const targetKey = normKey(target);
      if (!user || targetKey === user.key) return { ok: false, error: "Kendine teklif gönderemezsin" };
      if (!myUids.length) return { ok: false, error: "En az bir eşya seç" };
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return { ok: false, error: "Oturum bulunamadı" };
      const picked = myUids
        .map((u) => me.inventory.find((i) => i.uid === u))
        .filter(Boolean) as InvItem[];
      if (picked.length !== myUids.length)
        return { ok: false, error: "Seçilen eşyalardan biri artık envanterinde yok" };

      const room = uid();
      const cash = Math.max(0, Math.round(wantCash));
      const msg: TradeMsg = {
        t: "offer",
        id: room,
        room,
        from: me.name,
        fromKey: me.key,
        to: target,
        toKey: targetKey,
        items: picked.map(toPayload),
        wantCash: cash,
        note: note?.trim() || undefined,
        ts: Date.now(),
      };
      if (!sendTradeMsg(getSyncCode(), targetKey, msg))
        return { ok: false, error: "Takas ağına bağlanılamadı — Sunucu Kodu ile bağlanmayı dene" };

      upsertRoom({
        id: room,
        room,
        role: "sender",
        partner: target,
        partnerKey: targetKey,
        myUids,
        givePayload: msg.items,
        wantCash: cash,
        note: msg.note,
        status: "waiting",
        ts: Date.now(),
      });
      pushToastSafe.current({
        kind: "info",
        title: "Teklif gönderildi",
        sub: `${target} takas teklifini anında alacak`,
      });
      return { ok: true };
    },
    [user, upsertRoom]
  );

  /** Gelen teklifi kabul / reddet */
  const respondOffer = useCallback(
    (offerId: string, accept: boolean, myUids?: string[]): boolean => {
      const offer = p2pOffersRef.current.find((o) => o.id === offerId);
      if (!offer) return false;

      if (!accept) {
        setP2pOffers((prev) => {
          const out = prev.filter((o) => o.id !== offerId);
          p2pOffersRef.current = out;
          return out;
        });
        sendTradeMsg(getSyncCode(), offer.fromKey, {
          t: "decline",
          id: offer.id,
          room: offer.room,
          from: user?.name ?? "",
          ts: Date.now(),
        });
        pushToastSafe.current({ kind: "info", title: "Teklif reddedildi", sub: offer.from });
        return true;
      }

      const uidList = myUids ?? [];
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;
      if (me.balance < offer.wantCash) {
        pushToastSafe.current({
          kind: "lose",
          title: "Yetersiz bakiye",
          sub: `Teklif sahibi ${money(offer.wantCash)} nakit istiyor`,
        });
        return false;
      }
      const picked = uidList
        .map((u) => me.inventory.find((i) => i.uid === u))
        .filter(Boolean) as InvItem[];
      if (picked.length !== uidList.length) {
        pushToastSafe.current({
          kind: "lose",
          title: "Eşya bulunamadı",
          sub: "Seçtiğin eşyalardan biri artık envanterinde yok",
        });
        return false;
      }

      const execKey = `done:${offer.room}`;
      if (p2pExecutedRef.current.has(execKey)) return false;
      if (!doExchange(uidList, offer.items, -offer.wantCash)) {
        pushToastSafe.current({
          kind: "lose",
          title: "Takas başarısız",
          sub: "Seçtiğin eşyalardan biri artık envanterinde yok",
        });
        return false;
      }
      p2pExecutedRef.current.add(execKey);

      const msg: TradeMsg = {
        t: "accept",
        id: offer.id,
        room: offer.room,
        from: me.name,
        fromKey: me.key,
        to: offer.from,
        toKey: offer.fromKey,
        items: picked.map(toPayload),
        cash: offer.wantCash,
        ts: Date.now(),
      };
      sendTradeMsg(getSyncCode(), offer.fromKey, msg);

      setP2pOffers((prev) => {
        const out = prev.filter((o) => o.id !== offerId);
        p2pOffersRef.current = out;
        return out;
      });
      upsertRoom({
        id: offer.id,
        room: offer.room,
        role: "receiver",
        partner: offer.from,
        partnerKey: offer.fromKey,
        myUids: uidList,
        givePayload: msg.items,
        theirItems: offer.items,
        cash: -offer.wantCash,
        wantCash: offer.wantCash,
        note: offer.note,
        status: "done",
        ts: Date.now(),
      });
      coinDing();
      pushToastSafe.current({
        kind: "win",
        title: "Takas tamamlandı!",
        sub: `${offer.from} eşyaları envanterine eklendi`,
      });
      return true;
    },
    [user, doExchange, upsertRoom]
  );

  /** Gönderilen teklifi geri çek */
  const cancelOffer = useCallback(
    (roomId: string): boolean => {
      const room = p2pRoomsRef.current.find((r) => r.id === roomId);
      if (!room || room.role !== "sender" || room.status !== "waiting") return false;
      upsertRoom({ ...room, status: "cancelled" });
      sendTradeMsg(getSyncCode(), room.partnerKey, {
        t: "cancel",
        id: room.id,
        room: room.room,
        from: user?.name ?? "",
        ts: Date.now(),
      });
      pushToastSafe.current({ kind: "info", title: "Teklif iptal edildi", sub: room.partner });
      return true;
    },
    [upsertRoom, user]
  );

  /* ---------------- BAŞARIMLAR ---------------- */
  const checkAchievements = useCallback(() => {
    const fresh = loadDB();
    const me = currentUser(fresh);
    if (!me) return;
    const unlocked = new Set(me.ach ?? []);
    let changed = false;
    ACHIEVEMENTS.forEach((a) => {
      if (unlocked.has(a.id)) return;
      if (!a.check(me)) return;
      unlocked.add(a.id);
      changed = true;
      me.balance = Math.round(me.balance + a.reward);
      pushToastSafe.current({
        kind: "win",
        title: `Başarım: ${a.icon} ${a.label}`,
        sub: `+${money(a.reward)} ödül kazandın`,
      });
    });
    if (changed) {
      me.ach = [...unlocked];
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
    }
  }, []);

  /* ---------------- KASA AÇILIŞI (Pity + Provably Fair) ---------------- */
  const openCase = useCallback(
    (def: CaseDef): { skin: import("../data/skins").Skin; seed: string; nonce: number; forced: boolean } => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me || me.balance < def.price) {
        pushToastSafe.current({
          kind: "lose",
          title: "Yetersiz bakiye",
          sub: "Para Yatır butonundan yetkili onaylı talep oluşturabilirsin",
        });
        return { skin: rollCaseSeeded(def, "0", 0), seed: "0", nonce: 0, forced: false };
      }
      me.balance = Math.round(me.balance - def.price);
      me.nonce++;
      const nonce = me.nonce;
      const seed = randHex(64);
      /* pity: kasa başına sayaç */
      const pity = me.pity ?? {};
      const since = pity[def.id] ?? 0;
      const forced = since >= PITY_GUARANTEE - 1;
      const skin = forced ? rollCasePity(def) : rollCaseSeeded(def, seed, nonce);
      pity[def.id] = forced || skin.rarity === "covert" || skin.rarity === "rare" ? 0 : since + 1;
      me.pity = pity;
      me.stats.opened++;
      me.stats.spent = Math.round(me.stats.spent + def.price);
      bumpMission(me, "cases");
      bumpMission(me, "wagered", def.price);
      checkLevelUp(me.stats.spent, me);
      if (skin.rarity === "covert" || skin.rarity === "rare") {
        if (skin.price > me.stats.bestDrop) me.stats.bestDrop = skin.price;
      }
      /* geçmiş kaydı */
      const log: RollLog = {
        ts: Date.now(),
        caseId: def.id,
        caseName: def.name,
        skinId: skin.id,
        skinName: `${skin.weapon} | ${skin.name}`,
        rarity: skin.rarity,
        price: skin.price,
        value: skin.price,
        seed,
        nonce,
        forced,
      };
      me.rollLogs = [log, ...(me.rollLogs ?? [])].slice(0, 400);
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      if (forced)
        pushToastSafe.current({
          kind: "info",
          title: "Garanti aktive!",
          sub: `${PITY_GUARANTEE} açılıştır nadir çıkmıyordu — bu sefer yüksek kademe garantili`,
        });
      checkAchievements();
      return { skin, seed, nonce, forced };
    },
    [checkAchievements]
  );

  /* Provably Fair doğrulama — seed + nonce ile yeniden hesapla */
  const verifyRoll = useCallback(
    (seed: string, nonce: number, def: CaseDef): import("../data/skins").Skin =>
      rollCaseSeeded(def, seed, nonce),
    []
  );

  /* ---------------- ADMIN: SKİN HEDİYESİ ---------------- */
  const adminGiveSkin = useCallback(
    (key: string, skinId: string, opts?: { float?: number; stickers?: string[] }) => {
      const skin = SKIN_MAP[skinId];
      if (!skin || skin.sticker) return;
      const fine: { float?: number; stickers?: string[] } = {};
      if (typeof opts?.float === "number" && Number.isFinite(opts.float)) {
        fine.float = Math.min(1, Math.max(0, Math.round(opts.float * 1000) / 1000));
      }
      if (Array.isArray(opts?.stickers)) {
        const st = opts.stickers.filter((s) => STICKER_MAP[s]).slice(0, 4);
        if (st.length) fine.stickers = st;
      }
      let ok = false;
      mutate((draft) => {
        const u = draft.users[key];
        if (!u) return;
        draft.deposits.unshift({
          id: uid(),
          userKey: u.key,
          userName: u.name,
          amount: 0,
          method: "Yetkili Skin Hediyesi",
          status: "approved",
          ts: Date.now(),
          decidedTs: Date.now(),
          decidedBy: ADMIN_NAME,
          skinId: skin.id,
          skinName: `${skin.weapon} | ${skin.name}`,
          skinOpts: Object.keys(fine).length ? fine : undefined,
        });
        ok = true;
      });
      if (ok) {
        coinDing();
        pushToast({ kind: "win", title: "Skin hediyesi gönderildi", sub: `${skin.weapon} | ${skin.name}` });
      }
    },
    [mutate, pushToast]
  );

  /* ---------------- DUYURU ---------------- */
  const setAnnouncement = useCallback(
    (text: string) => {
      const t = text.trim();
      mutate((draft) => {
        if (t) {
          draft.announcement = { text: t, ts: Date.now(), author: ADMIN_NAME };
        } else {
          /* tombstone: boş metin + yeni ts — silme diğer cihazlara da yayılır,
             eski duyuru bir daha geri gelmez */
          draft.announcement = { text: "", ts: Date.now(), author: ADMIN_NAME };
        }
      });
      if (t) coinDing();
    },
    [mutate]
  );

  const clearAnnouncement = useCallback(() => setAnnouncement(""), [setAnnouncement]);

  /* ---------------- OTOMATİK ÇEKİLİŞ ---------------- */
  const raffleRef = useRef<RaffleState | null>(null);
  raffleRef.current = db.raffle ?? null;

  const drawRaffleNow = useCallback(() => {
    const r = raffleRef.current;
    if (!r || r.drawn || Date.now() < r.endsAt) return;
    const ids = Object.keys(r.participants ?? {}).sort();
    if (!ids.length) {
      mutate((draft) => {
        if (draft.raffle) {
          draft.raffle.drawn = true;
          draft.raffle.winner = { key: "", name: "Katılımcı yok", ts: Date.now() };
        }
      });
      return;
    }
    const seed = r.id;
    const rng = seededRng(seed, "draw");
    const winnerKey = ids[Math.floor(rng() * ids.length)];
    const winnerName = r.participants![winnerKey].name;
    mutate((draft) => {
      if (!draft.raffle || draft.raffle.endsAt !== r.endsAt) return;
      draft.raffle.drawn = true;
      draft.raffle.winner = { key: winnerKey, name: winnerName, ts: Date.now() };
      draft.deposits.unshift({
        id: `raffle:${r.id}`,
        userKey: winnerKey,
        userName: winnerName,
        amount: r.prize,
        method: "Çekiliş Ödülü",
        status: "approved",
        ts: Date.now(),
        decidedTs: Date.now(),
        decidedBy: "Sistem",
      });
    });
    pushToastSafe.current({
      kind: "win",
      title: "Çekiliş tamamlandı! 🎉",
      sub: `${winnerName} ${money(r.prize)} kazandı`,
    });
  }, [mutate]);

  /* çekiliş sayacı — her 15 sn kontrol et */
  useEffect(() => {
    const iv = window.setInterval(drawRaffleNow, 15000);
    return () => clearInterval(iv);
  }, [drawRaffleNow]);

  const startRaffle = useCallback(
    (minutes: number = RAFFLE_FREQ_MS / 60000, prize: number = RAFFLE_PRIZE) => {
      const p = Math.max(1000, Math.round(prize / 100) * 100);
      mutate((draft) => {
        draft.raffle = {
          id: uid(),
          prize: p,
          endsAt: Date.now() + Math.max(1, minutes) * 60000,
          startedBy: ADMIN_NAME,
          participants: {},
        };
      });
      pushToast({
        kind: "money",
        title: "Çekiliş başlatıldı",
        sub: `${minutes} dk — ${money(p)} ödül`,
      });
    },
    [mutate, pushToast]
  );

  const cancelRaffle = useCallback(() => {
    mutate((draft) => {
      if (!draft.raffle) return;
      /* iptal bayrağı tüm cihazlara senkronlanır (null değil) */
      draft.raffle = {
        ...draft.raffle,
        cancelled: true,
        drawn: true,
      };
    });
    pushToast({ kind: "info", title: "Çekiliş iptal edildi" });
  }, [mutate, pushToast]);

  const enterRaffle = useCallback(() => {
    const r = raffleRef.current;
    const me = currentUser(dbRef.current);
    if (!r || !me || r.drawn || Date.now() >= r.endsAt || !me || me.status !== "approved") return;
    if (r.participants?.[me.key]) return;
    mutate((draft) => {
      if (!draft.raffle || draft.raffle.drawn) return;
      draft.raffle.participants = {
        ...(draft.raffle.participants ?? {}),
        [me.key]: { name: me.name, ts: Date.now() },
      };
    });
    pushToast({ kind: "money", title: "Çekilişe katıldın!", sub: `Ödül: ${money(r.prize)} — iyi şanslar` });
    coinDing();
  }, [mutate, pushToast]);

  /* ---------------- GÜNÜN İLK GİRİŞ ÖDÜLÜ ---------------- */
  const startFirstLoginEvent = useCallback(
    (reward: number = FIRST_LOGIN_REWARD) => {
      const r = Math.max(1000, Math.round(reward / 100) * 100);
      mutate((draft) => {
        draft.firstLogin = {
          active: true,
          reward: r,
          day: todayKey(),
          ts: Date.now(),
          startedBy: ADMIN_NAME,
        };
      });
      pushToast({ kind: "money", title: "Günün ilk giriş ödülü başlatıldı", sub: `${money(r)} — ilk giriş yapan kazanır` });
    },
    [mutate, pushToast]
  );

  const stopFirstLoginEvent = useCallback(() => {
    mutate((draft) => {
      if (!draft.firstLogin) return;
      /* ts güncellenir ki kapatma diğer cihazlara da yayılsın */
      draft.firstLogin = { ...draft.firstLogin, active: false, ts: Date.now() };
    });
    pushToast({ kind: "info", title: "İlk giriş etkinliği kapatıldı" });
  }, [mutate, pushToast]);

  /* ---------------- ADMIN: OTOMATİK KABUL AYARLARI ---------------- */
  const setAutoApproval = useCallback(
    (p: Partial<Pick<AutoSettings, "autoApproveUsers" | "autoApproveDeposits">>) => {
      mutate((draft) => {
        draft.settings = {
          ...(draft.settings ?? { autoApproveUsers: false, autoApproveDeposits: false, ts: 0 }),
          ...p,
          ts: Date.now(),
        };
      });
    },
    [mutate]
  );

  /* ---------------- GÖREVLER ---------------- */
  const trackMission = useCallback(
    (key: MissionKey, amount = 1) => {
      updateMe((me) => {
        const day = todayKey();
        if (!me.missions || me.missions.day !== day) me.missions = emptyMissions(day);
        me.missions[key] = (me.missions[key] as number) + amount;
      });
    },
    [updateMe]
  );

  const claimMission = useCallback(
    (id: string) => {
      const def = MISSIONS.find((m) => m.id === id);
      if (!def) return;
      let paid = 0;
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me) return;
        const day = todayKey();
        if (!me.missions || me.missions.day !== day) me.missions = emptyMissions(day);
        if (me.missions.claimed.includes(id)) return;
        if ((me.missions[def.key] as number) < def.goal) return;
        me.missions.claimed.push(id);
        me.balance = Math.round(me.balance + def.reward);
        paid = def.reward;
      });
      if (paid) {
        coinDing();
        pushToast({ kind: "money", title: `Görev ödülü +${money(paid)}`, sub: def.label });
      }
    },
    [mutate, pushToast]
  );

  /* ---------------- TRADE-UP KONTRATI ---------------- */
  const tradeUp = useCallback(
    (uidKeys: string[]): Skin | null => {
      if (uidKeys.length !== 10) return null;
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return null;

      const picked = uidKeys
        .map((u) => me.inventory.find((i) => i.uid === u))
        .filter(Boolean) as InvItem[];
      if (picked.length !== 10) return null;

      const skins = picked.map((i) => SKIN_MAP[i.skinId]).filter(Boolean);
      const tier = skins[0]?.rarity;
      if (!tier || !skins.every((s) => s.rarity === tier)) return null;

      const idx = TIER_ORDER.indexOf(tier);
      const nextTier = TIER_ORDER[idx + 1];
      if (!nextTier || nextTier === "rare") return null;

      /* çıktı havuzu — bir üst kademe */
      const pool = SKINS.filter((s) => s.rarity === nextTier && !s.st && !s.sv);
      if (!pool.length) return null;

      /* girdilerin ortalama değeri yüksekse iyi skin çıkma şansı artar */
      const avg = skins.reduce((a, s) => a + s.price, 0) / skins.length;
      const tierAvg =
        SKINS.filter((s) => s.rarity === tier && !s.st && !s.sv).reduce((a, s) => a + s.price, 0) /
        Math.max(1, SKINS.filter((s) => s.rarity === tier && !s.st && !s.sv).length);
      const quality = Math.min(1, Math.max(0, avg / (tierAvg * 1.35)));

      const sorted = [...pool].sort((a, b) => a.price - b.price);
      const r = Math.pow(Math.random(), 1.6 - quality); // kalite arttıkça üst uçtan seç
      const out = sorted[Math.min(sorted.length - 1, Math.floor(r * sorted.length))];

      const keys = new Set(uidKeys);
      me.inventory = me.inventory.filter((i) => !keys.has(i.uid));
      me.inventory.unshift({ uid: uid(), skinId: out.id, ts: Date.now() });
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      return out;
    },
    []
  );

  /* pazar canlı kalsın — arada yeni bot ilanları düşsün */
  useEffect(() => {
    const iv = window.setInterval(() => {
      setBotListings((prev) => [makeBotListing(), ...prev].slice(0, 120));
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  /* kendi ilanlarımızı bot alıcılar satın alsın */
  useEffect(() => {
    if (!user || user.status !== "approved") return;
    const iv = window.setInterval(() => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me?.listings?.length) return;

      const sold: { skin: Skin | null; net: number }[] = [];
      me.listings = me.listings.filter((l) => {
        if (Math.random() > sellChance(l)) return true;
        const net = Math.round(l.price * (1 - MARKET_FEE));
        me.balance = Math.round(me.balance + net);
        sold.push({ skin: SKIN_MAP[l.skinId] ?? null, net });
        return false;
      });

      if (sold.length) {
        const day = todayKey();
        if (!me.missions || me.missions.day !== day) me.missions = emptyMissions(day);
        me.missions.sales += sold.length;
        saveDB(fresh);
        setDb(fresh);
        notifyDbChanged();
        coinDing();
        sold.forEach(({ skin, net }) =>
          pushToast({
            kind: "money",
            title: `Pazarda satıldı: +${money(net)}`,
            sub: skin ? `${skin.weapon} | ${skin.name}` : undefined,
          })
        );
      }
    }, 9000);
    return () => clearInterval(iv);
  }, [user?.key, user?.status, pushToast]);

  /** görev sayacını hesap taslağı üzerinde ilerlet */
  const bumpMission = (me: Account, key: MissionKey, amount = 1) => {
    const day = todayKey();
    if (!me.missions || me.missions.day !== day) me.missions = emptyMissions(day);
    me.missions[key] = (me.missions[key] as number) + amount;
  };

  const trackOpen = useCallback(
    (price: number) => {
      updateMe((me) => {
        me.stats.opened++;
        me.stats.spent = Math.round(me.stats.spent + price);
        bumpMission(me, "cases");
        bumpMission(me, "wagered", price);
        checkLevelUp(me.stats.spent, me);
      });
      checkReferralReward();
    },
    [updateMe, checkLevelUp, checkReferralReward]
  );

  const trackWager = useCallback(
    (amount: number) => {
      updateMe((me) => {
        me.stats.spent = Math.round(me.stats.spent + amount);
        bumpMission(me, "wagered", amount);
        checkLevelUp(me.stats.spent, me);
      });
      checkReferralReward();
    },
    [updateMe, checkLevelUp, checkReferralReward]
  );

  const trackDrop = useCallback(
    (value: number) =>
      updateMe((me) => {
        if (value > me.stats.bestDrop) me.stats.bestDrop = value;
      }),
    [updateMe]
  );

  const claimDaily = useCallback((): number | null => {
    const nowTs = Date.now();
    if (user?.lastDaily && nowTs - user.lastDaily < DAILY_COOLDOWN) return null;
    const r = Math.random();
    const amount = Math.round((4 + r * r * 14) * SCALE);
    updateMe((me) => {
      me.lastDaily = nowTs;
      me.balance = Math.round(me.balance + amount);
    });
    pushToast({
      kind: "money",
      title: `Günlük ödül: ${money(amount)}`,
      sub: "Yarın yeni ödül seni bekliyor",
    });
    coinDing();
    return amount;
  }, [user?.lastDaily, updateMe, pushToast]);

  /* --------- para yatırma talebi --------- */
  const requestDeposit = useCallback(
    (amount: number, method: string) => {
      if (!user) return;
      let auto = false;
      mutate((draft) => {
        auto = !!draft.settings?.autoApproveDeposits;
        draft.deposits.unshift({
          id: uid(),
          userKey: user.key,
          userName: user.name,
          amount,
          method,
          kind: "deposit",
          status: auto ? "approved" : "pending",
          ts: Date.now(),
          decidedTs: auto ? Date.now() : undefined,
          decidedBy: auto ? "Otomatik Onay" : undefined,
        });
      });
      forceSync();
      pushToast(
        auto
          ? {
              kind: "money",
              title: "Yatırman otomatik onaylandı",
              sub: `${money(amount)} hesabına ekleniyor`,
            }
          : {
              kind: "info",
              title: "Yatırma talebin iletildi",
              sub: `${money(amount)} — ${ADMIN_NAME} onayı bekleniyor`,
            }
      );
    },
    [user, mutate, pushToast]
  );

  /* --------- para çekme talebi (bakiye anında bloke edilir) --------- */
  const requestWithdraw = useCallback(
    (amount: number, method: string, payTo: string): boolean => {
      if (!user) return false;
      let ok = false;
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me || me.balance < amount) return;
        me.balance = Math.round(me.balance - amount);
        draft.deposits.unshift({
          id: uid(),
          userKey: me.key,
          userName: me.name,
          amount,
          method,
          payTo,
          kind: "withdraw",
          held: true,
          status: "pending",
          ts: Date.now(),
        });
        ok = true;
      });
      if (!ok) {
        pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: "Bu tutarı çekemezsin" });
        return false;
      }
      forceSync();
      pushToast({
        kind: "info",
        title: "Çekim talebin iletildi",
        sub: `${money(amount)} bloke edildi — ${ADMIN_NAME} onayı bekleniyor`,
      });
      return true;
    },
    [user, mutate, pushToast]
  );

  /* --------- onaylanan talepleri bakiyeye işle (claim) --------- */
  useEffect(() => {
    if (!user || user.status !== "approved") return;
    db.deposits
      .filter((d) => d.userKey === user.key && d.status !== "pending" && !db.claimed[d.id])
      .forEach((d) => {
        if (seenDepositRef.current.has(d.id)) return;
        seenDepositRef.current.add(d.id);
        const withdraw = d.kind === "withdraw";
        mutate((draft) => {
          if (draft.claimed[d.id]) return;
          draft.claimed[d.id] = Date.now();
          const me = draft.users[draft.session ?? ""];
          if (!me) return;

          if (withdraw) {
            /* çekimde para talep anında bloke edilmişti */
            if (d.status === "rejected" && d.held) {
              me.balance = Math.round(me.balance + d.amount); // iade
            } else if (d.status === "approved" && !d.held) {
              me.balance = Math.max(0, Math.round(me.balance - d.amount));
            }
          } else if (d.status === "approved") {
            /* Yetkili skin hediyesi — envantere ekle */
            if (d.skinId && SKIN_MAP[d.skinId]) {
              me.inventory.unshift({
                uid: uid(),
                skinId: d.skinId,
                ts: Date.now(),
                float: isStickerItem(d.skinId)
                  ? undefined
                  : typeof d.skinOpts?.float === "number"
                    ? d.skinOpts.float
                    : rollFloat(),
                stickers: d.skinOpts?.stickers?.length ? [...d.skinOpts.stickers] : undefined,
              });
            } else {
              /* Eski sürümden kalan başlangıç bonusları artık uygulanmaz. */
              const delta = d.method === "Başlangıç Bonusu" ? 0 : d.amount;
              me.balance = Math.max(0, Math.round(me.balance + delta));
            }
          }
        });

        checkAchievements();
        if (withdraw) {
          if (d.status === "approved") {
            coinDing();
            pushToast({
              kind: "money",
              title: `Çekim onaylandı: ${money(d.amount)}`,
              sub: `${d.method} ile ödemen yapılacak — ${d.decidedBy ?? ADMIN_NAME}`,
            });
          } else {
            pushToast({
              kind: "lose",
              title: "Çekim talebin reddedildi",
              sub: `${money(d.amount)} bakiyene iade edildi`,
            });
          }
        } else if (d.status === "approved") {
          pushToast({
            kind: "money",
            title:
              d.method === "Başlangıç Bonusu"
                ? "Hesabın onaylandı"
                : d.skinId
                  ? `Skin hediyesi: ${d.skinName ?? d.skinId}`
                  : d.amount >= 0
                    ? `${money(d.amount)} hesabına eklendi`
                    : `${money(Math.abs(d.amount))} hesabından silindi`,
            sub:
              d.method === "Başlangıç Bonusu"
                ? "Hesabın 0 bakiye ile açıldı"
                : d.skinId
                  ? "Envanterine eklendi — keyifle kullan"
                  : `İşlem ${d.decidedBy ?? ADMIN_NAME} tarafından onaylandı`,
          });
          coinDing();
        } else {
          pushToast({
            kind: "lose",
            title: "Yatırma talebin reddedildi",
            sub: d.reason || "Yetkili talebi uygun bulmadı",
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.deposits, db.claimed, user?.key, user?.status]);

  /* --------- profil yayını (diğerleri görsün diye) --------- */
  useEffect(() => {
    if (!syncUrl || !user || user.status !== "approved") return;
    const iv = window.setInterval(() => {
      updateMe((me) => {
        me.pub = {
          balance: me.balance,
          opened: me.stats.opened,
          invCount: me.inventory.length,
          level: levelFromSpent(me.stats.spent),
          ts: Date.now(),
        };
      });
    }, 6000);
    return () => clearInterval(iv);
  }, [syncUrl, user?.key, user?.status, updateMe]);

  /* --------- admin: üyelik onayı — tüm hesaplar 0 bakiye ile başlar --------- */
  const approveUser = useCallback(
    (key: string) =>
      mutate((draft) => {
        const u = draft.users[key];
        if (!u) return;
        u.status = "approved";
        if (u.stats.opened === 0 && u.inventory.length === 0) u.balance = 0;
      }),
    [mutate]
  );

  const rejectUser = useCallback(
    (key: string) =>
      mutate((draft) => {
        const u = draft.users[key];
        if (u) u.status = "rejected";
      }),
    [mutate]
  );

  const approveDeposit = useCallback(
    (id: string) =>
      mutate((draft) => {
        const d = draft.deposits.find((x) => x.id === id);
        if (!d || d.status !== "pending") return;
        d.status = "approved";
        d.decidedTs = Date.now();
        d.decidedBy = ADMIN_NAME;
        /* bakiye, talep sahibinin cihazında claim ile yüklenir */
      }),
    [mutate]
  );

  const rejectDeposit = useCallback(
    (id: string) =>
      mutate((draft) => {
        const d = draft.deposits.find((x) => x.id === id);
        if (!d || d.status !== "pending") return;
        d.status = "rejected";
        d.decidedTs = Date.now();
        d.decidedBy = ADMIN_NAME;
      }),
    [mutate]
  );

  const adminAdjust = useCallback(
    (key: string, delta: number) =>
      mutate((draft) => {
        const u = draft.users[key];
        if (!u || !Number.isFinite(delta) || delta === 0) return;
        const amount = Math.round(delta);
        const id = uid();
        /* Aynı cihazda/oturumda gösterim anında güncellensin diye bakiyeyi
           doğrudan değiştir; depozit "claimed" işaretlenir ki oyuncunun cihazı
           gelince TALEP üzerinden kesin olarak bir kez daha işlensin. */
        u.balance = Math.max(0, Math.round(u.balance + amount));
        draft.claimed[id] = Date.now();
        draft.deposits.unshift({
          id,
          userKey: u.key,
          userName: u.name,
          amount,
          method: amount > 0 ? "Yetkili Para Ekleme" : "Yetkili Para Silme",
          status: "approved",
          ts: Date.now(),
          decidedTs: Date.now(),
          decidedBy: ADMIN_NAME,
        });
      }),
    [mutate]
  );

  const resetAll = useCallback(() => {
    mutate((draft) => {
      const me = draft.users[draft.session ?? ""];
      if (me) {
        me.balance = START_BALANCE;
        me.inventory = [];
        me.stats = { opened: 0, spent: 0, bestDrop: 0 };
        me.lastDaily = null;
      }
    });
    levelRef.current = 1;
    pushToast({ kind: "info", title: "Hesap sıfırlandı", sub: "Bakiye ve envanter 0'a çekildi" });
  }, [mutate, pushToast]);

  const inventory = user?.inventory ?? [];
  const inventoryValue = useMemo(
    () => inventory.reduce((acc, i) => acc + itemValue(i), 0),
    [inventory]
  );
  const stats = user?.stats ?? { opened: 0, spent: 0, bestDrop: 0 };
  const level = levelFromSpent(stats.spent);
  const xpCurrent = Math.max(0, stats.spent - xpCum(level));
  const xpNeeded = Math.max(1, xpCum(level + 1) - xpCum(level));

  const myDeposits = useMemo(
    () => (user ? db.deposits.filter((d) => d.userKey === user.key) : []),
    [db.deposits, user]
  );

  const value: GameState = {
    db,
    user,
    loggedIn: !!user,
    isAdmin: !!user?.isAdmin,
    userName: user?.name ?? "",
    login,
    logout,

    balance: user?.balance ?? 0,
    inventory,
    inventoryValue,
    stats,
    nonce: user?.nonce ?? 1000,
    serverSeed,
    lastDaily: user?.lastDaily ?? null,
    level,
    levelTitleStr: levelTitle(level),
    levelProgress: Math.min(1, xpCurrent / xpNeeded),
    xpCurrent,
    xpNeeded,

    muted,
    tab,
    toasts,
    upgraderPick,
    setTab,
    setUpgraderPick,
    toggleMute: () => setMuted((m) => !m),
    pushToast,
    dismissToast,

    addFunds,
    trySpend,
    credit,
    addItem,
    removeItem,
    sellItem,
    bumpNonce,
    trackOpen,
    trackWager,
    trackDrop,
    claimDaily,

    missions:
      user?.missions && user.missions.day === todayKey()
        ? user.missions
        : emptyMissions(todayKey()),
    trackMission,
    claimMission,
    tradeUp,

    myDeposits,
    requestDeposit,
    requestWithdraw,
    heldBalance: myDeposits
      .filter((d) => d.kind === "withdraw" && d.status === "pending")
      .reduce((a, d) => a + d.amount, 0),

    applySticker,
    scrapeSticker,
    createCustomSticker,
    tradeOffers,
    refreshTrades,
    acceptTrade,

    p2pOffers,
    p2pRooms,
    p2pStatus,
    p2pScope: tradeScope(syncCode),
    sendOffer,
    respondOffer,
    cancelOffer,

    refCode: user?.referralCode ?? user?.key ?? "",
    refLevel: REFERRAL_LEVEL,
    refBonus: REFERRAL_BONUS,
    referralFriends: Object.values(db.users)
      .filter((u) => u.key !== user?.key && u.referredBy === user?.key)
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    refInvited: !!user?.referredBy,

    rollLogs: user?.rollLogs ?? [],
    openCase,
    verifyRoll,

    achievements: ACHIEVEMENTS,
    unlockedAch: user?.ach ?? [],
    claimAch: (id) => {
      const a = ACH_MAP[id];
      if (!a || !a.check(user ?? ({} as Account))) return;
      pushToast({ kind: "info", title: "Başarım zaten açık", sub: a.label });
    },

    adminGiveSkin,

    /* boş metin (tombstone) UI'a null gibi görünür */
    announcement: db.announcement?.text ? db.announcement : null,
    setAnnouncement,
    clearAnnouncement,

    raffle: db.raffle ?? null,
    raffleEntered: !!db.raffle?.participants?.[user?.key ?? ""],
    toastRaffle: null,
    startRaffle,
    cancelRaffle,
    enterRaffle,

    firstLoginEvent: db.firstLogin ?? null,
    startFirstLoginEvent,
    stopFirstLoginEvent,

    autoSettings: db.settings ?? { autoApproveUsers: false, autoApproveDeposits: false, ts: 0 },
    setAutoApproval,

    botListings,
    myListings: user?.listings ?? [],
    quickSell,
    listOnMarket,
    cancelListing,
    buyListing,
    refreshMarket,

    pendingUserList: pendingUsers(db),
    pendingDepositList: pendingDeposits(db),
    allUsers: Object.values(db.users).sort((a, b) => b.createdAt - a.createdAt),
    allDeposits: [...db.deposits].sort((a, b) => b.ts - a.ts),
    approveUser,
    rejectUser,
    approveDeposit,
    rejectDeposit,
    adminAdjust,
    resetAll,

    syncUrl,
    syncStatus,
    setSyncUrl,
    syncCode,
    setSyncCode,
    syncNow: forceSync,
  };

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): GameState {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("useGame, GameProvider içinde kullanılmalı");
  return ctx;
}
