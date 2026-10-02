// Tuning panel, TEST ONLY: loaded by section.js only when config.tuningPanel is true, so it never ships otherwise.
// Sliders edit the trace's speed and colour knobs (config.tuning) live; ranges in config.sliders, labels in content.tuning.
import content from './content.js';
import config from './config.js';

// before: the element the panel goes in front of. S: the live knob values, edited in place. onColor: crad changed. restart: start the trace over.
// Returns the readout element (speed and t, refreshed every frame by the section).
export function mountTuning(root, { before, S, onColor, restart }) {
  const T = content.tuning, SL = config.sliders;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = new URL('./tuning.css', import.meta.url);
  document.head.appendChild(link);

  const dev = document.createElement('details');
  dev.className = 'dev';
  dev.innerHTML = `
    <summary>${T.title}</summary>
    <div class="rows">
      ${Object.keys(SL).map(k => `<div data-k="${k}"><label>${T[k]} <output></output></label><input type="range" aria-label="${T[k]}" min="${SL[k].min}" max="${SL[k].max}" step="${SL[k].step}" value="${config.tuning[k]}"></div>`).join('\n      ')}
      <div class="acts"><button class="restart" type="button">${T.restart}</button><button class="defaults" type="button">${T.defaults}</button></div>
      <div class="read">v —</div>
    </div>`;
  before.before(dev);

  const rows = [...dev.querySelectorAll('[data-k]')];
  const readS = row => {
    const k = row.dataset.k, sl = SL[k];
    S[k] = parseFloat(row.querySelector('input').value);
    row.querySelector('output').textContent = S[k].toFixed(sl.digits) + (sl.unit || '');
  };
  for (const row of rows) {
    readS(row);
    row.querySelector('input').addEventListener('input', () => { readS(row); if (row.dataset.k === 'crad') onColor(); });
  }
  dev.querySelector('.restart').addEventListener('click', () => restart());
  dev.querySelector('.defaults').addEventListener('click', () => {
    for (const row of rows) { row.querySelector('input').value = config.tuning[row.dataset.k]; readS(row); }
    onColor();
  });
  return dev.querySelector('.read');
}
