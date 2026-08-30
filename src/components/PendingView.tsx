import { motion } from "framer-motion";
import { Clock, LogOut, RefreshCcw, ShieldX, Hourglass, ShieldCheck } from "lucide-react";
import { ADMIN_NAME, BRAND, mcBody, mcHead } from "../config";
import { forceSync } from "../store/sync";
import { SyncCodeBox } from "./SyncCodeBox";
import { useGame } from "../store/Game";

function since(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dakika önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export function PendingView() {
  const { user, logout, pushToast } = useGame();
  if (!user) return null;

  const rejected = user.status === "rejected";

  return (
    <div className="bg-site noise relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="grid-lines absolute inset-0" />
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-ink-900/90 p-8 text-center shadow-2xl backdrop-blur-md"
      >
        <div className="relative mx-auto w-fit">
          <img
            src={mcBody(user.name, 140)}
            alt={user.name}
            className="animate-floaty h-40 object-contain drop-shadow-2xl"
            style={{ imageRendering: "pixelated" }}
          />
          <div
            className={
              rejected
                ? "absolute -right-3 bottom-2 flex h-11 w-11 items-center justify-center rounded-full border-4 border-ink-900 bg-lose"
                : "absolute -right-3 bottom-2 flex h-11 w-11 items-center justify-center rounded-full border-4 border-ink-900 bg-brand-500"
            }
          >
            {rejected ? (
              <ShieldX className="h-5 w-5 text-white" strokeWidth={2.6} />
            ) : (
              <Hourglass className="h-5 w-5 text-ink-950" strokeWidth={2.6} />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <img
            src={mcHead(user.name, 28)}
            alt=""
            className="h-6 w-6 rounded"
            style={{ imageRendering: "pixelated" }}
          />
          <span className="font-display text-xl font-bold text-white">{user.name}</span>
        </div>

        {rejected ? (
          <>
            <h1 className="mt-4 font-display text-3xl font-black text-lose">Başvurun Reddedildi</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Yetkili ekibi hesabını onaylamadı. Bir yanlışlık olduğunu düşünüyorsan
              sunucu içinde <span className="font-semibold text-white/75">{ADMIN_NAME}</span> ile
              iletişime geçebilirsin.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-3xl font-black">
              Onay <span className="text-brand-400">Bekleniyor</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Başvurun <span className="font-semibold text-white/75">{ADMIN_NAME}</span> yetkilisine
              iletildi. Onaylandığında bu ekran otomatik açılacak; hesabın 0 bakiye ile
              başlayacak ve parayı yalnızca yetkili ekleyebilecek.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/5 px-4 py-3">
              <span className="live-dot h-2 w-2 rounded-full bg-brand-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-brand-300">
                Sırada bekliyorsun
              </span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/35">
              <Clock className="h-3.5 w-3.5" /> Başvuru {since(user.createdAt)} gönderildi
            </div>
          </>
        )}

        {/* sunucu kodu — onaylandığında talepler buna göre akar */}
        <div className="mt-6">
          <SyncCodeBox />
          <button
            onClick={() => {
              forceSync();
              pushToast({ kind: "info", title: "Senkron kontrol ediliyor…", sub: "Onayın geldiğinde sayfa otomatik açılır" });
            }}
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-ink-800 text-xs font-bold text-white/50 transition hover:text-white"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Durumu şimdi kontrol et
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-white/30">
            Uzun süredir bekliyorsan: sen ve yetkili ({ADMIN_NAME}) <span className="font-semibold text-white/50">aynı sunucu kodunu</span> girmiş olmalısınız.
            Yetkili onay verdiği anda sayfa kendiliğinden açılır.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-ink-800/70 p-3 text-left">
          <div className="flex items-start gap-2 text-[11px] leading-relaxed text-white/40">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Yetkiliysen ({ADMIN_NAME}) çıkış yapıp kendi adınla girerek paneli açabilir,
              bekleyen başvuruları buradan onaylayabilirsin.
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-ink-800 font-display text-sm font-bold uppercase tracking-widest text-white/60 transition hover:bg-ink-700 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Çıkış Yap
        </button>

        <div className="mt-4 text-[10px] uppercase tracking-widest text-white/25">
          {BRAND.name}
          {BRAND.suffix} • {BRAND.ip}
        </div>
      </motion.div>
    </div>
  );
}
