import { useState } from "react";
import { motion } from "framer-motion";
import { AlertOctagon, Lock, ShieldAlert, Unlock } from "lucide-react";
import { BRAND, ADMIN_NAME } from "../config";
import { click } from "../lib/audio";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";

/**
 * Erişim Kapısı — siteye girmek için sunucu kodu ZORUNLU.
 * Kod girmeden kimse (admin dahil) içeri giremez. Kod yanlış/boş ise ek
 * denemelerde kilitlenme sayacı artar.
 */
export function AccessGate() {
  const { syncCode, syncStatus, setSyncCode } = useGame();
  const [draft, setDraft] = useState("");
  const [attempts, setAttempts] = useState(0);

  const locked = syncStatus === "ok";

  function submit() {
    const code = draft.trim().toUpperCase();
    if (code.length < 4) {
      setAttempts((n) => n + 1);
      return;
    }
    click();
    setSyncCode(code);
  }

  return (
    <div className="bg-site noise relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="grid-lines absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-lose/10 via-transparent to-transparent" />
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-lose/15 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-lose/40 bg-ink-900/95 p-8 text-center shadow-2xl backdrop-blur-md"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-lose/30 bg-lose/10">
          {locked ? (
            <Lock className="h-10 w-10 text-emerald-400" strokeWidth={2.4} />
          ) : (
            <ShieldAlert className="h-10 w-10 text-lose" strokeWidth={2.4} />
          )}
        </div>

        {locked ? (
          <>
            <h1 className="mt-5 font-display text-3xl font-black text-emerald-400">
              Erişim Açıldı
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Sunucu kodu doğrulandı. İçeri yönlendiriliyorsun…
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <Unlock className="h-4 w-4 text-emerald-400" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-emerald-300">
                Kod aktif: {syncCode}
              </span>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-3xl font-black text-lose">
              Erişim Engellendi
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Bu alan yalnızca <span className="font-semibold text-white/80">{BRAND.ip}</span>{" "}
              sunucusuna bağlı yetkili oyunculara açıktır. Giriş yapmak için{" "}
              <span className="font-semibold text-white/80">{ADMIN_NAME}</span> tarafından
              Discord'dan verilen <span className="font-semibold">sunucu kodunu</span>{" "}
              girmelisin.
            </p>

            <div className="mt-6">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                Sunucu Kodu
              </label>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border bg-ink-800 px-3 transition",
                  attempts > 0 ? "border-lose/60" : "border-line focus-within:border-brand-500/60"
                )}
              >
                <AlertOctagon className="h-4 w-4 shrink-0 text-white/40" style={{ width: 18, height: 18 }} />
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value.toUpperCase());
                    if (attempts > 0) setAttempts(0);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="SKYLINE-XXXX"
                  maxLength={24}
                  spellCheck={false}
                  className="h-12 min-w-0 flex-1 bg-transparent font-display text-lg font-bold uppercase tracking-widest text-white placeholder:text-white/20 focus:outline-none"
                />
              </div>
              {attempts > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-lose">
                  <AlertOctagon className="h-3.5 w-3.5" /> Kod en az 4 karakter olmalı
                </div>
              )}
            </div>

            <button
              onClick={submit}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-lose to-lose/70 font-display text-lg font-black uppercase tracking-widest text-white transition hover:brightness-110"
              style={{ height: 52 }}
            >
              <Lock className="h-5 w-5" strokeWidth={2.8} /> Kodu Doğrula
            </button>

            <div className="mt-5 rounded-xl border border-line bg-ink-800/70 p-3 text-left">
              <div className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-lose" />
                <span>
                  Kodsuz giriş yapılamaz. Yetkili değilsen lütfen Discord üzerinden{" "}
                  <span className="font-semibold text-white/70">{ADMIN_NAME}</span> ile
                  iletişime geç.
                </span>
              </div>
            </div>
          </>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold">
          <span className="rounded border border-line bg-ink-800 px-2 py-1 text-white/40">
            IP: {BRAND.ip}
          </span>
          <span className="rounded border border-lose/30 bg-lose/10 px-2 py-1 text-lose">
            {locked ? "Doğrulandı" : "Kilitli"}
          </span>
        </div>

        <div className="mt-3 text-[10px] uppercase tracking-widest text-white/25">
          {BRAND.name}
          {BRAND.suffix} • {BRAND.tagline}
        </div>
      </motion.div>
    </div>
  );
}
