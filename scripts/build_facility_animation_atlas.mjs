/* global Buffer, console */
import { readFile, rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 160;
const BASE_COLUMNS = 5;
const BASE_ROWS = 4;
const STATE_COLUMNS = 5;

const input = resolve(process.argv[2] ?? 'public/assets/props/facility-props-atlas.webp');
const output = resolve(process.argv[3] ?? input);
const temporaryOutput = `${output}.tmp.webp`;

const machineFrames = [
  { id: 'route-console', base: 1 },
  { id: 'industrial-fan', base: 2 },
  { id: 'livestock-scale', base: 3 },
  { id: 'scale-readout', base: 4 },
  { id: 'security-panel', base: 5 },
  { id: 'pig-prep', base: 6 },
  { id: 'anaesthesia', base: 7 },
  { id: 'cath-support', base: 8 },
  { id: 'heart-monitor', base: 9 },
  { id: 'coffee-machine', base: 13 },
];

function glowFilter() {
  return '<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
}

function consoleOverlay(id, state) {
  const cyan = state === 'standby' ? '#55dddf' : '#86ffd0';
  const accent = state === 'standby' ? '#ffc45d' : '#59ff8d';
  const magenta = state === 'standby' ? '#b45aff' : '#ff70c9';
  let marks = '';

  switch (id) {
    case 'route-console':
      marks = state === 'standby'
        ? `<path d="M48 50 L68 43 L86 52 L105 39 L128 47" fill="none" stroke="${cyan}" stroke-width="2"/><circle cx="48" cy="50" r="3" fill="${accent}"/><circle cx="86" cy="52" r="3" fill="${cyan}"/><circle cx="128" cy="47" r="3" fill="${magenta}"/>`
        : `<path d="M45 58 L63 48 L81 55 L102 43 L126 51 L143 39" fill="none" stroke="${accent}" stroke-width="2.5"/><circle cx="45" cy="58" r="3" fill="${accent}"/><circle cx="81" cy="55" r="3" fill="${accent}"/><circle cx="126" cy="51" r="3" fill="${accent}"/><circle cx="143" cy="39" r="3.5" fill="#ffffff"/>`;
      break;
    case 'industrial-fan': {
      const rotation = state === 'standby' ? 0 : 38;
      marks = `<g transform="rotate(${rotation} 96 80)" opacity=".72"><path d="M96 80 C100 57 112 49 120 54 C125 62 113 75 96 80Z" fill="${cyan}"/><path d="M96 80 C119 84 127 96 121 104 C112 108 101 96 96 80Z" fill="${magenta}"/><path d="M96 80 C92 103 80 111 72 105 C68 97 80 85 96 80Z" fill="${cyan}"/><path d="M96 80 C73 76 65 64 71 56 C79 51 91 64 96 80Z" fill="${magenta}"/><circle cx="96" cy="80" r="6" fill="${accent}"/></g>`;
      break;
    }
    case 'livestock-scale':
      marks = state === 'standby'
        ? `<rect x="139" y="18" width="34" height="14" rx="2" fill="#062525" opacity=".82"/><path d="M143 25 H151 M155 25 H163 M167 25 H170" stroke="${cyan}" stroke-width="2"/>`
        : `<rect x="139" y="18" width="34" height="14" rx="2" fill="#05291c" opacity=".9"/><path d="M143 25 H149 L152 21 L156 29 L160 24 H170" fill="none" stroke="${accent}" stroke-width="2"/>`;
      break;
    case 'scale-readout':
      marks = state === 'standby'
        ? `<rect x="46" y="39" width="101" height="28" rx="3" fill="#031d24" opacity=".76"/><path d="M53 54 H67 M73 54 H87 M93 54 H107 M113 54 H129 M135 54 H141" stroke="${cyan}" stroke-width="3"/>`
        : `<rect x="46" y="39" width="101" height="28" rx="3" fill="#042819" opacity=".82"/><path d="M53 55 H65 L70 47 L76 61 L83 51 L91 55 H105 L111 49 L117 60 L124 52 H141" fill="none" stroke="${accent}" stroke-width="2"/>`;
      break;
    case 'security-panel':
      marks = state === 'standby'
        ? `<circle cx="62" cy="47" r="5" fill="#ff5f55"/><circle cx="96" cy="47" r="5" fill="${accent}"/><circle cx="130" cy="47" r="5" fill="${cyan}" opacity=".55"/>`
        : `<circle cx="62" cy="47" r="5" fill="${accent}"/><circle cx="96" cy="47" r="5" fill="${accent}"/><circle cx="130" cy="47" r="5" fill="#c5ffdf"/><path d="M58 75 V94 M92 75 V94 M126 75 V94" stroke="${cyan}" stroke-width="3"/>`;
      break;
    case 'pig-prep':
      marks = state === 'standby'
        ? `<rect x="56" y="58" width="62" height="6" rx="3" fill="#082827" opacity=".8"/><path d="M60 61 H75 M80 61 H94 M99 61 H113" stroke="${cyan}" stroke-width="3"/>`
        : `<rect x="56" y="58" width="62" height="6" rx="3" fill="#07301f" opacity=".86"/><path d="M60 61 H113" stroke="${accent}" stroke-width="3"/><circle cx="126" cy="61" r="4" fill="${accent}"/>`;
      break;
    case 'anaesthesia':
    case 'cath-support': {
      const offsetX = id === 'anaesthesia' ? 0 : 2;
      marks = state === 'standby'
        ? `<rect x="${67 + offsetX}" y="35" width="55" height="39" rx="3" fill="#031d24" opacity=".76"/><path d="M72 56 H82 L87 47 L94 65 L100 53 H116" fill="none" stroke="${cyan}" stroke-width="2"/>`
        : `<rect x="${67 + offsetX}" y="35" width="55" height="39" rx="3" fill="#042819" opacity=".82"/><path d="M72 57 H80 L85 50 L91 64 L98 48 L105 58 H117" fill="none" stroke="${accent}" stroke-width="2.4"/><circle cx="115" cy="42" r="2.5" fill="#ffffff"/>`;
      break;
    }
    case 'heart-monitor': {
      const wave = state === 'standby'
        ? 'M0 8 H8 L12 3 L16 13 L21 7 H35'
        : 'M0 8 H6 L10 5 L14 12 L18 2 L23 9 H35';
      const colour = state === 'standby' ? cyan : accent;
      marks = [
        [30, 34], [78, 34], [126, 34], [30, 79], [78, 79], [126, 79],
      ].map(([x, y]) => `<path d="${wave}" transform="translate(${x} ${y})" fill="none" stroke="${colour}" stroke-width="1.7"/>`).join('');
      break;
    }
    case 'coffee-machine':
      marks = state === 'standby'
        ? `<path d="M86 51 V45 A8 8 0 0 1 102 45 V51" fill="none" stroke="#ff655e" stroke-width="3"/><rect x="83" y="51" width="22" height="20" rx="3" fill="#541517" opacity=".9"/><circle cx="94" cy="60" r="2.5" fill="#ff9b70"/>`
        : `<path d="M86 51 V45 A8 8 0 0 1 102 45" fill="none" stroke="${accent}" stroke-width="3"/><rect x="83" y="51" width="22" height="20" rx="3" fill="#123820" opacity=".9"/><path d="M88 61 L92 65 L101 56" fill="none" stroke="${accent}" stroke-width="2.5"/>`;
      break;
  }

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}">${glowFilter()}<g filter="url(#glow)" opacity=".95">${marks}</g></svg>`);
}

async function stateFrame(baseAtlas, definition, state) {
  const left = (definition.base % BASE_COLUMNS) * FRAME_WIDTH;
  const top = Math.floor(definition.base / BASE_COLUMNS) * FRAME_HEIGHT;
  const frame = await sharp(baseAtlas)
    .extract({ left, top, width: FRAME_WIDTH, height: FRAME_HEIGHT })
    .png()
    .toBuffer();
  return sharp(frame)
    .composite([{ input: consoleOverlay(definition.id, state), blend: 'screen' }])
    .png()
    .toBuffer();
}

async function buildStateRows(baseAtlas, state) {
  const frames = await Promise.all(machineFrames.map((definition) => stateFrame(baseAtlas, definition, state)));
  return sharp({
    create: {
      width: STATE_COLUMNS * FRAME_WIDTH,
      height: 2 * FRAME_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(frames.map((frame, index) => ({
    input: frame,
    left: (index % STATE_COLUMNS) * FRAME_WIDTH,
    top: Math.floor(index / STATE_COLUMNS) * FRAME_HEIGHT,
  }))).png().toBuffer();
}

const source = await readFile(input);
const metadata = await sharp(source).metadata();
if ((metadata.width ?? 0) < BASE_COLUMNS * FRAME_WIDTH || (metadata.height ?? 0) < BASE_ROWS * FRAME_HEIGHT) {
  throw new Error(`Expected at least a ${BASE_COLUMNS * FRAME_WIDTH}x${BASE_ROWS * FRAME_HEIGHT} facility atlas, got ${metadata.width}x${metadata.height}.`);
}

const baseAtlas = await sharp(source)
  .extract({ left: 0, top: 0, width: BASE_COLUMNS * FRAME_WIDTH, height: BASE_ROWS * FRAME_HEIGHT })
  .png()
  .toBuffer();
const standbyRows = await buildStateRows(baseAtlas, 'standby');
const activeRows = await buildStateRows(baseAtlas, 'active');

await sharp({
  create: {
    width: BASE_COLUMNS * FRAME_WIDTH,
    height: 8 * FRAME_HEIGHT,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
}).composite([
  { input: baseAtlas, left: 0, top: 0 },
  { input: standbyRows, left: 0, top: BASE_ROWS * FRAME_HEIGHT },
  { input: activeRows, left: 0, top: 6 * FRAME_HEIGHT },
]).webp({ quality: 90, alphaQuality: 96, effort: 6 }).toFile(temporaryOutput);

await unlink(output).catch(() => undefined);
await rename(temporaryOutput, output);
console.log(`Built animated facility atlas: ${output} (960x1280, 40 frames)`);
