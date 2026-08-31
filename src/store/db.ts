import { ADMIN_NAME } from "../config";
import { isStickerItem, type InvItem } from "../data/items";
import { rollFloat } from "../data/wear";
import { hydrateCustomStickers } from "../data/custom";
import type { RarityKey } from "../data/skins";
import type { Sticker } from "../data/stickers";

export type { InvItem };

export interface Stats {
  opened: number;
  spent: number;
  bestDrop: number;
}

export type AccountStatus = "pending" | "approved" | "rejected";

/** Diğer oyunculara gösterilen genel profil (buluttan gelir) */
export interface PubProfile {
  balance: number;
  opened: number;
  invCount: number;
  /** seviye — referans ödülleri için görünür */
  level?: number;
  /** liderlik: toplam harcama */
  spent?: number;
  /** liderlik: en iyi düşüş */
  bestDrop?: number;
  /** VIP rozeti */
  vip?: boolean;
  /** profil vitrini — seçili eşyaların skin id'leri */
  showcase?: string[];
  /** haftalık istatistik (haftanın başından beri) — haftanın oyuncusu için */
  week?: { key: string; spent: number; opened: number };
  ts: number;
}

/** Kasa açılış kaydı — geçmiş + Provably Fair doğrulama için */
export interface RollLog {
  ts: number;
  caseId: string;
  caseName: string;
  skinId: string;
  skinName: string;
  rarity: string;
  price: number;
  value: number;
  float?: number;
  seed: string;
  nonce: number;
  forced?: boolean;
}

export interface MyListing {
  id: string;
  skinId: string;
  price: number;
  ts: number;
  float?: number;
  stickers?: string[];
  /** ilan anındaki gerçek değer (aşınma + sticker dahil) */
  baseValue?: number;
  /** toptan paket: kopya sayısı */
  qty?: number;
  /** toptan paket: kopya başına float/sticker */
  copies?: ShopCopy[];
}

/** Bir kopyanın detayı (float + sticker) */
export interface ShopCopy {
  float?: number;
  stickers?: string[];
}

/** Gerçek oyuncu dükkan ilanı — MQTT ile diğer oyunculara da yayınlanır */
export interface MarketListing {
  id: string;
  sellerKey: string;
  sellerName: string;
  skinId: string;
  /** birim fiyat (taban) */
  unitPrice: number;
  /** kalan adet */
  qty: number;
  /** kalan kopyalar */
  copies: ShopCopy[];
  /** ilan anındaki birim değeri */
  baseValue: number;
  ts: number;
  /** iptal / tükenmiş — diğer cihazlara yayılır */
  removed?: boolean;
}

/** Gerçek oyuncu satın alımı — satıcının bakiyesini doldurmak için kayıt */
export interface MarketPayment {
  id: string;
  listingId: string;
  sellerKey: string;
  sellerName: string;
  buyerKey: string;
  buyerName: string;
  qty: number;
  /** alıcının ödediği (brüt) */
  gross: number;
  /** satıcıya kalan (komisyon sonrası) */
  net: number;
  ts: number;
}

export interface MissionProgress {
  day: string;
  cases: number;
  upgrades: number;
  battles: number;
  sales: number;
  games: number;
  wagered: number;
  claimed: string[];
}

export function emptyMissions(day: string): MissionProgress {
  return { day, cases: 0, upgrades: 0, battles: 0, sales: 0, games: 0, wagered: 0, claimed: [] };
}

