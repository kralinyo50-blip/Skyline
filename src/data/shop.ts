/* ------------------------------------------------------------------
   SANAL DÜKKAN — katalog, malzemeler, tarifler
   Gerçek hayat gibi: kıyafet (beden/renk/kumaş), yemek (porsiyon/
   içerik/kalori), aksesuar, ev, elektronik. Ürünler ya toptancıdan
   stok alınır ya da malzemelerden üretilir. Dükkan ürünleri normal
   envantere GİRMEZ — yalnızca Dükkan > Depo'da durur, Pazar/Takas/
   Upgrader tarafından görülmez.
------------------------------------------------------------------ */

/** Dükkan ürün kategorisi */
export type ShopCategory =
  | "giyim"
  | "yemek"
  | "icecek"
  | "aksesuar"
  | "ev"
  | "elektronik";

export const SHOP_CATEGORIES: Record<
  ShopCategory,
  { label: string; emoji: string; color: string }
> = {
  giyim: { label: "Kıyafet", emoji: "👕", color: "#5e98d9" },
  yemek: { label: "Yemek", emoji: "🍽️", color: "#f98e1d" },
  icecek: { label: "İçecek", emoji: "🥤", color: "#2fd673" },
  aksesuar: { label: "Aksesuar", emoji: "💍", color: "#d32ce6" },
  ev: { label: "Ev & Yaşam", emoji: "🛋️", color: "#b0c3d9" },
  elektronik: { label: "Elektronik", emoji: "📱", color: "#4b69ff" },
};

export const SHOP_CATEGORY_KEYS = Object.keys(SHOP_CATEGORIES) as ShopCategory[];

/** Üretimde kullanılan ham madde */
export interface ShopMaterial {
  id: string;
  name: string;
  emoji: string;
  /** toptancı fiyatı (SC) */
  price: number;
}

export const SHOP_MATERIALS: ShopMaterial[] = [
  { id: "kumas", name: "Kumaş Rulosu", emoji: "🧵", price: 150 },
  { id: "iplik", name: "İplik", emoji: "🪡", price: 60 },
  { id: "dugme", name: "Düğme Seti", emoji: "🔘", price: 40 },
  { id: "fermuar", name: "Fermuar", emoji: "⛓️", price: 90 },
  { id: "deri", name: "Deri Parçası", emoji: "🐄", price: 220 },
  { id: "kumasnob", name: "Nobel Kumaş", emoji: "🧶", price: 260 },
  { id: "un", name: "Un", emoji: "🌾", price: 55 },
  { id: "yumurta", name: "Yumurta", emoji: "🥚", price: 70 },
  { id: "seker", name: "Şeker", emoji: "🍬", price: 45 },
  { id: "sut", name: "Süt", emoji: "🥛", price: 65 },
  { id: "tereyagi", name: "Tereyağı", emoji: "🧈", price: 110 },
  { id: "et", name: "Et", emoji: "🥩", price: 260 },
  { id: "sebze", name: "Sebze", emoji: "🥦", price: 90 },
  { id: "peynir", name: "Peynir", emoji: "🧀", price: 140 },
  { id: "hamur", name: "Hamur", emoji: "🫓", price: 80 },
  { id: "kahve", name: "Kahve Çekirdeği", emoji: "☕", price: 180 },
  { id: "meyve", name: "Meyve", emoji: "🍎", price: 100 },
  { id: "ahcap", name: "Ahşap", emoji: "🪵", price: 170 },
  { id: "metal", name: "Metal", emoji: "🔩", price: 240 },
  { id: "cam", name: "Cam", emoji: "🔮", price: 130 },
  { id: "plastik", name: "Plastik", emoji: "🧴", price: 120 },
  { id: "kablo", name: "Kablo", emoji: "🔌", price: 100 },
  { id: "cip", name: "Çip", emoji: "💾", price: 320 },
  { id: "boya", name: "Boya", emoji: "🎨", price: 150 },
];

