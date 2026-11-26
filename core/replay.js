// The one replay button, shared by every section: the landing's "Rejouer", bottom right of its box.
// A framed box in the style of the top bar's EN / FR switch (core/base.css). Colours come from the section: set
// --replay-fg (and --replay-line, --replay-bg, --replay-on if the defaults do not suit) on the section's scope.
export function replayButton(parent, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'replay-btn';
  b.textContent = label;
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}
