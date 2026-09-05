/* ------------------------------------------------------------------
   GÜNCELLEME RAPORU — giriş ekranında yayınlanan sürüm notları.
   Yeni sürüm eklerken başa ekle; LoginView otomatik gösterir.
------------------------------------------------------------------ */

export interface UpdateItem {
  emoji: string;
  title: string;
  desc: string;
}

export interface UpdateEntry {
  version: string;
  date: string;
  tag: string;
  items: UpdateItem[];
}

export const UPDATE_LOG: UpdateEntry[] = [
  {
    version: "v2.0",
    date: "2026-09-05",
    tag: "MEGA GÜNCELLEME",
    items: [
      { emoji: "🎮", title: "6 Yeni Oyun", desc: "Keno, Kule (Towers), Hilo, Skyline Slots, Kazı Kazan ve Derby — hepsi misyonlara ve sezon XP'sine bağlı." },
      { emoji: "🎨", title: "6 Renk Teması", desc: "Gece, Kan, Neon, Altın, Okyanus, Gül — site tek dokunuşla renk değiştiriyor, login dahil." },
      { emoji: "🪪", title: "Kimlik Kiti", desc: "Kapak banner'ı, profil çerçevesi, ünvanlar, emoji avatar ve isim rengi — sohbette ve liderlikte herkes görür." },
      { emoji: "🛠️", title: "Skin Atölyesi", desc: "Name Tag ile eşyaya özel ad, aday önizlemeli float re-roll ve StatTrak™ dönüştürücü." },
      { emoji: "✨", title: "Sticker Studio v2", desc: "9 şekil, gradyan zemin, emoji katmanı ve 3 yazı tipi ile çok daha zengin tasarımlar." },
      { emoji: "🖼️", title: "5 Slotlu Vitrin", desc: "Profil vitrini 3'ten 5 eşyaya çıktı; en iyi düşüşlerin artık daha büyük sahnede." },
      { emoji: "🎉", title: "Konfeti Paketleri", desc: "Altın Yağmuru, Neon Patlama, Taç Yaprakları ya da Sakin — kutlamalar senin tarzında." },
    ],
  },
  {
    version: "v1.9",
    date: "2026-09-01",
    tag: "Panel & Senkron Onarımı",
    items: [
      { emoji: "🔄", title: "Senkron Veri Kaybı Düzeldi", desc: "Kutlama, toplu bakiye sıfırlama, denetim kaydı, sezon penceresi ve dükkan bot damgası artık her senkron turunda silinmiyor — panelden yapılan işlemler tüm cihazlara ulaşıyor." },
      { emoji: "📡", title: "Sunucu Kodunda Canlı Profil", desc: "Profil yayını (bakiye, seviye, kasa, envanter) eskiden sadece URL modunda çalışıyordu; artık sunucu kodu modunda da yayınlanıyor. Panelde herkes 0₺ / Seviye 1 görünmüyor." },
      { emoji: "🏆", title: "Liderlik Verisi", desc: "Harcama ve en iyi düşüş değerleri de yayınlanıyor — topluluk sıralaması ve haftanın oyuncusu doğru çalışıyor." },
      { emoji: "💸", title: "Karşı Teklif & Komisyon", desc: "Onaylanan talepte oyuncunun hesabına artık yetkilinin onayladığı tutar (komisyon düşülmüş) yükleniyor; eskiden tam istenen tutar yükleniyordu." },
      { emoji: "🎁", title: "Paket Hediyeleri Kaydediliyor", desc: "Yatırma paketlerine eklenen kasa/skin hediyeleri kaydetme sırasında siliniyordu — düzeltildi." },
      { emoji: "🎟️", title: "Çekiliş Katılımcıları", desc: "Diğer cihazlardan gelen katılımcılar birleşiyor ama kaydedilmiyordu; artık kalıcı." },
    ],
  },
  {
    version: "v1.8",
    date: "2026-09-01",
    tag: "Marin Kitagawa Kasası",
    items: [
      { emoji: "💖", title: "Marin Kitagawa Kasası", desc: "18 özel anime skin — My Dress-Up Darling temalı, şeffaf arka planlı PNG'ler, 7 milspec + 4 restricted + 2 classified + 2 covert + 3 rare bıçak." },
      { emoji: "🎨", title: "Şeffaf Skinler", desc: "Tüm Marin skinleri arka plansız PNG, kasa kapağı da şeffaf — site vitrininde temiz görünüm." },
      { emoji: "🔥", title: "Anime Kasa", desc: "Kasa sealed & anime etiketli, sadece Marin skinleri düşer, hot rozetli." },
    ],
  },
  {
    version: "v1.7",
    date: "2026-09-01",
    tag: "20 Skin Transfer Fix",
    items: [
      { emoji: "🖼️", title: "20 Eksik Görsel Geri Yüklendi", desc: "TRANSFER.md'deki 20 skin (Gut, Shadow, Classic, Talon, Skeleton + 15 silah) görselleri eklendi — artık 30/30 ex- skin tam." },
      { emoji: "🔧", title: "Kırık Kartlar Düzeltildi", desc: "public/images/skins/ex-*.jpg tamamlandı (40 görsel: 10 base + 30 ex). Kasa açılışında boş fallback yok." },
      { emoji: "📦", title: "Kaynak", desc: "d8f9381 + 358c644 commitlerinden alındı, ex- isimlendirmesine dönüştürüldü." },
    ],
  },
  {
    version: "v1.6",
    date: "2026-09-01",
    tag: "Yeni Skin Paketi",
    items: [
      { emoji: "🔪", title: "30 Yeni Skin", desc: "15 yeni bıçak modeli + 15 özel silah deseni eklendi — Kukri, Ursus, Stiletto, Survival, Paracord ve daha fazlası." },
      { emoji: "🎁", title: "Her Yerde", desc: "Yeni skinler kasalardan düşebilir, pazarda satılabilir ve sezon ödüllerinde çıkabilir." },
      { emoji: "🏪", title: "Bot Dükkanlar", desc: "Trend Giyim, Lezzet Durağı, Tekno Dünya, Ev Dekor ve Butik Karma dükkanları açıldı — oyuncu dükkanlarıyla senkronize çalışıyor." },
      { emoji: "📢", title: "Reklam Yayını", desc: "Admin panelinden reklam oluştur, ana menü şeridinde yayınlansın — bot müşteri akışı artsın." },
      { emoji: "🤖", title: "AI Canlı Destek", desc: "Sağ alttaki sohbet balonunda 15 güncel soru hazır; cevabı bulamazsa bilmediğini açıkça söyler." },
    ],
  },
];
