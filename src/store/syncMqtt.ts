import mqtt, { type MqttClient } from "mqtt";
import { mergeCloud, type CloudDoc } from "./sync";
import type { DB } from "./db";

/* -------------------------------------------------------------
   "Sunucu Kodu" ile gerçek zamanlı senkron — kurulum gerektirmez.
   Herkese açık MQTT aracıları üzerinden, kodu giren herkes aynı
   odaya bağlanır. Durum belgesi "retained" olarak tutulur: sen
   çevrimdışıyken gönderilen talepler bağlanınca sana ulaşır.
------------------------------------------------------------- */

const BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://test.mosquitto.org:8081/mqtt",
];

export interface MqttHandlers {
  getLocal: () => DB;
  apply: (db: DB) => void;
  toDoc: (db: DB) => string;
  onStatus: (s: "off" | "busy" | "ok" | "error") => void;
}

let client: MqttClient | null = null;
let cleanupFns: (() => void)[] = [];
let publishTimer: number | null = null;
let lastPublishedJson = "";

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
}

export function stopMqtt() {
  cleanupFns.forEach((f) => f());
  cleanupFns = [];
  if (publishTimer !== null) {
    clearTimeout(publishTimer);
    publishTimer = null;
  }
  if (client) {
    try {
      client.end(true);
    } catch {
      /* yoksay */
    }
    client = null;
  }
}

export function startMqtt(code: string, h: MqttHandlers) {
  stopMqtt();
  lastPublishedJson = "";
  const c = normalizeCode(code);
  if (c.length < 4) {
    h.onStatus("off");
    return;
  }
  const topic = `skyline-rp-community/${c}/state/v1`;
  let brokerIndex = 0;
  let stopped = false;
  let current: MqttClient | null = null;

  const doPublish = (h2: MqttHandlers, topicName: string) => {
    const cl = current;
    if (!cl || !cl.connected) return;
    const doc = h2.toDoc(h2.getLocal());
    if (doc === lastPublishedJson) return;
    lastPublishedJson = doc;
    cl.publish(topicName, doc, { retain: true, qos: 0 });
  };

  const schedulePublish = (delay: number) => {
    if (publishTimer !== null) clearTimeout(publishTimer);
    publishTimer = window.setTimeout(() => doPublish(h, topic), delay);
  };

  const onLocalChange = () => schedulePublish(350);
  window.addEventListener("skyline:db-changed", onLocalChange);
  cleanupFns.push(() => window.removeEventListener("skyline:db-changed", onLocalChange));

  const keepAlive = window.setInterval(() => schedulePublish(0), 20000);
  cleanupFns.push(() => clearInterval(keepAlive));

  const connect = () => {
    if (stopped) return;
    const url = BROKERS[brokerIndex % BROKERS.length];
    h.onStatus("busy");
    const cl = mqtt.connect(url, {
      clientId: `skyline-${Math.random().toString(36).slice(2, 12)}`,
      reconnectPeriod: 3000,
      connectTimeout: 8000,
      clean: true,
    });
    current = cl;
    client = cl;

    cl.on("connect", () => {
      h.onStatus("ok");
      cl.subscribe(topic, { qos: 0 }, () => {
        /* abone olduktan sonra kendi durumunu da yayınla */
        schedulePublish(600);
      });
    });

    cl.on("message", (_t, payload) => {
      try {
        const cloud = JSON.parse(payload.toString("utf8")) as CloudDoc;
        if (!cloud || typeof cloud !== "object" || !cloud.users || !Array.isArray(cloud.deposits)) return;
        const local = h.getLocal();
        const merged = mergeCloud(local, cloud);
        if (JSON.stringify(merged) !== JSON.stringify(local)) h.apply(merged);
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
      window.setTimeout(connect, 3500);
    });

    cl.on("reconnect", () => h.onStatus("busy"));
    cl.on("close", () => {
      if (!stopped) h.onStatus("busy");
    });
  };

  cleanupFns.push(() => {
    stopped = true;
  });

  connect();
}

/** yerel veri değişti — senkron motorlarına haber ver */
export function notifyDbChanged() {
  window.dispatchEvent(new Event("skyline:db-changed"));
}
