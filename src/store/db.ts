import { ADMIN_NAME } from "../config";
import { isStickerItem, type InvItem } from "../data/items";
import { rollFloat } from "../data/wear";
import { hydrateCustomStickers } from "../data/custom";
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
  ts: number;
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
}

export interface DB {
  users: Record<string, Account>;
  deposits: DepositReq[];
  session: string | null;
  /** hangi onaylanmış talepler bu cihazda bakiyeye işlendi */
  claimed: Record<string, number>;
}

const LS_KEY = "skyline:v1";
const SYNC_URL_KEY = "skyline:sync:url";

export function emptyDB(): DB {
  return { users: {}, deposits: [], session: null, claimed: {} };
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
