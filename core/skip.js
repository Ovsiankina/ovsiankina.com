// "Skip transitions", top right of the screen, on the line of the EN / FR switch, for visitors who have already seen the
// animations. Off: dark, like the unselected language. On: lit, like the selected one. Opt-in only: every visit
// starts with it off, the choice is never saved.
// While on, the navigator plays every transition as its short reduced-motion cut and no lead-in dwells.
// Returns set(on), also used by the ~ shell.
import { dissolve } from './dither.js';
import { lang, MS, localized } from './lang.js';

const WORDS = { en: ['Skip transitions', 'Skip'], fr: ['Passer les transitions', 'Passer'] };   // [wide, phones]

export function skipSwitch(nav, bar) {
  const el = document.createElement('div');
  el.className = 'skip-switch';
  el.innerHTML = '<button type="button"><span class="full"></span><span class="short"></span></button>';
  const b = el.firstChild, [full, short] = b.children;
  const label = () => {
    const w = WORDS[lang] || WORDS.en;
    full.textContent = w[0]; short.textContent = w[1];
    b.setAttribute('aria-label', w[0]);
  };
  label();
  localized({ words: () => [b], relang: label });   // its words dither out and back in with every other text

  const set = on => {
    nav.skip = on;
    b.setAttribute('aria-pressed', nav.skip);
  };
  set(false);
  bar.appendChild(el);

  nav.watch(busy => { el.inert = busy; dissolve([el], busy ? 0 : 1, MS); });
  b.addEventListener('click', () => set(!nav.skip));
  return set;
}
