import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { findSupportAnswer, SUPPORT_ANSWERS } from "../data/support";
import { cn } from "../utils/cn";

interface Msg {
  id: number;
  from: "bot" | "me";
  text: string;
}

let seq = 1;

const WELCOME =
  "Merhaba! 👋 Ben Skyline Asistan. Sana siteyi tanıtabilir, sorularını cevaplayabilirim. Aşağıdaki sorulardan birine tıkla ya da kendi sorunu yaz.";

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, typing, open]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMsgs((m) => [...m, { id: seq++, from: "me", text: q }]);
    setInput("");
    setTyping(true);
    const ans = findSupportAnswer(q);
    timerRef.current = window.setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { id: seq++, from: "bot", text: ans.a }]);
    }, 550 + Math.min(500, ans.a.length * 2));
  };

  return (
    <>
      {/* sağ alt sabit buton */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!msgs.length) setMsgs([{ id: seq++, from: "bot", text: WELCOME }]);
        }}
        aria-label="AI canlı destek"
        className="fixed bottom-4 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-sky-400/40 bg-gradient-to-b from-sky-400 to-sky-600 text-ink-950 shadow-[0_8px_30px_rgba(56,189,248,0.35)] transition hover:brightness-110"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-ink-950">
            AI
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 right-4 z-[70] flex h-[min(72vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-sky-400/25 bg-ink-900/95 shadow-2xl backdrop-blur"
          >
            {/* başlık */}
            <div className="flex items-center gap-2.5 border-b border-line bg-gradient-to-r from-sky-400/15 to-transparent px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/20">
                <Bot className="h-5 w-5 text-sky-300" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-black text-white">Skyline Asistan</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Çevrimiçi · site içi AI yardımcı
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>

            {/* mesajlar */}
            <div ref={chatRef} className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
              {msgs.map((m) => (
                <div key={m.id} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      m.from === "me"
                        ? "rounded-br-sm bg-gradient-to-b from-sky-400 to-sky-600 font-medium text-ink-950"
                        : "rounded-bl-sm border border-line bg-ink-800 text-white/85"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-ink-800 px-3 py-2.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-300 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-300 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-300 [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* hazır sorular */}
            {msgs.length <= 1 && (
              <div className="max-h-28 overflow-y-auto border-t border-line px-3 py-2">
                <div className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-white/35">
                  Sık sorulanlar
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORT_ANSWERS.map((s) => (
                    <button
                      key={s.q}
                      onClick={() => ask(s.q)}
                      className="rounded-full border border-sky-400/25 bg-sky-400/8 px-2.5 py-1 text-[10px] font-bold text-sky-200/90 transition hover:bg-sky-400/20"
                    >
                      {s.q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* giriş */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2 border-t border-line px-3 py-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Sorunu yaz… (örn. VIP nasıl alınır)"
                className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-ink-800 px-3 text-xs text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Gönder"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 text-ink-950 transition hover:brightness-110"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
