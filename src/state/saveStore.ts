import type { ProfileState, RunState, SaveEnvelope, SettingsState } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { LOCATIONS } from '../data/locations';
import { OBJECTIVES } from '../data/story';

export const SAVE_KEY = 'busy_day_at_the_viv_v2_save';
export const SCHEMA_VERSION = 2 as const;

export const DEFAULT_SETTINGS: SettingsState = {
  musicVolume: 0.58,
  sfxVolume: 0.72,
  muted: false,
  typewriter: true,
  reducedMotion: false,
  highContrast: false,
  subtitles: true,
  textSize: 'normal',
  handedness: 'right',
  relaxed: false,
};

export const DEFAULT_PROFILE: ProfileState = { bestRank: null, bestCoins: 0, completedRuns: 0 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberIn(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? [...new Set(value)] : null;
}

function sanitizeRun(value: unknown): RunState | null {
  if (!isRecord(value)) return null;
  const characterId = value['characterId'];
  const locationId = value['locationId'];
  const player = value['player'];
  const meters = value['meters'];
  const completedTargets = stringArray(value['completedTargets']);
  const completedObjectives = stringArray(value['completedObjectives']);
  const flags = stringArray(value['flags']);
  if ((characterId !== 'mel' && characterId !== 'josh') || typeof locationId !== 'string' || !(locationId in LOCATIONS)) return null;
  if (!isRecord(player) || typeof player['x'] !== 'number' || typeof player['y'] !== 'number' || !Number.isFinite(player['x']) || !Number.isFinite(player['y'])) return null;
  if (!isRecord(meters) || !completedTargets || !completedObjectives || !flags) return null;
  if (typeof value['objectiveIndex'] !== 'number' || !Number.isInteger(value['objectiveIndex'])) return null;

  const location = LOCATIONS[locationId as keyof typeof LOCATIONS];
  const spawnId = typeof value['spawnId'] === 'string' && location.spawns.some((spawn) => spawn.id === value['spawnId'])
    ? value['spawnId']
    : location.spawns[0]?.id;
  if (!spawnId) return null;
  const facing = value['facing'];
  const safeFacing = facing === 'left' || facing === 'right' || facing === 'toward' || facing === 'away' ? facing : 'toward';
  const failure = value['failure'] === 'health' || value['failure'] === 'wayne' ? value['failure'] : null;
  const objectiveIndex = Math.max(0, Math.min(OBJECTIVES.length, value['objectiveIndex']));
  const knownObjectives = new Set(OBJECTIVES.map((objective) => objective.id));
  const knownTargets = new Set(OBJECTIVES.flatMap((objective) => [...objective.targets]));
  const maxStamina = CHARACTERS[characterId].stats.maxStamina;
  const completedPrefix = OBJECTIVES.slice(0, objectiveIndex);
  const currentTargets = OBJECTIVES[objectiveIndex]?.targets ?? [];
  const allowedTargets = new Set([...completedPrefix.flatMap((objective) => [...objective.targets]), ...currentTargets]);
  const coherentTargets = new Set(completedTargets.filter((target) => allowedTargets.has(target)));
  completedPrefix.forEach((objective) => objective.targets.forEach((target) => coherentTargets.add(target)));
  const coherentFlags = [...new Set(completedPrefix.flatMap((objective) => [...(objective.grantsFlags ?? [])]))];
  const coherentXp = completedPrefix.reduce((total, objective) => total + objective.reward.xp, 0);
  const coherentCoins = completedPrefix.reduce((total, objective) => total + objective.reward.coins, 0);
  const checkpointObjectiveIndex = completedPrefix.reduce((latest, objective, index) => objective.checkpoint ? index + 1 : latest, 0);
  const finished = objectiveIndex >= OBJECTIVES.length;

  return {
    runId: typeof value['runId'] === 'string' && value['runId'].length > 0 ? value['runId'] : `recovered-${Date.now()}`,
    characterId,
    relaxed: typeof value['relaxed'] === 'boolean' ? value['relaxed'] : false,
    startedAt: typeof value['startedAt'] === 'string' ? value['startedAt'] : new Date().toISOString(),
    locationId: location.id,
    spawnId,
    player: {
      x: numberIn(player['x'], location.spawns[0]?.x ?? 200, location.bounds.x + 20, location.bounds.x + location.bounds.width - 20),
      y: numberIn(player['y'], location.spawns[0]?.y ?? 360, location.bounds.y + 20, location.bounds.y + location.bounds.height - 20),
    },
    facing: safeFacing,
    objectiveIndex,
    completedTargets: [...coherentTargets].filter((target) => knownTargets.has(target)),
    completedObjectives: completedPrefix.map((objective) => objective.id).filter((objective) => knownObjectives.has(objective)),
    flags: coherentFlags,
    meters: {
      health: numberIn(meters['health'], 100, 0, 100),
      stamina: numberIn(meters['stamina'], maxStamina, 0, maxStamina),
      stress: numberIn(meters['stress'], 0, 0, 100),
      wayne: numberIn(meters['wayne'], 0, 0, 100),
    },
    xp: coherentXp,
    coins: coherentCoins,
    level: Math.min(4, [0, 40, 95, 165].filter((threshold) => coherentXp >= threshold).length),
    startedAtMinutes: numberIn(value['startedAtMinutes'], 405, 0, 1439),
    elapsedSeconds: numberIn(value['elapsedSeconds'], 0, 0, 10_000_000),
    checkpointObjectiveIndex,
    failure: finished ? null : failure,
    finished,
  };
}

export function sanitizeSettings(value: unknown): SettingsState {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };
  return {
    musicVolume: numberIn(value['musicVolume'], DEFAULT_SETTINGS.musicVolume, 0, 1),
    sfxVolume: numberIn(value['sfxVolume'], DEFAULT_SETTINGS.sfxVolume, 0, 1),
    muted: typeof value['muted'] === 'boolean' ? value['muted'] : DEFAULT_SETTINGS.muted,
    typewriter: typeof value['typewriter'] === 'boolean' ? value['typewriter'] : DEFAULT_SETTINGS.typewriter,
    reducedMotion: typeof value['reducedMotion'] === 'boolean' ? value['reducedMotion'] : DEFAULT_SETTINGS.reducedMotion,
    highContrast: typeof value['highContrast'] === 'boolean' ? value['highContrast'] : DEFAULT_SETTINGS.highContrast,
    subtitles: typeof value['subtitles'] === 'boolean' ? value['subtitles'] : DEFAULT_SETTINGS.subtitles,
    textSize: value['textSize'] === 'large' ? 'large' : 'normal',
    handedness: value['handedness'] === 'left' ? 'left' : 'right',
    relaxed: typeof value['relaxed'] === 'boolean' ? value['relaxed'] : DEFAULT_SETTINGS.relaxed,
  };
}