export interface Account {
  key: string;
  name: string;
  isAdmin: boolean;
  status: AccountStatus;
  balance: number;
  inventory: InvItem[];
  stats: Stats;
  lastDaily: number | null;
  nonce: number;
  createdAt: number;
  pub?: PubProfile;
  /** pazarda satışa koyduğu eşyalar */
  listings?: MyListing[];
  /** günlük görev ilerlemesi */
  missions?: MissionProgress;
  /** kullanıcının tasarladığı stickerlar */
  customStickers?: Sticker[];
  /** referans: bu hesabın davet kodu (kendi nick key'i) */
  referralCode?: string;
  /** referans: kim tarafından davet edildi (davet edenin key'i) */
  referredBy?: string;
  referredByName?: string;
  /** referans: seviye 5 ödülü davet edene ödendi mi */
  refRewarded?: boolean;
  refRewardedAt?: number;
  /** kasa açılış geçmişi (son 400) */
  rollLogs?: RollLog[];
  /** pity sayacı — caseId → açılış sayısı */
  pity?: Record<string, number>;
  /** kazanılan başarım id'leri */
  ach?: string[];
  /** VIP üyeliği — bitiş zamanı */
  vipUntil?: number;
  /** VIP paket id'si (sadece görüntü) */
  vipPlan?: string;
  /** profil vitrini — seçilen envanter uid'leri (en fazla 3) */
  showcase?: string[];
  /** jackpot kazançlarının ödendiği tur numaraları (çift ödeme koruması) */
  jpPaid?: number[];
  /** haftalık istatistik tabanı — hafta değişince sıfırlanır */
  weekBase?: { key: string; spent: number; opened: number };
}

export type ReqStatus = "pending" | "approved" | "rejected";

export type ReqKind = "deposit" | "withdraw";

export interface DepositReq {
  id: string;
  userKey: string;
  userName: string;
  amount: number;
  method: string;
  status: ReqStatus;
  ts: number;
  decidedTs?: number;
  decidedBy?: string;
  reason?: string;
  /** talep türü — yoksa yatırma sayılır (eski kayıt uyumu) */
  kind?: ReqKind;
  /** çekimde para talep anında bloke edildi mi */
  held?: boolean;
  /** ödemenin yapılacağı hesap/nick bilgisi */
  payTo?: string;
  /** yetkili skin hediyesi — claim edilince envantere eklenir */
  skinId?: string;
  skinName?: string;
  /** hediye seçenekleri: aşınma + sticker */
  skinOpts?: { float?: number; stickers?: string[] };
  /** yatırma paketi bonusu (%) — talep anında paketten hesaplanır */
  bonus?: number;
  /** talep anında sabitlenen hediyeler (kasa/skin) */
  gifts?: DepositPackGift[];
}

/* ---------------- YATIRMA PAKETLERİ ---------------- */

/** Paket hediyesi: kasa (onayda otomatik açılır) veya skin (envantere düşer) */
export interface DepositPackGift {
  kind: "case" | "skin";
  /** kasa id veya skin id */
  id: string;
  /** kasa adedi (skin için 1) */
  count: number;
}

/** Paket: belirli tutarda yatırma = üstüne % bonus (avantajlı paket) */
export interface DepositPack {
  amount: number;
  /** onaylanınca yüklenen tutar: amount + amount*bonus/100 */
  bonus: number;
  /** yanında verilen hediyeler (kasa otomatik açılır) */
  gifts?: DepositPackGift[];
}

/** Admin'in düzenlediği paket listesi — en yeni ts kazanır */
export interface DepositPackSettings {
  ts: number;
  by: string;
  packs: DepositPack[];
}

/** Varsayılan paketler — büyük paket daha avantajlı */
export const DEFAULT_DEPOSIT_PACKS: DepositPack[] = [
  { amount: 1000, bonus: 0 },
  { amount: 5000, bonus: 5 },
  { amount: 10000, bonus: 10 },
  { amount: 25000, bonus: 20 },
  { amount: 50000, bonus: 30, gifts: [{ kind: "case", id: "gift", count: 1 }] },
  { amount: 100000, bonus: 50, gifts: [{ kind: "case", id: "vault", count: 1 }] },
  { amount: 120000, bonus: 50, gifts: [{ kind: "case", id: "gallery", count: 1 }] },
  { amount: 250000, bonus: 75, gifts: [{ kind: "case", id: "vault", count: 2 }] },
  { amount: 500000, bonus: 100, gifts: [{ kind: "case", id: "knife-case", count: 1 }] },
];

/* ---------------- ETKİNLİK / ÇEKİLİŞ / DUYURU ---------------- */

export interface Announcement {
  text: string;
  ts: number;
  author: string;
}

