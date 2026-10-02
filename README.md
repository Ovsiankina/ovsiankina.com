# ovsiankina.com

Static site, no build step. Serve the repo root with any static server (ES modules and `fetch` do not work from `file://`):

```sh
python3 -m http.server 8000   # then open http://localhost:8000/
```

## Layout

- `index.html`, `core/`: the shell. Stacks the sections in one scrolling page, plays transitions, admin shell.
- `sections/sections.js`: the section order.
- `sections/NN-name/`: one folder per section.
  - `content.js`: the text, in English and French: `pick({ en, fr })` from `core/lang.js`
  - `config.js`: timings, colours, asset paths
  - `assets/`: images, video, meshes
  - `section.js`, `transition.js`, `style.css`: the code

## Transitions

Each section owns the transition that leads **into** it. A transition never knows where it starts: the screen is frozen into a copy, the page jumps to the target underneath it, and the target's transition plays over that copy. Scrolling down into the next section plays its transition. Scrolling up is plain scrolling.

## Languages

English and French. The language is picked once per page load (`core/lang.js`): the choice saved by the EN / FR switch (top centre), else the first of the browser's languages that is English or French, else English. Switching saves the choice and rewrites the words in place: every section's text dithers out at once, each section puts in the new words (`relang()`, see `core/site.js`), and they dither back in. The switch itself dithers away while a transition plays.

## Admin shell

Press `~` anywhere. `help` lists the commands. `ls` lists the sections with their numbers. `cd 3` or `cd math` plays the transition into that section from wherever you are. `lang fr` switches the language. `#s3` in the address bar opens on section 3, through its transition.
