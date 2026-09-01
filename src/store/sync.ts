import { jackpotSchedule } from "../config";
import {
  isAdminName,
  type Account,
  type DB,
  type DepositReq,
  type JackpotSettledRound,
  type JackpotState,
  type MarketListing,
  type MarketPayment,
  type PriceSnap,
  type ShopListing,
  type ShopPayment,
  type DepositPackSettings,
  type CouponSettings,
  type CustomCase,
} from "./db";

/* -------------------------------------------------------------
   Hafif bulut senkronu — herhangi bir GET/PUT JSON ucuyla çalışır
   (ör. npoint.io). Belge: { v, users, deposits }
   Talepler ve üyelik durumları paylaşılır; bakiye ve envanter
   her oyuncunun kendi cihazında kalır (onaylanan talepler
   oyuncunun cihazında bakiyeye işlenir).
------------------------------------------------------------- */

export type SyncStatus = "off" | "busy" | "ok" | "error";

interface CloudUser {
  key: string;
  name: string;
  status: Account["status"];
  createdAt: number;
  pub?: Account["pub"];
  /** referans: bu hesap kimin davetiyle açıldı */
  refTo?: string;
}

export interface CloudDoc {
  v: 1;
  users: Record<string, CloudUser>;
  deposits: DepositReq[];
  announcement?: DB["announcement"];
  raffle?: DB["raffle"];
  firstLogin?: DB["firstLogin"];
  settings?: DB["settings"];
  /** gerçek oyuncu dükkanı — tüm cihazlarla paylaşılır */
  market?: MarketListing[];
  marketPayments?: MarketPayment[];
  /** site geneli kutlama — en yeni ts kazanır */
  celebration?: DB["celebration"];
  /** canlı jackpot — herkes aynı potu görür */
  jackpot?: JackpotState | null;
  /** toplu bakiye sıfırlama — en yeni ts kazanır */
  moneyReset?: DB["moneyReset"];
  /** global sohbet */
  chat?: DB["chat"];
  chatReset?: DB["chatReset"];
  /** kasa indirimi — en yeni ts kazanır */
  caseSale?: DB["caseSale"];
  /** fiyat ayarları — en yeni ts kazanır */
  priceSettings?: DB["priceSettings"];
  /** haftanın oyuncusu admin sabitlemesi — en yeni ts kazanır */
  weekPin?: DB["weekPin"];
  /** ekonomik dalga — en yeni ts kazanır */
  economyWave?: DB["economyWave"];
  /** otomatik dalga ayarları — en yeni ts kazanır */
  economyConfig?: DB["economyConfig"];
  /** fiyat geçmişi kareleri — id ile birleştirilir */
  priceSnaps?: PriceSnap[];
  /** yatırma paketleri — en yeni ts kazanır */
  depositPacks?: DepositPackSettings;
  /** kuponlar — en yeni ts kazanır */
  coupons?: CouponSettings;
  /** admin özel kasaları — id birleşimi */
  customCases?: CustomCase[];
  /** sanal dükkan ilanları — tüm cihazlara yayınlanır */
  shop?: ShopListing[];
  /** sanal dükkan satış kayıtları — id birleşimi */
  shopPayments?: ShopPayment[];
  /** bot müşteri son turu — tek elden üretim damgası */
  shopBotAt?: number;
}

