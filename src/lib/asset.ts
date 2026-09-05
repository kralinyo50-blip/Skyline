/**
 * `public/` altındaki dosyalar (skin görselleri vb.) için güvenli URL üretir.
 *
 * Kod içinde "/images/skins/x.png" gibi yazılmış mutlak yollar, site bir alt
 * dizine yayınlandığında (GitHub Pages: https://<kullanıcı>.github.io/Skyline/)
 * köke göre çözülür ve kırılır. Vite `import.meta.env.BASE_URL` değerini
 * derleme sırasında yerleştirir (tek dosya çıktısında "./"), bu yardımcı da
 * yolu buna göre göreli hale getirir.
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const clean = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${clean}${path.startsWith("/") ? path : `/${path}`}`;
}

export default asset;
