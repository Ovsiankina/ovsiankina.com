// Site language, 'en' or 'fr', through i18next (vendor/i18next.js). Every section's words are an i18next namespace.
// On load: the choice saved by the switch (top centre), else the first of the browser's preferred languages that is
// English or French, else English. Switching rewrites the words in place: every section's text dithers out at once,
// each section puts in the new words (instance.relang), and they dither back in. No reload, nothing replays.
import i18next from './vendor/i18next.js';
import { dissolve } from './dither.js';

export const LANGS = ['en', 'fr'];
const KEY = 'lang';
export const MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400;   // each way, for the words and the switch

function detect() {
  try { const saved = localStorage.getItem(KEY); if (LANGS.includes(saved)) return saved; } catch {}
  for (const l of navigator.languages?.length ? navigator.languages : [navigator.language || '']) {
    const primary = l.split('-')[0].toLowerCase();
    if (LANGS.includes(primary)) return primary;
  }
  return 'en';
}

// Synchronous (initAsync: false, resources inline): the sections read their words while their modules load.
// fallbackLng: a key missing from fr.json is read from en.json, so words that are the same in both live in en.json only.
// escapeValue: false, the words are ours and may hold a little HTML (<em>, <a>, <br>).
i18next.init({
  lng: detect(), fallbackLng: 'en', supportedLngs: LANGS, initAsync: false,
  resources: {}, interpolation: { escapeValue: false },
});

export let lang = i18next.language;          // mirrors i18next, for the ~ shell
document.documentElement.lang = lang;

// content.js: export default translations('<id>', { en, fr }), the section's locales/*.json. Returns i18next's t for that
// namespace. It reads the language current at the time of the call, so a section that calls it again after a switch
// gets the new words. Lists and blocks: t('left', { returnObjects: true }).
export function translations(ns, bundles) {
  for (const [l, res] of Object.entries(bundles)) i18next.addResourceBundle(l, ns, res);
  return i18next.getFixedT(null, ns);
}

// Text outside the sections (the top bar) that follows the language: words() and relang() as in a section's instance.
const extras = [];
export function localized(part) { extras.push(part); }

// The EN / FR switch, centred in the top bar (site.js). It dithers away while a transition plays and comes back after it.
// Returns swap(next): the language change, also used by the ~ shell. Resolves false when refused.
export function langSwitch(nav, sections, bar) {
  const el = document.createElement('div');
  el.className = 'lang-switch';
  el.setAttribute('role', 'group');
  el.innerHTML = LANGS.map(l => `<button type="button" lang="${l}">${l.toUpperCase()}</button>`).join('');
  const mark = l => {
    el.setAttribute('aria-label', l === 'fr' ? 'Langue' : 'Language');
    for (const b of el.children) b.setAttribute('aria-pressed', b.lang === l);
  };
  mark(lang);
  bar.appendChild(el);

  nav.watch(busy => { el.inert = busy; dissolve([el], busy ? 0 : 1, MS); });

  const words = () => [...sections.flatMap(s => s.instance?.words?.() ?? []), ...extras.flatMap(x => x.words())];
  let swapping = false;
  async function swap(next) {
    if (!LANGS.includes(next) || next === lang || swapping || nav.busy) return false;
    swapping = true;
    mark(next);
    try {
      await dissolve(words(), 0, MS);
      await i18next.changeLanguage(next);
      lang = i18next.language;
      document.documentElement.lang = lang;
      try { localStorage.setItem(KEY, lang); } catch {}
      for (const s of sections) {
        try { s.instance?.relang?.(); } catch (e) { console.error(`[relang ${s.dir}]`, e); }
      }
      for (const x of extras) x.relang();
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
