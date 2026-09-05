// Public schema validation only. This does not contact the Render account API,
// create services, choose a paid plan or send any credentials.
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";
const schemaURL = "https://render.com/schema/render.yaml.json";
let schema;
if (process.argv[2])
  schema = JSON.parse(await readFile(process.argv[2], "utf8"));
else {
  try {
    const response = await fetch(schemaURL, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    schema = await response.json();
  } catch {
    console.error(
      `Şema indirilemedi. ${schemaURL} dosyasını güvenilir tarayıcında kaydedip npm run validate:render -- DOSYA.json çalıştır. Hiçbir kaynak oluşturulmadı.`,
    );
    process.exit(1);
  }
}
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema),
  blueprint = YAML.parse(await readFile("render.yaml", "utf8"));
if (!validate(blueprint)) {
  console.error(validate.errors);
  process.exitCode = 1;
} else
  console.log(
    "render.yaml: JSON schema validation passed. No resources were provisioned. Review account/branch/plan availability in Render before applying.",
  );
