// KM-RoBoTa: three sub-sections stacked in one root.
//   1 · KM-RoBoTa  ASCII snake swims right to left into the text
//   2 · AI Summit  STAR (robotic plesiosaur) swims left to right, bobbing, with ripples
//   3 · Firmware   XIAO ESP32-C3 model, ASCII colour layers or pixel render, drag to turn
// Text: content.js. Knobs: config.js. The transition into it: transition.js.
import content from './content.js';
import config from './config.js';
import { swimmer } from './swimmer.js';
import { xiao } from './xiao.js';

export const id = 'kmr';
export const title = 'KM-RoBoTa';
// all three sub-sections sit on black, top to bottom: the core dithers the joins from these
export const edges = { top: config.colors['--black'], bottom: config.colors['--black'] };

const plain = html => html.replace(/<[^>]*>/g, '').replace(/"/g, '&quot;');   // for aria-label attributes

// the inside of a .copy, rewritten on a language switch
function copyText(c) {
  const [first, ...rest] = c.label;
  const paras = c.paragraphs.map((p, i) => `<p>${p}${i === c.paragraphs.length - 1 ? '<span class="cursor"></span>' : ''}</p>`).join('');
  return `
    <div class="label"><b>${first}</b>${rest.map(s => `<span>${s}</span>`).join('')}</div>
    <h2>${c.title}</h2>
    ${paras}
    <div class="stack">${c.stack.join('<i>/</i>')}</div>`;
}
const copy = c => `<div class="copy">${copyText(c)}</div>`;
// sub-section root -> its key in content.js
const BLOCKS = { '.ax-kmr': 'kmr', '.ax-summit': 'summit', '.xiao': 'xiao' };

const swimmerBlock = (cls, side, c) => `
<section class="ax ${cls}" data-text="${side}" aria-label="${plain(c.title)}">
  <canvas class="bg" aria-hidden="true"></canvas>
  <canvas class="fade" aria-hidden="true"></canvas>
  ${copy(c)}
</section>`;

function xiaoBlock(c) {
  const v = c.viewer;
  return `
<section class="ax xiao" data-text="left" aria-label="${plain(c.title)}">
  ${copy(c)}
  <div class="viewer">
    <div class="stage" role="img" aria-label="${v.ariaLabel}">
      <canvas class="px" hidden></canvas>
      <div class="model-ascii" aria-hidden="true">
        <pre class="l-edge" data-m="2"></pre>
        <pre class="l-mask" data-m="1"></pre>
        <pre class="l-dark" data-m="6"></pre>
        <pre class="l-silver" data-m="4"></pre>
        <pre class="l-gold" data-m="3"></pre>
        <pre class="l-label" data-m="5"></pre>
        <pre class="l-glint" data-m="8"></pre>
      </div>
    </div>
    <div class="ctrl">
      <div class="seg" role="group" aria-label="${v.modesLabel}">
        <button type="button" data-mode="ascii" aria-pressed="true">${v.modes.ascii}</button>
        <button type="button" data-mode="render" aria-pressed="false">${v.modes.render}</button>
      </div>
      <span class="hint">${v.hint}</span>
    </div>
  </div>
</section>`;
}

export async function mount(root, env) {
  for (const [k, v] of Object.entries(config.colors)) root.style.setProperty(k, v);
  root.style.setProperty('--section-h', config.sectionHeight);
  root.innerHTML = swimmerBlock('ax-kmr', 'left', content.kmr)
                 + swimmerBlock('ax-summit', 'right', content.summit)
                 + xiaoBlock(content.xiao);

  const kmr = swimmer(root.querySelector('.ax-kmr'), config.snake, config.swimmer);
  const summit = swimmer(root.querySelector('.ax-summit'), config.star, config.swimmer);
  const parts = [kmr, summit];
  const board = xiao(root.querySelector('.xiao'), root, config.xiao, content.xiao)
    .then(x => { parts.push(x); return x; });

  const inst = {
    ready: Promise.all([kmr.ready, summit.ready, board]),
    // the transition parks KM-RoBoTa's own snake while its robot swims: never two snakes at once
    hold(on) { kmr.hold(on); },
    onEnter() { parts.forEach(p => p.resume()); },
    onLeave() { parts.forEach(p => p.pause()); },
    words: () => [...root.querySelectorAll('.copy, .ctrl')],
    relang() {
      for (const [sel, key] of Object.entries(BLOCKS)) {
        const sub = root.querySelector(sel), c = content[key];
        sub.setAttribute('aria-label', plain(c.title));
        sub.querySelector('.copy').innerHTML = copyText(c);   // the swimmers follow the new size on their own
      }
      const v = content.xiao.viewer;
      root.querySelector('.xiao .stage').setAttribute('aria-label', v.ariaLabel);
      root.querySelector('.xiao .seg').setAttribute('aria-label', v.modesLabel);
      for (const b of root.querySelectorAll('.xiao .seg button')) b.textContent = v.modes[b.dataset.mode];
      root.querySelector('.xiao .hint').textContent = v.hint;
    },
  };
  inst.ready.catch(e => console.error('[02-kmr]', e));
  return inst;
}
