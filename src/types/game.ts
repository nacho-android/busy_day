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

export interface CharacterVisualDefinition {
  id: string;
  suit: number;
  suitHighlight: number;
  skin: number;
  hair: number;
  accent: number;
  hairStyle: 'pony' | 'cap' | 'short' | 'bald' | 'grey' | 'long';
  glasses: boolean;
  facialHair: boolean;
  displayScale: number;
  colliderRadius: number;
  portraitGradient: readonly [string, string];
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
  schemaVersion: 2;
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
  expression?: 'neutral' | 'amused' | 'concerned' | 'annoyed';
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
  approachExit(id: string): 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | null;
  setMeters(partial: Partial<PlayerMeters>): void;
}

declare global {
  interface Window {
    __busyDayTest?: BusyDayTestApi;
  }
}