export function toCloudDoc(db: DB): CloudDoc {
  const users: Record<string, CloudUser> = {};
  Object.values(db.users).forEach((u) => {
    users[u.key] = {
      key: u.key,
      name: u.name,
      status: u.status,
      createdAt: u.createdAt,
      pub: u.pub,
      refTo: u.referredBy,
    };
  });
  return {
    v: 1,
    users,
    deposits: [...db.deposits].sort((a, b) => a.ts - b.ts),
    announcement: db.announcement ?? undefined,
    raffle: db.raffle ?? undefined,
    firstLogin: db.firstLogin ?? undefined,
    settings: db.settings ?? undefined,
    market: (db.marketListings ?? [])
      .filter((l) => !l.removed || Date.now() - l.ts < 3 * 24 * 3600 * 1000)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 300),
    marketPayments: [...(db.marketPayments ?? [])]
      .sort((a, b) => a.ts - b.ts)
      .slice(-400),
    celebration: db.celebration ?? undefined,
    /* jackpot: yerel görünüm bayrakları (me) kaldırılır — userId esas alınır */
    jackpot: db.jackpot ? jackpotToCloud(db.jackpot) : null,
    moneyReset: db.moneyReset ?? undefined,
    chat: (db.chat ?? []).slice(-200),
    chatReset: db.chatReset ?? undefined,
    caseSale: db.caseSale ?? undefined,
    priceSettings: db.priceSettings ?? undefined,
    weekPin: db.weekPin ?? undefined,
    economyWave: db.economyWave ?? undefined,
    economyConfig: db.economyConfig ?? undefined,
    priceSnaps: [...(db.priceSnaps ?? [])].sort((a, b) => a.ts - b.ts).slice(-300),
    depositPacks: db.depositPacks ?? undefined,
    coupons: db.coupons ?? undefined,
    customCases: [...(db.customCases ?? [])].slice(-100),
    shop: (db.shopListings ?? [])
      .filter((l) => !l.removed || Date.now() - l.ts < 3 * 24 * 3600 * 1000)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 300),
    shopPayments: [...(db.shopPayments ?? [])].sort((a, b) => a.ts - b.ts).slice(-400),
    shopBotAt: db.shopBotAt,
  };
}

/** me bayrakları cihaza özeldir — bulut yalnızca userId/bot bilgisi taşır */
function jackpotToCloud(jp: JackpotState): JackpotState {
  const strip = <T extends { me?: boolean }>(x: T): T => {
    const { me: _me, ...rest } = x;
    return rest as T;
  };
  return {
    ...jp,
    entries: jp.entries.map(strip),
    winner: jp.winner ? strip(jp.winner) : jp.winner,
    history: (jp.history ?? []).map((h) => {
      const { me: _m, ...rest } = h;
      return rest;
    }),
    settled: (jp.settled ?? []).map((s) => ({
      round: s.round,
      entries: s.entries.map(strip),
      winner: strip(s.winner),
    })),
  };
}

const RANK: Record<string, number> = { pending: 0, approved: 1, rejected: 1 };

