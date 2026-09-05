import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";
import { first, type Sql, type Row } from "./db";
import { ensure } from "./errors";
import { id, json, num, wallet, addCatalogItem, clanPoint } from "./core";
import { digest } from "./auth";
import type {
  Catalog,
  CatalogCase,
  BattleDrop,
  OnlineUser,
} from "../shared/platform";
export const ROUND_MS = 3500;
export function seedNumber(seed: string, label: string) {
  return (
    createHmac("sha256", seed).update(label).digest().readUIntBE(0, 6) /
    281474976710656
  );
}
export function battleResult(
  seed: string,
  caseDef: CatalogCase,
  members: { user_id: string; slot: number }[],
  rounds: number,
  catalog: Catalog,
) {
  const skins = new Map(catalog.skins.map((s) => [s.id, s]));
  const weight = caseDef.drops.reduce((sum, drop) => sum + drop.weight, 0);
  ensure(weight > 0, "Kasa havuzu boş.");
  const revealed: BattleDrop[][] = [];
  const scores = [0, 0];
  for (let round = 0; round < rounds; round++) {
    revealed.push(
      members.map((member) => {
        let remaining =
          seedNumber(seed, `round:${round}:slot:${member.slot}`) * weight;
        let chosen = caseDef.drops[caseDef.drops.length - 1];
        for (const drop of caseDef.drops) {
          remaining -= drop.weight;
          if (remaining < 0) {
            chosen = drop;
            break;
          }
        }
        const skin = skins.get(chosen.id);
        ensure(skin, "Kasa kataloğu eksik.");
        scores[member.slot % 2] += skin.price;
        return {
          userId: member.user_id,
          slot: member.slot,
          catalogId: skin.id,
          value: skin.price,
        };
      }),
    );
  }
  const winnerTeam =
    scores[0] === scores[1]
      ? seedNumber(seed, "tiebreak") < 0.5
        ? 0
        : 1
      : scores[0] > scores[1]
        ? 0
        : 1;
  return { revealed, scores, winnerTeam };
}
export async function createBattle(
  sql: Sql,
  user: OnlineUser,
  raw: unknown,
  catalog: Catalog,
  now: number,
) {
  const input = z
    .object({
      caseId: z.string(),
      rounds: z.number().int().min(1).max(5),
      capacity: z.union([z.literal(2), z.literal(4)]),
    })
    .strict()
    .parse(raw);
  const caseDef = catalog.cases.find((c) => c.id === input.caseId);
  ensure(caseDef, "Bu kasa canlı arenada kullanılamıyor.");
  const pending = await first(
    sql,
    "SELECT b.id FROM battles b JOIN battle_members m ON m.battle_id=b.id WHERE m.user_id=$1 AND b.phase IN ('waiting','playing')",
    [user.id],
  );
  ensure(!pending, "Önce mevcut canlı odanı tamamla veya iptal et.");
  const battleId = id(),
    code = randomBytes(4).toString("hex").toUpperCase(),
    seed = randomBytes(32).toString("hex");
  const cost = caseDef.price * input.rounds;
  await sql.query(
    "INSERT INTO battles(id,code,host_id,case_snapshot,rounds,capacity,cost,seed,commitment,expires_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    [
      battleId,
      code,
      user.id,
      json(caseDef),
      input.rounds,
      input.capacity,
      cost,
      seed,
      digest(seed),
      now + 15 * 60_000,
      now,
    ],
  );
  const memberId = id();
  await wallet(
    sql,
    user.id,
    -cost,
    `battle-entry:${memberId}`,
    `Canlı oda ${code} — katılım`,
    now,
  );
  await sql.query("INSERT INTO battle_members VALUES($1,$2,$3,0)", [
    memberId,
    battleId,
    user.id,
  ]);
  return { id: battleId, code };
}
export async function joinBattle(
  sql: Sql,
  user: OnlineUser,
  code: string,
  catalog: Catalog,
  now: number,
) {
  const battle = await first(sql, "SELECT * FROM battles WHERE code=$1", [
    code.trim().toUpperCase(),
  ]);
  ensure(
    battle && battle.phase === "waiting" && num(battle.expires_at) > now,
    "Oda yok, dolmuş veya süresi bitmiş.",
    409,
  );
  const pending = await first(
    sql,
    "SELECT b.id FROM battles b JOIN battle_members m ON m.battle_id=b.id WHERE m.user_id=$1 AND b.phase IN ('waiting','playing')",
    [user.id],
  );
  ensure(!pending, "Zaten bekleyen veya oynanan bir odadasın.");
  const members = (
    await sql.query(
      "SELECT * FROM battle_members WHERE battle_id=$1 ORDER BY slot",
      [battle.id],
    )
  ).rows;
  ensure(members.length < battle.capacity, "Oda dolu.");
  const memberId = id();
  await wallet(
    sql,
    user.id,
    -num(battle.cost),
    `battle-entry:${memberId}`,
    `Canlı oda ${battle.code} — katılım`,
    now,
  );
  await sql.query("INSERT INTO battle_members VALUES($1,$2,$3,$4)", [
    memberId,
    battle.id,
    user.id,
    members.length,
  ]);
  members.push({ id: memberId, user_id: user.id, slot: members.length });
  if (members.length === battle.capacity) {
    const result = battleResult(
      battle.seed,
      battle.case_snapshot,
      members as { user_id: string; slot: number }[],
      battle.rounds,
      catalog,
    );
    const start = now + 2000;
    await sql.query(
      "UPDATE battles SET phase='playing',starts_at=$1,ends_at=$2,result=$3 WHERE id=$4",
      [start, start + battle.rounds * ROUND_MS, json(result), battle.id],
    );
  }
}
export async function cancelBattle(sql: Sql, battle: Row, now: number) {
  if (battle.phase !== "waiting") return;
  const members = (
    await sql.query("SELECT * FROM battle_members WHERE battle_id=$1", [
      battle.id,
    ])
  ).rows;
  for (const member of members)
    await wallet(
      sql,
      member.user_id,
      num(battle.cost),
      `battle-refund:${member.id}`,
      `Oda ${battle.code} iptal — tam iade`,
      now,
    );
  await sql.query("UPDATE battles SET phase='cancelled' WHERE id=$1", [
    battle.id,
  ]);
}
export async function settleBattle(sql: Sql, battle: Row, now: number) {
  if (battle.phase !== "playing" || num(battle.ends_at) > now) return;
  const members = (
    await sql.query(
      "SELECT * FROM battle_members WHERE battle_id=$1 ORDER BY slot",
      [battle.id],
    )
  ).rows;
  const result = battle.result as ReturnType<typeof battleResult>;
  const winners = members.filter((m) => m.slot % 2 === result.winnerTeam);
  ensure(winners.length > 0, "Kazanan ekip bulunamadı.");
  let copy = 0;
  for (const round of result.revealed)
    for (const drop of round) {
      await addCatalogItem(
        sql,
        winners[copy % winners.length].user_id,
        drop.catalogId,
        `battle:${battle.id}:${copy}`,
        {},
        now,
      );
      copy++;
    }
  for (const member of members)
    await clanPoint(
      sql,
      member.user_id,
      `battle:${battle.id}:${member.id}`,
      "Canlı oda tamamlandı",
      5,
      now,
    );
  await sql.query("UPDATE battles SET phase='settled' WHERE id=$1", [
    battle.id,
  ]);
}
