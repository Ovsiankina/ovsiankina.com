// Every piece of text in the maths section. Edit freely; small inline HTML (<em>, <br>, <a>) is allowed in
// `paragraphs` and `caption`. <em> is shown in the bright ink colour, not in italics.
export default {
  // section landmark name, read by screen readers
  ariaLabel: 'Mathématiques',

  // copy column
  heading: 'Mathématiques',
  paragraphs: [
    "Les mathématiques sont ma passion. Derrière une boucle de contrôle temps réel ou un système de types en Rust, il y a toujours une structure, et c'est elle qui m'attire.",
    "Mon rêve est de ne pas seulement les utiliser. J'aimerais un jour <em>faire avancer une vraie question ouverte</em>, même d'un petit pas.",
  ],
  // small pixel-font note under the paragraphs
  caption: "ζ(½ + it) SUR LA DROITE CRITIQUE. CHAQUE PASSAGE PAR L'ORIGINE EST UN ZÉRO NON TRIVIAL. L'HYPOTHÈSE DE RIEMANN AFFIRME QU'ILS Y SONT TOUS.",

  // the label riding next to the comet head; {t} is replaced by the current t
  valueLabel: 'ζ(½ + {t}i)',

  // bottom-right button: restarts the zeta trace from t = 0
  replay: 'REJOUER',

  // shown bottom-left while the Standard Model Lagrangian is being written during the transition
  transitionCaption: 'LAGRANGIEN DU MODÈLE STANDARD',

  // tuning panel (only built when config.tuningPanel is true)
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
};
