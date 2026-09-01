/**
 * AI üretimi skin görselleri.
 *
 * Görseller `src/assets/skins` altında tutulur ve build sırasında bundle'a
 * base64 olarak gömülür (vite-plugin-singlefile ile tek dosyalık çıktı
 * alındığında bile resimler kaybolmaz — `/images/...` yolu gerekmez).
 */
const files = import.meta.glob("../assets/skins/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const SKIN_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [
    path.split("/").pop()!.replace(/\.jpg$/, ""),
    url,
  ])
);

/** `img("awp-skyfall")` → gömülü görsel URL'i (yoksa boş string → kart fallback'i) */
export function img(key: string): string {
  return SKIN_IMAGES[key] ?? "";
}
