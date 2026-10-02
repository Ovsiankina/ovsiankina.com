// Every word shown by the landing, in English and French (core/lang.js picks one). Edit freely: the typewriter
// wraps each glyph after the DOM is built, so any length works. Small inline HTML is allowed (<em> = ink highlight, <a>, <br>).
import config from './config.js';
import { pick } from '../../core/lang.js';

const asset = p => new URL(p, import.meta.url).href;
const letter = text => `<a href="${asset(config.letter.pdf)}" download="${config.letter.filename}">${text}</a>`;
const publication = '<em>Static and Dynamic Dispatch in Robotics Control Loops: A Practical Performance Study in Rust.</em> IEEE, 2026';
const ieee = '<a href="https://ieeexplore.ieee.org/document/11533996" target="_blank" rel="noopener">ieeexplore 11533996</a>';

const shared = {
  // ---------- the same in both languages ----------
  name: 'David Mostoslavski',

  // ~ shell command (admin only, never shown on the page)
  shell: {
    usage: 'photo [n]',
    about: 'photo dither, 0 to 1000 (100 = the first grain, no n: show it)',
    now: n => `photo: ${n}`,
    set: n => `photo: ${n} (not saved: copy it into config.js PHOTO_DITHER to keep it)`,
    bad: arg => `photo: expected a number from 0 to 1000, got "${arg}"`,
  },
};

