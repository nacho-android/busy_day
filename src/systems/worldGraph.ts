import { BACKGROUND_ASSETS, MUSIC_ASSETS } from '../data/assets';
import { CHARACTER_VISUALS } from '../data/characters';
import { LOCATIONS } from '../data/locations';
import { FINAL_DIALOGUE, OBJECTIVES, OBJECTIVE_DIALOGUE, OPENING_DIALOGUE } from '../data/story';
import type {
  DialogueLine,
  InteractionDefinition,
  LocationDefinition,
  LocationId,
  ObjectiveDefinition,
  Point,
} from '../types/game';
import { canOccupy, circleIntersectsRect, distance } from './collision';

export interface ValidationReport {
  valid: boolean;
  errors: string[];
}

export interface WorldValidationInput {
  locations: Readonly<Record<LocationId, LocationDefinition>>;
  objectives: readonly ObjectiveDefinition[];
  openingDialogue: readonly DialogueLine[];
  objectiveDialogue: Readonly<Record<string, readonly DialogueLine[]>>;
  finalDialogue: readonly DialogueLine[];
  characterVisualIds: ReadonlySet<string>;
}

interface InteractionEntry {
  location: LocationDefinition;
  interaction: InteractionDefinition;
}

interface NavigationGrid {
  points: readonly Point[];
  componentByPoint: readonly number[];
}

const PLAYER_RADIUS = 20;
const NAVIGATION_STEP = 12;
const DIALOGUE_EFFECTS = new Set(['wayneDown', 'wayneUp', 'stressDown']);
const DIALOGUE_EXPRESSIONS = new Set(['neutral', 'amused', 'concerned', 'annoyed']);

function productionInput(): WorldValidationInput {
  return {
    locations: LOCATIONS,
    objectives: OBJECTIVES,
    openingDialogue: OPENING_DIALOGUE,
    objectiveDialogue: OBJECTIVE_DIALOGUE,
    finalDialogue: FINAL_DIALOGUE,
    characterVisualIds: new Set(Object.keys(CHARACTER_VISUALS)),
  };
}

function containsRect(container: LocationDefinition['bounds'], candidate: LocationDefinition['bounds']): boolean {
  return candidate.x >= container.x
    && candidate.y >= container.y
    && candidate.x + candidate.width <= container.x + container.width
    && candidate.y + candidate.height <= container.y + container.height;
}

function normalizeSpeaker(name: string): string {
  return name.trim().toLocaleLowerCase('en-AU');
}

function isSegmentWalkable(start: Point, end: Point, location: LocationDefinition): boolean {
  const length = distance(start, end);
  const samples = Math.max(1, Math.ceil(length / (NAVIGATION_STEP / 2)));
  for (let index = 0; index <= samples; index += 1) {
    const fraction = index / samples;
    const point = {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    };
    if (!canOccupy(point, PLAYER_RADIUS, location.bounds, location.obstacles)) return false;
  }
  return true;
}

function buildNavigationGrid(location: LocationDefinition): NavigationGrid {
  const minX = location.bounds.x + PLAYER_RADIUS;
  const maxX = location.bounds.x + location.bounds.width - PLAYER_RADIUS;
  const minY = location.bounds.y + PLAYER_RADIUS;
  const maxY = location.bounds.y + location.bounds.height - PLAYER_RADIUS;
  const columns = Math.floor((maxX - minX) / NAVIGATION_STEP) + 1;
  const rows = Math.floor((maxY - minY) / NAVIGATION_STEP) + 1;
  const pointIndexByCell = new Map<string, number>();
  const points: Point[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const point = { x: minX + column * NAVIGATION_STEP, y: minY + row * NAVIGATION_STEP };
      if (!canOccupy(point, PLAYER_RADIUS, location.bounds, location.obstacles)) continue;
      pointIndexByCell.set(`${column}:${row}`, points.length);
      points.push(point);
    }
  }

  const componentByPoint = Array.from<number>({ length: points.length }).fill(-1);
  let component = 0;
  for (const [cell, pointIndex] of pointIndexByCell) {
    if (componentByPoint[pointIndex] !== -1) continue;
    const queue = [cell];
    componentByPoint[pointIndex] = component;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const currentCell = queue[cursor]!;
      const [columnText, rowText] = currentCell.split(':');
      const column = Number(columnText);
      const row = Number(rowText);
      for (const [nextColumn, nextRow] of [[column - 1, row], [column + 1, row], [column, row - 1], [column, row + 1]]) {
        const nextCell = `${nextColumn}:${nextRow}`;
        const nextIndex = pointIndexByCell.get(nextCell);
        if (nextIndex === undefined || componentByPoint[nextIndex] !== -1) continue;
        componentByPoint[nextIndex] = component;
        queue.push(nextCell);
      }
    }
    component += 1;
  }

  return { points, componentByPoint };
}

