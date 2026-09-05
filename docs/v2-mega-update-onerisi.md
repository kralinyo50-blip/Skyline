# V2.0 MEGA GÜNCELLEME — Teklif (Onay Bekliyor)

> Bu doküman repo geleneği gereği (**bkz. `docs/yeni-skinler-kasalar-onerisi.md`**)
> uygulama öncesi hazırlanmıştır. Sen "onaylıyorum" ya da "şunu değiştir / şunu
> çıkar" dedikten sonra kod tarafına geçilir.
>
> Kapsam, isteğinle birebir aynı iki başlık: **(1) Daha fazla oyun**,
> **(2) Özelleştirme tarzında güzel şeyler.** Bu iki başlığın dışına
> (ekonomi dengesi, kasa havuzları, admin paneli) bilinçli olarak dokunulmuyor.

---

## 0. Mevcut Durum (koddan doğrulandı)

| Öğe | Durum |
|---|---|
| Mini oyun ("Oyunlar" sekmesi) | **9** — Coinflip, Crash, Rulet, Mines, Dice, Blackjack, Plinko, Wheel, Limbo (`GamesView.tsx` + `ExtraGames.tsx` + `MoreGames.tsx`) |
| Diğer modlar | Kasa açma (30 kasa), Upgrader, Kasa Savaşı, Jackpot |
| Özelleştirme | Sticker Studio (5 şekil × 4 efekt), skinlere sticker yapıştırma (slot + değer bonusu), wear/float + StatTrak™/Hatıra varyantları, 4 seçenekli tercih menüsü, VIP 24 kademe |
| İlerleme | Sezon yolu (40 sv), misyonlar, başarımlar, topluluk/liderlik |
| Sürüm görünürlüğü | Footer `v1.0` · güncelleme logu en üst `v2.3` (bkz. Faz 5) |

Yeni oyunların tamamı `GamesView.tsx`'teki mevcut oyun soketine
(`GameProps { bet, onStart, onEnd }`) takılır → misyonlar
(`trackMission("games")`), başarımlar ve sezon XP'si **ilk günden çalışır**.

---

## 1. YENİ OYUNLAR — 6 ana + 2 yedek

### 1.1 🎯 Keno — `Orta`
40 sayıdan 1–10 tanesini işaretle, 10 çekiliş yapılır; tuttudukça çarpan
katlanarak büyür. Örnek ödeme (5 seçim): 3 tutuş ×2,5 · 4 tutuş ×12 ·
5 tutuş ×60 (hedef RTP ~%96). "Az seçim = sık küçük kazanç, çok seçim =
jackpot kovalama" hissi verir; UI'ı tamamen mevcut tema ile uyumlu.

### 1.2 🗼 Kule (Towers) — `Orta`
Stake tarzı dikey tırmanış: her katta 4 karodan güvenli olanı seç, 12. kata
kadar çık, istediğin katta cashout. Mayın sayısı seçilebilir (1/2/3) →
kat çarpanı ≈ ×1,29 / ×1,94 / ×3,88 (％3 ev payıyla). Mines'ın "bir tur daha"
bağımlılığını dikey eksene taşır; cashout gerilimi crash'in psikolojisi.

### 1.3 🃏 Hilo (Zincir Kart) — `Küçük`
Açılan karttan sonrakinin **yüksek / düşük / eşit** olacağını tahmin et;
her doğru zincirleme çarpanı büyütür (çarpan = 0,97 / olasılık, Stake Hilo
mantığı), 12 zincire kadar, istediğin yerde cashout. En düşük eforlu ama
"elde giderken bozduramama" gerilimi en yüksek oyun.

### 1.4 🎰 Skyline Slots — `Orta`
3 makaralı, skin temalı slot: 🪙 (×1,8) · 🔪 (×3) · AWP (×8) · Dragon (×25) ·
SKYLINE logosu (×100 jackpot). Üçlü hizalama öder; 3 logo = mega jackpot +
confetti. Sitede "kumarhane ambiyansı" var ama gerçek bir slot yoktu —
bu boşluğu kapatır, chat rail'e jackpot duyurusu düşer.

