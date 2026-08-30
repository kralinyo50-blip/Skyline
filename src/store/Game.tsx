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
import { MAX_STICKERS, STICKERS, CUSTOM_STICKER_COST } from "../data/stickers";
import {
  buildCustomSticker,
  registerCustomSticker,
  type CustomStickerInput,
} from "../data/custom";

const STICKER_POOL = STICKERS.map((s) => s.id);
import { setAudioMuted, coinDing, click } from "../lib/audio";
import { randHex, uid } from "../lib/rng";
import { SCALE, START_BALANCE, money, ADMIN_NAME, QUICK_SELL_RATE, MARKET_FEE } from "../config";
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
} from "./db";
import { MISSIONS, todayKey, type MissionKey } from "../data/missions";
import { startSync, stopSync, forceSync, toCloudDoc, type SyncStatus } from "./sync";
import { startMqtt, stopMqtt, normalizeCode, notifyDbChanged } from "./syncMqtt";

export type { InvItem, Stats, Account, DepositReq };

export type TabKey =
  | "cases"
  | "upgrader"
  | "battle"
  | "games"
  | "market"
  | "trade"
  | "inventory"
  | "admin";

export interface Toast {
  id: string;
  kind: "win" | "lose" | "info" | "money";
  title: string;
  sub?: string;
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
  login: (name: string) => { ok: boolean; error?: string };
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

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB());
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<TabKey>("cases");
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

  const login = useCallback(
    (name: string): { ok: boolean; error?: string } => {
      const key = normKey(name);
      let error: string | undefined;
      mutate((draft) => {
        let acc = draft.users[key];
        if (!acc) {
          acc = newAccount(name);
          draft.users[key] = acc;
        }
        if (acc.status === "rejected") {
          error = "Bu hesabın başvurusu reddedilmiş. Yetkiliyle iletişime geç.";
        }
        acc.name = acc.isAdmin ? ADMIN_NAME : name.trim();
        draft.session = key;
      });
      return { ok: !error, error };
    },
    [mutate]
  );

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
    (price: number) =>
      updateMe((me) => {
        me.stats.opened++;
        me.stats.spent = Math.round(me.stats.spent + price);
        bumpMission(me, "cases");
        bumpMission(me, "wagered", price);
        checkLevelUp(me.stats.spent, me);
      }),
    [updateMe, checkLevelUp]
  );

  const trackWager = useCallback(
    (amount: number) =>
      updateMe((me) => {
        me.stats.spent = Math.round(me.stats.spent + amount);
        bumpMission(me, "wagered", amount);
        checkLevelUp(me.stats.spent, me);
      }),
    [updateMe, checkLevelUp]
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
      mutate((draft) => {
        draft.deposits.unshift({
          id: uid(),
          userKey: user.key,
          userName: user.name,
          amount,
          method,
          kind: "deposit",
          status: "pending",
          ts: Date.now(),
        });
      });
      forceSync();
      pushToast({
        kind: "info",
        title: "Yatırma talebin iletildi",
        sub: `${money(amount)} — ${ADMIN_NAME} onayı bekleniyor`,
      });
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
            /* Eski sürümden kalan başlangıç bonusları artık uygulanmaz. */
            const delta = d.method === "Başlangıç Bonusu" ? 0 : d.amount;
            me.balance = Math.max(0, Math.round(me.balance + delta));
          }
        });

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
                : d.amount >= 0
                  ? `${money(d.amount)} hesabına eklendi`
                  : `${money(Math.abs(d.amount))} hesabından silindi`,
            sub: d.method === "Başlangıç Bonusu" ? "Hesabın 0 bakiye ile açıldı" : `İşlem ${d.decidedBy ?? ADMIN_NAME} tarafından onaylandı`,
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
        /* Artı ve eksi hareketler oyuncunun cihazında aynı claim sistemiyle işlenir. */
        draft.deposits.unshift({
          id: uid(),
          userKey: u.key,
          userName: u.name,
          amount: Math.round(delta),
          method: delta > 0 ? "Yetkili Para Ekleme" : "Yetkili Para Silme",
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