export const SHOP_MATERIAL_MAP: Record<string, ShopMaterial> = Object.fromEntries(
  SHOP_MATERIALS.map((m) => [m.id, m])
);

/** Katalog ürünü */
export interface ShopProductDef {
  id: string;
  name: string;
  emoji: string;
  category: ShopCategory;
  /** kısa tanım (vitrin kartı) */
  desc: string;
  /** detaylı özellikler: "Beden: M", "Renk: Lacivert", "Kalori: 540" */
  attrs: string[];
  /** toptancıdan stok alma maliyeti (SC) */
  cost: number;
  /** önerilen satış fiyatı (SC) — botlar bu fiyata göre alışveriş yapar */
  list: number;
  /** üretim tarifi — yoksa yalnızca toptan alınır */
  recipe?: { mat: string; qty: number }[];
}

export const SHOP_PRODUCTS: ShopProductDef[] = [
  /* ---------------- KIYAFET ---------------- */
  { id: "tisort-beyaz", name: "Günlük Tişört", emoji: "👕", category: "giyim", desc: "Pamuklu, günlük kullanım için rahat tişört", attrs: ["Beden: S–XXL", "Renk: Beyaz", "Kumaş: %100 Pamuk", "Sezon: 4 Mevsim"], cost: 420, list: 950, recipe: [{ mat: "kumas", qty: 1 }, { mat: "iplik", qty: 1 }] },
  { id: "tisort-siyah", name: "Günlük Tişört (Siyah)", emoji: "🌑", category: "giyim", desc: "Siyah pamuklu tişört — kombinin kurtarıcısı", attrs: ["Beden: S–XXL", "Renk: Siyah", "Kumaş: %100 Pamuk", "Sezon: 4 Mevsim"], cost: 440, list: 980, recipe: [{ mat: "kumas", qty: 1 }, { mat: "iplik", qty: 1 }, { mat: "boya", qty: 1 }] },
  { id: "golge-gomlek", name: "Oxford Gömlek", emoji: "👔", category: "giyim", desc: "İş ve özel gün için kırışmaz gömlek", attrs: ["Beden: S–XXL", "Renk: Açık Mavi", "Kumaş: Oxford Pamuk", "Yaka: Klasik"], cost: 780, list: 1750, recipe: [{ mat: "kumas", qty: 2 }, { mat: "iplik", qty: 1 }, { mat: "dugme", qty: 1 }] },
  { id: "kot-pantolon", name: "Kot Pantolon", emoji: "👖", category: "giyim", desc: "Klasik kesim, sağlam denim kot", attrs: ["Beden: 30–40", "Renk: Koyu Mavi", "Kumaş: Denim", "Kesim: Klasik"], cost: 1150, list: 2450, recipe: [{ mat: "kumas", qty: 3 }, { mat: "iplik", qty: 2 }, { mat: "fermuar", qty: 1 }] },
  { id: "esofman", name: "Eşofman Takımı", emoji: "🏃", category: "giyim", desc: "Spor salonu ve sokak için rahat ikili", attrs: ["Beden: S–XL", "Renk: Füme", "Kumaş: Poli-Koton", "İçerik: Üst + Alt"], cost: 980, list: 2100, recipe: [{ mat: "kumas", qty: 2 }, { mat: "iplik", qty: 1 }] },
  { id: "kaza-kirmizi", name: "Kazak (Kızıl)", emoji: "🧶", category: "giyim", desc: "Kışın sıcacık örgü kazak", attrs: ["Beden: S–XXL", "Renk: Bordo", "Kumaş: Yün Karışımı", "Sezon: Kış"], cost: 1050, list: 2350, recipe: [{ mat: "kumasnob", qty: 2 }, { mat: "iplik", qty: 2 }] },
  { id: "mont", name: "Kışlık Mont", emoji: "🧥", category: "giyim", desc: "Sert kış için su geçirmez mont", attrs: ["Beden: S–XXL", "Renk: Lacivert", "Kumaş: Su İtici", "Sezon: Kış"], cost: 2400, list: 5200, recipe: [{ mat: "kumasnob", qty: 3 }, { mat: "fermuar", qty: 2 }, { mat: "iplik", qty: 1 }] },
  { id: "deri-ceket", name: "Deri Ceket", emoji: "🖤", category: "giyim", desc: "Asil duruşlu gerçek deri ceket", attrs: ["Beden: M–XXL", "Renk: Siyah", "Kumaş: Gerçek Deri", "Sezon: Sonbahar"], cost: 3600, list: 7800, recipe: [{ mat: "deri", qty: 4 }, { mat: "fermuar", qty: 2 }, { mat: "iplik", qty: 2 }] },
  { id: "elbise", name: "Gece Elbisesi", emoji: "👗", category: "giyim", desc: "Davetlerin yıldızı şık elbise", attrs: ["Beden: XS–L", "Renk: Fuşya", "Kumaş: Saten", "Kesim: A-Line"], cost: 1900, list: 4200, recipe: [{ mat: "kumasnob", qty: 2 }, { mat: "iplik", qty: 2 }, { mat: "dugme", qty: 1 }] },
  { id: "sapka", name: "Şapka", emoji: "🧢", category: "giyim", desc: "Güneşten ve stilden korur", attrs: ["Beden: Tek Beden", "Renk: Bej", "Kumaş: Kanvas"], cost: 260, list: 620, recipe: [{ mat: "kumas", qty: 1 }] },
  { id: "spor-ayakkabi", name: "Spor Ayakkabı", emoji: "👟", category: "giyim", desc: "Hafif ve nefes alan koşu ayakkabısı", attrs: ["Numara: 36–45", "Renk: Gri/Beyaz", "Taban: EVA", "Ağırlık: 240g"], cost: 1250, list: 2800, recipe: [{ mat: "deri", qty: 2 }, { mat: "kumas", qty: 2 }, { mat: "plastik", qty: 1 }] },
  { id: "bot", name: "Deri Bot", emoji: "🥾", category: "giyim", desc: "Kışın ayaklarını sıcak tutar", attrs: ["Numara: 36–45", "Renk: Kahve", "Kumaş: Deri + Polar", "Taban: Kaymaz"], cost: 1650, list: 3600, recipe: [{ mat: "deri", qty: 3 }, { mat: "iplik", qty: 1 }] },
  { id: "esarp", name: "Şal & Atkı", emoji: "🧣", category: "giyim", desc: "Hem şık hem sıcak tutan atkı", attrs: ["Beden: 180 cm", "Renk: Krem", "Kumaş: Yün"], cost: 320, list: 750, recipe: [{ mat: "kumasnob", qty: 1 }] },

  /* ---------------- YEMEK ---------------- */
  { id: "simit", name: "Simit", emoji: "🥨", category: "yemek", desc: "Çayın yanına kıtır kıtır simit", attrs: ["Porsiyon: 1 adet", "Kalori: 270", "İçerik: Un, Susam, Pekmez", "Pişirme: Fırın"], cost: 120, list: 280, recipe: [{ mat: "un", qty: 1 }, { mat: "seker", qty: 1 }] },
  { id: "pogaca", name: "Poğaça", emoji: "🥐", category: "yemek", desc: "Peynirli, yumuşacık poğaça", attrs: ["Porsiyon: 1 adet", "Kalori: 320", "İçerik: Un, Peynir, Tereyağı", "Pişirme: Fırın"], cost: 150, list: 340, recipe: [{ mat: "un", qty: 1 }, { mat: "peynir", qty: 1 }, { mat: "tereyagi", qty: 1 }] },
  { id: "kahvalti", name: "Serpme Kahvaltı", emoji: "🍳", category: "yemek", desc: "Zengin Türk kahvaltısı tabağı", attrs: ["Porsiyon: 1 kişi", "Kalori: 850", "İçerik: Yumurta, Peynir, Zeytin, Bal", "Servis: Tabak"], cost: 420, list: 920, recipe: [{ mat: "yumurta", qty: 2 }, { mat: "peynir", qty: 1 }, { mat: "seker", qty: 1 }] },
  { id: "corba", name: "Mercimek Çorbası", emoji: "🍲", category: "yemek", desc: "Ev yapımı, bol limonlu", attrs: ["Porsiyon: 1 kase", "Kalori: 210", "İçerik: Mercimek, Un, Sebze", "Servis: Sıcak"], cost: 160, list: 380, recipe: [{ mat: "sebze", qty: 1 }, { mat: "un", qty: 1 }] },
  { id: "doner", name: "Döner", emoji: "🥙", category: "yemek", desc: "Lavanta yaprağında döner", attrs: ["Porsiyon: 1 adet", "Kalori: 780", "İçerik: Et, Sebze, Sos", "Acı: İsteğe bağlı"], cost: 260, list: 580, recipe: [{ mat: "et", qty: 1 }, { mat: "hamur", qty: 1 }, { mat: "sebze", qty: 1 }] },
  { id: "lahmacun", name: "Lahmacun", emoji: "🫓", category: "yemek", desc: "İncecik hamur, kıymalı", attrs: ["Porsiyon: 1 adet", "Kalori: 420", "İçerik: Et, Sebze, Un", "Servis: Maydanoz + Limon"], cost: 200, list: 460, recipe: [{ mat: "et", qty: 1 }, { mat: "hamur", qty: 1 }, { mat: "sebze", qty: 1 }] },
  { id: "mantı", name: "Mantı", emoji: "🥟", category: "yemek", desc: "Açık ise tam açık değil — sarımsaklı yoğurtlu", attrs: ["Porsiyon: 1 tabak", "Kalori: 610", "İçerik: Et, Un, Yumurta", "Servis: Yoğurt + Sos"], cost: 320, list: 710, recipe: [{ mat: "un", qty: 2 }, { mat: "yumurta", qty: 1 }, { mat: "et", qty: 1 }] },
  { id: "iskender", name: "İskender", emoji: "🍖", category: "yemek", desc: "Tereyağlı, yoğurtlu efsane", attrs: ["Porsiyon: 1 tabak", "Kalori: 940", "İçerik: Et, Tereyağı, Domates", "Servis: Yayık Ayranı ile"], cost: 420, list: 930, recipe: [{ mat: "et", qty: 2 }, { mat: "tereyagi", qty: 1 }, { mat: "hamur", qty: 1 }] },
  { id: "pizza", name: "Pizza (Büyük)", emoji: "🍕", category: "yemek", desc: "Taş fırında, bol peynirli", attrs: ["Porsiyon: 4 dilim", "Kalori: 1180", "İçerik: Un, Peynir, Domates", "Hamur: İnce Kenar"], cost: 480, list: 1050, recipe: [{ mat: "un", qty: 2 }, { mat: "peynir", qty: 2 }, { mat: "sebze", qty: 1 }] },
  { id: "burger", name: "Gurme Burger", emoji: "🍔", category: "yemek", desc: "Çift katlı, özel soslu", attrs: ["Porsiyon: 1 adet", "Kalori: 860", "İçerik: Et, Peynir, Sebze, Hamur", "Sos: Özel"], cost: 340, list: 760, recipe: [{ mat: "et", qty: 1 }, { mat: "peynir", qty: 1 }, { mat: "hamur", qty: 1 }] },
  { id: "kuru", name: "Kuru Fasulye", emoji: "🥘", category: "yemek", desc: "Pilavın yanına klasik", attrs: ["Porsiyon: 1 kase", "Kalori: 480", "İçerik: Fasulye, Et, Sebze", "Servis: Pilav ile"], cost: 280, list: 630, recipe: [{ mat: "sebze", qty: 1 }, { mat: "et", qty: 1 }] },
  { id: "tavuk", name: "Izgara Tavuk", emoji: "🍗", category: "yemek", desc: "Baharatlı, közde ızgara", attrs: ["Porsiyon: 1 but", "Kalori: 520", "İçerik: Tavuk, Baharat", "Servis: Salata ile"], cost: 300, list: 680, recipe: [{ mat: "et", qty: 2 }, { mat: "sebze", qty: 1 }] },
  { id: "baklava", name: "Baklava", emoji: "🍯", category: "yemek", desc: "Şerbetli, antep fıstıklı", attrs: ["Porsiyon: 2 dilim", "Kalori: 640", "İçerik: Un, Şeker, Fıstık", "Servis: Çay ile"], cost: 380, list: 850, recipe: [{ mat: "un", qty: 2 }, { mat: "seker", qty: 2 }, { mat: "tereyagi", qty: 1 }] },
  { id: "kek", name: "Sade Kek", emoji: "🍰", category: "yemek", desc: "Yumuşacık, çay saati keki", attrs: ["Porsiyon: 4 dilim", "Kalori: 480", "İçerik: Un, Yumurta, Şeker", "Servis: Dilim"], cost: 260, list: 590, recipe: [{ mat: "un", qty: 1 }, { mat: "yumurta", qty: 2 }, { mat: "seker", qty: 1 }] },
  { id: "tost", name: "Karışık Tost", emoji: "🥪", category: "yemek", desc: "Kaşarlı, sucuklu, hepsi bir arada", attrs: ["Porsiyon: 1 adet", "Kalori: 560", "İçerik: Peynir, Et, Hamur", "Servis: Kızarmış"], cost: 230, list: 520, recipe: [{ mat: "peynir", qty: 1 }, { mat: "et", qty: 1 }, { mat: "hamur", qty: 1 }] },
  { id: "meyve-tabagi", name: "Meyve Tabağı", emoji: "🍉", category: "yemek", desc: "Günlük taze meyve karışımı", attrs: ["Porsiyon: 1 tabak", "Kalori: 240", "İçerik: Karışık Meyve", "Servis: Taze"], cost: 190, list: 430, recipe: [{ mat: "meyve", qty: 2 }] },

  /* ---------------- İÇECEK ---------------- */
  { id: "cay", name: "Çay", emoji: "🍵", category: "icecek", desc: "Demli, ince belli bardakta", attrs: ["Porsiyon: 1 bardak", "Kalori: 2", "İçerik: Siyah Çay", "Servis: Sıcak"], cost: 40, list: 110, recipe: [] },
  { id: "kahve", name: "Türk Kahvesi", emoji: "☕", category: "icecek", desc: "Közde pişmiş, bol köpüklü", attrs: ["Porsiyon: 1 fincan", "Kalori: 15", "İçerik: Kahve Çekirdeği", "Servis: Lokum ile"], cost: 120, list: 270, recipe: [{ mat: "kahve", qty: 1 }, { mat: "seker", qty: 1 }] },
  { id: "ayran", name: "Ayran", emoji: "🥛", category: "icecek", desc: "Köpüklü yayık ayranı", attrs: ["Porsiyon: 1 bardak", "Kalori: 90", "İçerik: Yoğurt, Su, Tuz"], cost: 60, list: 150, recipe: [{ mat: "sut", qty: 1 }] },
  { id: "limonata", name: "Ev Limonatası", emoji: "🍋", category: "icecek", desc: "Taze sıkılmış, naneli", attrs: ["Porsiyon: 1 sürahi", "Kalori: 120", "İçerik: Limon, Şeker", "Servis: Buzlu"], cost: 140, list: 310, recipe: [{ mat: "meyve", qty: 1 }, { mat: "seker", qty: 1 }] },
  { id: "gazli", name: "Gazlı İçecek", emoji: "🥤", category: "icecek", desc: "Kutu, buz gibi", attrs: ["Porsiyon: 330 ml", "Kalori: 140", "İçerik: Gazlı Şerbet"], cost: 55, list: 140, recipe: [] },
  { id: "energy", name: "Enerji İçeceği", emoji: "⚡", category: "icecek", desc: "Gece vardiyasının dostu", attrs: ["Porsiyon: 250 ml", "Kalori: 110", "İçerik: Kafein, Taurin"], cost: 110, list: 250, recipe: [] },

  /* ---------------- AKSESUAR ---------------- */
  { id: "saat", name: "Kol Saati", emoji: "⌚", category: "aksesuar", desc: "Çelik kordonlu klasik saat", attrs: ["Kordon: Çelik", "Kadran: Siyah", "Su Geçirmez: 3 ATM"], cost: 1400, list: 3200, recipe: [{ mat: "metal", qty: 3 }, { mat: "cam", qty: 1 }, { mat: "cip", qty: 1 }] },
  { id: "gozluk", name: "Güneş Gözlüğü", emoji: "🕶️", category: "aksesuar", desc: "Polarize lensli", attrs: ["Çerçeve: Siyah", "Lens: Polarize", "UV: %100"], cost: 620, list: 1450, recipe: [{ mat: "plastik", qty: 2 }, { mat: "cam", qty: 1 }] },
  { id: "kemer", name: "Deri Kemer", emoji: "🧷", category: "aksesuar", desc: "Gerçek deri, pirinç toka", attrs: ["Beden: 85–110 cm", "Kumaş: Deri", "Toka: Pirinç"], cost: 380, list: 880, recipe: [{ mat: "deri", qty: 1 }, { mat: "metal", qty: 1 }] },
  { id: "cuzdan", name: "Cüzdan", emoji: "👛", category: "aksesuar", desc: "İnce deri cüzdan", attrs: ["Kumaş: Deri", "Bölme: 6 kart", "Renk: Esmer"], cost: 340, list: 790, recipe: [{ mat: "deri", qty: 1 }, { mat: "iplik", qty: 1 }] },
  { id: "canta", name: "Omuz Çantası", emoji: "👜", category: "aksesuar", desc: "Günlük kullanım için şık çanta", attrs: ["Kumaş: Deri", "Boyut: 30×25 cm", "Astar: Saten"], cost: 880, list: 1950, recipe: [{ mat: "deri", qty: 2 }, { mat: "kumas", qty: 1 }, { mat: "fermuar", qty: 1 }] },
  { id: "kolye", name: "Gümüş Kolye", emoji: "📿", category: "aksesuar", desc: "Minimal, gümüş zincir", attrs: ["Materyal: 925 Gümüş", "Boy: 45 cm", "Kapatma: Klips"], cost: 720, list: 1600, recipe: [{ mat: "metal", qty: 2 }] },
  { id: "yuzuk", name: "Altın Yüzük", emoji: "💍", category: "aksesuar", desc: "Ayar altın — özel günler için", attrs: ["Materyal: 14 Ayar", "Beden: 11–17", "Tasarım: Klasik"], cost: 2400, list: 5400, recipe: [{ mat: "metal", qty: 4 }, { mat: "cam", qty: 1 }] },
  { id: "kulaklik", name: "Eyebuds", emoji: "🎧", category: "aksesuar", desc: "Kablosuz mini kulaklık", attrs: ["Bluetooth: 5.3", "Pil: 24 saat", "Su: IPX4"], cost: 950, list: 2100, recipe: [{ mat: "plastik", qty: 2 }, { mat: "cip", qty: 1 }, { mat: "kablo", qty: 1 }] },

  /* ---------------- EV & YAŞAM ---------------- */
  { id: "lamba", name: "Masa Lambası", emoji: "💡", category: "ev", desc: "Sıcak ışıklı çalışma lambası", attrs: ["Işık: 2700K", "Güç: 12W", "Malzeme: Ahşap"], cost: 520, list: 1150, recipe: [{ mat: "ahcap", qty: 1 }, { mat: "kablo", qty: 1 }, { mat: "cam", qty: 1 }] },
  { id: "hali", name: "El Dokuma Halı", emoji: "🧶", category: "ev", desc: "Yöresel desenli, el emeği", attrs: ["Boyut: 2×1.5 m", "Kumaş: Yün", "Desen: Otantik"], cost: 1500, list: 3400, recipe: [{ mat: "kumasnob", qty: 4 }, { mat: "iplik", qty: 3 }] },
  { id: "koltuk", name: "Tekli Koltuk", emoji: "🛋️", category: "ev", desc: "Konforlu, kumaş döşemeli", attrs: ["Boyut: 85×95 cm", "Kumaş: Kadife", "İskelet: Ahşap"], cost: 4800, list: 10500, recipe: [{ mat: "ahcap", qty: 3 }, { mat: "kumasnob", qty: 4 }] },
  { id: "masa", name: "Ahşap Masa", emoji: "🪑", category: "ev", desc: "Yemek masası — 4 kişilik", attrs: ["Boyut: 120×80 cm", "Malzeme: Meşe", "Kapasite: 4 kişi"], cost: 2600, list: 5700, recipe: [{ mat: "ahcap", qty: 4 }, { mat: "metal", qty: 1 }] },
  { id: "yorgan", name: "Yorgan & Nevresim", emoji: "🛏️", category: "ev", desc: "Pamuk dolgulu yorgan seti", attrs: ["Boyut: 200×220", "Dolgu: %100 Pamuk", "Kılıf: Saten"], cost: 1100, list: 2400, recipe: [{ mat: "kumas", qty: 3 }, { mat: "iplik", qty: 1 }] },
  { id: "buzdolabi", name: "Buzdolabı", emoji: "🧊", category: "ev", desc: "No-frost, A++ enerji", attrs: ["Hacim: 480 L", "Enerji: A++", "Ses: 38 dB"], cost: 12000, list: 26000, recipe: [{ mat: "metal", qty: 5 }, { mat: "plastik", qty: 4 }, { mat: "cip", qty: 2 }] },
  { id: "televizyon", name: "Smart TV 55\"", emoji: "📺", category: "ev", desc: "4K UHD, ince çerçeve", attrs: ["Ekran: 55\"", "Çözünürlük: 4K", "Smart: Wi-Fi"], cost: 14000, list: 30000, recipe: [{ mat: "plastik", qty: 3 }, { mat: "cam", qty: 3 }, { mat: "cip", qty: 2 }] },
  { id: "mutfak-seti", name: "Mutfak Seti", emoji: "🍳", category: "ev", desc: "Tencere + tava seti", attrs: ["Parça: 9", "Materyal: Granit", "Kapak: Cam"], cost: 1750, list: 3900, recipe: [{ mat: "metal", qty: 3 }, { mat: "cam", qty: 1 }, { mat: "ahcap", qty: 1 }] },

  /* ---------------- ELEKTRONİK ---------------- */
  { id: "telefon", name: "Akıllı Telefon", emoji: "📱", category: "elektronik", desc: "128 GB, çift kamera", attrs: ["Ekran: 6.4\"", "Depolama: 128 GB", "Kamera: 64 MP"], cost: 15000, list: 32000, recipe: [{ mat: "plastik", qty: 3 }, { mat: "cam", qty: 2 }, { mat: "cip", qty: 3 }] },
  { id: "tablet", name: "Tablet", emoji: "💻", category: "elektronik", desc: "10\" ekran, klavye desteği", attrs: ["Ekran: 10.1\"", "Depolama: 64 GB", "Pil: 8000 mAh"], cost: 9500, list: 20500, recipe: [{ mat: "plastik", qty: 2 }, { mat: "cam", qty: 2 }, { mat: "cip", qty: 2 }] },
  { id: "klavye", name: "Mekanik Klavye", emoji: "⌨️", category: "elektronik", desc: "RGB, kırmızı switch", attrs: ["Switch: Kırmızı", "Işık: RGB", "Bağlantı: Kablolu"], cost: 1150, list: 2500, recipe: [{ mat: "plastik", qty: 2 }, { mat: "cip", qty: 1 }] },
  { id: "mouse", name: "Gaming Mouse", emoji: "🖱️", category: "elektronik", desc: "16K DPI, hafif", attrs: ["DPI: 16000", "Ağırlık: 68 g", "Işık: RGB"], cost: 620, list: 1400, recipe: [{ mat: "plastik", qty: 1 }, { mat: "cip", qty: 1 }] },
  { id: "hoparlor", name: "Bluetooth Hoparlör", emoji: "🔊", category: "elektronik", desc: "Ses kalitesi yüksek, taşınabilir", attrs: ["Güç: 20W", "Pil: 12 saat", "Su: IPX6"], cost: 1400, list: 3100, recipe: [{ mat: "plastik", qty: 2 }, { mat: "cip", qty: 1 }, { mat: "kablo", qty: 1 }] },
  { id: "konsol", name: "Oyun Konsolu", emoji: "🎮", category: "elektronik", desc: "4K oyun deneyimi", attrs: ["Çıkış: 4K 120Hz", "Depolama: 512 GB", "Kumanda: Wireless"], cost: 22000, list: 47000, recipe: [{ mat: "plastik", qty: 4 }, { mat: "cip", qty: 4 }, { mat: "metal", qty: 2 }] },
];

