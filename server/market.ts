import { z } from "zod";
import { first, type Sql, type Row } from "./db";
import { ensure } from "./errors";
import { id, num, wallet, clanPoint, creditFits } from "./core";
import { positiveSc, type OnlineUser } from "../shared/platform";
export const MARKET_FEE_PERCENT = 5;
export async function createAuction(
  sql: Sql,
  user: OnlineUser,
  raw: unknown,
  now: number,
) {
  const input = z
    .object({
      itemId: z.string().uuid(),
      minimum: positiveSc,
      buyout: positiveSc.nullable(),
      hours: z.union([z.literal(6), z.literal(24), z.literal(48)]),
    })
    .strict()
    .parse(raw);
  ensure(
    !input.buyout || input.buyout >= input.minimum,
    "Hemen al fiyatı başlangıç fiyatından düşük olamaz.",
  );
  const item = await first(
    sql,
    "SELECT i.*,d.status AS design_status FROM items i LEFT JOIN designs d ON d.id=i.design_id WHERE i.id=$1",
    [input.itemId],
  );
  ensure(item && item.owner_id === user.id, "Eşya sana ait değil.", 403);
  ensure(!item.locked_by, "Eşya başka bir işlemde kilitli.");
  ensure(
    !item.design_id || item.design_status === "approved",
    "AI tasarımı satıştan önce yetkili onayı almalı.",
  );
  const auctionId = id();
  await sql.query(
    "INSERT INTO auctions(id,seller_id,item_id,minimum,buyout,ends_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      auctionId,
      user.id,
      item.id,
      input.minimum,
      input.buyout,
      now + input.hours * 3600_000,
      now,
    ],
  );
  await sql.query("UPDATE items SET locked_by=$1 WHERE id=$2", [
    auctionId,
    item.id,
  ]);
  return { id: auctionId };
}
export async function settleAuction(
  sql: Sql,
  auction: Row,
  now: number,
  cancel = false,
) {
  if (auction.status !== "active") return;
  const item = await first(sql, "SELECT * FROM items WHERE id=$1", [
    auction.item_id,
  ]);
  ensure(
    item &&
      item.owner_id === auction.seller_id &&
      item.locked_by === auction.id,
    "Eşya kilidi tutarsız; yetkiliye bildir.",
    409,
  );
  if (!cancel && auction.bidder_id) {
    const proceeds =
      num(auction.highest) -
      Math.floor((num(auction.highest) * MARKET_FEE_PERCENT) / 100);
    if (!(await creditFits(sql, auction.seller_id, proceeds))) cancel = true;
  }
  if (cancel || !auction.bidder_id) {
    if (auction.bidder_id)
      await wallet(
        sql,
        auction.bidder_id,
        num(auction.highest),
        `auction-refund:${auction.id}`,
        "İptal edilen açık artırma iadesi",
        now,
      );
    await sql.query("UPDATE auctions SET status=$1 WHERE id=$2", [
      cancel ? "cancelled" : "expired",
      auction.id,
    ]);
  } else {
    const fee = Math.floor((num(auction.highest) * MARKET_FEE_PERCENT) / 100);
    await wallet(
      sql,
      auction.seller_id,
      num(auction.highest) - fee,
      `auction-sale:${auction.id}`,
      `Pazar satışı (%${MARKET_FEE_PERCENT} komisyon)`,
      now,
    );
    await sql.query("UPDATE items SET owner_id=$1 WHERE id=$2", [
      auction.bidder_id,
      item.id,
    ]);
    await sql.query("UPDATE auctions SET status='sold' WHERE id=$1", [
      auction.id,
    ]);
    await clanPoint(
      sql,
      auction.seller_id,
      `sale:${auction.id}`,
      "Pazar satışı",
      3,
      now,
    );
  }
  await sql.query("UPDATE items SET locked_by=NULL WHERE id=$1", [item.id]);
}
export async function bidAuction(
  sql: Sql,
  user: OnlineUser,
  raw: unknown,
  now: number,
) {
  const input = z
    .object({
      id: z.string().uuid(),
      amount: positiveSc,
      buyNow: z.boolean().default(false),
    })
    .strict()
    .parse(raw);
  const auction = await first(sql, "SELECT * FROM auctions WHERE id=$1", [
    input.id,
  ]);
  ensure(
    auction && auction.status === "active" && num(auction.ends_at) > now,
    "Bu açık artırma sona erdi.",
    409,
  );
  ensure(auction.seller_id !== user.id, "Kendi ilanına teklif veremezsin.");
  const minimum = auction.bidder_id
    ? num(auction.highest) + Math.max(1, Math.ceil(num(auction.highest) * 0.05))
    : num(auction.minimum);
  const amount = input.buyNow ? num(auction.buyout) : input.amount;
  ensure(
    !input.buyNow || (auction.buyout && input.amount === amount),
    "Hemen al fiyatı değişti veya bu seçenek yok.",
  );
  ensure(
    input.buyNow || amount >= minimum,
    `En az ${minimum} SC teklif vermelisin.`,
  );
  ensure(
    input.buyNow || !auction.buyout || amount < num(auction.buyout),
    "Hemen al fiyatına ulaştın; Hemen al düğmesini kullan.",
  );
  const bidId = id();
  if (auction.bidder_id)
    await wallet(
      sql,
      auction.bidder_id,
      num(auction.highest),
      `outbid:${bidId}`,
      "Önceki teklif serbest bırakıldı",
      now,
    );
  await wallet(
    sql,
    user.id,
    -amount,
    `bid:${bidId}`,
    input.buyNow ? "Hemen al — SC bloke" : "Açık artırma — SC bloke",
    now,
  );
  await sql.query("INSERT INTO bids VALUES($1,$2,$3,$4,$5)", [
    bidId,
    auction.id,
    user.id,
    amount,
    now,
  ]);
  await sql.query("UPDATE auctions SET highest=$1,bidder_id=$2 WHERE id=$3", [
    amount,
    user.id,
    auction.id,
  ]);
  if (input.buyNow)
    await settleAuction(
      sql,
      { ...auction, highest: amount, bidder_id: user.id },
      now,
    );
}
export async function cancelAuction(
  sql: Sql,
  user: OnlineUser,
  auctionId: string,
  now: number,
) {
  const auction = await first(sql, "SELECT * FROM auctions WHERE id=$1", [
    auctionId,
  ]);
  ensure(auction && auction.seller_id === user.id, "İlan sana ait değil.", 403);
  ensure(
    auction.status === "active" && !auction.bidder_id,
    "Teklif alan veya biten ilan iptal edilemez.",
  );
  await settleAuction(sql, auction, now, true);
}
