# V3 — Render ve gerçek AI kurulumu

Bu rehber hazırlık içindir. Kodun yazılması; push, merge, canlı deploy, Render kaynağı oluşturma veya OpenAI hesabı açma anlamına gelmez. Mevcut V2 servisini kapatmadan önce [veri geçişi rehberini](v3-veri-gecisi.md) uygula.

## 1. Mimari ve maliyet

V3, **Node Web Service + kalıcı PostgreSQL** gerektirir. Tek Node süreci web arayüzünü, `/api` uçlarını, açık artırma/oda zamanlayıcısını ve AI işçisini çalıştırır. Başlangıçta tek instance kullan.

- Web Service: `npm ci --include=dev && npm run typecheck && npm run build` → `npm start`.
- PostgreSQL: bakiye, ledger, sahiplik, aktarım, işler ve **üretilen PNG baytları** burada saklanır. Web Service'in geçici dosya sistemine görsel yazılmaz.
- Health check: `/api/health`.
- `NODE_ENV=production` iken `DATABASE_URL` olmadan uygulama başlamaz. PGlite yalnızca geliştirme/test içindir.

`render.yaml` bir adet `0.5c-512mb` Web Service ve `0.1c-256mb` / 15 GB PostgreSQL tanımlar. **Bunlar ücretsiz kaynak sözü değildir.** Oluşturma ekranındaki güncel ücretleri, disk ve yedekleme koşullarını incele. Otomatik disk büyütme kapalıdır; disk doluluk alarmı kur ve büyümeyi yönet. AI API harcaması ayrıca sunucu sahibine aittir; oyuncunun ödediği SC sağlayıcıya gerçek para olarak gitmez.

## 2. Güvenli yayın sırası

1. Her oyuncunun eski site adresinde V2 yedeğini almasını sağla. Eski adres çalışır durumda kalsın.
2. Değişiklikleri incele, testleri çalıştır; onayından sonra kodu GitHub üzerinden yayın akışına al. Blueprint `main` dalını hedefler; dosyalar o dalda bulunmadan bu kurulum çalışmaz.
3. Render'da **New → Blueprint** yoluyla `render.yaml` dosyasını seç. `skyline-platform` / `skyline-platform-db` isimleri aynı adlı mevcut kaynaklarla çakışıyorsa **oluşturmadan önce** isimleri ve tüm referanslarını değiştir. Aynı isimli mevcut kaynağı istemeden yeniden yapılandırma.
4. Admin kullanıcı adını ve en az 16 karakterli, benzersiz parolayı yalnızca Render'ın environment/secret alanlarında gir. Ad Minecraft biçiminde 3–16 karakterdir. Oyuncuların normal hesap şifresi en az 12 karakterdir.
5. Blueprint `DATABASE_URL` değerini veritabanından alır. DB dış erişimi `ipAllowList: []` ile kapalıdır; Web Service ve DB aynı Frankfurt bölgesindedir. Ortamları karıştırma.
6. İlk başlangıçta tablolar eklenir ve yalnızca sunucu sırrıyla ilk admin oluşturulur. Önceden aynı isimde normal oyuncu varsa otomatik admin yapılmaz; farklı bir yönetici adı seç.
7. Render URL'sinde `/api/health` yanıtını kontrol et. `/#platform/account` üzerinden admin girişi yap. Üretimde sarı **geliştirme/test verisi** banner'ı görünmemeli.
8. Önce test hesaplarıyla üretim-benzeri staging kontrolünü ve gerçek PostgreSQL yedekten dönüş provasını tamamla. Gerçek oyuncu aktarımını henüz başlatma.
9. Eski V2 linkini ve yedek alma imkanını koruyarak yeni merkezin bağlantısını paylaş. Aktarımı hesap hesap ilerlet.

Blueprint otomatik deploy'u `off` ile kapatır; ilk doğrulamadan sonra bilinçli olarak açabilirsin. Yeni kaynak adı farklı bir `.onrender.com` adresi oluşturabilir. Tarayıcı localStorage verisi bu adrese otomatik taşınmaz.

### Mevcut Render servisini elle yapılandıracaksan

Yalnızca Static Site ayarını değiştirmek backend oluşturmaz. Ayrı **Web Service** aç:

