// A screen height that holds still while scrolling. Phone browsers grow and shrink the viewport as their
// toolbars slide in and out (and an iOS browser other than Safari, Brave included, does it to vh, svh and dvh
// alike). Anything sized to it would re-lay the whole page mid-fling, and WebKit has no scroll anchoring to
// hide the shift: the page jerks by the sum of every screen-tall block above. So layout reads this instead:
//   CSS   var(--sh)        1 % of the screen height, in px: calc(100 * var(--sh)) is one screen
//   JS    screenH()        the screen height, in px
//         onScreen(f)      f() after it, or the width, really changed: never on a toolbar slide
//         sh('72vh')       a config length in vh turned into the stable unit
//         settle()         core/navigator.js, under a transition's cover: apply a pending growth (below)
// It is the screen with the toolbars away (the largest seen at this width), so a screen-tall block always
// covers the screen. A mouse-driven device follows every resize. A touch device follows a change of width
// (rotation) or of more than a quarter of the height (split screen) at once; when the toolbars first slide
// away and the screen grows, the growth waits for the next transition, which re-lays the page unseen.

const touch = matchMedia('(pointer: coarse)').matches;
const BIG = 0.25;                              // a bigger height change is a real one, not toolbars
const fns = [];
const width = () => document.documentElement.clientWidth;   // not innerWidth: a pinch zoom changes that
const zoomed = () => (visualViewport?.scale ?? 1) > 1.01;

// 100lvh is the toolbars-away height where the browser knows it (Safari); elsewhere it is just the screen
function large() {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;top:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
  document.documentElement.appendChild(d);
  const h = d.offsetHeight;
  d.remove();
  return h;
}

let W = width(), H = 0, want = touch ? Math.max(innerHeight, large()) : innerHeight;
const apply = () => {
  if (want === H) return false;
  H = want;
  document.documentElement.style.setProperty('--sh', H / 100 + 'px');
  return true;
};
const fire = () => { for (const f of fns) f(); };
apply();

let rz;
addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    if (zoomed()) return;
    const w = width(), h = innerHeight;
    if (!touch || w !== W || Math.abs(h - want) > BIG * want) {
      W = w; want = touch ? Math.max(h, large()) : h;
      if (apply()) fire();
    } else if (h > want) want = h;             // the toolbars slid away: grow at the next settle()
  }, 120);
});

export const screenH = () => H;
export const onScreen = f => { fns.push(f); };
export const sh = len => len.replace(/(-?[\d.]+)[sdl]?vh/g, 'calc($1 * var(--sh))');
export function settle() { if (apply()) fire(); }