/** Bulut belgesini yerel veriyle birleştirir */
export function mergeCloud(local: DB, cloud: CloudDoc): DB {
  const out: DB = {
    /* kullanıcıları derin kopyala — referans paylaşımı değişikliği gizlerdi */
    users: Object.fromEntries(
      Object.entries(local.users).map(([k, v]) => [k, { ...v, stats: { ...v.stats } }])
    ),
    deposits: [...local.deposits],
    session: local.session,
    claimed: { ...local.claimed },
    settings: local.settings,
    /* etkinlik alanlarını yerelden başlat — silme/iptal (ts) bulutun eski halinden önce gelir */
    announcement: local.announcement,
    raffle: local.raffle,
    firstLogin: local.firstLogin,
    /* pazar: kimliğe göre birleş — en yeni durum (removed dahil) kazanır */
    marketListings: mergeMarket(local.marketListings ?? [], cloud.market ?? []),
    marketPayments: mergeById(local.marketPayments ?? [], cloud.marketPayments ?? []),
    claimedMarket: local.claimedMarket ?? {},
    /* sanal dükkan: ilanlar pazar gibi id birleşimi; ödemeler günlük */
    shopListings: mergeMarket(local.shopListings ?? [], cloud.shop ?? []),
    shopPayments: mergeById(local.shopPayments ?? [], cloud.shopPayments ?? []),
    claimedShop: local.claimedShop ?? {},
    /* jackpot yerel tur durumu — bulut yalnızca meta paylaşır (durum korunur) */
    jackpot: local.jackpot,
    chat: [...(local.chat ?? [])].slice(-200),
    chatReset: local.chatReset,
    caseSale: local.caseSale,
    priceSettings: local.priceSettings,
    weekPin: local.weekPin,
    economyWave: local.economyWave,
    economyConfig: local.economyConfig,
    priceSnaps: [...(local.priceSnaps ?? [])],
    depositPacks: local.depositPacks,
    coupons: local.coupons,
    customCases: [...(local.customCases ?? [])],
  };

  /* kullanıcılar */
  Object.values(cloud.users ?? {}).forEach((cu) => {
    if (!cu || !cu.key) return;
    const lu = out.users[cu.key];
    if (!lu) {
      out.users[cu.key] = {
        key: cu.key,
        name: cu.name,
        isAdmin: isAdminName(cu.name),
        status: cu.status,
        balance: 0,
        inventory: [],
        stats: { opened: 0, spent: 0, bestDrop: 0 },
        lastDaily: null,
        nonce: 1000 + Math.floor(Math.random() * 500),
        createdAt: cu.createdAt ?? Date.now(),
        pub: cu.pub,
        referredBy: cu.refTo,
        referredByName: cu.refTo ? cu.name : undefined,
        referralCode: cu.key,
      };
    } else {
      /* durum: pending → approved/rejected tek yönlü ilerler */
      if ((RANK[cu.status] ?? 0) > (RANK[lu.status] ?? 0)) lu.status = cu.status;
      if (cu.createdAt && cu.createdAt < lu.createdAt) lu.createdAt = cu.createdAt;
      if (cu.pub && (!lu.pub || cu.pub.ts > lu.pub.ts)) lu.pub = cu.pub;
      if (cu.refTo && !lu.referredBy) {
        lu.referredBy = cu.refTo;
        lu.referredByName = cu.name;
      }
      if (!lu.referralCode) lu.referralCode = cu.key;
    }
  });

  /* talepler — kimliğe göre birleş, kararlı hali koru */
  const map = new Map<string, DepositReq>();
  out.deposits.forEach((d) => map.set(d.id, d));
  (cloud.deposits ?? []).forEach((cd) => {
    const ld = map.get(cd.id);
    if (!ld) {
      map.set(cd.id, cd);
    } else if (ld.status === "pending" && cd.status !== "pending") {
      map.set(cd.id, cd);
    } else if (ld.status === "pending" && cd.status === "pending") {
      /* karşı teklif: bulut daha yeni teklif taşıyorsa yereldeki talebe işle */
      if (cd.offerTs && (!ld.offerTs || cd.offerTs > ld.offerTs)) {
        map.set(cd.id, { ...ld, ...cd, status: "pending" });
      }
    }
  });
  out.deposits = [...map.values()].sort((a, b) => a.ts - b.ts);

  /* etkinlik alanları — en yeni (ts) olan kazanır; yerel silme de dikkate alınır */
  if (cloud.announcement && (!out.announcement || cloud.announcement.ts > out.announcement.ts))
    out.announcement = cloud.announcement;
  else if (!cloud.announcement && !out.announcement) out.announcement = undefined;

  if (cloud.raffle?.cancelled) {
    /* iptal her yerde geçerli — kimin yerel kopyası olursa olsun */
    out.raffle = { ...cloud.raffle };
  } else if (cloud.raffle && (!out.raffle || cloud.raffle.id !== out.raffle.id)) {
    /* FARKLI çekilişler: sonuçlanmış olan kazanır; ikisi de açıksa daha yeni
       başlayan geçerli. Eski çekilişin katılımcıları yenisine asla sızmaz. */
    const c = cloud.raffle;
    const l = out.raffle;
    const preferCloud = c.drawn && !l?.drawn ? true : !c.drawn && l?.drawn ? false : c.endsAt > (l?.endsAt ?? 0);
    if (!l || preferCloud) out.raffle = c;
  } else if (out.raffle && cloud.raffle) {
    /* AYNI çekiliş (aynı id): katılımcıları birleştir, TEK kazananı koru */
    const mine = out.raffle;
    const theirs = cloud.raffle;
    if (theirs.id === mine.id) {
      mine.participants = { ...(theirs.participants ?? {}), ...(mine.participants ?? {}) };
      if (!mine.winner && theirs.winner) mine.winner = theirs.winner;
      else if (theirs.winner && mine.winner && (theirs.winner.ts ?? 0) < (mine.winner.ts ?? 0))
        mine.winner = theirs.winner;
      if (theirs.drawn) mine.drawn = true;
    }
  }

  if (cloud.firstLogin && (!out.firstLogin || cloud.firstLogin.ts > out.firstLogin.ts))
    out.firstLogin = cloud.firstLogin;
  else if (!cloud.firstLogin && local.firstLogin) out.firstLogin = local.firstLogin;

  /* otomatik kabul ayarları — en yeni değişiklik kazanır */
  if (cloud.settings && (!out.settings || cloud.settings.ts >= out.settings.ts))
    out.settings = cloud.settings;
  else if (!cloud.settings && local.settings) out.settings = local.settings;

  /* kutlama — en yeni ts kazanır */
  if (cloud.celebration && (!out.celebration || cloud.celebration.ts > out.celebration.ts))
    out.celebration = cloud.celebration;
  else if (!cloud.celebration && !out.celebration) out.celebration = undefined;

  /* toplu bakiye sıfırlama — en yeni olay her yerde geçerli */
  if (cloud.moneyReset && (!out.moneyReset || cloud.moneyReset.ts > out.moneyReset.ts))
    out.moneyReset = cloud.moneyReset;
  else if (!cloud.moneyReset && !out.moneyReset) out.moneyReset = undefined;

  /* global sohbet — id birleşimi + temizleme damgası */
  if (cloud.chatReset && (!out.chatReset || cloud.chatReset.ts > out.chatReset.ts))
    out.chatReset = cloud.chatReset;
  else if (!cloud.chatReset && !out.chatReset) out.chatReset = undefined;
  const since = out.chatReset?.ts ?? 0;
  const cmap = new Map<string, NonNullable<DB["chat"]>[number]>();
  [...(local.chat ?? []), ...(cloud.chat ?? [])]
    .filter((m) => m && m.ts > since)
    .forEach((m) => {
      if (!cmap.has(m.id)) cmap.set(m.id, m);
    });
  out.chat = [...cmap.values()].sort((a, b) => a.ts - b.ts).slice(-200);

  /* kasa indirimi — en yeni ts kazanır (iptal de taşınır) */
  if (cloud.caseSale && (!out.caseSale || cloud.caseSale.ts > out.caseSale.ts))
    out.caseSale = cloud.caseSale;
  else if (!cloud.caseSale && !out.caseSale) out.caseSale = undefined;

  /* fiyat ayarları — en yeni ts kazanır */
  if (cloud.priceSettings && (!out.priceSettings || cloud.priceSettings.ts > out.priceSettings.ts))
    out.priceSettings = cloud.priceSettings;
  else if (!cloud.priceSettings && !out.priceSettings) out.priceSettings = undefined;

  /* haftanın oyuncusu sabitlemesi — en yeni ts kazanır */
  if (cloud.weekPin && (!out.weekPin || cloud.weekPin.ts > out.weekPin.ts))
    out.weekPin = cloud.weekPin;
  else if (!cloud.weekPin && !out.weekPin) out.weekPin = undefined;

  /* ekonomik dalga — en yeni ts kazanır */
  if (cloud.economyWave && (!out.economyWave || cloud.economyWave.ts > out.economyWave.ts))
    out.economyWave = cloud.economyWave;
  else if (!cloud.economyWave && !out.economyWave) out.economyWave = undefined;

  /* otomatik dalga ayarları — en yeni ts kazanır */
  if (cloud.economyConfig && (!out.economyConfig || cloud.economyConfig.ts > out.economyConfig.ts))
    out.economyConfig = cloud.economyConfig;
  else if (!cloud.economyConfig && !out.economyConfig) out.economyConfig = undefined;

  /* yatırma paketleri — en yeni ts kazanır */
  if (cloud.depositPacks && (!out.depositPacks || cloud.depositPacks.ts > out.depositPacks.ts))
    out.depositPacks = cloud.depositPacks;
  else if (!cloud.depositPacks && !out.depositPacks) out.depositPacks = undefined;

  /* kuponlar — en yeni ts kazanır (kullanım artışı ts'yi de yükseltir) */
  if (cloud.coupons && (!out.coupons || cloud.coupons.ts > out.coupons.ts)) out.coupons = cloud.coupons;
  else if (!cloud.coupons && !out.coupons) out.coupons = undefined;

  /* özel kasalar — id birleşimi, en yeni durum kazanır */
  {
    const cmap = new Map<string, CustomCase>();
    (out.customCases ?? []).forEach((c) => {
      if (c && c.id) cmap.set(c.id, c);
    });
    (cloud.customCases ?? []).forEach((c) => {
      if (!c || !c.id) return;
      const cur = cmap.get(c.id);
      if (!cur || c.ts > cur.ts) cmap.set(c.id, c);
    });
    out.customCases = [...cmap.values()].sort((a, b) => a.ts - b.ts);
  }

  /* bot müşteri damgası — en yeni ts kazanır (çift tur engeli) */
  if (cloud.shopBotAt && cloud.shopBotAt > (out.shopBotAt ?? 0)) out.shopBotAt = cloud.shopBotAt;

  /* fiyat geçmişi — id birleşimi, en yeni 300 kare korunur */
  {
    const smap = new Map<string, PriceSnap>();
    (out.priceSnaps ?? []).forEach((sn) => {
      if (sn && sn.id) smap.set(sn.id, sn);
    });
    (cloud.priceSnaps ?? []).forEach((sn) => {
      if (sn && sn.id && !smap.has(sn.id)) smap.set(sn.id, sn);
    });
    out.priceSnaps = [...smap.values()].sort((a, b) => a.ts - b.ts).slice(-300);
  }

  /* jackpot — herkese aynı pot, eksik senkron korumalı birleşim */
  out.jackpot = mergeJackpot(local.jackpot ?? null, cloud.jackpot ?? null, local.session);

  return out;
}