| Ayar                     | Değer                                                        |
| ------------------------ | ------------------------------------------------------------ |
| Runtime                  | Node                                                         |
| Build                    | `npm ci --include=dev && npm run typecheck && npm run build` |
| Start                    | `npm start`                                                  |
| Health                   | `/api/health`                                                |
| `NODE_ENV`               | `production`                                                 |
| `NODE_VERSION`           | `22.22.3`                                                    |
| `DATABASE_URL`           | Aynı bölgedeki kalıcı PostgreSQL'in iç bağlantı adresi       |
| `SKYLINE_ADMIN_USER`     | Güvenli yönetici adı                                         |
| `SKYLINE_ADMIN_PASSWORD` | En az 16 karakterli özel parola                              |
| `AI_ENABLED`             | Başlangıçta `false`                                          |

Render `PORT` ve `RENDER_EXTERNAL_URL` değişkenlerini sağlar; uygulama `0.0.0.0` üzerinde dinler. `PUBLIC_ORIGIN` yoksa `RENDER_EXTERNAL_URL` kullanılır. Özel alan adına geçersen `PUBLIC_ORIGIN=https://oyun.ornek.com` ayarla; yol veya birden fazla adres yazma. O adresten oynamalarını iste: yazma istekleri tam aynı kökenle sınırlandırılır. Tarayıcı koduna `localhost` API adresi ekleme.

## 3. AI'yi daha sonra etkinleştirme

**Anahtar yokken:** atölye ve SC teklif hesabı görülebilir; üretim düğmesi kapalıdır. Sunucu da kapalı üretimi reddeder; SC kesilmez, stok görsel veya sahte AI çıktısı sunulmaz. Ücretsiz sticker/kasa konsept editörü AI değildir.

1. Kendi OpenAI API hesabını/projeni oluştur, model erişimini doğrula. Gereken kuruluş doğrulamasını ve API faturalandırmasını tamamla. ChatGPT aboneliğinin API bakiyesi olduğunu varsayma.
2. Sağlayıcı panelinde harcama uyarılarını/bütçe kontrollerini aç. İlk denemede uygulama limitlerini düşük tut.
3. **Yalnızca Render environment alanına** `OPENAI_API_KEY` ekle. Sohbete, Git'e veya herhangi bir `VITE_*` değişkenine yazma.
4. `OPENAI_IMAGE_MODEL=gpt-image-1` varsayılandır. Adaptör `/v1/moderations` ve `/v1/images/generations` kullanır; 1024×1024 PNG, tek görsel, medium/high kalite ve `b64_json` yanıtı bekler. Başka model seçersen aynı sözleşmeyi staging'de doğrula.
5. Önce `AI_DAILY_USER_LIMIT=1`, `AI_DAILY_GLOBAL_LIMIT=1`, sonra `AI_ENABLED=true` ayarla ve yeniden başlat.
6. Tek onaylı test hesabına, nedenini yazarak sınırlı SC ver. Teklifi kontrol edip **bilinçli tek bir gerçek ücretli üretim** çalıştır. Bu adım bu geliştirme çalışmasında yapılmadı.
7. Görselin gerçekten üretildiğini, yenilemede kaldığını, envanterde taslak olduğunu, moderasyon öncesi satılamadığını ve onaydan sonra diğer hesapça alınabildiğini kontrol et. Sağlayıcı kullanım kaydını işle eşleştir.
8. Bundan sonra limitleri ihtiyacına göre artır. Varsayılanlar kişi başı 3/gün, toplam 20/gün; gün başlangıcı UTC'dir. Başarısız ücretli denemeler de günlük kotaya sayılır.

### SC üretim tarifesi (`sc-2026-09-v1`)

| Bileşen                                              |        Tutar |
| ---------------------------------------------------- | -----------: |
| Temel üretim                                         |    10.000 SC |
| İlkinden sonraki her cümle                           |    +1.500 SC |
| İlk 160 karakterden sonraki her 160 karakterlik blok |    +1.000 SC |
| Seçilen her detay (en çok 4)                         |    +2.500 SC |
| Yüksek kalite                                        |   +15.000 SC |
| Orta kalite                                          | Ek ücret yok |

Açıklama 20–1.200, eser adı 3–64 karakterdir. Sunucu teklifi 15 dakika geçerlidir, kullanıcıya bağlıdır ve tek kez işe çevrilebilir. Örnek: tek cümle, 160 karakteri aşmayan açıklama, iki detay, orta kalite = **15.000 SC**. Satış fiyatını oyuncu ayrıca belirler; bu hesap bir satış/kazanç garantisi değildir.

### Hata, zaman aşımı ve sağlayıcı faturası