export const SHOP_PRODUCT_MAP: Record<string, ShopProductDef> = Object.fromEntries(
  SHOP_PRODUCTS.map((p) => [p.id, p])
);

/** Özel ürün üretiminde kategori başına gereken malzemeler */
export const CUSTOM_RECIPES: Record<ShopCategory, { mat: string; qty: number }[]> = {
  giyim: [{ mat: "kumas", qty: 2 }, { mat: "iplik", qty: 2 }, { mat: "dugme", qty: 1 }],
  yemek: [{ mat: "un", qty: 2 }, { mat: "yumurta", qty: 2 }, { mat: "seker", qty: 1 }],
  icecek: [{ mat: "seker", qty: 2 }, { mat: "meyve", qty: 1 }],
  aksesuar: [{ mat: "deri", qty: 2 }, { mat: "metal", qty: 1 }],
  ev: [{ mat: "ahcap", qty: 2 }, { mat: "boya", qty: 1 }],
  elektronik: [{ mat: "plastik", qty: 2 }, { mat: "kablo", qty: 1 }, { mat: "cip", qty: 1 }],
};

/** Ürünün birim kâr marjı (önerilen satış / toptan maliyet) */
export function shopMargin(p: ShopProductDef): number {
  return Math.round((p.list / Math.max(1, p.cost)) * 100) - 100;
}

/** Tarif metni: "2× Kumaş + 1× İplik" */
export function recipeText(recipe?: { mat: string; qty: number }[]): string {
  if (!recipe || recipe.length === 0) return "Toptancıdan alınır";
  return recipe
    .map((r) => `${r.qty}× ${SHOP_MATERIAL_MAP[r.mat]?.name ?? r.mat}`)
    .join(" + ");
}

/** Malzeme maliyeti toplamı */
export function recipeCost(recipe: { mat: string; qty: number }[]): number {
  return recipe.reduce((sum, r) => sum + (SHOP_MATERIAL_MAP[r.mat]?.price ?? 0) * r.qty, 0);
}
