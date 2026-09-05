import { useState } from "react";
import { Heart, Flag, Plus, Palette, Boxes, Star } from "lucide-react";
import { type Design, type StickerDesign } from "../../shared/platform";
import { usePlatform, navigate } from "./context";
import {
  Button,
  Empty,
  Field,
  Modal,
  Panel,
  SafetyNote,
  SkinImage,
  StickerArt,
  Tag,
  Title,
} from "./ui";
export function DesignArt({ design }: { design: Design }) {
  return (
    <div className="pf-design-art">
      {design.kind === "ai" ? (
        <SkinImage image={design.image} alt={design.title} />
      ) : design.kind === "sticker" ? (
        <StickerArt value={design.payload as unknown as StickerDesign} />
      ) : (
        <Boxes
          size={70}
          color={
            typeof design.payload.color === "string"
              ? design.payload.color
              : "#edb466"
          }
        />
      )}
    </div>
  );
}
export function Gallery() {
  const { data, act, busy, connected } = usePlatform();
  const [filter, setFilter] = useState("community"),
    [sort, setSort] = useState("new"),
    [creating, setCreating] = useState(false),
    [kind, setKind] = useState<"sticker" | "case">("sticker"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [sticker, setSticker] = useState<StickerDesign>({
      text: "SKYLINE",
      shape: "shield",
      color: "#e99a35",
      gradient: "#713cec",
    }),
    [skinIds, setSkinIds] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [report, setReport] = useState<Design | null>(null),
    [reason, setReason] = useState(""),
    [view, setView] = useState<Design | null>(null);
  const active = connected && data?.user?.status === "approved";
  const designs = (
    data?.designs.filter((d) =>
      filter === "mine"
        ? d.authorId === data.user?.id
        : d.status === "approved",
    ) || []
  ).sort((a, b) =>
    sort === "likes"
      ? b.likes - a.likes
      : sort === "featured"
        ? Number(b.featured) - Number(a.featured)
        : b.createdAt - a.createdAt,
  );
  const found =
    data?.catalog.skins
      .filter((s) =>
        `${s.weapon} ${s.name}`
          .toLocaleLowerCase("tr")
          .includes(search.toLocaleLowerCase("tr")),
      )
      .slice(0, 30) || [];
  return (
    <>
      <Title
        eyebrow="Topluluğun yaratıcı köşesi"
        title="Tasarım galerisi"
        action={
          <Button disabled={!active} onClick={() => setCreating(true)}>
            <Plus size={17} /> Tasarım paylaş
          </Button>
        }
      >
        AI skinleri, stickerlar ve kasa konseptleri. Tüm yayınlar yetkili
        kontrolünden geçer; yalnızca gerçek oyuncuların beğenileri sayılır.
      </Title>
      <div className="pf-row pf-between" style={{ marginBottom: 24 }}>
        <div className="pf-row">
          {[
            ["community", "Topluluk"],
            ["mine", "Tasarımlarım"],
          ].map(([key, label]) => (
            <button
              className="pf-chip"
              key={key}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="pf-input"
          style={{ maxWidth: 210 }}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Galeri sıralaması"
        >
          <option value="new">En yeni</option>
          <option value="likes">En çok beğenilen</option>
          <option value="featured">Haftanın seçimi önce</option>
        </select>
      </div>
      {!designs.length ? (
        <Empty
          title={
            filter === "mine"
              ? "İlk tasarımını paylaş"
              : "Galeri yeni tasarımları bekliyor"
          }
        >
          <p>
            AI üretimlerin önce envanterine gelir. Sticker ve kasa konseptleri
            için ücretsiz tasarım formunu kullanabilirsin.
          </p>
          <Button variant="secondary" onClick={() => navigate("studio")}>
            AI atölyesine git
          </Button>
        </Empty>
      ) : (
        <div className="pf-grid pf-grid-3">
          {designs.map((d) => (
            <article className="pf-item" key={d.id}>
              <button
                type="button"
                style={{ display: "block", width: "100%", cursor: "pointer" }}
                onClick={() => setView(d)}
                aria-label={`${d.title} tasarımını incele`}
              >
                <DesignArt design={d} />
              </button>
              <div className="pf-item-body">
                <div className="pf-row pf-between">
                  <Tag tone={d.kind === "ai" ? "amber" : "muted"}>
                    {
                      {
                        ai: "AI skin",
                        sticker: "Sticker",
                        case: "Kasa konsepti",
                      }[d.kind]
                    }
                  </Tag>
                  {d.featured && (
                    <Tag tone="amber">
                      <Star size={11} /> Haftanın seçimi
                    </Tag>
                  )}
                </div>
                <h3 style={{ marginTop: 14 }}>{d.title}</h3>
                <p>@{d.author}</p>
                {d.status !== "approved" && (
                  <div className="pf-gap">
                    <Tag tone={d.status === "rejected" ? "red" : "amber"}>
                      {{
                        draft: "Yalnızca sende",
                        pending: "Onay bekliyor",
                        rejected: "Yayın dışı",
                      }[d.status] || d.status}
                    </Tag>
                  </div>
                )}
                <div className="pf-row pf-between">
                  <Button
                    variant="ghost"
                    disabled={
                      !active ||
                      busy ||
                      d.authorId === data?.user?.id ||
                      d.status !== "approved"
                    }
                    onClick={() =>
                      void act(
                        "gallery/action",
                        { action: d.liked ? "unlike" : "like", id: d.id },
                        d.liked ? "Beğeni geri alındı." : "Tasarım beğenildi.",
                      )
                    }
                  >
                    <Heart size={15} fill={d.liked ? "currentColor" : "none"} />{" "}
                    {d.likes}
                  </Button>
                  {d.status === "draft" && d.authorId === data?.user?.id ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          "gallery/action",
                          { action: "publish", id: d.id },
                          "İncelemeye gönderildi.",
                        )
                      }
                    >
                      Yayına gönder
                    </Button>
                  ) : (
                    d.status === "approved" && (
                      <Button
                        variant="ghost"
                        disabled={!active}
                        aria-label={`${d.title} tasarımını bildir`}
                        onClick={() => {
                          setReport(d);
                          setReason("");
                        }}
                      >
                        <Flag size={15} />
                      </Button>
                    )
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {creating && (
        <Modal
          title="Topluluğa bir tasarım ekle"
          onClose={() => setCreating(false)}
        >
          <div className="pf-stack">
            <Field label="Tasarım türü">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as "sticker" | "case")}
              >
                <option value="sticker">Sticker · ücretsiz, AI değil</option>
                <option value="case">Kasa konsepti · ücretsiz</option>
              </select>
            </Field>
            <Field label="Başlık">
              <input
                value={title}
                maxLength={64}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tasarımına bir isim ver"
              />
            </Field>
            <Field label="Açıklama">
              <textarea
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tasarımının hikâyesi…"
              />
            </Field>
            {kind === "sticker" ? (
              <>
                <StickerArt value={sticker} />
                <div className="pf-grid pf-grid-2">
                  <Field label="Sticker yazısı">
                    <input
                      value={sticker.text}
                      maxLength={18}
                      onChange={(e) =>
                        setSticker((s) => ({ ...s, text: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Şekil">
                    <select
                      value={sticker.shape}
                      onChange={(e) =>
                        setSticker((s) => ({
                          ...s,
                          shape: e.target.value as StickerDesign["shape"],
                        }))
                      }
                    >
                      <option value="circle">Daire</option>
                      <option value="shield">Kalkan</option>
                      <option value="diamond">Elmas</option>
                      <option value="hexagon">Altıgen</option>
                    </select>
                  </Field>
                  <Field label="Başlangıç rengi">
                    <input
                      type="color"
                      value={sticker.color}
                      onChange={(e) =>
                        setSticker((s) => ({ ...s, color: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Bitiş rengi">
                    <input
                      type="color"
                      value={sticker.gradient}
                      onChange={(e) =>
                        setSticker((s) => ({ ...s, gradient: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <SafetyNote>
                  Bu bir sergi konseptidir; gerçek kasa açma veya yeni eşya
                  basma işlemi değildir.
                </SafetyNote>
                <Field
                  label={`Katalogdan 4–12 farklı skin seç · ${skinIds.length}/12`}
                >
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Silah veya tasarım ara"
                  />
                </Field>
                <div style={{ maxHeight: 240, overflowY: "auto" }}>
                  {found.map((s) => (
                    <label className="pf-member" key={s.id}>
                      <span>
                        {s.weapon} · {s.name}
                      </span>
                      <input
                        type="checkbox"
                        checked={skinIds.includes(s.id)}
                        disabled={
                          !skinIds.includes(s.id) && skinIds.length >= 12
                        }
                        onChange={() =>
                          setSkinIds((ids) =>
                            ids.includes(s.id)
                              ? ids.filter((id) => id !== s.id)
                              : [...ids, s.id],
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
            <Button
              disabled={
                busy ||
                !active ||
                title.trim().length < 3 ||
                (kind === "sticker" ? !sticker.text.trim() : skinIds.length < 4)
              }
              onClick={async () => {
                const r = await act(
                  "gallery/submit",
                  {
                    kind,
                    title,
                    description,
                    payload:
                      kind === "sticker"
                        ? sticker
                        : { skinIds, color: sticker.color },
                  },
                  "Tasarım yetkili incelemesine gönderildi.",
                );
                if (r) {
                  setCreating(false);
                  setFilter("mine");
                }
              }}
            >
              <Palette size={17} /> İncelemeye gönder
            </Button>
          </div>
        </Modal>
      )}
      {report && (
        <Modal title="Tasarımı bildir" onClose={() => setReport(null)}>
          <div className="pf-stack">
            <p>{report.title}</p>
            <Field label="Gerekçe">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={5}
                maxLength={300}
                placeholder="İhlali veya sorunu açıkla"
              />
            </Field>
            <Button
              disabled={busy || reason.trim().length < 5}
              onClick={async () => {
                const r = await act(
                  "gallery/action",
                  { action: "report", id: report.id, reason },
                  "Rapor yetkiliye ulaştı.",
                );
                if (r) setReport(null);
              }}
            >
              Raporu gönder
            </Button>
          </div>
        </Modal>
      )}
      {view && (
        <Modal title={view.title} onClose={() => setView(null)}>
          <div className="pf-stack">
            <DesignArt design={view} />
            <p className="pf-muted">
              {view.description || "Bu tasarıma açıklama eklenmemiş."}
            </p>
            <Tag>@{view.author}</Tag>
            {view.kind === "case" && (
              <Panel>
                <h3>Konseptin içeriği</h3>
                <div className="pf-grid pf-grid-3 pf-gap">
                  {((view.payload.skinIds as string[]) || []).map((id) => (
                    <div key={id}>
                      <SkinImage catalogId={id} alt={id} />
                      <p className="pf-small">
                        {data?.catalog.skins.find((s) => s.id === id)?.name}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            {view.kind === "ai" && (
              <SafetyNote>
                AI tarafından üretilmiş Skyline görseli. Görselin sahibi ile
                tasarımın oluşturucusu satıştan sonra farklı olabilir.
              </SafetyNote>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
