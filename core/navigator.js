// Moving between sections. A transition belongs to the section it leads INTO and never knows where it
// started: the screen is frozen into a copy (core/freeze.js), the page jumps to the target under that
// copy, and the target's transition plays over it. Nothing scrolls until it is over.
// Each transition plays once per visit: scrolling back up to look for something never gets blocked by it again.
import { freeze } from './freeze.js';

const KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar']);
const typing = e => e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]');
const WATCHDOG = 20000;   // ms: a transition that never resolves (stalled asset, bug) is cut so the page never stays locked

export function createNavigator(sections, blocks) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;

  // ---------- scroll lock ----------
  // The scrollbar stays (hiding it would reflow every section under the cover); input is blocked instead,
  // and a dragged scrollbar is pulled back.
  let locked = false, lockY = 0;
  const block = e => { if (locked) e.preventDefault(); };
  addEventListener('wheel', block, { passive: false });
  addEventListener('touchmove', block, { passive: false });
  addEventListener('keydown', e => { if (locked && KEYS.has(e.key) && !typing(e)) e.preventDefault(); });
  addEventListener('scroll', () => { if (locked && scrollY !== lockY) jump(lockY); }, { passive: true });
  const lock = on => { locked = on; lockY = scrollY; };

  const absTop = el => el.offsetTop;           // layout position: ignores a shake or any transform on the root
  // where walking down into a section begins: the top of the dithered join above it, if it has one
  const line = s => { const p = s.root.previousElementSibling; return p && p.classList.contains('seam') ? p : s.root; };
  const jump = y => scrollTo({ top: y, left: 0, behavior: 'instant' });

  // the section holding the middle of the screen
  function here() {
    const mid = innerHeight / 2;
    return sections.find(s => { const r = s.root.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || sections[0];
  }

  // n is 1-based. via: 'scroll' (walked into it), 'jump' (shell, buttons). Resolves false if refused.
  async function goTo(n, { via = 'jump' } = {}) {
    const s = sections[n - 1];
    if (!s || busy) return false;
    busy = true;
    await s.mounted;

    // walking down: freeze what is above the join flush with the bottom of the screen, as it was left
    if (via === 'scroll') jump(absTop(line(s)) - innerHeight);
    const ghost = freeze(blocks());
    const layer = document.createElement('div');
    layer.className = 'tx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    const from = here();
    for (const x of sections) if (x !== s) x.instance?.onLeave?.();
    jump(absTop(s.root));                      // under the cover, park the page on the target
    lock(true);

    played.add(n);
    let dog;
    try {
      await Promise.race([
        s.transition.play({ ghost, layer, root: s.root, section: s.instance, index: n, via, reduced, from: from.index }),
        new Promise(res => { dog = setTimeout(() => { console.warn(`[transition ${s.dir}] cut after ${WATCHDOG} ms`); res(); }, WATCHDOG); }),
      ]);
    } catch (e) { console.error(`[transition ${s.dir}]`, e); }
    clearTimeout(dog);

    s.leadInstance?.onPlayed?.();              // a lead-in may fold away once its transition has been seen
    lock(false);
    jump(absTop(s.root));                      // in case a resize or a folded lead-in moved things
    ghost.remove(); layer.remove();
    remember();
    lastY = scrollY;
    busy = false;
    s.instance?.onEnter?.({ via });
    return true;
  }

  // ---------- walking down into a section plays its transition, the first time only ----------
  // Fires when a section's line (its top, or the join above it) crosses the bottom of the screen going down. If its lead-in asks for a dwell,
  // the page first stops flush at the end of the lead-in, as if it were the end of the page, and waits.
  const played = new Set([1]);                 // the landing plays its own intro on load
  let tops = [], lastY = scrollY, waiting = false;
  const remember = () => { tops = sections.map(x => line(x).getBoundingClientRect().top); };
  addEventListener('scroll', () => {
    const y = scrollY, down = y > lastY, was = tops;
    lastY = y;
    remember();
    if (busy || waiting || !down) return;
    let hit = -1;                              // the deepest one crossed (a fling or End can cross several)
    for (let i = 1; i < sections.length; i++) if (!played.has(i + 1) && was[i] >= innerHeight - 1 && tops[i] < innerHeight - 1) hit = i;
    if (hit < 0) return;
    const s = sections[hit], dwell = s.mod.leadIn?.dwell || 0;
    if (!dwell) { goTo(hit + 1, { via: 'scroll' }); return; }
    waiting = true;
    jump(absTop(line(s)) - innerHeight);
    lock(true);
    setTimeout(() => { waiting = false; lock(false); goTo(hit + 1, { via: 'scroll' }); }, dwell);
  }, { passive: true });

  return {
    goTo,
    remember,
    get busy() { return busy; },
    get current() { return here().index; },
  };
}