export interface RaffleState {
  id: string;
  prize: number;
  endsAt: number;
  startedBy: string;
  drawn?: boolean;
  cancelled?: boolean;
  winner?: { key: string; name: string; ts: number };
  participants?: Record<string, { name: string; ts: number }>;
  /** skin çekilişi — varsa ödül para değil, bu skin olur */
  skinId?: string;
  skinName?: string;
  skinOpts?: { float?: number; stickers?: string[] };
}

/** Admin'in başlattığı toplu bakiye sıfırlama — tüm cihazlara yayılır (ts bazlı) */
export interface MoneyReset {
  id: string;
  ts: number;
  by: string;
  reason: string;
}

/* ---------------- GLOBAL SOHBET ---------------- */

export interface ChatMsg {
  id: string;
  user: string;
  key: string;
  text: string;
  level: number;
  ts: number;
  admin?: boolean;
}

/** Sohbet temizleme damgası — daha eski mesajlar hiçbir cihazda gösterilmez */
export interface ChatReset {
  ts: number;
  by: string;
}

/* ---------------- KASA İNDİRİMİ ETKİNLİĞİ ---------------- */

export interface CaseSale {
  id: string;
  caseIds: string[];
  /** yüzde indirim: 50 = %50 indirim */
  discount: number;
  endsAt: number;
  startedBy: string;
  ts: number;
  cancelled?: boolean;
}

/* ---------------- SKİN FİYAT YÖNETİMİ ---------------- */

/** Yüzde çarpanı: 100 = normal, 150 = +%50 zam, 50 = %50 indirim */
export interface PriceSettings {
  ts: number;
  by: string;
  global?: number;
  byRarity?: Partial<Record<RarityKey, number>>;
  bySkin?: Record<string, number>;
}

/** Fiyat geçmişi karesi — fiyatı etkileyen her olayda bir kayıt düşer.
 *  Dalga eğrisi deterministik olduğu için geçmiş fiyat sonradan yeniden
 *  kurulabilir: ORIG × global × nadirlik × skin × waveMultiplierAt(t). */
export interface PriceSnap {
  id: string;
  ts: number;
  by: string;
  note?: string;
  global?: number;
  byRarity?: Partial<Record<RarityKey, number>>;
  bySkin?: Record<string, number>;
  /** o anki dalga (tepede değil, tam tanımı) — yoksa null */
  wave?: EconomyWave | null;
}

/* ---------------- HAFTANIN OYUNCUSU (admin override) ---------------- */

export interface WeekPin {
  key: string;
  name: string;
  ts: number;
  by: string;
}

/* ---------------- EKONOMİK DALGA ---------------- */

/** Dalga yönü: up = fiyatlar yükselir, down = çöküş (fiyatlar düşer) */
export type WaveDirection = "up" | "down";

/** Aktif ekonomik dalga — skin/pazar/kasa fiyatları geçici yükselir/düşer */
export interface EconomyWave {
  id: string;
  ts: number;
  by: string;
  /** dalga gücü: 50 = %50 artış (up) veya düşüş (down) */
  surge: number;
  /** covert/rare skinlerde ekstra ivme (% 0-1000) */
  rareBoost: number;
  endsAt: number;
  direction?: WaveDirection;
  /** bitince yeni seviye kalıcı olarak kalsın (fiyat ayarlarına işlenir) */
  permanent?: boolean;
  /** yumuşak geçiş: kaç dakikada tepe noktasına ulaşır (0 = anında) */
  fadeInMin?: number;
  /** bitişten sonra kaç dakikada normale döner (0 = anında) */
  fadeOutMin?: number;
  cancelled?: boolean;
}

/** Otomatik dalga ayarları — admin belirler: sıklık, güç, süre */
export interface EconomyConfig {
  enabled: boolean;
  /** dakika: 0 = sadece manuel, 1-1440 arası otomatik aralık */
  intervalMin: number;
  surge: number;
  rareBoost: number;
  durationMin: number;
  /** otomatik dalga yönü: up / down / mix (karışık) */
  direction?: "up" | "down" | "mix";
  /** bitince: temp = normale dön, perm = yeni seviye kalıcı kalsın */
  after?: "temp" | "perm";
  /** yumuşak geçiş süresi (dakika): 0 = anında */
  fadeMin?: number;
  /** son otomatik dalga zamanı */
  lastAt?: number;
  ts: number;
  by: string;
}

