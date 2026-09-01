import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SKIN_MAP, SKINS, WEAPON_SKINS, TIER_ORDER, type Skin } from "../data/skins";
import { LEGEND_SKINS } from "../data/legends";
import {
  isStickerItem,
  itemValue,
  makeSkinItem,
  makeStickerItem,
  maybeAttachStickers,
  pinnedWearOf,
} from "../data/items";
import { rollFloat, WEARS, WEAR_ORDER, type WearKey } from "../data/wear";
import { MAX_STICKERS, STICKERS, STICKER_MAP, CUSTOM_STICKER_COST } from "../data/stickers";
import {
  buildCustomSticker,
  registerCustomSticker,
  type CustomStickerInput,
} from "../data/custom";

const STICKER_POOL = STICKERS.map((s) => s.id);
import { setAudioMuted, coinDing, click } from "../lib/audio";
import { randHex, seededRng, uid, pick } from "../lib/rng";
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
  ADMIN_ADJUST_MAX,
  ADMIN_ADJUST_DAILY,
  vipLevelEntry,
  vipNextLevel,
  vipTierOfLevel,
  applyVipCaseDisc,
  type VipLevel,
  type VipTier,
  JACKPOT_ROUND_MS,
  JACKPOT_MAX_ENTRIES,
  jackpotRoundAt,
  jackpotSchedule,
  isValidMcName,
} from "../config";
import { CELEBRITY_USERS, COMMUNITY_USERS, BOT_NAMES } from "../data/fakers";
import { emitLive } from "./liveEvents";
import {
  generateBotListings,
  makeBotListing,
  rescaleBotListings,
  generateTradeOffers,
  makeTradeOffer,
  sellChance,
  bulkTotal,
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
  type MarketListing,
  type MarketPayment,
  type Stats,
  type RollLog,
  type Announcement,
  type AdBanner,
  type RaffleState,
  type FirstLoginEvent,
  type AutoSettings,
  type AdminLogEntry,
  type Celebration,
  type JackpotState,
  type JackpotEntry,
  type JackpotItem,
  type JackpotWinner,
  type JackpotSettledRound,
  type JackpotHistoryEntry,
  type ChatMsg,
  type CaseSale,
  type PriceSettings,
  type WeekPin,
  type EconomyWave,
  type EconomyConfig,
  type PriceSnap,
  type DepositPack,
  type DepositPackSettings,
  type DepositPackGift,
  type Coupon,
  type CustomCase,
  type ShopListing,
  type ShopPayment,
  type ShopCustom,
  type SeasonProgress,
  type SeasonState,
} from "./db";
import { MISSIONS, todayKey, type MissionKey } from "../data/missions";
import { ACHIEVEMENTS, ACH_MAP, type AchievementDef } from "../data/achievements";
import { CASES, rollCaseSeeded, rollCasePity, casePrice, expectedValue, type CaseDef } from "../data/cases";
import {
  SHOP_PRODUCTS,
  SHOP_PRODUCT_MAP,
  SHOP_MATERIAL_MAP,
  SHOP_CATEGORIES,
  SHOP_BOT_STORES,
  botStoreKey,
  CUSTOM_RECIPES,
  recipeText,
  type ShopCategory,
} from "../data/shop";
import { applyPriceOverrides, skinBasePrice, currentPriceRev, waveFadeEnd, waveMultiplierAt } from "../data/skins";
import {
  SEASON_PREMIUM_PRICE,
  SEASON_MAX_LEVEL,
  SEASON_TIERS,
  SEASON_TIER_MAP,
  seasonOf,
  seasonNeedXp,
  seasonLevelOf,
  seasonInto,
  type SeasonReward,
} from "../data/season";
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
  | "jackpot"
  | "market"
  | "shop"
  | "season"
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
  { min: 999, title: "İlahi" },
  { min: 500, title: "Efsanevi" },
  { min: 100, title: "Usta" },
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

/** Maksimum seviye — efsanevi slot (İlahi unvanı 999+ için kalır) */
export const MAX_LEVEL = 1999;

export function levelFromSpent(spent: number): number {
  let lvl = 1;
  while (xpCum(lvl + 1) <= spent && lvl < MAX_LEVEL) lvl++;
  return lvl;
}

/** Hafta anahtarı — Pazartesi 00:00 yerel saat (haftanın oyuncusu için) */
export function weekKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // Pazartesi=0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

/** Haftalık harcama/açılış — hafta tabanından beri */
export function weeklyStats(u: Account): { key: string; spent: number; opened: number } {
  const key = weekKey();
  const base = u.weekBase && u.weekBase.key === key ? u.weekBase : { key, spent: u.stats.spent, opened: u.stats.opened };
  return {
    key,
    spent: Math.max(0, u.stats.spent - base.spent),
    opened: Math.max(0, u.stats.opened - base.opened),
  };
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
  /** aktif kupon bonusu (sonraki yatırmaya eklenir) */
  couponBonus?: { pct: number; until: number; code: string } | null;
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
  /** yatırma paketleri + yönetim (admin auto-save) */
  depositPacks: DepositPackSettings | null;
  setDepositPacks: (packs: DepositPack[]) => { ok: boolean; error?: string };
  /** kupon sistemi */
  coupons: Coupon[];
  redeemCoupon: (code: string) => { ok: boolean; error?: string; note?: string };
  createCoupon: (
    c: { code: string; kind: Coupon["kind"]; value: number; caseId?: string; maxUses: number }
  ) => { ok: boolean; error?: string };
  deactivateCoupon: (id: string) => void;
  /** admin özel kasaları */
  customCases: CustomCase[];
  createCustomCase: (
    c: { name: string; price: number; stock: number; contents: Partial<Record<string, string[]>>; tagline?: string }
  ) => { ok: boolean; error?: string };
  deleteCustomCase: (id: string) => void;
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
  openCase: (def: CaseDef) => { skin: import("../data/skins").Skin; seed: string; nonce: number; forced: boolean; ok: boolean };
  verifyRoll: (seed: string, nonce: number, def: CaseDef) => import("../data/skins").Skin;

  /* başarımlar */
  achievements: AchievementDef[];
  unlockedAch: string[];
  claimAch: (id: string) => void;

  /* admin: skin hediyesi */
  adminGiveSkin: (
    key: string,
    skinId: string,
    opts?: { float?: number; stickers?: string[] }
  ) => { ok: boolean; error?: string };

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

  /* kutlamalar */
  celebration: Celebration | null;
  celebrate: (text: string) => void;
  /** yerel kutlama (seviye atlama vb. — sadece bu cihaz) */
  localCelebration: { id: string; text: string; sub?: string } | null;
  celebrateLocal: (text: string, sub?: string) => void;

  /* admin otomatik kabul ayarları */
  autoSettings: AutoSettings;
  setAutoApproval: (p: Partial<Pick<AutoSettings, "autoApproveUsers" | "autoApproveDeposits">>) => void;

  /* VIP SINIFLARI — para ile satın alınır (Bakır I → Netherite IV) */
  vipLevel: number;
  vipTier: VipTier;
  vipNext: VipLevel | null;
  vipActive: boolean;
  buyVipLevel: (level: number) => { ok: boolean; error?: string };
  /** kayıp bahis üzerinden cashback döndürür (VIP yoksa 0) */
  vipCashback: (lostAmount: number) => number;

  /* profil vitrini */
  showcase: InvItem[];
  toggleShowcase: (uidKey: string) => void;

  /* jackpot (canlı pot) */
  jackpot: JackpotState | null;
  jackpotJoin: (uids: string[]) => { ok: boolean; error?: string };
  jackpotLeave: () => boolean;

  /* pazar */
  botListings: Listing[];
  myListings: MyListing[];
  quickSell: (uidKey: string) => { skin: Skin | null; payout: number } | null;
  listOnMarket: (uidKey: string, price: number, qty?: number) => boolean;
  /** tüm envanteri kâr yüzdesine göre pazara koy */
  listAllOnMarket: (profitPercent: number) => { ok: boolean; count: number; total: number };
  cancelListing: (listingId: string) => void;
  buyListing: (listingId: string, qty?: number) => boolean;
  refreshMarket: () => void;

  /* gerçek oyuncu dükkanı (senkron) */
  marketListings: MarketListing[];
  shopListings: MarketListing[];
  buyShopListing: (listingId: string, qty: number) => boolean;

  /* ---------------- SANAL DÜKKAN ---------------- */
  /** dükkan vitrin ilanları (botlar + oyuncular) */
  shopAllListings: ShopListing[];
  /** benim dükkan ilanlarım */
  shopMyListings: ShopListing[];
  /** depom: productId → adet (normal envantere GİRMEZ) */
  shopStock: Record<string, number>;
  /** depom: malzeme stokları matId → adet */
  shopMaterials: Record<string, number>;
  /** tasarladığım özel ürünler */
  shopCustoms: ShopCustom[];
  /** mağaza vitrini adı/emoji */
  shopProfile: Account["shopProfile"];
  /** mağaza satış geçmişi (alıcı + kazancım) */
  shopMyPayments: { gross: number; net: number; qty: number; buyerName: string; ts: number }[];

  saveShopProfile: (p: { name: string; emoji: string; desc?: string }) => void;
  /** toptancıdan stok al (belirli ürün) — maliyet × adet düşer */
  buyShopStock: (productId: string, qty: number) => boolean;
  /** toptancıdan ham madde al */
  buyShopMaterial: (matId: string, qty: number) => boolean;
  /** malzemelerden üret — katalog ürünü */
  craftShopProduct: (productId: string, qty: number) => boolean;
  /** özel ürün tasarla (malzeme tarifi kategoriye göre otomatik) */
  craftShopCustom: (c: { name: string; emoji: string; category: string; desc: string; attrs: string[] }) => boolean;
  /** depodan vitrine koy — fiyat senin */
  listShopItem: (productId: string, unitPrice: number, qty: number) => boolean;
  /** vitrinden geri çek — depoya döner */
  unlistShopItem: (listingId: string) => void;
  /** başka oyuncunun dükkânından satın al (hem oyuncu hem bot ilanı) */
  buyShopProduct: (listingId: string, qty: number) => boolean;
  /** satıcı: bekleyen dükkan satışlarını bakiyeye işle */
  claimShopPayments: () => void;

  /* ---------------- SEZON YOLU (Season Pass) ---------------- */
  /** aktif sezon penceresi */
  season: SeasonState;
  /** benim ilerlemem */
  seasonProgress: SeasonProgress;
  /** ulaşılan seviye (1..40) */
  seasonLevel: number;
  /** mevcut seviyedeki xp / gereken xp */
  seasonIntoXp: number;
  seasonNeedXp: number;
  /** tahsil edilebilir ücretsiz seviye sayısı */
  seasonClaimable: number;
  /** tahsil edilebilir premium seviye sayısı */
  seasonClaimablePrem: number;
  /** premium yolu satın al (sezon başına) */
  buySeasonPremium: () => { ok: boolean; error?: string };
  /** ödülü tahsil et — level ile (free/premium otomatik) */
  claimSeasonReward: (level: number) => { ok: boolean; error?: string };

  pendingUserList: Account[];
  pendingDepositList: DepositReq[];
  allUsers: Account[];
  allDeposits: DepositReq[];
  approveUser: (key: string) => void;
  rejectUser: (key: string) => void;
  approveDeposit: (id: string) => void;
  rejectDeposit: (id: string) => void;
  /** Admin: onay tutarı + komisyon belirle (düşükse karşı teklif gönder) */
  decideDeposit: (id: string, offered: number, commissionPct: number) => { ok: boolean; error?: string };
  /** Oyuncu: admin karşı teklifini kabul/reddet */
  respondDepositOffer: (id: string, accept: boolean) => { ok: boolean; error?: string };
  adminAdjust: (key: string, delta: number, reason?: string) => { ok: boolean; error?: string };
  adminLog: AdminLogEntry[];
  resetAll: () => void;
  /** tüm hesapların bakiyesini sıfırla (admin dahil) — tüm cihazlara yayılır */
  moneyReset: DB["moneyReset"];
  resetAllMoney: (reason: string) => { ok: boolean; error?: string };
  /** skin ödüllü çekiliş başlat */
  startSkinRaffle: (
    minutes: number,
    skinId: string,
    opts?: { float?: number; stickers?: string[] }
  ) => { ok: boolean; error?: string };

  /* global sohbet */
  chat: ChatMsg[];
  sendChat: (text: string) => { ok: boolean; error?: string };
  clearChat: () => void;

  /* kasa indirimi */
  caseSale: CaseSale | null;
  startCaseSale: (caseIds: string[], discount: number, minutes: number) => { ok: boolean; error?: string };
  cancelCaseSale: () => void;

  /* skin fiyat yönetimi */
  priceSettings: PriceSettings | null;
  setPriceSettings: (p: Partial<PriceSettings>) => { ok: boolean; error?: string };
  skinBasePrice: (id: string) => number;
  /** fiyat çarpanı değiştiğinde artar — memo dep'lerinde kullan */
  priceVersion: number;

  /* ekonomik dalga */
  economyWave: EconomyWave | null;
  economyConfig: EconomyConfig | null;
  /** fiyat geçmişi kareleri (id ile birleşir) */
  priceSnaps: PriceSnap[];
  startEconomyWave: (
    surge: number,
    rareBoost: number,
    minutes: number,
    direction?: "up" | "down",
    permanent?: boolean,
    fadeInMin?: number,
    fadeOutMin?: number
  ) => { ok: boolean; error?: string };
  cancelEconomyWave: () => void;
  setEconomyConfig: (
    p: Partial<Pick<EconomyConfig, "enabled" | "intervalMin" | "surge" | "rareBoost" | "durationMin" | "direction" | "after" | "fadeMin">>
  ) => { ok: boolean; error?: string };
  /** Tüm zam/indirimleri geri al: fiyatlar orijinal katalog değerine döner, dalga durur */
  resetEconomy: () => { ok: boolean; error?: string };

  /* haftanın oyuncusu */
  weekWinner: { key: string; name: string; spent: number; opened: number } | null;
  weekPin: WeekPin | null;
  pinWeekWinner: (key: string) => { ok: boolean; error?: string };
  clearWeekPin: () => void;

  /* yetkili pazar ilanı */
  adminListings: MarketListing[];
  adminCreateListing: (
    skinId: string,
    unitPrice: number,
    qty: number
  ) => { ok: boolean; error?: string };
  adminCancelListing: (listingId: string) => { ok: boolean; error?: string };

  syncUrl: string | null;
  syncStatus: SyncStatus;
  setSyncUrl: (url: string | null) => void;
  syncCode: string | null;
  setSyncCode: (code: string | null) => void;
  syncNow: () => void;

  /* reklamlar */
  ads: AdBanner[];
  adsAll: AdBanner[];
  addAd: (a: { emoji?: string; title: string; text: string; link?: string }) => { ok: boolean; error?: string };
  toggleAd: (id: string) => void;
  removeAd: (id: string) => void;
}

const GameCtx = createContext<GameState | null>(null);

/* Bot müşteri profilleri — herkes aynı ürünü almaz:
   modacı kıyafet, gurme yemek/içecek, teknolojici elektronik,
   evcimen ev ürünü, koleksiyoncu pahalı şey, fırsatçı en uygunu arar. */
interface ShopperProfile {
  cats: ShopCategory[] | null;
  /** alt fiyat eşiği — koleksiyoncu pahalı arar */
  minUnit: number;
  /** önerilen satış fiyatının kaç katına kadar razı olur */
  maxRatio: number;
}
/* Bot dükkan vitrinlerini doldur/tazele — oyuncu dükkanlarıyla aynı
   shopListings sistemine ilan yazar (sync ile her cihaza yayılır). */
function restockBotStores(fresh: DB, now: number): void {
  const listings = (fresh.shopListings ??= []);
  for (const s of SHOP_BOT_STORES) {
    const key = botStoreKey(s.id);
    const mine = listings.filter((l) => l.sellerKey === key && !l.removed && (l.qty ?? 0) > 0);
    /* eksik slotları doldur — kategorisinden rastgele ürün */
    let missing = Math.max(0, s.slots - mine.length);
    while (missing-- > 0) {
      const pool = SHOP_PRODUCTS.filter((p) => s.cats.includes(p.category));
      if (!pool.length) break;
      const def = pool[Math.floor(Math.random() * pool.length)];
      if (listings.some((l) => l.sellerKey === key && !l.removed && l.productId === def.id)) continue;
      const unitPrice = Math.max(
        100,
        Math.round((def.list * (s.priceMin + Math.random() * (s.priceMax - s.priceMin))) / 100) * 100
      );
      listings.push({
        id: uid(),
        sellerKey: key,
        sellerName: s.name,
        shopName: s.name,
        productId: def.id,
        unitPrice,
        qty: s.stockMin + Math.floor(Math.random() * (s.stockMax - s.stockMin + 1)),
        ts: now,
        botAt: now,
        botStore: true,
      });
    }
    /* stok azalan vitrinleri tazele (müşteri hep ürün bulsun) */
    for (const l of mine) {
      if (l.qty >= s.stockMin) continue;
      l.qty += 1 + Math.floor(Math.random() * 4);
      l.ts = now;
    }
  }
}

