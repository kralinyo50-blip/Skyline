import { useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Gavel,
  Home,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  UserRound,
  Users,
  Wallet,
  Wifi,
  WifiOff,
  XCircle,
  Download,
} from "lucide-react";
import { formatSc } from "../../shared/platform";
import { loadPrefs } from "../lib/prefs";
import {
  PlatformProvider,
  usePlatform,
  usePage,
  navigate,
  type Page,
} from "./context";
import { Button, Panel, Tag, Title } from "./ui";
import { Studio, OnlineInventory } from "./Studio";
import { Clans, Collections } from "./Social";
import { Market } from "./Market";
import { Gallery } from "./Gallery";
import { Battles } from "./Battles";
import { Account } from "./Account";
import { OnlineAdmin } from "./Admin";
import { PwaControls } from "./Pwa";
import { backupLegacy, legacySnapshot } from "./legacy";
import "./platform.css";
const nav: { page: Page; label: string; icon: typeof Home }[] = [
  { page: "home", label: "Merkez", icon: Home },
  { page: "studio", label: "AI Atölyesi", icon: Sparkles },
  { page: "inventory", label: "Envanterim", icon: Layers3 },
  { page: "clans", label: "Klanlar", icon: Shield },
  { page: "battles", label: "Canlı Arena", icon: Swords },
  { page: "collections", label: "Koleksiyonlar", icon: BookOpen },
  { page: "market", label: "Açık Artırma", icon: Gavel },
  { page: "gallery", label: "Tasarım Galerisi", icon: Palette },
  { page: "account", label: "Hesap & Aktarım", icon: UserRound },
];
const features: {
  page: Page;
  title: string;
  description: string;
  icon: typeof Home;
  label: string;
}[] = [
  {
    page: "studio",
    title: "AI Skin Atölyesi",
    description:
      "Kelimelerini özgün bir skin görseline dönüştür. Maliyeti onaylamadan üretim başlamaz.",
    icon: Sparkles,
    label: "Yaratıcılığına alan aç",
  },
  {
    page: "clans",
    title: "Kendi ekibini kur",
    description:
      "Davet kodu, ortak görev puanları ve klan kimliği. Birlikte üreterek iz bırakın.",
    icon: Users,
    label: "Klanları keşfet",
  },
  {
    page: "battles",
    title: "Gerçek rakip, canlı oda",
    description:
      "1v1 ve 2v2 karşılaşmalar, ücretsiz seyirci koltukları ve doğrulanabilir çekiliş kaydı.",
    icon: Swords,
    label: "Arenaya göz at",
  },
  {
    page: "collections",
    title: "Albümünü tamamla",
    description:
      "Sahip olduklarını ve eksiklerini bir arada gör. Tamamlanan setler özel ünvanlar açar.",
    icon: BookOpen,
    label: "Koleksiyonları aç",
  },
  {
    page: "market",
    title: "Oyuncu pazarı",
    description:
      "Teklif ver, açık artırmaya çıkar veya hemen al. SC ve eşyalar işlem boyunca güvende.",
    icon: Gavel,
    label: "İlanları incele",
  },
  {
    page: "gallery",
    title: "Topluluk galerisi",
    description:
      "Skin, sticker ve kasa konseptlerini paylaş. Gerçek beğeniler ve haftanın seçimi.",
    icon: Palette,
    label: "İlham bul",
  },
];
function HomePage() {
  const { data, connected } = usePlatform();
  return (
    <>
      <div className="pf-hero">
        <div>
          <p className="pf-eyebrow">SKYLINE / YARATICILIK & TOPLULUK</p>
          <h1>
            Bir cümleden,
            <br />
            <em>senin imzana.</em>
          </h1>
          <p>
            Hayalindeki skini tasarla. Koleksiyonunu büyüt, ekibini bir araya
            getir ve kendi ürettiğin tasarımları oyuncu pazarına taşı.
          </p>
          <div className="pf-row">
            <Button onClick={() => navigate("studio")}>
              <Sparkles size={17} /> Atölyeyi aç <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" onClick={() => navigate("account")}>
              Önce hesabımı taşı
            </Button>
          </div>
        </div>
        <div className="pf-hero-art" aria-hidden="true">
          <div className="pf-art-card">
            <Tag tone="amber">ATÖLYE TASLAĞI</Tag>
            <ImagePlus size={85} />
            <strong>
              SIRADAKİ İMZA
              <br />
              SENİN OLSUN.
            </strong>
            <p>Hayal et. Detaylandır. Oluştur.</p>
          </div>
        </div>
      </div>
      <div className="pf-grid pf-grid-4 pf-gap">
        {[
          {
            label: "Sunucu SC bakiyen",
            value: data?.user ? formatSc(data.user.balance) : "Giriş yap",
          },
          {
            label: "Envanterindeki eşya",
            value: data?.user ? String(data.inventory.length) : "—",
          },
          {
            label: "Toplulukta yayınlanan tasarım",
            value: connected
              ? String(
                  data?.designs.filter((d) => d.status === "approved").length ||
                    0,
                )
              : "—",
          },
          {
            label: "Canlı / bekleyen oda",
            value: connected
              ? String(
                  data?.battles.filter((b) =>
                    ["waiting", "playing"].includes(b.phase),
                  ).length || 0,
                )
              : "—",
          },
        ].map((s) => (
          <Panel key={s.label} className="pf-stat">
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </Panel>
        ))}
      </div>
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">V3 SOSYAL MERKEZ</p>
          <h2>Yeni bir şey keşfet.</h2>
        </div>
        <Tag tone="green">
          <ShieldCheck size={12} /> Sunucu doğrulamalı işlemler
        </Tag>
      </div>
      <div className="pf-grid pf-grid-3">
        {features.map((f) => (
          <button
            type="button"
            className="pf-feature"
            key={f.page}
            onClick={() => navigate(f.page)}
          >
            <span className="pf-feature-icon">
              <f.icon size={23} />
            </span>
            <div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
            <span className="pf-feature-foot">
              {f.page === "studio" && !data?.ai.enabled
                ? "API kurulumu bekleniyor"
                : f.label}
              <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
      <Panel className="pf-gap">
        <div className="pf-row pf-between">
          <div className="pf-row">
            <ShieldCheck size={29} color="#84cbaa" />
            <div>
              <h3>Eski kayıtların yerinde.</h3>
              <p className="pf-small pf-muted" style={{ marginTop: 6 }}>
                V2 bakiyesi otomatik silinmez. Yedek, hesap doğrulama ve tek
                seferlik aktarım ile ilerle.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate("account")}>
            Yedek & aktarım <ArrowRight size={16} />
          </Button>
        </div>
      </Panel>
    </>
  );
}
function Frame() {
  const { data, loading, connected, error, notice, refresh } = usePlatform(),
    page = usePage();
  useEffect(() => {
    document.documentElement.dataset.theme = loadPrefs().theme;
  }, []);
  const menu =
    data?.user?.role === "admin"
      ? [
          ...nav,
          { page: "admin" as Page, label: "Kontrol Odası", icon: ShieldCheck },
        ]
      : nav;
  const title = menu.find((n) => n.page === page)?.label || "Merkez";
  return (
    <div className="platform">
      <div className="pf-layout">
        <aside className="pf-sidebar">
          <a className="pf-brand" href="#platform">
            <span className="pf-brand-mark">
              <Boxes size={24} />
            </span>
            SKYLINE<span className="pf-version">V3</span>
          </a>
          <nav className="pf-nav" aria-label="Sosyal merkez">
            {menu.map((n) => (
              <a
                key={n.page}
                href={`#platform/${n.page}`}
                aria-current={page === n.page ? "page" : undefined}
              >
                <n.icon size={18} />
                {n.label}
              </a>
            ))}
          </nav>
          <div className="pf-sidebar-foot">
            <div className="pf-row">
              <FlaskConical size={16} />
              <strong>Yeni güvenli merkez</strong>
            </div>
            <p>
              Gerçek görsel üretimi için sunucu API ayarı gerekir. V2 kayıtları
              otomatik aktarılmaz.
            </p>
            <a
              href="#legacy"
              className="pf-row"
              style={{ color: "#efbd78", textDecoration: "none" }}
            >
              <ArrowLeft size={13} /> V2 / eski kayıtlar
            </a>
          </div>
        </aside>
        <div style={{ minWidth: 0 }}>
          <header className="pf-topbar">
            <div className="pf-topbar-left">
              <span
                className="pf-brand-mark"
                style={{ width: 28, height: 28, borderRadius: 7 }}
              >
                <Boxes size={17} />
              </span>
              <span>
                Skyline / <strong style={{ color: "#e4eaf4" }}>{title}</strong>
              </span>
            </div>
            <div className="pf-topbar-actions">
              <Tag tone={connected ? "green" : "amber"}>
                {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span className="pf-desktop-label">
                  {loading
                    ? "Bağlanıyor"
                    : connected
                      ? "Sunucu bağlı"
                      : "Çevrimdışı"}
                </span>
              </Tag>
              <PwaControls />
              <div className="pf-wallet">
                <small>Sunucu SC</small>
                <strong>
                  {data?.user ? formatSc(data.user.balance) : "—"}
                </strong>
              </div>
              <Button
                aria-label="Hesap ve aktarım ekranını aç"
                variant="secondary"
                onClick={() => navigate("account")}
              >
                <UserRound size={15} />
                <span className="pf-desktop-label">
                  {data?.user?.username || "Giriş yap"}
                </span>
              </Button>
            </div>
          </header>
          <main className="pf-main">
            {data?.environment === "development" && (
              <div className="pf-banner">
                <span>
                  <strong>Geliştirme önizlemesi.</strong> Buradaki kayıtlar test
                  veritabanındadır; Render’daki gerçek bakiyeler ve hesaplar
                  etkilenmez.
                </span>
                <Tag>Test ortamı</Tag>
              </div>
            )}
            {loading && (
              <div className="pf-banner">
                <span className="pf-row">
                  <LoaderCircle className="pf-spin" size={17} /> Güvenli sunucu
                  kontrol ediliyor…
                </span>
              </div>
            )}
            {!loading && !connected && (
              <div className="pf-banner pf-banner--error">
                <div>
                  <strong>
                    {data
                      ? "Bağlantı kesildi."
                      : "V3 sunucusu henüz bağlı değil."}
                  </strong>
                  <p style={{ marginTop: 5 }}>{error}</p>
                </div>
                <Button variant="ghost" onClick={() => void refresh()}>
                  Tekrar kontrol et
                </Button>
              </div>
            )}
            {data?.user && data.user.status !== "approved" && (
              <div className="pf-banner">
                <span>
                  Hesabın yetkili onayını bekliyor. Ücretli işlemler kapalı; V2
                  yedek/aktarım ekranını kullanabilirsin.
                </span>
                <Button variant="ghost" onClick={() => navigate("account")}>
                  Aktarım ekranı
                </Button>
              </div>
            )}
            {page === "home" && <HomePage />}
            {page === "studio" && <Studio />}
            {page === "inventory" && <OnlineInventory />}
            {page === "clans" && <Clans />}
            {page === "battles" && <Battles />}
            {page === "collections" && <Collections />}
            {page === "market" && <Market />}
            {page === "gallery" && <Gallery />}
            {page === "account" && <Account />}
            {page === "admin" && <OnlineAdmin />}
            <footer className="pf-footer">
              <span>SKYLINE RP · SOSYAL & YARATICI MERKEZ</span>
              <span>
                SC oyun parasıdır. Gerçek paraya çekim / Steam eşya aktarımı
                yoktur.
              </span>
              <a href="#legacy" style={{ color: "#96a3b9" }}>
                V2 kayıtlarına dön
              </a>
            </footer>
          </main>
        </div>
      </div>
      <nav className="pf-mobile-nav" aria-label="Mobil gezinme">
        {nav
          .filter((n) =>
            ["home", "studio", "battles", "market", "account"].includes(n.page),
          )
          .map((n) => (
            <a
              key={n.page}
              href={`#platform/${n.page}`}
              aria-current={page === n.page ? "page" : undefined}
            >
              <n.icon size={19} />
              {n.label === "Hesap & Aktarım" ? "Hesap" : n.label}
            </a>
          ))}
      </nav>
      {notice && (
        <div
          className={`pf-toast ${notice.kind === "error" ? "pf-toast--error" : ""}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.kind === "error" ? (
            <XCircle size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
          <span>{notice.text}</span>
        </div>
      )}
    </div>
  );
}
export function PlatformApp() {
  return (
    <PlatformProvider>
      <Frame />
    </PlatformProvider>
  );
}
export function LegacyLauncher() {
  return (
    <div className="pf-launcher">
      <a href="#platform">
        <Sparkles size={15} /> AI & Sosyal Merkez <span>V3</span>
      </a>
      <button
        onClick={() => {
          try {
            backupLegacy();
          } catch (e) {
            alert(e instanceof Error ? e.message : "Yedek alınamadı.");
          }
        }}
      >
        <Download size={14} /> V2 yedeği indir
      </button>
      <PwaControls />
    </div>
  );
}
export function LegacyArchive() {
  const snapshot = legacySnapshot();
  return (
    <div className="platform">
      <div className="pf-legacy-archive">
        <Title eyebrow="Eski kayıtlar silinmedi" title="V2 kayıt arşivin">
          Bu tarayıcıdaki hesaplardan en az biri için sunucu aktarımı onaylandı.
          V2 tüm hesapları ortak bir belgede tuttuğu için belgenin tamamı
          değişikliklere kapatıldı. Diğer yerel hesapların para ve eşyaları da
          korunur; onların aktarımı ayrıca incelenir.
        </Title>
        <Panel>
          <div className="pf-grid pf-grid-2">
            <div className="pf-stat">
              <span>Eski kayıttaki beyan · {snapshot?.name}</span>
              <strong>{formatSc(snapshot?.balance || 0)}</strong>
            </div>
            <div className="pf-stat">
              <span>Arşivdeki eşya sayısı</span>
              <strong>{snapshot?.inventory.length || 0}</strong>
            </div>
          </div>
          <p className="pf-muted pf-gap">
            Bu eski değerler sunucu bakiyesine eklenmez. Doğrulanmış tutarı,
            aktarılan eşyaları ve uzlaştırma sonucunu güvenli merkezden
            görebilirsin. Katalog dışı öğelerin ham yedekte korunur.
          </p>
          <div className="pf-row pf-gap">
            <Button onClick={() => navigate("account")}>
              <Wallet size={17} /> Sunucu hesabımı aç
            </Button>
            <Button variant="secondary" onClick={() => backupLegacy()}>
              <Download size={17} /> Orijinal V2 yedeğini indir
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
