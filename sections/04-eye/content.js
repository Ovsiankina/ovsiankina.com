// Every string shown on the swirl page, the first of the hobby / artistic sections, in locales/en.json and
// locales/fr.json (i18next namespace "eye", core/lang.js). Not finished: the swirl is all there is for now, under a
// work-in-progress tag, with arrows down to the climbing section.
//   wip               the tag
//   next, nextLabel   the arrows at the bottom, leading on to climbing (nextLabel: their aria-label)
//   replay            bottom right: plays the eye transition again
//   tuning            tuning panel (config.swirl.tuningPanel only), en.json only
import { translations } from '../../core/lang.js';
import en from './locales/en.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };

export default translations('eye', { en, fr });
