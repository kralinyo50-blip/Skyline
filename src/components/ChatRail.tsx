import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Medal, MessageSquare, Send, Trophy, Users } from "lucide-react";
import { ADMIRATION_LINES, CELEBRITY_LINES, CELEBRITY_USERS, CHAT_LINES, COMMUNITY_USERS } from "../data/fakers";
import { mcHead } from "../config";
import { fmtMoney } from "../data/skins";
import { pick, randInt, uid } from "../lib/rng";
import { useGame } from "../store/Game";
import { cn } from "../utils/cn";

interface ChatMsg {
  id: string;
  user: string;
  level: number;
  text: string;
  ts: number;
  me?: boolean;
}

const AV_COLORS = ["#f98e1d", "#4b69ff", "#d32ce6", "#2fd673", "#53c8ff", "#eb4b4b", "#8847ff"];

function botName(): string {
  return Math.random() < 0.1 ? pick(CELEBRITY_USERS) : pick(COMMUNITY_USERS);
}
function botLine(): string {
  return Math.random() < 0.1 ? pick(CELEBRITY_LINES) : pick(CHAT_LINES);
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const idx = name.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length;
  const [err, setErr] = useState(false);
  if (err)
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded font-display font-bold text-ink-950"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          background: `linear-gradient(135deg, ${AV_COLORS[idx]}, ${AV_COLORS[(idx + 2) % AV_COLORS.length]})`,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  return (
    <img
      src={mcHead(name, size * 2)}
      alt={name}
      onError={() => setErr(true)}
      className="shrink-0 rounded"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

interface LBRow {
  id: string;
  user: string;
  level: number;
  won: number;
}

export function ChatRail() {
  const { userName, level, inventoryValue } = useGame();
  const [mode, setMode] = useState<"chat" | "top">("chat");
  const [msgs, setMsgs] = useState<ChatMsg[]>(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: uid(),
      user: pick(COMMUNITY_USERS),
      level: randInt(1, 42),
      text: pick(CHAT_LINES),
      ts: Date.now() - (14 - i) * 8000,
    }))
  );
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<LBRow[]>(() =>
    Array.from({ length: 14 }, () => ({
      id: uid(),
      user: pick(COMMUNITY_USERS),
      level: randInt(3, 48),
      won: randInt(3200, 156000),
    })).sort((a, b) => b.won - a.won)
  );
  const [online] = useState(() => randInt(1100, 1600));
  const scrollRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        if (!alive.current) return;
        setMsgs((prev) => [
          ...prev.slice(-28),
          { id: uid(), user: botName(), level: randInt(1, 42), text: botLine(), ts: Date.now() },
        ]);
        loop();
      }, randInt(2600, 7000));
    };
    loop();
    const drift = window.setInterval(() => {
      setRows((prev) => {
        const copy = prev.map((r) => ({ ...r }));
        const lucky = pick(copy);
        lucky.won += randInt(120, 900);
        return copy.sort((a, b) => b.won - a.won).slice(0, 14);
      });
    }, 8000);
    return () => {
      alive.current = false;
      clearTimeout(t);
      clearInterval(drift);
    };
  }, []);

  /* yeni mesajda aşağı kaydır */
  useEffect(() => {
    const el = scrollRef.current;
    if (el && mode === "chat") el.scrollTop = el.scrollHeight;
  }, [msgs, mode]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMsgs((prev) => [
      ...prev.slice(-28),
      { id: uid(), user: userName, level, text, ts: Date.now(), me: true },
    ]);
    /* herkes hayran oldu — birkaç bot kısa aralıklarla yazsın */
    const fanCount = randInt(3, 6);
    for (let i = 0; i < fanCount; i++) {
      window.setTimeout(
        () => {
          if (!alive.current) return;
          setMsgs((prev) => [
            ...prev.slice(-28),
            { id: uid(), user: botName(), level: randInt(1, 48), text: pick(ADMIRATION_LINES), ts: Date.now() },
          ]);
        },
        500 + i * randInt(500, 1100)
      );
    }
  }

  const myRank = useMemo(() => 187 + ((userName.length * 7) % 60), [userName]);

  return (
    <aside className="fixed bottom-0 right-0 top-16 z-30 hidden w-[292px] flex-col border-l border-line bg-ink-950/70 backdrop-blur-sm xl:flex">
      {/* sekme */}
      <div className="flex items-center gap-1 border-b border-line p-2">
        <button
          onClick={() => setMode("chat")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition",
            mode === "chat" ? "bg-brand-500/15 text-brand-300" : "text-white/40 hover:text-white/70"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Sohbet
        </button>
        <button
          onClick={() => setMode("top")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition",
            mode === "top" ? "bg-brand-500/15 text-brand-300" : "text-white/40 hover:text-white/70"
          )}
        >
          <Trophy className="h-3.5 w-3.5" /> Liderlik
        </button>
      </div>

      {mode === "chat" ? (
        <>
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-[11px] text-white/40">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <Users className="h-3.5 w-3.5" />
            {online.toLocaleString("tr-TR")} çevrimiçi
          </div>

          <div ref={scrollRef} className="tiny-scroll flex-1 space-y-2.5 overflow-y-auto p-2.5">
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex gap-2", m.me && "flex-row-reverse")}>
                <Avatar name={m.user} />
                <div className={cn("min-w-0 flex-1", m.me && "text-right")}>
                  <div className={cn("flex items-baseline gap-1.5", m.me && "flex-row-reverse")}>
                    <span className={cn("truncate text-[11px] font-semibold", m.me ? "text-brand-300" : "text-white/75")}>
                      {m.user}
                    </span>
                    <span className="shrink-0 rounded bg-ink-600 px-1 text-[9px] font-bold text-white/40">
                      {m.level}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 break-words rounded-lg px-2.5 py-1.5 text-[11px] leading-snug",
                      m.me ? "bg-brand-500/15 text-brand-100" : "bg-ink-800 text-white/70"
                    )}
                  >
                    {m.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 border-t border-line p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Mesaj yaz…"
              maxLength={120}
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-ink-800 px-3 text-xs text-white placeholder:text-white/25 focus:border-brand-500/50 focus:outline-none"
            />
            <button
              onClick={send}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 text-ink-950 transition hover:brightness-110"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="border-b border-line px-3 py-2 text-[11px] font-semibold text-white/40">
            Bu haftanın kazananları
          </div>
          <div className="tiny-scroll flex-1 space-y-1.5 overflow-y-auto p-2.5">
            <AnimatePresence initial={false}>
              {rows.map((r, i) => (
                <motion.div
                  key={r.id}
                  layout
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2",
                    i === 0 ? "border-[#e4ae39]/50 bg-[#e4ae39]/10" : i < 3 ? "border-line bg-ink-800" : "border-transparent"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 text-center font-display text-sm font-black",
                      i === 0 ? "text-[#e4ae39]" : i === 1 ? "text-white/70" : i === 2 ? "text-[#cd7f32]" : "text-white/30"
                    )}
                  >
                    {i < 3 ? <Medal className="mx-auto h-4 w-4" /> : i + 1}
                  </span>
                  <Avatar name={r.user} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[12px] font-semibold text-white/90">{r.user}</span>
                      <span className="rounded bg-ink-600 px-1 text-[9px] font-bold text-white/40">{r.level}</span>
                      {i === 0 && <Crown className="h-3 w-3 text-[#e4ae39]" />}
                    </div>
                    <div className="font-display text-[11px] font-bold text-emerald-400">{fmtMoney(r.won)}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="border-t border-line p-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/5 p-2">
              <span className="w-10 text-center font-display text-sm font-black text-brand-300">#{myRank}</span>
              <Avatar name={userName} size={26} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold text-brand-200">{userName} (Sen)</div>
                <div className="font-display text-[11px] font-bold text-emerald-400">{fmtMoney(inventoryValue)}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