export interface FirstLoginEvent {
  active: boolean;
  reward: number;
  day: string;
  ts: number;
  startedBy: string;
  winner?: { key: string; name: string; ts: number };
}

/** Admin'in otomatik kabul ayarları — en son değişiklik (ts) kazanır */
export interface AutoSettings {
  autoApproveUsers: boolean;
  autoApproveDeposits: boolean;
  ts: number;
}

/** Admin bakiye işlem kaydı — kötüye kullanım denetimi için */
export interface AdminLogEntry {
  id: string;
  actor: string;
  targetKey: string;
  targetName: string;
  amount: number;
  reason: string;
  ts: number;
}

/** Site geneli kutlama — tüm cihazlara yayınlanır */
export interface Celebration {
  text: string;
  ts: number;
  by: string;
}

/* ---------------- JACKPOT ---------------- */

/** Potta bulunan bir eşya (skin + aşınma + sticker değeri) */
export interface JackpotItem {
  skinId: string;
  float?: number;
  stickers?: string[];
  value: number;
}

/** Pot katılımcısı */
export interface JackpotEntry {
  id: string;
  name: string;
  /** gerçek kullanıcı key'i — botlarda yok */
  userId?: string;
  /** bot katılımcı mı */
  bot?: boolean;
  /** bu cihazın kullanıcısı mı (yerel görünüm) */
  me?: boolean;
  /** pottan çıkıldı (senkron tombstone) */
  left?: boolean;
  items: JackpotItem[];
  total: number;
}

export interface JackpotHistoryEntry {
  id: string;
  name: string;
  userId?: string;
  bot?: boolean;
  me?: boolean;
  value: number;
  ts: number;
}

/** Kazanan kaydı */
export interface JackpotWinner {
  name: string;
  userId?: string;
  bot?: boolean;
  me?: boolean;
  value: number;
  ts: number;
  /** çekilişin yapıldığı cihaz — kazananı belirleme hakkı */
  drawnBy?: string;
  /** çekilişe katılan giriş sayısı — eksik senkronu tespit etmek için */
  entriesCount?: number;
}

/** Biten bir turun kazancı — kazanan cihazı geç gelse bile ödeme yapılabilir */
export interface JackpotSettledRound {
  round: number;
  entries: JackpotEntry[];
  winner: JackpotWinner;
}

/** Canlı jackpot turu — tüm cihazlarla buluttan paylaşılır */
export interface JackpotState {
  round: number;
  endsAt: number;
  nextStartAt?: number;
  entries: JackpotEntry[];
  winner?: JackpotWinner | null;
  history: JackpotHistoryEntry[];
  /** son biten turlar (çevrimdışı cihazlar için kazanç emaneti) */
  settled?: JackpotSettledRound[];
}

