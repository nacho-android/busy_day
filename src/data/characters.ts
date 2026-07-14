import type {
  CharacterAnimationDefinition,
  CharacterAnimationName,
  CharacterDefinition,
  CharacterVectorAppearance,
  CharacterVisualDefinition,
} from '../types/game';
import { PORTRAIT_ASSETS } from './assets';

export const CHARACTERS: Record<'mel' | 'josh', CharacterDefinition> = {
  mel: {
    id: 'mel',
    name: 'Mel',
    role: 'Rapid multitasker',
    description: 'Fast acceleration and crisp interactions; heavy trolley work costs a little more stamina.',
    stats: { moveSpeed: 220, sprintSpeed: 330, acceleration: 1320, deceleration: 1680, maxStamina: 100, interactionRate: 1.18, carryFactor: 0.9, stressResistance: 1 },
  },
  josh: {
    id: 'josh',
    name: 'Josh',
    role: 'Solid procedure support',
    description: 'Steadier on his feet, stronger with carts and calmer when the timetable becomes theoretical.',
    stats: { moveSpeed: 196, sprintSpeed: 292, acceleration: 1080, deceleration: 1480, maxStamina: 118, interactionRate: 1.04, carryFactor: 1.2, stressResistance: 1.13 },
  },
};

const still = { bobPixels: .65, legTravelPixels: 0, legSwingRadians: 0, armSwingRadians: .025, torsoSwayRadians: .006, headSwayRadians: .012, shadowPulse: .035 } as const;
const walk = { bobPixels: 2.5, legTravelPixels: 4.5, legSwingRadians: .06, armSwingRadians: .27, torsoSwayRadians: .012, headSwayRadians: .018, shadowPulse: .035 } as const;
const gesture = { bobPixels: .4, legTravelPixels: 0, legSwingRadians: 0, armSwingRadians: 1.02, torsoSwayRadians: .018, headSwayRadians: .025, shadowPulse: .02 } as const;

const animation = (
  frames: readonly (number | string)[],
  frameRate: number,
  repeat: number,
  motion: CharacterAnimationDefinition['motion'],
  yoyo = false,
): CharacterAnimationDefinition => ({ frames, frameRate, repeat, motion, yoyo });

const PAPER_DOLL_ANIMATIONS: Readonly<Record<CharacterAnimationName, CharacterAnimationDefinition>> = {
  idle: animation([0, 1, 2, 1], 4, -1, still),
  walkLeft: animation([0, 1, 2, 3], 8, -1, walk),
  walkRight: animation([0, 1, 2, 3], 8, -1, walk),
  walkToward: animation([0, 1, 2, 3], 8, -1, walk),
  walkAway: animation([0, 1, 2, 3], 8, -1, walk),
  interaction: animation([0, 1, 2, 1, 0], 12, 0, gesture),
  contextual: animation([0, 1, 2, 1, 0], 7, 0, gesture),
  hit: animation([0, 1, 2, 1, 0], 14, 0, gesture),
};

const PORTRAIT_PATHS: Readonly<Record<string, string>> = PORTRAIT_ASSETS;

function paperDollVisual(
  id: string,
  vector: CharacterVectorAppearance,
  gradient: readonly [string, string],
  displayScale: number,
  radius: number,
  voiceProfile = 'measured-clinical',
): CharacterVisualDefinition {
  const portraitPath = PORTRAIT_PATHS[id];
  return {
    id,
    renderer: 'vector-paper-doll',
    assets: {},
    vector,
    animations: PAPER_DOLL_ANIMATIONS,
    displayScale,
    spriteOrigin: { x: .5, y: 1 },
    footprint: { radius, bodyWidth: radius * 2, bodyHeight: 88, originY: 7 },
    portrait: {
      mode: portraitPath ? 'image' : 'gradient-initials',
      gradient,
      ...(portraitPath ? { asset: { key: `portrait-${id}`, path: portraitPath } } : {}),
      expressions: {
        neutral: {},
        amused: { cssFilter: 'saturate(1.18) brightness(1.06)' },
        concerned: { cssFilter: 'saturate(.78) brightness(.94)' },
        annoyed: { cssFilter: 'saturate(1.28) contrast(1.12)' },
      },
    },
    voice: { profile: voiceProfile, volume: .48, playbackRate: 1, cadenceMs: 62 },
  };
}