/**
 * Jackpot birleşimi.
 * - Tur numarası saate bağlı deterministik: her cihaz aynı turu görür.
 * - Aynı turda girişler id'ye göre birleştirilir; "left" tombstone kazanır.
 * - Kazanan: daha fazla girişle çekilmiş (eksiksiz) sonuç tercih edilir.
 * - me bayrakları her cihazda kendi oturumuna göre yeniden hesaplanır.
 */
function mergeJackpot(
  local: JackpotState | null,
  cloud: JackpotState | null,
  session: string | null
): JackpotState | null {
  if (!local && !cloud) return null;

  let base: JackpotState | null = null;
  let other: JackpotState | null = null;

  if (!local) base = cloud;
  else if (!cloud) base = local;
  else if (local.round === cloud.round) {
    base = local;
    other = cloud;
  } else {
    /* farklı tur: daha yeni tur kazanır (tur numarası saatle artar) */
    if (local.round > cloud.round) {
      base = local;
      other = cloud;
    } else {
      base = cloud;
      other = local;
    }
  }
  if (!base) return null;

  const endsAt = jackpotSchedule(base.round).endsAt;
  const out: JackpotState = {
    ...base,
    endsAt,
    nextStartAt: base.nextStartAt ?? jackpotSchedule(base.round).nextStartAt,
    entries: [...(base.entries ?? [])],
    history: [...(base.history ?? [])],
    settled: [...(base.settled ?? [])],
  };

  if (other && other.round === base.round) {
    /* girişler — id birleşimi, left damgası kazanır */
    const emap = new Map<string, (typeof out.entries)[number]>();
    [...base.entries, ...other.entries].forEach((e) => {
      const cur = emap.get(e.id);
      if (!cur) emap.set(e.id, e);
      else if (e.left && !cur.left) emap.set(e.id, e);
      else if (!cur.left && !e.left && !cur.userId && e.userId) emap.set(e.id, e);
    });
    out.entries = [...emap.values()];

    /* kazanan — en eksiksiz çekiliş kazanır */
    const pickWinner = (
      a: JackpotState["winner"],
      b: JackpotState["winner"]
    ): JackpotState["winner"] => {
      if (!a && !b) return null;
      if (!a) return b;
      if (!b) return a;
      const ca = a.entriesCount ?? 0;
      const cb = b.entriesCount ?? 0;
      if (ca !== cb) return ca > cb ? a : b;
      if (a.value !== b.value) return a.value > b.value ? a : b;
      return (a.ts ?? 0) >= (b.ts ?? 0) ? a : b;
    };
    out.winner = pickWinner(base.winner ?? null, other.winner ?? null);

    /* tarihçe — id birleşimi */
    const hmap = new Map<string, (typeof out.history)[number]>();
    [...base.history, ...other.history].forEach((h) => {
      if (!hmap.has(h.id)) hmap.set(h.id, h);
    });
    out.history = [...hmap.values()].sort((a, b) => b.ts - a.ts).slice(0, 30);

    /* biten turlar emaneti — tur başına birleş */
    const smap = new Map<number, JackpotSettledRound>();
    [...(base.settled ?? []), ...(other.settled ?? [])].forEach((s) => {
      const cur = smap.get(s.round);
      if (!cur) smap.set(s.round, s);
      else if ((s.winner.entriesCount ?? 0) > (cur.winner.entriesCount ?? 0)) smap.set(s.round, s);
    });
    out.settled = [...smap.values()]
      .sort((a, b) => b.round - a.round)
      .slice(0, 5);
  }

  /* yerel görünüm bayrakları */
  const isMe = (userId?: string) => !!userId && userId === session;
  out.entries = out.entries.map((e) => ({ ...e, me: isMe(e.userId) }));
  if (out.winner) out.winner = { ...out.winner, me: isMe(out.winner.userId) };
  out.history = out.history.map((h) => ({ ...h, me: isMe(h.userId) }));
  out.settled = (out.settled ?? []).map((s) => ({
    ...s,
    entries: s.entries.map((e) => ({ ...e, me: isMe(e.userId) })),
    winner: { ...s.winner, me: isMe(s.winner.userId) },
  }));
  return out;
}

