# SkylineRP — V2 + V3 AI ve Sosyal Merkez

Mevcut V2 oyunu varsayılan açılış olarak korunur. Yeni sunucu doğrulamalı merkezin arayüzü `/#platform` adresindedir. V2 ve çoklu çekiliş güncellemeleri mevcut statik yayında çalışır; **V3 sunucu özellikleri için ayrıca Node Web Service + PostgreSQL kurulmalıdır**. Yalnızca arayüzü yayınlamak, backend veya AI üretimini etkinleştirmez.

## Yeni merkez

- **AI atölyesi:** gerçek OpenAI görsel API adaptörü; cümle, uzunluk, seçili detay ve kaliteye göre SC üretim teklifi. Anahtar yokken üretim kapalıdır; sahte görsel verilmez. Hatalı işte tek seferlik tam SC iadesi.
- **Klanlar:** oluşturma, özel davet, katılma talepleri, liderlik, ortak ilerleme ve kozmetik başarı rozeti.
- **Canlı arena:** gerçek hesaplarla 1v1 / 2v2 odaları, oda kodu, izleme, sunucu çekilişi, sonuç paylaşımı ve seed doğrulama.
- **Koleksiyon albümleri:** sahip olunan/eksik eşyalar, tamamlanan setlere kalıcı kozmetik ünvanlar.
- **Açık artırmalar:** süreli ilan, teklif geçmişi, bloke SC, geçilen teklifin iadesi, isteğe bağlı hemen al ve %5 satıcı komisyonu.
- **Galeri:** sticker/kasa konsept editörü, AI tasarımları, moderasyon, beğeni, raporlama, haftanın tasarımı.
- **Mobil PWA:** kurulabilir manifest/ikonlar, çevrimdışı kabuk ve kullanıcının onayladığı sürüm yenileme. Özel API verileri önbelleğe alınmaz; finansal işlemler çevrimdışı kuyruğa alınmaz.

Bunlar Skyline içi görsel koleksiyon eşyalarıdır; otomatik CS2/Steam eşyası, NFT veya gerçek paraya çekilebilir varlık değildir. Üretim maliyeti satış fiyatını garanti etmez.

## Önce veri güvenliği

V2'nin `localStorage["skyline:v1"]` kaydı yeni sunucunun güvenilir para kaynağı **değildir**. Kayıtlar otomatik silinmez veya sıfırlanmaz. Önce ham yedek, sonra aynı isimli güvenli hesap, bağımsız yetkili incelemesi ve tek seferlik aktarım vardır. Yeni hesaplar **0 SC / onay bekliyor** olarak başlar.

V2 ortak bir tarayıcı belgesindeki tüm hesapları değiştirebildiği için, bu belgedeki bir hesabın aktarımı onaylandığında ortak V2 belgesi arşiv görünümüne alınır. Diğer yerel hesaplar da yedekte korunur; onların aktarımı ayrıca incelenir. Eski mini oyunların tamamı yeni sunucu cüzdanına bağlanmış değildir. Otomatik geri aktarım veya çift yönlü bakiye eşitlemesi yoktur.

**[Yedek ve kontrollü geçiş rehberi →](docs/v3-veri-gecisi.md)**

## V2 — çoklu skin çekilişi

**Yetkili Paneli → Etkinlikler → Skin Çekilişi** bölümünde bir çekilişe en fazla 20 skin eklenebilir. Seçicide her eklemeden sonra katalog açık kalır; **Seçimi tamamla** ile listeye dönülür. Her ödülün sürüm/aşınma/sticker ayarı ayrı düzenlenebilir, ödüller tek tek çıkarılabilir.

Tüm skinler **aynı tek kazanana** verilir; ayrı kazananlar seçilmez. Eski tek-skin çekilişleri korunur. Her skinin sabit kimlikli ayrı ödül kaydı vardır; mevcut tek-skin kaydının kimliği değişmez. Tekrar kontrol/yenileme aynı ödülü yeniden eklemez. Bu özellik mevcut V2 çekilişidir; V3 sunucu SC'sine para aktarmaz.

```bash
npm test                     # Tekli/çoklu ödül, metadata, senkron ve tekrar önleme testleri
npx playwright install chromium
npm run test:e2e:raffle       # Kendi yerel Vite sunucusunu açıp kapatır
# Çalışan yerel Vite sunucusuyla: RAFFLE_E2E_URL=http://127.0.0.1:5173 npm run test:e2e:raffle
```

