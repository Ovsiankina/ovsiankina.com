// Every word shown by the landing, in locales/en.json and locales/fr.json (i18next namespace "landing", core/lang.js).
// Edit freely: the typewriter wraps each glyph after the DOM is built, so any length works. Small inline HTML is
// allowed (<em> = ink highlight, <a>, <br>). Keys missing from fr.json are read from en.json: name, publication, ieee
// (pulled into the text with $t(publication) and $t(ieee)) and shell (the ~ shell "photo" command, never on the page).
//   label        aria-label of the whole section
//   role, avail  header of the CV (first square)
//   left, right  CV body, two columns (one on portrait screens). A block has a heading and any of: text (paragraph),
//                job { company, when }, items (bullet list), list ([term, description] pairs). Rendered in order.
//                {{letterHref}} {{letterFile}}: the recommendation letter, from config.letter. The blinking cursor
//                lands at the end of the last paragraph of the CV.
//   photoLabel   photo carousel (.618 square)
//   download     PDF download (.236 square): title (large squares), short (phones), sub, label (aria-label)
//   replay       bottom right
import { translations } from '../../core/lang.js';
import en from './locales/en.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };

export default translations('landing', { en, fr });
