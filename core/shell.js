// Admin micro-shell. "~" anywhere opens it top left; "~", Escape or "exit" closes it.
// Not advertised anywhere on the page on purpose.

export function createShell(nav, sections, extra = {}) {
  const el = document.createElement('div');
  el.className = 'shell';
  el.hidden = true;
  el.innerHTML = '<pre class="out" aria-live="polite"></pre><form autocomplete="off"><label for="shell-in">~ $</label><input id="shell-in" spellcheck="false" autocapitalize="off"></form>';
  document.body.appendChild(el);
  const out = el.querySelector('.out'), form = el.querySelector('form'), input = el.querySelector('input');
  const history = [];
  let hi = 0;

  const print = (text, cls) => {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    out.appendChild(line);
    while (out.childNodes.length > 200) out.firstChild.remove();
    out.scrollTop = out.scrollHeight;
  };
  // a section's shell name is its id (section.js), so ls and cd pick up new sections on their own
  const list = () => sections.map((s, i) => `  ${i + 1}  ${s.mod.id}${nav.current === i + 1 ? '   <- here' : ''}`).join('\n');
  const find = arg => {
    const n = Number(arg);
    if (Number.isInteger(n)) return n >= 1 && n <= sections.length ? n : 0;
    return sections.findIndex(s => s.mod.id === arg.toLowerCase()) + 1;
  };

  const COMMANDS = {
    help: {
      usage: 'help', about: 'this list',
      run: () => print(Object.values(COMMANDS).map(c => `  ${c.usage.padEnd(14)} ${c.about}`).join('\n')),
    },
    ls: { usage: 'ls', about: 'list the sections', run: () => print(list()) },
    cd: {
      usage: 'cd <n|name>', about: 'play the transition into a section, by number or name',
      run: async ([arg]) => {
        if (arg === undefined) { print('cd: which section? ls lists them', 'err'); return; }
        const n = find(arg);
        if (!n) { print(`cd: no section "${arg}", ls lists them`, 'err'); return; }
        if (nav.busy) { print('cd: a transition is already running', 'err'); return; }
        print(`-> ${n} ${sections[n - 1].mod.id}`, 'ok');
        close();
        await nav.goTo(n, { via: 'jump' });
      },
    },
    clear: { usage: 'clear', about: 'clear the screen', run: () => out.replaceChildren() },
    exit: { usage: 'exit', about: 'close the shell (also ~ or Esc)', run: () => close() },
  };
  for (const [name, c] of Object.entries(extra)) COMMANDS[name] ??= { usage: c.usage || name, about: c.about || '', run: args => c.run(args, print) };

  function exec(line) {
    const [name, ...args] = line.trim().split(/\s+/);
    if (!name) return;
    print(`~ $ ${line.trim()}`);
    const cmd = COMMANDS[name.toLowerCase()];
    if (!cmd) { print(`${name}: command not found, try help`, 'err'); return; }
    cmd.run(args);
  }

  function open() { el.hidden = false; input.focus(); }
  function close() { el.hidden = true; input.blur(); }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const line = input.value;
    input.value = '';
    if (line.trim()) { history.push(line); hi = history.length; }
    exec(line);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hi > 0) { e.preventDefault(); input.value = history[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(history.length, hi + 1); input.value = history[hi] ?? ''; }
    else if (e.key === 'Escape') close();
    e.stopPropagation();                        // keep the page's own key handlers out of the shell
  });
  addEventListener('keydown', e => {
    // AltGr reports ctrl+alt on Windows; on Swiss layouts ~ is a dead key, AltGr + ^
    const tilde = e.key === '~' || (e.key === 'Dead' && e.code === 'Equal' && e.getModifierState('AltGraph'));
    if (!tilde || (e.ctrlKey && !e.altKey) || e.metaKey) return;
    if (e.target !== input && e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    el.hidden ? open() : close();
  }, true);

  return { open, close, exec };
}
