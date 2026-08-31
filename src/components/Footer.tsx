import { ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { ADMIN_NAME, BRAND, CURRENCY } from "../config";
import { click } from "../lib/audio";
import { useGame } from "../store/Game";

export function Footer() {
  const { pushToast } = useGame();

  const fakeLink = (label: string) => (
    <button
      key={label}
      onClick={() => {
        click();
        pushToast({ kind: "info", title: label, sub: "Bu sayfa yakında eklenecek" });
      }}
      className="text-left text-xs text-white/40 transition hover:text-brand-300"
    >
      {label}
    </button>
  );

  return (
    <footer className="border-t border-line bg-ink-950/80">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3 md:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
              <Sparkles className="h-4.5 w-4.5 text-ink-950" style={{ width: 18, height: 18 }} strokeWidth={2.4} />
            </div>
            <span className="font-display text-lg font-bold tracking-wide">
              {BRAND.name}
              <span className="text-brand-400">{BRAND.suffix}</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-white/35">
            {BRAND.tagline}. Kasa sistemi sunucu içi {CURRENCY.name} ile çalışır;
            kazanılan eşyalar oyun içi envanterine yansıtılır.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded border border-line bg-ink-800 px-2 py-1 text-[10px] font-semibold text-white/45">
              IP: {BRAND.ip}
            </span>
            <span className="flex items-center gap-1 rounded border border-line bg-ink-800 px-2 py-1 text-[10px] font-semibold text-white/45">
              <ShieldCheck className="h-3 w-3 text-emerald-400" /> Yetkili onaylı
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-display text-xs font-bold uppercase tracking-widest text-white/60">
            Sunucu
          </span>
          {fakeLink("Kurallar")}
          {fakeLink("Meslekler & Şehir Rehberi")}
          {fakeLink("Discord Sunucusu")}
          {fakeLink("Yetkili Başvurusu")}
        </div>

        <div>
          <span className="font-display text-xs font-bold uppercase tracking-widest text-white/60">
            Bilgilendirme
          </span>
          <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-white/35">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            Tüm para yatırma talepleri <span className="font-semibold text-white/55">{ADMIN_NAME}</span> onayından
            geçer. Bakiye ve eşyalar yalnızca {BRAND.name} sunucusunda geçerlidir, gerçek para
            değeri taşımaz. Minecraft, Mojang Studios'un tescilli markasıdır.
          </p>
        </div>
      </div>

      <div className="border-t border-line py-4 text-center text-[11px] text-white/25">
        © 2026 {BRAND.name}
        {BRAND.suffix} — Şehir Roleplay Sunucusu ·{" "}
        <span className="font-bold text-white/40">v1.0</span>
      </div>
    </footer>
  );
}
