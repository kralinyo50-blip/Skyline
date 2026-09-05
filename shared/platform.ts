import { z } from "zod";

export const MAX_SC = 1_000_000_000;
export const sc = z.number().int().min(0).max(MAX_SC);
export const positiveSc = sc.min(1);
export const username = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,16}$/, "Ad 3–16 harf, sayı veya alt çizgi olmalı.");
export const password = z
  .string()
  .min(12, "Şifre en az 12 karakter olmalı.")
  .max(128);
export const aiStyles = [
  "Neon",
  "Anime",
  "El çizimi",
  "Minimal",
  "Siberpunk",
  "Doğa",
] as const;
export const aiDetails = [
  "Metal gravür",
  "Devre desenleri",
  "Holografik vurgu",
  "Yıpranmış doku",
  "Geometrik motif",
  "Parlak kaplama",
] as const;
export const aiWeapons = [
  "AK-47",
  "AWP",
  "M4A1-S",
  "M4A4",
  "Desert Eagle",
  "USP-S",
  "Karambit",
  "Butterfly Knife",
] as const;
export const studioInput = z
  .object({
    name: z.string().trim().min(3).max(64),
    prompt: z
      .string()
      .trim()
      .min(20, "En az 20 karakterle tasarımını anlat.")
      .max(1200),
    weapon: z.enum(aiWeapons),
    style: z.enum(aiStyles),
    quality: z.enum(["medium", "high"]),
    details: z
      .array(z.enum(aiDetails))
      .max(4)
      .refine((a) => new Set(a).size === a.length, "Detaylar tekrarlanamaz."),
  })
  .strict();
export type StudioInput = z.infer<typeof studioInput>;
export const TARIFF_VERSION = "sc-2026-09-v1";
/** Gameplay tariff, NOT a quote for the provider's real-money invoice. */
export function studioPrice(raw: StudioInput) {
  const input = studioInput.parse(raw);
  const sentences = Math.max(
    1,
    input.prompt.split(/[.!?…\n]+/u).filter((s) => /[\p{L}\p{N}]/u.test(s))
      .length,
  );
  const blocks = Math.max(0, Math.ceil([...input.prompt].length / 160) - 1);
  const lines = [
    { label: "Temel üretim", amount: 10_000 },
    { label: `Ek cümle (${sentences - 1})`, amount: (sentences - 1) * 1_500 },
    { label: `Ek 160 karakter bloğu (${blocks})`, amount: blocks * 1_000 },
    {
      label: `Seçilen detay (${input.details.length})`,
      amount: input.details.length * 2_500,
    },
    {
      label: input.quality === "high" ? "Yüksek kalite" : "Standart kalite",
      amount: input.quality === "high" ? 15_000 : 0,
    },
  ];
  return {
    total: lines.reduce((s, l) => s + l.amount, 0),
    lines,
    sentences,
    blocks,
    version: TARIFF_VERSION,
  };
}
export const stickerInput = z
  .object({
    text: z.string().trim().min(1).max(18),
    shape: z.enum(["circle", "shield", "diamond", "hexagon"]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    gradient: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })
  .strict();
export type StickerDesign = z.infer<typeof stickerInput>;
export interface CatalogSkin {
  id: string;
  name: string;
  weapon: string;
  rarity: string;
  price: number;
}
export interface CatalogCase {
  id: string;
  name: string;
  price: number;
  drops: { id: string; weight: number }[];
}
export interface Collection {
  id: string;
  name: string;
  description: string;
  reward: string;
  ids: string[];
}
export interface Catalog {
  version: string;
  skins: CatalogSkin[];
  cases: CatalogCase[];
  collections: Collection[];
}
export interface OnlineUser {
  id: string;
  username: string;
  role: "admin" | "player";
  status: "pending" | "approved" | "suspended";
  balance: number;
  migratedAt: number | null;
}
export interface OnlineItem {
  id: string;
  catalogId: string | null;
  designId: string | null;
  name: string;
  weapon: string;
  rarity: string;
  cost: number;
  lockedBy: string | null;
  metadata: Record<string, unknown>;
  image: string | null;
  tradable: boolean;
  moderationStatus?: string;
}
export interface Design {
  id: string;
  authorId: string;
  author: string;
  kind: "ai" | "sticker" | "case";
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: string;
  cost: number;
  likes: number;
  liked: boolean;
  featured: boolean;
  image: string | null;
  createdAt: number;
}
export interface Clan {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  leaderId: string;
  points: number;
  members: { id: string; username: string }[];
  code?: string;
  requests?: { id: string; username: string }[];
}
export interface Auction {
  id: string;
  item: OnlineItem;
  sellerId: string;
  seller: string;
  minimum: number;
  buyout: number | null;
  highest: number;
  bidderId: string | null;
  bidder: string | null;
  status: string;
  endsAt: number;
  bids: { bidder: string; amount: number; createdAt: number }[];
}
export interface BattleDrop {
  userId: string;
  slot: number;
  catalogId: string;
  value: number;
}
export interface Battle {
  id: string;
  code: string;
  hostId: string;
  caseName: string;
  caseId: string;
  rounds: number;
  capacity: number;
  cost: number;
  phase: string;
  commitment: string;
  seed?: string;
  startsAt: number | null;
  endsAt: number | null;
  expiresAt: number;
  members: { id: string; username: string; slot: number }[];
  revealed: BattleDrop[][];
  scores?: number[];
  winnerTeam?: number;
  catalogSnapshot?: CatalogCase;
}
export interface AiJob {
  id: string;
  name: string;
  status: string;
  price: number;
  error: string | null;
  designId: string | null;
  createdAt: number;
}
export interface MigrationSnapshot {
  name: string;
  balance: number;
  inventory: {
    uid: string;
    skinId: string;
    ts?: number;
    float?: number;
    stickers?: string[];
    customName?: string;
  }[];
}
export interface PlatformState {
  environment?: "development" | "production";
  now: number;
  user: OnlineUser | null;
  ai: {
    enabled: boolean;
    reason: string;
    dailyUserLimit: number;
    dailyGlobalLimit: number;
  };
  catalog: Catalog;
  inventory: OnlineItem[];
  designs: Design[];
  clans: Clan[];
  auctions: Auction[];
  battles: Battle[];
  claims: string[];
  jobs: AiJob[];
  migration: {
    id: string;
    status: string;
    requestedAt: number;
    verified: { balance: number; itemUids: string[] } | null;
  } | null;
  ledger: {
    id: string;
    delta: number;
    balance: number;
    note: string;
    createdAt: number;
  }[];
  admin?: {
    users: OnlineUser[];
    migrations: {
      id: string;
      username: string;
      snapshot: MigrationSnapshot;
      status: string;
    }[];
    reports: {
      designId: string;
      title: string;
      reporter: string;
      reason: string;
    }[];
    audit: {
      actor: string;
      action: string;
      createdAt: number;
      details: Record<string, unknown>;
    }[];
  };
}
export function formatSc(value: number) {
  return (
    new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value) +
    " SC"
  );
}
