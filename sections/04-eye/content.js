// Every string shown on the swirl page, the first of the hobby / artistic sections, in English and French (core/lang.js
// picks one). Not finished: the swirl is all there is for now, under a work-in-progress tag, with arrows down to the climbing section.
import { pick } from '../../core/lang.js';

const shared = {
  // tuning panel (config.swirl.tuningPanel only)
  tuning: { cream: 'CREAM', cyan: 'CYAN', purple: 'PURPLE', pink: 'PINK', third: 'Third color' },
};

export default pick({
  en: {
    wip: 'Work in progress',

    // the arrows at the bottom: they lead on to the next section (climbing)
    next: 'Continue',
    nextLabel: 'Continue to climbing',   // aria-label of the arrows button

    // bottom right: plays the eye transition again
    replay: 'Replay',
  },
  fr: {
    wip: 'En cours',
    next: 'Continuer',
    nextLabel: 'Continuer vers l\'escalade',
    replay: 'Rejouer',
  },
}, shared);
