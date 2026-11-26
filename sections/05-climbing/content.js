// Every word of the climbing section, in locales/en.json and locales/fr.json (i18next namespace "climbing",
// core/lang.js). Edit freely.
//   title       name of the section (admin shell list)
//   titleLabel  screen-reader name of the 3D title. The word drawn on screen is the mesh in assets/title_mesh.json,
//               so changing this does not change the picture. en.json only: the mesh draws the English word in both.
//   replay      button bottom right of the scene: plays the holds, the climb and the title again
import { translations } from '../../core/lang.js';
import en from './locales/en.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };

export default translations('climbing', { en, fr });