function pointComponent(point: Point, location: LocationDefinition, grid: NavigationGrid): number | null {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < grid.points.length; index += 1) {
    const candidate = grid.points[index]!;
    const apart = distance(point, candidate);
    if (apart >= bestDistance || apart > NAVIGATION_STEP * 1.5) continue;
    if (!isSegmentWalkable(point, candidate, location)) continue;
    bestIndex = index;
    bestDistance = apart;
  }
  return bestIndex === -1 ? null : grid.componentByPoint[bestIndex] ?? null;
}

function matchingComponents(grid: NavigationGrid, predicate: (point: Point) => boolean): Set<number> {
  const matches = new Set<number>();
  for (let index = 0; index < grid.points.length; index += 1) {
    if (predicate(grid.points[index]!)) matches.add(grid.componentByPoint[index]!);
  }
  return matches;
}

function validateNavigability(location: LocationDefinition, errors: string[]): void {
  const grid = buildNavigationGrid(location);
  if (grid.points.length === 0) {
    errors.push(`${location.id}: collision geometry has no walkable cells`);
    return;
  }

  const spawnComponents = new Map<string, number>();
  for (const spawn of location.spawns) {
    const component = pointComponent(spawn, location, grid);
    if (component === null) errors.push(`${location.id}.${spawn.id}: spawn cannot join walkable navigation geometry`);
    else spawnComponents.set(spawn.id, component);
  }

  const targets: Array<{ label: string; components: Set<number> }> = [];
  for (const interaction of location.interactions) {
    targets.push({
      label: `interaction ${interaction.id}`,
      components: matchingComponents(grid, (point) => distance(point, interaction) <= interaction.radius),
    });
  }
  for (const npc of location.npcs) {
    targets.push({
      label: `NPC ${npc.id}`,
      components: matchingComponents(grid, (point) => distance(point, npc) <= 78),
    });

    const waypoints = npc.ambient?.mode === 'patrol' ? npc.ambient.waypoints ?? [] : [];
    if (npc.ambient?.mode !== 'patrol') continue;
    const npcComponent = pointComponent(npc, location, grid);
    if (npcComponent === null) errors.push(`${location.id}.${npc.id}: NPC placement cannot join walkable navigation geometry`);
    if (waypoints.length < 2) {
      errors.push(`${location.id}.${npc.id}: patrol requires at least two waypoints`);
    }
    for (const [index, waypoint] of waypoints.entries()) {
      const component = pointComponent(waypoint, location, grid);
      if (component === null) {
        errors.push(`${location.id}.${npc.id}: patrol waypoint ${index} cannot join walkable navigation geometry`);
      } else if (npcComponent !== null && component !== npcComponent) {
        errors.push(`${location.id}.${npc.id}: patrol waypoint ${index} is disconnected from the NPC placement`);
      }
      const next = waypoints[(index + 1) % waypoints.length];
      if (next && !isSegmentWalkable(waypoint, next, location)) {
        errors.push(`${location.id}.${npc.id}: patrol segment ${index} crosses collision geometry`);
      }
    }
    const firstTarget = waypoints[waypoints.length > 1 ? 1 : 0];
    if (firstTarget && !isSegmentWalkable(npc, firstTarget, location)) {
      errors.push(`${location.id}.${npc.id}: initial patrol segment crosses collision geometry`);
    }
  }
  for (const exit of location.exits) {
    targets.push({
      label: `exit ${exit.id}`,
      components: matchingComponents(grid, (point) => circleIntersectsRect(point, 21, exit)),
    });
  }

  for (const target of targets) {
    if (target.components.size === 0) {
      errors.push(`${location.id}: ${target.label} has no collision-safe approach`);
      continue;
    }
    for (const [spawnId, component] of spawnComponents) {
      if (!target.components.has(component)) {
        errors.push(`${location.id}.${spawnId}: cannot navigate to ${target.label}`);
      }
    }
  }
}