/* Dükkan ilanları: aynı id için en yeni revizyon kazanır.
   removed=true (iptal/tükenme) herkes tarafından yayıldığı için silme de yayılır. */
function mergeMarket<T extends { id: string; ts: number; removed?: boolean }>(
  local: T[],
  cloud: T[]
): T[] {
  const map = new Map<string, T>();
  local.forEach((l) => map.set(l.id, l));
  cloud.forEach((cl) => {
    const cur = map.get(cl.id);
    if (!cur || cl.ts >= cur.ts) map.set(cl.id, cl);
  });
  return [...map.values()]
    .filter((l) => !l.removed || Date.now() - l.ts < 3 * 24 * 3600 * 1000)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 300);
}

/* Satış kayıtları: eklemeyle büyüyen günlük — id'ye göre birleş */
function mergeById<T extends { id: string; ts: number }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  local.forEach((x) => map.set(x.id, x));
  cloud.forEach((x) => {
    if (!map.has(x.id)) map.set(x.id, x);
  });
  return [...map.values()].sort((a, b) => a.ts - b.ts).slice(-400);
}

interface SyncHandlers {
  getLocal: () => DB;
  apply: (merged: DB) => void;
  onStatus: (s: SyncStatus) => void;
}

let timer: number | null = null;
let forceFlag = false;
let inFlight = false;
let lastPushedJson = "";
let lastSeenJson = "";

