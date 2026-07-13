import { beforeEach, describe, expect, it } from 'vitest';
import { CHARACTERS } from '../../src/data/characters';
import { LOCATIONS } from '../../src/data/locations';
import { OBJECTIVES } from '../../src/data/story';
import { GameSession } from '../../src/state/GameSession';
import { SAVE_KEY } from '../../src/state/saveStore';
import type { InteractionResult } from '../../src/types/game';
import { installMemoryStorage, type MemoryStorage } from './testStorage';

let storage: MemoryStorage;

function completeObjective(session: GameSession): InteractionResult {
  const objective = session.currentObjective;
  if (!objective) throw new Error('Expected an active objective');
  if (session.run?.locationId !== objective.location) {
    const spawn = LOCATIONS[objective.location].spawns[0];
    if (!spawn) throw new Error(`Expected a spawn in ${objective.location}`);
    session.transitionTo(objective.location, spawn.id);
  }
  let result: InteractionResult | null = null;
  for (const target of objective.targets) result = session.interact(target);
  if (!result) throw new Error(`Objective ${objective.id} has no targets`);
  return result;
}

describe('GameSession', () => {
  beforeEach(() => {
    storage = installMemoryStorage();
  });

  it('starts a cloned, persisted run at the selected character spawn', () => {
    const session = new GameSession();
    const returned = session.newGame('josh', true);

    expect(returned).toMatchObject({
      characterId: 'josh',
      relaxed: true,
      locationId: 'teaRoom',
      spawnId: 'start',
      player: { x: 260, y: 510 },
      objectiveIndex: 0,
      meters: { health: 100, stamina: CHARACTERS.josh.stats.maxStamina, stress: 0, wayne: 0 },
      finished: false,
    });
    returned.player.x = 999;
    expect(session.run?.player.x).toBe(260);
    expect(storage.getItem(SAVE_KEY)).toContain('"characterId":"josh"');
    expect(session.hasContinue).toBe(true);
  });

  it('supports optional feedback, unknown actions, and prerequisite gates', () => {
    const session = new GameSession();
    session.newGame('mel');

    expect(session.interact('tea_kettle')).toMatchObject({ success: true, objectiveCompleted: false });
    expect(session.interact('not_a_real_interaction')).toMatchObject({ success: false, objectiveCompleted: false });
    session.transitionTo('pigHousing', 'fromHall');
    const blocked = session.interact('pig_feed_1');
    expect(blocked.success).toBe(false);
    expect(blocked.message).toContain('feed cart');
    expect(session.run?.completedTargets).toEqual([]);
  });

  it('advances multi-target objectives once and grants rewards, flags, and levels', () => {
    const session = new GameSession();
    session.newGame('mel');

    expect(completeObjective(session).objectiveCompleted).toBe(true);
    expect(session.hasFlag('boardChecked')).toBe(true);
    expect(completeObjective(session).objectiveCompleted).toBe(true);
    expect(session.hasFlag('hasFeedCart')).toBe(true);
    expect(session.run?.checkpointObjectiveIndex).toBe(2);

    session.transitionTo('pigHousing', 'fromHall');
    expect(session.interact('pig_feed_1').objectiveCompleted).toBe(false);
    expect(session.interact('pig_feed_2').objectiveCompleted).toBe(false);
    const finalPig = session.interact('pig_feed_3');

    expect(finalPig).toMatchObject({ success: true, objectiveCompleted: true, gameCompleted: false });
    expect(session.run?.completedObjectives).toEqual(['check_board', 'collect_cart', 'feed_pigs']);
    expect(session.run?.xp).toBe(46);
    expect(session.run?.coins).toBe(22);
    expect(session.run?.level).toBe(2);
    expect(session.currentObjective?.id).toBe('feed_sheep');
  });

  it('moves between known spawns, saves the transition, and reloads progress', () => {
    const first = new GameSession();
    first.newGame('mel');
    completeObjective(first);
    first.transitionTo('mainHall', 'fromTea');

    expect(first.run).toMatchObject({
      locationId: 'mainHall',
      spawnId: 'fromTea',
      player: { x: 120, y: 270 },
      facing: 'right',
    });
    expect(() => first.transitionTo('mainHall', 'missing')).toThrow('Unknown spawn mainHall.missing');

    const reloaded = new GameSession();
    expect(reloaded.hasContinue).toBe(true);
    expect(reloaded.continueGame()).toMatchObject({
      locationId: 'mainHall',
      spawnId: 'fromTea',
      objectiveIndex: 1,
    });
  });

  it('fails on depleted health or maximum Wayne anger', () => {
    const healthRun = new GameSession();
    healthRun.newGame('mel');
    healthRun.updateMeters({ health: -50 });
    expect(healthRun.run?.meters.health).toBe(0);
    expect(healthRun.run?.failure).toBe('health');

    storage.clear();
    const wayneRun = new GameSession();
    wayneRun.newGame('josh');
    wayneRun.updateMeters({ wayne: 500 });
    expect(wayneRun.run?.meters.wayne).toBe(100);
    expect(wayneRun.run?.failure).toBe('wayne');
  });

  it('routes Continue on a failed run through a safe checkpoint recovery', () => {
    const session = new GameSession();
    session.newGame('mel');
    completeObjective(session);
    completeObjective(session);
    session.updateMeters({ health: 0, stress: 88, wayne: 92 });

    const continued = session.continueGame();

    expect(continued).toMatchObject({
      failure: null,
      objectiveIndex: 2,
      locationId: 'mainHall',
      meters: { health: 100, stress: 30, wayne: 55 },
    });
  });

  it('restores the latest checkpoint spawn and safe meter values after failure', () => {
    const session = new GameSession();
    session.newGame('josh');
    completeObjective(session);
    completeObjective(session);
    session.updateMeters({ health: 12, stamina: 4, stress: 82, wayne: 91 });
    session.fail('health');

    const retried = session.retryCheckpoint();

    expect(retried).toMatchObject({
      objectiveIndex: 2,
      locationId: 'mainHall',
      spawnId: 'fromTea',
      player: { x: 120, y: 270 },
      failure: null,
      meters: {
        health: 100,
        stamina: CHARACTERS.josh.stats.maxStamina,
        stress: 30,
        wayne: 55,
      },
    });
  });

  it('completes the full data-driven story and updates the persistent profile', () => {
    const session = new GameSession();
    session.newGame('mel');
    let finalResult: InteractionResult | null = null;

    for (const objective of OBJECTIVES) {
      expect(session.currentObjective?.id).toBe(objective.id);
      finalResult = completeObjective(session);
    }

    expect(finalResult).toMatchObject({ objectiveCompleted: true, gameCompleted: true });
    expect(session.run?.finished).toBe(true);
    expect(session.run?.completedObjectives).toHaveLength(OBJECTIVES.length);
    expect(session.hasContinue).toBe(false);
    expect(session.continueGame()).toBeNull();
    expect(session.profile).toMatchObject({ bestRank: 'S', completedRuns: 1 });

    const reloaded = new GameSession();
    expect(reloaded.profile).toEqual(session.profile);
    expect(reloaded.run?.finished).toBe(true);
  });

  it('resets settings and progress back to a fresh envelope', () => {
    const session = new GameSession();
    session.newGame('mel');
    session.updateSettings({ muted: true, reducedMotion: true });
    expect(session.settings).toMatchObject({ muted: true, reducedMotion: true });

    session.resetAll();

    expect(session.run).toBeNull();
    expect(session.settings).toMatchObject({ muted: false, reducedMotion: false });
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('applies the Relaxed Shift setting immediately to an active run', () => {
    const session = new GameSession();
    session.newGame('mel', false);

    session.updateSettings({ relaxed: true });

    expect(session.settings.relaxed).toBe(true);
    expect(session.run?.relaxed).toBe(true);
  });

  it('rolls completed targets, rewards, objectives, and flags back to the saved checkpoint before replay', () => {
    const session = new GameSession();
    session.newGame('mel');
    completeObjective(session);
    completeObjective(session);
    completeObjective(session);
    session.interact('sheep_feed_1');
    expect(session.run).toMatchObject({ objectiveIndex: 3, xp: 46, coins: 22 });

    session.fail('health');
    const retried = session.retryCheckpoint();

    expect(retried).toMatchObject({
      objectiveIndex: 2,
      completedObjectives: ['check_board', 'collect_cart'],
      completedTargets: ['shift_board', 'feed_cart'],
      flags: ['boardChecked', 'hasFeedCart'],
      xp: 26,
      coins: 13,
    });
    expect(completeObjective(session).objectiveCompleted).toBe(true);
    expect(session.run?.completedObjectives).toEqual(['check_board', 'collect_cart', 'feed_pigs']);
    expect(session.run?.xp).toBe(46);
  });
});
