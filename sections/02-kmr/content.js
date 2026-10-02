// KM-RoBoTa section: every piece of text on the page, in English and French (core/lang.js picks one).
// Strings may hold a little HTML: <em> lights a word up in white. The blinking cursor is added
// automatically after the last paragraph of each block.
import { pick } from '../../core/lang.js';

export default pick({
  en: {
    // 1 · KM-RoBoTa (snake swims right to left into the text)
    kmr: {
      label: ['KM-RoBoTa', 'Renens', '04.2025 → now'],   // first item is highlighted in yellow
      title: 'Real-time robotics, written in Rust.',
      paragraphs: [
        `Apprentice developer at KM-RoBoTa, a robotics company in Renens, while completing my
         CFC informaticien in application development. I'm also its <em>only software
         developer</em>: every piece of software running on our robots is mine.`,
        `My main work is <em>kmr</em>, a Rust SDK for real-time robot control: heap-free,
         no-std control loops, type-state builders that reject invalid robot configurations at
         compile time, and <em>dxl-rs</em>, a Dynamixel driver configured through RON control
         tables. The work led to my first IEEE peer-reviewed paper (2026).`,
      ],
      stack: ['Rust', 'no-std', 'Zenoh', 'Dioxus'],
    },

    // 2 · AI Summit (STAR swims left to right into the text)
    summit: {
      label: ['AI Summit', 'Palexpo, Geneva'],
      title: 'One booth. Every robot. One developer.',
      paragraphs: [
        `I ran KM-RoBoTa's booth at the AI Summit at Palexpo, Geneva. Every robot on display
         ran on software I wrote, including our flagship, <em>STAR</em>, a robotic plesiosaur.`,
        `I pitched the company to visitors, and for the robots' software I was the whole team
         at once: <em>sysadmin</em> keeping the machines up, <em>operator</em> driving the robots
         live, and <em>salesman</em> explaining what they could do.`,
      ],
      stack: ['Pitch', 'Sysadmin', 'Robot control', 'Sales'],
    },

    // 3 · Firmware (XIAO model, ASCII or plain render)
    xiao: {
      label: ['Firmware', 'XIAO', 'no-std', 'RTIC'],
      title: 'From the battery to every actuator.',
      paragraphs: [
        `Closer to the metal: on Seeed <em>XIAO</em> microcontrollers, I wrote the firmware that
         manages how the robot's battery powers its sensors and actuators, in <em>no-std Rust</em>
         on the <em>RTIC</em> framework.`,
        `Nothing like it existed in Rust, so it is built entirely from scratch, from bare-metal
         hardware access up to the RTIC tasks that run the power delivery.`,
      ],
      stack: ['no-std', 'RTIC', 'XIAO ESP32-C3', 'Power delivery'],
      viewer: {
        ariaLabel: 'Seeed XIAO ESP32-C3 board, rotating; drag to turn it',
        modesLabel: 'View',                            // screen readers: name of the ASCII / Render switch
        modes: { ascii: 'ASCII', render: 'Render' },
        hint: 'Drag to turn',
      },
      // printed in white on the underside of the 3D board
      silkscreen: { brand: 'seeed studio', model: 'XIAO ESP32C3' },
    },
  },

  fr: {
    kmr: {
      label: ['KM-RoBoTa', 'Renens', '04.2025 → auj.'],
      title: 'De la robotique temps réel, écrite en Rust.',
      paragraphs: [
        `Apprenti développeur chez KM-RoBoTa, une entreprise de robotique à Renens, en parallèle
         de mon CFC d'informaticien en développement d'applications. J'en suis aussi le <em>seul
         développeur logiciel</em> : chaque logiciel qui tourne sur nos robots est le mien.`,
        `Mon travail principal est <em>kmr</em>, un SDK Rust pour le contrôle de robots en temps
         réel : boucles de contrôle no-std sans allocation, builders en type-state qui refusent les
         configurations de robot invalides dès la compilation, et <em>dxl-rs</em>, un pilote
         Dynamixel configuré par des tables de contrôle RON. Ce travail a mené à ma première
         publication IEEE évaluée par les pairs (2026).`,
      ],
      stack: ['Rust', 'no-std', 'Zenoh', 'Dioxus'],
    },

    summit: {
      label: ['AI Summit', 'Palexpo, Genève'],
      title: 'Un stand. Tous les robots. Un seul développeur.',
      paragraphs: [
        `J'ai tenu le stand de KM-RoBoTa à l'AI Summit, à Palexpo, Genève. Chaque robot exposé
         tournait sur du logiciel que j'ai écrit, y compris notre robot phare, <em>STAR</em>, un
         plésiosaure robotique.`,
        `J'ai présenté l'entreprise aux visiteurs et, côté logiciel des robots, j'étais toute
         l'équipe à la fois : <em>sysadmin</em> pour garder les machines en marche,
         <em>opérateur</em> pour piloter les robots en direct, et <em>vendeur</em> pour expliquer
         ce qu'ils savaient faire.`,
      ],
      stack: ['Pitch', 'Sysadmin', 'Pilotage', 'Vente'],
    },

    xiao: {
      label: ['Firmware', 'XIAO', 'no-std', 'RTIC'],
      title: 'De la batterie à chaque actionneur.',
      paragraphs: [
        `Au plus près du matériel : sur des microcontrôleurs Seeed <em>XIAO</em>, j'ai écrit le
         firmware qui gère la façon dont la batterie du robot alimente ses capteurs et ses
         actionneurs, en <em>Rust no-std</em> sur le framework <em>RTIC</em>.`,
        `Rien de tel n'existait en Rust, alors tout est écrit de zéro, de l'accès bare-metal au
         matériel jusqu'aux tâches RTIC qui pilotent la distribution d'énergie.`,
      ],
      stack: ['no-std', 'RTIC', 'XIAO ESP32-C3', 'Distribution d\'énergie'],
      viewer: {
        ariaLabel: 'Carte Seeed XIAO ESP32-C3 en rotation ; la faire glisser pour la tourner',
        modesLabel: 'Vue',
        modes: { ascii: 'ASCII', render: 'Rendu' },
        hint: 'Glisser pour tourner',
      },
      silkscreen: { brand: 'seeed studio', model: 'XIAO ESP32C3' },
    },
  },
});
