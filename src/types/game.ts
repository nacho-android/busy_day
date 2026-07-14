export type LocationId =
  | 'teaRoom'
  | 'mainHall'
  | 'feedStore'
  | 'pigHousing'
  | 'sheepScales'
  | 'baboonWing'
  | 'prepRoom'
  | 'cathLab'
  | 'carPark'
  | 'coffeeShop';

export type CharacterId = 'mel' | 'josh';
export type Direction = 'left' | 'right' | 'toward' | 'away';
export type DialogueExpression = 'neutral' | 'amused' | 'concerned' | 'annoyed';
export type CharacterRendererMode = 'vector-paper-doll' | 'sprite-sheet' | 'texture-atlas';
export type CharacterAnimationName =
  | 'idle'
  | 'walkLeft'
  | 'walkRight'
  | 'walkToward'
  | 'walkAway'
  | 'interaction'
  | 'contextual'
  | 'hit';
export type InteractionVerb = 'Talk' | 'Inspect' | 'Use' | 'Pick up' | 'Open' | 'Operate' | 'Give' | 'Enter' | 'Exit';
export type FailureKind = 'health' | 'wayne';
export type Rank = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export interface SpawnDefinition extends Point {
  id: string;
  facing: Direction;
}

export interface ExitDefinition extends Rect {
  id: string;
  label: string;
  destination: LocationId;
  destinationSpawn: string;
  facing: Direction;
  requiredFlag?: string;
  lockedLine?: string;
}

export interface ObstacleDefinition extends Rect {
  id: string;
  depthBias?: number;
}

export interface InteractionDefinition extends Point {
  id: string;
  label: string;
  verb: InteractionVerb;
  radius: number;
  holdMs?: number;
  optionalLine?: string;
  requiresFlag?: string;
  missingFlagLine?: string;
  prop: 'board' | 'cart' | 'animal' | 'machine' | 'trolley' | 'car' | 'person' | 'door' | 'coffee' | 'misc';
}

export interface NpcPlacement extends Point {
  id: string;
  name: string;
  role: string;
  line: string;
  visualId: string;
  ambient?: NpcAmbientDefinition;
}

export interface NpcAmbientDefinition {
  mode: 'idle' | 'patrol';
  waypoints?: readonly Point[];
  speed?: number;
  pauseMs?: number;
  awarenessRadius?: number;
  reaction?: 'wave' | 'inspect' | 'startle';
}

/** A crop from the scene artwork redrawn above actors for true depth occlusion. */
export interface ForegroundLayerDefinition extends Rect {
  id: string;
  depth: number;
  alpha?: number;
  textureKey?: string;
}

export interface LocationDefinition {
  id: LocationId;
  name: string;
  subtitle: string;
  theme: 'social' | 'corridor' | 'storage' | 'animal' | 'clinical' | 'exterior' | 'coffee';
  backgroundKey?:
    | 'facilityHub'
    | 'carPark'
    | 'cathLab'
    | 'teaRoom'
    | 'pigHousing'
    | 'feedStore'
    | 'sheepScales'
    | 'baboonWing'
    | 'prepRoom'
    | 'coffeeShop';
  bounds: Rect;
  spawns: readonly SpawnDefinition[];
  exits: readonly ExitDefinition[];
  obstacles: readonly ObstacleDefinition[];
  interactions: readonly InteractionDefinition[];
  npcs: readonly NpcPlacement[];
  foregroundLayers?: readonly ForegroundLayerDefinition[];
  music: MusicCueId;
  perspective: { farY: number; nearY: number; farScale: number; nearScale: number };
}

export interface ObjectiveDefinition {
  id: string;
  act: number;
  title: string;
  description: string;
  hint: string;
  location: LocationId;
  targets: readonly string[];
  reward: { xp: number; coins: number };
  grantsFlags?: readonly string[];
  kit?: readonly string[];
  checkpoint?: boolean;
}

export interface CharacterStats {
  moveSpeed: number;
  sprintSpeed: number;
  acceleration: number;
  deceleration: number;
  maxStamina: number;
  interactionRate: number;
  carryFactor: number;
  stressResistance: number;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  role: string;
  description: string;
  stats: CharacterStats;
}

export interface CharacterAssetReference {
  key: string;
  path: string;
}

export interface CharacterAtlasReference extends CharacterAssetReference {
  dataPath: string;
}

export interface CharacterAssetSet {
  /** Required when renderer is sprite-sheet. */
  image?: CharacterAssetReference;
  /** Required when renderer is texture-atlas. */
  atlas?: CharacterAtlasReference;
}

export interface CharacterFrameLayout {
  frameWidth: number;
  frameHeight: number;
  startFrame?: number;
  endFrame?: number;
  margin?: number;
  spacing?: number;
}

