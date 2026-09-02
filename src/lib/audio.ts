/* Küçük WebAudio ses motoru — dosya gerektirmez */

import { loadPrefs, PREFS_EVENT } from "./prefs";

let ctx: AudioContext | null = null;
let muted = false;
let volume = Math.max(0, Math.min(1, loadPrefs().sfx / 100));

if (typeof window !== "undefined") {
  window.addEventListener(PREFS_EVENT, () => {
    volume = Math.max(0, Math.min(1, loadPrefs().sfx / 100));
  });
}

export function setAudioMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  when = 0,
  slideTo?: number
) {
  if (muted || volume <= 0) return;
  const c = ac();
  if (!c) return;
  try {
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const gv = gain * volume;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gv, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    /* sessiz geç */
  }
}

/** Rulet çubuğu tıkırtısı. progress 0..1 → sona doğru tizleşir */
export function tick(progress = 0) {
  blip(820 + progress * 480, 0.035, "square", 0.045);
}

export function click() {
  blip(480, 0.05, "triangle", 0.06);
}

export function hoverPop() {
  blip(300, 0.04, "sine", 0.03);
}

export function reelStart() {
  blip(160, 0.22, "sawtooth", 0.05, 0, 420);
  blip(320, 0.16, "triangle", 0.05, 0.03, 640);
}

function fanfare(notes: number[], step: number, dur: number, type: OscillatorType, gain: number) {
  notes.forEach((n, i) => blip(n, dur, type, gain, i * step));
}

export function winSound(big: boolean) {
  if (big) {
    fanfare([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.085, 0.34, "triangle", 0.11);
    fanfare([261.6, 329.6, 392, 523.25], 0.085, 0.4, "sine", 0.07);
    blip(2093, 0.5, "sine", 0.05, 0.42, 1568);
  } else {
    fanfare([392, 523.25, 659.25], 0.09, 0.22, "triangle", 0.09);
  }
}

export function goldWin() {
  fanfare([523.25, 622.25, 783.99, 1046.5, 1244.5, 1568, 2093], 0.09, 0.5, "triangle", 0.12);
  fanfare([523.25, 659.25, 880], 0.05, 0.9, "sine", 0.06, );
  blip(104.6, 0.9, "sine", 0.14, 0.05);
}

export function loseSound() {
  blip(196, 0.28, "sawtooth", 0.09, 0, 92);
  blip(130, 0.42, "square", 0.05, 0.1, 64);
}

export function coinDing() {
  blip(1245, 0.12, "sine", 0.09);
  blip(1867, 0.2, "sine", 0.07, 0.07);
}

export function spinWhoosh() {
  blip(220, 0.5, "sawtooth", 0.035, 0, 90);
}