function routeRequirementOptions(
  locations: Readonly<Record<LocationId, LocationDefinition>>,
  start: LocationId,
  destination: LocationId,
): readonly ReadonlySet<string>[] {
  const queue: Array<{ location: LocationId; flags: Set<string> }> = [{ location: start, flags: new Set() }];
  const seen = new Map<LocationId, Set<string>[]>([[start, [new Set()]]]);
  const results: Set<string>[] = [];

  const isSubset = (left: ReadonlySet<string>, right: ReadonlySet<string>): boolean => [...left].every((flag) => right.has(flag));

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const state = queue[cursor]!;
    if (state.location === destination) {
      results.push(state.flags);
      continue;
    }
    for (const exit of locations[state.location].exits) {
      const nextFlags = new Set(state.flags);
      if (exit.requiredFlag) nextFlags.add(exit.requiredFlag);
      const existing = seen.get(exit.destination) ?? [];
      if (existing.some((flags) => isSubset(flags, nextFlags))) continue;
      const retained = existing.filter((flags) => !isSubset(nextFlags, flags));
      retained.push(nextFlags);
      seen.set(exit.destination, retained);
      queue.push({ location: exit.destination, flags: nextFlags });
    }
  }

  return results;
}

function reachableLocations(
  locations: Readonly<Record<LocationId, LocationDefinition>>,
  availableFlags: ReadonlySet<string>,
): Set<LocationId> {
  const reachable = new Set<LocationId>(['teaRoom']);
  const queue: LocationId[] = ['teaRoom'];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const locationId = queue[cursor]!;
    for (const exit of locations[locationId].exits) {
      if (exit.requiredFlag && !availableFlags.has(exit.requiredFlag)) continue;
      if (reachable.has(exit.destination)) continue;
      reachable.add(exit.destination);
      queue.push(exit.destination);
    }
  }
  return reachable;
}

function dependencyCycle(dependencies: readonly ReadonlySet<number>[]): readonly number[] | null {
  const visited = new Set<number>();
  const active = new Set<number>();
  const stack: number[] = [];

  const visit = (index: number): readonly number[] | null => {
    if (active.has(index)) {
      const start = stack.indexOf(index);
      return [...stack.slice(start), index];
    }
    if (visited.has(index)) return null;
    visited.add(index);
    active.add(index);
    stack.push(index);
    for (const dependency of dependencies[index] ?? []) {
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    stack.pop();
    active.delete(index);
    return null;
  };

  for (let index = 0; index < dependencies.length; index += 1) {
    const cycle = visit(index);
    if (cycle) return cycle;
  }
  return null;
}

function validateDialogue(
  lines: readonly DialogueLine[],
  context: string,
  speakerVisuals: ReadonlyMap<string, ReadonlySet<string>>,
  characterVisualIds: ReadonlySet<string>,
  errors: string[],
): void {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const label = `${context}[${index}]`;
    if (!line.speaker.trim()) errors.push(`${label}: missing speaker`);
    if (!line.text.trim()) errors.push(`${label}: missing dialogue text`);
    if (line.expression && !DIALOGUE_EXPRESSIONS.has(line.expression)) errors.push(`${label}: unknown expression ${line.expression}`);

    if (normalizeSpeaker(line.speaker) !== 'player') {
      const visuals = speakerVisuals.get(normalizeSpeaker(line.speaker));
      if (!visuals || visuals.size === 0) {
        errors.push(`${label}: speaker ${line.speaker} has no NPC/portrait definition`);
      } else if (visuals.size > 1) {
        errors.push(`${label}: speaker ${line.speaker} maps to multiple portrait visuals: ${[...visuals].join(', ')}`);
      } else {
        const visualId = [...visuals][0]!;
        if (!characterVisualIds.has(visualId)) errors.push(`${label}: portrait visual ${visualId} does not resolve`);
      }
    }

    for (let choiceIndex = 0; choiceIndex < (line.choices?.length ?? 0); choiceIndex += 1) {
      const choice = line.choices![choiceIndex]!;
      if (!choice.label.trim()) errors.push(`${label}.choices[${choiceIndex}]: missing label`);
      if (!choice.response.trim()) errors.push(`${label}.choices[${choiceIndex}]: missing response`);
      if (choice.effect && !DIALOGUE_EFFECTS.has(choice.effect)) errors.push(`${label}.choices[${choiceIndex}]: unknown effect ${choice.effect}`);
    }
  }
}

