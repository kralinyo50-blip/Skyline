import type { MigrationSnapshot } from "../../shared/platform";
const KEY = "skyline:v1";
export const ARCHIVE_KEY = "skyline:v3:archived-accounts";
export const ARCHIVE_EVENT = "skyline:v3:archive";
export function legacyRaw() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}
export function legacyDocument(raw = legacyRaw()): Record<string, unknown> {
  const parsed = JSON.parse(raw || "{}");
  if (
    parsed?.schema === "skyline-v2-backup-v1" &&
    typeof parsed.raw === "string"
  )
    return JSON.parse(parsed.raw);
  return parsed;
}
export function legacySnapshot(
  raw = legacyRaw(),
  name?: string,
): MigrationSnapshot | null {
  try {
    const doc = legacyDocument(raw) as {
      users?: Record<string, MigrationSnapshot>;
      session?: string;
    };
    const key = name?.toLowerCase() || doc.session;
    const account = key ? doc.users?.[key] : undefined;
    if (
      !account ||
      !Array.isArray(account.inventory) ||
      typeof account.balance !== "number"
    )
      return null;
    return {
      name: account.name,
      balance: account.balance,
      inventory: account.inventory.map((i) => ({
        uid: i.uid,
        skinId: i.skinId,
        ...(typeof i.ts === "number" ? { ts: i.ts } : {}),
        ...(typeof i.float === "number" ? { float: i.float } : {}),
        ...(Array.isArray(i.stickers) ? { stickers: i.stickers } : {}),
        ...(typeof i.customName === "string"
          ? { customName: i.customName }
          : {}),
      })),
    };
  } catch {
    return null;
  }
}
export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function backupLegacy() {
  const raw = legacyRaw();
  if (!raw)
    throw new Error(
      "Bu adreste V2 kaydı bulunamadı. Yedeği eski Render adresinden indirmelisin.",
    );
  downloadJson(
    `skyline-v2-yedek-${new Date().toISOString().slice(0, 10)}.json`,
    {
      schema: "skyline-v2-backup-v1",
      origin: location.origin,
      exportedAt: new Date().toISOString(),
      raw,
    },
  );
}
export function markArchived(name: string, at: number) {
  try {
    const stored = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "{}");
    const markers = Object.assign(
      Object.create(null),
      stored && typeof stored === "object" && !Array.isArray(stored)
        ? stored
        : {},
    );
    if (markers[name.toLowerCase()] === at) return;
    markers[name.toLowerCase()] = at;
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(markers));
    window.dispatchEvent(new Event(ARCHIVE_EVENT));
  } catch {
    /* Advisory only. Server migration uniqueness remains authoritative. */
  }
}
export function legacyIsArchived() {
  try {
    const doc = legacyDocument() as {
      users?: Record<string, { name?: string }>;
    };
    const markers = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "{}");
    // V2 normalizes its entire shared users document on load. Freeze the whole local
    // document after any contained account migrates, even if its session changes.
    return Object.values(doc.users || {}).some(
      (account) =>
        typeof account?.name === "string" &&
        Object.prototype.hasOwnProperty.call(
          markers,
          account.name.toLowerCase(),
        ) &&
        typeof markers[account.name.toLowerCase()] === "number" &&
        markers[account.name.toLowerCase()] > 0,
    );
  } catch {
    return false;
  }
}