Tarayıcı testi yeni, izole localStorage kullanır; dış HTTP/MQTT bağlantıları ve V3 API istekleri engellenir. Gerçek oyuncu kayıtları veya canlı senkron odaları kullanılmaz.

## Yerel çalıştırma

Node.js 22 önerilir.

```bash
npm ci
cp .env.example .env
# .env içinde SKYLINE_ADMIN_USER ve güçlü SKYLINE_ADMIN_PASSWORD ayarla.
npm run catalog
npm run dev:api
```

Başka terminalde:

```bash
npm run dev -- --host 0.0.0.0
```

`http://localhost:5173/#platform` adresini aç. API 3001 portunda çalışır; tarayıcı yalnızca aynı kökendeki `/api` adreslerini çağırır. Geliştirme PGlite verisi `.cache/platform-db` altındadır; gerçek üretim veritabanı değildir. Aynı PGlite dizinini iki sunucu sürecinde açma. `.cache` hiçbir zaman üretim depolaması sayılmaz.

API anahtarı girmen gerekmez. `AI_ENABLED=false` iken fiyat hesaplama çalışır fakat ücretli üretim yapılamaz. Test ekranlarındaki SC gerçek Render hesaplarına aktarılmaz.

### Üretim derlemesini/PWA'yı yerelde deneme

```bash
npm run build
# Önce aynı porttaki geliştirme API'sini durdur.
SERVE_DIST=true CATALOG_PATH=dist/catalog.json npm run dev:api
```

`http://localhost:3001/#platform` adresinde aynı sunucu hem API'yi hem derlenmiş arayüzü sunar. Vite geliştirme modunda service worker bilerek kaydedilmez. `npm run preview` yalnızca statik önizlemedir; V3 API sunucusunun yerine geçmez.

## Testler

```bash
npm run typecheck
npm test
npm run build
npm audit
# Kamuya açık Render şeması için internet gerekir; kaynak oluşturmaz:
npm run validate:render
# Gerçek Chromium tarayıcısı gereken testler:
npx playwright install chromium
npm run test:e2e
```

Birim/HTTP testleri ve varsayılan tarayıcı testi kendi geçici, izole PGlite veritabanını oluşturur. Ücretli AI API çağrısı yapılmaz. Tarayıcı testi gerçek çerez oturumlarıyla iki oyuncu + yönetici akışını, ham yedeği, aktarımı, pazarı, odayı ve çevrimdışı kabuğu dener. E2E görüntüleri ve test yedeği `.cache/` altındadır; paylaşılacak kullanıcı yedeği değildir.

## Render ve AI kurulumu

**[Render Web Service + PostgreSQL + AI kurulum rehberi →](docs/v3-render-kurulum.md)**

`render.yaml` ayrı kaynaklar için hazırlanmıştır; uygulanması ücretli kaynaklar açabilir. Otomatik deploy başlangıçta kapalıdır. GitHub Pages veya yalnızca Render Static Site, V3 backend/iş kuyruğunu çalıştıramaz. Eski V2 adresini ve yedeklerini koru.

**[Mimari, sınırlar ve yayın kontrol listesi →](docs/v3-teknik-notlar.md)**

## Dizinler

| Dizin                         | İçerik                                                                     |
| ----------------------------- | -------------------------------------------------------------------------- |
| `src/store`, `src/components` | Mevcut V2 oyunu; sunucu cüzdanının otoritesi değildir                      |
| `src/platform`                | V3 React arayüzü, API istemcisi, ham yedek ve PWA kontrolleri              |
| `shared/platform.ts`          | Ortak sözleşmeler ve SC tarifesi                                           |
| `server`                      | Express, PostgreSQL/PGlite, kimlik, cüzdan, iş kuyruğu ve domain işlemleri |
| `scripts/catalog.mjs`         | Mevcut katalogdan sunucu için görselsiz metadata üretimi                   |
| `tests`                       | İzole domain/HTTP ve çok kullanıcılı tarayıcı kontrolleri                  |
| `public/sw.js`                | Yalnızca herkese açık uygulama kabuğu önbelleği                            |

Sırları, veritabanı dosyalarını, oyuncu yedeklerini veya AI görsel dosyalarını Git'e ekleme.
