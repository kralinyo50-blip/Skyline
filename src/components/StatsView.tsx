import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  History,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import { money } from "../config";
import { CASE_MAP } from "../data/cases";
import { itemValue } from "../data/items";
import { RARITY, SKIN_MAP } from "../data/skins";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { SkinImg } from "./SkinCard";

/* ---------------- KÂR / ZARAR GRAFİĞİ (kümülatif SVG) ---------------- */
function PnLChart({ spent, value }: { spent: number[]; value: number[] }) {
  const w = 320;
  const h = 90;
  const max = Math.max(1, ...spent, ...value);
  const pts = (arr: number[]) =>
    arr
      .map((v, i) => `${(i / Math.max(1, arr.length - 1)) * w},${h - (v / max) * (h - 8) - 2}`)
      .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full">
      <line x1="0" y1={h - 2} x2={w} y2={h - 2} stroke="rgba(255,255,255,.08)" />
      <polyline points={pts(spent)} fill="none" stroke="#f98e1d" strokeWidth="2" opacity=".8" />
      <polyline points={pts(value)} fill="none" stroke="#2fd673" strokeWidth="2" />
    </svg>
  );
}

/* ---------------- PROVABLY FAIR DOĞRULAMA ---------------- */
const kasaRar = (id: string) => RARITY[id as keyof typeof RARITY];

