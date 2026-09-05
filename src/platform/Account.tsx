import { useMemo, useState } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  LogOut,
  KeyRound,
  Archive,
  Check,
} from "lucide-react";
import { formatSc, type MigrationSnapshot } from "../../shared/platform";
import { usePlatform, navigate } from "./context";
import {
  backupLegacy,
  downloadJson,
  legacyRaw,
  legacySnapshot,
} from "./legacy";
import { Button, Empty, Field, Panel, SafetyNote, Tag, Title } from "./ui";
export function Account() {
  const { data, act, busy, connected, notify } = usePlatform();
  const [register, setRegister] = useState(false),
    [name, setName] = useState(() => legacySnapshot()?.name || ""),
    [password, setPassword] = useState(""),
    [uploaded, setUploaded] = useState(""),
    [filename, setFilename] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const user = data?.user;
  const localRaw = legacyRaw();
  const snapshot = useMemo(
    () => legacySnapshot(uploaded || localRaw, user?.username),
    [uploaded, localRaw, user?.username],
  );
  const known = new Set(data?.catalog.skins.map((s) => s.id));
  const unknown =
    snapshot?.inventory.filter((i) => !known.has(i.skinId)).length || 0;
  const backup = () => {
    try {
      if (uploaded)
        downloadJson("skyline-v2-import-yedegi.json", JSON.parse(uploaded));
      else backupLegacy();
      notify(
        "Yedek dosyası indirildi. Özel bir yerde sakla; kimseyle paylaşma.",
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Yedek okunamadı.", "error");
    }
  };
  return (
    <>
      <Title
        eyebrow="Kayıtlarını koruyarak ilerle"
        title="Hesap ve güvenli geçiş"
      >
        Sunucu SC’si ayrı bir para birimi değil; doğrulanmış tek oyun
        bakiyesidir. V2 kaydın onaysız şekilde silinmez, sıfırlanmaz veya sunucu
        parası sayılmaz.
      </Title>
      {!user ? (
        <div className="pf-account-grid">
          <Panel>
            <div className="pf-row pf-between">
              <h2>
                {register ? "Güvenli hesabını oluştur" : "Tekrar hoş geldin"}
              </h2>
              <KeyRound size={22} color="#eeba6d" />
            </div>
            <form
              className="pf-stack pf-gap"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await act(
                  `auth/${register ? "register" : "login"}`,
                  { username: name, password },
                  register
                    ? "Hesap oluşturuldu; yetkili onayı bekleniyor."
                    : "Giriş yapıldı.",
                );
                if (r) setPassword("");
              }}
            >
              <Field
                label="Minecraft kullanıcı adı"
                hint="Aktarım yapacaksan eski kaydındaki adla aynı olmalı."
              >
                <input
                  autoComplete="username"
                  value={name}
                  minLength={3}
                  maxLength={16}
                  pattern="[A-Za-z0-9_]{3,16}"
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field
                label="Şifre"
                hint={
                  register
                    ? "En az 12 karakter. Bu, yalnızca güvenli merkezin şifresidir."
                    : undefined
                }
              >
                <input
                  type="password"
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={register ? 12 : 1}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={busy || !connected}>
                {register ? "Hesap oluştur" : "Giriş yap"}
              </Button>
              <Button variant="ghost" onClick={() => setRegister((v) => !v)}>
                {register
                  ? "Hesabım var, giriş yap"
                  : "İlk kez geliyorum, hesap oluştur"}
              </Button>
            </form>
            <p className="pf-small pf-muted pf-gap">
              V2’deki kullanıcı adı veya “admin” etiketi sunucuda yetki vermez.
              Yeni hesaplar yetkili onayını bekler. Şifren tarayıcı depolamasına
              kaydedilmez.
            </p>
          </Panel>
          <Panel>
            <Archive size={30} color="#eeba6d" />
            <h2 className="pf-gap">Önce yedek, sonra geçiş.</h2>
            <div className="pf-stack pf-gap">
              <p className="pf-muted">
                Render adresin değişirse tarayıcıdaki eski para ve eşyalara yeni
                adresten erişilemez. Bu, kayıtların silindiği anlamına gelmez.
              </p>
              <p className="pf-small pf-muted">
                Eski site adresinden V2 yedeğini indir. Yeni adreste aynı isimle
                güvenli hesap oluştur ve dosyayı aktarım ekranında seç.
              </p>
              <Button variant="secondary" onClick={backup}>
                <Download size={17} /> Bu adresteki V2 yedeğini indir
              </Button>
              <SafetyNote>
                Yedek dosyası kişiseldir. Sunucuya yalnızca seçili hesabın
                bakiye ve eşya aktarım talebi gönderilir; tüm yerel veritabanı
                gönderilmez.
              </SafetyNote>
            </div>
          </Panel>
        </div>
      ) : (
        <>
          <div className="pf-grid pf-grid-3 pf-financial-stats">
            <Panel className="pf-stat">
              <span>Güvenli hesap</span>
              <strong>{user.username}</strong>
              <Tag tone={user.status === "approved" ? "green" : "amber"}>
                {user.status === "approved"
                  ? "Yetkili onaylı"
                  : user.status === "suspended"
                    ? "Askıya alındı"
                    : "Onay bekliyor"}
              </Tag>
            </Panel>
            <Panel className="pf-stat">
              <span>Harcanabilir sunucu SC’si</span>
              <strong>{formatSc(user.balance)}</strong>
              <span>Bloke teklifler bu tutara dahil değil.</span>
            </Panel>
            <Panel className="pf-stat">
              <span>V2 aktarımı</span>
              <strong>
                {user.migratedAt
                  ? "Tamamlandı"
                  : data?.migration
                    ? "İncelemede"
                    : "Henüz yapılmadı"}
              </strong>
              <span>Ham V2 kaydı ve yedek korunur.</span>
            </Panel>
          </div>
          <div className="pf-account-grid pf-gap">
            <Panel>
              <h2>V2 kayıtlarını koru</h2>
              <div className="pf-stack pf-gap">
                <div className="pf-row">
                  <Button variant="secondary" onClick={backup}>
                    <Download size={17} /> V2 yedeği indir
                  </Button>
                  <a
                    href="/api/account/export"
                    className="pf-button pf-button--ghost"
                    download
                  >
                    <Download size={17} /> Sunucu hesabını dışa aktar
                  </a>
                </div>
                {!data.migration && !user.migratedAt && (
                  <label className="pf-upload">
                    <Upload size={19} style={{ marginRight: 10 }} />
                    {filename || "Eski adresten aldığın JSON yedeğini seç"}
                    <input
                      type="file"
                      accept="application/json,.json"
                      aria-label="V2 yedeğini seç"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 20 * 1024 * 1024) {
                          notify(
                            "Dosya 20 MB sınırını aşıyor. Silme; yetkiliyle kontrollü aktarım planla.",
                            "error",
                          );
                          return;
                        }
                        try {
                          const raw = await file.text();
                          JSON.parse(raw);
                          setUploaded(raw);
                          setFilename(file.name);
                          setConfirmed(false);
                        } catch {
                          notify(
                            "JSON yedeği okunamadı; mevcut kayıtların değiştirilmedi.",
                            "error",
                          );
                        }
                      }}
                    />
                  </label>
                )}
                {snapshot ? (
                  <SnapshotSummary
                    snapshot={snapshot}
                    unknown={unknown}
                    approved={data.migration?.status === "approved"}
                  />
                ) : (
                  <p className="pf-alert-text">
                    Bu adreste/yedekte <strong>{user.username}</strong> adına V2
                    kaydı bulunamadı. Eski Render adresinden yedeğini indir;
                    site verilerini silme.
                  </p>
                )}
                {data.migration ? (
                  <>
                    <SafetyNote>
                      {data.migration.status === "approved"
                        ? `Onaylanan aktarım: ${formatSc(data.migration.verified?.balance || 0)} ve ${data.migration.verified?.itemUids.length || 0} eşya. Seçilmeyen/özel öğeler eski arşivde korunur.`
                        : "Talebin incelemede. Gösterdiğin miktar otomatik olarak doğru kabul edilmez; yetkili bağımsız kayıt ve hesap sahipliği kontrolü yapar."}
                    </SafetyNote>
                    {data.migration.status === "approved" && (
                      <Button onClick={() => navigate("inventory")}>
                        Sunucu envanterimi aç
                      </Button>
                    )}
                  </>
                ) : (
                  !user.migratedAt && (
                    <>
                      <label className="pf-checkbox">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          onChange={(e) => setConfirmed(e.target.checked)}
                        />
                        <span>
                          V2 yedeğimi indirdim ve sakladım. Yetkili onayından
                          sonra bu tarayıcıdaki ortak V2 kaydı arşiv sayılacak;
                          diğer yerel hesapların kayıtları da korunacak. Eski
                          oyunlar bu tarayıcıda arşiv moduna geçecek; aynı
                          bakiye veya eşya tekrar aktarılmayacak. Yeni merkezde
                          eski mini oyunların tümü henüz sunucu bakiyesine bağlı
                          değil.
                        </span>
                      </label>
                      <Button
                        disabled={!snapshot || !confirmed || busy || !connected}
                        onClick={async () => {
                          if (snapshot)
                            await act(
                              "migration/request",
                              snapshot,
                              "Aktarım talebi gönderildi. Eski bakiyen ve envanterin değiştirilmedi.",
                            );
                        }}
                      >
                        <ShieldCheck size={17} /> İnceleme için aktarım talebi
                        gönder
                      </Button>
                    </>
                  )
                )}
              </div>
            </Panel>
            <Panel>
              <h2>Hesap güvenliği</h2>
              <div className="pf-stack pf-gap">
                <SafetyNote>
                  Üretim, teklifler, iadeler ve sahiplik değişiklikleri sunucu
                  işlem kaydına yazılır. Bir tarayıcı ayarını değiştirerek SC
                  eklenemez.
                </SafetyNote>
                <p className="pf-small pf-muted">
                  V2’deki para, bu sunucuda yetkili onayı olmadan harcanamaz.
                  Aktarım sırasında toplamı birleştiren otomatik bonus yoktur.
                </p>
                <p className="pf-small pf-muted">
                  Şifreni güvenli bir yerde tut. Hesabına erişimi kaybedersen
                  sunucu sahibinden kimlik doğrulamalı hesap kurtarma iste;
                  yedek dosyanı genel sohbette paylaşma.
                </p>
                {user.role === "admin" && (
                  <Button variant="secondary" onClick={() => navigate("admin")}>
                    Sunucu yönetimini aç
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      "auth/logout",
                      {},
                      "Güvenli hesaptan çıkış yapıldı.",
                    )
                  }
                >
                  <LogOut size={17} /> Güvenli hesaptan çık
                </Button>
              </div>
            </Panel>
          </div>
          {!!data.claims.length && (
            <Panel className="pf-gap">
              <h3>Koleksiyon ünvanların</h3>
              <div className="pf-row pf-gap">
                {data.claims.map((id) => (
                  <Tag key={id} tone="green">
                    <Check size={12} />
                    {data.catalog.collections.find((c) => c.id === id)
                      ?.reward || id}
                  </Tag>
                ))}
              </div>
            </Panel>
          )}
          <div className="pf-section-head">
            <h2>SC işlem geçmişi</h2>
            <span className="pf-small pf-muted">
              Son 100 hareket · tamamı dışa aktarımda
            </span>
          </div>
          {!data.ledger.length ? (
            <Empty title="Henüz SC hareketi yok">
              Ödemeler, iadeler ve yetkili aktarımı burada görünür.
            </Empty>
          ) : (
            <Panel>
              <div className="pf-table-wrap">
                <table className="pf-table">
                  <thead>
                    <tr>
                      <th>İşlem</th>
                      <th>Değişim</th>
                      <th>İşlem sonrası</th>
                      <th>Zaman</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ledger.map((l) => (
                      <tr key={l.id}>
                        <td>{l.note}</td>
                        <td
                          className={
                            l.delta >= 0 ? "pf-positive" : "pf-negative"
                          }
                        >
                          {l.delta >= 0 ? "+" : ""}
                          {formatSc(l.delta)}
                        </td>
                        <td>{formatSc(l.balance)}</td>
                        <td>{new Date(l.createdAt).toLocaleString("tr-TR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
function SnapshotSummary({
  snapshot,
  unknown,
  approved,
}: {
  snapshot: MigrationSnapshot;
  unknown: number;
  approved: boolean;
}) {
  return (
    <div className="pf-stack">
      <div className="pf-row pf-between">
        <span className="pf-muted">V2 yedeğinin beyanı</span>
        <Tag tone={approved ? "green" : "muted"}>
          {approved ? "İnceleme tamamlandı" : "Henüz doğrulanmadı"}
        </Tag>
      </div>
      <div className="pf-grid pf-grid-2">
        <div className="pf-stat">
          <span>{snapshot.name} · eski bakiye</span>
          <strong>{formatSc(snapshot.balance)}</strong>
        </div>
        <div className="pf-stat">
          <span>Yedekteki eşya</span>
          <strong>{snapshot.inventory.length}</strong>
        </div>
      </div>
      {unknown > 0 && (
        <p className="pf-alert-text">
          {unknown} özel/katalog dışı öğe var. Bunlar otomatik dönüştürülmez;
          orijinal yedekte korunur ve ayrıca incelenir.
        </p>
      )}
      <p className="pf-small pf-muted">
        {approved
          ? "Yetkilinin onayladığı tutar ve seçili eşyalar bir kez aktarıldı. Burada orijinal V2 yedeğinin beyanı korunur."
          : "Bu rakam henüz sunucu bakiyesine eklenmiş değildir. Yetkili onaylı miktar ve seçili eşyalar aktarım sonucunda ayrıca gösterilir."}
      </p>
    </div>
  );
}
