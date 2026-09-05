import { motion } from "framer-motion";
import { Lock, Palette, X } from "lucide-react";
import { click } from "../lib/audio";
import {
  AVATARS,
  BANNERS,
  FRAMES,
  NAME_COLORS,
  TITLES,
  bannerCss,
  frameColor,
  titleLabel,
  type TitleStats,
} from "../data/looks";
import { levelFromSpent, useGame } from "../store/Game";
import { cn } from "../utils/cn";

/* ==================================================================
   V2.0 PROFİL EDITÖRÜ — banner · çerçeve · ünvan · avatar · isim rengi
   Seçimler Account.look alanında saklanır ve pub ile yayınlanır.
================================================================== */

export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { user, look, setLook, inventory } = useGame();

  const stats: TitleStats = user
    ? {
        level: levelFromSpent(user.stats.spent),
        opened: user.stats.opened,
        spent: user.stats.spent,
        bestDrop: user.stats.bestDrop,
        inv: inventory.length,
        vip: user.vipLevel ?? 0,
      }
    : { level: 1, opened: 0, spent: 0, bestDrop: 0, inv: 0, vip: 0 };

  const sec = "mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35";

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
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-ink-800/95 px-4 py-3 backdrop-blur">
          <Palette className="h-4 w-4 text-brand-400" />
          <span className="font-display text-sm font-black uppercase tracking-wider text-white">
            Profili Özelleştir
          </span>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg border border-line bg-ink-700 p-1.5 text-white/50 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-4">
          {/* canlı önizleme */}
          <div
            className="overflow-hidden rounded-2xl border-2 bg-ink-900"
            style={{ borderColor: frameColor(look.frame) }}
          >
            <div className="h-20" style={{ background: bannerCss(look.banner) }} />
            <div className="flex items-center gap-3 px-4 pb-3">
              <div
                className="-mt-6 grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 bg-ink-800 text-2xl"
                style={{ borderColor: frameColor(look.frame) }}
              >
                {look.avatar ?? "🙂"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="truncate font-display text-lg font-black"
                    style={{ color: NAME_COLORS.find((n) => n.key === look.nameColor)?.c }}
                  >
                    {user?.name ?? "Oyuncu"}
                  </span>
                  {titleLabel(look.unvan) && (
                    <span className="shrink-0 rounded bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-300">
                      {titleLabel(look.unvan)}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/35">Önizleme — herkes böyle görecek</div>
              </div>
            </div>
          </div>

          {/* banner */}
          <div>
            <div className={sec}>Kapak Banner'ı</div>
            <div className="grid grid-cols-5 gap-1.5">
              {BANNERS.map((b) => (
                <button
                  key={b.key}
                  title={b.label}
                  onClick={() => {
                    setLook({ banner: b.key });
                    click();
                  }}
                  className={cn(
                    "h-10 rounded-lg border transition",
                    (look.banner ?? "gece") === b.key
                      ? "border-white/80 shadow-[0_0_10px_rgba(255,255,255,0.25)]"
                      : "border-line hover:border-ink-500"
                  )}
                  style={{ background: b.css }}
                />
              ))}
            </div>
          </div>

          {/* çerçeve */}
          <div>
            <div className={sec}>Profil Çerçevesi</div>
            <div className="flex flex-wrap gap-1.5">
              {FRAMES.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setLook({ frame: f.key });
                    click();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition",
                    (look.frame ?? "none") === f.key
                      ? "border-white/70 bg-white/5 text-white"
                      : "border-line bg-ink-900 text-white/50 hover:text-white"
                  )}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: f.color }} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* avatar */}
          <div>
            <div className={sec}>Avatar</div>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
              <button
                onClick={() => {
                  setLook({ avatar: undefined });
                  click();
                }}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg border text-lg transition",
                  !look.avatar
                    ? "border-white/70 bg-white/5"
                    : "border-line bg-ink-900 hover:border-ink-500"
                )}
                title="Avatar yok"
              >
                <X className="h-3.5 w-3.5 text-white/40" />
              </button>
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setLook({ avatar: a });
                    click();
                  }}
                  className={cn(
                    "grid aspect-square place-items-center rounded-lg border text-lg transition",
                    look.avatar === a
                      ? "border-white/70 bg-white/5"
                      : "border-line bg-ink-900 hover:border-ink-500"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* isim rengi */}
          <div>
            <div className={sec}>İsim Rengi (sohbet & liderlik)</div>
            <div className="flex flex-wrap gap-1.5">
              {NAME_COLORS.map((n) => (
                <button
                  key={n.key}
                  onClick={() => {
                    setLook({ nameColor: n.key });
                    click();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition",
                    (look.nameColor ?? "default") === n.key
                      ? "border-white/70 bg-white/5 text-white"
                      : "border-line bg-ink-900 text-white/50 hover:text-white"
                  )}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: n.c }} />
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* ünvanlar */}
          <div>
            <div className={sec}>Ünvan</div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <button
                onClick={() => {
                  setLook({ unvan: undefined });
                  click();
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition",
                  !look.unvan
                    ? "border-brand-500/70 bg-brand-500/10"
                    : "border-line bg-ink-900 hover:border-ink-500"
                )}
              >
                <X className="h-3.5 w-3.5 text-white/40" />
                <span className="text-[11px] font-bold text-white/70">Ünvan yok</span>
              </button>
              {TITLES.map((t) => {
                const open = t.cond(stats);
                const active = look.unvan === t.key;
                return (
                  <button
                    key={t.key}
                    disabled={!open}
                    onClick={() => {
                      setLook({ unvan: t.key });
                      click();
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition",
                      active
                        ? "border-brand-500/70 bg-brand-500/10"
                        : open
                          ? "border-line bg-ink-900 hover:border-ink-500"
                          : "cursor-not-allowed border-line/50 bg-ink-900/40 opacity-60"
                    )}
                  >
                    {open ? (
                      <span className="text-[11px] font-black uppercase tracking-wider text-brand-300">
                        {t.label}
                      </span>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 shrink-0 text-white/30" />
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-bold text-white/40">{t.label}</span>
                          <span className="block truncate text-[9px] text-white/30">{t.hint}</span>
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
