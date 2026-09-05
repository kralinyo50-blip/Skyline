import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
  randomUUID,
} from "node:crypto";
import { promisify } from "node:util";
import { first, type Database, type Sql, type Row } from "./db";
import { ApiError, ensure } from "./errors";
import type { OnlineUser } from "../shared/platform";
const scrypt = promisify(scryptCb);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const result = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${result.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, expected] = hash.split(":");
  if (!salt || !expected || expected.length !== 128) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
export const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function publicUser(row: Row): OnlineUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    balance: Number(row.balance),
    migratedAt: row.migrated_at ? Number(row.migrated_at) : null,
  };
}
export async function sessionUser(
  db: Sql,
  token?: string,
): Promise<OnlineUser | null> {
  if (!token || token.length !== 64) return null;
  const row = await first(
    db,
    "SELECT a.* FROM accounts a JOIN sessions s ON s.user_id=a.id WHERE s.token_hash=$1 AND s.expires_at>$2",
    [digest(token), Date.now()],
  );
  return row ? publicUser(row) : null;
}
export function requireUser(
  user: OnlineUser | null,
  approved = true,
): asserts user is OnlineUser {
  if (!user) throw new ApiError(401, "Önce güvenli hesabına giriş yap.");
  if (approved && user.status !== "approved")
    throw new ApiError(
      403,
      "Hesabın yetkili onayını bekliyor veya askıya alınmış.",
    );
}
export function requireAdmin(
  user: OnlineUser | null,
): asserts user is OnlineUser {
  requireUser(user);
  if (user.role !== "admin")
    throw new ApiError(403, "Bu işlem yalnızca sunucu yetkilisine açık.");
}
export async function rateLimit(
  db: Database,
  key: string,
  max: number,
  windowMs: number,
) {
  const allowed = await db.tx(async (sql) => {
    const now = Date.now();
    const old = await first(sql, "SELECT * FROM rate_limits WHERE key=$1", [
      key,
    ]);
    if (!old || Number(old.resets_at) <= now) {
      await sql.query(
        "INSERT INTO rate_limits(key,hits,resets_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET hits=1,resets_at=EXCLUDED.resets_at",
        [key, now + windowMs],
      );
      return true;
    }
    if (old.hits >= max) return false;
    await sql.query("UPDATE rate_limits SET hits=hits+1 WHERE key=$1", [key]);
    return true;
  });
  if (!allowed)
    throw new ApiError(429, "Çok fazla istek. Biraz bekleyip tekrar dene.");
}
export async function createSession(sql: Sql, userId: string) {
  const token = randomBytes(32).toString("hex");
  await sql.query("INSERT INTO sessions VALUES($1,$2,$3)", [
    digest(token),
    userId,
    Date.now() + 7 * 86400_000,
  ]);
  return token;
}
/** Only an operator-supplied, server-side secret can bootstrap the administrator. */
export async function bootstrapAdmin(
  db: Database,
  name?: string,
  password?: string,
) {
  if (!name && !password) return;
  ensure(
    name &&
      /^[A-Za-z0-9_]{3,16}$/.test(name) &&
      password &&
      password.length >= 16,
    "Admin bootstrap: valid username and 16+ character password required.",
  );
  const normalized = name.toLowerCase();
  const hash = await hashPassword(password);
  await db.tx(async (sql) => {
    const existing = await first(
      sql,
      "SELECT * FROM accounts WHERE username=$1",
      [normalized],
    );
    // Never silently promote a pre-existing player account by name.
    if (existing) {
      ensure(
        existing.role === "admin",
        "Bootstrap name belongs to a player. Use a new admin username.",
      );
      return;
    }
    await sql.query(
      "INSERT INTO accounts(id,username,password_hash,role,status,created_at) VALUES($1,$2,$3,'admin','approved',$4)",
      [randomUUID(), normalized, hash, Date.now()],
    );
  });
}
