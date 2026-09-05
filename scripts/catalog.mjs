import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const output = process.argv[2] || ".cache/catalog.json";
const result = await build({
  stdin: {
    contents: `import { SKIN_MAP } from './src/data/skins'; import { STICKERS } from './src/data/stickers'; import { CASES, TIER_WEIGHTS } from './src/data/cases'; export { SKIN_MAP, STICKERS, CASES, TIER_WEIGHTS };`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  define: { "import.meta.env.BASE_URL": '"/"' },
  plugins: [
    {
      name: "omit-images",
      setup(b) {
        b.onLoad({ filter: /skinImages\.ts$/ }, () => ({
          contents:
            'export const SKIN_IMAGES = {}; export const img = () => "";',
          loader: "js",
        }));
        b.onLoad({ filter: /\.(png|jpe?g|webp|gif)$/ }, () => ({
          contents: 'export default ""',
          loader: "js",
        }));
      },
    },
  ],
});
await mkdir(".cache", { recursive: true });
await writeFile(".cache/catalog-source.mjs", result.outputFiles[0].text);
const { SKIN_MAP, STICKERS, CASES, TIER_WEIGHTS } = await import(
  pathToFileURL(resolve(".cache/catalog-source.mjs")).href
);
const byId = new Map(
  Object.values(SKIN_MAP).map((s) => [
    s.id,
    {
      id: s.id,
      name: s.name,
      weapon: s.weapon,
      rarity: s.rarity,
      price: Math.max(1, Math.round(s.price)),
    },
  ]),
);
for (const s of STICKERS)
  byId.set(s.id, {
    id: s.id,
    name: s.name,
    weapon: "Sticker",
    rarity: s.rarity,
    price: Math.max(1, Math.round(s.price)),
  });
const skins = [...byId.values()];
// A small, audited battle catalog; original V2 case pools are not modified.
const cases = CASES.filter((c) => !c.capsule && !c.souvenir && !c.stickered)
  .slice(0, 8)
  .map((c) => ({
    id: c.id,
    name: c.name,
    price: Math.max(1, Math.round(c.price)),
    drops: Object.entries(c.contents).flatMap(([tier, ids]) => {
      const valid = ids.filter((id) => byId.has(id));
      return valid.map((id) => ({
        id,
        weight: (TIER_WEIGHTS[tier] || 1) / valid.length,
      }));
    }),
  }))
  .filter((c) => c.drops.length);
const set = (id, name, description, reward, filter) => ({
  id,
  name,
  description,
  reward,
  ids: skins
    .filter(filter)
    .filter((s) => !/-st$|-sv$/.test(s.id))
    .slice(0, 5)
    .map((s) => s.id),
});
const collections = [
  set(
    "marin",
    "Cosplay Günlüğü",
    "Marin serisinden beş tasarımı bir araya getir.",
    "Cosplay Koleksiyoncusu",
    (s) => s.id.startsWith("marin-"),
  ),
  set(
    "sketch",
    "Çizginin Ustası",
    "El çizimi serisinin parçalarını tamamla.",
    "Mürekkep Ustası",
    (s) => s.id.startsWith("sketch-"),
  ),
  set(
    "ak",
    "AK Arşivi",
    "Beş farklı AK-47 tasarımından bir set oluştur.",
    "AK Arşivcisi",
    (s) => s.weapon === "AK-47",
  ),
  set(
    "awp",
    "Uzun Menzil",
    "AWP koleksiyonundaki eksikleri tamamla.",
    "Keskin Koleksiyoncu",
    (s) => s.weapon === "AWP",
  ),
];
if (collections.some((c) => c.ids.length < 5) || !cases.length)
  throw new Error("Catalog/collection configuration is incomplete.");
const data = { skins, cases, collections };
const version = createHash("sha256")
  .update(JSON.stringify(data))
  .digest("hex")
  .slice(0, 16);
await mkdir(dirname(resolve(output)), { recursive: true });
await writeFile(output, JSON.stringify({ version, ...data }));
console.log(
  `Catalog: ${skins.length} items, ${cases.length} battle cases → ${output}`,
);
