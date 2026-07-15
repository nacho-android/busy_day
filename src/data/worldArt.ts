import type { InteractionDefinition } from '../types/game';

export const WORLD_SPRITE_SHEETS = {
  animals: { key: 'world-animals', path: 'creatures/animals-atlas.webp', frameWidth: 160, frameHeight: 128 },
  trolleys: { key: 'world-trolleys', path: 'props/trolleys-atlas.webp', frameWidth: 240, frameHeight: 180 },
  vehicles: { key: 'world-vehicles', path: 'vehicles/vehicles-atlas.webp', frameWidth: 256, frameHeight: 160 },
  facility: { key: 'world-facility-props', path: 'props/facility-props-atlas.webp', frameWidth: 192, frameHeight: 160 },
} as const;

export type WorldSpriteSheetId = keyof typeof WORLD_SPRITE_SHEETS;
export type WorldArtMotion = 'animal' | 'trolley' | 'vehicle' | 'machine' | 'board' | 'steam' | 'prop';

export interface WorldArtDefinition {
  sheet: WorldSpriteSheetId;
  idleFrames: readonly number[];
  actionFrames: readonly number[];
  movementFrames?: readonly number[];
  displayScale: number;
  originY?: number;
  motion: WorldArtMotion;
}

const facility = (frame: number, displayScale: number, motion: WorldArtMotion = 'prop'): WorldArtDefinition => ({
  sheet: 'facility', idleFrames: [frame], actionFrames: [frame], displayScale, originY: .84, motion,
});

/**
 * Facility machines retain their original generated frame and add two
 * machine-specific status frames in the lower half of the runtime atlas.
 * Standby frames occupy 20..29 and active/confirmed frames 30..39.
 */
const machine = (frame: number, stateSlot: number, displayScale: number): WorldArtDefinition => ({
  sheet: 'facility',
  idleFrames: [frame, 20 + stateSlot],
  actionFrames: [30 + stateSlot, 20 + stateSlot],
  displayScale,
  originY: .84,
  motion: 'machine',
});

const animal = (row: number, scale: number): WorldArtDefinition => ({
  sheet: 'animals', idleFrames: [row * 4, row * 4 + 1], movementFrames: [row * 4 + 2, row * 4], actionFrames: [row * 4 + 3, row * 4 + 1], displayScale: scale, originY: .88, motion: 'animal',
});

const trolley = (row: number, scale: number): WorldArtDefinition => ({
  sheet: 'trolleys', idleFrames: [row * 3], movementFrames: [row * 3 + 1, row * 3 + 2], actionFrames: [row * 3 + 2, row * 3 + 1], displayScale: scale, originY: .82, motion: 'trolley',
});

const vehicle = (row: number): WorldArtDefinition => ({
  sheet: 'vehicles', idleFrames: [row * 3], movementFrames: [row * 3 + 1, row * 3 + 2], actionFrames: [row * 3 + 1, row * 3 + 2], displayScale: .56, originY: .78, motion: 'vehicle',
});

const EXPLICIT_ART: Readonly<Record<string, WorldArtDefinition>> = {
  tea_kettle: facility(0, .48, 'prop'),
  route_console: machine(1, 0, .58),
  industrial_fan: machine(2, 1, .58),
  livestock_scale: machine(3, 2, .72),
  scale_readout: machine(4, 3, .5),
  security_panel: machine(5, 4, .5),
  pig_prep_station: machine(6, 5, .68),
  anaesthesia_console: machine(7, 6, .62),
  cath_support: machine(8, 7, .6),
  heart_monitor: machine(9, 8, .66),
  shift_board: facility(10, .6, 'board'),
  hall_map: facility(11, .55, 'board'),
  coffee_menu: facility(12, .5, 'board'),
  early_coffee: machine(13, 9, .48),
  juan_coffee: facility(14, .45, 'prop'),
  coffee_steam: facility(15, .5, 'steam'),
  mystery_bin: facility(16, .58, 'prop'),
  dinosaur_toy: facility(17, .46, 'prop'),
  spill_kit: facility(18, .54, 'prop'),
  park_cooler: facility(19, .58, 'prop'),
  hay_cart: trolley(0, .62),
  feed_cart: trolley(1, .6),
  pig_trolley: trolley(3, .65),
  cath_handover: trolley(3, .62),
  shearing_station: animal(1, .54),
  car_sally: vehicle(0),
  car_alan: vehicle(1),
  car_vu: vehicle(2),
  car_max: vehicle(3),
  car_juan: vehicle(4),
  car_wayne: vehicle(5),
};

export const THANH_CAR_ART = vehicle(6);

export function getWorldArt(interaction: InteractionDefinition): WorldArtDefinition {
  const explicit = EXPLICIT_ART[interaction.id];
  if (explicit) return explicit;
  if (interaction.id.startsWith('pig_')) return animal(0, .55);
  if (interaction.id.startsWith('sheep_')) return animal(1, .55);
  if (interaction.id.startsWith('baboon_')) return animal(2, .58);
  // Every production interaction has explicit or category art. This final
  // fallback is the route console, keeping an interaction visible if future
  // content is added before its bespoke frame is generated.
  return facility(1, .52, interaction.prop === 'board' ? 'board' : 'prop');
}