- Geçerli iş + SC kesintisi aynı veritabanı işleminde oluşur. Hatalı form, kapalı AI, yetersiz bakiye, bitmiş kota veya geçersiz teklif SC kesmez.
- Moderasyon reddi, API hatası veya bozuk PNG: iş başarısız olur, SC bir kez iade edilir.
- Moderasyon 30 sn, üretim 150 sn istemci zaman aşımına sahiptir. Sunucu yeniden başlarsa çalışıyor görünen 10 dakikadan eski işler / 30 dakikadan eski bekleyen işler kurtarma sırasında iade edilir. DB erişimi kesikse kurtarma DB geri geldiğinde işler.
- **Ücretli API çağrısı otomatik tekrar edilmez.** Sağlayıcı, bağlantı kesilmeden önce üretimi faturalandırmış olabilir. Harici sağlayıcı faturasında tam “exactly once” garantisi yoktur. Yerel SC iadesi, API sağlayıcısından gerçek para iadesi anlamına gelmez.
- İade edilmiş işe geç gelen yanıt yeni eşya basamaz. Operatör, belirsiz sağlayıcı faturalarını kendi panelinden uzlaştırmalıdır.

## 4. Hesap ve operasyon güvenliği

- Kayıt olan isim tek başına Minecraft hesap sahipliği kanıtı değildir. Sunucu sahibi bağımsız doğrulamadan sonra hesabı onaylar. V2'deki “admin” etiketi yeni sunucuda yetki vermez.
- Yeni kullanıcılara otomatik başlangıç SC'si verilmez. Admin tahsislerinde neden ve benzersiz işlem kimliği işlem defterine yazılır; aktarım aynı fonların ikinci kopyası olarak tekrar verilmemelidir.
- Admin bootstrap değişkenleri **ilk oluşturma** içindir; mevcut adminin parolasını bir deploy'da sessizce değiştirmez. Parolayı güvenli parola yöneticisinde sakla.
- Şifre kaybında otomatik/e-postalı kurtarma yoktur. Kimlik doğrulamasından sonra sunucu operatörü `scripts/reset-password.ts` aracını, rehberdeki doğrulama değişkenleriyle çalıştırabilir. Araç yalnızca parola hash'ini yeniler, oturumları iptal eder ve audit kaydı yazar; para/eşya değişmez.
- PostgreSQL yedeği tüm envanter/görsellerin asıl felaket kurtarma yedeğidir. Kullanıcı JSON dışa aktarımı bunun yerine geçmez. Ayrıntılar [veri geçişi rehberinde](v3-veri-gecisi.md).

### Yetkili parola kurtarma aracı

Önce hesap sahipliğini doğrula ve doğru DB'ye bağlı olduğunu kontrol et. Sunucunun korumalı ortamına geçici olarak `SKYLINE_RESET_USER`, `SKYLINE_RESET_PASSWORD` (en az 16 karakter), `SKYLINE_RESET_REASON` (kimlik kontrol referansı, en az 12 karakter) ve `SKYLINE_RESET_CONFIRM=YES` ekle. `SKYLINE_ADMIN_USER` kayıtlı, onaylı bir admin olmalıdır.

```bash
npm run account:reset-password
```

Bunlar komut satırına veya sohbete düz metin parola yazma talimatı değildir: Render'ın gizli environment alanlarını/parola yöneticini kullan. İşlem sonrası geçici reset değişkenlerini kaldır. Adminin kendi parolasını sıfırladıysan bootstrap parola değişkenini de güvenli yeni değeriyle güncelle. Yerelde `.env` kullanacaksan `node --env-file=.env --import tsx scripts/reset-password.ts` çalıştır ve **önce aynı PGlite dizinini kullanan API'yi durdur**.

## 5. Kontrol sınırları

Yerel geliştirmede domain/HTTP, çok kullanıcılı tarayıcı ve PWA offline kontrolleri bulunur. **Gerçek OpenAI üretimi, üretim PostgreSQL yük/çok instance testi ve gerçek Android/iOS yükleme deneyimi canlı yayından önce ayrıca doğrulanmalıdır.**

Resmi referanslar:

- [Render Blueprint tanımı ve doğrulama](https://render.com/docs/blueprint-spec)
- [Render PostgreSQL yedekleri](https://render.com/docs/postgresql-backups)
- [OpenAI görsel üretim API'si](https://developers.openai.com/api/reference/resources/images/methods/generate)
