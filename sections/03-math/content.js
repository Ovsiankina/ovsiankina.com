// Every piece of text in the maths section, in English and French (core/lang.js picks one). Edit freely; small inline
// HTML (<em>, <br>, <a>) is allowed in `paragraphs` and `caption`. <em> is shown in the bright ink colour, not in italics.
import { pick } from '../../core/lang.js';

const shared = {
  // the label riding next to the comet head; {t} is replaced by the current t
  valueLabel: 'ζ(½ + {t}i)',
};

export default pick({
  en: {
    // section landmark name, read by screen readers
    ariaLabel: 'Mathematics',

    // copy column
    heading: 'Mathematics',
    paragraphs: [
      "Mathematics is my passion. Behind a real-time control loop or a Rust type system there is always a structure, and that structure is what draws me in.",
      "My dream is not only to use it. One day I would like to <em>move a real open question forward</em>, even by a small step.",
    ],
    // small pixel-font note under the paragraphs
    caption: "ζ(½ + it) ON THE CRITICAL LINE. EVERY PASS THROUGH THE ORIGIN IS A NON-TRIVIAL ZERO. THE RIEMANN HYPOTHESIS STATES THAT THEY ALL LIE THERE.",

    // bottom-right button: restarts the zeta trace from t = 0
    replay: 'REPLAY',

    // shown bottom-left while the Standard Model Lagrangian is being written during the transition
    transitionCaption: 'STANDARD MODEL LAGRANGIAN',

    // tuning panel (only built when config.tuningPanel is true)
    tuning: {
      title: 'TUNING (TEST)',
      vmax: 'MAX SPEED',
      vmin: 'MIN SPEED',
      radius: 'BRAKING RADIUS',
      tau: 'INERTIA',
      crad: 'COLOUR RADIUS',
      restart: 'RESTART',
      defaults: 'DEFAULTS',
    },
  },

  fr: {
    ariaLabel: 'Mathématiques',

    heading: 'Mathématiques',
    paragraphs: [
      "Les mathématiques sont ma passion. Derrière une boucle de contrôle temps réel ou un système de types en Rust, il y a toujours une structure, et c'est elle qui m'attire.",
      "Mon rêve est de ne pas seulement les utiliser. J'aimerais un jour <em>faire avancer une vraie question ouverte</em>, même d'un petit pas.",
    ],
    caption: "ζ(½ + it) SUR LA DROITE CRITIQUE. CHAQUE PASSAGE PAR L'ORIGINE EST UN ZÉRO NON TRIVIAL. L'HYPOTHÈSE DE RIEMANN AFFIRME QU'ILS Y SONT TOUS.",

    replay: 'REJOUER',

    transitionCaption: 'LAGRANGIEN DU MODÈLE STANDARD',

    tuning: {
      title: 'RÉGLAGES (TEST)',
      vmax: 'VITESSE MAX',
      vmin: 'VITESSE MIN',
      radius: 'RAYON FREINAGE',
      tau: 'INERTIE',
      crad: 'RAYON COULEUR',
      restart: 'RELANCER',
      defaults: 'DÉFAUTS',
    },
  },
}, shared);
