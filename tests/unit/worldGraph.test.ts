import { afterEach, describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../src/data/locations';
import { validateWorldGraph } from '../../src/systems/worldGraph';
import type { InteractionDefinition, SpawnDefinition } from '../../src/types/game';

const originalHallSpawns = LOCATIONS.mainHall.spawns;
const originalFeedInteractions = LOCATIONS.feedStore.interactions;

describe('world graph validation', () => {
  afterEach(() => {
    LOCATIONS.mainHall.spawns = originalHallSpawns;
    LOCATIONS.feedStore.interactions = originalFeedInteractions;
  });

  it('accepts the production world, exits, spawns, interactions, and objectives', () => {
    expect(validateWorldGraph()).toEqual({ valid: true, errors: [] });
  });

  it('identifies an exit whose destination spawn is missing', () => {
    LOCATIONS.mainHall.spawns = originalHallSpawns.filter((spawn) => spawn.id !== 'fromTea') as readonly SpawnDefinition[];

    const report = validateWorldGraph();

    expect(report.valid).toBe(false);
    expect(report.errors).toContain('teaRoom.tea_to_hall: missing spawn mainHall.fromTea');
  });

  it('identifies interaction ids reused in different locations', () => {
    const duplicate = LOCATIONS.teaRoom.interactions[0]!;
    LOCATIONS.feedStore.interactions = [...originalFeedInteractions, duplicate] as readonly InteractionDefinition[];

    const report = validateWorldGraph();

    expect(report.valid).toBe(false);
    expect(report.errors).toContain('duplicate interaction id: shift_board');
  });
});
