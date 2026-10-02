// The one replay button, shared by every section: the landing's "Rejouer", bottom right of its box.
// Colours come from the section: set --replay-fg and --replay-hover on the section's scope.
export function replayButton(parent, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'replay-btn';
  b.textContent = label;
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}
