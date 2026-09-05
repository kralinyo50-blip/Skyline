import { useEffect, useState } from "react";
import { Gavel, Plus, Clock } from "lucide-react";
import { formatSc, type Auction } from "../../shared/platform";
import { usePlatform } from "./context";
import {
  Button,
  Empty,
  Field,
  ItemArt,
  Modal,
  Panel,
  SafetyNote,
  Tag,
  Title,
  timeLeft,
} from "./ui";
export function Market() {
  const { data, act, busy, connected } = usePlatform();
  const [creating, setCreating] = useState(false),
    [itemId, setItemId] = useState(""),
    [minimum, setMinimum] = useState("10000"),
    [buyout, setBuyout] = useState(""),
    [hours, setHours] = useState(24),
    [selected, setSelected] = useState<Auction | null>(null),
    [amount, setAmount] = useState(""),
    [filter, setFilter] = useState("active");
  const active = data?.user?.status === "approved" && connected;
  useEffect(() => {
    const item = new URLSearchParams(location.hash.split("?")[1] || "").get(
      "item",
    );
    if (item) {
      setItemId(item);
      setCreating(true);
    }
  }, []);
  const saleItems =
    data?.inventory.filter((i) => !i.lockedBy && i.tradable) || [];
  const auctions =
    data?.auctions.filter((a) =>
      filter === "mine"
        ? a.sellerId === data.user?.id
        : filter === "bids"
          ? a.bidderId === data.user?.id
          : a.status === "active",
    ) || [];
  const current = selected
    ? data?.auctions.find((a) => a.id === selected.id) || selected
    : null;
  const minimumNext = current
    ? current.bidderId
      ? current.highest + Math.max(1, Math.ceil(current.highest * 0.05))
      : current.minimum
    : 0;
  return (
    <>
      <Title
        eyebrow="Oyuncudan oyuncuya"
        title="Açık artırma pazarı"
        action={
          <Button
            disabled={!active}
            onClick={() => {
              setItemId(saleItems[0]?.id || "");
              setCreating(true);
            }}
          >
            <Plus size={17} /> İlan oluştur
          </Button>
        }
      >
        Sahip olduğun eşyayı tekliflere aç veya bir “hemen al” fiyatı belirle.
        Satıştan %5 komisyon alınır.
      </Title>
      <SafetyNote>
        Teklif verdiğinde SC bloke edilir. Teklifin geçilirse tamamı serbest
        bırakılır. Eşya satış bitene kadar kilitlidir; birden fazla kişiye
        satılamaz.
      </SafetyNote>
      <div className="pf-row pf-gap" style={{ marginBottom: 20 }}>
        {[
          ["active", "Aktif ilanlar"],
          ["mine", "İlanlarım"],
          ["bids", "Teklif verdiklerim"],
        ].map(([key, label]) => (
          <button
            key={key}
            className="pf-chip"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {!auctions.length ? (
        <Empty title="Bu görünümde ilan yok">
          İlanlar gerçek oyuncuların sunucu envanterinden oluşturulur. Hazır
          veya otomatik satın alan botlar yoktur.
        </Empty>
      ) : (
        <div className="pf-grid pf-grid-3">
          {auctions.map((a) => (
            <article className="pf-item" key={a.id}>
              <ItemArt item={a.item} />
              <div className="pf-item-body">
                <div className="pf-row pf-between">
                  <Tag tone={a.status === "active" ? "green" : "muted"}>
                    {{
                      active: "Açık",
                      sold: "Satıldı",
                      expired: "Süre doldu",
                      cancelled: "İptal",
                    }[a.status] || a.status}
                  </Tag>
                  <span className="pf-small pf-muted">{a.seller}</span>
                </div>
                <h3 style={{ marginTop: 14 }}>{a.item.name}</h3>
                <div className="pf-row pf-between">
                  <div>
                    <p>{a.highest ? "En yüksek teklif" : "Başlangıç"}</p>
                    <strong className="pf-price">
                      {formatSc(a.highest || a.minimum)}
                    </strong>
                  </div>
                  <span className="pf-small pf-muted">
                    <Clock
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    {timeLeft(a.endsAt, data?.now)}
                  </span>
                </div>
                {a.buyout && <p>Hemen al: {formatSc(a.buyout)}</p>}
                <div className="pf-row">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelected(a);
                      setAmount(
                        String(
                          a.bidderId
                            ? a.highest +
                                Math.max(1, Math.ceil(a.highest * 0.05))
                            : a.minimum,
                        ),
                      );
                    }}
                  >
                    <Gavel size={15} /> İlanı incele
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {creating && (
        <Modal title="Yeni açık artırma" onClose={() => setCreating(false)}>
          {!saleItems.length ? (
            <Empty title="Satılabilir eşyan yok">
              AI tasarımı önce galeri onayı almalı; kilitli eşyalar yeniden
              listelenemez.
            </Empty>
          ) : (
            <div className="pf-stack">
              <Field label="Eşya">
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                >
                  <option value="">Eşya seç</option>
                  {saleItems.map((i) => (
                    <option value={i.id} key={i.id}>
                      {i.weapon} · {i.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="pf-grid pf-grid-2">
                <Field label="Başlangıç fiyatı (SC)">
                  <input
                    type="number"
                    min="1"
                    max="1000000000"
                    step="1"
                    value={minimum}
                    onChange={(e) => setMinimum(e.target.value)}
                  />
                </Field>
                <Field label="Hemen al fiyatı (isteğe bağlı)">
                  <input
                    type="number"
                    min="1"
                    max="1000000000"
                    step="1"
                    value={buyout}
                    onChange={(e) => setBuyout(e.target.value)}
                    placeholder="Boş bırakabilirsin"
                  />
                </Field>
              </div>
              <Field label="İlan süresi">
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                >
                  <option value={6}>6 saat</option>
                  <option value={24}>24 saat</option>
                  <option value={48}>48 saat</option>
                </select>
              </Field>
              <SafetyNote>
                Teklif gelmeden ilanı iptal edebilirsin. İlk tekliften sonra
                satış koşulları değiştirilemez. Gerçek paraya çekim yoktur.
              </SafetyNote>
              <Button
                disabled={busy || !active || !itemId || Number(minimum) < 1}
                onClick={async () => {
                  const r = await act(
                    "market/create",
                    {
                      itemId,
                      minimum: Number(minimum),
                      buyout: buyout ? Number(buyout) : null,
                      hours,
                    },
                    "Eşya kilitlendi ve ilan yayınlandı.",
                  );
                  if (r) setCreating(false);
                }}
              >
                İlanı yayınla
              </Button>
            </div>
          )}
        </Modal>
      )}
      {current && (
        <Modal title={current.item.name} onClose={() => setSelected(null)}>
          <div className="pf-stack">
            <ItemArt item={current.item} />
            <div className="pf-row pf-between">
              <span>
                Satıcı: <strong>{current.seller}</strong>
              </span>
              <Tag>{timeLeft(current.endsAt, data?.now)}</Tag>
            </div>
            <div className="pf-row pf-between">
              <span className="pf-muted">
                {current.bidder
                  ? "En yüksek teklif · " + current.bidder
                  : "İlk teklif"}
              </span>
              <strong className="pf-price">
                {formatSc(current.highest || current.minimum)}
              </strong>
            </div>
            {current.status === "active" &&
            current.sellerId !== data?.user?.id ? (
              <>
                <Field label={`Yeni teklif · En az ${formatSc(minimumNext)}`}>
                  <input
                    type="number"
                    min={minimumNext}
                    max="1000000000"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Button
                  disabled={busy || !active || Number(amount) < minimumNext}
                  onClick={async () => {
                    const r = await act(
                      "market/bid",
                      { id: current.id, amount: Number(amount), buyNow: false },
                      "Teklif alındı; tutar güvenli işlemde bloke edildi.",
                    );
                    if (r) setSelected(null);
                  }}
                >
                  {formatSc(Number(amount) || 0)} teklif ver
                </Button>
                {current.buyout && (
                  <Button
                    variant="secondary"
                    disabled={busy || !active}
                    onClick={async () => {
                      if (
                        !confirm(
                          `${formatSc(current.buyout!)} karşılığında bu eşyayı hemen satın al?`,
                        )
                      )
                        return;
                      const r = await act(
                        "market/bid",
                        {
                          id: current.id,
                          amount: current.buyout,
                          buyNow: true,
                        },
                        "Eşya sunucu envanterine aktarıldı.",
                      );
                      if (r) setSelected(null);
                    }}
                  >
                    Hemen al · {formatSc(current.buyout)}
                  </Button>
                )}
              </>
            ) : current.status === "active" &&
              current.sellerId === data?.user?.id ? (
              <Button
                variant="danger"
                disabled={busy || !!current.bidderId}
                onClick={async () => {
                  const r = await act(
                    "market/cancel",
                    { id: current.id },
                    "İlan iptal edildi; eşya kilidi kaldırıldı.",
                  );
                  if (r) setSelected(null);
                }}
              >
                İlanı iptal et
              </Button>
            ) : (
              <Tag>Bu satış tamamlandı.</Tag>
            )}
            <Panel>
              <h3>Son teklifler</h3>
              {current.bids.length ? (
                current.bids.map((b, i) => (
                  <div className="pf-member" key={`${b.createdAt}-${i}`}>
                    <span>{b.bidder}</span>
                    <strong>{formatSc(b.amount)}</strong>
                  </div>
                ))
              ) : (
                <p className="pf-small pf-muted pf-gap">Henüz teklif yok.</p>
              )}
            </Panel>
          </div>
        </Modal>
      )}
    </>
  );
}
