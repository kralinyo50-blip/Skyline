import { useEffect, useState } from "react";
import {
  Swords,
  Plus,
  Copy,
  Eye,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { formatSc, type Battle } from "../../shared/platform";
import { usePlatform } from "./context";
import {
  Button,
  Empty,
  Field,
  Modal,
  Panel,
  SafetyNote,
  SkinImage,
  Tag,
  Title,
  timeLeft,
} from "./ui";
async function verifySeed(room: Battle) {
  if (!room.seed || !room.catalogSnapshot)
    throw new Error("Doğrulama maç tamamlanınca açılır.");
  const encoder = new TextEncoder();
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(room.seed)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  if (hash !== room.commitment) throw new Error("Seed özeti eşleşmedi.");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(room.seed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  for (let round = 0; round < room.revealed.length; round++)
    for (const drop of room.revealed[round]) {
      const bytes = new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          key,
          encoder.encode(`round:${round}:slot:${drop.slot}`),
        ),
      );
      let integer = 0;
      for (let i = 0; i < 6; i++) integer = integer * 256 + bytes[i];
      let cursor =
        (integer / 281474976710656) *
        room.catalogSnapshot.drops.reduce((s, d) => s + d.weight, 0);
      let chosen = room.catalogSnapshot.drops.at(-1)!;
      for (const d of room.catalogSnapshot.drops) {
        cursor -= d.weight;
        if (cursor < 0) {
          chosen = d;
          break;
        }
      }
      if (chosen.id !== drop.catalogId)
        throw new Error("Bir açılış kaydı seed ile eşleşmedi.");
    }
  return true;
}
export function Battles() {
  const { data, act, busy, connected, notify } = usePlatform();
  const [creating, setCreating] = useState(false),
    [caseId, setCaseId] = useState(""),
    [rounds, setRounds] = useState(2),
    [capacity, setCapacity] = useState<2 | 4>(2),
    [code, setCode] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const active = data?.user?.status === "approved" && connected;
  useEffect(() => {
    const room = new URLSearchParams(location.hash.split("?")[1] || "").get(
      "room",
    );
    if (room) {
      setCode(room);
      setSelected(room);
    }
  }, []);
  const room = data?.battles.find((r) => r.code === selected),
    caseDef = data?.catalog.cases.find((c) => c.id === caseId);
  const join = async (value: string) => {
    const result = await act(
      "battles/join",
      { code: value },
      "Odaya katıldın. Oda dolunca maç otomatik başlar.",
    );
    if (result) setSelected(value.toUpperCase());
  };
  const waiting =
    data?.battles.filter((r) => ["waiting", "playing"].includes(r.phase)) || [];
  const recent =
    data?.battles.filter((r) => r.phase === "settled").slice(0, 12) || [];
  return (
    <>
      <Title
        eyebrow="Bot değil, gerçek rakip"
        title="Canlı arena"
        action={
          <Button
            disabled={!active || busy}
            onClick={() => {
              setCaseId(data?.catalog.cases[0]?.id || "");
              setCreating(true);
            }}
          >
            <Plus size={17} /> Oda kur
          </Button>
        }
      >
        1v1 veya 2v2 kasa karşılaşmaları. Ücret, çekiliş ve ödül sahipliği
        sunucuda belirlenir; seyirci olarak ücretsiz izleyebilirsin.
      </Title>
      <SafetyNote>
        Dolmayan oda 15 dakika sonra iptal edilir ve herkese tam iade yapılır.
        Bekleyen bir üye iptal ederse oda tüm katılımcılar için kapanır.
        Başlayan maçtan ücret iadesiyle çıkılamaz.
      </SafetyNote>
      <Panel className="pf-gap">
        <div className="pf-row pf-between">
          <div>
            <h3>Arkadaşından bir oda kodu mu geldi?</h3>
            <p className="pf-small pf-muted">
              Takımlar katılım sırasına göre Mavi / Turuncu olarak atanır.
            </p>
          </div>
          <div className="pf-row">
            <input
              className="pf-input"
              value={code}
              maxLength={8}
              style={{ width: 160 }}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Oda kodu"
              aria-label="Canlı oda kodu"
            />
            <Button
              disabled={!active || busy || !code}
              onClick={() => void join(code)}
            >
              Katıl
            </Button>
            <Button
              variant="ghost"
              disabled={!code}
              onClick={() => {
                if (data?.battles.some((r) => r.code === code))
                  setSelected(code);
                else
                  notify(
                    "Bu kodla aktif veya son 24 saatte bitmiş bir oda bulunamadı.",
                    "error",
                  );
              }}
            >
              <Eye size={16} /> İzle
            </Button>
          </div>
        </div>
      </Panel>
      <div className="pf-section-head">
        <h2>Açık ve oynanan odalar</h2>
        <Tag tone="green">{waiting.length} oda</Tag>
      </div>
      {!waiting.length ? (
        <Empty title="Arena yeni bir oda bekliyor">
          Oda kur ve kodunu bir arkadaşınla paylaş. Karşı taraf gerçek bir
          hesapla katılmadan maç başlamaz.
        </Empty>
      ) : (
        <div className="pf-grid pf-grid-3">
          {waiting.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
              open={() => setSelected(r.code)}
              join={() => void join(r.code)}
              canJoin={
                !!active &&
                !busy &&
                !r.members.some((m) => m.id === data?.user?.id) &&
                r.phase === "waiting"
              }
            />
          ))}
        </div>
      )}
      {!!recent.length && (
        <>
          <div className="pf-section-head">
            <h2>Son sonuçlar</h2>
            <span className="pf-small pf-muted">Son 24 saat</span>
          </div>
          <div className="pf-grid pf-grid-3">
            {recent.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                open={() => setSelected(r.code)}
                join={() => {}}
                canJoin={false}
              />
            ))}
          </div>
        </>
      )}
      {creating && (
        <Modal title="Canlı oda oluştur" onClose={() => setCreating(false)}>
          <div className="pf-stack">
            <Field label="Kasa">
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              >
                {data?.catalog.cases.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name} · {formatSc(c.price)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="pf-grid pf-grid-2">
              <Field label="Karşılaşma">
                <select
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value) as 2 | 4)}
                >
                  <option value={2}>1v1 · 2 oyuncu</option>
                  <option value={4}>2v2 · 4 oyuncu</option>
                </select>
              </Field>
              <Field label="Tur sayısı">
                <select
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} tur
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="pf-row pf-between">
              <span>Kişi başı katılım</span>
              <strong className="pf-price">
                {formatSc((caseDef?.price || 0) * rounds)}
              </strong>
            </div>
            <p className="pf-small pf-muted">
              En yüksek toplam katalog değerine ulaşan ekip kazanır. Çıkan
              eşyalar kazananlara sırayla, eşit adetlerle paylaştırılır. Eşitlik
              seed ile çözülür; 2v2’de eşya değerleri birebir eşit olmayabilir.
            </p>
            {caseDef && (
              <details>
                <summary
                  className="pf-small pf-muted"
                  style={{ cursor: "pointer" }}
                >
                  Kasa içeriği ve açılış olasılıkları
                </summary>
                <div
                  style={{ maxHeight: 220, overflowY: "auto", marginTop: 12 }}
                >
                  {caseDef.drops.map((d) => (
                    <div key={d.id} className="pf-member">
                      <span>
                        {data?.catalog.skins.find((s) => s.id === d.id)?.name ||
                          d.id}
                      </span>
                      <span>
                        %
                        {(
                          (d.weight /
                            caseDef.drops.reduce((s, p) => s + p.weight, 0)) *
                          100
                        ).toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <Button
              disabled={!active || busy || !caseDef}
              onClick={async () => {
                const result = await act<{ id: string; code: string }>(
                  "battles/create",
                  { caseId, rounds, capacity },
                  "Oda kuruldu. Davet kodunu paylaşabilirsin.",
                );
                if (result) {
                  setCreating(false);
                  setSelected(result.code);
                }
              }}
            >
              <Swords size={17} /> Katılım ücretini öde ve oda kur
            </Button>
          </div>
        </Modal>
      )}
      {room && (
        <Modal
          title={`${room.caseName} · ${room.code}`}
          onClose={() => setSelected(null)}
        >
          <div className="pf-stack">
            <div className="pf-row pf-between">
              <Tag tone={room.phase === "playing" ? "green" : "amber"}>
                {
                  {
                    waiting: "Oyuncular bekleniyor",
                    playing: "Canlı",
                    settled: "Tamamlandı",
                    cancelled: "İptal — ücretler iade edildi",
                  }[room.phase]
                }
              </Tag>
              <span className="pf-small pf-muted">
                {room.phase === "waiting"
                  ? `Oda süresi: ${timeLeft(room.expiresAt, data?.now)}`
                  : room.phase === "playing"
                    ? `Kalan: ${timeLeft(room.endsAt || 0, data?.now)}`
                    : `${room.rounds} tur`}
              </span>
            </div>
            <div className="pf-battle-slots">
              {Array.from({ length: room.capacity }, (_, slot) => {
                const member = room.members.find((m) => m.slot === slot);
                const drops = room.revealed
                    .flat()
                    .filter((d) => d.slot === slot),
                  latest = drops.at(-1);
                return (
                  <div
                    className="pf-battle-slot"
                    data-team={slot % 2}
                    data-win={
                      room.phase === "settled" && room.winnerTeam === slot % 2
                    }
                    key={slot}
                  >
                    <small>{slot % 2 ? "TURUNCU" : "MAVİ"} TAKIM</small>
                    <strong>{member?.username || "Boş koltuk"}</strong>
                    {latest ? (
                      <SkinImage
                        catalogId={latest.catalogId}
                        alt="Son çıkan skin"
                      />
                    ) : (
                      <Swords
                        size={25}
                        style={{ margin: "25px auto", opacity: 0.35 }}
                      />
                    )}
                    <small>
                      {latest
                        ? data?.catalog.skins.find(
                            (s) => s.id === latest.catalogId,
                          )?.name
                        : room.phase === "playing"
                          ? "Tur sonucu bekleniyor"
                          : "Katılım bekleniyor"}
                    </small>
                    <strong>
                      {formatSc(drops.reduce((s, d) => s + d.value, 0))}
                    </strong>
                  </div>
                );
              })}
            </div>
            {room.phase === "settled" && (
              <div className="pf-safety">
                <CheckCircle2 size={20} />
                <span>
                  <strong>
                    {room.winnerTeam === 0 ? "Mavi" : "Turuncu"} takım kazandı.
                  </strong>{" "}
                  Eşyalar kazananların envanterine sunucu tarafından aktarıldı.
                </span>
              </div>
            )}
            {room.phase === "waiting" && (
              <div className="pf-row">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${location.origin}${location.pathname}#platform/battles?room=${room.code}`,
                      );
                      notify("Oda bağlantısı kopyalandı.");
                    } catch {
                      notify(`Oda kodu: ${room.code}`);
                    }
                  }}
                >
                  <Copy size={16} /> Daveti kopyala
                </Button>
                {room.members.some((m) => m.id === data?.user?.id) ? (
                  <Button
                    variant="danger"
                    disabled={busy || !active}
                    onClick={() => {
                      if (
                        confirm(
                          "Odayı iptal et ve herkese tam katılım iadesi yap?",
                        )
                      )
                        void act(
                          "battles/cancel",
                          { id: room.id },
                          "Oda iptal edildi; tüm katılımlar iade edildi.",
                        );
                    }}
                  >
                    İptal et / iade al
                  </Button>
                ) : (
                  <Button
                    disabled={!active || busy}
                    onClick={() => void join(room.code)}
                  >
                    Katıl · {formatSc(room.cost)}
                  </Button>
                )}
              </div>
            )}
            <details>
              <summary
                className="pf-small pf-muted"
                style={{ cursor: "pointer" }}
              >
                Çekiliş kaydı ve seed özeti
              </summary>
              <div className="pf-seed">
                Önceden kaydedilen SHA-256: {room.commitment}
              </div>
              {room.seed && (
                <>
                  <div className="pf-seed">Açıklanan seed: {room.seed}</div>
                  <Button
                    className="pf-gap"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await verifySeed(room);
                        notify(
                          "Seed özeti ve tüm açılışlar yeniden hesaplandı; kayıtlar eşleşiyor.",
                        );
                      } catch (e) {
                        notify(
                          e instanceof Error
                            ? e.message
                            : "Doğrulama başarısız.",
                          "error",
                        );
                      }
                    }}
                  >
                    <ShieldCheck size={16} /> Seed ve açılışları doğrula
                  </Button>
                </>
              )}
              <p className="pf-small pf-muted pf-gap">
                Bu, kayıtların yeniden hesaplanmasıdır; bağımsız bir adillik
                sertifikası değildir.
              </p>
            </details>
          </div>
        </Modal>
      )}
    </>
  );
}
function RoomCard({
  room,
  open,
  join,
  canJoin,
}: {
  room: Battle;
  open: () => void;
  join: () => void;
  canJoin: boolean;
}) {
  return (
    <Panel>
      <div className="pf-row pf-between">
        <Tag tone={room.phase === "playing" ? "green" : "muted"}>
          {room.capacity === 4 ? "2v2" : "1v1"} · {room.members.length}/
          {room.capacity}
        </Tag>
        <span className="pf-small pf-muted">{room.code}</span>
      </div>
      <h3 className="pf-gap">{room.caseName}</h3>
      <p className="pf-small pf-muted">
        {room.rounds} tur ·{" "}
        {room.phase === "settled"
          ? "Tamamlandı"
          : room.phase === "playing"
            ? "Maç oynanıyor"
            : "Oyuncu bekliyor"}
      </p>
      <div className="pf-row pf-between pf-gap">
        <strong className="pf-price">{formatSc(room.cost)}</strong>
        <span className="pf-small pf-muted">kişi başı</span>
      </div>
      <div className="pf-row pf-gap">
        <Button variant="secondary" onClick={open}>
          <Eye size={15} /> {room.phase === "settled" ? "Sonuç" : "İzle"}
        </Button>
        {canJoin && <Button onClick={join}>Katıl</Button>}
      </div>
    </Panel>
  );
}
