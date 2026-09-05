import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Catalog, PlatformState } from "../../shared/platform";
import { markArchived } from "./legacy";
export async function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal || AbortSignal.timeout(20000),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "Güvenli sunucu bulunamadı. Render Web Service + PostgreSQL kurulumu gerekiyor; V2 kayıtların değişmedi.",
    );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "İstek tamamlanamadı.");
  return payload as T;
}
type Notice = { kind: "ok" | "error"; text: string };
interface PlatformContextValue {
  data: PlatformState | null;
  loading: boolean;
  connected: boolean;
  busy: boolean;
  error: string;
  notice: Notice | null;
  refresh: () => Promise<void>;
  act: <T = Record<string, unknown>>(
    path: string,
    body: unknown,
    message?: string,
  ) => Promise<T | null>;
  notify: (text: string, kind?: "ok" | "error") => void;
}
const Context = createContext<PlatformContextValue | null>(null);
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlatformState | null>(null),
    [loading, setLoading] = useState(true),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState<Notice | null>(null);
  const catalog = useRef<Catalog | null>(null),
    sequence = useRef(0),
    request = useRef<AbortController | null>(null),
    busyRef = useRef(false),
    alive = useRef(true),
    loadingRef = useRef(false);
  const notify = useCallback(
    (text: string, kind: "ok" | "error" = "ok") => setNotice({ text, kind }),
    [],
  );
  const refresh = useCallback(async () => {
    const seq = ++sequence.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    loadingRef.current = true;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const [c, state] = await Promise.all([
        catalog.current
          ? Promise.resolve(catalog.current)
          : api<Catalog>("catalog", undefined, controller.signal),
        api<Omit<PlatformState, "catalog">>(
          "state",
          undefined,
          controller.signal,
        ),
      ]);
      if (seq !== sequence.current || !alive.current) return;
      catalog.current = c;
      setData({ ...state, catalog: c });
      setConnected(true);
      setError("");
      if (state.user?.migratedAt)
        markArchived(state.user.username, state.user.migratedAt);
    } catch (e) {
      if (seq === sequence.current && alive.current) {
        setConnected(false);
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "Sunucuya ulaşılamadı. İşlem yapmak için bağlantıyı yenile.",
        );
      }
    } finally {
      clearTimeout(timeout);
      if (seq === sequence.current) {
        loadingRef.current = false;
        if (alive.current) setLoading(false);
      }
    }
  }, []);
  const act = useCallback(
    async <T,>(
      path: string,
      body: unknown,
      message = "İşlem tamamlandı.",
    ): Promise<T | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);
      try {
        const result = await api<T>(path, body);
        await refresh();
        if (alive.current && message) notify(message);
        return result;
      } catch (e) {
        if (alive.current)
          notify(
            e instanceof Error
              ? e.message
              : "İşlem sonucu doğrulanamadı. Geçmişi kontrol et.",
            "error",
          );
        await refresh();
        return null;
      } finally {
        busyRef.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [notify, refresh],
  );
  useEffect(() => {
    alive.current = true;
    void refresh();
    const poll = setInterval(() => {
      if (
        !loadingRef.current &&
        !busyRef.current &&
        document.visibilityState === "visible" &&
        navigator.onLine
      )
        void refresh();
    }, 3000);
    const offline = () => {
      setConnected(false);
      setError(
        "Çevrimdışısın. Bakiye ve eşya işlemleri internet olmadan yapılamaz.",
      );
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", refresh);
    return () => {
      alive.current = false;
      sequence.current++;
      request.current?.abort();
      clearInterval(poll);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <Context.Provider
      value={{
        data,
        loading,
        connected,
        busy,
        error,
        notice,
        refresh,
        act,
        notify,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlatform() {
  const value = useContext(Context);
  if (!value) throw new Error("PlatformProvider missing");
  return value;
}
export const pages = [
  "home",
  "studio",
  "inventory",
  "clans",
  "battles",
  "collections",
  "market",
  "gallery",
  "account",
  "admin",
] as const;
export type Page = (typeof pages)[number];
export function navigate(page: Page, params = "") {
  location.hash = `platform/${page}${params ? `?${params}` : ""}`;
}
export function usePage() {
  const read = () => {
    const part = location.hash.replace(/^#platform\/?/, "").split("?")[0];
    return pages.includes(part as Page) ? (part as Page) : "home";
  };
  const [page, setPage] = useState<Page>(read);
  useEffect(() => {
    const handler = () => setPage(read());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return page;
}
