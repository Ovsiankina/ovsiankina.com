// Every word of the climbing section, in English and French (core/lang.js picks one). Edit freely.
import { pick } from '../../core/lang.js';

export default pick({
  en: {
    // name of the section (admin shell list)
    title: 'Bouldering',

    // screen-reader name of the 3D title. The word drawn on screen is the mesh in assets/title_mesh.json,
    // so changing this does not change the picture.
    titleLabel: 'Bouldering',

    // button bottom right of the scene: plays the holds, the climb and the title again
    replay: 'replay',
  },
  fr: {
    title: 'Bloc',
    titleLabel: 'Bouldering',   // the mesh draws the English word in both languages
    replay: 'rejouer',
  },
});
