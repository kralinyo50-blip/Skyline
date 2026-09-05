import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Palette, Sparkles, Wand2, X } from "lucide-react";
import { money } from "../config";
import { badgeArt, type BadgeShape } from "../data/skinArt";
import { CUSTOM_STICKER_COST } from "../data/stickers";
import { click } from "../lib/audio";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";

type Effect = "none" | "foil" | "holo" | "gold";

const SHAPES: { k: BadgeShape; label: string }[] = [
  { k: "circle", label: "Daire" },
  { k: "shield", label: "Kalkan" },
  { k: "star", label: "Yıldız" },
  { k: "hex", label: "Altıgen" },
  { k: "diamond", label: "Elmas" },
  { k: "crown", label: "Taç" },
  { k: "bolt", label: "Şimşek" },
  { k: "heart", label: "Kalp" },
  { k: "gem", label: "Mücevher" },
];

/* V2.0: emoji katmanı + yazı tipleri */
const EMOJIS: string[] = [
  "\u{1F525}", "\u{26A1}", "\u{1F43A}", "\u{1F451}", "\u{1F48E}", "\u{1F3AF}",
  "\u{1F409}", "\u{1F480}", "\u{1F340}", "\u{2764}\u{FE0F}", "\u{2B50}", "\u{1F319}",
];
const FONTS: { k: "display" | "mono" | "serif"; label: string }[] = [
  { k: "display", label: "Skyline" },
  { k: "mono", label: "Mono" },
  { k: "serif", label: "Serif" },
];

const EFFECTS: { k: Effect; label: string; mult: number; color: string }[] = [
  { k: "none", label: "Normal", mult: 1, color: "#8fa0bd" },
  { k: "foil", label: "Foil", mult: 1.6, color: "#c9d6e8" },
  { k: "holo", label: "Holo", mult: 2.2, color: "#b06bff" },
  { k: "gold", label: "Altın", mult: 3.4, color: "#e4ae39" },
];

const BG_COLORS = ["#f98e1d", "#e43d30", "#4b69ff", "#2fd673", "#8847ff", "#111827", "#f5d90a", "#ff45a8"];
const FG_COLORS = ["#ffffff", "#0b0e16", "#ffd166", "#4fd8ff", "#ff8ad4", "#c8ff2e"];

export function StickerStudio({ onClose }: { onClose: () => void }) {
  const { balance, createCustomSticker } = useGame();
  const [text, setText] = useState("SKYLINE");
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [fg, setFg] = useState(FG_COLORS[0]);
  const [shape, setShape] = useState<BadgeShape>("shield");
  const [effect, setEffect] = useState<Effect>("none");
  const [bg2, setBg2] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [font, setFont] = useState<"display" | "mono" | "serif">("display");

  const preview = useMemo(
    () => badgeArt({ text: text || "ÖZEL", bg, fg, shape, effect, bg2: bg2 ?? undefined, emoji: emoji ?? undefined, font }),
    [text, bg, fg, shape, effect, bg2, emoji, font]
  );

  const value = Math.round(CUSTOM_STICKER_COST * (EFFECTS.find((e) => e.k === effect)?.mult ?? 1));
  const afford = balance >= CUSTOM_STICKER_COST;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="tiny-scroll max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-ink-800 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
              <Wand2 className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <div className="font-display text-lg font-bold">Sticker Atölyesi</div>
              <div className="text-[11px] text-white/40">Kendi tasarımını üret</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-[200px_1fr]">
          {/* önizleme */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-2xl border border-line bg-ink-900">
              <div
                className="absolute inset-4 rounded-full opacity-40 blur-2xl"
                style={{ background: bg }}
              />
              <img src={preview} alt="önizleme" className="relative h-36 w-36" />
            </div>
            <div className="w-full rounded-xl border border-line bg-ink-900 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Tahmini Değer
              </div>
              <div className="font-display text-xl font-black text-emerald-400">{money(value)}</div>
            </div>
          </div>

          {/* ayarlar */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                Yazı (en fazla 12 karakter)
              </label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 12))}
                maxLength={12}
                placeholder="SKYLINE"
                className="h-11 w-full rounded-xl border border-line bg-ink-900 px-3 font-display text-lg font-bold uppercase tracking-widest text-white placeholder:text-white/20 focus:border-brand-500/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                Şekil
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SHAPES.map((s) => (
                  <button
                    key={s.k}
                    onClick={() => {
                      setShape(s.k);
                      click();
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[11px] font-bold transition",
                      shape === s.k
                        ? "border-brand-500 bg-brand-500/10 text-brand-300"
                        : "border-line bg-ink-900 text-white/45 hover:text-white"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
                  <Palette className="h-3 w-3" /> Zemin
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBg(c)}
                      className={cn(
                        "h-7 w-7 rounded-lg border-2 transition",
                        bg === c ? "border-white" : "border-transparent"
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                  Yazı Rengi
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFg(c)}
                      className={cn(
                        "h-7 w-7 rounded-lg border-2 transition",
                        fg === c ? "border-white" : "border-transparent"
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                Gradyan İkinci Renk
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setBg2(null)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[10px] font-bold transition",
                    bg2 === null ? "border-white text-white" : "border-line bg-ink-900 text-white/40 hover:text-white"
                  )}
                >
                  Yok
                </button>
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBg2(c)}
                    className={cn(
                      "h-7 w-7 rounded-lg border-2 transition",
                      bg2 === c ? "border-white" : "border-transparent"
                    )}
                    style={{ background: `linear-gradient(135deg, ${bg} 40%, ${c})` }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                  Emoji Katmanı
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setEmoji(null)}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[10px] font-bold transition",
                      emoji === null ? "border-white text-white" : "border-line bg-ink-900 text-white/40 hover:text-white"
                    )}
                  >
                    Yok
                  </button>
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-lg border text-sm transition",
                        emoji === e ? "border-white bg-white/10" : "border-line bg-ink-900 hover:border-ink-500"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">
                  Yazı Tipi
                </label>
                <div className="flex gap-1.5">
                  {FONTS.map((f) => (
                    <button
                      key={f.k}
                      onClick={() => setFont(f.k)}
                      className={cn(
                        "flex-1 rounded-lg border py-1.5 text-[10px] font-bold transition",
                        font === f.k ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-line bg-ink-900 text-white/45 hover:text-white"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
                <Sparkles className="h-3 w-3" /> Efekt (değeri artırır)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {EFFECTS.map((e) => (
                  <button
                    key={e.k}
                    onClick={() => {
                      setEffect(e.k);
                      click();
                    }}
                    className={cn(
                      "rounded-lg border py-2 text-[10px] font-bold transition",
                      effect === e.k ? "border-brand-500 bg-brand-500/10" : "border-line bg-ink-900 hover:bg-ink-700"
                    )}
                    style={{ color: effect === e.k ? e.color : undefined }}
                  >
                    {e.label}
                    <div className="text-[9px] opacity-60">×{e.mult}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (createCustomSticker({ text: text || "ÖZEL", bg, fg, shape, effect, bg2: bg2 ?? undefined, emoji: emoji ?? undefined, font })) onClose();
              }}
              disabled={!afford}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-base font-black uppercase tracking-widest transition",
                afford
                  ? "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
                  : "cursor-not-allowed bg-ink-600 text-white/30"
              )}
            >
              <Wand2 className="h-5 w-5" />
              {afford ? `${money(CUSTOM_STICKER_COST)} — Üret` : "Yetersiz Bakiye"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