function VerifyModal({
  seed,
  nonce,
  caseId,
  result,
  onClose,
}: {
  seed: string;
  nonce: number;
  caseId: string;
  result: string;
  onClose: () => void;
}) {
  const { verifyRoll } = useGame();
  const def = CASE_MAP[caseId];
  const calc = def ? verifyRoll(seed, nonce, def) : null;
  const expected = calc ? `${calc.weapon} | ${calc.name}` : "—";
  const ok = !!calc && (calc.id === result || expected === result);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-ink-800 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <div className="flex-1">
            <div className="font-display text-lg font-bold">Provably Fair Doğrulama</div>
            <div className="text-[11px] text-white/40">
              {CASE_MAP[caseId]?.name ?? caseId} — #{nonce}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-line bg-ink-900 p-3 text-[11px]">
          <div className="flex justify-between gap-2">
            <span className="shrink-0 text-white/45">Seed</span>
            <span className="break-all text-right font-mono text-white/80">{seed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/45">Nonce</span>
            <span className="font-mono text-white/80">{nonce}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <span className="text-white/45">Kayıtlı sonuç</span>
            <span className="font-bold text-white/80">{result}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/45">Yeniden hesaplanan</span>
            <span className="font-display font-bold" style={{ color: calc ? kasaRar(calc.rarity)?.color : "#fff" }}>
              {expected}
            </span>
          </div>
        </div>

        <div
          className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5"
          style={{
            borderColor: ok ? "rgba(47,214,115,.4)" : "rgba(239,68,68,.4)",
            background: ok ? "rgba(47,214,115,.08)" : "rgba(239,68,68,.08)",
          }}
        >
          {ok ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">
                Sonuç doğrulandı — kasa gerçekten rastgele çalışıyor.
              </span>
            </>
          ) : (
            <span className="text-xs font-bold text-lose">Sonuç eşleşmiyor — lütfen yetkiliye bildir!</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- PROFİL / İSTATİSTİK ---------------- */
export function StatsView() {
  const { rollLogs, achievements, unlockedAch, showcase, toggleShowcase, vipActive, vipTier } = useGame();
  const [verify, setVerify] = useState<{ seed: string; nonce: number; caseId: string; result: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const chart = useMemo(() => {
    const spent: number[] = [];
    const value: number[] = [];
    let s = 0;
    let v = 0;
    [...rollLogs].reverse().forEach((r) => {
      s += r.price;
      v += r.value;
      spent.push(s);
      value.push(v);
    });
    return { spent, value, net: v - s };
  }, [rollLogs]);

  const doneSet = useMemo(() => new Set(unlockedAch), [unlockedAch]);
  const doneCount = achievements.filter((a) => doneSet.has(a.id)).length;
  const logs = showAll ? rollLogs : rollLogs.slice(0, 30);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rar-classified/40 bg-rar-classified/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rar-classified">
            <Trophy className="h-3.5 w-3.5" /> Profilim
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            İstatistik &amp; <span className="text-brand-400">Geçmiş</span>
          </h1>
        </div>
        <div className="rounded-xl border border-line bg-ink-800 px-4 py-2 text-right">
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">Net Kâr</div>
          <div className={cn("font-display text-lg font-black", chart.net >= 0 ? "text-emerald-400" : "text-lose")}>
            {chart.net >= 0 ? "+" : ""}
            {money(chart.net)}
          </div>
        </div>
      </div>

      {/* PROFİL VİTRİNİ */}
      <div className="mb-4 rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-wider text-white/80">
            <Trophy className="h-4 w-4 text-rar-rare" /> Profil Vitrini
          </h2>
          <span className="text-[10px] font-bold text-white/35">En fazla 3 eşya — envanterden yıldızla seç</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-white/35">
            {showcase.length}/3
            {vipActive && (
              <span
                className="ml-1 rounded-full px-2 py-0.5 font-black uppercase"
                style={{ background: `${vipTier.color}22`, color: vipTier.color }}
              >
                {vipTier.icon} {vipTier.label}
              </span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {[0, 1, 2].map((i) => {
            const it = showcase[i];
            const skin = it ? SKIN_MAP[it.skinId] : null;
            return (
              <div
                key={i}
                className={
                  "flex aspect-[4/3] flex-col overflow-hidden rounded-xl border " +
                  (skin ? "border-line bg-ink-800" : "border-dashed border-line/60 bg-ink-900/40")
                }
                style={
                  skin
                    ? { backgroundImage: `radial-gradient(120% 80% at 50% 0%, ${RARITY[skin.rarity].color}18, transparent 55%)` }
                    : undefined
                }
              >
                {skin ? (
                  <>
                    <div className="relative flex-1">
                      <SkinImg skin={skin} className="h-full w-full" />
                      <button
                        onClick={() => it && toggleShowcase(it.uid)}
                        className="absolute right-1.5 top-1.5 rounded-md border border-line bg-ink-900/90 p-1 text-white/40 transition hover:text-lose"
                        title="Vitrinden çıkar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="truncate px-1.5 py-1 text-center text-[9px] font-semibold text-white/60">
                      {skin.weapon} | {skin.name}
                    </div>
                    <div className="pb-1.5 text-center font-display text-[11px] font-black text-emerald-400">
                      {it ? money(itemValue(it)) : ""}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-1 text-white/20">
                    <Trophy className="h-5 w-5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Boş</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2.5 text-[10px] leading-relaxed text-white/35">
          Vitrindeki eşyalar profilde herkesin görebileceği şekilde sergilenir. Jackpot kazandığında en
          değerli üçlü otomatik olarak vitrine düşer.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* KASA GEÇMİŞİ */}
        <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-wider text-white/80">
              <History className="h-4 w-4 text-brand-400" /> Kasa Geçmişi ({rollLogs.length})
            </h2>
            {rollLogs.length > 30 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-[10px] font-bold text-brand-300 hover:underline"
              >
                {showAll ? "Gizle" : "Tümünü göster"}
              </button>
            )}
          </div>

          {rollLogs.length === 0 ? (
            <p className="py-10 text-center text-xs text-white/30">
              Henüz kasa açmadın — ilkini aç ve geçmişini gör!
            </p>
          ) : (
            <div className="tiny-scroll max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {logs.map((r, i) => {
                const rar = kasaRar(r.rarity);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-line bg-ink-800/60 px-3 py-2 text-[11px]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: rar?.color ?? "#888" }}
                      title={rar?.tr}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white/80">{r.skinName}</div>
                      <div className="text-[9px] text-white/35">
                        {r.caseName} · #{r.nonce}
                        {r.forced && <span className="ml-1 font-bold text-brand-300">[GARANTİ]</span>}
                      </div>
                    </div>
                    <span className="shrink-0 font-display font-bold text-emerald-400">{money(r.value)}</span>
                    <button
                      onClick={() =>
                        setVerify({ seed: r.seed, nonce: r.nonce, caseId: r.caseId, result: r.skinName })
                      }
                      title="Provably Fair doğrula"
                      className="shrink-0 rounded border border-line bg-ink-900 p-1 text-white/40 transition hover:text-emerald-400"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {rollLogs.length > 1 && (
            <div className="mt-4 rounded-xl border border-line bg-ink-800/60 p-3">
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-widest text-white/40">
                  Harcama (turuncu) vs Değer (yeşil)
                </span>
                <span className="text-white/30">kümülatif</span>
              </div>
              <PnLChart spent={chart.spent} value={chart.value} />
              <div className="mt-2 flex justify-between text-[10px] text-white/35">
                <span>Toplam harcama: {money(chart.spent.at(-1) ?? 0)}</span>
                <span>Toplam değer: {money(chart.value.at(-1) ?? 0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* BAŞARIMLAR */}
        <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-wider text-white/80">
              <BadgeCheck className="h-4 w-4 text-emerald-400" /> Başarımlar
            </h2>
            <span className="text-[10px] font-bold text-white/35">
              {doneCount}/{achievements.length}
            </span>
          </div>
          <div className="space-y-2">
            {achievements.map((a) => {
              const done = doneSet.has(a.id);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition",
                    done ? "border-emerald-500/40 bg-emerald-500/5" : "border-line bg-ink-800/60"
                  )}
                >
                  <span className={cn("text-xl", !done && "opacity-30 grayscale")}>{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-xs font-bold", done ? "text-emerald-400" : "text-white/70")}>
                      {a.label}
                    </div>
                    <div className="truncate text-[10px] text-white/35">{a.desc}</div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-white/40">+{money(a.reward)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>{verify && <VerifyModal {...verify} onClose={() => setVerify(null)} />}</AnimatePresence>
    </div>
  );
}
