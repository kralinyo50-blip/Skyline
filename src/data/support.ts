/* ----------------------------------------------------------------
   SİTE İÇİ AI DESTEK — hazır soru-cevap tabanlı yardımcı
   Kullanıcı hem hazır sorulardan seçer hem serbest yazabilir;
   anahtar kelime eşleştirmesiyle en uygun cevap döner.
---------------------------------------------------------------- */

export interface SupportAnswer {
  q: string;
  a: string;
  /** eşleştirme anahtarları (Türkçe, küçük harf) */
  k: string[];
}

export const SUPPORT_ANSWERS: SupportAnswer[] = [
  {
    q: "Nasıl para yatırırım?",
    a: "Üst menüdeki bakiye (💰) butonuna bas → 'Para Yatır' sekmesi açılır. Banka/IBAN, Papara, oyun içi transfer veya kripto seçebilirsin. Talebin admin onayından sonra bakiyene geçer; onaylı talepler anında bakiyeye işlenir.",
    k: ["para", "yatır", "bakiye", "yükle", "depozit", "deposit", "ibn", "iban", "papara", "kripto", "odeme", "ödeme"],
  },
  {
    q: "Para çekebilir miyim?",
    a: "Evet — bakiye butonundan 'Para Çek' sekmesini aç, tutarı ve hesap bilgini yaz. En az 5.000₺ çekim yapılabilir. Talepler admin onayından geçer; kazançların anlık işlenir, Pazar/satış gelirlerin de otomatik bakiyene eklenir.",
    k: ["para", "çek", "cek", "çekim", "withdraw", "çekme", "bakiye"],
  },
  {
    q: "Kasa nasıl açılır?",
    a: "Sol menüden 'Kasalar' sekmesine git, istediğin kasayı seç ve 'Aç' butonuna bas. Her kasada nadirlik kademeleri var; en nadir eşyalar (Covert/Rare) çok daha düşük şansla düşer. Kasanın fiyatı içindeki eşyaların beklenen değerine göre otomatik ayarlanır.",
    k: ["kasa", "case", "aç", "ac", "açma", "kutu", "kutu aç"],
  },
  {
    q: "Envanterimdeki skinler ne işe yarar?",
    a: "Envanterdeki skinleri Pazar'da satabilir, Upgrader'da yükseltebilir, Savaş (battle) ve Oyunlarda yatırım olarak kullanabilir ya da Kasa açma sonucu gelen eşyaları takas edebilirsin. Aşınma (float) değeri ve sticker'lar fiyatı etkiler — değerli float'lar daha pahalıdır.",
    k: ["envanter", "skin", "eşya", "esya", "float", "aşınma", "asınma", "sat", "enventer"],
  },
  {
    q: "VIP nasıl alınır?",
    a: "Sağ üstteki 👑 VIP butonuyla seviyelerini görürsün. Her VIP seviyesi indirim, günlük bonus ve ayrıcalıklar verir; sıralı almak zorunda değilsin — istediğin seviyeyi doğrudan satın alabilirsin. Satın alma bakiyeden anında düşer.",
    k: ["vip", "seviye", "ayrıcalık", "ayricalik", "indirim", "bonus"],
  },
  {
    q: "Sezon Pass nedir?",
    a: "Sezon Pass 14 günlük bir yol: kasa açıp XP toplayarak seviye atlarsın, her seviyede ücretsiz ödüller kazanırsın. Premium yol (5.500.000₺) ile ek skinler, para ödülleri ve 40. seviyede AWP Dragon Lore + Karambit Fade paketi açılır. Ödüller 'Sezon' sekmesinden alınır.",
    k: ["sezon", "pass", "premium", "xp", "ödül", "odul", "dragon", "lore", "40"],
  },
  {
    q: "Dükkan sistemi nasıl çalışıyor?",
    a: "'Dükkan' sekmesinde kendi mağazanı açarsın: toptancıdan stok al ya da malzemelerden üret, sonra fiyatını belirleyip vitrine koy. Bot müşteriler ve diğer oyuncular mağazana gelir; ürünler yalnızca dükkanında satılır, Pazar/Takasa girmez. Kazançlar dükkan panelinden toplanır.",
    k: ["dükkan", "dukkan", "mağaza", "magaza", "vitrin", "stok", "müşteri", "musteri", "bot", "satış", "satiş", "depo"],
  },
  {
    q: "Pazar nasıl kullanılır?",
    a: "'Pazar' sekmesinde envanterindeki skinleri listeleyebilir, bot satıcılardan ve oyuncu ilanlarından alabilirsin. İlanlar bot alıcılar tarafından da satın alınır — gelir otomatik bakiyene geçer. Aynı skinin birden fazla kopyasını toptan paket olarak satabilirsin.",
    k: ["pazar", "market", "ilan", "listele", "alım", "alim", "satıcı", "satici", "toptan"],
  },
  {
    q: "Arkadaş davet edince ne kazanırım?",
    a: "Sağ üstteki davet (➕) butonundan kendi davet linkini/kodunu al ve arkadaşına gönder. Arkadaşın kayıt olup onaylandığında davet ödülü kazanırsın; detaylar 'Profilim' ve davet penceresinde görünür.",
    k: ["arkadaş", "arkadas", "davet", "referans", "referral", "kod", "link", "hediye"],
  },
  {
    q: "Ekonomik dalga nedir?",
    a: "Admin'in başlattığı etkinliklerde tüm skin, kasa ve pazar fiyatları yükselir ya da düşer. Dalga bitince fiyatlar ulaştığı seviyede KALIR (geri dönmez); tamamen normale döndürmek yalnızca adminin 'Ekonomiyi Eski Haline Döndür' butonuyla olur. Üst şeritte geri sayımı görebilirsin.",
    k: ["ekonomi", "dalga", "yükseliş", "yukselis", "çöküş", "cöküs", "fiyat", "pahalı", "pahali", "ucuz"],
  },
  {
    q: "Jackpot ve oyunlar nasıl oynanır?",
    a: "Jackpot'ta skin yatıran oyuncular arasında çekiliş yapılır, kazanan potu alır. 'Oyunlar' ve 'Savaş' sekmelerinde coin flip, battle gibi oyunlarla skin/para bahsi oynayabilirsin. Tüm oyunlar şeffaf ve sunucu tohumuyla doğrulanabilir.",
    k: ["jackpot", "pot", "çekiliş", "cekiliş", "oyun", "savaş", "savas", "bahis", "flip", "battle"],
  },
  {
    q: "Hesabım güvende mi?",
    a: "Hesap bilgilerin yalnızca kendi cihazında saklanır; sunucu kodu (sync) kullanıyorsan durum şifreli bağlantıyla yayılır. Bakiyeni kimseyle paylaşma, admin asla şifre istemez. Şüpheli bir durumda anında destek ekibine yazın.",
    k: ["güvenlik", "guvenlik", "şifre", "sifre", "hesap", "güvende", "guvende", "hack", "çalındı", "calindi"],
  },
  {
    q: "Yeni başladım, ne yapmalıyım?",
    a: "Hoş geldin! 🎉 Önce günlük bonusunu 💰 butonundan al, sonra 'Kasalar' sekmesinden başlangıç seviyesi kasaları aç. Kazandığın skinleri upgrader'da büyüt ya da pazarda satıp daha iyi kasalara geç. Sezon XP'n otomatik birikir — ödüllerini unutma!",
    k: ["yeni", "başlangıç", "baslangic", "başla", "basta", "nasıl", "nasil", "öğren", "ogren", "rehber"],
  },
  {
    q: "Takas (trade) nasıl çalışıyor?",
    a: "'Takas' sekmesinden çevrimiçi oyuncularla P2P takas yapabilirsin: eşyalarını koy, karşı tarafın teklifini onayla, anlaşma gerçekleşsin. Aynı tarayıcıda sadece tek seferde işlenir, çift cihaz koruması vardır. Dükkan ürünleri takas edilemez.",
    k: ["takas", "trade", "teklif", "değiş", "degis", "takas et"],
  },
  {
    q: "Destek ekibine nasıl ulaşırım?",
    a: "Bu sohbet kutusundan sorunu yazabilirsin — çoğu sorunun cevabı burada. Çözülmeyen bir sorun için 'Topluluk' sekmesindeki sohbetten adminlere ulaşabilir ya da para yatırma/çekme taleplerinle ilgili not bırakabilirsin. Adminler onayları genelde kısa sürede işler.",
    k: ["destek", "yardım", "yardim", "admin", "yönetici", "yonetici", "sorun", "şikayet", "sikayet", "iletişim", "iletisim"],
  },
];

