# V3 — Teknik notlar ve yayın kontrolü

## Güven sınırı

- V2 istemci oyunları ile V3 sunucu cüzdanı birbirinden ayrıdır. V3, V2 `GameProvider` bakiyesine, istemci rolüne, gönderilen fiyat/kazanç veya eşya sahipliği alanlarına güvenmez.
- Her ekonomik mutasyon PostgreSQL transaction'ı ve ortak `platform_lock` satır kilidi altında çalışır. PGlite geliştirme adaptörü de işlemleri seri yürütür. Unique ledger nedenleri, kaynak eşya kimlikleri ve aktarım kayıtları tekrarları engeller.
- Bakiye ve ledger `numeric(20,2)`; uygulama aritmetiği tam sayı kuruş cinsindedir. Azami 9 trilyon SC. Yeni krediler, mevcut bloke tutarlarının gelecekteki iadelerine yer bırakmalıdır. Satıcı kredi sınırına takılan açık artırma güvenli iptal/iade yoluna döner.
- Fiyatlar/teklifler sunucuda doğrulanır. Birbirini geçen teklifler önceki oyuncuya iade edilir; yeni teklifin debiti başarısızsa iade de transaction ile geri alınır. Satıştaki eşya kilidi ikinci satışa/başka kullanıcının satmasına engeldir.
- Tasarım ancak moderasyon onayından sonra satılabilir. Yayından kaldırma, aktif ilanların iptal ve iadesiyle aynı transaction içindedir.

## Kimlik ve API

Scrypt parola hash'i; rastgele 32 bayt oturum token'ı; DB'de yalnızca token hash'i. Cookie `HttpOnly`, üretimde `Secure`, `SameSite=Lax`; 7 gün. Yazma uçlarında tam Origin kontrolü ve JSON zorunluluğu vardır. İşlem transaction'ı içinde yetki tekrar okunur; askıya alınmış kullanıcı mevcut oturumla finansal işlem yapamaz.

Kayıt 5/IP/saat; giriş 20/IP ve 12/isim/15 dakika; genel yazma 90/kullanıcı/dakika; okuma 360/IP/dakika; teklif hesabı 30/kullanıcı/saat; galeri taslağı 10/kullanıcı/gün. Bu değerler küçük topluluk başlangıcı içindir; ortak IP'de çok oyuncu varsa izleyerek uyarlamak gerekir. JSON gövdesi 2 MB ile sınırlıdır.

`/api/state` kişiye göre filtrelenir. Başkasının taslağı, özel görseli, davet kodu, ledger'ı, aktarımı ve admin verisi paylaşılmaz. `/api/account/export` kişisel JSON çıktısıdır. `/api/images/:id` görünürlük kontrolü yapar. API/özel görseller `no-store` yanıtı alır; service worker bunları hiç yakalamaz.

Admin kimliği environment sırrıyla kurulur. Normal hesaplardan otomatik admin terfisi yoktur. Admin ekranındaki bakiyeler yalnızca sunucudan gelir; admin yetkisi tarayıcıda saklanmaz. Loglara API anahtarı, parola veya sağlayıcı yanıt gövdesi yazılmaz.

## AI yaşam döngüsü

`quote → queued/debit → running → succeeded/image/item/draft` veya `failed/full SC refund`.

Teklif sahipliği, süre, tarife sürümü, günlük kotalar ve tek kullanım kontrol edilir. Sağlayıcı moderasyonundan sonra gerçek image generation çağrısı yapılır. Boyut ve çözünürlük sınırları ile PNG chunk/CRC doğrulaması vardır. Görsel + tasarım + envanter aynı transaction'da kalıcılaşır. Provider başarısızsa bir kez iade yapılır. Canlı sağlayıcı çağrısı DB transaction kilidi açıkken tutulmaz.

Harici API faturası için exactly-once sözü verilmez. Ağ/işlem çökmesi belirsizliği nedeniyle ücretli çağrı otomatik yeniden denenmez. Zaman aşımı kurtarması, iade edilmiş işe sonradan görsel basılmasını engeller. Günlük limit ve sağlayıcı bütçe takibi birlikte kullanılmalıdır.

