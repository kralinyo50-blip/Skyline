import { useState } from "react";
import {
  Sparkles,
  WandSparkles,
  ArrowRight,
  LockKeyhole,
  LoaderCircle,
  ImagePlus,
  Check,
  PackageOpen,
} from "lucide-react";
import {
  aiDetails,
  aiStyles,
  aiWeapons,
  studioInput,
  studioPrice,
  formatSc,
  type StudioInput,
} from "../../shared/platform";
import { usePlatform, navigate } from "./context";
import {
  AuthGate,
  Button,
  Empty,
  Field,
  ItemArt,
  Modal,
  Panel,
  SafetyNote,
  Tag,
  Title,
} from "./ui";
const initial: StudioInput = {
  name: "",
  prompt: "",
  weapon: "AK-47",
  style: "Neon",
  quality: "medium",
  details: [],
};
type Quote = {
  id: string;
  price: ReturnType<typeof studioPrice>;
  expiresAt: number;
};
export function Studio() {
  const { data, act, busy, connected } = usePlatform();
  const [draft, setDraft] = useState<StudioInput>(initial),
    [quote, setQuote] = useState<Quote | null>(null);
  const valid = studioInput.safeParse(draft);
  const estimate = studioPrice({
    ...draft,
    name: draft.name.trim().length >= 3 ? draft.name : "Taslak Skin",
    prompt:
      draft.prompt.trim().length >= 20
        ? draft.prompt
        : "Sade bir yüzey üzerinde özgün bir tasarım",
  });
  const approved = data?.user?.status === "approved",
    activeJob = data?.jobs.some((j) =>
      ["queued", "running"].includes(j.status),
    );
  const update = (value: Partial<StudioInput>) => {
    setDraft((d) => ({ ...d, ...value }));
    setQuote(null);
  };
  const getQuote = async () => {
    if (!valid.success) return;
    const result = await act<Quote>(
      "ai/quote",
      valid.data,
      "Sunucu fiyatı hesaplandı; henüz SC kesilmedi.",
    );
    if (result) setQuote(result);
  };
  return (
    <>
      <Title eyebrow="Yaratıcılık senin. İmza senin." title="AI Skin Atölyesi">
        Tasarımını anlat, detaylarını seç, maliyetini gör. Gerçek üretim
        tamamlanınca benzersiz görsel sunucu envanterine kaydedilir.
      </Title>
      {!data?.ai.enabled && (
        <div className="pf-banner">
          <div className="pf-row">
            <LockKeyhole size={20} />
            <span>
              <strong>API kurulumu bekleniyor.</strong> Şu anda gerçek üretim ve
              SC kesintisi kapalı. Anahtar sunucuya eklenince bu ekran aynı
              akışla çalışacak.
            </span>
          </div>
          <Tag tone="amber">Sahte çıktı yok</Tag>
        </div>
      )}
      <div className="pf-studio-grid">
        <Panel>
          <div className="pf-row pf-between">
            <h2>Tasarım masası</h2>
            <Tag>01 / Açıklama</Tag>
          </div>
          <div className="pf-stack pf-gap">
            <Field label="Skin adı">
              <input
                value={draft.name}
                maxLength={64}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Örn. Mor Fırtına"
              />
            </Field>
            <div className="pf-grid pf-grid-2">
              <Field label="Silah modeli">
                <select
                  value={draft.weapon}
                  onChange={(e) =>
                    update({ weapon: e.target.value as StudioInput["weapon"] })
                  }
                >
                  {aiWeapons.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sanat yönü">
                <select
                  value={draft.style}
                  onChange={(e) =>
                    update({ style: e.target.value as StudioInput["style"] })
                  }
                >
                  {aiStyles.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Aklındaki tasarımı anlat"
              hint={`${[...draft.prompt].length}/1200 karakter · Ek cümleler ve uzun açıklamalar tarifeye yansır.`}
            >
              <textarea
                value={draft.prompt}
                maxLength={1200}
                onChange={(e) => update({ prompt: e.target.value })}
                placeholder="Mat siyah bir AK-47. Gövdesinde mor elektrik damarları, şarjöründe ince gümüş desenler olsun…"
              />
            </Field>
            <div>
              <p className="pf-small pf-muted" style={{ marginBottom: 10 }}>
                Detay paketi · En fazla 4 seçim, her biri 2.500 SC
              </p>
              <div className="pf-row">
                {aiDetails.map((detail) => (
                  <button
                    key={detail}
                    className="pf-chip"
                    aria-pressed={draft.details.includes(detail)}
                    disabled={
                      !draft.details.includes(detail) &&
                      draft.details.length >= 4
                    }
                    onClick={() =>
                      update({
                        details: draft.details.includes(detail)
                          ? draft.details.filter((d) => d !== detail)
                          : [...draft.details, detail],
                      })
                    }
                  >
                    {draft.details.includes(detail) && "✓ "}
                    {detail}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Üretim kalitesi">
              <select
                value={draft.quality}
                onChange={(e) =>
                  update({ quality: e.target.value as StudioInput["quality"] })
                }
              >
                <option value="medium">Standart · 1024 × 1024</option>
                <option value="high">Yüksek · 1024 × 1024 · +15.000 SC</option>
              </select>
            </Field>
            <SafetyNote>
              API anahtarı tarayıcıya gönderilmez. Üretim tamamlanamazsa kesilen
              SC sunucu tarafından tam olarak iade edilir.
            </SafetyNote>
          </div>
        </Panel>
        <div className="pf-stack pf-sticky">
          <Panel>
            <div className="pf-row pf-between">
              <h2>Üretim hesabı</h2>
              <Sparkles size={22} color="#efb762" />
            </div>
            <p className="pf-small pf-muted pf-gap">
              Tahmini oyun içi maliyet. Kesin fiyat üretimden önce sunucudan
              alınır.
            </p>
            <div className="pf-breakdown">
              {estimate.lines.map((line) => (
                <div key={line.label}>
                  <span>{line.label}</span>
                  <strong>{formatSc(line.amount)}</strong>
                </div>
              ))}
              <div className="pf-total">
                <span>Toplam</span>
                <strong>{formatSc(estimate.total)}</strong>
              </div>
            </div>
            <Button
              className="pf-gap"
              style={{ width: "100%" }}
              disabled={
                busy || !connected || !approved || !valid.success || activeJob
              }
              onClick={() => void getQuote()}
            >
              <WandSparkles size={17} /> Fiyatı doğrula <ArrowRight size={16} />
            </Button>
            {!approved && (
              <Button
                variant="ghost"
                className="pf-gap"
                style={{ width: "100%" }}
                onClick={() => navigate("account")}
              >
                Giriş / hesap onayı
              </Button>
            )}
            <p className="pf-small pf-muted pf-gap">
              Bu tutar bir satış değeri veya kazanç garantisi değildir. API
              sağlayıcısının gerçek para faturası site sahibine aittir.
            </p>
          </Panel>
          <Panel>
            <div className="pf-row">
              <ImagePlus size={20} />
              <h3>Üret → incele → yayınla</h3>
            </div>
            <p className="pf-small pf-muted pf-gap">
              Üretilen skin önce yalnızca sende görünür. Galeri onayından sonra
              açık artırmaya veya “hemen al” satışına koyabilirsin.
            </p>
            <p className="pf-small pf-muted pf-gap">
              Skyline’a özel dijital görseldir; Steam/CS2 eşyası veya oyuna
              aktarılabilir bir 3D model değildir.
            </p>
          </Panel>
        </div>
      </div>
      <div className="pf-section-head">
        <h2>Üretim geçmişin</h2>
        <span className="pf-small pf-muted">
          Sekmeyi kapatsan da sunucudaki işlem sürer.
        </span>
      </div>
      {!data?.jobs.length ? (
        <Empty title="İlk imzanı henüz üretmedin">
          Ücretli işlem başladığında durumu ve iade bilgisi burada görünür.
        </Empty>
      ) : (
        <Panel>
          {data.jobs.map((job) => (
            <div key={job.id} className="pf-job">
              {["queued", "running"].includes(job.status) ? (
                <LoaderCircle className="pf-spin" size={22} />
              ) : job.status === "complete" ? (
                <Check size={22} color="#85d5ad" />
              ) : (
                <PackageOpen size={22} />
              )}
              <div>
                <strong>{job.name}</strong>
                <small>
                  {job.error ||
                    {
                      queued: "Üretim sırasında",
                      running: "Gerçek görsel oluşturuluyor",
                      complete: "Envantere kaydedildi",
                      failed: "Başarısız — SC iade edildi",
                    }[job.status]}
                </small>
              </div>
              <span className="pf-small">{formatSc(job.price)}</span>
              {job.status === "complete" && (
                <Button
                  variant="secondary"
                  onClick={() => navigate("inventory")}
                >
                  Gör
                </Button>
              )}
            </div>
          ))}
        </Panel>
      )}
      {quote && (
        <Modal title="Üretim onayı" onClose={() => setQuote(null)}>
          <div className="pf-stack">
            <p>
              <strong>{draft.name}</strong> için sunucunun hesapladığı tutar:
            </p>
            <div className="pf-breakdown">
              {quote.price.lines.map((l) => (
                <div key={l.label}>
                  <span>{l.label}</span>
                  <strong>{formatSc(l.amount)}</strong>
                </div>
              ))}
              <div className="pf-total">
                <span>Kesilecek SC</span>
                <strong>{formatSc(quote.price.total)}</strong>
              </div>
            </div>
            <SafetyNote>
              Teklif 15 dakika geçerli. Tekrar tıklama aynı teklif için ikinci
              üretim veya ücret oluşturmaz.
            </SafetyNote>
            {!data?.ai.enabled && (
              <p className="pf-alert-text">
                API etkin değil; üretim onaylanamaz ve ücret kesilmez.
              </p>
            )}
            <Button
              disabled={
                busy ||
                !connected ||
                !data?.ai.enabled ||
                Date.now() >= quote.expiresAt
              }
              onClick={async () => {
                const result = await act(
                  "ai/generate",
                  { quoteId: quote.id },
                  "Üretim sıraya alındı. Durumunu bu ekrandan takip edebilirsin.",
                );
                if (result) setQuote(null);
              }}
            >
              <Sparkles size={17} /> {formatSc(quote.price.total)} öde ve üret
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function OnlineInventory() {
  const { data, act, busy } = usePlatform();
  return (
    <>
      <Title eyebrow="Sunucuda saklanan sahiplik" title="Envanterin">
        AI üretimlerin, doğrulanmış eski eşyaların ve canlı oda kazanımları.
        Aktif ilandaki eşyalar işlem bitene kadar kilitlidir.
      </Title>
      <AuthGate>
        {!data?.inventory.length ? (
          <Empty title="Sunucu envanterin henüz boş">
            <p>
              Eski eşyaların otomatik silinmedi. Hesap merkezinden yedek/aktarım
              talebi oluşturabilir veya atölyede üretim yapabilirsin.
            </p>
            <div className="pf-row">
              <Button onClick={() => navigate("account")}>
                Eski kaydımı aktar
              </Button>
              <Button variant="secondary" onClick={() => navigate("studio")}>
                Atölyeye git
              </Button>
            </div>
          </Empty>
        ) : (
          <div className="pf-grid pf-grid-4">
            {data.inventory.map((item) => (
              <article className="pf-item" key={item.id}>
                <ItemArt item={item} />
                <div className="pf-item-body">
                  <div className="pf-row pf-between">
                    <Tag tone={item.designId ? "amber" : "muted"}>
                      {item.designId ? "AI üretimi" : item.weapon}
                    </Tag>
                    {item.lockedBy && <Tag>Kilitli</Tag>}
                  </div>
                  <h3 style={{ marginTop: 13 }} title={item.name}>
                    {item.name}
                  </h3>
                  <p>
                    {item.designId ? "Üretim bedeli" : "Katalog referansı"}:{" "}
                    {formatSc(item.cost)}
                  </p>
                  {item.metadata.float !== undefined && (
                    <p>Float: {String(item.metadata.float)}</p>
                  )}
                  <div className="pf-row">
                    {!item.tradable && item.designId ? (
                      <Button
                        variant="secondary"
                        disabled={busy || item.moderationStatus !== "draft"}
                        onClick={() =>
                          void act(
                            "gallery/action",
                            { action: "publish", id: item.designId },
                            "Tasarım galeri incelemesine gönderildi.",
                          )
                        }
                      >
                        {item.moderationStatus === "draft"
                          ? "Yayına gönder"
                          : "Onay bekliyor / yayın dışı"}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        disabled={!!item.lockedBy}
                        onClick={() => navigate("market", `item=${item.id}`)}
                      >
                        Satışa koy
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AuthGate>
    </>
  );
}
