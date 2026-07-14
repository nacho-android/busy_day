import type { LocationDefinition, MusicCueId } from '../types/game';

type LocationBackgroundKey = NonNullable<LocationDefinition['backgroundKey']>;

export const BACKGROUND_ASSETS = {
  titleArt: 'backgrounds/title.webp',
  facilityHub: 'backgrounds/facility_hub.webp',
  carPark: 'backgrounds/car_park.webp',
  cathLab: 'backgrounds/cath_lab.webp',
  teaRoom: 'backgrounds/tea_room.webp',
  pigHousing: 'backgrounds/pig_housing.webp',
  feedStore: 'backgrounds/feed-store.webp',
  sheepScales: 'backgrounds/sheep-scales.webp',
  baboonWing: 'backgrounds/baboon-wing.webp',
  prepRoom: 'backgrounds/procedure-prep.webp',
  coffeeShop: 'backgrounds/coffee-shop.webp',
} as const satisfies Record<'titleArt' | LocationBackgroundKey, string>;

export const MUSIC_ASSETS = {
  title: 'audio/title_noir.wav',
  facility: 'audio/facility_pulse.wav',
  animals: 'audio/animal_wing.wav',
  cath: 'audio/cath_tension.wav',
  carpark: 'audio/rain_carpark.wav',
  finale: 'audio/coffee_finale.wav',
} as const satisfies Record<MusicCueId, string>;

export const SFX_ASSETS = {
  focus: 'audio/ui_focus.wav',
  confirm: 'audio/ui_confirm.wav',
  back: 'audio/ui_back.wav',
  use: 'audio/interaction_use.wav',
  door: 'audio/door_hiss.wav',
  latch: 'audio/door_latch.wav',
  feed: 'audio/feed_scoop.wav',
  sample: 'audio/sample_vial.wav',
  objective: 'audio/objective_update.wav',
  success: 'audio/success_sting.wav',
  failure: 'audio/failure_sting.wav',
  horn: 'audio/car_horn.wav',
  pig: 'audio/animal_pig_grunt.wav',
  sheep: 'audio/animal_sheep_bleat.wav',
  baboon: 'audio/animal_baboon_call.wav',
  stepTile: 'audio/footstep_tile_a.wav',
  stepWet: 'audio/footstep_tile_b.wav',
  machine: 'audio/machine_beep.wav',
  coffee: 'audio/coffee_pour.wav',
  transition: 'audio/transition_whoosh.wav',
} as const;

/**
 * Browser-optimised dialogue portraits. Character definitions reference these
 * paths, so replacing portrait art never requires changes in GameUI.
 */
export const PORTRAIT_ASSETS = {
  mel: 'portraits/mel.webp',
  josh: 'portraits/josh.webp',
  sally: 'portraits/sally.webp',
  juan: 'portraits/juan.webp',
  alan: 'portraits/alan.webp',
  dhanya: 'portraits/dhanya.webp',
  ross: 'portraits/ross.webp',
  wayne: 'portraits/wayne.webp',
} as const;

export type SfxCue = keyof typeof SFX_ASSETS;

export const RUNTIME_ASSET_PATHS = [
  ...Object.values(BACKGROUND_ASSETS),
  ...Object.values(MUSIC_ASSETS),
  ...Object.values(SFX_ASSETS),
  ...Object.values(PORTRAIT_ASSETS),
] as const;
