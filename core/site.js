// Boot: build every section listed in sections/sections.js, in order, then wire the transitions and the shell.
//
// Section contract (sections/<dir>/):
//   section.js     export const id      root gets class "s-<id>"; every style in style.css hangs off it
//                                       also its name in the ~ shell (ls, cd <id>): one short lowercase word, unique
//                  export const title   human-readable name
//                  export const edges   { top, bottom } CSS colours at its top and bottom edges, for the dithered joins
//                  export const bleed   optional, % of a screen height: its background reaches that far past its
//                                       top and bottom, under the joins beside it (root gets --bleed, use it in
//                                       style.css). Those joins are that tall and see-through on its side
//                  export const leadIn  optional block placed just above the section, owned by it: the approach
//                                       { edges, dwell?, mount(el, env) -> instance } dwell: ms to wait at its end
//                                       before the transition (el gets class "s-<id>-leadin", style it in style.css)
//                                       its instance may have onPlayed(): called once the section's transition ran
//                  export async function mount(root, env) -> instance
//                    env = { index, dir, reduced, nav, command }   nav.goTo(n) plays the transition into section n
//                      command(name, { usage, about, run(args, print) }) adds a command to the ~ shell
//                    the replay button is core/replay.js: replayButton(parent, label, onClick)
//                    instance (all optional): onEnter({ via })  the section is now the one on screen
//                                             onLeave()         another section is taking over: pause
//                                             words()           the elements holding its text, dithered out and
//                                                               back in around a language switch (core/lang.js)
//                                             relang()          put the text in the new language; content.js's t
//                                                               (i18next) already reads in it
//   transition.js  export async function play(t), resolves when the target is fully uncovered
//                    t = { ghost, layer, root, section, index, from, via, reduced }
//                    ghost: frozen copy of the screen as it was, fixed, above the live target (clip it, hide it)
//                    layer: empty fixed full-screen box above the ghost for the transition's own drawing
//                    root/section: the target, already parked at the top of the screen underneath
//                    via: 'scroll' | 'jump'
import './viewport.js';                       // --sh first: every section's style sizes itself with it
import list from '../sections/sections.js';
import { createNavigator } from './navigator.js';
import { createShell } from './shell.js';
import { createSeams } from './seam.js';
import { lang, LANGS, langSwitch } from './lang.js';
import { skipSwitch, skipSaved } from './skip.js';
import { playIntro, introRequested, stripIntroParam } from './intro.js';

const site = document.getElementById('site');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// arriving through the mostoslavsky.com redirect (?from=mostoslavsky): its intro plays at once, over the page
// loading underneath. Not for reduced motion, not with "skip transitions" on (index.html's guard agrees)
const intro = introRequested() && !reduced && !skipSaved() ? playIntro() : (stripIntroParam(), null);
history.scrollRestoration = 'manual';
scrollTo(0, 0);

function loadStyle(href) {
  return new Promise(res => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    l.onload = l.onerror = res;
    document.head.appendChild(l);
  });
}

const loaded = await Promise.all(list.map(async (dir, i) => {
  const root = document.createElement('section');   // appended now, so the page order never depends on load order
  root.className = 'section';
  site.appendChild(root);
  const base = new URL(`../sections/${dir}/`, import.meta.url);
  try {
    const [mod, transition] = await Promise.all([
      import(new URL('section.js', base)),
      import(new URL('transition.js', base)),
      loadStyle(new URL('style.css', base)),
    ]);
    root.classList.add(`s-${mod.id}`);
    if (mod.bleed) root.style.setProperty('--bleed', `calc(${mod.bleed} * var(--sh))`);
    let lead = null;
    if (mod.leadIn) {
      lead = document.createElement('div');
      lead.className = `leadin s-${mod.id}-leadin`;
      root.before(lead);
    }
    return { dir, title: mod.title || dir, mod, transition, root, lead, instance: null, mounted: null };
  } catch (e) {
    console.error(`[load ${dir}]`, e);                 // a broken section is left out, the rest of the site still runs
    root.remove();
    return null;
  }
}));
const sections = loaded.filter(Boolean);
sections.forEach((s, i) => { s.index = i + 1; s.root.dataset.index = i + 1; });

// the page top to bottom: lead-ins and sections, then the seams joining them
const flow = sections.flatMap(s => [
  ...(s.lead ? [{ el: s.lead, edges: s.mod.leadIn.edges }] : []),
  { el: s.root, edges: s.mod.edges, bleed: s.mod.bleed || 0 },
]);
let seams = null;
const commands = {};
const command = (name, spec) => { commands[name] = spec; };
const nav = createNavigator(sections, () => [...flow.map(b => b.el), ...(seams ? seams.elements() : [])]);
for (const s of sections) {
  const env = { index: s.index, dir: s.dir, reduced, nav, command };
  s.mounted = Promise.resolve()
    .then(() => s.lead && s.mod.leadIn.mount(s.lead, env))
    .then(lead => { s.leadInstance = lead || {}; })
    .then(() => s.mod.mount(s.root, env))
    .then(inst => { s.instance = inst || {}; })
    .catch(e => { console.error(`[mount ${s.dir}]`, e); s.instance ||= {}; });
}
await Promise.all(sections.map(s => s.mounted));
seams = createSeams(site, flow);
nav.remember();

// top bar: the EN / FR switch in the centre, "skip transitions" at its right end
const bar = document.createElement('div');
bar.className = 'top-bar';
document.body.appendChild(bar);
const swap = langSwitch(nav, sections, bar);
const setSkip = skipSwitch(nav, bar);
command('skip', {
  usage: 'skip [on|off]', about: 'show or set skipping the transitions',
  run: ([arg], print) => {
    const a = arg?.toLowerCase();
    if (a === undefined) { print(`skip: ${nav.skip ? 'on' : 'off'}`); return; }
    if (a !== 'on' && a !== 'off') { print(`skip: expected on or off, got "${arg}"`, 'err'); return; }
    setSkip(a === 'on');
    print(`skip: ${a}`, 'ok');
  },
});
command('lang', {
  usage: 'lang [en|fr]', about: 'show or switch the site language',
  run: async ([arg], print) => {
    if (arg === undefined) { print(`lang: ${lang}`); return; }
    const l = arg.toLowerCase();
    if (!LANGS.includes(l)) { print(`lang: expected ${LANGS.join(' or ')}, got "${arg}"`, 'err'); return; }
    if (l === lang) { print(`lang: already ${l}`); return; }
    if (await swap(l)) print(`lang: ${l}`, 'ok');
    else print('lang: busy (a transition or a switch is running), try again', 'err');
  },
});
command('intro', {
  usage: 'intro', about: 'play the mostoslavsky.com intro (click or any key ends it)',
  run: async (_, print) => {
    if (reduced) { print('intro: off, the browser asks for reduced motion', 'err'); return; }
    print('intro: mostoslavsky -> mostoslavski', 'ok');
    await playIntro();
  },
});
createShell(nav, sections, commands);
window.__site = { nav, sections, goTo: (n, o) => nav.goTo(n, o) };   // console / test access

// #s3 in the address opens straight on section 3, through its transition
const deep = /^#s(\d+)$/.exec(location.hash);
if (deep && +deep[1] > 1) nav.goTo(+deep[1]);
else if (intro) {
  // like under a transition: the landing holds on its first frame, and its own intro starts once uncovered
  const first = sections[0].instance;
  await first.prepare?.();
  await intro;
  first.onEnter?.({ via: 'intro' });
} else sections[0].instance.onEnter?.({ via: 'load' });
