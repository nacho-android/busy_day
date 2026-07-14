import { afterEach, describe, expect, it } from 'vitest';
import { CHARACTER_VISUALS } from '../../src/data/characters';
import { LOCATIONS } from '../../src/data/locations';
import { FINAL_DIALOGUE, OBJECTIVES, OBJECTIVE_DIALOGUE, OPENING_DIALOGUE } from '../../src/data/story';
import { validateWorldGraph, type WorldValidationInput } from '../../src/systems/worldGraph';
import type { DialogueLine, InteractionDefinition, LocationDefinition, LocationId, ObjectiveDefinition, SpawnDefinition } from '../../src/types/game';

const originalHallSpawns = LOCATIONS.mainHall.spawns;
const originalFeedInteractions = LOCATIONS.feedStore.interactions;

function clonedInput(): WorldValidationInput {
  return {
    locations: structuredClone(LOCATIONS),
    objectives: structuredClone(OBJECTIVES),
    openingDialogue: structuredClone(OPENING_DIALOGUE),
    objectiveDialogue: structuredClone(OBJECTIVE_DIALOGUE),
    finalDialogue: structuredClone(FINAL_DIALOGUE),
    characterVisualIds: new Set(Object.keys(CHARACTER_VISUALS)),
  };
}

function replaceInteraction(
  locations: Readonly<Record<LocationId, LocationDefinition>>,
  locationId: LocationId,
  interactionId: string,
  replacement: InteractionDefinition,
): void {
  locations[locationId].interactions = locations[locationId].interactions.map((interaction) => (
    interaction.id === interactionId ? replacement : interaction
  ));
}

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

  it('rejects a target assigned to a different room', () => {
    const input = clonedInput();
    const objectives = input.objectives as ObjectiveDefinition[];
    objectives[0] = { ...objectives[0]!, location: 'mainHall' };

    const report = validateWorldGraph(input);

    expect(report.errors).toContain('check_board: target shift_board is in teaRoom, not mainHall');
  });

  it('detects cyclic and forward objective flag dependencies', () => {
    const input = clonedInput();
    const feedCart = input.locations.feedStore.interactions.find((interaction) => interaction.id === 'feed_cart')!;
    const cathSupport = input.locations.cathLab.interactions.find((interaction) => interaction.id === 'cath_support')!;
    replaceInteraction(input.locations, 'feedStore', 'feed_cart', { ...feedCart, requiresFlag: 'procedureComplete' });
    replaceInteraction(input.locations, 'cathLab', 'cath_support', { ...cathSupport, requiresFlag: 'hasFeedCart' });

    const report = validateWorldGraph(input);

    expect(report.errors.some((error) => error.startsWith('objective dependency cycle:'))).toBe(true);
    expect(report.errors).toContain('collect_cart: depends on support_cath, which is not completed earlier');
    expect(report.errors).toContain('collect_cart.feed_cart: required flag procedureComplete is unavailable at this objective');
  });

  it('rejects a route unlocked by the objective hidden behind that route', () => {
    const input = clonedInput();
    input.locations.mainHall.exits = input.locations.mainHall.exits.map((exit) => (
      exit.id === 'hall_to_feed' ? { ...exit, requiredFlag: 'hasFeedCart' } : exit
    ));

    const report = validateWorldGraph(input);

    expect(report.errors).toContain('collect_cart: depends on collect_cart, which is not completed earlier');
    expect(report.errors).toContain('collect_cart: location feedStore is locked by the authored objective/flag order');
  });

  it('validates dialogue speakers, portrait identities, and choice effects', () => {
    const input = clonedInput();
    const invalidLine = {
      speaker: 'Uncatalogued Consultant',
      text: 'This person has no authored portrait identity.',
      choices: [{ label: 'Panic', response: 'Correct.', effect: 'explode' }],
    } as unknown as DialogueLine;
    (input.openingDialogue as DialogueLine[]).push(invalidLine);

    const report = validateWorldGraph(input);

    expect(report.errors).toContain('openingDialogue[2]: speaker Uncatalogued Consultant has no NPC/portrait definition');
    expect(report.errors).toContain('openingDialogue[2].choices[0]: unknown effect explode');
  });

  it('detects collision geometry that disconnects authored approaches', () => {
    const input = clonedInput();
    input.locations.teaRoom.obstacles = [
      ...input.locations.teaRoom.obstacles,
      { id: 'test_wall', x: 620, y: 105, width: 20, height: 565 },
    ];

    const report = validateWorldGraph(input);

    expect(report.errors.some((error) => error.includes('cannot navigate to interaction shift_board'))).toBe(true);
    expect(report.errors.some((error) => error.includes('cannot navigate to exit tea_to_hall'))).toBe(true);
  });

  it('rejects NPC patrol waypoints and segments that cross fixed geometry', () => {
    const input = clonedInput();
    input.locations.teaRoom.npcs = input.locations.teaRoom.npcs.map((npc) => npc.id === 'sally' ? {
      ...npc,
      ambient: { ...npc.ambient, mode: 'patrol', waypoints: [{ x: 820, y: 510 }, { x: 500, y: 350 }] },
    } : npc);

    const report = validateWorldGraph(input);

    expect(report.errors).toContain('teaRoom.sally: patrol waypoint 1 cannot join walkable navigation geometry');
    expect(report.errors).toContain('teaRoom.sally: patrol segment 0 crosses collision geometry');
  });

  it('requires a unique reciprocal exit for every connection', () => {
    const input = clonedInput();
    input.locations.feedStore.exits = [];

    const report = validateWorldGraph(input);

    expect(report.errors).toContain('mainHall.hall_to_feed: no reciprocal exit from feedStore');
  });
});