### 1.5 🎟️ Kazı Kazan — `Orta`
Üç kademe bilet: 500₺ / 5.000₺ / 50.000₺. 3×3 grid, 3 aynı sembol = ödül;
ödüller **coin + gerçek skin düşüşü** (kasa havuzlarından). Kazıma animasyonu
(canvas/CSI tarzı). Skin ekonomisiyle en doğal bağlanan oyun: "biletti kazı,
Karambit çıktı" anı V2.0'ın paylaşım malzemesi.

### 1.6 🏇 Derby (Canlı Yarış Bahisleri) — `Büyük`
6 bot koşucu, forma geçmişiyle belirlenen oranlar (×2,2 – ×15); kazanır /
tabelaya girer (yarı oran) bahsi. ~8 saniyelik canlı yarış animasyonu,
son foto finiş, chat rail'de yarış hype'ı. Topluluk hissi veren tek
"seyircili" oyun — jackpot gibi kalabalık heyecanı yaratır.

**Yedek kulübesi** (listeden çıkarılan olursa yerine): Video Poker
(Jacks or Better ödeme tablosu), Bakara.

---

## 2. ÖZELLEŞTİRME PAKETİ

> Depolama kuralı (v2.3 senkron dersinden): cihaza özel olanlar `prefs.ts`'de
> (tema, efekt), **kimliğe ait olanlar `Account` alanında** (senkronla her
> cihazda aynı görünür).

### 2.1 Profil & Kimlik
- **Profil kartı:** kapak banner'ı (10 desen/gradyan), çerçeve rengi
  (nadirlik/VIP), **ünvan sistemi** ("Kasa Efsanesi", "Neon Baron",
  "Sezon Şampiyonu"…) — başarımdan kazanılır + dükkandan satın alınır,
  avatar paketi (üretilmiş avatar seti).
- **Nameplate:** chat rail ve liderlikte isim rengi/gradyanı + ismin yanında
  animasyonlu rozet; gradyanlar VIP kademesiyle açılır.
- **Vitrin:** profiline en iyi 5 skin'ini sabitle, sıralaması senin.

### 2.2 Skin Derin Özelleştirme
- **Name Tag:** skin'i yeniden adlandır (CS tarzı: `★ Karambit | "Efsane"`),
  envanter/pazar/detail modal her yerde görünür.
- **StatTrak™ Dönüştürücü:** dükkandan alınan tek kullanımlık item ile herhangi
  bir skin'i StatTrak'a çevir; sayaç kasa açılışlarında işler.
- **Float / Pattern Re-roll:** ücret karşılığı float'u aynı wear kademesinde
  (veya seçimle serbest) yeniden çek, **önizlemeden sonra onayla**.
- **Sticker Studio v2:** şekil 5→10, gradyan zeminler, emoji/ikon katmanı,
  4 font, canlı "silah üzerinde" önizleme; 5. sticker slotu VIP ayrıcalığı.

### 2.3 Site Deneyimi
- **Tema sistemi:** 6 renk teması (Gece · Kan · Neon · Altın · Okyanus · Gül)
  CSS değişkenleriyle; header, butonlar, kasa parlaması, çarpan renkleri
  değişir; tercihlerde saklanır.
- **Kasa açılış FX seçici:** 4 konfeti/efekt paketi (Altın Yağmuru, Neon
  Patlama, Taç Yaprakları, Sakin) + makara sesi paketi.
- **Emote paketi:** chat rail'e 12 emote + **kendi sticker'ını emote yapma**.

### 2.4 İmza Özellik: "Kendi Kasanı Kur" 🏗️
Oyun × özelleştirme kesişimi — V2.0'ın vitrin özelliği:
katalogdan/envanterden 6–12 skin seç, kasaya isim + renk ver, fiyat mevcut
formülle otomatik (**beklenen değer × 1,3**), paylaşım kodu üret; topluluk
kodunla kasayı açabilir. Sticker Studio'nun "kendi içeriğini yap" felsefesinin
kasa boyutu.

---

## 3. V2.0 PAKETLEME (Faz 5)

- **Sürüm hikâyesi:** footer hâlâ `v1.0` derken log `v2.3`'te. Öneri: logdaki
  `v2.0–v2.3` girdilerini `v1.6–v1.9` olarak yeniden numarala (halka açık
  zaman çizelgesi footer'da 1.x'ti), tepeye **v2.0 "MEGA"** girdisi ekle,
  footer'ı `v2.0` yap. İstersen alternatif: eski girdilere dokunmadan mega
  girdiyi `v2.4` diye ekle — senin kararın.
