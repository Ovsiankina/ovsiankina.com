// Moving between sections. A transition belongs to the section it leads INTO and never knows where it
// started: the screen is frozen into a copy (core/freeze.js), the page jumps to the target under that
// copy, and the target's transition plays over it. Nothing scrolls until it is over.
// Each transition plays once per visit: scrolling back up to look for something never gets blocked by it again.
import { freeze } from './freeze.js';
import { settle } from './viewport.js';

const KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar']);
const typing = e => e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]');
const WATCHDOG = 20000;   // ms: a transition that never resolves (stalled asset, bug) is cut so the page never stays locked

export function createNavigator(sections, blocks) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;
  const watchers = [];
  const setBusy = on => { busy = on; for (const f of watchers) f(on); };

  // ---------- scroll lock ----------
  // The page itself stops being scrollable (html.locked: overflow hidden, see core/base.css): that is what
  // stops a finger already dragging and a fling already running, which no preventDefault can cancel.
  // scrollbar-gutter keeps the scrollbar's room, so nothing reflows under the cover. Input is still blocked
  // and a dragged scrollbar pulled back, as a safety net. The non-passive listeners exist only while locked:
  // left on, they make every touch scroll wait for the main thread.
  let locked = false, lockY = 0;
  const block = e => e.preventDefault();
  const keys = e => { if (KEYS.has(e.key) && !typing(e)) e.preventDefault(); };
  addEventListener('scroll', () => { if (locked && scrollY !== lockY) jump(lockY); }, { passive: true });
  const lock = on => {
    if (on === locked) { lockY = scrollY; return; }
    locked = on; lockY = scrollY;
    document.documentElement.classList.toggle('locked', on);
    const f = on ? addEventListener : removeEventListener;
    f('wheel', block, { passive: false });
    f('touchmove', block, { passive: false });
    f('keydown', keys);
  };

  const absTop = el => el.offsetTop;           // layout position: ignores a shake or any transform on the root
  // where walking down into a section begins: the top of the dithered join above it, if it has one
  const line = s => { const p = s.root.previousElementSibling; return p && p.classList.contains('seam') ? p : s.root; };
  // while locked, the place jumped to becomes the place held
  const jump = y => { scrollTo({ top: y, left: 0, behavior: 'instant' }); if (locked) lockY = scrollY; };

  // the section holding the middle of the screen
  function here() {
    const mid = innerHeight / 2;
    return sections.find(s => { const r = s.root.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || sections[0];
  }

  // n is 1-based. via: 'scroll' (walked into it), 'jump' (shell, buttons). Resolves false if refused.
  async function goTo(n, { via = 'jump' } = {}) {
    const s = sections[n - 1];
    if (!s || busy) return false;
    if (waiting) { clearTimeout(dwellT); waiting = false; }   // a jump during a dwell takes over from it
    setBusy(true);
    lock(true);                                // first: a fling must not carry the page anywhere while we wait
    let ghost = null, layer = null;
    try {                                      // whatever throws, the finally hands the page back
      await s.mounted;

      // walking down: freeze what is above the join flush with the bottom of the screen, as it was left
      if (via === 'scroll') jump(absTop(line(s)) - innerHeight);
      ghost = freeze(blocks());
      layer = document.createElement('div');
      layer.className = 'tx-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);

      const from = here();
      for (const x of sections) if (x !== s) x.instance?.onLeave?.();
      settle();                                // under the cover, the screen height catches up (core/viewport.js)
      jump(absTop(s.root));                    // and the page is parked on the target

      played.add(n);
      let dog;
      try {
        await Promise.race([
          s.transition.play({ ghost, layer, root: s.root, section: s.instance, index: n, via, reduced, from: from.index }),
          new Promise(res => { dog = setTimeout(() => { console.warn(`[transition ${s.dir}] cut after ${WATCHDOG} ms`); res(); }, WATCHDOG); }),
        ]);
      } catch (e) { console.error(`[transition ${s.dir}]`, e); }
      clearTimeout(dog);

      s.leadInstance?.onPlayed?.();            // a lead-in may fold away once its transition has been seen
    } catch (e) { console.error(`[goTo ${s.dir}]`, e); }
    finally {
      lock(false);
      jump(absTop(s.root));                    // in case a resize or a folded lead-in moved things
      ghost?.remove(); layer?.remove();
      remember();
      lastY = scrollY;
      setBusy(false);
    }
    s.instance?.onEnter?.({ via });
    return true;
  }

  // ---------- walking down into a section plays its transition, the first time only ----------
  // Fires when a section's line (its top, or the join above it) crosses the bottom of the screen going down,
  // measured from the bottom of the screen as it was then: toolbars sliding away between two scroll events
  // must not carry a line past it unnoticed. If its lead-in asks for a dwell,
  // the page first stops flush at the end of the lead-in, as if it were the end of the page, and waits.
  const played = new Set([1]);                 // the landing plays its own intro on load
  let tops = [], lastY = scrollY, waiting = false, dwellT = 0;
  const remember = () => { tops = sections.map(x => line(x).getBoundingClientRect().top - innerHeight); };
  addEventListener('scroll', () => {
    const y = scrollY, down = y > lastY, was = tops;
    lastY = y;
    remember();
    if (busy || waiting || !down) return;
    let hit = -1;                              // the deepest one crossed (a fling or End can cross several)
    for (let i = 1; i < sections.length; i++) if (!played.has(i + 1) && was[i] >= -1 && tops[i] < -1) hit = i;
    if (hit < 0) return;
    const s = sections[hit], dwell = s.mod.leadIn?.dwell || 0;
    if (!dwell) { goTo(hit + 1, { via: 'scroll' }); return; }
    waiting = true;
    lock(true);
    settle();                                  // the lead-in is about to fill the screen: it must be one screen tall
    jump(absTop(line(s)) - innerHeight);
    dwellT = setTimeout(() => { waiting = false; lock(false); goTo(hit + 1, { via: 'scroll' }); }, dwell);
  }, { passive: true });

  return {
    goTo,
    remember,
    get busy() { return busy; },
    watch(f) { watchers.push(f); },          // f(busy): called as a transition starts (true) and ends (false)
    get current() { return here().index; },
  };
}