## Gerçek oda protokolü

1. Sunucu oda için kriptografik seed üretir; başta sadece SHA-256 taahhüdü paylaşılır.
2. 2 veya 4 gerçek, onaylı hesap SC giriş bedelini ayırır. Bot/yerel oyuncu taklidi yoktur. 2v2 takım ataması sırayla yapılır.
3. Son oyuncuyla başlangıç zamanı belirlenir; kasa havuzu/fiyatları odada snapshot olarak sabitlenir. HMAC tabanlı çekilişler sunucuda hesaplanır, gelecekteki turlar API'de gizlenir.
4. Başlangıç gecikmesi 2 sn, her tur 3,5 sn; 1–5 tur. İstemci 3 sn'de bir sunucu durumunu alır. Bu bir frame-frame WebSocket senkronizasyonu değil, ortak sunucu zamanına dayalı polling protokolüdür.
5. Sonuçta eşyalar kazanan takım üyelerine deterministik sırada verilir. Beraberlik seed'e bağlı kuralla çözülür. Sonuç uygulaması tekrar çalıştırılsa da eşya ikinci kez basılmaz.
6. Sonuç seed'i ve snapshot açılır; tarayıcıdaki doğrulama düğmesi taahhüdü/çekilişleri tekrar hesaplar. Bu, bağımsız bir oyun ekonomisi/fairness sertifikası değildir.
7. Başlamamış oda 15 dakikada sona erer ve tüm girişler iade edilir. İzleyici katılma ücreti ödemeden görünür turları izler; gelecekteki sonuçlar açık değildir.

## Sosyal özelliklerin kapsamı

Klan: 30 kişi, özel döndürülebilir davet, talep/onay, lider devri ve ayrılma. Onaylı tasarım +10, sonuçlanan battle katılımı +5, satış +3 ortak puan; 100 puanda kozmetik başarı rozeti. SC dağıtan klan kasası yoktur.

Dört seçili beşer öğelik koleksiyon, envanter kataloğu üzerinden doğrulanır; tamamlanan albüm için kalıcı ünvan tek kez kaydedilir. Bu kozmetik talep para basmaz.

Galeri sticker/kasa editörü yalnızca izinli metin/renk/şekil/katalog alanlarını kabul eder; SVG/HTML veya rastgele dış görsel URL'si yükletmez. Kasa konsepti paylaşmak, oynanabilir kasa basmak değildir. Beğeniler/raporlar gerçek hesaplara bağlıdır; kendi tasarımını beğenme engellenir. Moderatörün haftalık seçimi UTC hafta başlangıcına göre görüntülenir.

## PWA

`public/manifest.webmanifest`, gerçek PNG ikonlar ve `public/sw.js` uygulama kabuğunu sağlar. Vite geliştirmesinde SW kapalıdır. Derlenmiş sürüm HTTPS veya güvenilir localhost üzerinde denenir.

- Yalnızca same-origin GET navigasyon kabuğu ve izinli public dosyalar cache edilir.
- API, özel görseller, cross-origin kaynaklar ve POST/diğer yazmalar cache edilmez.
- Finansal çevrimdışı sıra/background sync yoktur.
- Yeni SW otomatik `skipWaiting` yapmaz. “Yeni sürüm” düğmesi kullanıcı onayıyla yeniler.
- SW davranışı/asset listesi değişirse cache sürümünü artır; finansal işlem sırasında zorunlu reload ekleme.
- Telefon kurulumu için gerçek Android Chrome ve iOS Safari cihaz kabul testi gerekir. Tarayıcı otomasyonundaki offline geçiş bunun tamamının yerine geçmez.

## Bilinen sınırlar / büyümeden önce

