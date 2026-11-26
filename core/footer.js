// The footer under the last section (index.html): the other spelling of the name, linked to mostoslavsky.com.
// Its English words are in index.html, so they are in the page before any script runs; it stays invisible
// (.pending) until the sections are in, or it would sit alone at the top of the empty page for a moment.
// Follows the language like the top bar: its words dither out and back in with every other text.
import { lang, localized } from './lang.js';

const WORDS = { en: 'Sometimes spelled Mostoslavsky:', fr: 'Parfois écrit Mostoslavsky :' };

export function footer() {
  const el = document.querySelector('.site-footer');
  if (!el) return;
  const p = el.querySelector('p'), words = el.querySelector('.words');
  const label = () => { words.textContent = WORDS[lang] || WORDS.en; };
  label();
  localized({ words: () => [p], relang: label });
  el.classList.remove('pending');
}
