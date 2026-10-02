# ovsiankina.com

Static site, no build step. See README.md for the layout and core/site.js for the section contract.

## Adding a section

Never forget to make every new section reachable from the `~` admin shell:

- `section.js` must export a short `id`: one lowercase word, unique across sections (e.g. `landing`, `kmr`, `math`, `eye`, `climbing`). It is the section's shell name.
- Add the folder to `sections/sections.js`. Its position there is its number.
- Check it in the shell: `ls` lists it with its number, and both `cd <n>` and `cd <id>` play its transition.
