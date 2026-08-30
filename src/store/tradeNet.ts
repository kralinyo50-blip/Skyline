import mqtt, { type MqttClient } from "mqtt";
import { normalizeCode } from "./syncMqtt";

/* ------------------------------------------------------------------
   Canlı P2P takas ağı — MQTT üzerinden oyuncu → oyuncu teklif akışı.
   Aynı "Sunucu Kodu"nu kullanan oyuncular aynı odada buluşur; kod
   yoksa PUBLIC oda kullanılır. Her oyuncu kendi inbox kanalına abone
   olur; teklifler ve yanıtlar o kanal üzerinden iletilir.
------------------------------------------------------------------ */

export interface TradeItemPayload {
  skinId: string;
  float?: number;
  stickers?: string[];
}

export type TradeMsg =
  | {
      t: "offer";
      id: string;
      room: string;
      from: string;
      fromKey: string;
      to: string;
      toKey: string;
      items: TradeItemPayload[];
      wantCash: number;
      note?: string;
      ts: number;
    }
  | {
      t: "accept";
      id: string;
      room: string;
      from: string;
      fromKey: string;
      to: string;
      toKey: string;
      items: TradeItemPayload[];
      cash: number;
      ts: number;
    }
  | { t: "decline"; id: string; room: string; from: string; ts: number }
  | { t: "cancel"; id: string; room: string; from: string; ts: number }
  | { t: "done"; id: string; room: string; from: string; ts: number };

const BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://test.mosquitto.org:8081/mqtt",
];

export interface TradeNetHandlers {
  onMsg: (msg: TradeMsg) => void;
  onStatus: (s: "off" | "busy" | "ok" | "error") => void;
}

let client: MqttClient | null = null;
let handlers: TradeNetHandlers | null = null;
let cleanupFns: (() => void)[] = [];
let brokerIndex = 0;
let stopped = false;
let codeScope = "PUBLIC";

/** Oda kapsamı — sunucu kodu yoksa PUBLIC */
export function tradeScope(code: string | null): string {
  const c = code ? normalizeCode(code) : "";
  return c.length >= 4 ? c : "PUBLIC";
}

export function inboxTopic(code: string | null, key: string): string {
  return `skyline-rp-community/${tradeScope(code)}/trade/inbox/${key}`;
}

export function stopTradeNet() {
  cleanupFns.forEach((f) => f());
  cleanupFns = [];
  stopped = true;
  handlers = null;
  if (client) {
    try {
      client.end(true);
    } catch {
      /* yoksay */
    }
    client = null;
  }
}

export function startTradeNet(
  code: string | null,
  key: string,
  h: TradeNetHandlers
) {
  stopTradeNet();
  stopped = false;
  handlers = h;
  codeScope = tradeScope(code);
  const myTopic = inboxTopic(codeScope, key);
  brokerIndex = 0;

  const connect = () => {
    if (stopped) return;
    const url = BROKERS[brokerIndex % BROKERS.length];
    h.onStatus("busy");
    const cl = mqtt.connect(url, {
      clientId: `skyline-trade-${Math.random().toString(36).slice(2, 12)}`,
      reconnectPeriod: 3000,
      connectTimeout: 8000,
      clean: true,
    });
    client = cl;

    cl.on("connect", () => {
      h.onStatus("ok");
      cl.subscribe(myTopic, { qos: 0 }, () => {
        /* abone olundu — hazır */
      });
    });

    cl.on("message", (_t, payload) => {
      try {
        const msg = JSON.parse(payload.toString("utf8")) as TradeMsg;
        if (!msg || typeof msg !== "object" || !msg.t || !msg.id) return;
        handlers?.onMsg(msg);
      } catch {
        /* bozuk paket — yoksay */
      }
    });

    cl.on("error", () => {
      h.onStatus("error");
      try {
        cl.end(true);
      } catch {
        /* yoksay */
      }
      brokerIndex++;
      if (!stopped) window.setTimeout(connect, 3500);
    });

    cl.on("reconnect", () => h.onStatus("busy"));
    cl.on("close", () => {
      if (!stopped) h.onStatus("busy");
    });

    cleanupFns.push(() => {
      try {
        cl.end(true);
      } catch {
        /* yoksay */
      }
    });
  };

  connect();
}

/** Hedef oyuncunun inbox'una mesaj gönder */
export function sendTradeMsg(
  code: string | null,
  targetKey: string,
  msg: TradeMsg
): boolean {
  const cl = client;
  if (!cl || !cl.connected) return false;
  const scope = code ? tradeScope(code) : codeScope;
  cl.publish(inboxTopic(scope, targetKey), JSON.stringify(msg), {
    qos: 0,
    retain: false,
  });
  return true;
}