- İlk sürüm küçük topluluk içindir. Ortak transaction kilidi, polling ve bazı sosyal listelerdeki son-kayıt sınırları yüksek trafik için ölçek testi/pagination gerektirir. Ledger ekranda son 100, AI iş listesi son 30, genel tasarım/ilan/klan listeleri sınırlı son/önde gelen kayıtları gösterir; veri otomatik silinmez. Tam envanter sahipliği ve hesap ledger dışa aktarımı DB'den alınır.
- Üretim PostgreSQL yük/çok süreç testi bu geliştirme ortamında yapılmadı. Kalıcı production DB bağlantısı, restore ve startup/restart mutlaka staging'de doğrulanmalıdır.
- Çok instance açmadan önce sıraya alma, CPU/DB kilit beklemeleri, dağıtık provider iş sahipliği ve kapanış pencerelerini yük altında doğrula. Kodda kilitler olması operasyonel HA garantisi değildir.
- Gerçek OpenAI hesabı/anahtarı henüz kullanılmadı. Gerçek sağlayıcı ücretli smoke testi ayrı onaylı adımdır.
- Ham V2 seviyeleri, VIP, mini oyunlar, özel kasa/generatif eski nesnelerinin hepsi sunucu özelliklerine dönüştürülmüş değildir. Bu sürümde arşivde korunurlar; otomatik çift yönlü ekonomi entegrasyonu yoktur.
- Kullanıcı JSON export'u tüm görsel baytlarını içeren yedek değildir. PostgreSQL yedeği ve geri dönüş provası şarttır.

## Yayın kabul listesi

- [ ] V2 varsayılanı korunuyor; `VITE_PLATFORM_DEFAULT` üretimde `false`.
- [ ] Eski adres ve oyuncu ham yedekleri korunmuş, başka kökene geçiş anlatılmış.
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm audit` temiz.
- [ ] `npm run test:e2e` temiz; testler izole DB'de, gerçek AI kapalı.
- [ ] Render Blueprint resmi JSON şeması/Render doğrulaması kontrol edilmiş; ücretler operatörce kabul edilmiş.
- [ ] Staging gerçek PostgreSQL restart/restore ve eşzamanlı teklif/migration denemeleri tamamlanmış.
- [ ] HTTPS, cookie, Origin, admin bootstrap ve askıya alma kontrol edilmiş.
- [ ] Provider anahtarı yalnızca sunucuda; günlük kotalar ve API bütçe alarmı var.
- [ ] İzinli gerçek AI smoke testi yapılıp sağlayıcı faturasıyla uzlaştırılmış (AI açılacaksa).
- [ ] Gerçek telefonda yükleme, offline, tekrar bağlanma ve kullanıcı onaylı PWA güncellemesi kontrol edilmiş.
- [ ] Yanlış transfer / restore / sağlayıcı kesintisi müdahale sorumlusu belirlenmiş.

## Geliştirme doğrulama notu — 5 Eylül 2026

Bu teslimdeki otomatik testler sentetik hesaplar/fixture PNG ile çalışır. Tarayıcı testi varsayılan olarak kendi bellek içi PGlite DB'sini ve aynı-origin HTTP sunucusunu açar; gerçek kullanıcı SC'si veya OpenAI servisi kullanılmaz. Geliştirme önizlemesi ayrı `.cache` veritabanıdır ve ekranda açıkça test olarak etiketlenir. Gerçekleşmemiş canlı deploy, sağlayıcı testi veya production PostgreSQL yük testi başarılı sayılmaz.

### Render şema kontrolünün kapsamı

Resmi JSON şemasının 5 Eylül 2026'da okunan kısıtlarıyla `render.yaml` yerelde doğrulandı (açıklama/metin alanları çıkarılmış geçici kısıt kopyası kullanıldı). Doğrudan Node/curl indirmesi bu ortamda TLS bağlantısı nedeniyle çalışmadı. `npm run validate:render` internete erişebilen ortamda şemayı resmi adresten yeniden alır; gerekirse resmi JSON dosyasını tarayıcıda kaydedip `npm run validate:render -- DOSYA.json` kullan. Bu kontrol kaynak oluşturmaz ve Render hesabındaki dal/plan/yetki mevcudiyetini doğrulamaz; uygulamadan önce Render'ın kendi Blueprint kontrolünü de çalıştır.