const BASE_VISUALS: Record<string, CharacterVisualDefinition> = {
  mel: paperDollVisual('mel', { suit: 0x287da8, suitHighlight: 0x5db7d4, skin: 0xe8b58e, hair: 0x6a3f31, accent: 0x7fe0d4, hairStyle: 'pony', glasses: true, facialHair: false }, ['#83eadf', '#276f78'], 1, 18, 'quick-warm-alto'),
  josh: paperDollVisual('josh', { suit: 0x315c9a, suitHighlight: 0x799dd5, skin: 0xc98b65, hair: 0x382a22, accent: 0x9ab9ff, hairStyle: 'cap', glasses: true, facialHair: true }, ['#9bbcff', '#3e4f91'], 1.02, 19, 'steady-dry-baritone'),
  sally: paperDollVisual('sally', { suit: 0x376c6b, suitHighlight: 0x72b9ac, skin: 0xe0a981, hair: 0x28201d, accent: 0x8fead8, hairStyle: 'pony', glasses: true, facialHair: false }, ['#8fead8', '#315d6d'], .95, 17, 'bright-clinical-alto'),
  juan: paperDollVisual('juan', { suit: 0x4c7fa8, suitHighlight: 0x9fd5ff, skin: 0xb87c58, hair: 0x31241f, accent: 0x9fd5ff, hairStyle: 'short', glasses: true, facialHair: false }, ['#9fd5ff', '#345786'], .98, 17, 'calm-wry-tenor'),
  alan: paperDollVisual('alan', { suit: 0x947149, suitHighlight: 0xffcd8c, skin: 0xdca37b, hair: 0x34281f, accent: 0xffcd8c, hairStyle: 'short', glasses: false, facialHair: true }, ['#ffcd8c', '#794a35'], 1, 18, 'assured-low-tenor'),
  ross: paperDollVisual('ross', { suit: 0x62758a, suitHighlight: 0x9ab0c2, skin: 0xd6a681, hair: 0xa9a39d, accent: 0xd5f08b, hairStyle: 'grey', glasses: false, facialHair: true }, ['#d5f08b', '#52657a'], 1.02, 19, 'deliberate-philosophical'),
  wayne: paperDollVisual('wayne', { suit: 0x4b5948, suitHighlight: 0x8ba286, skin: 0xd19a72, hair: 0x5b493e, accent: 0xff8a9b, hairStyle: 'bald', glasses: false, facialHair: true }, ['#ff9ba8', '#4c6152'], 1.04, 19, 'precise-irritated-baritone'),
  thanh: paperDollVisual('thanh', { suit: 0x9a3d51, suitHighlight: 0xff7f8e, skin: 0xd6a278, hair: 0x22252b, accent: 0xff7f8e, hairStyle: 'short', glasses: false, facialHair: false }, ['#ff7f8e', '#642639'], 1, 18, 'energetic-staccato'),
};

const PALETTES = [
  [0x556e8a, 0x91b6d5, 0x9fd5ff], [0x675879, 0xb99ddb, 0xd5bcff], [0x4f725f, 0x89b99b, 0x8cd8be],
  [0x5e668f, 0x91a5d3, 0x95b4ff], [0x775f7d, 0xbda1c4, 0xf0c8ff], [0x536e82, 0x90b7ca, 0xa8dcff],
  [0x805c70, 0xc68ca8, 0xffb8d5], [0x68704d, 0xaab579, 0xd8e5a5], [0x486b87, 0x84abc5, 0xa0d1ff],
  [0x806755, 0xb89b84, 0xf8d2af], [0x527082, 0x8cb5c9, 0xbde1ff], [0x567562, 0x8eb89c, 0xc6f0d1],
  [0x5c5b7a, 0x9e9cc1, 0xd8d7ff], [0x697451, 0xaebc86, 0xe2f0b1], [0x7b644e, 0xb19574, 0xffd9a6],
];

export const CHARACTER_VISUALS: Record<string, CharacterVisualDefinition> = { ...BASE_VISUALS };

['xing', 'anugra', 'luther', 'tony', 'vu', 'urja', 'dhanya', 'poonam', 'max', 'leila', 'erin', 'sam', 'mitch', 'james', 'eddy', 'pierre'].forEach((id, index) => {
  const palette = PALETTES[index % PALETTES.length] ?? PALETTES[0]!;
  CHARACTER_VISUALS[id] = paperDollVisual(id, {
    suit: palette[0]!, suitHighlight: palette[1]!, skin: index % 3 === 0 ? 0xd29a73 : index % 3 === 1 ? 0xb97955 : 0xe1ac83,
    hair: index % 4 === 0 ? 0x29231f : 0x4a3429, accent: palette[2]!, hairStyle: index % 5 === 0 ? 'long' : 'short',
    glasses: index % 3 === 0, facialHair: index % 4 === 1,
  }, [`#${palette[2]!.toString(16).padStart(6, '0')}`, `#${palette[0]!.toString(16).padStart(6, '0')}`], .94 + (index % 3) * .03, 17);
});

export function getVisual(id: string): CharacterVisualDefinition {
  return CHARACTER_VISUALS[id] ?? CHARACTER_VISUALS['james']!;
}

export function getVisualForSpeaker(speaker: string): CharacterVisualDefinition | null {
  const id = speaker.trim().split(/\s+/)[0]?.toLowerCase();
  return id && CHARACTER_VISUALS[id] ? CHARACTER_VISUALS[id] : null;
}
