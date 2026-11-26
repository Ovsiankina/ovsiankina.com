// KM-RoBoTa section: every piece of text on the page, in locales/en.json and locales/fr.json (i18next namespace "kmr",
// core/lang.js). Strings may hold a little HTML: <em> lights a word up in white. The blinking cursor is added
// automatically after the last paragraph of each block.
//   kmr      1 · KM-RoBoTa (snake swims right to left into the text)
//   summit   2 · AI Summit (STAR swims left to right into the text)
//   xiao     3 · Firmware (XIAO model, ASCII or plain render). viewer: modesLabel names the ASCII / Render switch
//            for screen readers. silkscreen: printed in white on the underside of the 3D board.
//   each: label (first item highlighted in yellow), title, paragraphs, stack
import { translations } from '../../core/lang.js';
import en from './locales/en.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };

export default translations('kmr', { en, fr });