export function createEnvelope(settings: SettingsState = DEFAULT_SETTINGS, profile: ProfileState = DEFAULT_PROFILE, activeRun: RunState | null = null): SaveEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    settings: { ...settings },
    profile: { ...profile },
    activeRun: activeRun ? structuredClone(activeRun) : null,
  };
}

export function parseEnvelope(raw: string | null): SaveEnvelope {
  if (!raw) return createEnvelope();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return createEnvelope();
    const settings = sanitizeSettings(parsed['settings']);
    const profileValue = parsed['profile'];
    const profile: ProfileState = isRecord(profileValue) ? {
      bestRank: ['S', 'A', 'B', 'C', 'D'].includes(String(profileValue['bestRank'])) ? profileValue['bestRank'] as ProfileState['bestRank'] : null,
      bestCoins: numberIn(profileValue['bestCoins'], 0, 0, 999_999),
      completedRuns: numberIn(profileValue['completedRuns'], 0, 0, 999_999),
    } : { ...DEFAULT_PROFILE };
    const activeRun = sanitizeRun(parsed['activeRun']);
    return createEnvelope(settings, profile, activeRun);
  } catch {
    return createEnvelope();
  }
}

export function loadSave(): SaveEnvelope {
  if (typeof localStorage === 'undefined') return createEnvelope();
  try { return parseEnvelope(localStorage.getItem(SAVE_KEY)); } catch { return createEnvelope(); }
}

export function persistSave(envelope: SaveEnvelope): void {
  envelope.savedAt = new Date().toISOString();
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(SAVE_KEY, JSON.stringify(envelope)); } catch { /* Private browsing may deny storage; gameplay continues in memory. */ }
}

export function clearSave(): SaveEnvelope {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY); } catch { /* Nothing else to clear. */ }
  return createEnvelope();
}