- Giriş ekranına **V2.0 splash rozeti** + EventBanners'a tanıtım şeridi.
- Yeni oyunlar/başarımlar için **~8 başarım + 4 misyon**, sezon XP kaynağı
  olarak yeni oyunların bağlanması.

---

## 4. UYGULAMA PLANI — 5 Faz

| Faz | İçerik | Dokunulan yerler | Boy |
|---|---|---|---|
| 1 | Keno, Kule, Hilo + oyun hub'ında kart/rozet yenileme | 3 yeni component + `GamesView.tsx` | O |
| 2 | Slots, Kazı Kazan, Derby | 3 yeni component + `liveEvents` duyuruları | O/B |
| 3 | Tema sistemi, profil kartı, nameplate, vitrin | `prefs.ts`, `Account`/`sync`, `Header`, `StatsView`, `CommunityView` | O |
| 4 | Name tag, StatTrak dönüştürücü, float re-roll, Sticker Studio v2 | `ItemDetailModal`, `InventoryView`, `stickers.ts`, `shop.ts` | O |
| 5 | Kendi Kasanı Kur, emote'lar, V2.0 paketleme (splash/banner/log/başarım) | `CasesView`, `ChatRail`, `updateLog.ts`, `Footer`, `LoginView` | B |

Her fazın sonunda `npx tsc --noEmit` + `npm run build` temizliği doğrulanır;
fazlar tek tek commit'lenir (dal: `arena/01a070db-skyline`).

---

## 5. HIZLI SEÇİM MENÜSÜ

| # | Özellik | Başlık | Boy |
|---|---|---|---|
| 1 | Keno | Oyun | O |
| 2 | Kule (Towers) | Oyun | O |
| 3 | Hilo | Oyun | K |
| 4 | Skyline Slots | Oyun | O |
| 5 | Kazı Kazan (skin ödüllü) | Oyun | O |
| 6 | Derby (yarış bahsi) | Oyun | B |
| 7 | Profil kartı (banner/çerçeve/ünvan/avatar) | Özelleştirme | O |
| 8 | Nameplate (isim rengi + rozet) | Özelleştirme | K |
| 9 | Vitrin (5 skin sabitleme) | Özelleştirme | K |
| 10 | Name Tag | Özelleştirme | K |
| 11 | StatTrak™ Dönüştürücü | Özelleştirme | O |
| 12 | Float/Pattern re-roll | Özelleştirme | O |
| 13 | Sticker Studio v2 | Özelleştirme | O |
| 14 | 6 renk teması | Özelleştirme | O |
| 15 | Kasa açılış FX seçici | Özelleştirme | K |
| 16 | Emote paketi | Özelleştirme | K |
| 17 | Kendi Kasanı Kur | İmza | B |

---

## 6. ONAY

"Onaylıyorum" → faz sırasıyla uygulanır. Ya da menüden seç:
"1, 2, 5, 7, 14 ve 17'yi yap", "Derby yerine Video Poker", "önce faz 3"…
**Liste bir menüdür; seçim ve sıra senin.**

---

## 7. UYGULAMA GÜNCESİ (2026-09-05)

| Commit | Faz | İçerik |
|---|---|---|
| `ca3124d` | 1-2 | 6 yeni oyun: Keno, Kule, Hilo, Slots, Kazı Kazan, Derby |
| `5c437db` | 3a | 6 renk teması + konfeti paketi seçici |
| `32bb89f` | 3b | Kimlik kiti (banner/çerçeve/ünvan/avatar/isim rengi) + vitrin 5 slot |
| `de7eebe` | 4 | Skin atölyesi: Name Tag, float re-roll, StatTrak™ dönüştürücü |
| `58ff952` | 4b | Sticker Studio v2 (9 şekil, gradyan, emoji, 3 font) |
| `67ff47e` | 5a | Paketleme: v2.0 sürüm hikâyesi, mega log, 6 yeni misyon |
| `4d1bad8` | 5b | Kendi Kasanı Kur + sohbet emote şeridi |

Sapmalar: başarım eklenmedi (misyonlar eklendi); "kendi stickerını emote yapma"
yerine 12'li hazır emote şeridi geldi; Derby atları emoji ile temsil ediliyor.

*Tarih: 2026-09-05 · Dal: `arena/01a070db-skyline` · Durum: **UYGULANDI** ✅*