export function stopSync() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

export function startSync(url: string, h: SyncHandlers) {
  stopSync();
  lastPushedJson = "";

  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const local = h.getLocal();
      const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`GET ${res.status}`);
      let cloud: CloudDoc;
      const raw = await res.json().catch(() => null);
      if (!raw || typeof raw !== "object" || !raw.users || !Array.isArray(raw.deposits)) {
        cloud = { v: 1, users: {}, deposits: [] };
      } else {
        cloud = raw as CloudDoc;
      }

      const merged = mergeCloud(local, cloud);
      const localChanged = JSON.stringify(merged) !== JSON.stringify(local);
      if (localChanged) h.apply(merged);

      /* Başka bir cihaz belgeyi üzerimize yazdıysa (stale doc) kendi yeni
         durumumuzu zorla geri yaz — yoksa onaylı işlemler "kaybolabiliyor". */
      const cloudJson = JSON.stringify(cloud);
      const foreignWrite = cloudJson !== lastSeenJson && cloudJson !== lastPushedJson;
      lastSeenJson = cloudJson;

      const doc = toCloudDoc(merged);
      const docJson = JSON.stringify(doc);
      if (docJson !== lastPushedJson || foreignWrite) {
        const put = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: docJson,
        });
        if (!put.ok) throw new Error(`PUT ${put.status}`);
        lastPushedJson = docJson;
      }
      h.onStatus("ok");
    } catch {
      h.onStatus("error");
    } finally {
      inFlight = false;
      forceFlag = false;
    }
  };

  void tick();
  timer = window.setInterval(() => void tick(), 4000);
  window.addEventListener("skyline:sync-force", () => {
    if (!forceFlag) {
      forceFlag = true;
      void tick();
    }
  });
}

export function forceSync() {
  window.dispatchEvent(new Event("skyline:sync-force"));
}