const SHOPPER_PROFILES: ShopperProfile[] = [
  { cats: ["giyim", "aksesuar"], minUnit: 0, maxRatio: 1.3 },
  { cats: ["yemek", "icecek"], minUnit: 0, maxRatio: 1.3 },
  { cats: ["elektronik", "aksesuar"], minUnit: 0, maxRatio: 1.3 },
  { cats: ["ev", "yemek"], minUnit: 0, maxRatio: 1.3 },
  { cats: ["giyim", "yemek", "icecek", "ev"], minUnit: 0, maxRatio: 1.5 },
  { cats: null, minUnit: 4000, maxRatio: 1.6 },
  { cats: null, minUnit: 0, maxRatio: 1.1 },
  { cats: null, minUnit: 0, maxRatio: 1.3 },
];

/** geçerli sekme anahtarları — F5 sonrası geri yükleme doğrulaması için */
const TAB_KEYS: Record<TabKey, true> = {
  cases: true,
  upgrader: true,
  battle: true,
  games: true,
  jackpot: true,
  market: true,
  shop: true,
  season: true,
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

  /* ---------------- KUTLAMALAR ---------------- */
  const [localCelebration, setLocalCelebration] = useState<{
    id: string;
    text: string;
    sub?: string;
  } | null>(null);
  const seenDepositRef = useRef<Set<string>>(new Set());
  const dbRef = useRef(db);
  dbRef.current = db;

  const user = currentUser(db);

  useEffect(() => setAudioMuted(muted), [muted]);
  useEffect(() => () => toastTimers.current.forEach(clearTimeout), []);

  /** her kayıtta sezon penceresini doğrula — pencere dolduysa sıfırla */
  const ensureSeasonDraft = (draft: DB) => {
    const win = seasonOf(Date.now());
    draft.season = { id: win.id, startAt: win.startAt, endAt: win.endAt };
    const me = draft.users[draft.session ?? ""];
    if (!me) return;
    if (!me.season || me.season.id !== win.id) {
      me.season = { id: win.id, xp: 0, premium: false, claimed: [], claimedPremium: [] };
    }
  };

  const mutate = useCallback((fn: (draft: DB) => void) => {
    const fresh = loadDB();
    ensureSeasonDraft(fresh);
    fn(fresh);
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
  }, []);

  /* ---------------- SEZON YOLU (Season Pass) ---------------- */

  /** aktif sezonu DB + hesaba işle (yeni sezon → ilerleme sıfırlanır) */
  const ensureSeason = useCallback((draft: DB) => ensureSeasonDraft(draft), []);

  /** XP ver — her çağrıda fresh hesabı mutasyona uğratır */
  const gainSeasonXp = useCallback((me: Account, amount: number) => {
    if (amount <= 0) return;
    const win = seasonOf(Date.now());
    if (!me.season || me.season.id !== win.id) {
      me.season = { id: win.id, xp: 0, premium: false, claimed: [], claimedPremium: [] };
    }
    me.season.xp += amount;
  }, []);

  /* sezonu kur — giriş/çıkış sonrası da (yeni hesapta ilerleme başlar) */
  useEffect(() => {
    if (!user) return;
    mutate(ensureSeason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.key]);

  /* sezon değişimini izle — 14 günlük pencere bittiğinde sıfırla */
  useEffect(() => {
    const iv = window.setInterval(() => {
      const win = seasonOf(Date.now());
      if (dbRef.current.season?.id !== win.id) mutate(ensureSeason);
    }, 60000);
    return () => clearInterval(iv);
  }, [mutate, ensureSeason]);

  /* fiyat geçmişi: fiyatı etkileyen her olayda bir kare düşer — grafik
     dalga eğrisini deterministik yeniden kurar (son 300 kare). */
  const pushPriceSnap = useCallback((draft: DB, note?: string) => {
    const ps = draft.priceSettings;
    const w = draft.economyWave;
    draft.priceSnaps = [
      ...(draft.priceSnaps ?? []),
      {
        id: uid(),
        ts: Date.now(),
        by: ps?.by ?? w?.by ?? "sistem",
        note,
        global: ps?.global ?? 100,
        byRarity: { ...(ps?.byRarity ?? {}) },
        bySkin: { ...(ps?.bySkin ?? {}) },
        wave: w ? { ...w } : null,
      },
    ].slice(-300);
  }, []);

  /** Site geneli kutlama — tüm cihazlara yayınlanır (admin) */
  const celebrate = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      mutate((draft) => {
        draft.celebration = { text: t, ts: Date.now(), by: ADMIN_NAME };
      });
      coinDing();
    },
    [mutate]
  );

  /** Yerel kutlama — yalnızca bu cihazda konfeti patlatır */
  const celebrateLocal = useCallback((text: string, sub?: string) => {
    setLocalCelebration({ id: uid(), text, sub });
    coinDing();
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
        /* kutlama: 50. seviye ve üstü konfeti ile duyurulur */
        if (newLevel >= 50) {
          celebrateLocal(`Seviye ${newLevel} — ${levelTitle(newLevel)}! 🎉`, `+${money(reward)} seviye ödülü`);
        }
      }
    },
    [pushToast, celebrateLocal]
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

  /** Pazara koy — komisyon düşülür, alıcı bekler (qty>1 = toptan paket) */
  const listOnMarket = useCallback(
    (uidKey: string, price: number, qty = 1): boolean => {
      let ok = false;
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me) return;
        const item = me.inventory.find((i) => i.uid === uidKey);
        if (!item) return;
        /* aynı skinin kopyalarını topla (seçili olan en başta) */
        const same = me.inventory
          .filter((i) => i.skinId === item.skinId)
          .sort((a, b) => (a.uid === uidKey ? -1 : b.uid === uidKey ? 1 : b.ts - a.ts));
        const take = same.slice(0, Math.max(1, qty));
        if (take.length < qty) return;
        const takeUids = new Set(take.map((t) => t.uid));
        me.inventory = me.inventory.filter((i) => !takeUids.has(i.uid));
        const p = Math.max(100, Math.round(price / 100) * 100);
        const lid = uid();
        me.listings = [
          {
            id: lid,
            skinId: item.skinId,
            price: p,
            ts: Date.now(),
            float: item.float,
            stickers: item.stickers,
            baseValue: itemValue(item),
            copies: take.map((t) => ({ float: t.float, stickers: t.stickers })),
            qty: take.length,
          },
          ...(me.listings ?? []),
        ];
        /* aynı ilan gerçek oyuncu dükkanında da yayınlanır */
        draft.marketListings = [
          {
            id: lid,
            sellerKey: me.key,
            sellerName: me.name,
            skinId: item.skinId,
            unitPrice: p,
            qty: take.length,
            copies: take.map((t) => ({ float: t.float, stickers: t.stickers })),
            baseValue: itemValue(item),
            ts: Date.now(),
          },
          ...(draft.marketListings ?? []),
        ];
        ok = true;
      });
      if (ok) click();
      return ok;
    },
    [mutate]
  );

  /** Tüm envanteri kâr yüzdesine göre pazara koy — her skin kendi paketi olur */
  const listAllOnMarket = useCallback(
    (profitPercent: number): { ok: boolean; count: number; total: number } => {
      const pct = Math.max(0, Math.min(500, profitPercent));
      let count = 0;
      let total = 0;
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me) return;
        const groups = new Map<string, InvItem[]>();
        me.inventory.forEach((i) => {
          const g = groups.get(i.skinId) ?? [];
          g.push(i);
          groups.set(i.skinId, g);
        });
        const now = Date.now();
        for (const [, items] of groups) {
          const first = items[0];
          if (!SKIN_MAP[first.skinId]) continue;
          const unit = Math.max(100, Math.round((itemValue(first) * (1 + pct / 100)) / 100) * 100);
          const lid = uid();
          const taken = new Set(items.map((t) => t.uid));
          me.inventory = me.inventory.filter((i) => !taken.has(i.uid));
          const copies = items.map((t) => ({ float: t.float, stickers: t.stickers }));
          me.listings = [
            {
              id: lid,
              skinId: first.skinId,
              price: unit,
              ts: now,
              float: first.float,
              stickers: first.stickers,
              baseValue: itemValue(first),
              copies,
              qty: items.length,
            },
            ...(me.listings ?? []),
          ];
          draft.marketListings = [
            {
              id: lid,
              sellerKey: me.key,
              sellerName: me.name,
              skinId: first.skinId,
              unitPrice: unit,
              qty: items.length,
              copies,
              baseValue: itemValue(first),
              ts: now,
            },
            ...(draft.marketListings ?? []),
          ];
          count += items.length;
          total += unit * items.length;
        }
      });
      if (count > 0) {
        click();
        coinDing();
        pushToast({
          kind: "money",
          title: "Tüm envanter satışa çıktı! 📦",
          sub: `${count} eşya, toplam ${money(total)} — kâr %${Math.round(pct)}`,
        });
      }
      return { ok: count > 0, count, total };
    },
    [mutate, pushToast]
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
        const qt = Math.max(1, l.qty ?? 1);
        const copies = l.copies && l.copies.length > 0 ? l.copies : undefined;
        for (let i = 0; i < qt; i++) {
          /* eski kayıtlar kopya listesi taşımaz → ilan üzerindeki float/sticker kullanılır */
          const c = copies?.[i] ?? { float: l.float, stickers: l.stickers };
          me.inventory.unshift({
            uid: uid(),
            skinId: l.skinId,
            ts: Date.now(),
            float: c.float,
            stickers: c.stickers,
          });
        }
        /* dükkan ilanını da kapat (diğer oyunculara yayılır) */
        const g = (draft.marketListings ?? []).find((x) => x.id === listingId);
        if (g) {
          g.removed = true;
          g.ts = Date.now();
        }
      });
      pushToast({ kind: "info", title: "İlan geri çekildi", sub: "Eşya envanterine döndü" });
    },
    [mutate, pushToast]
  );

  /** Bot ilanından satın al — paket ise tüm kopyaları verir */
  const buyListing = useCallback(
    (listingId: string, qty?: number): boolean => {
      const l = botListingsRef.current.find((x) => x.id === listingId);
      if (!l) return false;
      const maxQty = Math.max(1, l.qty ?? 1);
      const want = Math.min(maxQty, Math.max(1, Math.round(qty ?? maxQty)));
      /* birim fiyat: paketlerde unitPrice'ı, tekilde toplamı kullan */
      const unit = l.unitPrice ?? Math.round(l.price / maxQty);
      const total = qty === undefined && maxQty === 1 ? l.price : bulkTotal(unit, want);
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me || me.balance < total) {
        pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: "Bu ilanı alamıyorsun" });
        return false;
      }
      me.balance = Math.round(me.balance - total);
      for (let i = 0; i < want; i++) {
        me.inventory.unshift({
          uid: uid(),
          skinId: l.skinId,
          ts: Date.now(),
          float: l.float,
          stickers: l.stickers,
        });
      }
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      /* kalan kopya kaldıysa ilanı güncelle, bittiyse yenisini koy */
      const remain = maxQty - want;
      setBotListings((prev) =>
        remain > 0
          ? prev.map((x) =>
              x.id === listingId
                ? { ...x, qty: remain, unitPrice: unit, price: bulkTotal(unit, remain) }
                : x
            )
          : prev.filter((x) => x.id !== listingId).concat(makeBotListing())
      );
      coinDing();
      pushToast({
        kind: "money",
        title: want > 1 ? "Toptan paket alındı" : "Satın alındı",
        sub:
          want > 1
            ? `${want}× ${SKIN_MAP[l.skinId]?.weapon} | ${SKIN_MAP[l.skinId]?.name} — ${money(total)}`
            : `${SKIN_MAP[l.skinId]?.weapon} | ${SKIN_MAP[l.skinId]?.name} — ${money(total)}`,
      });
      return true;
    },
    [pushToast]
  );

  /** Gerçek oyuncunun dükkan ilanından satın al — satıcıya ödeme kaydı düşer */
  const buyShopListing = useCallback(
    (listingId: string, qty: number): boolean => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;
      const l = (fresh.marketListings ?? []).find(
        (x) => x.id === listingId && !x.removed
      );
      if (!l) {
        pushToast({ kind: "lose", title: "İlan bulunamadı", sub: "Muhtemelen satıldı ya da geri çekildi" });
        return false;
      }
      if (l.sellerKey === me.key) {
        pushToast({ kind: "lose", title: "Kendi ilanını alamazsın", sub: "Başka bir hesaptan giriş yap ya da ilanı geri çek" });
        return false;
      }
      const buyQty = Math.min(qty, Math.max(1, l.qty ?? 1));
      const total = bulkTotal(l.unitPrice, buyQty);
      if (me.balance < total) {
        pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: `Bu alım için ${money(total)} gerekli` });
        return false;
      }
      me.balance = Math.round(me.balance - total);
      const taken = (l.copies ?? []).slice(0, buyQty);
      for (let i = 0; i < buyQty; i++) {
        const c = taken[i] ?? {};
        me.inventory.unshift({
          uid: uid(),
          skinId: l.skinId,
          ts: Date.now(),
          float: c.float,
          stickers: c.stickers,
        });
      }
      /* kalan kopyaları düş; bittiysse ilanı kapat */
      const remain = Math.max(1, l.qty ?? 1) - buyQty;
      if (remain <= 0) {
        l.removed = true;
        l.qty = 0;
        l.copies = [];
      } else {
        l.qty = remain;
        l.copies = l.copies ? l.copies.slice(buyQty) : [];
      }
      l.ts = Date.now();
      /* pazar komisyonu — satıcının VIP kademesine göre */
      const sellerAcc = fresh.users[l.sellerKey];
      const sellerFee = vipLevelEntry(sellerAcc?.vipLevel ?? 0)?.fee ?? MARKET_FEE;
      const net = Math.round(total * (1 - sellerFee));
      const pay: MarketPayment = {
        id: uid(),
        listingId: l.id,
        sellerKey: l.sellerKey,
        sellerName: l.sellerName,
        buyerKey: me.key,
        buyerName: me.name,
        qty: buyQty,
        gross: total,
        net,
        ts: Date.now(),
      };
      fresh.marketPayments = [...(fresh.marketPayments ?? []), pay].slice(-400);
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      coinDing();
      const skin = SKIN_MAP[l.skinId];
      pushToast({
        kind: "money",
        title: buyQty > 1 ? `Toptan alım: ${buyQty} adet` : "Dükkandan satın alındı",
        sub: `${skin?.weapon} | ${skin?.name} — ${money(total)}`,
      });
      return true;
    },
    [pushToast]
  );

  /* Satıcı: gelen ödeme kayıtlarını bakiyeye işle + kendi ilanını güncelle */
  const claimMarketPayments = useCallback(() => {
    const fresh = loadDB();
    const me = currentUser(fresh);
    if (!me) return;
    const claimed = fresh.claimedMarket ?? {};
    const pending = (fresh.marketPayments ?? []).filter(
      (p) => p.sellerKey === me.key && !claimed[p.id]
    );
    if (!pending.length) return;
    let total = 0;
    const perListing = new Map<string, number>();
    pending.forEach((p) => {
      claimed[p.id] = Date.now();
      total += p.net;
      perListing.set(p.listingId, (perListing.get(p.listingId) ?? 0) + p.qty);
    });
    me.balance = Math.round(me.balance + total);
    fresh.claimedMarket = claimed;
    /* satılan kopyaları kendi ilanımızdan düş */
    me.listings = (me.listings ?? []).filter((l) => {
      const soldQty = perListing.get(l.id) ?? 0;
      if (soldQty <= 0) return true;
      const qt = Math.max(1, l.qty ?? 1);
      if (soldQty >= qt) return false;
      l.qty = qt - soldQty;
      if (l.copies && l.copies.length) l.copies = l.copies.slice(soldQty);
      return true;
    });
    const day = todayKey();
    if (!me.missions || me.missions.day !== day) me.missions = emptyMissions(day);
    me.missions.sales += pending.length;
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
    coinDing();
    pushToast({
      kind: "money",
      title: `Dükkan satışı: +${money(total)}`,
      sub: `${pending.length} alım işlendi — para bakiyene eklendi`,
    });
  }, [pushToast]);

  /* satış kayıtlarını düzenli işle (senkron gelince de işler) */
  useEffect(() => {
    claimMarketPayments();
    const iv = window.setInterval(claimMarketPayments, 12000);
    return () => clearInterval(iv);
  }, [claimMarketPayments]);

  const refreshMarket = useCallback(() => {
    setBotListings(generateBotListings());
    click();
  }, []);

  /* ---------------- SANAL DÜKKAN ----------------
     Gerçek hayat gibi: oyuncu kendi dükkanını açar (ad + emoji),
     toptancıdan stok alır veya malzemeden üretir, vitrine koyar.
     Botlar + oyuncular alışveriş yapar. Dükkan ürünleri normal
     envantere GİRMEZ — yalnızca Dükkan > Depo'da durur. */

  /** Mağaza vitrini (ad/emoji) kaydet */
  const saveShopProfile = useCallback(
    (p: { name: string; emoji: string; desc?: string }) => {
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me) return;
        const name = p.name.trim().slice(0, 24) || `${me.name}'in Dükkanı`;
        me.shopProfile = {
          name,
          emoji: p.emoji || "🏪",
          desc: p.desc?.trim().slice(0, 90) || undefined,
          ts: Date.now(),
        };
      });
      pushToast({ kind: "info", title: "Mağaza vitrini güncellendi", sub: "Dükkanını ziyarete hazır" });
    },
    [mutate, pushToast]
  );

  /** Toptancıdan stok al — maliyet × adet */
  const buyShopStock = useCallback(
    (productId: string, qty: number): boolean => {
      const def = SHOP_PRODUCT_MAP[productId];
      const n = Math.max(1, Math.min(9999, Math.round(qty)));
      if (!def) return false;
      const total = Math.round(def.cost * n);
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me || me.balance < total) {
        pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: `Stok için ${money(total)} gerekli` });
        return false;
      }
      me.balance = Math.round(me.balance - total);
      me.shopStock = { ...(me.shopStock ?? {}), [productId]: (me.shopStock?.[productId] ?? 0) + n };
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      pushToast({
        kind: "money",
        title: `Toptan stok: ${n}× ${def.name}`,
        sub: `Maliyet ${money(total)} — önerilen satış ${money(def.list * n)}`,
      });
      return true;
    },
    [pushToast]
  );

  /** Toptancıdan ham madde al */
  const buyShopMaterial = useCallback(
    (matId: string, qty: number): boolean => {
      const mat = SHOP_MATERIAL_MAP[matId];
      const n = Math.max(1, Math.min(9999, Math.round(qty)));
      if (!mat) return false;
      const total = Math.round(mat.price * n);
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me || me.balance < total) {
        pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: `${money(total)} gerekli` });
        return false;
      }
      me.balance = Math.round(me.balance - total);
      me.shopMaterials = { ...(me.shopMaterials ?? {}), [matId]: (me.shopMaterials?.[matId] ?? 0) + n };
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      click();
      return true;
    },
    [pushToast]
  );

  /** Malzemeden üret — katalog ürünü (tarif malzemeleri düşer) */
  const craftShopProduct = useCallback(
    (productId: string, qty: number): boolean => {
      const def = SHOP_PRODUCT_MAP[productId];
      const n = Math.max(1, Math.min(999, Math.round(qty)));
      if (!def || !def.recipe || def.recipe.length === 0) return false;
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;
      const mats = me.shopMaterials ?? {};
      for (const r of def.recipe) {
        if ((mats[r.mat] ?? 0) < r.qty * n) {
          pushToast({
            kind: "lose",
            title: "Malzeme eksik",
            sub: `Üretim için ${recipeText(def.recipe)} gerekli`,
          });
          return false;
        }
      }
      const next = { ...mats };
      for (const r of def.recipe) next[r.mat] = (next[r.mat] ?? 0) - r.qty * n;
      me.shopMaterials = next;
      me.shopStock = { ...(me.shopStock ?? {}), [productId]: (me.shopStock?.[productId] ?? 0) + n };
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      pushToast({
        kind: "info",
        title: `Üretildi: ${n}× ${def.name}`,
        sub: `Depoya eklendi — toptan değeri ${money(def.cost * n)}`,
      });
      return true;
    },
    [pushToast]
  );

  /** Özel ürün tasarımı + üretim (kategori tarifi otomatik) */
  const craftShopCustom = useCallback(
    (c: { name: string; emoji: string; category: string; desc: string; attrs: string[] }): boolean => {
      const cat = c.category as ShopCategory;
      const recipe = CUSTOM_RECIPES[cat];
      if (!recipe) return false;
      const name = c.name.trim().slice(0, 24);
      if (name.length < 2) {
        pushToast({ kind: "lose", title: "Ürün adı gerekli", sub: "En az 2 karakter" });
        return false;
      }
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;
      const mats = me.shopMaterials ?? {};
      for (const r of recipe) {
        if ((mats[r.mat] ?? 0) < r.qty) {
          pushToast({
            kind: "lose",
            title: "Malzeme eksik",
            sub: `Üretim için ${recipeText(recipe)} gerekli`,
          });
          return false;
        }
      }
      if ((me.shopCustoms ?? []).length >= 30) {
        pushToast({ kind: "lose", title: "Tasarım limiti", sub: "En fazla 30 özel ürün" });
        return false;
      }
      const next = { ...mats };
      for (const r of recipe) next[r.mat] = (next[r.mat] ?? 0) - r.qty;
      const custom: ShopCustom = {
        id: "c_" + uid(),
        name,
        emoji: c.emoji || "🎁",
        category: cat,
        desc: c.desc.trim().slice(0, 90),
        attrs: c.attrs.filter(Boolean).slice(0, 6),
        ts: Date.now(),
      };
      me.shopMaterials = next;
      me.shopCustoms = [...(me.shopCustoms ?? []), custom];
      me.shopStock = { ...(me.shopStock ?? {}), [custom.id]: (me.shopStock?.[custom.id] ?? 0) + 1 };
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      pushToast({
        kind: "win",
        title: `"${custom.name}" tasarlandı`,
        sub: `Ürün depoda — vitrine koyup satabilirsin (${SHOP_CATEGORIES[cat]?.label ?? cat})`,
      });
      return true;
    },
    [pushToast]
  );

  /** Depodan vitrine koy */
  const listShopItem = useCallback(
    (productId: string, unitPrice: number, qty: number): boolean => {
      const n = Math.max(1, Math.min(9999, Math.round(qty)));
      const price = Math.max(1, Math.min(5_000_000, Math.round(unitPrice)));
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;
      const stock = me.shopStock ?? {};
      if ((stock[productId] ?? 0) < n) {
        pushToast({ kind: "lose", title: "Depoda yeterli stok yok", sub: `${n} adet bulunmuyor` });
        return false;
      }
      const custom = productId.startsWith("c_")
        ? (me.shopCustoms ?? []).find((x) => x.id === productId)
        : undefined;
      const def = SHOP_PRODUCT_MAP[productId];
      const label = custom?.name ?? def?.name ?? productId;
      me.shopStock = { ...stock, [productId]: (stock[productId] ?? 0) - n };
      const listing: ShopListing = {
        id: uid(),
        sellerKey: me.key,
        sellerName: me.name,
        shopName: me.shopProfile?.name ?? `${me.name}'in Dükkanı`,
        productId,
        custom,
        unitPrice: price,
        qty: n,
        ts: Date.now(),
      };
      fresh.shopListings = [...(fresh.shopListings ?? []), listing].slice(-300);
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      pushToast({
        kind: "money",
        title: `Vitrine koyuldu: ${n}× ${label}`,
        sub: `Birim ${money(price)} — beklenen kazanç ${money(Math.round(price * n * 0.95))}`,
      });
      return true;
    },
    [pushToast]
  );

  /** Vitrinden geri çek — depoya döner */
  const unlistShopItem = useCallback(
    (listingId: string) => {
      mutate((draft) => {
        const me = draft.users[draft.session ?? ""];
        if (!me) return;
        const l = (draft.shopListings ?? []).find((x) => x.id === listingId);
        if (!l || l.sellerKey !== me.key || l.removed) return;
        l.removed = true;
        l.ts = Date.now();
        me.shopStock = { ...(me.shopStock ?? {}), [l.productId]: (me.shopStock?.[l.productId] ?? 0) + l.qty };
      });
      pushToast({ kind: "info", title: "İlan geri çekildi", sub: "Ürünler depoya döndü" });
    },
    [mutate, pushToast]
  );

  /** Başka oyuncunun / bot ilanının dükkan ürününü satın al.
      Katalog ürünü → depoma adet girer; özel ürün → tanımı da kopyalanır. */
  const buyShopProduct = useCallback(
    (listingId: string, qty: number): boolean => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return false;
      const l = (fresh.shopListings ?? []).find((x) => x.id === listingId && !x.removed);
      if (!l || l.qty <= 0) {
        pushToast({ kind: "lose", title: "İlan bulunamadı", sub: "Satıldı ya da geri çekildi" });
        return false;
      }
      if (l.sellerKey === me.key) {
        pushToast({ kind: "lose", title: "Kendi ilanını alamazsın", sub: "Ilana vitrinden geri çek" });
        return false;
      }
      const buyQty = Math.min(Math.max(1, Math.round(qty)), l.qty);
      const total = Math.round(l.unitPrice * buyQty);
      if (me.balance < total) {
        pushToast({ kind: "lose", title: "Yetersiz bakiye", sub: `${money(total)} gerekli` });
        return false;
      }
      me.balance = Math.round(me.balance - total);
      /* ürün depoya girer (normal envantere DEĞİL) */
      me.shopStock = { ...(me.shopStock ?? {}), [l.productId]: (me.shopStock?.[l.productId] ?? 0) + buyQty };
      /* özel ürünü alan, tasarımını da kopyalar (yeniden satabilir) */
      if (l.custom && !(me.shopCustoms ?? []).some((x) => x.id === l.custom!.id)) {
        me.shopCustoms = [...(me.shopCustoms ?? []), l.custom];
      }
      l.qty -= buyQty;
      if (l.qty <= 0) {
        l.removed = true;
        l.qty = 0;
      }
      l.ts = Date.now();
      const seller = fresh.users[l.sellerKey];
      const fee = seller?.vipLevel ? 0.03 : MARKET_FEE;
      const net = Math.round(total * (1 - fee));
      const pay: ShopPayment = {
        id: uid(),
        listingId: l.id,
        sellerKey: l.sellerKey,
        sellerName: l.sellerName,
        buyerKey: me.key,
        buyerName: me.name,
        qty: buyQty,
        gross: total,
        net,
        ts: Date.now(),
      };
      fresh.shopPayments = [...(fresh.shopPayments ?? []), pay].slice(-400);
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      const label = l.custom?.name ?? SHOP_PRODUCT_MAP[l.productId]?.name ?? l.productId;
      coinDing();
      pushToast({
        kind: "money",
        title: buyQty > 1 ? `${buyQty}× alındı` : "Dükkandan alındı",
        sub: `${label} — ${money(total)} (depona eklendi)`,
      });
      return true;
    },
    [pushToast]
  );

  /** Satıcı: bekleyen dükkan satışlarını bakiyeye işle.
      Çift-sekme/cihaz yarışına karşı: claim damgasını önce yaz, taze oku,
      damga hâlâ kendindeyse bakiyeye işle (ikinci sekme aynı satışı ALAMAZ). */
  const claimShopPayments = useCallback(() => {
    let fresh = loadDB();
    const me = currentUser(fresh);
    if (!me) return;
    let claimed = fresh.claimedShop ?? {};
    const pending = (fresh.shopPayments ?? []).filter((p) => p.sellerKey === me.key && !claimed[p.id]);
    if (!pending.length) return;
    const claimId = Date.now() + ":" + Math.random().toString(36).slice(2, 8);
    /* 1. faz: benzersiz claim damgasını yaz */
    const nextClaimed = { ...claimed };
    pending.forEach((p) => {
      nextClaimed[p.id] = claimId;
    });
    fresh.claimedShop = nextClaimed;
    saveDB(fresh);
    /* 2. faz: taze oku — ikinci sekme aynı satış için yarıştıysa damga
       ya onunkidir ya da son yazan bu cihazdır; SON YAZAN kazanır. */
    fresh = loadDB();
    const me2 = currentUser(fresh);
    if (!me2) return;
    const stillMine = pending.filter((p) => (fresh.claimedShop ?? {})[p.id] === claimId);
    if (!stillMine.length) return;
    let total = 0;
    stillMine.forEach((p) => {
      total += p.net;
    });
    me2.balance = Math.round(me2.balance + total);
    const day = todayKey();
    if (!me2.missions || me2.missions.day !== day) me2.missions = emptyMissions(day);
    me2.missions.sales += stillMine.length;
    gainSeasonXp(me2, Math.floor(total / 2000));
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
    coinDing();
    pushToast({
      kind: "money",
      title: `Dükkan satışı: +${money(total)}`,
      sub: `${stillMine.length} satış işlendi — mağazana müşteri geldi`,
    });
  }, [pushToast, gainSeasonXp]);

  /* ---------------- SEZON YOLU (Season Pass) ---------------- */

  /** Premium yolu satın al — sezon başına, sıralı zorunluluk yok */
  const buySeasonPremium = useCallback((): { ok: boolean; error?: string } => {
    const fresh = loadDB();
    const me = currentUser(fresh);
    if (!me) return { ok: false, error: "Oturum bulunamadı" };
    const win = seasonOf(Date.now());
    if (!me.season || me.season.id !== win.id) {
      me.season = { id: win.id, xp: 0, premium: false, claimed: [], claimedPremium: [] };
    }
    if (me.season.premium) return { ok: false, error: "Premium yol zaten aktif" };
    if (me.balance < SEASON_PREMIUM_PRICE) {
      return { ok: false, error: `Yetersiz bakiye — ${money(SEASON_PREMIUM_PRICE)} gerekli` };
    }
    me.balance = Math.round(me.balance - SEASON_PREMIUM_PRICE);
    me.season.premium = true;
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
    coinDing();
    pushToast({
      kind: "win",
      title: "Sezon Premium açıldı 🏆",
      sub: `Tüm premium ödüller artık tahsil edilebilir · −${money(SEASON_PREMIUM_PRICE)}`,
    });
    return { ok: true };
  }, [pushToast]);

  /** Ödül tahsil et — free/premium otomatik seçilir */
  const claimSeasonReward = useCallback(
    (level: number): { ok: boolean; error?: string } => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return { ok: false, error: "Oturum bulunamadı" };
      const win = seasonOf(Date.now());
      if (!me.season || me.season.id !== win.id) {
        me.season = { id: win.id, xp: 0, premium: false, claimed: [], claimedPremium: [] };
      }
      const tier = SEASON_TIER_MAP[level];
      if (!tier) return { ok: false, error: "Geçersiz seviye" };
      if (level > seasonLevelOf(me.season.xp)) {
        return { ok: false, error: `Önce ${level}. seviyeye ulaşmalısın` };
      }
      /* ücretsiz önce; premium varsa ikinci çağrı premium ödülü verir */
      const freeTaken = me.season.claimed.includes(level);
      let rew: SeasonReward;
      if (!freeTaken) {
        rew = tier.free;
      } else if (me.season.premium && !me.season.claimedPremium.includes(level)) {
        rew = tier.prem ?? tier.free;
      } else {
        return { ok: false, error: "Bu ödül zaten alındı" };
      }
      const isPrem = freeTaken;
      let label = "";
      if (rew.kind === "money") {
        me.balance = Math.round(me.balance + (rew.amount ?? 0));
        label = `${money(rew.amount ?? 0)}`;
      } else if (rew.kind === "bundle") {
        /* final paketi: para + birden fazla skin */
        if (rew.amount) me.balance = Math.round(me.balance + rew.amount);
        const names: string[] = [];
        for (const sid of rew.skins ?? []) {
          const item = makeSkinItem(sid);
          me.inventory.unshift(item);
          const s = SKIN_MAP[sid];
          names.push(s ? `${s.weapon} | ${s.name}` : sid);
        }
        label = `${names.join(" + ")}${rew.amount ? ` + ${money(rew.amount)}` : ""}`;
      } else if (rew.skinId) {
        const item = makeSkinItem(rew.skinId);
        me.inventory.unshift(item);
        const s = SKIN_MAP[rew.skinId];
        label = s ? `${s.weapon} | ${s.name}` : rew.skinId;
      }
      (isPrem ? me.season.claimedPremium : me.season.claimed).push(level);
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      coinDing();
      pushToast({
        kind: "win",
        title: `Sezon ödülü: ${level}. seviye 🎁`,
        sub: `${isPrem ? "Premium" : "Ücretsiz"} yol · ${label}`,
      });
      return { ok: true };
    },
    [pushToast]
  );

  useEffect(() => {
    claimShopPayments();
    const iv = window.setInterval(claimShopPayments, 12000);
    return () => clearInterval(iv);
  }, [claimShopPayments]);

  /* Bot müşteriler: dinamik akış — popülerlik, aktif reklam ve fiyat
     cazibesine göre 25-150 sn arasında mağazaları gezerler. Her ziyaretçi
     kendi profiline göre ürün seçer (modacı, gurme, teknolojici, evcimen,
     koleksiyoncu, fırsatçı...) — herkes tişört almaz.
     Çift-cihaz yarışına karşı İKİ-FAZLI CLAIM: önce shopBotAt damgası yazılır,
     taze okuma damgayı hâlâ kendisindeyse işlemi yapan bu cihaz olur. */
  useEffect(() => {
    const iv = window.setInterval(() => {
      let fresh = loadDB();
      const now = Date.now();
      const active = (fresh.shopListings ?? []).filter((l) => !l.removed && (l.qty ?? 0) > 0);
      const adsOn = (fresh.ads ?? []).some((a) => !a.removed && a.active);
      const avgUnit =
        active.length > 0 ? active.reduce((s, l) => s + Math.max(1, l.unitPrice), 0) / active.length : 0;

      /* ---- akış: popülerlik + reklam + fiyat ---- */
      let gap = 110;
      gap -= Math.min(9, Math.floor(active.length / 5)) * 8; // her ~5 ilan müşteri çeker
      gap -= adsOn ? 25 : 0; // aktif reklam mağazayı doldurur
      if (avgUnit > 0 && avgUnit < 800) gap -= 20;
      else if (avgUnit > 0 && avgUnit < 1800) gap -= 10;
      else if (avgUnit > 12000) gap += 25;
      gap = Math.max(25, Math.min(150, Math.round(gap)));
      if (now - (fresh.shopBotAt ?? 0) < gap * 1000) return;

      const claim = now;
      fresh.shopBotAt = claim;
      saveDB(fresh);
      /* diğer cihaz daha yeni yazdıysa bu turu o kazanır — çekil */
      fresh = loadDB();
      if (fresh.shopBotAt !== claim) return;
      /* BOT DÜKKANLAR: eksik ürünleri koy + stokları tazele (tek cihaz üretir,
         ilanlar sync ile herkesin dükkan listesine düşer) */
      restockBotStores(fresh, now);
      const act = (fresh.shopListings ?? []).filter((l) => !l.removed && (l.qty ?? 0) > 0);
      if (!act.length) return;

      /* ---- aynı turda kaç kişi gelir? ---- */
      const visitors = Math.min(
        3,
        1 + Math.floor(act.length / 8) + (adsOn ? 1 : 0) + (avgUnit > 0 && avgUnit < 800 ? 1 : 0)
      );

      const buys: { listing: (typeof act)[number]; qty: number }[] = [];
      for (let vi = 0; vi < visitors; vi++) {
        const prof = pick(SHOPPER_PROFILES);
        const catSet = prof.cats ? new Set(prof.cats) : null;
        const cands = act.filter((l) => {
          if (l.custom) return l.unitPrice <= 500000 * prof.maxRatio;
          const def = SHOP_PRODUCT_MAP[l.productId];
          if (!def) return l.unitPrice <= 500000;
          if (catSet && !catSet.has(def.category)) return false;
          if (l.unitPrice < prof.minUnit) return false;
          return l.unitPrice <= def.list * prof.maxRatio;
        });
        if (!cands.length) continue;
        /* fırsatçı en uygunu arar; diğerleri zevkine göre seçer */
        const l =
          prof.maxRatio <= 1.1
            ? cands.reduce((a, b) => (a.unitPrice <= b.unitPrice ? a : b))
            : cands[Math.floor(Math.random() * cands.length)];
        const pricey = l.unitPrice >= 3000;
        const buyQty = Math.min(l.qty, 1 + Math.floor(Math.random() * (pricey ? 2 : 3)));
        if (buyQty <= 0) continue;
        buys.push({ listing: l, qty: buyQty });
      }
      if (!buys.length) return;

      for (const { listing: l, qty: buyQty } of buys) {
        l.qty -= buyQty;
        if (l.qty <= 0) {
          l.removed = true;
          l.qty = 0;
        }
        l.ts = now;
        l.botAt = now;
        const gross = Math.round(l.unitPrice * buyQty);
        const fee = 0.05;
        fresh.shopPayments = [
          ...(fresh.shopPayments ?? []),
          {
            id: uid(),
            listingId: l.id,
            sellerKey: l.sellerKey,
            sellerName: l.sellerName,
            buyerKey: "bot-" + uid(),
            buyerName: pick(BOT_NAMES),
            qty: buyQty,
            gross,
            net: Math.round(gross * (1 - fee)),
            ts: now,
            bot: true,
          },
        ].slice(-400);
      }
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
    }, 15000);
    return () => clearInterval(iv);
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
    (def: CaseDef): { skin: import("../data/skins").Skin; seed: string; nonce: number; forced: boolean; ok: boolean } => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      const price = applyVipCaseDisc(casePrice(def, fresh.caseSale ?? null, fresh.priceSettings ?? null), me?.vipLevel ?? 0);
      if (!me || me.balance < price) {
        pushToastSafe.current({
          kind: "lose",
          title: "Yetersiz bakiye",
          sub: "Para Yatır butonundan yetkili onaylı talep oluşturabilirsin",
        });
        return { skin: rollCaseSeeded(def, "0", 0), seed: "0", nonce: 0, forced: false, ok: false };
      }
      /* admin özel kasası: sınırlı stok — açılışta bir adet düşer */
      if (def.limited || def.id.startsWith("custom-")) {
        const cc = fresh.customCases?.find((x) => x.id === def.id);
        if (!cc || !cc.active) {
          pushToastSafe.current({ kind: "lose", title: "Kasa yayından kalkmış", sub: def.name });
          return { skin: rollCaseSeeded(def, "0", 0), seed: "0", nonce: 0, forced: false, ok: false };
        }
        if (cc.stock <= 0) {
          pushToastSafe.current({ kind: "lose", title: "Bu özel kasa tükendi", sub: "Stok bitene kadar bekleyebilirsin" });
          return { skin: rollCaseSeeded(def, "0", 0), seed: "0", nonce: 0, forced: false, ok: false };
        }
        fresh.customCases = (fresh.customCases ?? []).map((x) =>
          x.id === def.id ? { ...x, stock: x.stock - 1, ts: Date.now() } : x
        );
      }
      me.balance = Math.round(me.balance - price);
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
      me.stats.spent = Math.round(me.stats.spent + price);
      bumpMission(me, "cases");
      bumpMission(me, "wagered", price);
      checkLevelUp(me.stats.spent, me);
      gainSeasonXp(me, 60);
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
      emitLive({ kind: "caseWin", user: me.name, item: `${skin.weapon} | ${skin.name}`, amount: skin.price });
      if (forced)
        pushToastSafe.current({
          kind: "info",
          title: "Garanti aktive!",
          sub: `${PITY_GUARANTEE} açılıştır nadir çıkmıyordu — bu sefer yüksek kademe garantili`,
        });
      checkAchievements();
      return { skin, seed, nonce, forced, ok: true };
    },
    [checkAchievements, gainSeasonXp]
  );

  /* Provably Fair doğrulama — seed + nonce ile yeniden hesapla */
  const verifyRoll = useCallback(
    (seed: string, nonce: number, def: CaseDef): import("../data/skins").Skin =>
      rollCaseSeeded(def, seed, nonce),
    []
  );

  /* ---------------- ADMIN: SKİN HEDİYESİ ---------------- */
  const adminGiveSkin = useCallback(
    (key: string, skinId: string, opts?: { float?: number; stickers?: string[] }): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      const u = dbRef.current.users[key];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      if (!u) return { ok: false, error: "Oyuncu bulunamadı" };
      if (u.isAdmin || key === me.key) return { ok: false, error: "Admin hesaplarına skin gönderilemez" };
      const skin = SKIN_MAP[skinId];
      if (!skin || skin.sticker) return { ok: false, error: "Geçersiz skin" };
      const fine: { float?: number; stickers?: string[] } = {};
      if (typeof opts?.float === "number" && Number.isFinite(opts.float)) {
        fine.float = Math.min(1, Math.max(0, Math.round(opts.float * 1000) / 1000));
      }
      if (Array.isArray(opts?.stickers)) {
        const st = opts.stickers.filter((s) => STICKER_MAP[s]).slice(0, 4);
        if (st.length) fine.stickers = st;
      }
      const id = uid();
      let ok = false;
      mutate((draft) => {
        const target = draft.users[key];
        if (!target) return;
        draft.deposits.unshift({
          id,
          userKey: target.key,
          userName: target.name,
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
        draft.adminLog = [
          {
            id,
            actor: me.name,
            targetKey: target.key,
            targetName: target.name,
            amount: 0,
            reason: `Skin hediyesi: ${skin.weapon} | ${skin.name}`,
            ts: Date.now(),
          },
          ...(draft.adminLog ?? []),
        ].slice(0, 300);
        ok = true;
      });
      if (ok) {
        coinDing();
        pushToast({ kind: "win", title: "Skin hediyesi gönderildi", sub: `${skin.weapon} | ${skin.name}` });
        return { ok: true };
      }
      return { ok: false, error: "İşlem uygulanamadı" };
    },
    [mutate, pushToast]
  );

  /* ---------------- ADMIN: YETKİLİ PAZAR İLANI ---------------- */
  const adminCreateListing = useCallback(
    (skinId: string, unitPrice: number, qty: number): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const skin = SKIN_MAP[skinId];
      if (!skin || skin.sticker) return { ok: false, error: "Geçersiz skin" };
      const price = Math.max(1, Math.round(unitPrice));
      const count = Math.max(1, Math.min(10, Math.round(qty)));
      mutate((draft) => {
        draft.marketListings = [
          {
            id: uid(),
            sellerKey: me.key,
            sellerName: `${ADMIN_NAME} · Yönetim`,
            skinId: skin.id,
            unitPrice: price,
            qty: count,
            copies: Array.from({ length: count }, () => ({})),
            baseValue: skin.price,
            ts: Date.now(),
          },
          ...(draft.marketListings ?? []),
        ].slice(0, 300);
        draft.adminLog = [
          {
            id: uid(),
            actor: me.name,
            targetKey: "*",
            targetName: "PAZAR",
            amount: price * count,
            reason: `Yetkili ilan: ${skin.weapon} | ${skin.name} ×${count} — ${money(price)}/adet`,
            ts: Date.now(),
          },
          ...(draft.adminLog ?? []),
        ].slice(0, 300);
      });
      pushToast({
        kind: "money",
        title: "Yetkili ilan yayınlandı",
        sub: `${skin.weapon} | ${skin.name} ×${count} — ${money(price)}/adet`,
      });
      coinDing();
      return { ok: true };
    },
    [mutate, pushToast]
  );

  const adminCancelListing = useCallback(
    (listingId: string): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      mutate((draft) => {
        const l = (draft.marketListings ?? []).find((x) => x.id === listingId);
        if (!l) return;
        l.removed = true;
        l.qty = 0;
        l.copies = [];
        l.ts = Date.now();
      });
      pushToast({ kind: "info", title: "Yetkili ilan kaldırıldı", sub: "Pazardan çekildi" });
      return { ok: true };
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

  /* ---------------- GLOBAL SOHBET (tüm cihazlara yayılır) ---------------- */
  const lastChatAt = useRef(0);
  const sendChat = useCallback(
    (text: string): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || me.status !== "approved") return { ok: false, error: "Önce onaylı bir hesapla giriş yap" };
      const t = text.trim().slice(0, 160);
      if (!t) return { ok: false, error: "Boş mesaj gönderilemez" };
      if (Date.now() - lastChatAt.current < 2500) return { ok: false, error: "Çok hızlı — 2.5 sn bekle" };
      const msg: ChatMsg = {
        id: uid(),
        user: me.name,
        key: me.key,
        text: t,
        level: levelFromSpent(me.stats.spent),
        ts: Date.now(),
        admin: me.isAdmin,
      };
      lastChatAt.current = msg.ts;
      mutate((draft) => {
        draft.chat = [...(draft.chat ?? []), msg].slice(-200);
      });
      return { ok: true };
    },
    [mutate]
  );

  const clearChat = useCallback(() => {
    const me = dbRef.current.users[dbRef.current.session ?? ""];
    if (!me || !me.isAdmin) return;
    mutate((draft) => {
      draft.chatReset = { ts: Date.now(), by: me.name };
      draft.chat = [];
    });
  }, [mutate]);

  /* ---------------- OTOMATİK ÇEKİLİŞ ---------------- */
  const raffleRef = useRef<RaffleState | null>(null);
  raffleRef.current = db.raffle ?? null;

  const drawRaffleNow = useCallback(() => {
    const r = raffleRef.current;
    if (!r || r.drawn || r.cancelled || Date.now() < r.endsAt) return;
    /* SENKRON TOLERANSI: bitişten 60 sn sonra çekiliş yapılır. Bu sürede tüm
       cihazlar katılımcı listesini birleştirir (sync 1.5 sn) — böylece eksik
       roster ile yanlış kazanan seçilmez, skin ödülü kaybolmaz. */
    if (Date.now() < r.endsAt + 60000) return;
    const ids = Object.keys(r.participants ?? {}).sort();
    if (!ids.length) {
      /* 60 sn sonra hâlâ katılımcı yoksa gerçekten boştur — ama tekrar denemek
         için drawn bayrağı 30 sn daha bekletilir (son katılım senkronlanabilsin) */
      if (Date.now() < r.endsAt + 90000) return;
      mutate((draft) => {
        if (!draft.raffle || draft.raffle.id !== r.id || draft.raffle.drawn) return;
        draft.raffle.drawn = true;
        draft.raffle.winner = { key: "", name: "Katılımcı yok", ts: Date.now() };
      });
      return;
    }
    const seed = r.id;
    const rng = seededRng(seed, "draw");
    const winnerKey = ids[Math.floor(rng() * ids.length)];
    const winnerName = r.participants![winnerKey].name;
    const isSkin = !!r.skinId && !!SKIN_MAP[r.skinId];
    mutate((draft) => {
      if (!draft.raffle || draft.raffle.id !== r.id || draft.raffle.drawn) return;
      draft.raffle.drawn = true;
      draft.raffle.winner = { key: winnerKey, name: winnerName, ts: Date.now() };
      draft.deposits.unshift({
        id: `raffle:${r.id}`,
        userKey: winnerKey,
        userName: winnerName,
        amount: isSkin ? 0 : r.prize,
        method: isSkin ? "Skin Çekilişi Ödülü" : "Çekiliş Ödülü",
        status: "approved",
        ts: Date.now(),
        decidedTs: Date.now(),
        decidedBy: "Sistem",
        skinId: isSkin ? r.skinId : undefined,
        skinName: isSkin ? r.skinName : undefined,
        skinOpts: isSkin ? r.skinOpts : undefined,
      });
      draft.adminLog = [
        {
          id: `raffle:${r.id}`,
          actor: "Sistem",
          targetKey: winnerKey,
          targetName: winnerName,
          amount: isSkin ? 0 : r.prize,
          reason: isSkin
            ? `Skin çekilişi ödülü: ${r.skinName ?? r.skinId}`
            : `Çekiliş ödülü: ${money(r.prize)}`,
          ts: Date.now(),
        },
        ...(draft.adminLog ?? []),
      ].slice(0, 300);
    });
    pushToastSafe.current({
      kind: "win",
      title: "Çekiliş tamamlandı! 🎉",
      sub: isSkin
        ? `${winnerName} "${r.skinName ?? r.skinId}" kazandı`
        : `${winnerName} ${money(r.prize)} kazandı`,
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

  /* ---------------- ADMIN: SKİN ÖDÜLLÜ ÇEKİLİŞ ---------------- */
  const startSkinRaffle = useCallback(
    (
      minutes: number,
      skinId: string,
      opts?: { float?: number; stickers?: string[] }
    ): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const skin = SKIN_MAP[skinId];
      if (!skin || skin.sticker) return { ok: false, error: "Geçersiz skin — ödül seç" };
      const fine: { float?: number; stickers?: string[] } = {};
      if (typeof opts?.float === "number" && Number.isFinite(opts.float)) {
        fine.float = Math.min(1, Math.max(0, Math.round(opts.float * 1000) / 1000));
      }
      if (Array.isArray(opts?.stickers)) {
        const st = opts.stickers.filter((s) => STICKER_MAP[s]).slice(0, 4);
        if (st.length) fine.stickers = st;
      }
      mutate((draft) => {
        draft.raffle = {
          id: uid(),
          prize: 0,
          endsAt: Date.now() + Math.max(1, minutes) * 60000,
          startedBy: ADMIN_NAME,
          participants: {},
          skinId: skin.id,
          skinName: `${skin.weapon} | ${skin.name}`,
          skinOpts: Object.keys(fine).length ? fine : undefined,
        };
      });
      pushToast({
        kind: "money",
        title: "Skin çekilişi başlatıldı",
        sub: `${minutes} dk — ödül: ${skin.weapon} | ${skin.name}`,
      });
      coinDing();
      return { ok: true };
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
    const prizeLabel =
      r.skinId && SKIN_MAP[r.skinId]
        ? `${SKIN_MAP[r.skinId].weapon} | ${SKIN_MAP[r.skinId].name}`
        : money(r.prize);
    pushToast({ kind: "money", title: "Çekilişe katıldın!", sub: `Ödül: ${prizeLabel} — iyi şanslar` });
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

  /* ---------------- KASA İNDİRİMİ ETKİNLİĞİ ---------------- */
  const startCaseSale = useCallback(
    (caseIds: string[], discount: number, minutes: number): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const ids = (caseIds ?? []).filter(Boolean);
      if (!ids.length) return { ok: false, error: "En az bir kasa seç" };
      const d = Math.max(5, Math.min(90, Math.round(discount)));
      if (!Number.isFinite(d)) return { ok: false, error: "Geçersiz indirim" };
      const m = Math.max(1, minutes);
      mutate((draft) => {
        draft.caseSale = {
          id: uid(),
          caseIds: ids,
          discount: d,
          endsAt: Date.now() + m * 60000,
          startedBy: ADMIN_NAME,
          ts: Date.now(),
        };
      });
      pushToast({
        kind: "money",
        title: "Kasa indirimi başlatıldı",
        sub: `%${d} indirim · ${ids.length} kasa · ${m} dk`,
      });
      coinDing();
      return { ok: true };
    },
    [mutate, pushToast]
  );

  const cancelCaseSale = useCallback(() => {
    mutate((draft) => {
      if (!draft.caseSale) return;
      draft.caseSale = { ...draft.caseSale, cancelled: true, ts: Date.now(), endsAt: Date.now() };
    });
    pushToast({ kind: "info", title: "Kasa indirimi kapatıldı", sub: "Kasalar normal fiyata döndü" });
  }, [mutate, pushToast]);

  /* ---------------- SKİN FİYAT YÖNETİMİ ---------------- */
  const setPriceSettings = useCallback(
    (p: Partial<PriceSettings>): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const clean = (v: number): number | undefined =>
        Number.isFinite(v) ? Math.max(10, Math.min(1000, Math.round(v))) : undefined;
      const patch: Partial<PriceSettings> = {};
      if (p.global !== undefined) patch.global = clean(p.global);
      if (p.byRarity) patch.byRarity = { ...(p.byRarity ?? {}) };
      if (p.bySkin) patch.bySkin = { ...(p.bySkin ?? {}) };
      mutate((draft) => {
        draft.priceSettings = {
          ts: Date.now(),
          by: me.name,
          global: patch.global ?? draft.priceSettings?.global ?? 100,
          byRarity: patch.byRarity ?? draft.priceSettings?.byRarity ?? {},
          bySkin: patch.bySkin ?? draft.priceSettings?.bySkin ?? {},
          /* dalga katlaması korunur — aksi halde bu yazım merge'de fold'u ezer */
          foldOf: draft.priceSettings?.foldOf,
        };
        pushPriceSnap(draft, "Fiyat ayarı");
      });
      return { ok: true };
    },
    [mutate, pushPriceSnap]
  );

  /* fiyat çarpanları + ekonomik dalgayı uygula + bot ilanlarını ölçekle */
  const applyPricing = useCallback(() => {
    const d = dbRef.current;
    applyPriceOverrides(d.priceSettings ?? null, d.economyWave ?? null);
    setBotListings((prev) => rescaleBotListings(prev));
  }, []);

  /* dalga bitişi/cancel sonrası seviyeyi kalıcı işleme takibi */
  const pricingStateRef = useRef<{ waveId: string; ended: boolean }>({ waveId: "", ended: false });

  /* yumuşak geçiş: dalga çıkış/iniş evresindeyken fiyatları periyodik tazele */
  useEffect(() => {
    const iv = window.setInterval(() => {
      const w = dbRef.current.economyWave;
      if (!w || w.cancelled) return;
      const now = Date.now();
      const fadeInEnd = (w.ts ?? 0) + Math.max(0, w.fadeInMin ?? 0) * 60000;
      const rampingIn = now > (w.ts ?? 0) && now < fadeInEnd;
      if (rampingIn) applyPricing();
    }, 4000);
    return () => clearInterval(iv);
  }, [applyPricing]);

  useEffect(() => {
    const w = db.economyWave ?? null;
    /* YALNIZCA yeni dalga id'si geldiğinde gözlemi yeniden başlat.
       Aynı id'li güncellemeler (kalıcı işleme / iptal) "ended" bayrağını
       korumalı — aksi halde gözlemci 10 sn'de bir tekrar fold eder. */
    if (pricingStateRef.current.waveId !== (w?.id ?? "")) {
      pricingStateRef.current = { waveId: w?.id ?? "", ended: false };
    }
    applyPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.economyWave, db.priceSettings, applyPricing]);

  /** Dalga seviyesini fiyat ayarlarına işleyen saf yardımcı.
   *  doğal bitişte tepe (endsAt), manuel durdurmada o anki seviye işlenir —
   *  fade-in ortasında durdurulursa tam o anki seviyede kalır (GRADUAL). */
  const foldWaveIntoSettings = useCallback((ps: PriceSettings | null | undefined, wave: EconomyWave): PriceSettings => {
      const base = ps ?? { ts: Date.now(), by: wave.by, global: 100, byRarity: {}, bySkin: {} };
      const byRarity: NonNullable<PriceSettings["byRarity"]> = { ...(base.byRarity ?? {}) };
      const at = Math.min(Date.now(), wave.endsAt ?? Date.now());
      (["consumer", "industrial", "milspec", "restricted", "classified", "covert", "rare"] as const).forEach((r) => {
        const cur = byRarity[r] ?? 100;
        const f = waveMultiplierAt(r, wave, at);
        byRarity[r] = Math.max(10, Math.min(1000, Math.round(cur * f * 10) / 10));
      });
      return {
        ts: Date.now(),
        by: wave.by,
        global: base.global ?? 100,
        byRarity,
        bySkin: { ...(base.bySkin ?? {}) },
        /* dalga damgası: merge'de stale yazımlar bu katlamayı EZEMEZ */
        foldOf: { waveId: wave.id, at, depth: (base.foldOf?.depth ?? 0) + 1 },
      };
  }, []);

  /** Dalga sonlandığında kademe çarpanlarını fiyat ayarlarına işle */
  const foldWaveIntoPrices = useCallback((wave: EconomyWave) => {
    mutate((draft) => {
      /* idempotent: başka sekme/cihaz bu dalgayı zaten işlediyse (cancelled)
         tekrar fold ETME — aksi halde çarpan kendisiyle çarpılıp 10x clamp'e
         sıçrar ve uygulanan seviye bozulur. */
      if (!draft.economyWave || draft.economyWave.id !== wave.id || draft.economyWave.cancelled) return;
      draft.priceSettings = foldWaveIntoSettings(draft.priceSettings, wave);
      /* cancelled bayrağı: gözlemci bir daha fold etmez */
      draft.economyWave = { ...draft.economyWave, cancelled: true, permanent: false, ts: Date.now() };
      pushPriceSnap(draft, "Kalıcı seviye işlendi");
    });
  }, [mutate, foldWaveIntoSettings, pushPriceSnap]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      const st = pricingStateRef.current;
      const w = dbRef.current.economyWave;
      const active = !!w && !w.cancelled && Date.now() < waveFadeEnd(w);
      if (st.waveId && !st.ended && !active) {
        st.ended = true; /* dalga bitti — bir kez işle */
        const ended = dbRef.current.economyWave;
        /* biten her dalga ulaştığı seviyede kalıcı olur (geri dönüş yok);
           manuel durdurma zaten fold ettiği için sadece uygulanır */
        if (ended && !ended.cancelled && ended.id === st.waveId) foldWaveIntoPrices(ended);
        else applyPricing();
      }
    }, 10000);
    return () => clearInterval(iv);
  }, [applyPricing, foldWaveIntoPrices]);

  /* ---------------- EKONOMİK DALGA (admin) ---------------- */
  const startEconomyWave = useCallback(
    (
      surge: number,
      rareBoost: number,
      minutes: number,
      direction: "up" | "down" = "up",
      permanent = false,
      fadeInMin?: number,
      fadeOutMin?: number
    ): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const surgeV = Math.max(5, Math.min(2000, Math.round(surge)));
      const rareV = Math.max(0, Math.min(1000, Math.round(rareBoost)));
      const m = Math.max(1, Math.min(1440, Math.round(minutes)));
      const fin = Math.min(Math.max(0, Math.round(fadeInMin ?? 0)), m);
      const fout = Math.max(0, Math.round(fadeOutMin ?? fin));
      mutate((draft) => {
        /* önceki dalga bitti ama gözlemci daha fold etmediyse (10 sn'lik pencere)
           seviyesi kaybolmasın: yeni dalga KALDIĞI YERDEN devam eder */
        const prev = draft.economyWave;
        if (prev && !prev.cancelled) {
          draft.priceSettings = foldWaveIntoSettings(draft.priceSettings, prev);
          draft.economyWave = { ...prev, cancelled: true, permanent: false, ts: Date.now() };
          pushPriceSnap(draft, "Önceki seviye korundu");
        }
        draft.economyWave = {
          id: uid(),
          ts: Date.now(),
          by: me.name,
          surge: surgeV,
          rareBoost: rareV,
          endsAt: Date.now() + m * 60000,
          direction,
          permanent,
          fadeInMin: fin,
          fadeOutMin: fout,
        };
        pushPriceSnap(draft, direction === "up" ? "Dalga başladı" : "Çöküş başladı");
      });
      pushToast({
        kind: "money",
        title: direction === "up" ? "Ekonomik dalga başladı" : "Piyasa çöküşü başladı",
        sub:
          `${direction === "up" ? "+" : "-"}%${surgeV} · ${m} dk` +
          (fin > 0 ? ` · ${fin} dk'da tepe` : "") +
          " · bitince bu seviye kalır",
      });
      coinDing();
      return { ok: true };
    },
    [mutate, foldWaveIntoSettings, pushToast]
  );

  const cancelEconomyWave = useCallback(() => {
    const w = dbRef.current.economyWave;
    if (!w) return;
    /* Durdurma = o anki fiyat seviyesini dondur. Süre dolunca davranış
       (normal dön / yeni seviye kalsın) ayrı ayar olarak korunur. */
    foldWaveIntoPrices(w);
    pushToast({ kind: "info", title: "Dalga durduruldu", sub: "Fiyatlar o anki seviyede korundu" });
  }, [pushToast, foldWaveIntoPrices]);

  const setEconomyConfig = useCallback(
    (p: Partial<Pick<EconomyConfig, "enabled" | "intervalMin" | "surge" | "rareBoost" | "durationMin" | "direction" | "after" | "fadeMin">>): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const clean = (v: number, min: number, max: number, def: number) =>
        Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : def;
      mutate((draft) => {
        const cur = draft.economyConfig;
        draft.economyConfig = {
          ts: Date.now(),
          by: me.name,
          enabled: p.enabled ?? cur?.enabled ?? false,
          intervalMin: p.intervalMin !== undefined ? clean(p.intervalMin, 0, 1440, 0) : cur?.intervalMin ?? 0,
          surge: p.surge !== undefined ? clean(p.surge, 5, 2000, 50) : cur?.surge ?? 50,
          rareBoost: p.rareBoost !== undefined ? clean(p.rareBoost, 0, 1000, 150) : cur?.rareBoost ?? 150,
          durationMin: p.durationMin !== undefined ? clean(p.durationMin, 1, 1440, 30) : cur?.durationMin ?? 30,
          direction: p.direction ?? cur?.direction ?? "up",
          after: p.after ?? cur?.after ?? "temp",
          fadeMin: p.fadeMin !== undefined ? Math.max(0, Math.min(120, Math.round(p.fadeMin))) : cur?.fadeMin ?? 0,
          lastAt: cur?.lastAt,
        };
      });
      return { ok: true };
    },
    [mutate]
  );

  /* ---------------- REKLAM YÖNETİMİ (admin) ----------------
     Ana menünün hemen altında dönen şerit; tüm cihazlara sync ile yayılır.
     Aktif reklamlar dükkan bot müşterilerini de çeker (akış bonusu). */
  const addAd = useCallback(
    (a: { emoji?: string; title: string; text: string; link?: string }): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const title = a.title.trim();
      const text = a.text.trim();
      if (!title || !text) return { ok: false, error: "Başlık ve metin zorunlu" };
      const link = a.link?.trim();
      mutate((draft) => {
        draft.ads = [
          {
            id: uid(),
            ts: Date.now(),
            by: me.name,
            emoji: (a.emoji ?? "📣").slice(0, 4),
            title: title.slice(0, 80),
            text: text.slice(0, 200),
            link: link && /^https?:\/\//i.test(link) ? link.slice(0, 300) : undefined,
            active: true,
          },
          ...(draft.ads ?? []),
        ].slice(0, 100);
      });
      pushToast({ kind: "money", title: "Reklam yayında", sub: `Ana menü altında görünüyor: ${title}` });
      coinDing();
      return { ok: true };
    },
    [mutate, pushToast]
  );

  const toggleAd = useCallback((id: string) => {
    const me = dbRef.current.users[dbRef.current.session ?? ""];
    if (!me?.isAdmin) return;
    mutate((draft) => {
      draft.ads = (draft.ads ?? []).map((x) =>
        x.id === id ? { ...x, ts: Date.now(), active: !x.active } : x
      );
    });
  }, [mutate]);

  const removeAd = useCallback((id: string) => {
    const me = dbRef.current.users[dbRef.current.session ?? ""];
    if (!me?.isAdmin) return;
    mutate((draft) => {
      draft.ads = (draft.ads ?? []).map((x) =>
        x.id === id ? { ...x, ts: Date.now(), removed: true, active: false } : x
      );
    });
  }, [mutate]);

  /* ---------------- EKONOMİYİ ESKİ HALİNE DÖNDÜR ---------------- */
  const resetEconomy = useCallback((): { ok: boolean; error?: string } => {
    const me = dbRef.current.users[dbRef.current.session ?? ""];
    if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
    const now = Date.now();
    mutate((draft) => {
      /* 1) tüm fiyat çarpanları %100'e — orijinal katalog fiyatları */
      draft.priceSettings = {
        ts: now,
        by: me.name,
        global: 100,
        byRarity: {},
        bySkin: {},
        /* bilinçli sıfırlama damgası: daha eski fold'lu ayarlar merge'de bunu ezemez */
        foldOf: { waveId: draft.economyWave?.id ?? "__reset__", at: now, depth: (draft.priceSettings?.foldOf?.depth ?? 0) + 1 },
      };
      /* 2) aktif dalga iptal (kalıcı bayrağı düşürülür — fold tetiklenmez) */
      if (draft.economyWave) {
        draft.economyWave = { ...draft.economyWave, cancelled: true, permanent: false, ts: now, endsAt: now };
      }
      /* 3) otomatik dalga kapanır, ayarlar varsayılana döner */
      draft.economyConfig = {
        ts: now,
        by: me.name,
        enabled: false,
        intervalMin: 0,
        surge: 100,
        rareBoost: 200,
        durationMin: 30,
        direction: "up",
        after: "temp",
        fadeMin: 10,
      };
      /* denetim kaydı */
      draft.adminLog = [
        {
          id: uid(),
          actor: me.name,
          targetKey: "*",
          targetName: "EKONOMİ",
          amount: 0,
          reason: "Ekonomi eski haline döndürüldü — fiyatlar %100 (orijinal), dalga durduruldu",
          ts: now,
        },
        ...(draft.adminLog ?? []),
      ].slice(0, 300);
      pushPriceSnap(draft, "Sıfırlama");
    });
    pushToast({
      kind: "info",
      title: "Ekonomi eski haline döndü",
      sub: "Fiyatlar orijinal katalog değerlerinde — dalga ve otomatik ayar kapatıldı",
    });
    coinDing();
    return { ok: true };
  }, [mutate, pushToast, pushPriceSnap]);

  /* otomatik dalga — yalnızca admin cihazı üretir, ayarlar sync ile yayılır */
  useEffect(() => {
    const cfg = db.economyConfig;
    const me = dbRef.current.users[dbRef.current.session ?? ""];
    if (!cfg?.enabled || cfg.intervalMin <= 0 || !me?.isAdmin) return;
    const iv = window.setInterval(() => {
      const c = dbRef.current.economyConfig;
      const u = dbRef.current.users[dbRef.current.session ?? ""];
      if (!c?.enabled || c.intervalMin <= 0 || !u?.isAdmin) return;
      const now = Date.now();
      if (now - (c.lastAt ?? 0) < c.intervalMin * 60000) return;
      const w = dbRef.current.economyWave;
      if (w && !w.cancelled && w.endsAt > now) return; /* aktif dalga sürüyor */
      const dir =
        c.direction === "down" || c.direction === "mix"
          ? c.direction === "mix"
            ? (Math.random() < 0.5 ? "up" : "down")
            : "down"
          : "up";
      mutate((draft) => {
        if (!draft.economyConfig) return;
        /* TAZE DURUM KONTROLÜ: interval başındaki dbRef eski olabilir (iki sekme/
           cihaz). Başka sekme/cihaz az önce dalga ürettiyse onu ezme. */
        if (draft.economyWave && !draft.economyWave.cancelled && draft.economyWave.endsAt > now) return;
        /* önceki dalga bitmiş ama fold edilmemişse seviyeyi koru */
        const prev = draft.economyWave;
        if (prev && !prev.cancelled) {
          draft.priceSettings = foldWaveIntoSettings(draft.priceSettings, prev);
          draft.economyWave = { ...prev, cancelled: true, permanent: false, ts: Date.now() };
          pushPriceSnap(draft, "Önceki seviye korundu (otomatik)");
        }
        const fade = Math.max(0, Math.min(draft.economyConfig.durationMin, draft.economyConfig.fadeMin ?? 0));
        draft.economyWave = {
          id: uid(),
          ts: now,
          by: u.name,
          surge: draft.economyConfig.surge,
          rareBoost: draft.economyConfig.rareBoost,
          endsAt: now + draft.economyConfig.durationMin * 60000,
          direction: dir,
          fadeInMin: fade,
          fadeOutMin: fade,
        };
        draft.economyConfig = { ...draft.economyConfig, ts: Date.now(), lastAt: now };
        pushPriceSnap(draft, dir === "up" ? "Otomatik dalga" : "Otomatik çöküş");
      });
    }, 20000);
    return () => clearInterval(iv);
  }, [db.economyConfig, mutate, foldWaveIntoSettings, pushPriceSnap]);

  /* ---------------- ÖZEL KASA: BOTLAR DA SATIN ALIR ---------------- */
  useEffect(() => {
    const iv = window.setInterval(() => {
      /* yalnızca admin cihazı üretir — aksi halde her cihaz stoktan düşer */
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me?.isAdmin) return;
      const acts = (dbRef.current.customCases ?? []).filter((x) => x.active && x.stock > 0);
      if (acts.length === 0) return;
      /* ortalama ~28 sn'de bir bot alımı (canlı ama stok hızla bitmez) */
      if (Math.random() > 0.6) return;
      const cc = acts[Math.floor(Math.random() * acts.length)];
      mutate((draft) => {
        const cur = draft.customCases?.find((x) => x.id === cc.id);
        if (!cur || !cur.active || cur.stock <= 0) return;
        draft.customCases = (draft.customCases ?? []).map((x) =>
          x.id === cc.id ? { ...x, stock: x.stock - 1, ts: Date.now() } : x
        );
      });
    }, 15000);
    return () => clearInterval(iv);
  }, [mutate]);

  /* ---------------- HAFTANIN OYUNCUSU — admin sabitleme ---------------- */
  const pinWeekWinner = useCallback(
    (key: string): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const target = dbRef.current.users[key];
      if (!target || target.isAdmin || target.status !== "approved")
        return { ok: false, error: "Geçersiz oyuncu" };
      mutate((draft) => {
        draft.weekPin = { key: target.key, name: target.name, ts: Date.now(), by: me.name };
      });
      pushToast({ kind: "money", title: "Haftanın oyuncusu sabitlendi", sub: target.name });
      coinDing();
      return { ok: true };
    },
    [mutate, pushToast]
  );

  const clearWeekPin = useCallback(() => {
    const me = dbRef.current.users[dbRef.current.session ?? ""];
    if (!me || !me.isAdmin) return;
    mutate((draft) => {
      draft.weekPin = { key: "", name: "", ts: Date.now(), by: me.name };
    });
    pushToast({ kind: "info", title: "Sabitleme kaldırıldı", sub: "Haftanın oyuncusu otomatik hesaplanıyor" });
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

      const sold: { skin: Skin | null; net: number; qty: number }[] = [];
      const claimed = fresh.claimedMarket ?? {};

      me.listings = me.listings.filter((l) => {
        /* gerçek oyuncu zaten aldıysa bot satışı yapma (senkron gecikmesi) */
        if (
          (fresh.marketPayments ?? []).some(
            (p) => p.listingId === l.id && !claimed[p.id]
          )
        )
          return true;
        if (Math.random() > sellChance(l)) return true;
        const qt = Math.max(1, l.qty ?? 1);
        /* botlar paketi bazen komple, bazen parça parça alır */
        const buyQty = qt > 1 && Math.random() < 0.4 ? qt : 1;
        const sellerFee = vipLevelEntry(me.vipLevel ?? 0)?.fee ?? MARKET_FEE;
        const net = Math.round(bulkTotal(l.price, buyQty) * (1 - sellerFee));
        me.balance = Math.round(me.balance + net);
        sold.push({ skin: SKIN_MAP[l.skinId] ?? null, net, qty: buyQty });
        /* aynı ilanın dükkandaki kopyası da güncellensin */
        const g = (fresh.marketListings ?? []).find((x) => x.id === l.id);
        if (g) {
          const gq = Math.max(1, g.qty ?? 1);
          if (buyQty >= gq) {
            g.removed = true;
            g.qty = 0;
            g.copies = [];
          } else {
            g.qty = gq - buyQty;
            if (g.copies && g.copies.length) g.copies = g.copies.slice(buyQty);
          }
          g.ts = Date.now();
        }
        if (buyQty >= qt) return false;
        /* kalan kopyaları düş */
        l.qty = qt - buyQty;
        if (l.copies && l.copies.length) l.copies = l.copies.slice(buyQty);
        return true;
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
        gainSeasonXp(me, Math.floor(amount / 1000));
      });
      checkReferralReward();
    },
    [updateMe, checkLevelUp, checkReferralReward, gainSeasonXp]
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
    let amount = Math.round((4 + r * r * 14) * SCALE);
    /* VIP kademe çarpanı — satın alınan seviyeye göre */
    const lv = vipLevelEntry(user?.vipLevel ?? 0);
    if (lv) amount = Math.round(amount * lv.dailyMult);
    updateMe((me) => {
      me.lastDaily = nowTs;
      me.balance = Math.round(me.balance + amount);
      gainSeasonXp(me, 25);
    });
    pushToast({
      kind: "money",
      title: `Günlük ödül: ${money(amount)}`,
      sub: lv
        ? `${lv.label} çarpanı ×${lv.dailyMult} uygulandı`
        : "Yarın yeni ödül seni bekliyor",
    });
    coinDing();
    return amount;
  }, [user?.lastDaily, user?.vipLevel, updateMe, pushToast, gainSeasonXp]);

  /* ---------------- VIP SINIFLARI & CASHBACK ---------------- */

  /** ESKİ VIP SİSTEMİNİ BİR SEFERLİK SIFIRLA — yeni sınıf sistemi geçerli.
      Tüm hesaplardan vipUntil/vipPlan/vip rozetleri kaldırılır. */
  useEffect(() => {
    if (db.vipResetAt) return;
    mutate((draft) => {
      if (draft.vipResetAt) return;
      for (const u of Object.values(draft.users)) {
        u.vipUntil = undefined;
        u.vipPlan = undefined;
        if (u.pub) u.pub.vip = false;
      }
      draft.vipResetAt = Date.now();
    });
    pushToastSafe.current({
      kind: "info",
      title: "VIP sistemi güncellendi ✨",
      sub: "Yeni sınıflar: Bakır → Demir → Altın → Elmas → Obsidyen → Netherite (harcamaya göre)",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** VIP kademesi satın al — sıralı: önceki kademeye sahip olmak gerekir */
  const buyVipLevel = useCallback(
    (level: number): { ok: boolean; error?: string } => {
      const want = vipLevelEntry(level);
      if (!want) return { ok: false, error: "Geçersiz VIP kademesi" };
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return { ok: false, error: "Oturum bulunamadı" };
      const owned = me.vipLevel ?? 0;
      if (level <= owned) return { ok: false, error: "Bu kademe zaten sende" };
      if (me.balance < want.price) {
        return { ok: false, error: `Yetersiz bakiye — ${money(want.price)} gerekli` };
      }
      me.balance = Math.round(me.balance - want.price);
      me.vipLevel = level;
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      coinDing();
      pushToast({
        kind: "win",
        title: `VIP: ${want.label} alındı! 🎉`,
        sub: `Günlük ×${want.dailyMult} · cashback %${Math.round(want.cashback * 100)} · kasa %${want.caseDisc} indirim`,
      });
      return { ok: true };
    },
    [pushToast]
  );

  /** Kaybedilen bahis üzerinden VIP cashback döndürür */
  const vipCashback = useCallback(
    (lostAmount: number): number => {
      if (lostAmount <= 0) return 0;
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return 0;
      const lv = vipLevelEntry(me.vipLevel ?? 0);
      const back = Math.round(lostAmount * (lv?.cashback ?? 0));
      if (back <= 0) return 0;
      me.balance = Math.round(me.balance + back);
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      pushToast({
        kind: "money",
        title: `Cashback: +${money(back)} 💸`,
        sub: `${lv?.label ?? "VIP"} — kaybedilen ${money(lostAmount)} bahsinin %${Math.round((lv?.cashback ?? 0) * 100)}'i iade edildi`,
      });
      return back;
    },
    [pushToast]
  );

  /* ---------------- PROFİL VİTRİNİ ---------------- */

  const toggleShowcase = useCallback(
    (uidKey: string): void => {
      let msg: string | null = null;
      updateMe((me) => {
        const cur = me.showcase ?? [];
        if (cur.includes(uidKey)) {
          me.showcase = cur.filter((x) => x !== uidKey);
        } else if (cur.length >= 3) {
          msg = "Vitrine en fazla 3 eşya ekleyebilirsin";
          return;
        } else {
          me.showcase = [...cur, uidKey];
        }
      });
      if (msg) pushToast({ kind: "lose", title: "Vitrin dolu", sub: msg });
    },
    [updateMe, pushToast]
  );

  /* ---------------- JACKPOT (CANLI POT — TÜM CİHAZLAR SENKRON) ---------------- */

  /** Seed'li float üretimi — bot eşyaları her cihazda aynı çıkar */
  const rollFloatSeeded = (rng: () => number): number => {
    const total = WEAR_ORDER.reduce((a, k) => a + WEARS[k].weight, 0);
    let r = rng() * total;
    let picked: WearKey = "ft";
    for (const k of WEAR_ORDER) {
      r -= WEARS[k].weight;
      if (r <= 0) {
        picked = k;
        break;
      }
    }
    const d = WEARS[picked];
    return Math.round((d.min + rng() * (d.max - d.min)) * 10000) / 10000;
  };

  /** Tur için deterministik botlar + katılım zamanları (her cihaz aynısını üretir) */
  /** Ünlü bot girişi — deli gibi para basan efsane içerikleri */
  const celebrityEntry = (rng: () => number, round: number, idx: number, name: string): { entry: JackpotEntry; joinAt: number } => {
    const sched = jackpotSchedule(round);
    const items: JackpotItem[] = [];
    const nItems = 2 + Math.floor(rng() * 3); // 2–4 efsane eşya
    for (let j = 0; j < nItems; j++) {
      const s = LEGEND_SKINS[Math.floor(rng() * LEGEND_SKINS.length)];
      const float = pinnedWearOf(s.id) ?? rollFloatSeeded(rng);
      let stickers: string[] | undefined;
      if (rng() < 0.7) {
        stickers = Array.from(
          { length: 2 + Math.floor(rng() * 3) },
          () => STICKER_POOL[Math.floor(rng() * STICKER_POOL.length)]
        );
      }
      const item: InvItem = { uid: "bot", skinId: s.id, ts: 0, float, stickers };
      items.push({ skinId: s.id, float, stickers, value: itemValue(item) });
    }
    return {
      entry: { id: `bot-${round}-celeb-${idx}`, name, bot: true, items, total: items.reduce((a, x) => a + x.value, 0) },
      joinAt: sched.start + 3500 + idx * 2500 + Math.floor(rng() * 2600),
    };
  };

  const botsForRound = (round: number): { entry: JackpotEntry; joinAt: number }[] => {
    const sched = jackpotSchedule(round);
    const rng = seededRng("skyline:jackpot:bots", round);
    const count = 4 + Math.floor(rng() * 3); // 4–6 bot
    const bots: { entry: JackpotEntry; joinAt: number }[] = [];
    for (let i = 0; i < count; i++) {
      const name = COMMUNITY_USERS[Math.floor(rng() * COMMUNITY_USERS.length)];
      const items: JackpotItem[] = [];
      const nItems = 1 + Math.floor(rng() * 4);
      for (let j = 0; j < nItems; j++) {
        const s = WEAPON_SKINS[Math.floor(rng() * WEAPON_SKINS.length)];
        const float = pinnedWearOf(s.id) ?? rollFloatSeeded(rng);
        let stickers: string[] | undefined;
        if (rng() < 0.16) {
          stickers = Array.from(
            { length: 1 + Math.floor(rng() * 4) },
            () => STICKER_POOL[Math.floor(rng() * STICKER_POOL.length)]
          );
        }
        const item: InvItem = { uid: "bot", skinId: s.id, ts: 0, float, stickers };
        items.push({ skinId: s.id, float, stickers, value: itemValue(item) });
      }
      const total = items.reduce((a, x) => a + x.value, 0);
      bots.push({
        entry: { id: `bot-${round}-${i}`, name, bot: true, items, total },
        /* botlar tura eşit aralıklı, hafif jitter'lı girer */
        joinAt: sched.start + 2500 + i * ((JACKPOT_ROUND_MS - 14000) / count) + Math.floor(rng() * 2200),
      });
    }
    /* her turda en az bir ünlü (Abdurrahman önce), bazen ikinci bir sosyetik */
    const celebCount = 1 + (rng() < 0.45 ? 1 : 0);
    for (let i = 0; i < celebCount; i++) {
      const name = i === 0 ? CELEBRITY_USERS[0] : CELEBRITY_USERS[1 + Math.floor(rng() * (CELEBRITY_USERS.length - 1))];
      bots.push(celebrityEntry(rng, round, i, name));
    }
    return bots;
  };

  /** Deterministik yeni tur — geçmiş ve emanet korunur */
  const freshJackpot = (
    round: number,
    history: JackpotHistoryEntry[],
    settled: JackpotSettledRound[]
  ): JackpotState => {
    const sched = jackpotSchedule(round);
    const now = Date.now();
    const bots = botsForRound(round)
      .filter((b) => b.joinAt <= now)
      .map((b) => b.entry);
    return {
      round,
      endsAt: sched.endsAt,
      nextStartAt: sched.nextStartAt,
      entries: bots,
      history,
      settled,
    };
  };

  /** Deterministik çekiliş — aynı girişler her cihazda aynı kazananı verir */
  const drawJackpot = (jp: JackpotState, now: number): JackpotWinner | null => {
    const pool = (jp.entries ?? []).filter((e) => !e.left && e.total > 0);
    const total = pool.reduce((a, e) => a + e.total, 0);
    if (!pool.length || total <= 0) return null;
    const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    const rng = seededRng("skyline:jackpot:draw", `${jp.round}:${sorted.map((e) => e.id).join(",")}`);
    const r = rng() * total;
    let acc = 0;
    let winner = sorted[sorted.length - 1];
    for (const e of sorted) {
      acc += e.total;
      if (r <= acc) {
        winner = e;
        break;
      }
    }
    return {
      name: winner.name,
      userId: winner.userId,
      bot: winner.bot,
      value: total,
      ts: now,
      entriesCount: pool.length,
    };
  };

  /** Kazananın kendi cihazında ödeme (yalnızca emanet edilmiş turdan) */
  const settleJackpotWin = (me: Account, round: number, entries: JackpotEntry[], winner: JackpotWinner) => {
    const paid = me.jpPaid ?? [];
    if (paid.includes(round)) return;
    me.jpPaid = [...paid, round].slice(-20);
    entries
      .filter((e) => !e.left)
      .forEach((e) =>
        e.items.forEach((it) => {
          me.inventory.unshift({
            uid: uid(),
            skinId: it.skinId,
            ts: Date.now(),
            float: it.float,
            stickers: it.stickers,
          });
        })
      );
    const top3 = [...me.inventory]
      .sort((a, b) => itemValue(b) - itemValue(a))
      .slice(0, 3)
      .map((i) => i.uid);
    me.showcase = top3;
    pushToastSafe.current({
      kind: "win",
      title: `JACKPOT KAZANDIN! 🎉 ${money(winner.value)}`,
      sub: `${entries.length} katılımcının potu envanterine eklendi`,
    });
    setLocalCelebration({
      id: uid(),
      text: "JACKPOT!",
      sub: `${money(winner.value)} değerinde pot kazandın`,
    });
    coinDing();
  };

  /** Oyuncu pota eşya katar (envanterden düşer) */
  const jackpotJoin = useCallback(
    (uids: string[]): { ok: boolean; error?: string } => {
      if (!uids.length) return { ok: false, error: "En az bir eşya seç" };
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return { ok: false, error: "Oturum bulunamadı" };
      const now = Date.now();
      const round = jackpotRoundAt(now);
      if (!fresh.jackpot || fresh.jackpot.round !== round) {
        fresh.jackpot = freshJackpot(round, fresh.jackpot?.history ?? [], fresh.jackpot?.settled ?? []);
      }
      const jp = fresh.jackpot;
      if (jp.winner || now >= jp.endsAt) return { ok: false, error: "Bu tur kapanmış, yenisi başlıyor" };
      if (now > jp.endsAt - 5000) return { ok: false, error: "Tura katılım son 5 saniye kapatıldı" };
      const meEntry = jp.entries.find((e) => e.userId === me.key && !e.left);
      if (meEntry) return { ok: false, error: "Zaten pottasın — çıkıp tekrar girebilirsin" };
      const take = me.inventory.filter((i) => uids.includes(i.uid));
      if (take.length !== uids.length) return { ok: false, error: "Seçili eşyalardan biri artık yok" };
      const items: JackpotItem[] = take.map((i) => ({
        skinId: i.skinId,
        float: i.float,
        stickers: i.stickers,
        value: itemValue(i),
      }));
      me.inventory = me.inventory.filter((i) => !uids.includes(i.uid));
      jp.entries.push({
        id: uid(),
        name: me.name,
        userId: me.key,
        me: true,
        items,
        total: items.reduce((a, i) => a + i.value, 0),
      });
      saveDB(fresh);
      setDb(fresh);
      notifyDbChanged();
      forceSync();
      coinDing();
      return { ok: true };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /** Potadan çık — eşyaların iade edilir (tombstone ile senkron silinir) */
  const jackpotLeave = useCallback((): boolean => {
    const fresh = loadDB();
    const me = currentUser(fresh);
    const jp = fresh.jackpot;
    if (!me || !jp || jp.winner || Date.now() >= jp.endsAt) return false;
    const entry = jp.entries.find((e) => e.userId === me.key && !e.left);
    if (!entry) return false;
    entry.left = true;
    entry.items.forEach((it) => {
      me.inventory.unshift({
        uid: uid(),
        skinId: it.skinId,
        ts: Date.now(),
        float: it.float,
        stickers: it.stickers,
      });
    });
    saveDB(fresh);
    setDb(fresh);
    notifyDbChanged();
    forceSync();
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* jackpot motoru — deterministik botlar, tek kazanan, emanet ödemeleri */
  useEffect(() => {
    if (!user || user.status !== "approved") return;
    const iv = window.setInterval(() => {
      const fresh = loadDB();
      const me = currentUser(fresh);
      if (!me) return;
      const now = Date.now();
      const round = jackpotRoundAt(now);
      const sched = jackpotSchedule(round);
      let jp = fresh.jackpot;
      let changed = false;

      /* tur yok / eskimiş / kazanan ekranı bitti → yeni tur */
      if (!jp || jp.round !== round || (jp.winner && now >= (jp.nextStartAt ?? sched.nextStartAt))) {
        const settled = [...(jp?.settled ?? [])];
        const oldJp = jp;
        if (oldJp?.winner) {
          const cur = settled.find((s) => s.round === oldJp.round);
          const next = { round: oldJp.round, entries: oldJp.entries, winner: oldJp.winner };
          if (!cur) settled.unshift(next);
          else if ((oldJp.winner.entriesCount ?? 0) > (cur.winner.entriesCount ?? 0)) settled[settled.indexOf(cur)] = next;
        }
        jp = freshJackpot(round, (jp?.history ?? []).slice(0, 30), settled.slice(0, 5));
        fresh.jackpot = jp;
        changed = true;
      } else if (jp.round === round) {
        /* deterministik çekiliş — süre dolunca */
        if (!jp.winner && now >= jp.endsAt) {
          const winner = drawJackpot(jp, now);
          if (winner) {
            jp.winner = winner;
            jp.nextStartAt = sched.nextStartAt;
            jp.history = [
              {
                id: `${round}-${winner.name}`,
                name: winner.name,
                userId: winner.userId,
                bot: winner.bot,
                value: winner.value,
                ts: now,
              },
              ...(jp.history ?? []),
            ].slice(0, 30);
            changed = true;
          }
        }
        /* botlar programa göre katılır */
        if (!jp.winner) {
          const live = jp.entries.filter((e) => !e.left).length;
          if (live < JACKPOT_MAX_ENTRIES) {
            for (const b of botsForRound(round)) {
              if (b.joinAt <= now && !jp.entries.some((e) => e.id === b.entry.id)) {
                if (jp.entries.filter((e) => !e.left).length >= JACKPOT_MAX_ENTRIES) break;
                jp.entries.push(b.entry);
                changed = true;
              }
            }
          }
        }
      }

      if (changed) {
        saveDB(fresh);
        setDb(fresh);
        notifyDbChanged();
      }

      /* emanet kazançları — bu cihazın kullanıcısı kazandıysa öde */
      const allSettled = [
        ...(fresh.jackpot?.settled ?? []),
        ...(jp?.settled ?? []),
      ];
      const seen = new Set<number>();
      for (const s of allSettled) {
        if (seen.has(s.round)) continue;
        seen.add(s.round);
        if (s.winner.userId === me.key && !(me.jpPaid ?? []).includes(s.round)) {
          settleJackpotWin(me, s.round, s.entries, s.winner);
          saveDB(fresh);
          setDb(fresh);
          notifyDbChanged();
        }
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.key, user?.status]);

  /* --------- para yatırma talebi --------- */
  const requestDeposit = useCallback(
    (amount: number, method: string) => {
      if (!user) return;
      let auto = false;
      let autoCredit = 0;
      mutate((draft) => {
        auto = !!draft.settings?.autoApproveDeposits;
        /* paket bonusu — talep anında sabitlenir (sonradan değişse bile korunur) */
        const pack = (draft.depositPacks?.packs ?? []).find((p) => p.amount === amount);
        /* kupon % bonusu: sonraki yatırmaya eklenir, kullanılınca temizlenir */
        const meU = draft.users[user.key];
        const cb = meU?.couponBonus;
        const cbOn = cb && cb.until > Date.now();
        const coupon = cbOn ? Math.min(100, Math.max(0, cb.pct)) : 0;
        const bonus = (pack?.bonus ?? 0) + coupon;
        const credit = amount + Math.round((amount * bonus) / 100);
        if (meU && cbOn) meU.couponBonus = undefined;
        const gifts: DepositPackGift[] = (pack?.gifts ?? []).map((g) => ({ ...g }));
        draft.deposits.unshift({
          id: uid(),
          userKey: user.key,
          userName: user.name,
          amount,
          method,
          bonus,
          gifts,
          kind: "deposit",
          status: auto ? "approved" : "pending",
          ts: Date.now(),
          decidedTs: auto ? Date.now() : undefined,
          decidedBy: auto ? "Otomatik Onay" : undefined,
        });
        autoCredit = credit;
      });
      forceSync();
      const bonus = autoCredit > amount ? autoCredit - amount : 0;
      pushToast(
        auto
          ? {
              kind: "money",
              title: "Yatırman otomatik onaylandı",
              sub: `${money(autoCredit)} hesabına ekleniyor${bonus > 0 ? ` (+${money(bonus)} bonus)` : ""}`,
            }
          : {
              kind: "info",
              title: "Yatırma talebin iletildi",
              sub: `${money(amount)}${bonus > 0 ? ` +${money(bonus)} bonus = ${money(autoCredit)}` : ""} — ${ADMIN_NAME} onayı bekleniyor`,
            }
      );
    },
    [user, mutate, pushToast]
  );

  /* --------- yatırma paketleri (admin) --------- */
  const setDepositPacks = useCallback(
    (packs: DepositPack[]): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const clean = packs
        .map((p) => ({
          amount: Math.max(100, Math.min(10_000_000, Math.round(p.amount) || 0)),
          bonus: Math.max(0, Math.min(200, Math.round(p.bonus) || 0)),
          /* hediyeler korunur — eskiden burada siliniyordu, bu yüzden panelden
             eklenen kasa/skin hediyeleri hiç kaydedilmiyordu */
          gifts: (p.gifts ?? [])
            .filter((g) =>
              g && (g.kind === "case" ? !!CASES.find((c) => c.id === g.id) : !!SKIN_MAP[g.id])
            )
            .map((g) => ({
              kind: g.kind,
              id: g.id,
              count: Math.max(1, Math.min(10, Math.round(g.count) || 1)),
            }))
            .slice(0, 4),
        }))
        .filter((p) => p.amount > 0)
        .sort((a, b) => a.amount - b.amount);
      if (clean.length === 0) return { ok: false, error: "En az bir paket kalmalı" };
      mutate((draft) => {
        draft.depositPacks = { ts: Date.now(), by: me.name, packs: clean };
      });
      pushToast({
        kind: "info",
        title: "Yatırma paketleri güncellendi",
        sub: "Oranlar anında tüm cihazlara yayıldı",
      });
      coinDing();
      return { ok: true };
    },
    [mutate, pushToast]
  );

  /* ---------------- KUPON / KOD SİSTEMİ ---------------- */
  const createCoupon = useCallback(
    (c: { code: string; kind: Coupon["kind"]; value: number; caseId?: string; maxUses: number }): {
      ok: boolean;
      error?: string;
    } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const code = c.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 3) return { ok: false, error: "Kod en az 3 karakter olmalı (A-Z, 0-9)" };
      const kind = c.kind;
      const value = Math.max(0, Math.round(c.value) || 0);
      const maxUses = Math.max(1, Math.min(10000, Math.round(c.maxUses) || 1));
      if (kind === "balance" && value < 100) return { ok: false, error: "Bakiye kuponu en az 100 olmalı" };
      if (kind === "percent" && (value < 1 || value > 100)) return { ok: false, error: "% bonus 1-100 arası" };
      if (kind === "case" && !c.caseId) return { ok: false, error: "Kasa seçilmedi" };
      let dup = false;
      mutate((draft) => {
        const list = draft.coupons?.coupons ?? [];
        if (list.some((x) => x.active && x.code === code)) {
          dup = true;
          return;
        }
        const now = Date.now();
        draft.coupons = {
          ts: now,
          by: me.name,
          coupons: [
            {
              id: uid(),
              code,
              kind,
              value,
              caseId: kind === "case" ? c.caseId : undefined,
              maxUses,
              usedCount: 0,
              active: true,
              ts: now,
              by: me.name,
            },
            ...list,
          ].slice(0, 200),
        };
      });
      if (dup) return { ok: false, error: "Bu kod zaten var" };
      pushToast({
        kind: "money",
        title: `Kupon oluşturuldu: ${code}`,
        sub: `${kind === "balance" ? money(value) + " bakiye" : kind === "percent" ? `+%${value} yatırma bonusu` : "bedava kasa"} · ${maxUses} kullanım`,
      });
      coinDing();
      return { ok: true };
    },
    [mutate, pushToast]
  );

  const redeemCoupon = useCallback(
    (raw: string): { ok: boolean; error?: string; note?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me) return { ok: false, error: "Giriş yapmalısın" };
      const code = raw.trim().toUpperCase();
      if (code.length < 3) return { ok: false, error: "Kod çok kısa" };
      const c = (dbRef.current.coupons?.coupons ?? []).find((x) => x.active && x.code === code);
      if (!c) return { ok: false, error: "Geçersiz kod" };
      if (c.expiresAt && c.expiresAt < Date.now()) return { ok: false, error: "Kodun süresi dolmuş" };
      if (c.usedCount >= c.maxUses) return { ok: false, error: "Bu kod tükenmiş" };
      if ((me.usedCoupons ?? []).includes(c.id)) return { ok: false, error: "Bu kodu zaten kullandın" };
      let note = "";
      let applied = false;
      mutate((draft) => {
        const u = draft.users[me.key];
        const cur = draft.coupons?.coupons.find((x) => x.id === c.id);
        if (!u || !cur || !cur.active) return;
        u.usedCoupons = [...(u.usedCoupons ?? []), c.id].slice(-60);
        const now = Date.now();
        if (c.kind === "balance") {
          u.balance = Math.round(u.balance + c.value);
          note = `${money(c.value)} bakiyene eklendi`;
        } else if (c.kind === "percent") {
          u.couponBonus = { pct: Math.min(100, Math.max(1, c.value)), until: now + 24 * 3600_000, code: c.code };
          note = `Sonraki yatırmana +%${c.value} bonus (24 saat)`;
        } else if (c.kind === "case") {
          const def = CASES.find((x) => x.id === c.caseId);
          if (!def) return;
          const skin = rollCaseSeeded(def, randHex(64), Math.floor(Math.random() * 1e9) + 1);
          u.inventory.unshift(makeSkinItem(skin.id));
          note = `${def.name} açıldı → ${skin.weapon} | ${skin.name}`;
        }
        cur.usedCount = Math.min(cur.maxUses, cur.usedCount + 1);
        draft.coupons = { ts: now, by: c.by, coupons: draft.coupons!.coupons };
        applied = true;
      });
      if (!applied) return { ok: false, error: "Kod kullanılamadı" };
      pushToast({ kind: "money", title: "Kupon kullanıldı 🎟️", sub: note });
      coinDing();
      return { ok: true, note };
    },
    [mutate, pushToast]
  );

  const deactivateCoupon = useCallback(
    (id: string) =>
      mutate((draft) => {
        const list = draft.coupons?.coupons ?? [];
        const now = Date.now();
        draft.coupons = {
          ts: now,
          by: draft.coupons?.by ?? "admin",
          coupons: list.map((x) => (x.id === id ? { ...x, active: false, ts: now } : x)),
        };
      }),
    [mutate]
  );

  /* ---------------- ADMIN ÖZEL KASALARI ---------------- */
  const createCustomCase = useCallback(
    (c: {
      name: string;
      price: number;
      stock: number;
      contents: Partial<Record<string, string[]>>;
      tagline?: string;
      img?: string;
      accent?: string;
    }): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const name = c.name.trim();
      if (name.length < 3) return { ok: false, error: "Kasa adı en az 3 karakter" };
      const price = Math.max(100, Math.min(10_000_000, Math.round(c.price) || 0));
      const stock = Math.max(1, Math.min(999, Math.round(c.stock) || 1));
      /* içerikleri doğrula: sadece SKIN_MAP'te olanlar */
      const contents: Partial<Record<string, string[]>> = {};
      let total = 0;
      for (const [r, ids] of Object.entries(c.contents ?? {})) {
        const clean = (ids ?? []).filter((id) => !!SKIN_MAP[id]);
        if (clean.length > 0) {
          contents[r] = clean.slice(0, 40);
          total += clean.length;
        }
      }
      if (total < 1) return { ok: false, error: "En az 1 skin eklemelisin" };
      if (total > 60) return { ok: false, error: "En fazla 60 skin eklenebilir" };
      const img = c.img ?? (CASES.find((x) => x.id === "vault")?.img ?? "");
      const def: CaseDef = {
        id: "tmp",
        name,
        img,
        price,
        accent: c.accent ?? "#f98e1d",
        tagline: c.tagline?.trim() || "Sınırlı özel kasa",
        contents,
      };
      const origValue = expectedValue(def, (sk: Skin) => skinBasePrice(sk.id));
      const now = Date.now();
      mutate((draft) => {
        draft.customCases = [
          {
            id: `custom-${uid()}`,
            name,
            img,
            price,
            accent: c.accent ?? "#f98e1d",
            tagline: c.tagline?.trim() || "Sınırlı özel kasa",
            origValue: Math.max(1, Math.round(origValue)),
            contents,
            stock,
            origStock: stock,
            ts: now,
            by: me.name,
            active: true,
          },
          ...(draft.customCases ?? []),
        ].slice(0, 100);
      });
      pushToast({
        kind: "money",
        title: "Özel kasa yayınlandı 📦",
        sub: `${name} · ${price} · ${stock} adet — mağazada görünüyor`,
      });
      coinDing();
      return { ok: true };
    },
    [mutate, pushToast]
  );

  const deleteCustomCase = useCallback(
    (id: string) =>
      mutate((draft) => {
        draft.customCases = (draft.customCases ?? []).map((x) =>
          x.id === id ? { ...x, active: false, ts: Date.now() } : x
        );
      }),
    [mutate]
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
        const giftResults: string[] = [];
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
              me.balance = Math.max(0, Math.round(me.balance - (d.offered ?? d.amount)));
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
              const bonus = d.method === "Başlangıç Bonusu" ? 0 : Math.max(0, d.bonus ?? 0);
              /* Yetkilinin onayladığı tutar + komisyon dikkate alınır:
                 karşı teklif (offered) ve komisyon (commissionPct) yoksayılıyordu. */
              const comm = Math.min(90, Math.max(0, d.commissionPct ?? 0));
              const base = typeof d.offered === "number" ? d.offered : d.amount;
              const net = base < 0 ? base : Math.round((base * (100 - comm)) / 100);
              const delta = d.method === "Başlangıç Bonusu" ? 0 : net + Math.round((net * bonus) / 100);
              me.balance = Math.max(0, Math.round(me.balance + delta));
            }

            /* paket hediyeleri: kasa ücretsiz açılır (pity/istatistik etkilenmez) */
            for (const g of d.gifts ?? []) {
              if (g.kind === "case") {
                const def = CASES.find((c) => c.id === g.id);
                if (!def) continue;
                for (let i = 0; i < Math.max(1, g.count); i++) {
                  const skin = rollCaseSeeded(def, randHex(64), Math.floor(Math.random() * 1e9) + 1);
                  me.inventory.unshift(makeSkinItem(skin.id));
                  giftResults.push(`${def.name} → ${skin.weapon} | ${skin.name}`);
                }
              } else if (g.kind === "skin") {
                if (!SKIN_MAP[g.id]) continue;
                me.inventory.unshift(makeSkinItem(g.id));
                giftResults.push(`${SKIN_MAP[g.id].weapon} | ${SKIN_MAP[g.id].name}`);
              }
            }
          }
        });

        checkAchievements();
        if (withdraw) {
          if (d.status === "approved") {
            coinDing();
            const wNet = Math.max(
              0,
              Math.round(((d.offered ?? d.amount) * (100 - Math.min(90, Math.max(0, d.commissionPct ?? 0)))) / 100)
            );
            pushToast({
              kind: "money",
              title: `Çekim onaylandı: ${money(wNet)}`,
              sub: `${d.method} ile ödemen yapılacak${(d.commissionPct ?? 0) > 0 ? ` (%${d.commissionPct} komisyon kesildi)` : ""} — ${d.decidedBy ?? ADMIN_NAME}`,
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
                    ? `${money(
                        (() => {
                          const net = Math.max(
                            0,
                            Math.round(((d.offered ?? d.amount) * (100 - Math.min(90, Math.max(0, d.commissionPct ?? 0)))) / 100)
                          );
                          return net + Math.round((net * Math.max(0, d.bonus ?? 0)) / 100);
                        })()
                      )} hesabına eklendi${
                        (d.commissionPct ?? 0) > 0
                          ? ` (%${d.commissionPct} komisyon)`
                          : (d.bonus ?? 0) > 0
                            ? ` (+${money(Math.round(((d.offered ?? d.amount) * d.bonus!) / 100))} bonus)`
                            : ""
                      }`
                    : `${money(Math.abs(d.amount))} hesabından silindi`,
            sub:
              d.method === "Başlangıç Bonusu"
                ? "Hesabın 0 bakiye ile açıldı"
                : d.skinId
                  ? "Envanterine eklendi — keyifle kullan"
                  : `İşlem ${d.decidedBy ?? ADMIN_NAME} tarafından onaylandı`,
          });
          coinDing();
          if (giftResults.length > 0) {
            pushToast({
              kind: "money",
              title: "Paket hediyesi geldi 🎁",
              sub: giftResults.slice(0, 3).join(" · "),
            });
          }
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
    /* Sunucu kodu (MQTT) modunda da yayınla — eskiden yalnızca URL modunda
       çalışıyordu, bu yüzden admin paneli/liderlik/topluluk canlı veriyi
       göremiyordu (bakiye 0, seviye 1, 0 kasa görünüyordu). */
    if ((!syncUrl && !syncCode) || !user || user.status !== "approved") return;
    const publish = () => {
      updateMe((me) => {
        const wk = weekKey();
        if (me.weekBase?.key !== wk) {
          me.weekBase = { key: wk, spent: me.stats.spent, opened: me.stats.opened };
        }
        me.pub = {
          balance: me.balance,
          opened: me.stats.opened,
          invCount: me.inventory.length,
          level: levelFromSpent(me.stats.spent),
          /* liderlik tabloları bunları okuyordu ama hiç yayınlanmıyordu */
          spent: me.stats.spent,
          bestDrop: me.stats.bestDrop,
          vip: (me.vipLevel ?? 0) > 0,
          vipLevel: me.vipLevel ?? 0,
          showcase: (me.showcase ?? [])
            .map((u) => me.inventory.find((i) => i.uid === u))
            .filter((i): i is InvItem => !!i)
            .slice(0, 3)
            .map((i) => i.skinId),
          week: {
            key: wk,
            spent: Math.max(0, me.stats.spent - me.weekBase.spent),
            opened: Math.max(0, me.stats.opened - me.weekBase.opened),
          },
          ts: Date.now(),
        };
      });
    };
    /* bağlanır bağlanmaz bir kez yayınla — 6 sn beklemeden görünür ol */
    publish();
    const iv = window.setInterval(publish, 6000);
    return () => clearInterval(iv);
  }, [syncUrl, syncCode, user?.key, user?.status, updateMe]);

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

  /** Talep net tutarı: (onaylanan/teklif edilen) × (1 - komisyon) */
  const depositNet = (d: DepositReq): number => {
    const base = d.offered ?? d.amount;
    return Math.max(0, Math.round((base * (100 - Math.min(90, Math.max(0, d.commissionPct ?? 0)))) / 100));
  };

  /* --------- ADMIN: onay tutarı + komisyon (düşük tutar = karşı teklif) --------- */
  const decideDeposit = useCallback(
    (id: string, offered: number, commissionPct: number): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const d = dbRef.current.deposits.find((x) => x.id === id);
      if (!d || d.status !== "pending") return { ok: false, error: "Talep bulunamadı" };
      const off = Math.max(1, Math.min(d.amount, Math.round(offered) || d.amount));
      const comm = Math.round(Math.min(90, Math.max(0, commissionPct)) || 0);
      const now = Date.now();
      const isOffer = off < d.amount;
      mutate((draft) => {
        const cur = draft.deposits.find((x) => x.id === id);
        if (!cur || cur.status !== "pending") return;
        cur.offered = off;
        cur.commissionPct = comm;
        cur.offerBy = me.name;
        cur.offerTs = now;
        if (!isOffer) {
          cur.status = "approved";
          cur.decidedTs = now;
          cur.decidedBy = ADMIN_NAME;
        }
      });
      const net = Math.max(0, Math.round((off * (100 - comm)) / 100));
      if (isOffer) {
        pushToast({
          kind: "info",
          title: "Karşı teklif gönderildi",
          sub: `${money(off)}${comm > 0 ? ` (%${comm} komisyon → ${money(net)})` : ""} — ${ADMIN_NAME} onayı bekleniyor`,
        });
      } else {
        pushToast({
          kind: "money",
          title: d.kind === "withdraw" ? "Çekim onaylandı" : "Yatırma onaylandı",
          sub: `${d.userName} → ${money(net)}${comm > 0 ? ` (%${comm} komisyon)` : ""}`,
        });
      }
      coinDing();
      return { ok: true };
    },
    [mutate, pushToast]
  );

  /* --------- OYUNCU: karşı teklifi yanıtla --------- */
  const respondDepositOffer = useCallback(
    (id: string, accept: boolean): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me) return { ok: false, error: "Giriş yapmalısın" };
      let res: { ok: boolean; error?: string } = { ok: false, error: "Talep bulunamadı" };
      mutate((draft) => {
        const d = draft.deposits.find((x) => x.id === id);
        if (!d || d.userKey !== me.key || d.status !== "pending" || !d.offerTs) return;
        if (d.offerRespondedTs) {
          res = { ok: false, error: "Bu teklif zaten yanıtlandı" };
          return;
        }
        const u = draft.users[me.key];
        if (!u) return;
        const now = Date.now();
        d.offerRespondedTs = now;
        d.offerAccepted = accept;
        d.decidedBy = me.name;
        d.decidedTs = now;
        if (accept) {
          d.status = "approved";
          /* çekimde: fark bloke tutardan iade edilir (kabul edilen tutar ödenir) */
          if (d.kind === "withdraw" && d.held) {
            const refund = Math.max(0, d.amount - (d.offered ?? d.amount));
            u.balance = Math.round(u.balance + refund);
          }
        } else {
          d.status = "rejected";
          if (d.kind === "withdraw" && d.held) {
            u.balance = Math.round(u.balance + d.amount); /* tam iade */
          }
          d.reason = "Karşı teklif reddedildi";
        }
        res = { ok: true };
      });
      if (res.ok) {
        forceSync();
        pushToast(
          accept
            ? {
                kind: "money",
                title: "Teklif kabul edildi ✅",
                sub: `${money(depositNet(dbRef.current.deposits.find((x) => x.id === id)!))}${
                  (dbRef.current.deposits.find((x) => x.id === id)?.commissionPct ?? 0) > 0
                    ? " (%komisyon kesintili)"
                    : ""
                }`,
              }
            : { kind: "info", title: "Teklif reddedildi", sub: "Talebin kapatıldı" }
        );
        coinDing();
      }
      return res;
    },
    [mutate, pushToast]
  );

  /* --------- ADMIN KÖTÜYE KULLANIM KORUMASI ---------
     - Tek işlem sınırı ve 24 saatlik toplam sınır
     - Zorunlu gerekçe (neden) alanı
     - Kendine / admin hesaplarına işlem yasağı
     - Her işlem denetim kaydına (adminLog) yazılır */
  const adminAdjust = useCallback(
    (key: string, delta: number, reason?: string): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const u = dbRef.current.users[key];
      if (!u) return { ok: false, error: "Oyuncu bulunamadı" };
      if (u.isAdmin || key === me.key) return { ok: false, error: "Admin hesaplarına işlem yapılamaz" };
      if (!Number.isFinite(delta) || delta === 0) return { ok: false, error: "Geçersiz tutar" };
      const amount = Math.round(delta);
      if (Math.abs(amount) > ADMIN_ADJUST_MAX) {
        return { ok: false, error: `Tek işlem sınırı: ${money(ADMIN_ADJUST_MAX)}` };
      }
      const note = (reason ?? "").trim();
      if (note.length < 3) return { ok: false, error: "İşlem gerekçesi en az 3 karakter olmalı" };

      /* 24 saatlik kümülatif sınır */
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const used =
        (dbRef.current.adminLog ?? [])
          .filter((l) => l.ts > dayAgo && l.actor === me.name)
          .reduce((a, l) => a + Math.abs(l.amount), 0) + Math.abs(amount);
      if (used > ADMIN_ADJUST_DAILY) {
        return { ok: false, error: `24 saatlik işlem sınırı: ${money(ADMIN_ADJUST_DAILY)}` };
      }

      const id = uid();
      mutate((draft) => {
        const target = draft.users[key];
        if (!target) return;
        /* Aynı cihazda/oturumda gösterim anında güncellensin diye bakiyeyi
           doğrudan değiştir; depozit "claimed" işaretlenir ki oyuncunun cihazı
           gelince TALEP üzerinden kesin olarak bir kez daha işlensin. */
        target.balance = Math.max(0, Math.round(target.balance + amount));
        draft.claimed[id] = Date.now();
        draft.deposits.unshift({
          id,
          userKey: target.key,
          userName: target.name,
          amount,
          method: amount > 0 ? "Yetkili Para Ekleme" : "Yetkili Para Silme",
          status: "approved",
          ts: Date.now(),
          decidedTs: Date.now(),
          decidedBy: ADMIN_NAME,
          reason: note,
        });
        draft.adminLog = [
          {
            id,
            actor: me.name,
            targetKey: target.key,
            targetName: target.name,
            amount,
            reason: note,
            ts: Date.now(),
          },
          ...(draft.adminLog ?? []),
        ].slice(0, 300);
      });
      return { ok: true };
    },
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

  /* ---------------- ADMIN: TÜM BAKİYELERİ SIFIRLA ---------------- */
  const resetAllMoney = useCallback(
    (reason: string): { ok: boolean; error?: string } => {
      const me = dbRef.current.users[dbRef.current.session ?? ""];
      if (!me || !me.isAdmin) return { ok: false, error: "Yetki yok" };
      const note = reason.trim();
      if (note.length < 3) return { ok: false, error: "Sıfırlama gerekçesi en az 3 karakter olmalı" };
      const total = Object.values(dbRef.current.users).reduce((a, u) => a + (u.balance ?? 0), 0);
      const ev = { id: uid(), ts: Date.now(), by: me.name, reason: note } as const;
      mutate((draft) => {
        /* olay kaydı */
        draft.moneyReset = ev;
        /* admin cihazında anında uygula — diğer cihazlara buluttan yayılır */
        Object.values(draft.users).forEach((u) => {
          u.balance = 0;
        });
        /* denetim kaydı */
        draft.adminLog = [
          {
            id: ev.id,
            actor: me.name,
            targetKey: "*",
            targetName: "TÜM OYUNCULAR",
            amount: -total,
            reason: `Toplu bakiye sıfırlama: ${note}`,
            ts: ev.ts,
          },
          ...(draft.adminLog ?? []),
        ].slice(0, 300);
      });
      pushToast({
        kind: "info",
        title: "Tüm bakiyeler sıfırlandı",
        sub: `${total} ekonomiciden çıkarıldı — ${ADMIN_NAME} dahil herkes 0$`,
      });
      return { ok: true };
    },
    [mutate, pushToast]
  );

  /* Uzak cihazlarda sıfırlamayı uygula — her cihaz kendi yerel bakiyesini sıfırlar */
  useEffect(() => {
    const ev = db.moneyReset;
    if (!ev) return;
    const key = `skyline:mreset:${ev.id}`;
    try {
      if (localStorage.getItem(key)) return;
      mutate((draft) => {
        if (!draft.moneyReset || draft.moneyReset.id !== ev.id) return;
        Object.values(draft.users).forEach((u) => {
          u.balance = 0;
        });
      });
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* yoksay */
    }
  }, [db.moneyReset, mutate]);

  const inventory = user?.inventory ?? [];
  const priceVersion = currentPriceRev();
  const inventoryValue = useMemo(
    () => inventory.reduce((acc, i) => acc + itemValue(i), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventory, priceVersion]
  );
  const stats = user?.stats ?? { opened: 0, spent: 0, bestDrop: 0 };
  const level = levelFromSpent(stats.spent);
  const xpCurrent = Math.max(0, stats.spent - xpCum(level));
  const xpNeeded = Math.max(1, xpCum(level + 1) - xpCum(level));

  const myDeposits = useMemo(
    () => (user ? db.deposits.filter((d) => d.userKey === user.key) : []),
    [db.deposits, user]
  );

  /* ---------------- HAFTANIN OYUNCUSU ---------------- */
  const weekWinner = useMemo(() => {
    const wk = weekKey();
    let best: { key: string; name: string; spent: number; opened: number } | null = null;
    Object.values(db.users).forEach((u) => {
      if (u.isAdmin || u.status !== "approved") return;
      const w = u.pub?.week?.key === wk ? u.pub.week : undefined;
      const spent = w?.spent ?? weeklyStats(u).spent;
      const opened = w?.opened ?? weeklyStats(u).opened;
      if (spent <= 0 && opened <= 0) return;
      if (
        !best ||
        spent > best.spent ||
        (spent === best.spent && opened > best.opened)
      ) {
        best = { key: u.key, name: u.name, spent, opened };
      }
    });
    /* admin sabitlemesi varsa önce o */
    if (db.weekPin?.key) {
      const pinned = db.users[db.weekPin.key];
      if (pinned && !pinned.isAdmin && pinned.status === "approved") {
        const w = pinned.pub?.week?.key === wk ? pinned.pub.week : undefined;
        const spent = w?.spent ?? weeklyStats(pinned).spent;
        const opened = w?.opened ?? weeklyStats(pinned).opened;
        return { key: pinned.key, name: pinned.name, spent, opened };
      }
    }
    return best;
  }, [db.users, db.weekPin]);

  /* ---------------- SEZON YOLU — türetilmiş durum ---------------- */
  const seasonNow = seasonOf(Date.now());
  const seasonProg: SeasonProgress =
    user?.season && user.season.id === seasonNow.id
      ? user.season
      : { id: seasonNow.id, xp: 0, premium: false, claimed: [], claimedPremium: [] };
  const seasonLevel = seasonLevelOf(seasonProg.xp);
  const seasonIntoXp = seasonInto(seasonProg.xp, seasonLevel);
  const seasonClaimable = SEASON_TIERS.filter(
    (t) => t.level <= seasonLevel && !seasonProg.claimed.includes(t.level)
  ).length;
  const seasonClaimablePrem = seasonProg.premium
    ? SEASON_TIERS.filter(
        (t) => t.level <= seasonLevel && !seasonProg.claimedPremium.includes(t.level)
      ).length
    : 0;

  const value: GameState = {
    db,
    user,
    loggedIn: !!user,
    isAdmin: !!user?.isAdmin,
    userName: user?.name ?? "",
    couponBonus: user?.couponBonus,
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
    depositPacks: db.depositPacks ?? null,
    setDepositPacks,
    coupons: db.coupons?.coupons ?? [],
    redeemCoupon,
    createCoupon,
    deactivateCoupon,
    customCases: (db.customCases ?? []).filter((x) => x.active),
    createCustomCase,
    deleteCustomCase,
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

    celebration: db.celebration ?? null,
    celebrate,
    localCelebration,
    celebrateLocal,

    autoSettings: db.settings ?? { autoApproveUsers: false, autoApproveDeposits: false, ts: 0 },
    setAutoApproval,

    /* VIP SINIFLARI */
    vipLevel: user?.vipLevel ?? 0,
    vipTier: vipTierOfLevel(user?.vipLevel ?? 0),
    vipNext: vipNextLevel(user?.vipLevel ?? 0),
    vipActive: (user?.vipLevel ?? 0) > 0,
    buyVipLevel,
    vipCashback,

    /* profil vitrini */
    showcase: (user?.showcase ?? [])
      .map((u) => inventory.find((i) => i.uid === u))
      .filter((i): i is InvItem => !!i)
      .slice(0, 3),
    toggleShowcase,

    /* jackpot */
    jackpot: db.jackpot ?? null,
    jackpotJoin,
    jackpotLeave,

    botListings,
    myListings: user?.listings ?? [],
    quickSell,
    listOnMarket,
    listAllOnMarket,
    cancelListing,
    buyListing,
    refreshMarket,

    /* gerçek oyuncu dükkanı */
    marketListings: db.marketListings ?? [],
    shopListings: (db.marketListings ?? []).filter(
      (l) => !l.removed && l.sellerKey !== (user?.key ?? "")
    ),
    buyShopListing,

    /* ---------------- SANAL DÜKKAN ---------------- */
    shopAllListings: [...(db.shopListings ?? [])].sort((a, b) => b.ts - a.ts),
    shopMyListings: (db.shopListings ?? []).filter(
      (l) => !l.removed && l.sellerKey === (user?.key ?? "")
    ),
    shopStock: user?.shopStock ?? {},
    shopMaterials: user?.shopMaterials ?? {},
    shopCustoms: user?.shopCustoms ?? [],
    shopProfile: user?.shopProfile ?? undefined,
    shopMyPayments: (db.shopPayments ?? [])
      .filter((p) => p.sellerKey === (user?.key ?? ""))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 30),
    saveShopProfile,
    buyShopStock,
    buyShopMaterial,
    craftShopProduct,
    craftShopCustom,
    listShopItem,
    unlistShopItem,
    buyShopProduct,
    claimShopPayments,

    /* ---------------- REKLAMLAR ---------------- */
    ads: (db.ads ?? []).filter((a) => !a.removed && a.active).sort((a, b) => b.ts - a.ts),
    adsAll: (db.ads ?? []).filter((a) => !a.removed).sort((a, b) => b.ts - a.ts),
    addAd,
    toggleAd,
    removeAd,

    /* ---------------- SEZON YOLU ---------------- */
    season: seasonOf(Date.now()),
    seasonProgress: seasonProg,
    seasonLevel,
    seasonIntoXp,
    seasonNeedXp: seasonLevel < SEASON_MAX_LEVEL ? seasonNeedXp(seasonLevel) : 0,
    seasonClaimable,
    seasonClaimablePrem,
    buySeasonPremium,
    claimSeasonReward,

    pendingUserList: pendingUsers(db),
    pendingDepositList: pendingDeposits(db),
    allUsers: Object.values(db.users).sort((a, b) => b.createdAt - a.createdAt),
    allDeposits: [...db.deposits].sort((a, b) => b.ts - a.ts),
    approveUser,
    rejectUser,
    approveDeposit,
    rejectDeposit,
    decideDeposit,
    respondDepositOffer,
    adminAdjust,
    adminLog: db.adminLog ?? [],
    resetAll,
    moneyReset: db.moneyReset ?? null,
    resetAllMoney,
    startSkinRaffle,

    /* global sohbet */
    chat: db.chat ?? [],
    sendChat,
    clearChat,

    /* kasa indirimi */
    caseSale: db.caseSale ?? null,
    startCaseSale,
    cancelCaseSale,

    /* skin fiyat yönetimi */
    priceSettings: db.priceSettings ?? null,
    setPriceSettings,
    skinBasePrice,
    priceVersion,

    /* ekonomik dalga */
    economyWave: db.economyWave ?? null,
    economyConfig: db.economyConfig ?? null,
    startEconomyWave,
    cancelEconomyWave,
    setEconomyConfig,
    resetEconomy,
    priceSnaps: db.priceSnaps ?? [],

    /* haftanın oyuncusu */
    weekWinner,
    weekPin: db.weekPin?.key ? db.weekPin : null,
    pinWeekWinner,
    clearWeekPin,

    /* yetkili pazar ilanı */
    adminListings: (db.marketListings ?? []).filter(
      (l) => !l.removed && l.sellerKey === (user?.key ?? "") && l.sellerName.includes("Yönetim")
    ),
    adminCreateListing,
    adminCancelListing,

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
