// Bouldering: the cream climbing scene, last section of the site. The scene itself lives in scene.js,
// the wipe that leads into it in transition.js, the dark glitching tail below it in tail.js.
import content from './content.js';
import config from './config.js';
import { createScene } from './scene.js';
import { createTail } from './tail.js';
import { replayButton } from '../../core/replay.js';

export const id = 'climbing';
export const title = content.title;
// cream at the top (the wall), the site's dark background at the end of the tail
export const edges = { top: config.paper, bottom: config.tail.dark };

export async function mount(root, env) {
  root.style.setProperty('--climb-paper', config.paper);
  root.style.setProperty('--climb-ink', config.ink);
  root.style.setProperty('--climb-tail', `calc(${config.tail.height} * var(--sh))`);
  root.innerHTML = `
<div class="stage">
  <canvas class="holds" aria-hidden="true"></canvas>
  <canvas class="ascii" aria-hidden="true"></canvas>
  <canvas class="title" role="img"></canvas>
  <video class="video" muted playsinline preload="auto" aria-hidden="true"></video>
</div>
<div class="tail" aria-hidden="true"><canvas></canvas></div>`;
  const $ = s => root.querySelector(s);
  $('.title').setAttribute('aria-label', content.titleLabel);

  const video = $('.video');
  video.muted = true;
  const videoSrc = new URL(video.canPlayType('video/webm; codecs="vp9"') ? config.assets.webm : config.assets.mp4, import.meta.url).href;

  const stage = $('.stage');
  const scene = createScene({
    stage, holds: $('.holds'), ascii: $('.ascii'), title: $('.title'), video, videoSrc, reduced: env.reduced,
  });
  createTail($('.tail canvas'), env.reduced);

  // the replay button is part of the scene (bottom right of it, not of the tail):
  // hidden while a transition uncovers the blank scene, faded in on arrival
  const replay = replayButton(stage, content.replay, () => scene.replay());

  // scrolled into without a transition (or back onto it): start or carry on; off screen: pause.
  // -1px: a scene merely touching the screen's edge (just left above or below) counts as off screen
  new IntersectionObserver(([e]) => { if (e.isIntersecting) scene.resume(); else scene.pause(); }, { rootMargin: '-1px 0px' }).observe(stage);

  return {
    ready: scene.ready,
    hold: () => { replay.classList.add('held'); scene.hold(); },       // the transition blanks the scene under its cover
    onEnter: () => { replay.classList.remove('held'); scene.enter(); }, // every arrival through a transition plays holds -> climber -> title from the start
    onLeave: () => scene.pause(),
    words: () => [replay],
    relang() {
      replay.textContent = content.replay;
      $('.title').setAttribute('aria-label', content.titleLabel);
    },
  };
}