export interface CharacterMotionDefinition {
  bobPixels: number;
  legTravelPixels: number;
  legSwingRadians: number;
  armSwingRadians: number;
  torsoSwayRadians: number;
  headSwayRadians: number;
  shadowPulse: number;
}

export interface CharacterAnimationDefinition {
  /** Numeric sprite-sheet frames, atlas frame names, or logical vector poses. */
  frames: readonly (number | string)[];
  frameRate: number;
  repeat: number;
  yoyo?: boolean;
  motion: CharacterMotionDefinition;
}

export interface CharacterVectorAppearance {
  suit: number;
  suitHighlight: number;
  skin: number;
  hair: number;
  accent: number;
  hairStyle: 'pony' | 'cap' | 'short' | 'bald' | 'grey' | 'long';
  glasses: boolean;
  facialHair: boolean;
}

export interface CharacterCollisionFootprint {
  radius: number;
  bodyWidth: number;
  bodyHeight: number;
  originY: number;
}

export interface CharacterPortraitExpressionDefinition {
  asset?: CharacterAssetReference;
  frame?: number | string;
  cssFilter?: string;
}

export interface CharacterPortraitDefinition {
  mode: 'gradient-initials' | 'image' | 'atlas-frame';
  gradient: readonly [string, string];
  asset?: CharacterAssetReference;
  expressions: Readonly<Partial<Record<DialogueExpression, CharacterPortraitExpressionDefinition>>>;
}

export interface CharacterVoiceDefinition {
  profile: string;
  talkSoundKey?: string;
  interactionSoundKey?: string;
  volume: number;
  playbackRate: number;
  cadenceMs: number;
}

export interface CharacterVisualDefinition {
  id: string;
  renderer: CharacterRendererMode;
  assets: CharacterAssetSet;
  frameLayout?: CharacterFrameLayout;
  vector?: CharacterVectorAppearance;
  animations: Readonly<Record<CharacterAnimationName, CharacterAnimationDefinition>>;
  displayScale: number;
  spriteOrigin: Readonly<Point>;
  footprint: CharacterCollisionFootprint;
  portrait: CharacterPortraitDefinition;
  voice: CharacterVoiceDefinition;
}

export interface PlayerMeters {
  health: number;
  stamina: number;
  stress: number;
  wayne: number;
}

export interface RunState {
  runId: string;
  characterId: CharacterId;
  relaxed: boolean;
  startedAt: string;
  locationId: LocationId;
  spawnId: string;
  player: Point;
  facing: Direction;
  objectiveIndex: number;
  completedTargets: string[];
  completedObjectives: string[];
  flags: string[];
  meters: PlayerMeters;
  xp: number;
  coins: number;
  level: number;
  startedAtMinutes: number;
  elapsedSeconds: number;
  checkpointObjectiveIndex: number;
  failure: FailureKind | null;
  finished: boolean;
}

export interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  typewriter: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  subtitles: boolean;
  textSize: 'normal' | 'large';
  handedness: 'left' | 'right';
  relaxed: boolean;
}

export interface ProfileState {
  bestRank: Rank | null;
  bestCoins: number;
  completedRuns: number;
}

export interface SaveEnvelope {
  schemaVersion: 3;
  savedAt: string;
  settings: SettingsState;
  profile: ProfileState;
  activeRun: RunState | null;
}

export interface InteractionResult {
  success: boolean;
  message: string;
  objectiveCompleted: boolean;
  gameCompleted: boolean;
  dialogueKey?: string;
}

export interface DialogueChoice {
  label: string;
  response: string;
  effect?: 'wayneDown' | 'wayneUp' | 'stressDown';
}

export interface DialogueLine {
  speaker: string;
  text: string;
  expression?: DialogueExpression;
  choices?: readonly DialogueChoice[];
}

export type MusicCueId = 'title' | 'facility' | 'animals' | 'cath' | 'carpark' | 'finale';

export interface InputSnapshot {
  moveX: number;
  moveY: number;
  sprint: boolean;
  interact: boolean;
  dodge: boolean;
}

export interface BusyDayTestApi {
  getState(): RunState | null;
  getLocation(): LocationId | null;
  teleportToInteraction(id: string): boolean;
  completeCurrentTarget(): boolean;
  travelToObjective(): boolean;
  prepareExit(locationId: LocationId, exitId: string): boolean;
  approachExit(id: string): 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | null;
  setMeters(partial: Partial<PlayerMeters>): void;
  showDialogue(lines: readonly DialogueLine[]): void;
}

declare global {
  interface Window {
    __busyDayTest?: BusyDayTestApi;
  }
}
