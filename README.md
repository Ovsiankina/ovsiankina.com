# ovsiankina.com

Static site, no build step. Serve the repo root with any static server (ES modules and `fetch` do not work from `file://`):

```sh
python3 -m http.server 8000   # then open http://localhost:8000/
```

## Layout

- `index.html`, `core/`: the shell. Stacks the sections in one scrolling page, plays transitions, admin shell.
- `sections/sections.js`: the section order.
- `sections/NN-name/`: one folder per section.
  - `content.js`: the text
  - `config.js`: timings, colours, asset paths
  - `assets/`: images, video, meshes
  - `section.js`, `transition.js`, `style.css`: the code

## Transitions

Each section owns the transition that leads **into** it. A transition never knows where it starts: the screen is frozen into a copy, the page jumps to the target underneath it, and the target's transition plays over that copy. Scrolling down into the next section plays its transition. Scrolling up is plain scrolling.

## Admin shell

Press `~` anywhere. `help` lists the commands. `ls` lists the sections with their numbers. `cd 3` or `cd math` plays the transition into that section from wherever you are. `#s3` in the address bar opens on section 3, through its transition.
