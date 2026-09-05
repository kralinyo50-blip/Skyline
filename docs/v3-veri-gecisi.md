# V3 — Parayı ve eşyaları koruyarak geçiş

## Değişmez kurallar

1. **Eski `skyline:v1` kaydını silme, sıfırlama veya yeni boş kayıtla değiştirme.** Tarayıcı/site verilerini temizleme.
2. Site adresi değişmeden önce eski adresten ham yedek al. Farklı `.onrender.com`, alan adı, protokol veya port farklı tarayıcı depolaması demektir.
3. Yedek bir **beyandır**, tek başına güvenilir bakiye kanıtı değildir. Sunucu, localStorage'dan gelen parayı doğrudan kabul etmez.
4. Aktarım açık kullanıcı onayı + bağımsız yetkili incelemesi + tek seferlik kayıt ile yapılır. Ters yönde veya otomatik sürekli eşitleme yoktur.
5. Onaylanan para/eşya sunucu tarafında bir kez eklenir. Aynı istek veya eski eşya kimliği tekrar kazanç üretemez.

## Oyuncu adımları

### A. Eski adresi koru ve yedekle

Yeni arayüz eski adreste yayımlanmışsa üstteki **V2 yedeği indir** bağlantısını kullan. Oturum açmak gerekmez. İndirilen zarf `schema: skyline-v2-backup-v1`, kaynak adresi, tarih ve **orijinal string'i birebir taşıyan `raw`** alanını içerir. Yedek için V2'nin temizleme/normalize etme fonksiyonu çağrılmaz.

**Eski adreste henüz yedek düğmesi yoksa:** adresi kapatma. Güvendiğin kendi cihazında tarayıcı geliştirici araçlarının **Application / Storage → Local Storage → eski sitenin adresi** bölümünü aç. `skyline:v1` değerinin tamamını, baş/son karakterlerini değiştirmeden UTF-8 `.json` dosyasına kaydet. Dosyanın yalnızca bu değeri içerdiğinden ve JSON olarak okunabildiğinden emin ol. Console'a kaynağını bilmediğin kod yapıştırma. Eski sitede bir tur oynayarak veya hesabı yeniden oluşturarak “düzeltmeye” çalışma.

- Yedeğin en az iki özel kopyasını sakla. Aynı tarayıcıdaki diğer oyuncuların kayıtlarını/özel ayarlarını içerebilir; galeriye veya genel sohbete yükleme.
- Tarihi, eski URL'yi, görünen SC'yi ve önemli eşyalarını not et. Ekran görüntüleri yardımcıdır ama tek başına sahiplik ve bakiye doğrulaması değildir.
- Önceden kaydın varsa yeni adreste 0 SC görmek, eski kaydın silindiği anlamına gelmez. Yeni sunucu hesabı henüz onaylı aktarım almamıştır.

### B. Güvenli hesap ve talep

1. Yeni merkezde `/#platform/account` aç, **eski Minecraft adıyla aynı isimde** güvenli hesap oluştur. Bu yeni şifre V2 kullanıcı adı girişinden ayrıdır.
2. Aynı kökende V2 kaydın varsa ekran sadece seçili hesabın beyanını okur. Farklı adresteysen yedek JSON dosyasını seç. Dosya seçimi mevcut localStorage'ı **üzerine yazmaz**.
3. Gösterilen eski ad, bakiye ve eşya sayısını yedeğinle karşılaştır. Tanınmayan özel eşyalar uyarıyla belirtilir; gizlice atılmaz.
4. Yedeğini sakladığına ve geçiş koşullarına ilişkin kutucuğu onayla, **İnceleme için aktarım talebi gönder** düğmesine bas.
5. Yalnızca seçili hesabın adı, beyan edilen bakiye ve envanteri sunucuya gider; tüm yerel veritabanı/diğer kullanıcılar gönderilmez.

Yükleme sınırı 20 MB, API JSON sınırı 2 MB, aktarım envanteri sınırı 5.000 öğedir. Daha büyük/okunamayan dosyaları küçültmek için eşya silme. Orijinali sakla; operatörle, bu sınırlara uygun ayrı ve denetlenebilir aktarım planı yap.

### C. İnceleme tamamlandığında

Hesap ekranı **onaylanan SC ve seçilmiş eşya sayısını** gösterir. Bunlar beyanla farklıysa nedenini yetkiliyle uzlaştır. Sunucu işlem geçmişinde aktarım satırını kontrol et, envanterini ve tam JSON dışa aktarımını sakla.

V2 tek ortak tarayıcı belgesindeki tüm kullanıcıları yüklerken değiştirebildiği için, belgedeki **bir hesap onaylandığında ortak belge V2 arşiv görünümüne alınır**. Başka yerel kullanıcı adı seçmek veya başka sekmede oturum değiştirmek bu belgeyi tekrar oynanabilir hale getirmez. Bu kilit V2 kayıtlarını koruyan yardımcı bir tarayıcı işaretidir; asıl tekrar aktarım engeli sunucu veritabanındadır.

Diğer yerel hesapların kayıtları kaybolmaz. Aynı yedekten, kendi güvenli hesaplarında ayrı inceleme başlatabilirler. Eski mini oyunların tamamı henüz sunucu cüzdanına taşınmadığı için arşivlenmiş SC'yi bu oyunlarda yeniden harcama yolu yoktur. **V2 ile V3 bakiyelerini toplayan otomatik bonus veya V2 kazançlarını sürekli yükleme özelliği yoktur.**

## Yetkili incelemesi

Kontrol odasında sırayla:

