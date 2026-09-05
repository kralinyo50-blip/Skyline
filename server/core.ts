import { randomUUID } from "node:crypto";
import { first, type Sql, type Row } from "./db";
import { ensure } from "./errors";
import type { Catalog, CatalogSkin, OnlineItem } from "../shared/platform";
export const id = () => randomUUID();
export const json = (v: unknown) => JSON.stringify(v);
export const num = (v: unknown) => Number(v);
export async function audit(
  sql: Sql,
  actor: string,
  action: string,
  details: unknown,
  now = Date.now(),
) {
  await sql.query("INSERT INTO admin_audit VALUES($1,$2,$3,$4,$5)", [
    id(),
    actor,
    action,
    json(details),
    now,
  ]);
}
/** Include refundable reservations when granting new credit: refunds must always fit. */
export async function creditFits(sql: Sql, userId: string, delta: number) {
  const row = await first(
    sql,
    `SELECT balance,
    COALESCE((SELECT SUM(highest) FROM auctions WHERE bidder_id=$1 AND status='active'),0)
    + COALESCE((SELECT SUM(price) FROM ai_jobs WHERE user_id=$1 AND status IN ('queued','running')),0)
    + COALESCE((SELECT SUM(b.cost) FROM battles b JOIN battle_members m ON m.battle_id=b.id WHERE m.user_id=$1 AND b.phase='waiting'),0) AS held
    FROM accounts WHERE id=$1`,
    [userId],
  );
  return (
    !!row &&
    Math.round(num(row.balance) * 100) +
      Math.round(num(row.held) * 100) +
      Math.round(delta * 100) <=
      900_000_000_000_000
  );
}
/** Every credit/debit is inside the same transaction as its business operation. */
export async function wallet(
  sql: Sql,
  userId: string,
  delta: number,
  cause: string,
  note: string,
  now = Date.now(),
) {
  const deltaCents = Math.round(delta * 100);
  ensure(
    Number.isSafeInteger(deltaCents) &&
      Math.abs(delta - deltaCents / 100) < 0.000001,
    "SC tutarı en fazla iki ondalık basamak olmalı.",
  );
  const duplicate = await first(sql, "SELECT * FROM ledger WHERE cause=$1", [
    cause,
  ]);
  if (duplicate) {
    ensure(
      duplicate.user_id === userId && num(duplicate.delta) === delta,
      "İşlem anahtarı başka bir işleme ait.",
      409,
    );
    return num(duplicate.balance_after);
  }
  const account = await first(sql, "SELECT balance FROM accounts WHERE id=$1", [
    userId,
  ]);
  ensure(account, "Hesap bulunamadı.", 404);
  const balanceCents = Math.round(num(account.balance) * 100) + deltaCents;
  const balance = balanceCents / 100;
  ensure(
    Number.isSafeInteger(balanceCents) &&
      balance >= 0 &&
      balance <= 9_000_000_000_000,
    delta < 0 ? "Yetersiz SC bakiyesi." : "Bakiye sınırı aşılıyor.",
  );
  const refund = /^(ai-refund:|auction-refund:|outbid:|battle-refund:)/.test(
    cause,
  );
  if (delta > 0 && !refund)
    ensure(
      await creditFits(sql, userId, delta),
      "Bloke iadeler için ayrılan alan dahil bakiye sınırı aşılıyor.",
    );
  await sql.query("UPDATE accounts SET balance=$1 WHERE id=$2", [
    balance,
    userId,
  ]);
  await sql.query("INSERT INTO ledger VALUES($1,$2,$3,$4,$5,$6,$7)", [
    id(),
    userId,
    cause,
    delta,
    balance,
    note,
    now,
  ]);
  return balance;
}
export async function addCatalogItem(
  sql: Sql,
  userId: string,
  catalogId: string,
  source: string,
  metadata = {},
  now = Date.now(),
) {
  const itemId = id();
  await sql.query(
    "INSERT INTO items(id,owner_id,catalog_id,metadata,source_key,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(source_key) DO NOTHING",
    [itemId, userId, catalogId, json(metadata), source, now],
  );
  return itemId;
}
export function skinIndex(catalog: Catalog) {
  return new Map(catalog.skins.map((s) => [s.id, s]));
}
export function onlineItem(
  row: Row,
  skins: Map<string, CatalogSkin>,
): OnlineItem {
  const skin = row.catalog_id ? skins.get(row.catalog_id) : null;
  return {
    id: row.id,
    catalogId: row.catalog_id,
    designId: row.design_id,
    name:
      row.metadata?.customName ||
      skin?.name ||
      row.design_title ||
      "Özel tasarım",
    weapon: skin?.weapon || row.design_payload?.weapon || "AI Skin",
    rarity: skin?.rarity || "custom",
    cost: skin?.price || num(row.design_cost || 0),
    metadata: row.metadata || {},
    lockedBy: row.locked_by,
    image: row.design_id ? `/api/images/${row.design_id}` : null,
    moderationStatus: row.design_status || undefined,
    tradable: !row.design_id || row.design_status === "approved",
  };
}
export const ITEM_SELECT =
  "SELECT i.*,d.title AS design_title,d.cost AS design_cost,d.payload AS design_payload,d.status AS design_status FROM items i LEFT JOIN designs d ON d.id=i.design_id";
export async function clanPoint(
  sql: Sql,
  userId: string,
  event: string,
  kind: string,
  amount: number,
  now: number,
) {
  const member = await first(
    sql,
    "SELECT clan_id FROM clan_members WHERE user_id=$1",
    [userId],
  );
  if (!member) return;
  const inserted = await sql.query(
    "INSERT INTO clan_events VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING event_key",
    [event, member.clan_id, kind, now],
  );
  if (inserted.rows.length)
    await sql.query("UPDATE clans SET points=points+$1 WHERE id=$2", [
      amount,
      member.clan_id,
    ]);
}