/** Türkçe eşleştirme normalizasyonu — "VIP"→"vip" (ı→i) olmalı */
function norm(s: string): string {
  return s.toLocaleLowerCase("tr").replace(/ı/g, "i");
}

/** Serbest yazılan soruyu hazır cevaplarla eşleştir */
export function findSupportAnswer(input: string): SupportAnswer {
  const text = norm(input)
    .replace(/[^a-zçğıöşü0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  let best: SupportAnswer | null = null;
  let bestScore = 0;
  for (const a of SUPPORT_ANSWERS) {
    let score = 0;
    /* Türkçe/ASCII ikili anahtarlar ("nasıl"/"nasil") aynı norma düşer —
       çift puanı önlemek için unique üzerinden say */
    for (const key of new Set(a.k.map(norm))) {
      if (text.includes(key)) {
        /* daha uzun anahtar = daha güçlü sinyal (kısa genel kelimeler zayıf) */
        score += key.length >= 6 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  if (best && bestScore > 0) return best;
  return {
    q: "Bilmiyorum",
    a: "Bunu tam anlayamadım 🤔 Hazır sorulardan birine tıklayabilir ya da farklı kelimelerle yazabilirsin. Örnek: 'nasıl para yatırırım', 'VIP nasıl alınır', 'sezon pass nedir'.",
    k: [],
  };
}
