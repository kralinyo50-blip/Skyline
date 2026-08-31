import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Medal, MessageSquare, Send, Trophy, Users, X } from "lucide-react";
import {
  ADMIRATION_LINES,
  BOT_NAMES,
  CHAT_ANSWERS,
  CHAT_CALM,
  CHAT_QUESTIONS,
  CHAT_REPLIES,
  eventReactionText,
  makeMentionLine,
  makeUserMentionLine,
  personaLine,
  replyToMessage,
  timeAwareLine,
} from "../data/fakers";
import { mcHead } from "../config";
import { fmtMoney } from "../data/skins";
import { pick, randInt, uid } from "../lib/rng";
import { levelFromSpent, useGame } from "../store/Game";
import { onLive } from "../store/liveEvents";
import { normKey } from "../store/db";
import { cn } from "../utils/cn";

interface ChatMsg {
  id: string;
  user: string;
  level: number;
  text: string;
  ts: number;
  me?: boolean;
  admin?: boolean;
}

const AV_COLORS = ["#f98e1d", "#4b69ff", "#d32ce6", "#2fd673", "#53c8ff", "#eb4b4b", "#8847ff"];

function randomBot(): string {
  return pick(BOT_NAMES);
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

/* @mention'ları turuncu vurgula */
function ChatText({ text }: { text: string }) {
  const parts = text.split(/(@\S+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span key={i} className="font-semibold text-amber-300">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

interface LBRow {
  id: string;
  user: string;
  level: number;
  won: number;
}

export function ChatRail() {
  const { userName, inventoryValue, chat, sendChat, isAdmin, clearChat, user, allDeposits } = useGame();
  const [mode, setMode] = useState<"chat" | "top">("chat");
  const [msgs, setMsgs] = useState<ChatMsg[]>(() =>
    Array.from({ length: 32 }, (_, i) => {
      const who = randomBot();
      return {
        id: uid(),
        user: who,
        level: randInt(1, 52),
        text: personaLine(who),
        ts: Date.now() - (32 - i) * 5200,
      };
    })
  );
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState<string | null>(null);
  const [rows, setRows] = useState<LBRow[]>(() =>
    Array.from({ length: 14 }, () => ({
      id: uid(),
      user: randomBot(),
      level: randInt(3, 48),
      won: randInt(3200, 156000),
    })).sort((a, b) => b.won - a.won)
  );
  const [surge, setSurge] = useState<{ user: string; rank: number; ts: number } | null>(null);
  const [online] = useState(() => randInt(3200, 4600));
  const scrollRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const timers = useRef<number[]>([]);
  const lastLevelRef = useRef<number | null>(null);
  const lastReactAt = useRef<Record<string, number>>({});
  const seenDeposits = useRef<Set<string>>(new Set());

  const pushMsg = (userName: string, text: string) => {
    if (!alive.current) return;
    setTyping(null);
    setMsgs((prev) => [
      ...prev.slice(-72),
      { id: uid(), user: userName, level: randInt(1, 52), text, ts: Date.now() },
    ]);
  };

  /* gecikmeli bot mesajı — mesajdan hemen önce "X yazıyor..." göster */
  const saySoon = (text: string, delay: number, speaker?: string) => {
    const who = speaker ?? randomBot();
    if (delay > 800) timers.current.push(window.setTimeout(() => setTyping(who), delay - 650));
    timers.current.push(window.setTimeout(() => pushMsg(who, text), delay));
  };

  /* olay tepkilerini aşırıya kaçmadan yay */
  const reactSoon = (key: string, text: string, minGap = 18000) => {
    const now = Date.now();
    if (now - (lastReactAt.current[key] ?? 0) < minGap) return;
    lastReactAt.current[key] = now;
    saySoon(text, randInt(800, 2200));
  };

  useEffect(() => {
    alive.current = true;
    timers.current = [];
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        if (!alive.current) return;

        /* --- soru-cevap patlaması: bir bot sorar, birkaçı cevaplar --- */
        if (Math.random() < 0.1) {
          pushMsg(randomBot(), pick(CHAT_QUESTIONS));
          const n = randInt(3, 4);
          for (let i = 0; i < n; i++) saySoon(pick(CHAT_ANSWERS), 700 + i * randInt(500, 900));
          loop();
          return;
        }

        /* --- ana mesaj: kişilik / zaman / mention --- */
        const speaker = randomBot();
        const roll = Math.random();
        const line = roll < 0.12 ? makeMentionLine(speaker) : roll < 0.2 ? timeAwareLine() : personaLine(speaker);
        pushMsg(speaker, line);

        /* %65 ihtimalle diğer bot tepkili cevap verir; %30'u karşıt görüş */
        if (Math.random() < 0.65) {
          const r = replyToMessage(line);
          saySoon(r.text, randInt(600, 2200));
          if (r.countered) {
            /* tartışmaya %50 ihtimalle üçüncü bot sakinleştirici yorum yapar */
            if (Math.random() < 0.5) saySoon(pick(CHAT_CALM), randInt(1600, 3600));
          } else if (Math.random() < 0.4) {
            saySoon(pick(CHAT_REPLIES), randInt(900, 2400));
          }
        }
        /* %25 ihtimalle başka bot ayrı konu açar */
        if (Math.random() < 0.25) pushMsg(randomBot(), personaLine(randomBot()));
        loop();
      }, randInt(1100, 3200));
    };
    loop();

    /* liderlik — ara sıra büyük sıçrama + "yükseldi" uyarısı */
    const drift = window.setInterval(() => {
      setRows((prev) => {
        const copy = prev.map((r) => ({ ...r }));
        const lucky = pick(copy);
        const big = Math.random() < 0.3;
        lucky.won += big ? randInt(4000, 42000) : randInt(120, 900);
        const sorted = copy.sort((a, b) => b.won - a.won).slice(0, 14);
        if (big) {
          const rank = sorted.findIndex((r) => r.id === lucky.id) + 1;
          setSurge({ user: lucky.user, rank, ts: Date.now() });
          timers.current.push(window.setTimeout(() => setSurge(null), 4200));
        }
        return sorted;
      });
    }, 8000);

    return () => {
      alive.current = false;
      clearTimeout(t);
      clearInterval(drift);
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    };
  }, []);

  /* ---------- oyuncu olayları → sohbet tepkileri ---------- */
  useEffect(() => {
    const off = onLive((e) => {
      if (e.kind !== "caseWin") return;
      const isMe = e.user === userName;
      const text = eventReactionText(
        isMe ? { kind: "caseWinMe", user: e.user, item: e.item } : { kind: "caseWin", item: e.item }
      );
      reactSoon("caseWin", text, isMe ? 12000 : 30000);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  /* seviye atlayınca botlar kutlar */
  useEffect(() => {
    if (!user) return;
    const lvl = levelFromSpent(user.stats.spent);
    if (lastLevelRef.current !== null && lvl > lastLevelRef.current) {
      reactSoon("levelUp", eventReactionText({ kind: "levelUp", user: user.name, level: lvl }), 30000);
    }
    lastLevelRef.current = lvl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.stats.spent]);

  /* yeni onaylanmış yatırma/çekim → botlar fısıldar */
  useEffect(() => {
    if (!user) return;
    const fresh = (allDeposits ?? []).find(
      (d) =>
        d.userKey === user.key &&
        d.status === "approved" &&
        d.ts > Date.now() - 40000 &&
        !seenDeposits.current.has(d.id)
    );
    if (fresh) {
      seenDeposits.current.add(fresh.id);
      reactSoon("deposit", eventReactionText({ kind: "deposit", user: user.name }), 45000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDeposits]);

  /* yeni mesajda aşağı kaydır */
  useEffect(() => {
    const el = scrollRef.current;
    if (el && mode === "chat") el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, chat, mode]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const res = sendChat(text);
    if (!res.ok) return;
    setInput("");
    /* botlar kullanıcıya doğal tepki verir: %40 mention, %35 tema cevabı, %25 yorum */
    const fanCount = randInt(2, 4);
    for (let i = 0; i < fanCount; i++) {
      window.setTimeout(() => {
        if (!alive.current) return;
        const roll = Math.random();
        const t =
          roll < 0.4
            ? makeUserMentionLine(userName)
            : roll < 0.75
              ? replyToMessage(text).text
              : pick(ADMIRATION_LINES);
        saySoon(t, randInt(400, 900) + i * randInt(500, 1100));
      }, 300 + i * randInt(400, 900));
    }
  }

  /* global (tüm cihazlar) + yerel bot mesajlarını birleştir */
  const merged = useMemo(() => {
    const global: ChatMsg[] = (chat ?? []).map((m) => ({
      id: m.id,
      user: m.user,
      level: m.level,
      text: m.text,
      ts: m.ts,
      admin: m.admin,
      me: normKey(m.key) === normKey(userName),
    }));
    return [...msgs, ...global].sort((a, b) => a.ts - b.ts).slice(-90);
  }, [msgs, chat, userName]);

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
            {merged.map((m) => (
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
                    {m.admin && (
                      <span className="shrink-0 rounded bg-brand-500/25 px-1 text-[8px] font-black uppercase text-brand-300">
                        Admin
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 break-words rounded-lg px-2.5 py-1.5 text-[11px] leading-snug",
                      m.me ? "bg-brand-500/15 text-brand-100" : "bg-ink-800 text-white/70"
                    )}
                  >
                    <ChatText text={m.text} />
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* "X yazıyor..." göstergesi */}
          <div className="flex h-5 shrink-0 items-center px-3 text-[10px] text-white/40">
            {typing ? (
              <span className="animate-pulse">
                <span className="font-semibold text-white/65">{typing}</span> yazıyor…
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 border-t border-line p-2">
            {(chat?.length ?? 0) > 0 && (
              <span className="hidden shrink-0 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-1 text-[8px] font-black uppercase text-emerald-400 sm:flex">
                <span className="live-dot h-1 w-1 rounded-full bg-emerald-400" />
                Global
              </span>
            )}
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
            {isAdmin && (chat?.length ?? 0) > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("Tüm sohbeti temizle? Bu işlem tüm cihazlara yayılır.")) clearChat();
                }}
                title="Sohbeti temizle (admin)"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-lose/40 bg-lose/10 text-lose transition hover:bg-lose/20"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="border-b border-line px-3 py-2 text-[11px] font-semibold text-white/40">
            Bu haftanın kazananları
          </div>
          <div className="tiny-scroll flex-1 overflow-y-auto p-2.5">
            <AnimatePresence initial={false}>
              {surge && (
                <motion.div
                  key={surge.ts}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-2.5 py-1.5 text-[10px] font-bold text-brand-300"
                >
                  🔥 {surge.user} {surge.rank}. sıraya yükseldi
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {rows.map((r, i) => (
                  <motion.div
                    key={r.id}
                    layout
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2",
                      surge?.user === r.user
                        ? "border-brand-500/40 bg-brand-500/5"
                        : i === 0
                          ? "border-[#e4ae39]/50 bg-[#e4ae39]/10"
                          : i < 3
                            ? "border-line bg-ink-800"
                            : "border-transparent"
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
