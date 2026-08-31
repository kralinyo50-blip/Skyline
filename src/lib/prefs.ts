/* Kullanıcı tercihleri — sadece bu cihazda (localStorage) */

export interface Prefs {
  /** genel ses seviyesi 0–100 */
  sfx: number;
  /** konfeti/partikül efektleri */
  effects: boolean;
  /** ekran sarsıntısı (kazanma vb.) */
  shake: boolean;
  /** kasalarda hızlı açılış animasyonu */
  fastReels: boolean;
}

const KEY = "skyline:prefs";

const DEFAULTS: Prefs = { sfx: 80, effects: true, shake: true, fastReels: false };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULTS, ...p };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("skyline:prefs"));
  } catch {
    /* yoksay */
  }
}

export const PREFS_EVENT = "skyline:prefs";
