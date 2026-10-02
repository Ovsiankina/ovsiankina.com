// KM-RoBoTa section: every piece of text on the page.
// Strings may hold a little HTML: <em> lights a word up in white. The blinking cursor is added
// automatically after the last paragraph of each block.

export default {
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
    label: ['AI Summit', 'Palexpo, Genève'],
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
};
