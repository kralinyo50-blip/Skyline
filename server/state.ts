import { first, type Sql } from "./db";
import { publicUser } from "./auth";
import { onlineItem, ITEM_SELECT, skinIndex, num } from "./core";
import { settleAuction } from "./market";
import { cancelBattle, settleBattle, ROUND_MS } from "./battles";
import { availability, failJob, type AiSettings } from "./ai";
import type {
  Catalog,
  OnlineUser,
  PlatformState,
  Battle,
  Design,
} from "../shared/platform";
export async function settleDue(sql: Sql, now: number) {
  for (const row of (
    await sql.query(
      "SELECT * FROM auctions WHERE status='active' AND ends_at<=$1",
      [now],
    )
  ).rows)
    await settleAuction(sql, row, now);
  for (const row of (
    await sql.query(
      "SELECT * FROM battles WHERE (phase='waiting' AND expires_at<=$1) OR (phase='playing' AND ends_at<=$1)",
      [now],
    )
  ).rows) {
    if (row.phase === "waiting") await cancelBattle(sql, row, now);
    else await settleBattle(sql, row, now);
  }
  const jobs = (
    await sql.query(
      "SELECT id FROM ai_jobs WHERE (status='running' AND started_at<$1) OR (status='queued' AND created_at<$2)",
      [now - 10 * 60_000, now - 30 * 60_000],
    )
  ).rows;
  for (const job of jobs)
    await failJob(
      sql,
      job.id,
      "Üretim kesintiye uğradı. SC iade edildi; otomatik tekrar denenmedi.",
      now,
    );
  await sql.query("DELETE FROM sessions WHERE expires_at<$1", [now]);
  await sql.query("DELETE FROM rate_limits WHERE resets_at<$1", [now]);
  await sql.query(
    "DELETE FROM quotes WHERE expires_at<$1 AND id NOT IN (SELECT quote_id FROM ai_jobs)",
    [now - 86400_000],
  );
}
export function weekKey(now: number) {
  const date = new Date(now),
    day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}
