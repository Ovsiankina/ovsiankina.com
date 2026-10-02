// A frozen copy of what is on screen right now, so a transition can play over it without knowing
// which section it came from. Every block of the page crossing the viewport (sections, lead-ins, seams)
// is cloned at its on-screen position. Canvas pixels and video frames are copied (WebGL canvases need preserveDrawingBuffer: true),
// and so are the scroll offsets of inner scrollers.

function copyCanvas(src, dst) {
  dst.width = src.width; dst.height = src.height;
  try { dst.getContext('2d').drawImage(src, 0, 0); } catch (e) { /* tainted or lost context: leave it blank */ }
}

function videoStill(video) {
  const c = document.createElement('canvas');
  c.width = video.videoWidth || 2; c.height = video.videoHeight || 2;
  c.className = video.className; c.style.cssText = video.style.cssText;
  c.setAttribute('aria-hidden', 'true');
  try { if (video.readyState >= 2) c.getContext('2d').drawImage(video, 0, 0); } catch (e) {}
  return c;
}

function cloneSection(root, rect) {
  const clone = root.cloneNode(true);
  const src = [root, ...root.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
  const scrolled = [];
  src.forEach((el, i) => {
    const c = dst[i];
    if (el.tagName === 'CANVAS') copyCanvas(el, c);
    else if (el.tagName === 'VIDEO') c.replaceWith(videoStill(el));
    if (el.scrollTop || el.scrollLeft) scrolled.push([c, el.scrollTop, el.scrollLeft]);
    if (c.id) c.removeAttribute('id');
  });
  clone.classList.add('ghost');
  clone.removeAttribute('data-index');
  clone.setAttribute('aria-hidden', 'true');
  clone.inert = true;
  Object.assign(clone.style, {
    left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px',
  });
  return { clone, scrolled };
}

// layout position, not getBoundingClientRect: a section caught mid-shake is frozen where it belongs
function layoutRect(el) {
  let left = 0, top = 0;
  for (let e = el; e; e = e.offsetParent) { left += e.offsetLeft; top += e.offsetTop; }
  top -= scrollY; left -= scrollX;
  return { left, top, width: el.offsetWidth, height: el.offsetHeight, bottom: top + el.offsetHeight };
}

// returns the fixed full-screen element holding the copy, already in the document
export function freeze(blocks) {
  const layer = document.createElement('div');
  layer.className = 'freeze';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.background = getComputedStyle(document.body).backgroundColor;
  const scrolled = [];
  for (const el of blocks) {
    const r = layoutRect(el);
    if (r.bottom <= 0 || r.top >= innerHeight || r.height === 0) continue;
    const c = cloneSection(el, r);
    layer.appendChild(c.clone);
    scrolled.push(...c.scrolled);
  }
  document.body.appendChild(layer);
  for (const [el, top, left] of scrolled) { el.scrollTop = top; el.scrollLeft = left; }
  return layer;
}
