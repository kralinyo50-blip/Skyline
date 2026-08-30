# Yeni Skinler & Kasalar — Detaylı Teklif (Gözden Geçirme İçin)

> Bu doküman **uygulama öncesi** hazırlanmıştır. Sen "onaylıyorum" ya da
> "şunu değiştir" dedikten sonra kod tarafına geçerim. Tüm görseller
> **gerçek Steam CDN görselleri**dir (CSGO-API kataloğundan alındı), hiçbir
> AI/prosedürel görsel yok.

---

## 1. Mevcut Durum (Kısa Özet)

| Öğe | Sayı |
|---|---|
| Kasa / paket | 30 (kasa, sticker kapsülü, Hatıra paketi, temalı kasalar) |
| Skin kataloğu | ~2.000 gerçek Steam skin (baz + 1.947 katalog + 50 efsane) |
| StatTrak™ / Hatıra varyantları | Otomatik üretiliyor (×2.1 / ×1.55) |
| Zor çıkan skin zammı | Classified / Covert / Rare **+%15** (son güncelleme) |
| Kasa fiyatı | `beklenen değer × 1.3` otomatik hesaplanır |
| Pity | 5 açılışta yüksek kademe garantisi |

**Önemli bulgu:** Katalog aslında çok güncel — Kilowatt, Gallery ve Fever
kasalarındaki 17'şer skinin 15'i zaten oyunda. **Gerçekten eksik olan yalnızca
Zeus x27 ailesi (7 skin).** Yani "yeni skin" tarafında hedef küçük ve net;
"yeni kasa" tarafında ise eklenmemiş **3 gerçek kasa** var.

---

## 2. Yeni Skinler: Zeus x27 Ailesi (7 Adet)

