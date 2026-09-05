import { readFile } from "node:fs/promises";
import { database, migrate } from "./db";
import { bootstrapAdmin } from "./auth";
import { createApp } from "./app";
import { openAiProvider, processOneJob, type AiSettings } from "./ai";
import { settleDue } from "./state";
import type { Catalog } from "../shared/platform";
const production = process.env.NODE_ENV === "production";
const bounded = (v: string | undefined, fallback: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};
const settings: AiSettings = {
  enabled: process.env.AI_ENABLED === "true",
  key: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
  userDaily: bounded(process.env.AI_DAILY_USER_LIMIT, 3, 100),
  globalDaily: bounded(process.env.AI_DAILY_GLOBAL_LIMIT, 20, 1000),
};
const db = await database(
  process.env.DATABASE_URL,
  process.env.PGLITE_DIR || ".cache/platform-db",
);
await migrate(db);
await bootstrapAdmin(
  db,
  process.env.SKYLINE_ADMIN_USER,
  process.env.SKYLINE_ADMIN_PASSWORD,
);
const catalog = JSON.parse(
  await readFile(
    process.env.CATALOG_PATH ||
      (production ? "dist/catalog.json" : ".cache/catalog.json"),
    "utf8",
  ),
) as Catalog;
const configuredOrigin =
  process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL;
const app = createApp(db, catalog, {
  production,
  publicOrigin: configuredOrigin ? new URL(configuredOrigin).origin : undefined,
  adminName: process.env.SKYLINE_ADMIN_USER,
  dist: process.env.SERVE_DIST === "true" || production ? "dist" : undefined,
  ai: settings,
});
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, "0.0.0.0", () =>
  console.log(
    `Skyline platform listening on 0.0.0.0:${port}; AI ${settings.enabled && settings.key ? "enabled" : "disabled (no charges)"}`,
  ),
);
let busy = false,
  stopping = false;
const provider = openAiProvider(settings);
async function tick() {
  if (busy || stopping) return;
  busy = true;
  try {
    await db.tx((sql) => settleDue(sql, Date.now()));
    await processOneJob(db, provider, settings);
  } catch (e) {
    console.error(
      "Background settlement failed:",
      e instanceof Error ? e.name : "unknown",
    );
  } finally {
    busy = false;
  }
}
const timer = setInterval(() => void tick(), 2500);
void tick();
async function stop() {
  stopping = true;
  clearInterval(timer);
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  while (busy) await new Promise((r) => setTimeout(r, 100));
  await closed;
  await db.close();
  process.exit(0);
}
process.once("SIGTERM", () => void stop());
process.once("SIGINT", () => void stop());
