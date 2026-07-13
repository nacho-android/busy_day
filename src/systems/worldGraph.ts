import { LOCATION_LIST, LOCATIONS } from '../data/locations';
import { OBJECTIVES } from '../data/story';
import { canOccupy } from './collision';

export interface ValidationReport {
  valid: boolean;
  errors: string[];
}

export function validateWorldGraph(): ValidationReport {
  const errors: string[] = [];
  const interactionIds = new Set<string>();

  for (const location of LOCATION_LIST) {
    const spawnIds = new Set(location.spawns.map((spawn) => spawn.id));
    if (spawnIds.size !== location.spawns.length) errors.push(`${location.id}: duplicate spawn id`);

    for (const spawn of location.spawns) {
      if (spawn.x < location.bounds.x || spawn.x > location.bounds.x + location.bounds.width || spawn.y < location.bounds.y || spawn.y > location.bounds.y + location.bounds.height) {
        errors.push(`${location.id}.${spawn.id}: spawn outside bounds`);
      }
      if (!canOccupy(spawn, 20, location.bounds, location.obstacles)) {
        errors.push(`${location.id}.${spawn.id}: spawn overlaps collision geometry`);
      }
    }

    for (const interaction of location.interactions) {
      if (interactionIds.has(interaction.id)) errors.push(`duplicate interaction id: ${interaction.id}`);
      interactionIds.add(interaction.id);
    }

    for (const exit of location.exits) {
      const destination = LOCATIONS[exit.destination];
      if (!destination) {
        errors.push(`${location.id}.${exit.id}: missing destination ${exit.destination}`);
        continue;
      }
      if (!destination.spawns.some((spawn) => spawn.id === exit.destinationSpawn)) {
        errors.push(`${location.id}.${exit.id}: missing spawn ${exit.destination}.${exit.destinationSpawn}`);
      }
      const reciprocal = destination.exits.some((candidate) => candidate.destination === location.id);
      if (!reciprocal) errors.push(`${location.id}.${exit.id}: no reciprocal exit from ${destination.id}`);
    }
  }

  const objectiveIds = new Set<string>();
  for (const objective of OBJECTIVES) {
    if (objectiveIds.has(objective.id)) errors.push(`duplicate objective id: ${objective.id}`);
    objectiveIds.add(objective.id);
    if (!(objective.location in LOCATIONS)) errors.push(`${objective.id}: missing location ${objective.location}`);
    for (const target of objective.targets) {
      if (!interactionIds.has(target)) errors.push(`${objective.id}: missing interaction ${target}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