2024'ten beri CS2'de olan ve oyunda **hiç bulunmayan** tek skin ailesi.
Gerçek Steam görsellerinin tamamı elimde (CSGO-API'den alındı).

| Skin | Nadirlik | Önerilen Ham Fiyat ($) | Oyundaki Fiyatı (SC) | Nereden çıkıyor (gerçek) |
|---|---|---|---|---|
| Zeus x27 \| Swamp DDPAT | Tüketici | 0.03 | **1.200** | — |
| Zeus x27 \| Electric Blue | Endüstriyel | 0.12 | **1.300** | — |
| Zeus x27 \| Earth Mandala | Mil-Spec | 0.50 | **1.500** | — |
| Zeus x27 \| Charged Up | Kısıtlı | 2.50 | **2.600** | Austin/Budapest 2025 Hatıra |
| Zeus x27 \| Tosai | Kısıtlı | 3.50 | **3.000** | Fever Case |
| Zeus x27 \| Olympus | Gizli | 10.00 | **9.200** | Kilowatt Case |
| Zeus x27 \| Dragon Snore | Gizli | 25.00 | **15.500** | Budapest 2025 Hatıra (Overpass) |

Notlar:
- Fiyatlar, katalogdaki **gerçek Steam market fiyatlarına yakın** tahminlerdir
  (sistem sandbox'tan Steam market'e erişemiyor; onaylarsan ham değerleri
  senin verdiğin numaralarla değiştiririm).
- Classified/Covert olanlar **+%15 zam kuralına otomatik uyar** (tıpkı diğer
  zor çıkanlar gibi).
- StatTrak™ (milspec+ için ×2.1) ve Hatıra (×1.55) varyantları otomatik
  üretilir; kasadan %10 StatTrak sürprizi bu skinlerde de çalışır.
- Zeus x27 ayrıca `weaponCats.ts`'de zaten tanımlı (Equipment), yani pazar,
  jackpot botları ve kasa havuzlarına sorunsuz girer.

---

## 3. Yeni Kasalar: 3 Gerçek Kasa

Bunlar CS2'de son çıkan ama oyunda **henüz olmayan** 3 gerçek kasa.
Kasa görselleri de gerçek Steam CDN'den (kasaların kendi resmi görselleri).

> Tüm kasalarda nadirlik oranları oyundaki standart sistemle aynı olacak:
> **Mil-Spec %80.13 · Kısıtlı %16.02 · Gizli %3.21 · Covert %0.64**
> (Bıçak yok — gerçek CS kasası gibi. İstersen rare havuzu da ekleyebilirim, aşağıda opsiyon var.)

### 3.1 Kilowatt Case (2024) — Önerilen Fiyat ~2.600$

| Kademe | İçerik | Kademe Şansı |
|---|---|---|
| Mil-Spec (7) | Dual Berettas \| Hideout · MAC-10 \| Light Box · Nova \| Dark Sigil · SSG 08 \| Dezastre · Tec-9 \| Slag · UMP-45 \| Motorized · XM1014 \| Irezumi | %80.13 |
| Kısıtlı (5) | Glock-18 \| Block-18 · M4A4 \| Etch Lord · Five-SeveN \| Hybrid · MP7 \| Just Smile · Sawed-Off \| Analog Input | %16.02 |
| Gizli (3) | **M4A1-S \| Black Lotus** · **Zeus x27 \| Olympus** (YENİ) · **USP-S \| Jawbreaker** | %3.21 |
| Covert (2) | **AWP \| Chrome Cannon** · **AK-47 \| Inheritance** | %0.64 |

### 3.2 Gallery Case (2024) — Önerilen Fiyat ~2.500$

| Kademe | İçerik | Kademe Şansı |
|---|---|---|
| Mil-Spec (7) | USP-S \| 27 · Desert Eagle \| Calligraffiti · MP5-SD \| Statics · AUG \| Luxe Trim · M249 \| Hypnosis · R8 \| Tango · SCAR-20 \| Trail Blazer | %80.13 |
| Kısıtlı (5) | M4A4 \| Turbine · Dual Berettas \| Hydro Strike · MAC-10 \| Saibā Oni · P90 \| Randy Rush · SSG 08 \| Rapid Transit | %16.02 |
| Gizli (3) | AK-47 \| The Outsiders · P250 \| Epicenter · UMP-45 \| Neo-Noir | %3.21 |
| Covert (2) | Glock-18 \| Gold Toof · M4A1-S \| Vaporwave | %0.64 |

### 3.3 Fever Case (2025) — Önerilen Fiyat ~2.800$

| Kademe | İçerik | Kademe Şansı |
|---|---|---|
| Mil-Spec (7) | M4A4 \| Choppa · MAG-7 \| Resupply · SSG 08 \| Memorial · P2000 \| Sure Grip · USP-S \| PC-GRN · MP9 \| Nexus · XM1014 \| Mockingbird | %80.13 |
| Kısıtlı (5) | Desert Eagle \| Serpent Strike · **Zeus x27 \| Tosai** (YENİ) · Nova \| Rising Sun · Galil AR \| Control · P90 \| Wave Breaker | %16.02 |
| Gizli (3) | AK-47 \| Searing Rage · Glock-18 \| Shinobu · UMP-45 \| K.O. Factory | %3.21 |
| Covert (2) | FAMAS \| Bad Trip · **AWP \| Printstream** | %0.64 |

**Fiyat hesabı (oyunun kendi formülüyle):** `beklenen değer × 1.3`
→ Kilowatt 2.600$, Gallery 2.500$, Fever 2.800$. Yani mevcut Snakebite /
Revolution bandına oturur, ekonomiyi bozmaz. (Gift paketi 4.200$ değerinde
sabit kalır, ona dokunulmaz.)

Sayısal beklenti değeri tablosu (hesapladım):

| Kasa | Mil-Spec ort. | Kısıtlı ort. | Gizli ort. | Covert ort. | EV | Fiyat |
|---|---|---|---|---|---|---|
| Kilowatt | 1.486 | 1.800 | 10.633 | 25.650 | 1.985 | **2.600** |
| Gallery | 1.429 | 1.840 | 8.767 | 16.950 | 1.830 | **2.500** |
| Fever | 1.600 | 2.540 | 7.833 | 28.450 | 2.123 | **2.800** |

---

## 4. İsteğe Bağlı Ekstralar (Sen Seç)

### 4.1 Zeus Kasası (tamamen yeni temalı kasa)
Sadece Zeus ailesinden oluşur, "yeni skin" deneyimini öne çıkarır:
- Tüketici %31.95 · Endüstriyel %22.82 · Mil-Spec %36.48 · Kısıtlı %7.29 · Gizli %1.46
- EV 1.612 → **önerilen fiyat 2.500$** (toplam 7 eşya; odds'lar yukarıda)
- Artı: eğer istenirse **rare kademesine 1-2 efsane bıçak** eklenebilir
  (kasa %0.04 bıçak şansına kavuşur, fiyat ~4.500-5.000$'a çıkar).

### 4.2 Cologne 2026 Sticker Kapsülü (güncel Major)
CSGO-API'de şu an en güncel Major kapsülü var (Cologne 2026). İstersen
sticker tarafını da güncelleriz — ama sen **skin + kasa** istediğin için
bunu opsiyonel bırakıyorum.

### 4.3 Yeni Kasa Sıralaması & Rozetler
- Yeni 3 kasa katalogda "Yeni" rozetiyle en üste, sıcaklık (hot) etiketiyle
  öne çıkarılabilir.
- Kasa açılış akışında değişiklik gerekmez — mevcut motor (roll/sav/celebration)

---

## 5. Ekonomi & Uyum Kontrolleri

| Konu | Durum |
|---|---|
| +%15 zor skin zammı | Zeus Classified/Covert otomatik dahil ✓ |
| Pity (5 açılış garantisi) | Yeni kasalarda da geçerli (covert garantisi) ✓ |
| StatTrak sürprizi %10 | Otomatik ✓ |
| Pazar (satın alma / satış) | Zeus dahil tüm skinler otomatik pazarda ✓ |
| Jackpot botları | Zeus skinleri nadir havuzuna karışabilir ✓ |
| Hediye Paketi (4.200$) | İçeriği katalogdan geliyor → Zeus da düşebilir ✓ |
| Kasa fiyat dengesi | EV formülüyle otomatik, ekonomiyi şişirmez ✓ |

---

## 6. Uygulama Planı (Onay Sonrası)

1. `src/data/extraSkins.ts`'e 7 Zeus skin satırı eklenir
   (id, silah, desen, gerçek Steam görsel hash, nadirlik, ham fiyat).
2. `src/data/cases.ts`'e 3 gerçek kasa + (istersen) Zeus Kasası tanımı
   eklenir — içerikleri yukarıdaki tablolardan, gerçek kasa görselleriyle.
3. `tsc` + production build testi (yeşil olmadan commit yok).
4. Commit + push (Render otomatik deploy).

---

## 7. Karar Tablosu (Cevabını İşaretle Ve Gönder)

| # | Öneri | Evet / Hayır / Değiştir |
|---|---|---|
| 1 | 7 Zeus x27 skin eklensin (fiyatlar tablodaki gibi) | ☐ |
| 2 | Kilowatt Case eklensin (2.600$) | ☐ |
| 3 | Gallery Case eklensin (2.500$) | ☐ |
| 4 | Fever Case eklensin (2.800$) | ☐ |
| 5 | Zeus Kasası da eklensin (2.500$, istenirse bıçaklı 4.500-5.000$) | ☐ |
| 6 | Cologne 2026 Sticker Kapsülü eklensin | ☐ |
| 7 | Yeni kasalar "Yeni" rozeti + sıralama öne çıksın | ☐ |
| 8 | Skin/Kasa fiyatlarında değişiklik (hangi fiyatlar?) | ☐ |