export interface DB {
  users: Record<string, Account>;
  deposits: DepositReq[];
  session: string | null;
  /** hangi onaylanmış talepler bu cihazda bakiyeye işlendi */
  claimed: Record<string, number>;
  /** admin duyurusu — tüm cihazlara yayınlanır */
  announcement?: Announcement | null;
  /** otomatik çekiliş durumu */
  raffle?: RaffleState | null;
  /** günün ilk giriş ödülü etkinliği */
  firstLogin?: FirstLoginEvent | null;
  /** admin otomatik kabul ayarları */
  settings?: AutoSettings;
  /** gerçek oyuncu dükkanı — tüm cihazlarla senkronlanır */
  marketListings?: MarketListing[];
  /** gerçek oyuncu satış kayıtları — satıcı bakiyesini telafi eder */
  marketPayments?: MarketPayment[];
  /** bu cihazda bakiyeye işlenen satış kayıtları */
  claimedMarket?: Record<string, number>;
  /** admin bakiye işlem denetim kaydı (yerel) */
  adminLog?: AdminLogEntry[];
  /** site geneli kutlama */
  celebration?: Celebration | null;
  /** canlı jackpot */
  jackpot?: JackpotState | null;
  /** toplu bakiye sıfırlama olayı — en yeni ts kazanır */
  moneyReset?: MoneyReset | null;
  /** global sohbet — tüm cihazlara yayılır */
  chat?: ChatMsg[];
  /** sohbet temizleme damgası */
  chatReset?: ChatReset | null;
  /** kasa indirimi etkinliği */
  caseSale?: CaseSale | null;
  /** skin fiyat çarpanı ayarları */
  priceSettings?: PriceSettings | null;
  /** admin'in haftanın oyuncusunu sabitlemesi (override) */
  weekPin?: WeekPin | null;
  /** aktif ekonomik dalga — en yeni ts kazanır */
  economyWave?: EconomyWave | null;
  /** otomatik dalga ayarları — en yeni ts kazanır */
  economyConfig?: EconomyConfig | null;
  /** fiyat geçmişi kareleri — id ile birleştirilir, son 300 tutulur */
  priceSnaps?: PriceSnap[];
  /** yatırma paketleri (bonuslu) — en yeni ts kazanır */
  depositPacks?: DepositPackSettings | null;
}

const LS_KEY = "skyline:v1";
const SYNC_URL_KEY = "skyline:sync:url";

export function emptyDB(): DB {
  return {
    users: {},
    deposits: [],
    session: null,
    claimed: {},
    announcement: null,
    raffle: null,
    firstLogin: null,
    settings: { autoApproveUsers: false, autoApproveDeposits: false, ts: 0 },
    marketListings: [],
    marketPayments: [],
    claimedMarket: {},
    adminLog: [],
    celebration: null,
    jackpot: null,
    moneyReset: null,
    chat: [],
    chatReset: null,
    caseSale: null,
    priceSettings: null,
    weekPin: null,
    economyWave: null,
    economyConfig: null,
    priceSnaps: [],
    depositPacks: null,
  };
}

export function normKey(name: string): string {
  return name.trim().toLowerCase();
}

export function isAdminName(name: string): boolean {
  return normKey(name) === normKey(ADMIN_NAME);
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw) as DB & { seen?: Record<string, number> };
    const db: DB = {
      users: parsed.users ?? {},
      deposits: parsed.deposits ?? [],
      session: parsed.session ?? null,
      claimed: parsed.claimed ?? parsed.seen ?? {},
      announcement: parsed.announcement ?? null,
      raffle: parsed.raffle ?? null,
      firstLogin: parsed.firstLogin ?? null,
      settings: parsed.settings ?? { autoApproveUsers: false, autoApproveDeposits: false, ts: 0 },
      marketListings: parsed.marketListings ?? [],
      marketPayments: parsed.marketPayments ?? [],
      claimedMarket: parsed.claimedMarket ?? {},
      adminLog: parsed.adminLog ?? [],
      celebration: parsed.celebration ?? null,
      jackpot: parsed.jackpot ?? null,
      moneyReset: parsed.moneyReset ?? null,
      chat: Array.isArray(parsed.chat) ? parsed.chat : [],
      chatReset: parsed.chatReset ?? null,
      caseSale: parsed.caseSale ?? null,
      priceSettings: parsed.priceSettings ?? null,
      weekPin: parsed.weekPin ?? null,
      economyWave: parsed.economyWave ?? null,
      economyConfig: parsed.economyConfig ?? null,
      priceSnaps: Array.isArray(parsed.priceSnaps) ? [...parsed.priceSnaps] : [],
      depositPacks: parsed.depositPacks ?? null,
    };

    /* Kayıtlar korunur — hiçbir bakiye/envanter otomatik silinmez.
       Yalnızca eski sürümün otomatik başlangıç bonusu bir daha uygulanmaz. */
    db.deposits
      .filter((d) => d.method === "Başlangıç Bonusu")
      .forEach((d) => {
        db.claimed[d.id] = db.claimed[d.id] ?? Date.now();
      });

    /* --- GÜVENLİ GÖÇ: hiçbir veri silinmez, yalnızca eksikler tamamlanır --- */
    Object.values(db.users).forEach((u) => {
      if (!Array.isArray(u.inventory)) u.inventory = [];
      if (!Array.isArray(u.listings)) u.listings = [];
      if (!Array.isArray(u.rollLogs)) u.rollLogs = [];
      if (!Array.isArray(u.ach)) u.ach = [];
      if (!u.pity) u.pity = {};
      if (!u.stats) u.stats = { opened: 0, spent: 0, bestDrop: 0 };
      if (typeof u.balance !== "number" || Number.isNaN(u.balance)) u.balance = 0;

      /* özel stickerları yeniden kaydet (envanterde görünsünler) */
      hydrateCustomStickers(u.customStickers);

      /* eski eşyalara aşınma değeri ver (sticker'lar hariç) */
      u.inventory.forEach((it) => {
        if (!it.uid) it.uid = Math.random().toString(36).slice(2, 10);
        if (!it.ts) it.ts = Date.now();
        if (typeof it.float !== "number" && !isStickerItem(it.skinId)) {
          it.float = rollFloat();
        }
      });

      /* önbellekten kalan "gen-*" ön ekli eski prosedürel skinleri temizle */
      u.inventory = u.inventory.filter((it) => !it.skinId.startsWith("gen-"));

      /* rollLogs çok eski kayıtları temizle (dizi en yeni → en eski sıralı) */
      if (u.rollLogs.length > 400) u.rollLogs = u.rollLogs.slice(0, 400);
    });

    return db;
  } catch {
    return emptyDB();
  }
}