export default pick({
  en: {
    label: 'CV',                                  // aria-label of the whole section

    // ---------- header of the CV (first square) ----------
    role: 'Apprentice and lead software architect, embedded and real-time',
    avail: 'Looking for a host company from October 2026 until my CFC (Swiss federal VET diploma) in July 2027.',

    // ---------- CV body, two columns (one on portrait screens) ----------
    // A block has a heading and any of: text (paragraph), job { company, when }, items (bullet list),
    // list (definition list of [term, description] pairs). Blocks render in this order.
    left: [
      {
        heading: 'Profile',
        text: 'Embedded and real-time software development, specialised in robotics. Lead author of an IEEE paper (2026) on static dispatch and its impact on real-time architecture. At the company Monday to Thursday, at school on Fridays.',
      },
      {
        heading: 'Experience',
        job: { company: 'KM-RoBoTa SA, Renens', when: '04.2025 – now' },
        items: [
          'HAL and firmware in no-std Rust (ARM Cortex-M4), no RTOS: scheduling and drivers written from scratch.',
          'Port of PREEMPT_RT to Arch Linux ARM64: kernel patches, configuration and build scripts.',
          'Full control of a teleoperated robot: Bluetooth and Zenoh, power through an nRF52840, inverse kinematics.',
          'CAN, RS485, TTL, Bluetooth; Rust wrapper of the Dynamixel SDK, FFI interface callable from C.',
          'Port of research code (master\'s, PhD) from C++ to Rust, Dioxus interface for Linux and WASM.',
          'I/O benchmarks and pure static dispatch, allocation-free architectures for the IEEE paper.',
          'Local inference and internal agentic workflows; KM-RoBoTa at the AI for Good Global Summit.',
        ],
      },
      {
        heading: 'Publication',
        text: `${publication}, lead author. ${ieee}`,
      },
      {
        heading: 'Education',
        text: '<em>CFC in IT, application development</em> (Swiss federal VET diploma)<br>EPSIC, Lausanne. 2023 – 2027, final year.',
      },
    ],
    right: [
      {
        heading: 'Skills',
        list: [
          ['Languages', 'Rust, C, C++, Python, shell'],
          ['Embedded, real-time', 'no-std, bare-metal, ARM Cortex-M, CAN, RS485, TTL, Bluetooth, FFI, PREEMPT_RT'],
          ['Systems', 'Linux, build, CI/CD, cross-platform'],
          ['AI', 'local inference, fine-tuning, edge AI, agents'],
        ],
      },
      {
        heading: 'Languages',
        list: [
          ['French', 'native'],
          ['English', 'C1'],
          ['German', 'A2'],
        ],
      },
      {
        // the blinking cursor lands at the end of the last paragraph of the CV, i.e. here
        heading: 'Reference',
        text: `Dr Kamilo Melo, CEO, KM-RoBoTa SA. ${letter('Letter of recommendation')} available (in French).`,
      },
    ],

    // ---------- photo carousel (.618 square) ----------
    photoLabel: 'Photos of David, click for the next one',

    // ---------- PDF download (.236 square) ----------
    download: {
      title: 'Download the CV',                   // large squares
      short: 'CV',                                // small squares (phones)
      sub: 'PDF, Swiss format',
      label: 'Download the CV, PDF in Swiss format',   // aria-label
    },

    // ---------- bottom right ----------
    replay: 'Replay',
  },

  fr: {
    label: 'CV',

    role: 'Apprenti et lead architecte logiciel, embarqué et temps réel',
    avail: 'Recherche une entreprise d\'accueil dès octobre 2026, jusqu\'au CFC en juillet 2027.',

    left: [
      {
        heading: 'Profil',
        text: 'Développement de logiciels embarqués et temps réel, spécialisé en robotique. Auteur principal d\'une publication IEEE (2026) sur le dispatch statique et ses impacts sur l\'architecture temps réel. En entreprise du lundi au jeudi, école le vendredi.',
      },
      {
        heading: 'Expérience',
        job: { company: 'KM-RoBoTa SA, Renens', when: '04.2025 – auj.' },
        items: [
          'HAL et firmware en Rust no-std (ARM Cortex-M4), sans RTOS : ordonnancement et pilotes écrits de zéro.',
          'Portage de PREEMPT_RT sur Arch Linux ARM64 : patchs noyau, configuration et scripts de build.',
          'Contrôle complet d\'un robot téléopéré : Bluetooth et Zenoh, alimentation via nRF52840, cinématique inverse.',
          'CAN, RS485, TTL, Bluetooth ; wrapper Rust du SDK Dynamixel, interface FFI appelable depuis C.',
          'Portage de recherche (master, doctorat) du C++ vers Rust, interface Dioxus pour Linux et WASM.',
          'Benchmarks I/O et architectures en dispatch statique pur, sans allocation, pour la publication IEEE.',
          'Inférence locale et workflows agentiques internes ; KM-RoBoTa au AI for Good Global Summit.',
        ],
      },
      {
        heading: 'Publication',
        text: `${publication}, auteur principal. ${ieee}`,
      },
      {
        heading: 'Formation',
        text: '<em>CFC informaticien, développement d\'applications</em><br>EPSIC, Lausanne. 2023 – 2027, dernière année.',
      },
    ],
    right: [
      {
        heading: 'Compétences',
        list: [
          ['Langages', 'Rust, C, C++, Python, shell'],
          ['Embarqué, temps réel', 'no-std, bare-metal, ARM Cortex-M, CAN, RS485, TTL, Bluetooth, FFI, PREEMPT_RT'],
          ['Systèmes', 'Linux, build, CI/CD, multiplateforme'],
          ['IA', 'inférence locale, fine-tuning, edge AI, agents'],
        ],
      },
      {
        heading: 'Langues',
        list: [
          ['Français', 'langue maternelle'],
          ['Anglais', 'C1'],
          ['Allemand', 'A2'],
        ],
      },
      {
        heading: 'Référence',
        text: `Dr Kamilo Melo, CEO, KM-RoBoTa SA. ${letter('Lettre de recommandation')} disponible.`,
      },
    ],

    photoLabel: 'Photos de David, cliquer pour passer à la suivante',

    download: {
      title: 'Télécharger le CV',
      short: 'CV',
      sub: 'PDF, format suisse',
      label: 'Télécharger le CV, PDF au format suisse',
    },

    replay: 'Rejouer',
  },
}, shared);
