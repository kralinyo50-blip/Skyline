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
    version: "v2.1",
    date: "2026-09-01",
    tag: "20 Skin Transfer Fix",
    items: [
      { emoji: "🖼️", title: "20 Eksik Görsel Geri Yüklendi", desc: "TRANSFER.md'deki 20 skin (Gut, Shadow, Classic, Talon, Skeleton + 15 silah) görselleri eklendi — artık 30/30 ex- skin tam." },
      { emoji: "🔧", title: "Kırık Kartlar Düzeltildi", desc: "public/images/skins/ex-*.jpg tamamlandı (40 görsel: 10 base + 30 ex). Kasa açılışında boş fallback yok." },
      { emoji: "📦", title: "Kaynak", desc: "d8f9381 + 358c644 commitlerinden alındı, ex- isimlendirmesine dönüştürüldü." },
    ],
  },
  {
    version: "v2.0",
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
