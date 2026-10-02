// Tuning panel, TEST ONLY: loaded by section.js only when config.swirl.tuningPanel is true, so it never ships otherwise.
// The original's colour sliders (sections/balanki.html): cream, cyan and a third colour, pink or purple, edited live.
import content from './content.js';
import config from './config.js';

export function mountTuning(root, swirl) {
  const T = content.tuning, C = config.swirl;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = new URL('./tuning.css', import.meta.url);
  document.head.appendChild(link);

  const amt = [C.amounts.cream, C.amounts.cyan, C.amounts.third];
  let third = C.third;
  const row = (k, i, hex) => `
    <label for="eye-amt-${k}"><span class="sw" style="background:${hex}"></span><span class="name">${T[k]}</span></label>
    <input id="eye-amt-${k}" type="range" min="0" max="100" value="${Math.round(amt[i] * 100)}" style="accent-color:${hex}" data-i="${i}">
    <output>${Math.round(amt[i] * 100)}</output>`;
  const dev = document.createElement('div');
  dev.className = 'dev';
  dev.innerHTML = `${row('cream', 0, '#fff9c2')}${row('cyan', 1, '#2efff2')}${row('third', 2, C.thirds[third])}
    <div class="seg" role="group" aria-label="${T.third}">
      ${Object.keys(C.thirds).map(k => `<button type="button" data-k="${k}" aria-pressed="${k === third}"><span class="sw" style="background:${C.thirds[k]}"></span>${T[k]}</button>`).join('')}
    </div>`;
  root.appendChild(dev);

  const apply = () => {
    const hex = C.thirds[third], r = dev.querySelector('#eye-amt-third');
    r.style.accentColor = hex;
    r.previousElementSibling.querySelector('.sw').style.background = hex;
    r.previousElementSibling.querySelector('.name').textContent = T[third];
    for (const b of dev.querySelectorAll('.seg button')) b.setAttribute('aria-pressed', b.dataset.k === third);
    swirl.set(amt, hex);
  };
  for (const el of dev.querySelectorAll('input')) {
    el.addEventListener('input', () => { amt[+el.dataset.i] = el.value / 100; el.nextElementSibling.textContent = el.value; apply(); });
  }
  for (const b of dev.querySelectorAll('.seg button')) b.addEventListener('click', () => { third = b.dataset.k; apply(); });
  apply();
}
