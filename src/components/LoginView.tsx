import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Gift, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import {
  ADMIN_NAME,
  BRAND,
  CURRENCY,
  REFERRAL_BONUS,
  isValidMcName,
  mcBody,
  mcHead,
  money,
} from "../config";
import { click } from "../lib/audio";
import { useGame } from "../store/Game";
import { SyncCodeBox } from "./SyncCodeBox";
import { cn } from "../utils/cn";

export function LoginView() {
  const { login } = useGame();
  const [name, setName] = useState("");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState("");

  const valid = isValidMcName(name);
  const refValid = ref.trim() === "" || isValidMcName(ref);
  const willBeAdmin = name.trim().toLowerCase() === ADMIN_NAME.toLowerCase();

  /* skin önizlemesi için gecikmeli güncelleme */
  useEffect(() => {
    const t = setTimeout(() => setPreview(valid ? name.trim() : ""), 450);
    return () => clearTimeout(t);
  }, [name, valid]);

  function submit() {
    if (!valid) {
      setError("Geçerli bir Minecraft adı gir (3-16 karakter, harf/rakam/_)");
      return;
    }
    if (!refValid) {
      setError("Davet kodu geçersiz — 3-16 karakter, harf/rakam/_");
      return;
    }
    click();
    const res = login(name.trim(), ref.trim() || undefined);
    if (!res.ok) setError(res.error ?? "Giriş yapılamadı");
  }

  return (
    <div className="bg-site noise relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="grid-lines absolute inset-0" />
      <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-500/10 blur-[100px]" />
      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-rar-milspec/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative z-10 grid w-full max-w-3xl overflow-hidden rounded-3xl border border-line bg-ink-900/90 shadow-2xl backdrop-blur-md md:grid-cols-[1fr_260px]"
      >
        {/* form */}
        <div className="p-7 sm:p-9">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_6px_20px_-4px_rgba(249,142,29,0.6)]">
              <Sparkles className="h-6 w-6 text-ink-950" strokeWidth={2.4} />
            </div>
            <div>
              <div className="font-display text-2xl font-black leading-none tracking-wide">
                {BRAND.name}
                <span className="text-brand-400">{BRAND.suffix}</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-white/35">
                {BRAND.tagline}
              </div>
            </div>
          </div>

          <h1 className="mt-7 font-display text-3xl font-black leading-tight">
            Sunucu adınla <span className="text-brand-400">giriş yap</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            Kasa sistemine girmek için Minecraft kullanıcı adını yaz. İlk girişinde
            hesabın <span className="font-semibold text-white/70">{ADMIN_NAME}</span> tarafından
            onaylanmayı bekler.
          </p>

          <div className="mt-6">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
              Minecraft Adın
            </label>
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-ink-800 px-3 transition",
                error ? "border-lose/60" : "border-line focus-within:border-brand-500/60"
              )}
            >
              <UserRound className="h-4.5 w-4.5 shrink-0 text-white/30" style={{ width: 18, height: 18 }} />
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Örn: Kaan9897"
                maxLength={16}
                spellCheck={false}
                className="h-12 min-w-0 flex-1 bg-transparent font-display text-lg font-semibold text-white placeholder:text-white/20 focus:outline-none"
              />
              {valid && (
                <img
                  src={mcHead(name.trim(), 32)}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
            </div>

            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-lose">
                <AlertTriangle className="h-3.5 w-3.5" /> {error}
              </div>
            )}

            {willBeAdmin && !error && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 px-2.5 py-1.5 text-xs font-semibold text-brand-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Yönetici hesabı algılandı — panel erişimi açık
              </div>
            )}

            {/* davet kodu */}
            <div className="mt-4">
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
                <Gift className="h-3.5 w-3.5 text-emerald-400" /> Davet Kodu (opsiyonel)
              </label>
              <input
                value={ref}
                onChange={(e) => {
                  setRef(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Seni davet eden oyuncunun adı"
                maxLength={16}
                spellCheck={false}
                className="h-11 w-full rounded-xl border border-line bg-ink-800 px-3 font-display text-sm font-semibold text-white placeholder:text-white/20 focus:border-emerald-500/50 focus:outline-none"
              />
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/30">
                Arkadaşının kodunu girersen, sen Seviye 5'e ulaşınca arkadaşın{" "}
                <span className="font-bold text-emerald-400">{money(REFERRAL_BONUS)}</span> ödül kazanır.
              </p>
            </div>

            <button
              onClick={submit}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-lg font-black uppercase tracking-widest text-ink-950 transition hover:brightness-110 hover:shadow-[0_12px_36px_-8px_rgba(249,142,29,0.7)]"
              style={{ height: 52 }}
            >
              Giriş Yap <ArrowRight className="h-5 w-5" strokeWidth={2.8} />
            </button>
          </div>

          {/* sunucu kodu kutusu */}
          <div className="mt-5">
            <SyncCodeBox />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
            <span className="rounded border border-line bg-ink-800 px-2 py-1 text-white/40">
              IP: {BRAND.ip}
            </span>
            <span className="rounded border border-line bg-ink-800 px-2 py-1 text-white/40">
              Para birimi: {CURRENCY.name}
            </span>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-400">
              Şifre gerekmez
            </span>
          </div>
        </div>

        {/* skin önizleme */}
        <div className="relative hidden flex-col items-center justify-center gap-3 border-l border-line bg-gradient-to-b from-ink-800 to-ink-900 p-6 md:flex">
          <div className="absolute inset-x-6 top-8 h-40 rounded-full bg-brand-500/10 blur-3xl" />
          {preview ? (
            <motion.img
              key={preview}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              src={mcBody(preview, 200)}
              alt={preview}
              className="animate-floaty relative h-56 object-contain drop-shadow-2xl"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-2 text-white/20">
              <UserRound className="h-14 w-14" strokeWidth={1.4} />
              <span className="text-xs font-semibold">Skin önizlemesi</span>
            </div>
          )}
          <div className="relative text-center">
            <div className="font-display text-base font-bold text-white/80">
              {preview || "..."}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/30">
              {BRAND.name} vatandaşı
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