export async function platformState(
  sql: Sql,
  user: OnlineUser | null,
  catalog: Catalog,
  settings: AiSettings,
  now: number,
): Promise<PlatformState> {
  const uid = user?.id || null,
    isAdmin = user?.role === "admin" && user.status === "approved";
  const skins = skinIndex(catalog);
  const inventory = uid
    ? (
        await sql.query(
          `${ITEM_SELECT} WHERE i.owner_id=$1 ORDER BY i.created_at DESC`,
          [uid],
        )
      ).rows.map((i) => onlineItem(i, skins))
    : [];
  const designRows = (
    await sql.query(
      `SELECT d.*,a.username AS author,(SELECT count(*) FROM likes l WHERE l.design_id=d.id) AS likes,EXISTS(SELECT 1 FROM likes l WHERE l.design_id=d.id AND l.user_id=$1) AS liked FROM designs d JOIN accounts a ON a.id=d.author_id WHERE d.id IN (SELECT id FROM designs WHERE status='approved' OR author_id=$1 OR $2 ORDER BY created_at DESC LIMIT 100) OR (d.status='pending' AND $2) OR (d.author_id=$1 AND d.status<>'approved') OR (d.status='approved' AND d.featured_week=$3) ORDER BY d.created_at DESC`,
      [uid, isAdmin, weekKey(now)],
    )
  ).rows;
  const designs: Design[] = designRows.map((d) => ({
    id: d.id,
    authorId: d.author_id,
    author: d.author,
    kind: d.kind,
    title: d.title,
    description: d.description,
    payload: d.payload,
    status: d.status,
    cost: num(d.cost),
    likes: num(d.likes),
    liked: d.liked,
    featured: d.featured_week === weekKey(now),
    image: d.kind === "ai" ? `/api/images/${d.id}` : null,
    createdAt: num(d.created_at),
  }));
  const clanRows = (
    await sql.query(
      "SELECT * FROM clans WHERE id IN (SELECT id FROM clans ORDER BY points DESC,name LIMIT 100) OR id IN (SELECT clan_id FROM clan_members WHERE user_id=$1) ORDER BY points DESC,name",
      [uid],
    )
  ).rows;
  const clans: PlatformState["clans"] = [];
  for (const clan of clanRows) {
    const members = (
      await sql.query(
        "SELECT a.id,a.username FROM clan_members m JOIN accounts a ON a.id=m.user_id WHERE m.clan_id=$1 ORDER BY a.username",
        [clan.id],
      )
    ).rows as { id: string; username: string }[];
    const mine = members.some((m) => m.id === uid);
    const requests =
      clan.leader_id === uid
        ? ((
            await sql.query(
              "SELECT a.id,a.username FROM clan_requests r JOIN accounts a ON a.id=r.user_id WHERE r.clan_id=$1",
              [clan.id],
            )
          ).rows as { id: string; username: string }[])
        : undefined;
    clans.push({
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      emblem: clan.emblem,
      leaderId: clan.leader_id,
      points: num(clan.points),
      members,
      code: mine ? clan.code : undefined,
      requests,
    });
  }
  const auctionRows = (
    await sql.query(
      "SELECT a.*,s.username AS seller,b.username AS bidder FROM auctions a JOIN accounts s ON s.id=a.seller_id LEFT JOIN accounts b ON b.id=a.bidder_id WHERE a.status='active' OR a.seller_id=$1 OR a.bidder_id=$1 ORDER BY a.created_at DESC LIMIT 100",
      [uid],
    )
  ).rows;
  const auctions: PlatformState["auctions"] = [];
  for (const a of auctionRows) {
    const item = await first(sql, `${ITEM_SELECT} WHERE i.id=$1`, [a.item_id]);
    if (!item) continue;
    const bids = (
      await sql.query(
        "SELECT a.username,b.amount,b.created_at FROM bids b JOIN accounts a ON a.id=b.bidder_id WHERE b.auction_id=$1 ORDER BY b.created_at DESC LIMIT 10",
        [a.id],
      )
    ).rows;
    auctions.push({
      id: a.id,
      item: onlineItem(item, skins),
      sellerId: a.seller_id,
      seller: a.seller,
      minimum: num(a.minimum),
      buyout: a.buyout ? num(a.buyout) : null,
      highest: num(a.highest),
      bidderId: a.bidder_id,
      bidder: a.bidder,
      status: a.status,
      endsAt: num(a.ends_at),
      bids: bids.map((b) => ({
        bidder: b.username,
        amount: num(b.amount),
        createdAt: num(b.created_at),
      })),
    });
  }
  const battleRows = (
    await sql.query(
      "SELECT * FROM battles WHERE phase IN ('waiting','playing') OR created_at>$1 ORDER BY created_at DESC LIMIT 60",
      [now - 86400_000],
    )
  ).rows;
  const battles: Battle[] = [];
  for (const b of battleRows) {
    const members = (
      await sql.query(
        "SELECT a.id,a.username,m.slot FROM battle_members m JOIN accounts a ON a.id=m.user_id WHERE m.battle_id=$1 ORDER BY m.slot",
        [b.id],
      )
    ).rows as { id: string; username: string; slot: number }[];
    const finished = b.phase === "settled";
    const count = finished
      ? b.rounds
      : b.starts_at
        ? Math.max(
            0,
            Math.min(b.rounds, Math.floor((now - num(b.starts_at)) / ROUND_MS)),
          )
        : 0;
    battles.push({
      id: b.id,
      code: b.code,
      hostId: b.host_id,
      caseName: b.case_snapshot.name,
      caseId: b.case_snapshot.id,
      rounds: b.rounds,
      capacity: b.capacity,
      cost: num(b.cost),
      phase: b.phase,
      commitment: b.commitment,
      seed: finished ? b.seed : undefined,
      catalogSnapshot: finished ? b.case_snapshot : undefined,
      startsAt: b.starts_at ? num(b.starts_at) : null,
      endsAt: b.ends_at ? num(b.ends_at) : null,
      expiresAt: num(b.expires_at),
      members,
      revealed: b.result?.revealed.slice(0, count) || [],
      scores: finished ? b.result.scores : undefined,
      winnerTeam: finished ? b.result.winnerTeam : undefined,
    });
  }
  const claims = uid
    ? (
        await sql.query(
          "SELECT collection_id FROM collection_claims WHERE user_id=$1",
          [uid],
        )
      ).rows.map((r) => r.collection_id)
    : [];
  const jobs = uid
    ? (
        await sql.query(
          "SELECT * FROM ai_jobs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
          [uid],
        )
      ).rows.map((j) => ({
        id: j.id,
        name: j.input.name,
        status: j.status,
        price: num(j.price),
        error: j.error,
        designId: j.design_id,
        createdAt: num(j.created_at),
      }))
    : [];
  const migration = uid
    ? await first(sql, "SELECT * FROM migrations WHERE user_id=$1", [uid])
    : null;
  const ledger = uid
    ? (
        await sql.query(
          "SELECT * FROM ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
          [uid],
        )
      ).rows.map((l) => ({
        id: l.id,
        delta: num(l.delta),
        balance: num(l.balance_after),
        note: l.note,
        createdAt: num(l.created_at),
      }))
    : [];
  let admin: PlatformState["admin"];
  if (isAdmin) {
    const users = (
      await sql.query(
        "SELECT * FROM accounts ORDER BY created_at DESC LIMIT 200",
      )
    ).rows.map(publicUser);
    const migrations = (
      await sql.query(
        "SELECT m.*,a.username FROM migrations m JOIN accounts a ON a.id=m.user_id WHERE m.status='pending' ORDER BY m.requested_at",
      )
    ).rows.map((m) => ({
      id: m.id,
      username: m.username,
      snapshot: m.snapshot,
      status: m.status,
    }));
    const reports = (
      await sql.query(
        "SELECT r.design_id,d.title,a.username,r.reason FROM reports r JOIN designs d ON d.id=r.design_id JOIN accounts a ON a.id=r.user_id ORDER BY r.created_at DESC LIMIT 100",
      )
    ).rows.map((r) => ({
      designId: r.design_id,
      title: r.title,
      reporter: r.username,
      reason: r.reason,
    }));
    const audits = (
      await sql.query(
        "SELECT a.*,u.username FROM admin_audit a JOIN accounts u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100",
      )
    ).rows.map((a) => ({
      actor: a.username,
      action: a.action,
      details: a.details,
      createdAt: num(a.created_at),
    }));
    admin = { users, migrations, reports, audit: audits };
  }
  return {
    now,
    user,
    ai: availability(settings),
    catalog,
    inventory,
    designs,
    clans,
    auctions,
    battles,
    claims,
    jobs,
    migration: migration
      ? {
          id: migration.id,
          status: migration.status,
          requestedAt: num(migration.requested_at),
          verified: migration.verified,
        }
      : null,
    ledger,
    admin,
  };
}