export function saveDB(db: DB) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {
    /* yoksay */
  }
}

export function newAccount(name: string, ref?: { code: string; name: string }): Account {
  const admin = isAdminName(name);
  const key = normKey(name);
  const codeOk = !!ref?.code && ref.code.trim().length >= 3 && normKey(ref.code) !== key;
  return {
    key,
    name: admin ? ADMIN_NAME : name.trim(),
    isAdmin: admin,
    status: admin ? "approved" : "pending",
    balance: 0,
    inventory: [],
    stats: { opened: 0, spent: 0, bestDrop: 0 },
    lastDaily: null,
    nonce: 1000 + Math.floor(Math.random() * 500),
    createdAt: Date.now(),
    listings: [],
    referralCode: key,
    referredBy: codeOk ? normKey(ref!.code) : undefined,
    referredByName: codeOk ? ref!.name.trim() : undefined,
  };
}

export function currentUser(db: DB): Account | null {
  if (!db.session) return null;
  return db.users[db.session] ?? null;
}

export function pendingUsers(db: DB): Account[] {
  return Object.values(db.users)
    .filter((u) => u.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function pendingDeposits(db: DB): DepositReq[] {
  return db.deposits.filter((d) => d.status === "pending").sort((a, b) => a.ts - b.ts);
}

export function isWithdraw(d: DepositReq): boolean {
  return d.kind === "withdraw";
}

/* ---------------- senkron URL ayarı ---------------- */
export function getSyncUrl(): string | null {
  try {
    const u = localStorage.getItem(SYNC_URL_KEY);
    return u && u.trim().length > 8 ? u.trim() : null;
  } catch {
    return null;
  }
}

export function setSyncUrlLS(url: string | null) {
  try {
    if (url && url.trim()) localStorage.setItem(SYNC_URL_KEY, url.trim());
    else localStorage.removeItem(SYNC_URL_KEY);
  } catch {
    /* yoksay */
  }
}

/* ---------------- sunucu kodu (kolay senkron) ---------------- */
const SYNC_CODE_KEY = "skyline:sync:code";

export function getSyncCode(): string | null {
  try {
    const c = localStorage.getItem(SYNC_CODE_KEY);
    return c && c.trim().length >= 4 ? c.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function setSyncCodeLS(code: string | null) {
  try {
    if (code && code.trim().length >= 4) localStorage.setItem(SYNC_CODE_KEY, code.trim().toUpperCase());
    else localStorage.removeItem(SYNC_CODE_KEY);
  } catch {
    /* yoksay */
  }
}
