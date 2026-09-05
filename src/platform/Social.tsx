import { useState } from "react";
import { Check, Copy, Crown, Plus, Users, Shield, Medal } from "lucide-react";
import { usePlatform } from "./context";
import {
  AuthGate,
  Button,
  Empty,
  Field,
  Modal,
  Panel,
  SafetyNote,
  SkinImage,
  Tag,
  Title,
} from "./ui";
export function Clans() {
  const { data, act, busy, notify } = usePlatform();
  const [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [tag, setTag] = useState(""),
    [emblem, setEmblem] = useState("🛡️"),
    [code, setCode] = useState("");
  const mine = data?.clans.find((c) =>
    c.members.some((m) => m.id === data.user?.id),
  );
  const active = data?.user?.status === "approved";
  return (
    <>
      <Title
        eyebrow="Tek başına değil, birlikte"
        title="Klanlar"
        action={
          !mine && (
            <Button disabled={!active} onClick={() => setCreating(true)}>
              <Plus size={17} /> Klan kur
            </Button>
          )
        }
      >
        Kendi ekibini kur. Tasarımlar, canlı odalar ve pazar satışları takımının
        ortak ilerlemesine katkı sağlasın.
      </Title>
      <SafetyNote>
        Klan görev puanları: onaylanan tasarım +10, tamamlanan canlı oda kişi
        başına +5, pazar satışı +3. Puanlar SC değildir ve paraya çevrilmez.
      </SafetyNote>
      {mine && (
        <Panel className="pf-gap">
          <div className="pf-row pf-between">
            <div className="pf-row">
              <div className="pf-clan-logo">{mine.emblem}</div>
              <div>
                <p className="pf-eyebrow">Senin ekibin · [{mine.tag}]</p>
                <h2>{mine.name}</h2>
              </div>
            </div>
            <Tag tone="amber">{mine.points} takım puanı</Tag>
          </div>
          <div className="pf-grid pf-grid-2 pf-gap">
            <div>
              <p className="pf-small pf-muted">
                Takım hedefi: 100 puan · {Math.min(mine.points, 100)}/100
              </p>
              <div className="pf-progress">
                <span style={{ width: `${Math.min(100, mine.points)}%` }} />
              </div>
              <Tag tone={mine.points >= 100 ? "green" : "muted"}>
                {mine.points >= 100
                  ? "✓ Yaratıcı Ekip rozeti"
                  : "Yaratıcı Ekip rozeti için birlikte ilerle"}
              </Tag>
              <div className="pf-row pf-gap">
                <code className="pf-invite">{mine.code}</code>
                <Button
                  variant="ghost"
                  aria-label="Davet kodunu kopyala"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(mine.code || "");
                      notify("Davet kodu kopyalandı.");
                    } catch {
                      notify("Kopyalanamadı; kodu elle seçebilirsin.", "error");
                    }
                  }}
                >
                  <Copy size={16} />
                </Button>
              </div>
              <p className="pf-small pf-muted pf-gap">
                Kod yalnızca üyelere gösterilir. Paylaştığın kişi doğrudan
                katılabilir.
              </p>
              {mine.leaderId === data?.user?.id && (
                <Button
                  variant="ghost"
                  className="pf-gap"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      "clans/action",
                      { action: "rotate" },
                      "Eski davet kodu kapatıldı; yeni kod hazır.",
                    )
                  }
                >
                  Davet kodunu yenile
                </Button>
              )}
            </div>
            <div>
              {mine.members.map((m) => (
                <div key={m.id} className="pf-member">
                  <span className="pf-row">
                    {m.id === mine.leaderId ? (
                      <Crown size={15} color="#e6b965" />
                    ) : (
                      <Users size={15} />
                    )}{" "}
                    {m.username}
                  </span>
                  {mine.leaderId === data?.user?.id &&
                    m.id !== mine.leaderId && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              `${m.username} klan lideri olsun mu? Bu yetkiyi devredeceksin.`,
                            )
                          )
                            void act(
                              "clans/action",
                              { action: "transfer", userId: m.id },
                              "Liderlik devredildi.",
                            );
                        }}
                      >
                        Lider yap
                      </Button>
                    )}
                </div>
              ))}
              <Button
                variant="danger"
                className="pf-gap"
                disabled={busy}
                onClick={() => {
                  if (confirm("Klandan ayrılmak istiyor musun?"))
                    void act(
                      "clans/action",
                      { action: "leave" },
                      "Klandan ayrıldın.",
                    );
                }}
              >
                Klandan ayrıl
              </Button>
            </div>
          </div>
          {!!mine.requests?.length && (
            <div className="pf-gap">
              <h3>Katılım istekleri</h3>
              {mine.requests.map((r) => (
                <div className="pf-member" key={r.id}>
                  <span>{r.username}</span>
                  <div className="pf-row">
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          "clans/action",
                          { action: "accept", userId: r.id },
                          "Oyuncu klana katıldı.",
                        )
                      }
                    >
                      Kabul et
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void act("clans/action", {
                          action: "reject",
                          userId: r.id,
                        })
                      }
                    >
                      Reddet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
      {!mine && (
        <Panel className="pf-gap">
          <h3>Bir davet kodun var mı?</h3>
          <div className="pf-row pf-gap">
            <input
              className="pf-input"
              style={{ maxWidth: 280 }}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              aria-label="Klan davet kodu"
              placeholder="Davet kodunu yaz"
            />
            <Button
              disabled={!active || busy || !code.trim()}
              onClick={() =>
                void act(
                  "clans/action",
                  { action: "invite", code },
                  "Klana katıldın.",
                )
              }
            >
              Kodla katıl
            </Button>
          </div>
        </Panel>
      )}
      <div className="pf-section-head">
        <h2>Topluluk ekipleri</h2>
        <Tag>{data?.clans.length || 0} klan</Tag>
      </div>
      {!data?.clans.length ? (
        <Empty title="İlk ekip burada kurulacak">
          Klanlar uydurma oyuncularla doldurulmaz. Gerçek hesaplar katıldıkça bu
          alan büyür.
        </Empty>
      ) : (
        <div className="pf-grid pf-grid-3">
          {data.clans.map((c) => (
            <Panel key={c.id}>
              <div className="pf-row">
                <div className="pf-clan-logo">{c.emblem}</div>
                <div>
                  <p className="pf-eyebrow">[{c.tag}]</p>
                  <h3>{c.name}</h3>
                </div>
              </div>
              <div className="pf-row pf-between pf-gap">
                <span className="pf-small pf-muted">
                  {c.members.length}/30 üye
                </span>
                <Tag tone="amber">{c.points} puan</Tag>
              </div>
              {c.points >= 100 && (
                <div className="pf-row pf-gap">
                  <Medal size={17} />
                  <span className="pf-small">Yaratıcı Ekip</span>
                </div>
              )}
              {!mine && (
                <Button
                  variant="secondary"
                  className="pf-gap"
                  disabled={!active || busy || c.members.length >= 30}
                  onClick={() =>
                    void act(
                      "clans/action",
                      { action: "request", clanId: c.id },
                      "İstek klan liderine gönderildi.",
                    )
                  }
                >
                  Katılma isteği gönder
                </Button>
              )}
            </Panel>
          ))}
        </div>
      )}
      {creating && (
        <Modal title="Klanını kur" onClose={() => setCreating(false)}>
          <div className="pf-stack">
            <Field label="Klan adı">
              <input
                value={name}
                maxLength={32}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Gece Muhafızları"
              />
            </Field>
            <Field label="Etiket · 2–5 harf veya sayı">
              <input
                value={tag}
                maxLength={5}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                placeholder="GECE"
              />
            </Field>
            <Field label="Amblem">
              <select
                value={emblem}
                onChange={(e) => setEmblem(e.target.value)}
              >
                {["🛡️", "🔥", "🌙", "⚡", "🌿", "💎"].map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </Field>
            <SafetyNote>
              Klan kurmak ücretsiz. Ortak banka veya üyelerden otomatik SC
              kesintisi yoktur.
            </SafetyNote>
            <Button
              disabled={
                busy || name.trim().length < 3 || !/^[A-Z0-9]{2,5}$/.test(tag)
              }
              onClick={async () => {
                const r = await act(
                  "clans/create",
                  { name, tag, emblem },
                  "Klan kuruldu.",
                );
                if (r) setCreating(false);
              }}
            >
              <Shield size={17} /> Klanı oluştur
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Collections() {
  const { data, act, busy } = usePlatform();
  const owned = new Set(data?.inventory.map((i) => i.catalogId));
  return (
    <>
      <Title eyebrow="Her parçanın bir yeri var" title="Koleksiyon albümü">
        Eksiklerini gör, setini tamamla ve kalıcı koleksiyon ünvanını aç.
        Ödüller kozmetiktir; SC üretmez.
      </Title>
      <AuthGate>
        <div className="pf-stack">
          {data?.catalog.collections.map((collection) => {
            const count = collection.ids.filter((id) => owned.has(id)).length,
              claimed = data.claims.includes(collection.id);
            return (
              <Panel key={collection.id}>
                <div className="pf-row pf-between">
                  <div>
                    <p className="pf-eyebrow">
                      {count}/{collection.ids.length} parça
                    </p>
                    <h2>{collection.name}</h2>
                    <p className="pf-small pf-muted pf-gap">
                      {collection.description}
                    </p>
                  </div>
                  <Tag tone={claimed ? "green" : "amber"}>
                    {claimed ? "✓ Ünvan açıldı" : collection.reward}
                  </Tag>
                </div>
                <div className="pf-progress">
                  <span
                    style={{
                      width: `${(count / collection.ids.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="pf-collection-items">
                  {collection.ids.map((id) => {
                    const skin = data.catalog.skins.find((s) => s.id === id);
                    return (
                      <div
                        className="pf-collection-item"
                        data-owned={owned.has(id)}
                        key={id}
                        title={skin?.name}
                      >
                        <SkinImage catalogId={id} alt={skin?.name || id} />
                        <small>{skin?.name}</small>
                        {owned.has(id) && (
                          <Check size={14} className="pf-check" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="pf-row pf-between">
                  <p className="pf-small pf-muted">
                    {claimed
                      ? "Bu ünvan hesabına kalıcı olarak kaydedildi."
                      : `Tamamlayınca: ${collection.reward}`}
                  </p>
                  <Button
                    disabled={
                      busy || claimed || count !== collection.ids.length
                    }
                    onClick={() =>
                      void act(
                        "collections/claim",
                        { id: collection.id },
                        "Koleksiyon ünvanın açıldı.",
                      )
                    }
                  >
                    {claimed ? "Alındı" : "Ünvanı al"}
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      </AuthGate>
    </>
  );
}
