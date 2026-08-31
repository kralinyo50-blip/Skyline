import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FlaskConical, Info, PackageOpen, Sparkles, X } from "lucide-react";
import { money } from "../config";
import { RARITY, SKIN_MAP, SKINS, TIER_ORDER, type RarityKey, type Skin } from "../data/skins";
import { click, goldWin, reelStart, winSound } from "../lib/audio";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";
import { Confetti } from "./CaseReel";
import { SkinCard, SkinImg } from "./SkinCard";

const NEED = 10;

export function ContractView() {
  const { inventory, tradeUp, pushToast, setTab, priceVersion } = useGame();
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Skin | null>(null);

  const items = useMemo(
    () =>
      inventory
        .map((i) => ({ item: i, skin: SKIN_MAP[i.skinId] }))
        .filter((x) => x.skin)
        .sort((a, b) => b.skin.price - a.skin.price),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventory, priceVersion]
  );

  /* seçilenlerin kademesi — ilk seçim kademeyi kilitler */
  const lockedTier: RarityKey | null = useMemo(() => {
    if (!sel.length) return null;
    const first = inventory.find((i) => i.uid === sel[0]);
    return first ? SKIN_MAP[first.skinId]?.rarity ?? null : null;
  }, [sel, inventory]);

  const selSkins = sel
    .map((u) => inventory.find((i) => i.uid === u))
    .filter(Boolean)
    .map((i) => SKIN_MAP[i!.skinId]);

  const inputValue = selSkins.reduce((a, s) => a + s.price, 0);
  const nextTier = lockedTier ? TIER_ORDER[TIER_ORDER.indexOf(lockedTier) + 1] : null;
  const canContract = sel.length === NEED && nextTier && nextTier !== "rare";

  /* çıktı havuzu ve beklenen aralık */
  const outPool = useMemo(() => {
    if (!nextTier || nextTier === "rare") return [];
    return SKINS.filter((s) => s.rarity === nextTier && !s.st && !s.sv).sort(
      (a, b) => a.price - b.price
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTier, priceVersion]);

  function toggle(uidKey: string, skin: Skin) {
    if (busy) return;
    click();
    setSel((prev) => {
      if (prev.includes(uidKey)) return prev.filter((u) => u !== uidKey);
      if (prev.length >= NEED) return prev;
      if (lockedTier && skin.rarity !== lockedTier) return prev;
      return [...prev, uidKey];
    });
  }

  function autoFill() {
    if (busy) return;
    click();
    /* en çok bulunan kademeden en ucuz 10 eşyayı seç */
    const byTier = new Map<RarityKey, { uid: string; price: number }[]>();
    items.forEach(({ item, skin }) => {
      if (skin.rarity === "rare") return;
      const idx = TIER_ORDER.indexOf(skin.rarity);
      if (idx < 0 || TIER_ORDER[idx + 1] === "rare" || !TIER_ORDER[idx + 1]) return;
      const arr = byTier.get(skin.rarity) ?? [];
      arr.push({ uid: item.uid, price: skin.price });
      byTier.set(skin.rarity, arr);
    });
    let best: { tier: RarityKey; list: { uid: string; price: number }[] } | null = null;
    byTier.forEach((list, tier) => {
      if (list.length >= NEED && (!best || list.length > best.list.length)) best = { tier, list };
    });
    if (!best) {
      pushToast({ kind: "lose", title: "Yeterli eşya yok", sub: `Aynı kademeden ${NEED} eşya gerekli` });
      return;
    }
    const chosen = (best as { list: { uid: string; price: number }[] }).list
      .sort((a, b) => a.price - b.price)
      .slice(0, NEED)
      .map((x) => x.uid);
    setSel(chosen);
  }

  function submit() {
    if (!canContract || busy) return;
    setBusy(true);
    reelStart();
    window.setTimeout(() => {
      const out = tradeUp(sel);
      setBusy(false);
      setSel([]);
      if (!out) {
        pushToast({ kind: "lose", title: "Kontrat başarısız", sub: "Eşyalar aynı kademeden olmalı" });
        return;
      }
      setResult(out);
      if (out.price > inputValue) goldWin();
      else winSound(false);
    }, 1500);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      {/* envanter */}
      <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <FlaskConical className="h-4 w-4 text-brand-400" />
          <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
            Kontrat Eşyaları
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-bold",
              sel.length === NEED ? "bg-emerald-500/20 text-emerald-400" : "bg-ink-600 text-white/45"
            )}
          >
            {sel.length}/{NEED}
          </span>
          {lockedTier && (
            <span
              className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ color: RARITY[lockedTier].color, background: `${RARITY[lockedTier].color}1a` }}
            >
              {RARITY[lockedTier].tr} kilitli
            </span>
          )}
          <div className="ml-auto flex gap-1.5">
            <button
              onClick={autoFill}
              className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-300 transition hover:bg-brand-500/20"
            >
              Otomatik Doldur
            </button>
            {sel.length > 0 && (
              <button
                onClick={() => setSel([])}
                className="rounded-lg bg-ink-700 px-2.5 py-1 text-[11px] font-bold text-white/50 hover:text-white"
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        <div className="tiny-scroll max-h-[520px] overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <PackageOpen className="h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">Envanterin boş</p>
              <button
                onClick={() => setTab("cases")}
                className="rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-4 py-2 font-display text-sm font-bold text-ink-950"
              >
                Kasa Aç
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {items.map(({ item, skin }) => {
                const selected = sel.includes(item.uid);
                const idx = TIER_ORDER.indexOf(skin.rarity);
                const upgradable = idx >= 0 && !!TIER_ORDER[idx + 1] && TIER_ORDER[idx + 1] !== "rare";
                const blocked =
                  !selected && ((lockedTier && skin.rarity !== lockedTier) || !upgradable || sel.length >= NEED);
                return (
                  <SkinCard
                    key={item.uid}
                    skin={skin}
                    size="xs"
                    selected={selected}
                    dimmed={blocked}
                    onClick={() => (blocked ? undefined : toggle(item.uid, skin))}
                    badge={
                      selected ? (
                        <span
                          className="absolute right-1.5 top-1.5 z-10 flex items-center justify-center rounded-full bg-brand-500 text-ink-950 shadow"
                          style={{ width: 18, height: 18 }}
                        >
                          <Check className="h-3 w-3" strokeWidth={3.5} />
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* kontrat paneli */}
      <div className="flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-bold uppercase tracking-widest text-white/85">
              Trade-Up Kontratı
            </span>
          </div>

          {/* yuvalar */}
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: NEED }).map((_, i) => {
              const s = selSkins[i];
              return (
                <div
                  key={i}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg border",
                    s ? "border-line bg-ink-800" : "border-dashed border-line/60 bg-ink-900"
                  )}
                  style={s ? { boxShadow: `inset 0 -2px 0 0 ${RARITY[s.rarity].color}` } : undefined}
                >
                  {s ? (
                    <SkinImg skin={s} className="h-full w-full" />
                  ) : (
                    <span className="text-[10px] font-bold text-white/15">{i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-1.5 rounded-xl border border-line bg-ink-800 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-white/45">Verilen değer</span>
              <span className="font-display font-bold text-white/80">{money(inputValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/45">Çıkacak kademe</span>
              <span
                className="font-bold"
                style={{ color: nextTier ? RARITY[nextTier].color : undefined }}
              >
                {nextTier && nextTier !== "rare" ? RARITY[nextTier].tr : "—"}
              </span>
            </div>
            {outPool.length > 0 && (
              <div className="flex justify-between border-t border-line pt-1.5">
                <span className="text-white/45">Olası aralık</span>
                <span className="font-display font-bold text-emerald-400">
                  {money(outPool[0].price)} – {money(outPool[outPool.length - 1].price)}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={submit}
            disabled={!canContract || busy}
            className={cn(
              "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-base font-black uppercase tracking-widest transition",
              canContract && !busy
                ? "bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 hover:brightness-110"
                : "cursor-not-allowed bg-ink-600 text-white/30"
            )}
          >
            <FlaskConical className="h-5 w-5" />
            {busy ? "İşleniyor…" : sel.length < NEED ? `${NEED - sel.length} eşya daha seç` : "Kontratı Uygula"}
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-400" />
            <span className="font-display text-sm font-bold uppercase tracking-widest text-white/70">
              Nasıl Çalışır?
            </span>
          </div>
          <ul className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-white/45">
            <li>Aynı kademeden <span className="font-bold text-white/75">10 eşya</span> ver, bir üst kademeden 1 eşya al.</li>
            <li>Verdiğin eşyaların <span className="font-bold text-emerald-400">ortalama değeri yüksekse</span> daha iyi skin çıkma şansın artar.</li>
            <li>Ucuz eşyaları eritmenin en verimli yolu — hızlı satmaktan kârlı olabilir.</li>
          </ul>
        </div>
      </div>

      {/* sonuç */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setResult(null)}
          >
            {result.price > inputValue && (
              <Confetti colors={[RARITY[result.rarity].color, "#ffffff", "#f98e1d"]} />
            )}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-line bg-ink-800 p-6 text-center shadow-2xl"
            >
              <button
                onClick={() => setResult(null)}
                className="absolute right-3 top-3 rounded-lg p-2 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <div
                className="mx-auto w-fit rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                style={{
                  color: RARITY[result.rarity].color,
                  borderColor: `${RARITY[result.rarity].color}55`,
                  background: `${RARITY[result.rarity].color}15`,
                }}
              >
                {RARITY[result.rarity].tr}
              </div>
              <SkinImg skin={result} className="mx-auto mt-2 h-32 w-56" />
              <div className="text-xs uppercase tracking-widest text-white/45">{result.weapon}</div>
              <div className="font-display text-2xl font-black text-white">{result.name}</div>
              <div className="mt-2 font-display text-3xl font-black text-emerald-400">
                {money(result.price)}
              </div>
              <div
                className={cn(
                  "mt-1 text-xs font-bold",
                  result.price >= inputValue ? "text-emerald-400" : "text-lose"
                )}
              >
                {result.price >= inputValue
                  ? `+${money(result.price - inputValue)} kâr`
                  : `−${money(inputValue - result.price)} zarar`}
              </div>
              <button
                onClick={() => setResult(null)}
                className="mt-5 h-11 w-full rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 font-display text-sm font-bold text-ink-950"
              >
                Devam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
