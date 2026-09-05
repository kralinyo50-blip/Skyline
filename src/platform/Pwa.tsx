import { useEffect, useState } from "react";
import { Download, RefreshCw, Smartphone } from "lucide-react";
import { Button, Modal } from "./ui";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;
export function PwaControls() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [help, setHelp] = useState(false),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [installed, setInstalled] = useState(
      () => window.matchMedia("(display-mode: standalone)").matches,
    ),
    [message, setMessage] = useState("");
  useEffect(() => {
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const complete = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", complete);
    let alive = true;
    if (
      "serviceWorker" in navigator &&
      window.isSecureContext &&
      !import.meta.env.DEV
    ) {
      registrationPromise ||= navigator.serviceWorker.register(
        new URL("./sw.js", document.baseURI).href,
        { scope: "./" },
      );
      void registrationPromise
        .then((reg) => {
          if (!alive) return;
          if (reg.waiting) setWaiting(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (
                alive &&
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setWaiting(worker);
            });
          });
        })
        .catch(() => {
          if (alive)
            setMessage(
              "Uygulama kurulumu şu anda kullanılamıyor. Site tarayıcıda çalışmaya devam eder.",
            );
        });
    }
    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  return (
    <>
      {waiting ? (
        <Button
          aria-label="Yeni sürüme geç"
          variant="secondary"
          onClick={() => {
            if (
              confirm(
                "Yeni sürüme geçmek için sayfa yenilenecek. V2’de devam eden bir turun varsa önce tamamla.",
              )
            ) {
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => location.reload(),
                { once: true },
              );
              waiting.postMessage({ type: "SKIP_WAITING" });
            }
          }}
        >
          <RefreshCw size={16} />
          <span className="pf-desktop-label">Yeni sürüm</span>
        </Button>
      ) : (
        !installed && (
          <Button
            variant="ghost"
            aria-label="Uygulamayı yükle"
            onClick={async () => {
              if (prompt) {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(null);
              } else setHelp(true);
            }}
          >
            <Download size={16} />
            <span className="pf-desktop-label">Yükle</span>
          </Button>
        )
      )}
      {help && (
        <Modal
          title="Skyline’ı ana ekranına ekle"
          onClose={() => setHelp(false)}
        >
          <div className="pf-stack">
            <Smartphone size={38} color="#f5b75b" />
            <p>
              Chrome / Edge: adres çubuğundaki yükleme simgesini veya tarayıcı
              menüsündeki “Uygulamayı yükle” seçeneğini kullan.
            </p>
            <p>
              iPhone / iPad Safari: <strong>Paylaş → Ana Ekrana Ekle</strong>.
            </p>
            <p className="pf-muted">
              İnternet yokken yalnızca uygulama kabuğu açılır. API, bakiye, özel
              görseller veya satış cevapları önbelleğe alınmaz; sunucu SC’siyle
              çevrimdışı ödeme yapılmaz.
            </p>
            {message && <p className="pf-alert-text">{message}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