1. Yeni hesabın gerçek sahibini doğrula. İsim eşleşmesi yeterli değildir; örneğin daha önceden bilinen sunucu üyeliği ve güvenilir yönetim kayıtlarıyla ilişkilendir.
2. Beyan edilen bakiyeyi bağımsız kayıt/yedek/işlem kanıtıyla karşılaştır. V2 istemci tarafında olduğundan geçmiş için kriptografik doğruluk geriye dönük üretilemez. Doğrulanamayanı otomatik onaylama.
3. **Doğrulanmış SC** alanını kendin doldur. En fazla iki ondalık basamak, 0–9.000.000.000.000 SC desteklenir. Hesabın mevcut bakiyesi + iade edilebilir blokeleri de toplam sınıra uymalıdır.
4. Yalnızca sahipliği doğrulanmış, kataloğa uyan eski eşya UID'lerini seç. Skin kimliği yanında mevcut `float`, sticker listesi, özel ad ve zaman bilgisi taşınır. SC tutarı ve item UID listesi için inceleme notu gir.
5. Bilinmeyen `gen-*`, özel oyuncu kasaları, tarihsel seviye/VIP/görev/diğer V2 ayarlarını katalog öğesine uydurup otomatik basma. Bunlar ham yedekte kalır; bu sürümde hepsinin yeni merkezde çalışması sağlanmış değildir. Gerekirse ayrı, belgeli bir uzlaştırma kararı al.
6. Kararı kullanıcıyla karşılaştır, sonra onayla. İşlem bir transaction içinde SC ledger kaydı, seçili eşya sahiplikleri ve kullanılmış aktarım işaretini yazar. Bir parça başarısızsa tümü geri alınır.
7. Kullanıcının sunucu envanterini ve ledger'ını kontrol et. Yanlış karar varsa eski aktarım işaretini silerek tekrar başlatma. Yedek ve audit ile, ayrı yetkili düzeltme işlemi planla; tekrar aktarım çift ödeme yaratmamalı.

## Sunucu yedekleri

Üretimde doğru yedek **PostgreSQL'in tüm veritabanıdır**: SC, ledger, transfer kilitleri, bekleyen teklifler, işler, tasarımlar ve PNG `bytea` verileri birlikte korunmalıdır. Hesap dışa aktarım JSON'u finansal felaket kurtarma yedeği değildir ve tüm görsel baytlarını içermez.

- Render'ın planına uygun otomatik yedek/geri yükleme imkanını etkinleştir ve izleme kur. Başarılı yedeğin geri yüklenebildiğini ayrı test DB'sinde doğrula.
- En az günlük ve her canlı sürüm öncesi yedek al. Saklama süresini ve şifreli dış kopyayı sahiplen; geçici Web Service diski veya `.cache` kalıcı yedek değildir.
- Parolaları, bağlantı URL'lerini, kullanıcı dosyalarını veya dump'ları Git'e ekleme. Oyuncu JSON'larını herkese açık `public/` altına koyma.

PostgreSQL istemci araçları olan yetkili bir ortamda alternatif özel dump:

```bash
# DATABASE_URL güvenli ortamdan gelir. Shell trace açma; URL'yi loglama.
mkdir -p .cache/backups
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner \
  --file=".cache/backups/skyline-$(date +%Y%m%d-%H%M%S).dump"
```

Bu dosyayı hemen kalıcı, şifreli ve erişimi sınırlı yedek konumuna taşı. DB dış erişimi Blueprint'te kapalıdır; işlemi iç ağdaki yetkili ortamda yap veya geçici yalnızca-kendi-IP erişimini ayrıca yönet. `0.0.0.0/0` açarak yedek sorununu çözme.

Geri dönüş provası **ayrı ve boş test DB'sine** yapılır:

```bash
# RESTORE_TEST_DATABASE_URL kesinlikle canlı DB adresi olmamalı.
pg_restore --dbname="$RESTORE_TEST_DATABASE_URL" --no-owner --no-privileges \
  .cache/backups/SECILEN_YEDEK.dump
```

Restore komutunu canlı bağlantıyla çalıştırma; `--clean`, `DROP` veya `TRUNCATE` ekleme. Restore edilen ortamda API anahtarını kaldır, `AI_ENABLED=false` bırak, dış erişimi sınırla. Restore edilen oturumları iptal etmeyi ve geçmiş bekleyen işleri/escrow'u uzlaştırmayı planla.

## Geri alma / kesinti

- Arayüz sürümünü geri almak, ledger'ı veya veritabanını geriye sarma izni değildir. Sunucu SC'si, sahiplik ve tek seferlik aktarım kayıtları korunmalıdır.
- AI sorunuysa önce `AI_ENABLED=false` yap. Kapalı/yarım işler körlemesine sağlayıcıya tekrar gönderilmez. Zaman aşımı kurtarmasını ve sağlayıcı faturalarını kontrol et.
- Tam DB geri yüklemesi gerekiyorsa finansal yazmaları durdur, o anın ayrıca yedeğini al, son yedekten sonraki işlemleri uzlaştır. Önce staging'de prova yap.
- Tek tabloyu, sadece `accounts.balance` değerini veya eski bir tarayıcı kaydını yeni sunucu bakiyesinin üzerine kopyalama. Ledger, item sahipliği ve bloke rezervler birlikte tutarlı kalmalıdır.
- Eski V2 yedeğini güvenli merkezi “tamir etmek” için localStorage'a geri basma. Ham yedeği sakla; yetkili aktarım ve düzeltme protokolünü kullan.
