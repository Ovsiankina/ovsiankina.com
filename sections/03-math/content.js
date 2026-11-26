// Every piece of text in the maths section, in locales/en.json and locales/fr.json (i18next namespace "math",
// core/lang.js). Edit freely; small inline HTML (<em>, <br>, <a>) is allowed in paragraphs and caption. <em> is shown
// in the bright ink colour, not in italics. Keys missing from fr.json are read from en.json.
//   ariaLabel          section landmark name, read by screen readers
//   heading, paragraphs  copy column
//   caption            small pixel-font note under the paragraphs
//   replay             bottom-right button: restarts the zeta trace from t = 0
//   transitionCaption  bottom-left while the Standard Model Lagrangian is written during the transition
//   valueLabel         the label riding next to the comet head; {{t}} is the current t (en.json only)
//   tuning             tuning panel (only built when config.tuningPanel is true)
import { translations } from '../../core/lang.js';
import en from './locales/en.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };

export default translations('math', { en, fr });
