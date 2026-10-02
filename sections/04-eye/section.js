// The midnight swirl page: the first hobby / artistic section, reached through the eye. Not finished yet: the swirl
// (swirl.js, from sections/balanki.html) under a work-in-progress tag, arrows down to the next section, and a replay
// button that plays the eye transition again.
// Its lead-in is the end screen of the original: purple, the horizon glow growing as it scrolls in. Once the
// transition has played it folds into a short purple break (no glow) for the rest of the visit: the rupture
// is only ever seen in context, walking down into it or through the replay button.
import c from './content.js';
import config from './config.js';
import { createGlow, rgb01 } from './glow.js';
import { createSwirl } from './swirl.js';
import { replayButton } from '../../core/replay.js';

export const id = 'eye';
export const title = 'Eye';
export const edges = { top: config.colors.night, bottom: config.colors.night };

const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const leadIn = {
  edges: { top: config.leadIn.bg, bottom: config.leadIn.bg },
  dwell: config.leadIn.dwell,
  mount(el) {
    el.style.setProperty('--leadin-bg', config.leadIn.bg);
    el.style.setProperty('--leadin-folded', config.leadIn.folded);
    let glow = null, io = null, raf = 0, visible = false;

    // core calls it once the transition has run, just before parking the page on the swirl section
    const onPlayed = () => {
      el.classList.add('folded');
      visible = false; cancelAnimationFrame(raf); raf = 0;
      io?.disconnect(); io = null;
      if (glow) {
        glow.canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();   // free it, it never comes back
        glow.canvas.remove(); glow = null;
      }
    };

    try { glow = createGlow(); } catch (e) { console.error('[eye lead-in] glow', e); }   // no WebGL: plain purple
    if (!glow) return { onPlayed };
    glow.canvas.classList.add('glow');
    glow.canvas.setAttribute('aria-hidden', 'true');
    el.prepend(glow.canvas);
    const base = rgb01(config.leadIn.bg);

    // driven exactly like the original: progress = how far the screen has scrolled into it
    function frame(now) {
      raf = 0;
      if (!visible || !glow) return;
      const time = now / 1000;
      const p = clamp01(1 - el.getBoundingClientRect().top / innerHeight);
      if (p > 0) {
        const e = smooth(0.25, 0.95, p);
        const flick = p > 0.97 ? 0.93 + 0.07 * Math.sin(time * 23) * Math.sin(time * 7.3) : 1;
        glow.draw(time, e * flick, smooth(0.35, 1, p), 0, base);
      } else glow.draw(time, 0, 0, 0, base);
      raf = requestAnimationFrame(frame);
    }
    io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(el);
    glow.draw(0, 0, 0, 0, base);
    return { onPlayed };
  },
};

// pixel-art chevron, 9 x 5 cells; drawn as rects so it stays crisp at any scale
const CHEVRON = ['##.....##', '.##...##.', '..##.##..', '...###...', '....#....'];
const chevron = () => `<svg class="chev" viewBox="0 0 9 5" shape-rendering="crispEdges" aria-hidden="true">${
  CHEVRON.flatMap((row, y) => [...row].map((c, x) => c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '')).join('')}</svg>`;

export async function mount(root, env) {
  root.innerHTML = `
    <canvas class="swirl" aria-hidden="true"></canvas>
    <p class="wip">${c.wip}</p>
    <button class="next" type="button" aria-label="${c.nextLabel}">
      <span class="next-label">${c.next}</span>
      ${chevron()}${chevron()}${chevron()}
    </button>`;
  const canvas = root.querySelector('.swirl');
  let swirl = null;
  try { swirl = createSwirl(canvas, { reduced: env.reduced }); } catch (e) { console.error('[eye] swirl', e); }   // no WebGL: plain night

  root.querySelector('.next').addEventListener('click', () => env.nav.goTo(env.index + 1));
  replayButton(root, c.replay, () => env.nav.goTo(env.index));
  root.addEventListener('animationend', () => root.classList.remove('shake'));
  if (!swirl) return {};

  canvas.addEventListener('click', () => swirl.replay());   // click or tap the swirl to replay its bloom
  new ResizeObserver(() => swirl.draw()).observe(canvas);

  // scrolled back onto (or into without the eye, e.g. up from a deep link further down): carry on, or start if
  // never seen. Never while a transition is running: the eye's arrival starts it in onEnter, once the white has shut
  let entered = false;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) swirl.pause();
    else if (entered) swirl.resume();
    else if (!env.nav.busy) { entered = true; swirl.start(); }
  }, { rootMargin: '-1px 0px' }).observe(root);

  if (config.swirl.tuningPanel) {
    const { mountTuning } = await import('./tuning.js');
    mountTuning(root, swirl);
  }

  return {
    onEnter: () => { entered = true; swirl.start(); },   // every arrival through the eye blooms from the night
    onLeave: () => swirl.pause(),
  };
}
