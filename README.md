# ovsiankina.com

Static site, no build step. Serve the repo root with any static server (ES modules and `fetch` do not work from `file://`):

```sh
python3 -m http.server 8000   # then open http://localhost:8000/
```

## Layout

- `index.html`, `core/`: the shell. Stacks the sections in one scrolling page, plays transitions, admin shell.
- `core/vendor/i18next.js`: i18next 26.5.12, its ES module build copied unchanged from npm (no build step, no CDN).
- `sections/sections.js`: the section order.
- `mostoslavsky/`: the separate one-page site of mostoslavsky.com (see below), not part of this page.
- `sections/NN-name/`: one folder per section.
  - `locales/en.json`, `locales/fr.json`: the text, in English and French
  - `content.js`: loads them as the section's i18next namespace (named after its `id`) and exports its `t`
  - `config.js`: timings, colours, asset paths
  - `assets/`: images, video, meshes
  - `section.js`, `transition.js`, `style.css`: the code

## Transitions

Each section owns the transition that leads **into** it. A transition never knows where it starts: the screen is frozen into a copy, the page jumps to the target underneath it, and the target's transition plays over that copy. Scrolling down into the next section plays its transition. Scrolling up is plain scrolling.

## Languages

English and French, through [i18next](https://www.i18next.com/). Each section's words are an i18next namespace: `t('heading')` for a string, `t('paragraphs', { returnObjects: true })` for a list or a block, `{{name}}` in a string for a value passed at the call, `$t(key)` to pull another key in. A key missing from `fr.json` is read from `en.json`, so words that are the same in both languages (names, the admin-shell lines) live in `en.json` only. Strings may hold a little HTML: i18next does not escape them.

The language is picked once per page load (`core/lang.js`): the choice saved by the EN / FR switch (top centre), else the first of the browser's languages that is English or French, else English. Switching saves the choice and rewrites the words in place: every section's text dithers out at once, each section puts in the new words (`relang()`, see `core/site.js`), and they dither back in. The switch itself dithers away while a transition plays.

At the right end of the same line, "skip transitions" (`core/skip.js`), for visitors who have already seen the animations: while it is on, every transition plays its short reduced-motion cut and no lead-in dwells. Opt-in only: every visit starts with it off, the choice is never saved.

## Maths figure

The maths section shows one of two figures, picked with the switch under it (saved; `view` in its `config.js` comes first): the combined wave function of two identical particles (`wave.js`), a surface that snaps flat into a curve when dragged edge-on, or the zeta trace of the Riemann hypothesis. In the admin shell: `figure wave` / `figure riemann`.

## Admin shell

Press `~` anywhere. `help` lists the commands. `ls` lists the sections with their numbers. `cd 3` or `cd math` plays the transition into that section from wherever you are. `lang fr` switches the language. `skip on` / `skip off` sets skipping the transitions. `intro` plays the mostoslavsky.com intro. `#s3` in the address bar opens on section 3, through its transition.

## mostoslavsky.com

`mostoslavsky.com` (the misspelling search engines autocorrect to) is its own small site, so it shows up for the "y" spelling: `mostoslavsky/` is its whole web root, served by Caddy on its own. It is deployed alone (`git archive HEAD mostoslavsky | tar -x --strip-components=1` into its web root), so nothing in it may point outside the folder: it carries its own copy of what it uses from the landing (the construction, the photo dither, two photos). One screen: the landing cut down, the name spelled with a y ("also written Mostoslavski"), a short CV, and in the download square a "see the full CV" link to `https://mostoslavski.com/?from=mostoslavsky`, which plays the intro below. Its own title, description, `robots.txt` and `sitemap.xml`; its canonical is itself, never mostoslavski.com, or search engines would fold it into the main site. The main page's footer links back to it.

## mostoslavsky.com intro

`core/intro.js`. With `?from=mostoslavsky` (the "see the full CV" link of mostoslavsky.com) the page opens on black: "mostoslavsky" dithers in, its y travels cell by cell into an i, the name dithers out, then the black dissolves away and uncovers the landing, whose own intro starts then. The page loads underneath meanwhile; an inline guard at the top of `index.html`'s `<head>` keeps it hidden until the canvas covers it. The query is removed on start, so a reload doesn't replay it. Click, tap, wheel or any key ends it. It plays only from that query (typing it by hand works too) or `intro` in the shell, never under reduced motion.
