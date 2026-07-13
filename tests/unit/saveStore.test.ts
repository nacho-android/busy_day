import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSave,
  createEnvelope,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  loadSave,
  parseEnvelope,
  persistSave,
  sanitizeSettings,
  SAVE_KEY,
  SCHEMA_VERSION,
} from '../../src/state/saveStore';
import type { RunState } from '../../src/types/game';
import { CHARACTERS } from '../../src/data/characters';
import { OBJECTIVES } from '../../src/data/story';
import { installMemoryStorage, type MemoryStorage } from './testStorage';

let storage: MemoryStorage;

function sampleRun(): RunState {
  return {
    runId: 'test-run',
    characterId: 'mel',
    relaxed: false,
    startedAt: '2026-07-13T00:00:00.000Z',
    locationId: 'teaRoom',
    spawnId: 'start',
    player: { x: 260, y: 510 },
    facing: 'away',
    objectiveIndex: 0,
    completedTargets: [],
    completedObjectives: [],
    flags: [],
    meters: { health: 100, stamina: 100, stress: 0, wayne: 0 },
    xp: 0,
    coins: 0,
    level: 1,
    startedAtMinutes: 405,
    elapsedSeconds: 0,
    checkpointObjectiveIndex: 0,
    failure: null,
    finished: false,
  };
}

describe('save storage and migration', () => {
  beforeEach(() => {
    storage = installMemoryStorage();
  });

  it('returns independent defaults when no save exists or JSON is invalid', () => {
    const empty = parseEnvelope(null);
    const invalid = parseEnvelope('{ definitely not json');

    expect(empty.schemaVersion).toBe(SCHEMA_VERSION);
    expect(empty.settings).toEqual(DEFAULT_SETTINGS);
    expect(empty.profile).toEqual(DEFAULT_PROFILE);
    expect(empty.activeRun).toBeNull();
    expect(invalid).toMatchObject({ schemaVersion: SCHEMA_VERSION, activeRun: null });
    expect(invalid.settings).not.toBe(DEFAULT_SETTINGS);
  });

  it('clamps numeric preferences and replaces invalid setting values', () => {
    expect(sanitizeSettings({
      musicVolume: 4,
      sfxVolume: -2,
      muted: 'yes',
      typewriter: false,
      reducedMotion: true,
      highContrast: true,
      subtitles: false,
      textSize: 'enormous',
      handedness: 'left',
      relaxed: true,
    })).toEqual({
      musicVolume: 1,
      sfxVolume: 0,
      muted: DEFAULT_SETTINGS.muted,
      typewriter: false,
      reducedMotion: true,
      highContrast: true,
      subtitles: false,
      textSize: 'normal',
      handedness: 'left',
      relaxed: true,
    });
  });

  it('normalises a legacy-shaped envelope into schema version two', () => {
    const migrated = parseEnvelope(JSON.stringify({
      schemaVersion: 1,
      settings: { musicVolume: 0.25, textSize: 'large' },
      profile: { bestRank: 'A', bestCoins: -10, completedRuns: 3 },
    }));

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.settings.musicVolume).toBe(0.25);
    expect(migrated.settings.textSize).toBe('large');
    expect(migrated.settings.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(migrated.profile).toEqual({ bestRank: 'A', bestCoins: 0, completedRuns: 3 });
    expect(migrated.activeRun).toBeNull();
  });

  it('deep-clones active progress when creating an envelope', () => {
    const run = sampleRun();
    const envelope = createEnvelope(DEFAULT_SETTINGS, DEFAULT_PROFILE, run);

    run.player.x = 999;
    run.completedTargets.push('shift_board');

    expect(envelope.activeRun?.player.x).toBe(260);
    expect(envelope.activeRun?.completedTargets).toEqual([]);
    expect(Number.isNaN(Date.parse(envelope.savedAt))).toBe(false);
  });

  it('persists, loads, and clears an envelope through localStorage', () => {
    const envelope = createEnvelope({ ...DEFAULT_SETTINGS, muted: true }, DEFAULT_PROFILE, sampleRun());
    persistSave(envelope);

    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    const loaded = loadSave();
    expect(loaded.settings.muted).toBe(true);
    expect(loaded.activeRun?.runId).toBe('test-run');

    const cleared = clearSave();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(cleared.activeRun).toBeNull();
    expect(cleared.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects a structurally incomplete active run instead of trusting its characterId alone', () => {
    const recovered = parseEnvelope(JSON.stringify({
      schemaVersion: 2,
      activeRun: { characterId: 'mel' },
      settings: DEFAULT_SETTINGS,
      profile: DEFAULT_PROFILE,
    }));

    expect(recovered.activeRun).toBeNull();
    expect(recovered.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('uses character data for stamina limits and repairs inconsistent progress fields', () => {
    const run = sampleRun();
    run.characterId = 'josh';
    run.meters.stamina = 999;
    run.objectiveIndex = 2;
    run.checkpointObjectiveIndex = 1.5;
    run.completedObjectives = [];
    run.completedTargets = [];
    run.flags = [];
    run.xp = 9999;
    run.coins = 9999;

    const recovered = parseEnvelope(JSON.stringify(createEnvelope(DEFAULT_SETTINGS, DEFAULT_PROFILE, run))).activeRun;

    expect(recovered).toMatchObject({
      meters: { stamina: CHARACTERS.josh.stats.maxStamina },
      checkpointObjectiveIndex: 2,
      completedObjectives: ['check_board', 'collect_cart'],
      completedTargets: ['shift_board', 'feed_cart'],
      flags: ['boardChecked', 'hasFeedCart'],
      xp: 26,
      coins: 13,
    });
  });

  it('derives a finished run from the terminal objective index', () => {
    const run = sampleRun();
    run.objectiveIndex = OBJECTIVES.length;
    run.finished = false;
    run.failure = 'health';

    const recovered = parseEnvelope(JSON.stringify(createEnvelope(DEFAULT_SETTINGS, DEFAULT_PROFILE, run))).activeRun;

    expect(recovered?.finished).toBe(true);
    expect(recovered?.failure).toBeNull();
  });
});
