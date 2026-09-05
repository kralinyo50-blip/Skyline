import { useState } from "react";
import { Check, ShieldCheck, Star } from "lucide-react";
import {
  formatSc,
  type PlatformState,
  type OnlineUser,
} from "../../shared/platform";
import { usePlatform } from "./context";
import {
  Button,
  Empty,
  Field,
  Modal,
  Panel,
  SafetyNote,
  Tag,
  Title,
} from "./ui";
import { DesignArt } from "./Gallery";
type Migration = NonNullable<PlatformState["admin"]>["migrations"][number];
export function OnlineAdmin() {
  const { data, act, busy } = usePlatform();
  const [tab, setTab] = useState("users"),
    [review, setReview] = useState<Migration | null>(null),
    [verifiedBalance, setVerifiedBalance] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [note, setNote] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [grant, setGrant] = useState<OnlineUser | null>(null),
    [amount, setAmount] = useState(""),
    [operationId, setOperationId] = useState(() => crypto.randomUUID());
  if (!data?.admin)
    return (
      <Empty title="Yetkili girişi gerekli">
        V2’de admin görünmek bu sunucuda yetki vermez. Yetkili hesabı yalnızca
        sunucu ortam ayarlarıyla kurulur.
      </Empty>
    );
  const known = new Set(data.catalog.skins.map((s) => s.id));
  const pending = data.designs.filter((d) => d.status === "pending");
  return (
    <>
      <Title eyebrow="Yalnızca sunucu yetkilisi" title="Kontrol odası">
        SC işlemleri, doğrulanmış aktarım ve topluluk moderasyonu. Her yönetim
        işlemi denetim kaydına yazılır.
      </Title>
      <div className="pf-row" style={{ marginBottom: 24 }}>
        {[
          ["users", "Hesaplar"],
          ["migration", `Aktarım (${data.admin.migrations.length})`],
          ["designs", `Tasarım onayı (${pending.length})`],
          ["reports", `Raporlar (${data.admin.reports.length})`],
          ["audit", "Denetim kaydı"],
        ].map(([key, label]) => (
          <button
            className="pf-chip"
            aria-pressed={tab === key}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "users" && (
        <Panel>
          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>Hesap</th>
                  <th>Sunucu SC</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data.admin.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.username}
                      <small>
                        {u.role === "admin"
                          ? "Sunucu yetkilisi"
                          : u.migratedAt
                            ? "V2 aktarılmış"
                            : "Yeni / aktarılmamış"}
                      </small>
                    </td>
                    <td>{formatSc(u.balance)}</td>
                    <td>
                      <Tag tone={u.status === "approved" ? "green" : "amber"}>
                        {u.status === "approved"
                          ? "Onaylı"
                          : u.status === "pending"
                            ? "Bekliyor"
                            : "Askıda"}
                      </Tag>
                    </td>
                    <td>
                      <div className="pf-row">
                        {u.role !== "admin" && (
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              const status =
                                u.status === "approved"
                                  ? "suspended"
                                  : "approved";
                              if (
                                status === "suspended" &&
                                !confirm(
                                  "Hesabı askıya al? Bekleyen odalar ve ilgili açık artırmalar iptal edilip iade edilir.",
                                )
                              )
                                return;
                              void act(
                                "admin/user",
                                { id: u.id, status },
                                "Hesap durumu güncellendi.",
                              );
                            }}
                          >
                            {u.status === "approved" ? "Askıya al" : "Onayla"}
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setGrant(u);
                            setAmount("");
                            setNote("");
                            setOperationId(crypto.randomUUID());
                          }}
                        >
                          SC kaydı ekle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {tab === "migration" && (
        <div className="pf-stack">
          <SafetyNote>
            Yerel yedek tek başına güvenilir kanıt değildir. Hesap sahipliğini
            ve bakiyeyi bağımsız kayıtlardan doğrula. Özel/katalog dışı öğeler
            ham yedekte kalır; otomatik fiyata dönüştürülmez.
          </SafetyNote>
          {!data.admin.migrations.length ? (
            <Empty title="Bekleyen aktarım yok" />
          ) : (
            data.admin.migrations.map((m) => (
              <Panel key={m.id}>
                <div className="pf-row pf-between">
                  <div>
                    <h3>{m.username}</h3>
                    <p className="pf-small pf-muted pf-gap">
                      Beyan: {formatSc(m.snapshot.balance)} ·{" "}
                      {m.snapshot.inventory.length} eşya
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setReview(m);
                      setVerifiedBalance("");
                      setSelected([]);
                      setNote("");
                      setConfirmed(false);
                    }}
                  >
                    İncele ve uzlaştır
                  </Button>
                </div>
              </Panel>
            ))
          )}
        </div>
      )}
      {tab === "designs" && (
        <>
          <div className="pf-grid pf-grid-3">
            {pending.map((d) => (
              <Panel key={d.id}>
                <DesignArt design={d} />
                <h3>{d.title}</h3>
                <p className="pf-small pf-muted">
                  @{d.author} · {d.kind}
                </p>
                <p className="pf-small pf-muted pf-gap">{d.description}</p>
                <div className="pf-row pf-gap">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        "admin/design",
                        { id: d.id, status: "approved" },
                        "Tasarım onaylandı.",
                      )
                    }
                  >
                    <Check size={15} /> Onayla
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        "admin/design",
                        { id: d.id, status: "rejected" },
                        "Tasarım yayından kaldırıldı.",
                      )
                    }
                  >
                    Reddet
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
          {!pending.length && <Empty title="İnceleme kuyruğu boş" />}
          <div className="pf-section-head">
            <h2>Haftanın tasarımı</h2>
          </div>
          <Panel>
            {data.designs
              .filter((d) => d.status === "approved")
              .slice(0, 30)
              .map((d) => (
                <div className="pf-member" key={d.id}>
                  <span>
                    {d.title} · @{d.author}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={busy || d.featured}
                    onClick={() =>
                      void act(
                        "admin/feature",
                        { id: d.id },
                        "Haftanın tasarımı güncellendi.",
                      )
                    }
                  >
                    <Star size={15} />
                    {d.featured ? "Seçili" : "Haftanın seçimi yap"}
                  </Button>
                </div>
              ))}
          </Panel>
        </>
      )}
      {tab === "reports" &&
        (!data.admin.reports.length ? (
          <Empty title="Topluluk raporu yok" />
        ) : (
          <div className="pf-stack">
            {data.admin.reports.map((r, i) => (
              <Panel key={`${r.designId}-${i}`}>
                <h3>{r.title}</h3>
                <p className="pf-small pf-muted pf-gap">
                  @{r.reporter}: {r.reason}
                </p>
                <Button
                  variant="danger"
                  className="pf-gap"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "Tasarımı yayından kaldır? Bu tasarımın aktif ilanları da iptal edilip teklifler iade edilir.",
                      )
                    )
                      void act(
                        "admin/design",
                        { id: r.designId, status: "rejected" },
                        "Tasarım yayından kaldırıldı, açık teklifler iade edildi.",
                      );
                  }}
                >
                  Yayından kaldır
                </Button>
              </Panel>
            ))}
          </div>
        ))}
      {tab === "audit" && (
        <Panel>
          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>Yetkili</th>
                  <th>İşlem</th>
                  <th>Ayrıntı</th>
                  <th>Zaman</th>
                </tr>
              </thead>
              <tbody>
                {data.admin.audit.map((a, i) => (
                  <tr key={i}>
                    <td>{a.actor}</td>
                    <td>{a.action}</td>
                    <td style={{ maxWidth: 360, overflowWrap: "anywhere" }}>
                      {JSON.stringify(a.details)}
                    </td>
                    <td>{new Date(a.createdAt).toLocaleString("tr-TR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {review && (
        <Modal
          title={`${review.username} — V2 aktarımı`}
          onClose={() => setReview(null)}
        >
          <div className="pf-stack">
            <p className="pf-alert-text">
              Beyan edilen {formatSc(review.snapshot.balance)} otomatik
              onaylanmaz. Kopya/oynanmış yedekleri kabul etme. Kayıt bu işlemden
              sonra ikinci kez aktarılamaz.
            </p>
            <Field label="Bağımsız kayıttan doğruladığın SC tutarı">
              <input
                type="number"
                step="0.01"
                min="0"
                max="9000000000000"
                value={verifiedBalance}
                onChange={(e) => setVerifiedBalance(e.target.value)}
                placeholder="Tutarı kendin gir"
              />
            </Field>
            <div className="pf-row pf-between">
              <span className="pf-small">
                {selected.length}/{review.snapshot.inventory.length} eşya seçili
              </span>
              <Button
                variant="ghost"
                onClick={() =>
                  setSelected(
                    review.snapshot.inventory
                      .filter((i) => known.has(i.skinId))
                      .map((i) => i.uid),
                  )
                }
              >
                Katalogdaki tüm öğeleri seç
              </Button>
              <Button variant="ghost" onClick={() => setSelected([])}>
                Seçimi temizle
              </Button>
            </div>
            <div style={{ maxHeight: 250, overflowY: "auto" }}>
              {review.snapshot.inventory.slice(0, 200).map((i) => (
                <label key={i.uid} className="pf-member">
                  <span>
                    {data.catalog.skins.find((s) => s.id === i.skinId)?.name ||
                      i.skinId}
                    <small className="pf-muted" style={{ display: "block" }}>
                      {known.has(i.skinId)
                        ? i.uid
                        : "Katalog dışı — arşivde korunacak"}
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    disabled={!known.has(i.skinId)}
                    checked={selected.includes(i.uid)}
                    onChange={() =>
                      setSelected((v) =>
                        v.includes(i.uid)
                          ? v.filter((x) => x !== i.uid)
                          : [...v, i.uid],
                      )
                    }
                  />
                </label>
              ))}
            </div>
            {review.snapshot.inventory.length > 200 && (
              <p className="pf-small pf-muted">
                İlk 200 kayıt gösteriliyor. “Tüm öğeler” seçimi katalogdaki tüm
                eşya kimliklerini kapsar; büyük yedeği ayrıca incele.
              </p>
            )}
            <Field label="Doğrulama kaynağı / uzlaştırma notu">
              <textarea
                value={note}
                minLength={10}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Hesap sahipliği ve tutarı hangi bağımsız kayıttan doğruladın? Dışarıda kalan öğeler varsa neden?"
              />
            </Field>
            <label className="pf-checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                Hesap sahipliğini ve bu tutarı bağımsız olarak doğruladım.
                Seçilmeyen {review.snapshot.inventory.length - selected.length}{" "}
                öğe yeni envantere aktarılmayacak; ham V2 yedeğinde korunacak.
              </span>
            </label>
            <Button
              disabled={
                busy ||
                !confirmed ||
                verifiedBalance === "" ||
                note.trim().length < 10
              }
              onClick={async () => {
                const r = await act(
                  "admin/migration",
                  {
                    id: review.id,
                    balance: Number(verifiedBalance),
                    itemUids: selected,
                    note,
                    confirmed: true,
                  },
                  "Aktarım tek seferlik uygulandı ve denetim kaydına işlendi.",
                );
                if (r) setReview(null);
              }}
            >
              <ShieldCheck size={17} /> Doğrulanmış aktarımı uygula
            </Button>
          </div>
        </Modal>
      )}
      {grant && (
        <Modal
          title={`${grant.username} — SC kaydı`}
          onClose={() => setGrant(null)}
        >
          <div className="pf-stack">
            <SafetyNote>
              Bu, yetkili SC tahsisidir; V2 yedeğini içeri aktarmaz. Aktarım
              için “Aktarım” sekmesini kullan.
            </SafetyNote>
            <Field label="Verilecek SC">
              <input
                type="number"
                min="1"
                max="1000000000"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Gerekçe / kayıt referansı">
              <textarea
                value={note}
                maxLength={300}
                minLength={10}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <Button
              disabled={busy || Number(amount) < 1 || note.trim().length < 10}
              onClick={async () => {
                const r = await act(
                  "admin/credit",
                  { id: grant.id, amount: Number(amount), note, operationId },
                  "SC tahsisi işlem kaydına işlendi.",
                );
                if (r) setGrant(null);
              }}
            >
              Onayla · {formatSc(Number(amount) || 0)}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
