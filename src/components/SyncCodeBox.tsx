import { useState } from "react";
import { Check, ClipboardCopy, Unplug, Wifi } from "lucide-react";
import { click } from "../lib/audio";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";

/** Giriş & onay ekranlarında da görünen kompakt sunucu kodu kutusu */
export function SyncCodeBox({ compact = false }: { compact?: boolean }) {
  const { syncCode, syncStatus, setSyncCode, pushToast } = useGame();
  const [draft, setDraft] = useState(syncCode ?? "");
  const [copied, setCopied] = useState(false);

  const statusDot =
    syncStatus === "ok" ? "bg-emerald-400" : syncCode ? "bg-brand-400 animate-pulse" : "bg-white/25";

  return (
    <div className="rounded-xl border border-line bg-ink-800/80 p-3 text-left">
      <div className="flex items-center gap-2">
        <Wifi
          className={cn(
            "h-4 w-4",
            syncStatus === "ok" ? "text-emerald-400" : "text-white/40"
          )}
        />
        <span className="font-display text-xs font-bold uppercase tracking-widest text-white/70">
          Sunucu Kodu
        </span>
        <span
          className={cn(
            "ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
            syncStatus === "ok" ? "text-emerald-400" : "text-white/35"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
          {syncStatus === "ok" ? "Bağlı" : syncCode ? "Bağlanıyor" : "Bağlı değil"}
        </span>
      </div>

      {!syncCode ? (
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim().length >= 4) {
                setSyncCode(draft);
              }
            }}
            placeholder="Örn: SKYLINE-7K2"
            maxLength={20}
            spellCheck={false}
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-ink-900 px-3 font-display text-sm font-bold uppercase tracking-widest text-white placeholder:text-white/20 focus:border-brand-500/60 focus:outline-none"
          />
          <button
            onClick={() => {
              if (draft.trim().length >= 4) {
                setSyncCode(draft);
                click();
              } else {
                pushToast({ kind: "lose", title: "Kod çok kısa", sub: "En az 4 karakter gir" });
              }
            }}
            className="h-10 shrink-0 rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-4 font-display text-sm font-bold text-ink-950 transition hover:brightness-110"
          >
            Bağlan
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/75">
            Aktif kod: <span className="font-display font-bold text-emerald-300">{syncCode}</span>
          </span>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(syncCode);
              setCopied(true);
              click();
              setTimeout(() => setCopied(false), 1300);
            }}
            className="flex items-center gap-1 rounded-md bg-ink-700 px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
          >
            {copied ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
          <button
            onClick={() => {
              setSyncCode(null);
              setDraft("");
              click();
            }}
            className="flex items-center gap-1 rounded-md bg-lose/10 px-2 py-1 text-[10px] font-bold text-lose hover:bg-lose/20"
          >
            <Unplug className="h-3 w-3" /> Kes
          </button>
        </div>
      )}

      {!compact && (
        <p className="mt-2 text-[10px] leading-relaxed text-white/30">
          Kodu Discord'dan al. Girince yetkiliye yaptığın talepler anında ulaşır;
          girmeden de devam edebilirsin (yalnızca bu cihazda kalır).
        </p>
      )}
    </div>
  );
}
