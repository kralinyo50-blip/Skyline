import { database, first } from "../server/db";
import { hashPassword, publicUser, requireAdmin } from "../server/auth";
import { audit } from "../server/core";
import { ensure } from "../server/errors";
import { username } from "../shared/platform";

// Operator-only maintenance: no public recovery endpoint and no password CLI args.
ensure(
  process.env.SKYLINE_RESET_CONFIRM === "YES",
  "Önce kimlik/DB kontrolü yap ve SKYLINE_RESET_CONFIRM=YES ayarla.",
);
const name = username.parse(process.env.SKYLINE_RESET_USER).toLowerCase();
const password = process.env.SKYLINE_RESET_PASSWORD || "";
const reason = (process.env.SKYLINE_RESET_REASON || "").trim();
ensure(
  password.length >= 16 && password.length <= 128,
  "Yeni parola 16–128 karakter olmalı.",
);
ensure(
  reason.length >= 12 && reason.length <= 500,
  "12–500 karakterli kimlik doğrulama referansı gerekli.",
);
ensure(process.env.SKYLINE_ADMIN_USER, "Kayıtlı yönetici adı gerekli.");
const hash = await hashPassword(password);
const db = await database(
  process.env.DATABASE_URL,
  process.env.PGLITE_DIR || ".cache/platform-db",
);
try {
  await db.tx(async (sql) => {
    const operator = await first(
      sql,
      "SELECT * FROM accounts WHERE username=$1",
      [process.env.SKYLINE_ADMIN_USER!.toLowerCase()],
    );
    requireAdmin(operator ? publicUser(operator) : null);
    const target = await first(
      sql,
      "SELECT id FROM accounts WHERE username=$1",
      [name],
    );
    ensure(target, "Hedef hesap bulunamadı.", 404);
    await sql.query("UPDATE accounts SET password_hash=$1 WHERE id=$2", [
      hash,
      target.id,
    ]);
    await sql.query("DELETE FROM sessions WHERE user_id=$1", [target.id]);
    await audit(sql, operator!.id, "operator.password_reset", {
      userId: target.id,
      reason,
      method: "server-maintenance",
    });
  });
  console.log(
    "Parola yenilendi, oturumlar kapatıldı. Para ve eşyalara dokunulmadı. Geçici reset değişkenlerini kaldır.",
  );
} finally {
  await db.close();
}
