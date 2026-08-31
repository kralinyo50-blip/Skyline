/* Canlılık olayları — oyuncu eylemleri (kasa açma, seviye atlama, para yatırma)
   ve sahte satışlar gibi olayları sohbet/market/toast bileşenlerine yayar.
   Sadece istemci içi bir yayın: DB'ye hiçbir şey yazmaz, senkronu bozmaz. */

export type LiveEventKind = "caseWin" | "deposit" | "levelUp" | "marketSale";

export interface LiveEvent {
  kind: LiveEventKind;
  /** Olayın sahibi (bot veya gerçek oyuncu adı) */
  user: string;
  /** Kasa açılışında çıkan item adı */
  item?: string;
  /** Para miktarı (kasa değeri / yatırma / satış) */
  amount?: number;
  /** Seviye atlama hedefi */
  level?: number;
}

type Listener = (e: LiveEvent) => void;

const listeners = new Set<Listener>();

export function emitLive(e: LiveEvent): void {
  listeners.forEach((fn) => {
    try {
      fn(e);
    } catch {
      /* bir dinleyicinin hatası diğerlerini etkilemesin */
    }
  });
}

export function onLive(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