export function validateWorldGraph(input: WorldValidationInput = productionInput()): ValidationReport {
  const errors: string[] = [];
  const locations = Object.values(input.locations);
  const interactionById = new Map<string, InteractionEntry>();
  const speakerVisuals = new Map<string, Set<string>>();

  for (const location of locations) {
    const spawnIds = new Set(location.spawns.map((spawn) => spawn.id));
    if (spawnIds.size !== location.spawns.length) errors.push(`${location.id}: duplicate spawn id`);
    if (!location.backgroundKey) errors.push(`${location.id}: missing production background key`);
    else if (!(location.backgroundKey in BACKGROUND_ASSETS)) errors.push(`${location.id}: unknown background asset ${location.backgroundKey}`);
    if (!(location.music in MUSIC_ASSETS)) errors.push(`${location.id}: unknown music cue ${location.music}`);

    for (const spawn of location.spawns) {
      if (!canOccupy(spawn, PLAYER_RADIUS, location.bounds, location.obstacles)) {
        errors.push(`${location.id}.${spawn.id}: spawn overlaps collision geometry or bounds`);
      }
    }
    for (const obstacle of location.obstacles) {
      if (!containsRect(location.bounds, obstacle)) errors.push(`${location.id}.${obstacle.id}: obstacle outside bounds`);
    }
    for (const interaction of location.interactions) {
      if (interactionById.has(interaction.id)) errors.push(`duplicate interaction id: ${interaction.id}`);
      else interactionById.set(interaction.id, { location, interaction });
      if (interaction.radius <= PLAYER_RADIUS) errors.push(`${location.id}.${interaction.id}: interaction radius is not player-accessible`);
      if (interaction.x < location.bounds.x || interaction.x > location.bounds.x + location.bounds.width
        || interaction.y < location.bounds.y || interaction.y > location.bounds.y + location.bounds.height) {
        errors.push(`${location.id}.${interaction.id}: interaction outside bounds`);
      }
    }
    for (const npc of location.npcs) {
      if (!input.characterVisualIds.has(npc.visualId)) errors.push(`${location.id}.${npc.id}: missing character visual ${npc.visualId}`);
      const speaker = normalizeSpeaker(npc.name);
      const visuals = speakerVisuals.get(speaker) ?? new Set<string>();
      visuals.add(npc.visualId);
      speakerVisuals.set(speaker, visuals);
    }
    for (const exit of location.exits) {
      if (!containsRect(location.bounds, exit)) errors.push(`${location.id}.${exit.id}: exit outside bounds`);
      const destination = input.locations[exit.destination];
      if (!destination) {
        errors.push(`${location.id}.${exit.id}: missing destination ${exit.destination}`);
        continue;
      }
      if (!destination.spawns.some((spawn) => spawn.id === exit.destinationSpawn)) {
        errors.push(`${location.id}.${exit.id}: missing spawn ${exit.destination}.${exit.destinationSpawn}`);
      }
      const reciprocals = destination.exits.filter((candidate) => candidate.destination === location.id);
      if (reciprocals.length === 0) errors.push(`${location.id}.${exit.id}: no reciprocal exit from ${destination.id}`);
      if (reciprocals.length > 1) errors.push(`${location.id}.${exit.id}: ambiguous reciprocal exits from ${destination.id}`);
    }

    validateNavigability(location, errors);
  }

  const objectiveIds = new Set<string>();
  const targetOwners = new Map<string, string>();
  const flagProducer = new Map<string, number>();
  const dependencies = input.objectives.map(() => new Set<number>());

  for (let index = 0; index < input.objectives.length; index += 1) {
    const objective = input.objectives[index]!;
    if (objectiveIds.has(objective.id)) errors.push(`duplicate objective id: ${objective.id}`);
    objectiveIds.add(objective.id);
    if (index > 0 && objective.act < input.objectives[index - 1]!.act) {
      errors.push(`${objective.id}: act ${objective.act} is earlier than preceding objective act ${input.objectives[index - 1]!.act}`);
    }
    if (objective.targets.length === 0) errors.push(`${objective.id}: objective has no targets`);
    for (const flag of objective.grantsFlags ?? []) {
      const previousProducer = flagProducer.get(flag);
      if (previousProducer !== undefined) errors.push(`${objective.id}: flag ${flag} already granted by ${input.objectives[previousProducer]!.id}`);
      else flagProducer.set(flag, index);
    }
  }

  for (const location of locations) {
    for (const interaction of location.interactions) {
      if (interaction.requiresFlag && !flagProducer.has(interaction.requiresFlag)) {
        errors.push(`${location.id}.${interaction.id}: required flag ${interaction.requiresFlag} has no objective producer`);
      }
    }
    for (const exit of location.exits) {
      if (exit.requiredFlag && !flagProducer.has(exit.requiredFlag)) {
        errors.push(`${location.id}.${exit.id}: required flag ${exit.requiredFlag} has no objective producer`);
      }
    }
  }

  for (let index = 0; index < input.objectives.length; index += 1) {
    const objective = input.objectives[index]!;
    if (!(objective.location in input.locations)) errors.push(`${objective.id}: missing location ${objective.location}`);
    for (const target of objective.targets) {
      const previousOwner = targetOwners.get(target);
      if (previousOwner) errors.push(`${objective.id}: target ${target} is already owned by ${previousOwner}`);
      else targetOwners.set(target, objective.id);
      const entry = interactionById.get(target);
      if (!entry) {
        errors.push(`${objective.id}: missing interaction ${target}`);
        continue;
      }
      if (entry.location.id !== objective.location) {
        errors.push(`${objective.id}: target ${target} is in ${entry.location.id}, not ${objective.location}`);
      }
      if (entry.interaction.requiresFlag) {
        const producer = flagProducer.get(entry.interaction.requiresFlag);
        if (producer !== undefined) dependencies[index]!.add(producer);
      }
    }

    const routeOptions = routeRequirementOptions(input.locations, 'teaRoom', objective.location);
    if (routeOptions.length === 0) {
      errors.push(`${objective.id}: location ${objective.location} has no authored route from teaRoom`);
    } else {
      const unavoidableFlags = new Set(routeOptions[0]);
      for (const option of routeOptions.slice(1)) {
        for (const flag of unavoidableFlags) if (!option.has(flag)) unavoidableFlags.delete(flag);
      }
      for (const flag of unavoidableFlags) {
        const producer = flagProducer.get(flag);
        if (producer !== undefined) dependencies[index]!.add(producer);
      }
    }
  }

  const cycle = dependencyCycle(dependencies);
  if (cycle) errors.push(`objective dependency cycle: ${cycle.map((index) => input.objectives[index]!.id).join(' -> ')}`);

  const availableFlags = new Set<string>();
  for (let index = 0; index < input.objectives.length; index += 1) {
    const objective = input.objectives[index]!;
    for (const dependency of dependencies[index]!) {
      if (dependency >= index) {
        errors.push(`${objective.id}: depends on ${input.objectives[dependency]!.id}, which is not completed earlier`);
      }
    }
    if (!reachableLocations(input.locations, availableFlags).has(objective.location)) {
      errors.push(`${objective.id}: location ${objective.location} is locked by the authored objective/flag order`);
    }
    for (const target of objective.targets) {
      const requiredFlag = interactionById.get(target)?.interaction.requiresFlag;
      if (requiredFlag && !availableFlags.has(requiredFlag)) {
        errors.push(`${objective.id}.${target}: required flag ${requiredFlag} is unavailable at this objective`);
      }
    }
    for (const flag of objective.grantsFlags ?? []) availableFlags.add(flag);
  }

  for (const key of Object.keys(input.objectiveDialogue)) {
    if (!objectiveIds.has(key)) errors.push(`objective dialogue ${key}: missing objective`);
  }
  validateDialogue(input.openingDialogue, 'openingDialogue', speakerVisuals, input.characterVisualIds, errors);
  for (const [key, lines] of Object.entries(input.objectiveDialogue)) {
    validateDialogue(lines, `objectiveDialogue.${key}`, speakerVisuals, input.characterVisualIds, errors);
  }
  validateDialogue(input.finalDialogue, 'finalDialogue', speakerVisuals, input.characterVisualIds, errors);

  return { valid: errors.length === 0, errors };
}
