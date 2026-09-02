# SKIN TRANSFER — 20 Eksik Skin Geri Yüklendi

Bu dosya `arena/01a0507c-skyline` dalında eksik olan 20 skin'in
`arena/01a05c0b-skyline` dalına uygulanmasını belgeler.

## Kaynak
- Kaynak commitler: `d8f9381` (10 skin) + `358c644` (10 skin)
- Kaynak dal: `origin/arena/01a05bfd-skyline`
- Hedef dal: `arena/01a0507c-skyline` (f633192 tabanlı)

## Sorun
`f633192` commitinde `src/data/newSkins.ts` içinde 30 skin tanımlıydı
(15 bıçak + 15 silah) ancak `public/images/skins/` klasöründe sadece
10 adet `ex-*.jpg` vardı. 20 skin'in görseli eksikti → kartlarda kırık
görsel, kasa açılışında boş fallback.

## Çözülen 20 Skin (Eksik Olanlar)

### Bıçaklar (5)
| # | ID | Silah | Desen | Nadirlik | Fiyat | Görsel |
|---|---|---|---|---|---|---|
| 1 | ex-gut-inferno | Gut Knife | Inferno | rare | 1400 | /images/skins/ex-gut-inferno.jpg |
| 2 | ex-shadow-shattered | Shadow Daggers | Shattered | rare | 1600 | /images/skins/ex-shadow-shattered.jpg |
| 3 | ex-classic-abyss | Classic Knife | Abyss | rare | 2500 | /images/skins/ex-classic-abyss.jpg |
| 4 | ex-talon-emerald-queen | Talon Knife | Emerald Queen | rare | 3200 | /images/skins/ex-talon-emerald-queen.jpg |
| 5 | ex-skeleton-ghost | Skeleton Knife | Ghost | rare | 2800 | /images/skins/ex-skeleton-ghost.jpg |

### Silahlar (15)
| # | ID | Silah | Desen | Nadirlik | Fiyat | Görsel |
|---|---|---|---|---|---|---|
| 6 | ex-ak47-anubis-oath | AK-47 | Anubis Oath | covert | 950 | /images/skins/ex-ak47-anubis-oath.jpg |
| 7 | ex-ak47-thunderwolf | AK-47 | Thunderwolf | classified | 220 | /images/skins/ex-ak47-thunderwolf.jpg |
| 8 | ex-m4a4-nebula-storm | M4A4 | Nebula Storm | covert | 780 | /images/skins/ex-m4a4-nebula-storm.jpg |
| 9 | ex-m4a1s-galaxy-runner | M4A1-S | Galaxy Runner | covert | 850 | /images/skins/ex-m4a1s-galaxy-runner.jpg |
| 10 | ex-awp-phoenix-rising | AWP | Phoenix Rising | covert | 1100 | /images/skins/ex-awp-phoenix-rising.jpg |
| 11 | ex-awp-frostbite | AWP | Frostbite | classified | 260 | /images/skins/ex-awp-frostbite.jpg |
| 12 | ex-deagle-cyber-pulse | Desert Eagle | Cyber Pulse | covert | 420 | /images/skins/ex-deagle-cyber-pulse.jpg |
| 13 | ex-usp-golden-hour | USP-S | Golden Hour | covert | 350 | /images/skins/ex-usp-golden-hour.jpg |
| 14 | ex-glock-dragon-breath | Glock-18 | Dragon Breath | classified | 120 | /images/skins/ex-glock-dragon-breath.jpg |
| 15 | ex-mp9-beehive | MP9 | Beehive | classified | 90 | /images/skins/ex-mp9-beehive.jpg |
| 16 | ex-mp7-topgun-ace | MP7 | Top Gun Ace | restricted | 45 | /images/skins/ex-mp7-topgun-ace.jpg |
| 17 | ex-p90-radioactive | P90 | Radioactive | classified | 110 | /images/skins/ex-p90-radioactive.jpg |
| 18 | ex-famas-matriarch | FAMAS | Matriarch | restricted | 55 | /images/skins/ex-famas-matriarch.jpg |
| 19 | ex-galil-night-owl | Galil AR | Night Owl | classified | 75 | /images/skins/ex-galil-night-owl.jpg |
| 20 | ex-ssg-skyfall | SSG 08 | Skyfall | covert | 300 | /images/skins/ex-ssg-skyfall.jpg |

## Uygulama Adımları
1. `358c644` commitindeki 20 görsel `/tmp/extract/` altına çıkarıldı
2. `ex-*.jpg` isimlendirmesine dönüştürülerek `public/images/skins/` altına kopyalandı
3. Toplam görsel sayısı: 20 (eski) → 40 (10 base + 30 ex)
4. `npx tsc --noEmit` ve `npm run build` temiz

## Doğrulama
- `src/data/newSkins.ts` içindeki 30 skin'in tamamı için `/images/skins/ex-*.jpg` mevcut
- `SKINS` / `SKIN_MAP` içinde 30 skin + ST/SV varyantları
- Kasa havuzları (`GLOBAL_BY_ID`) 30/30 içeriyor
- Sezon ödülleri: 5. seviye Kukri, 15. Talon, 25. Skeleton aktif
- Build: 2292 modül, singlefile 2.4MB, gzip 666KB

## Not
Görseller orijinal AI üretimidir, `origin/arena/01a05bfd-skyline` dalındaki
optimize edilmemiş halleri (128-225KB) kullanıldı. İstenirse `68a1d1e`
commitindeki 640px/q78 optimize halleri `src/assets/skins/` ile bundle'a
gömülebilir (mevcut `public/images` yöntemi de çalışıyor).

Tarih: 2026-09-01
Versiyon: v2.1 - 20 skin transfer fix
