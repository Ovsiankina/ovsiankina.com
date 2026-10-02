// Site language, 'en' or 'fr'.
// On load: the choice saved by the switch (top centre), else the first of the browser's preferred languages that is
// English or French, else English. Switching rewrites the words in place: every section's text dithers out at once,
// each section puts in the new words (instance.relang), and they dither back in. No reload, nothing replays.
import { dissolve } from './dither.js';

export const LANGS = ['en', 'fr'];
const KEY = 'lang';
const MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400;   // each way, for the words and the switch

function detect() {
  try { const saved = localStorage.getItem(KEY); if (LANGS.includes(saved)) return saved; } catch {}
  for (const l of navigator.languages?.length ? navigator.languages : [navigator.language || '']) {
    const primary = l.split('-')[0].toLowerCase();
    if (LANGS.includes(primary)) return primary;
  }
  return 'en';
}

export let lang = detect();
document.documentElement.lang = lang;

// content.js: export default pick({ en, fr }, shared). Every read goes to the language current at the time of
// reading, so a section that reads its content again after a switch gets the new words. shared: the same in both.
export const pick = (texts, shared = {}) =>
  new Proxy(shared, { get: (s, k) => (k in s ? s[k] : (texts[lang] ?? texts.en)[k]) });

// The EN / FR switch, fixed top centre. It dithers away while a transition plays and comes back after it.
// Returns swap(next): the language change, also used by the ~ shell. Resolves false when refused.
export function langSwitch(nav, sections) {
  const el = document.createElement('div');
  el.className = 'lang-switch';
  el.setAttribute('role', 'group');
  el.innerHTML = LANGS.map(l => `<button type="button" lang="${l}">${l.toUpperCase()}</button>`).join('');
  const mark = l => {
    el.setAttribute('aria-label', l === 'fr' ? 'Langue' : 'Language');
    for (const b of el.children) b.setAttribute('aria-pressed', b.lang === l);
  };
  mark(lang);
  document.body.appendChild(el);

  nav.watch(busy => { el.inert = busy; dissolve([el], busy ? 0 : 1, MS); });

  const words = () => sections.flatMap(s => s.instance?.words?.() ?? []);
  let swapping = false;
  async function swap(next) {
    if (!LANGS.includes(next) || next === lang || swapping || nav.busy) return false;
    swapping = true;
    mark(next);
    try {
      await dissolve(words(), 0, MS);
      lang = next;
      document.documentElement.lang = lang;
      try { localStorage.setItem(KEY, lang); } catch {}
      for (const s of sections) {
        try { s.instance?.relang?.(); } catch (e) { console.error(`[relang ${s.dir}]`, e); }
      }
      const now = words();                     // a section may have swapped an element: start them all hidden
      dissolve(now, 0, 0);
      await dissolve(now, 1, MS);
    } finally { swapping = false; }
    return true;
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) swap(b.lang);
  });
  return swap;
}
