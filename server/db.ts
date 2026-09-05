import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { readFile } from "node:fs/promises";
export type Row = Record<string, any>; // SQL boundary; validated/mapped before leaving the server.
export interface Sql {
  query<T extends Row = Row>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}
export interface Database extends Sql {
  tx<T>(fn: (sql: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function database(
  url?: string,
  directory?: string,
): Promise<Database> {
  if (url) {
    // Render internal connection string; never disable certificate verification here.
    const pool = new pg.Pool({
      connectionString: url,
      max: 8,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 15_000,
    });
    return {
      query: (s, p) => pool.query(s, p),
      async tx(fn) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            "SELECT id FROM platform_lock WHERE id=1 FOR UPDATE",
          );
          const result = await fn(client);
          await client.query("COMMIT");
          return result;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Production requires DATABASE_URL. Refusing ephemeral storage.",
    );
  const local = new PGlite(directory);
  return {
    query: (s, p) => local.query(s, p),
    // PGlite serializes its transactions; production additionally uses the shared PG row lock.
    tx: (fn) => local.transaction((t) => fn(t)),
    close: () => local.close(),
  };
}
export async function migrate(db: Database) {
  const source = await readFile(
    new URL("./schema.sql", import.meta.url),
    "utf8",
  );
  // DDL bootstrap must precede the transaction lock table.
  for (const command of source
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean))
    await db.query(command);
}
export async function first<T extends Row = Row>(
  sql: Sql,
  query: string,
  values: unknown[] = [],
): Promise<T | undefined> {
  return (await sql.query<T>(query, values)).rows[0];
}
