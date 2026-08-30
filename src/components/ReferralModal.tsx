import { useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Copy,
  Gift,
  Send,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { mcHead, money } from "../config";
import { coinDing } from "../lib/audio";
import { levelFromSpent, useGame } from "../store/Game";
import { cn } from "../utils/cn";

function ago(ts?: number): string {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export function ReferralModal({ onClose }: { onClose: () => void }) {
  const {
    refCode,
    refLevel,
    refBonus,
    referralFriends,
    refInvited,
    user,
    pushToast,
  } = useGame();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(refCode);
      setCopied(true);
      coinDing();
      pushToast({ kind: "info", title: "Davet kodu kopyalandı", sub: refCode });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      pushToast({ kind: "lose", title: "Kopyalanamadı", sub: `Kodun: ${refCode}` });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="tiny-scroll max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-ink-800 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-line bg-ink-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <UserPlus className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div className="font-display text-lg font-bold">Davet &amp; Ödül</div>
            <div className="text-[11px] text-white/40">Arkadaşını getir, ikiniz de kazanın</div>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* davet kodu */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Davet Kodun
            </div>
            <div className="flex items-center gap-2">
              <img
                src={mcHead(user?.name ?? refCode, 64)}
                alt=""
                className="h-11 w-11 rounded-lg"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-2xl font-black tracking-wide text-white">
                  {refCode}
                </div>
                <div className="text-[10px] text-white/35">
                  Arkadaşın giriş ekranına bu kodu yazsın
                </div>
              </div>
              <button
                onClick={copy}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-xl px-4 font-display text-xs font-black uppercase tracking-wider transition",
                  copied
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
                )}
              >
                {copied ? <BadgeCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
          </div>

          {/* nasıl çalışır */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: "1", t: "Kodu Paylaş", d: "Kodunu arkadaşına gönder" },
              { n: "2", t: "Arkadaş Katılır", d: "Girişte kodunu girer" },
              { n: "3", t: `Seviye ${refLevel} Ödülü`, d: `+${money(refBonus)} senin` },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-line bg-ink-900 p-3 text-center">
                <div className="mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 font-display text-xs font-black text-emerald-400">
                  {s.n}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">{s.t}</div>
                <div className="mt-0.5 text-[9px] leading-relaxed text-white/35">{s.d}</div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-ink-900 p-3 text-[11px] leading-relaxed text-white/50">
            <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <span>
              Davet ettiğin oyuncu <b className="text-white/80">Seviye {refLevel}'e</b> ulaştığında{" "}
              <b className="text-emerald-400">{money(refBonus)}</b> hesabına otomatik yüklenir. Kasa açma,
              oyun oynama ve upgrader harcamaları seviye kazandırır.
            </span>
          </div>

          {refInvited && (
            <div className="flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 p-3 text-[11px] font-semibold text-brand-300">
              <Gift className="h-4 w-4" />
              Sen davet kodlu bir hesapsın — Seviye {refLevel}'e ulaşınca davet eden kişi {money(refBonus)} kazanacak.
            </div>
          )}

          {/* davet ettiklerim */}
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40">
              <Users className="h-3.5 w-3.5" /> Davet Ettiklerim ({referralFriends.length})
            </h4>
            {referralFriends.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-8 text-center">
                <Send className="h-7 w-7 text-white/15" />
                <div className="text-xs text-white/30">Henüz kimse kodunla katılmadı</div>
              </div>
            ) : (
              <div className="space-y-2">
                {referralFriends.map((f) => {
                  const lvl = f.pub?.level ?? levelFromSpent(f.stats?.spent ?? 0);
                  const ok = !!f.refRewarded || lvl >= refLevel;
                  return (
                    <div key={f.key} className="flex items-center gap-2.5 rounded-xl border border-line bg-ink-900 p-3">
                      <img
                        src={mcHead(f.name, 48)}
                        alt=""
                        className="h-9 w-9 rounded"
                        style={{ imageRendering: "pixelated" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{f.name}</div>
                        <div className="text-[10px] text-white/35">
                          Seviye {lvl} / {refLevel} • {ago(f.createdAt)}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black",
                          ok
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border-line bg-ink-800 text-white/40"
                        )}
                      >
                        {ok ? <BadgeCheck className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
                        {ok ? "Ödül kazanıldı" : `${refLevel - lvl} seviye kaldı`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {referralFriends.length > 0 && (
              <p className="mt-2 text-[10px] text-white/30">
                Seviye bilgisi, aynı Sunucu Kodu'nu kullanan arkadaşlarının profillerinden gelir.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
