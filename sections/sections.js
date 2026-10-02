// The site, top to bottom. Each entry is a folder in sections/ holding:
//   section.js     builds the section, exports mount(root, env)
//   transition.js  the transition INTO this section, exports play(t)
//   style.css      styles, scoped under .s-<id>
//   content.js     the text
//   config.js      timings, colours, asset paths
//   assets/        images, video, meshes
export default [
  '01-landing',
  '02-kmr',
  '03-math',
  '04-eye',
  '05-climbing',
];
