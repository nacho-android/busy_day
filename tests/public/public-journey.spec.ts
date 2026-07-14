import { expect, test, type Page } from '@playwright/test';
import { getVisual } from '../../src/data/characters';
import { LOCATIONS } from '../../src/data/locations';
import { OBJECTIVES } from '../../src/data/story';
import { canOccupy, circleIntersectsRect, distance } from '../../src/systems/collision';
import type {
  ExitDefinition,
  InteractionDefinition,
  LocationDefinition,
  LocationId,
  Point,
  Rect,
  RunState,
} from '../../src/types/game';

const GRID_STEP = 14;
const POSITION_TOLERANCE = 28;
const CLEAN_BOOT_MARKER = 'busy_day_public_journey_clean_boot';

type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

interface RuntimeMonitor {
  issues: string[];
}

interface Grid {
  cols: number;
  rows: number;
  minX: number;
  minY: number;
  points: Point[];
  open: boolean[];
}

interface HeapEntry {
  key: number;
  priority: number;
}

interface ExitApproach {
  point: Point;
  key: ArrowKey;
  entry: Point;
}

class MinHeap {
  private readonly values: HeapEntry[] = [];

  get size(): number { return this.values.length; }

  push(value: HeapEntry): void {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent]!.priority <= value.priority) break;
      this.values[index] = this.values[parent]!;
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): HeapEntry | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || this.values.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      const child = right < this.values.length && this.values[right]!.priority < this.values[left]!.priority
        ? right
        : left;
      if (this.values[child]!.priority >= last.priority) break;
      this.values[index] = this.values[child]!;
      index = child;
    }
    this.values[index] = last;
    return first;
  }
}

function installRuntimeMonitor(page: Page): RuntimeMonitor {
  const monitor: RuntimeMonitor = { issues: [] };
  page.on('pageerror', (error) => monitor.issues.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') monitor.issues.push(`console.error: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    monitor.issues.push(`requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) monitor.issues.push(`response ${response.status()}: ${response.url()}`);
  });
  return monitor;
}

/**
 * The sole test-only telemetry access in this suite. It is deliberately
 * read-only and exists because canvas player coordinates are not exposed as
 * accessible DOM state. No mutating member of __busyDayTest is ever called.
 * If Vite reloads during a long local run, recovery uses the visible Continue
 * button and the game's real save parser.
 */
async function readRun(page: Page): Promise<RunState> {
  let run = await page.evaluate(() => window.__busyDayTest?.getState() ?? null);
  if (run) return run;
  const continueButton = page.locator('#continue-button');
  if (await continueButton.isVisible() && await continueButton.isEnabled()) {
    await continueButton.click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 20_000 });
    await expect.poll(
      () => page.evaluate(() => window.__busyDayTest?.getState() ?? null),
      { timeout: 20_000, intervals: [50, 100, 200] },
    ).not.toBeNull();
    run = await page.evaluate(() => window.__busyDayTest?.getState() ?? null);
  }
  if (!run) throw new Error('Read-only Busy Day telemetry did not expose an active run.');
  return run;
}

function activeObstacles(location: LocationDefinition, run: RunState): readonly Rect[] {
  if (location.id !== 'carPark') return location.obstacles;
  return location.obstacles.filter((obstacle) => !obstacle.id.startsWith('car_') || !run.completedTargets.includes(obstacle.id));
}

function buildGrid(location: LocationDefinition, obstacles: readonly Rect[], radius: number): Grid {
  const minX = location.bounds.x + radius + 1;
  const minY = location.bounds.y + radius + 1;
  const maxX = location.bounds.x + location.bounds.width - radius - 1;
  const maxY = location.bounds.y + location.bounds.height - radius - 1;
  const cols = Math.floor((maxX - minX) / GRID_STEP) + 1;
  const rows = Math.floor((maxY - minY) / GRID_STEP) + 1;
  const points: Point[] = [];
  const open: boolean[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const point = { x: minX + col * GRID_STEP, y: minY + row * GRID_STEP };
      points.push(point);
      open.push(canOccupy(point, radius, location.bounds, obstacles));
    }
  }
  return { cols, rows, minX, minY, points, open };
}

function lineIsOpen(
  start: Point,
  end: Point,
  radius: number,
  bounds: Rect,
  obstacles: readonly Rect[],
): boolean {
  const length = distance(start, end);
  const samples = Math.max(1, Math.ceil(length / 6));
  for (let index = 0; index <= samples; index += 1) {
    const fraction = index / samples;
    const point = {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    };
    if (!canOccupy(point, radius, bounds, obstacles)) return false;
  }
  return true;
}

function neighbourKeys(grid: Grid, key: number): number[] {
  const col = key % grid.cols;
  const row = Math.floor(key / grid.cols);
  const neighbours: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nextCol = col + dx;
      const nextRow = row + dy;
      if (nextCol < 0 || nextCol >= grid.cols || nextRow < 0 || nextRow >= grid.rows) continue;
      const next = nextRow * grid.cols + nextCol;
      if (!grid.open[next]) continue;
      if (dx !== 0 && dy !== 0) {
        const horizontal = row * grid.cols + nextCol;
        const vertical = nextRow * grid.cols + col;
        if (!grid.open[horizontal] || !grid.open[vertical]) continue;
      }
      neighbours.push(next);
    }
  }
  return neighbours;
}

function simplifyPath(
  path: readonly Point[],
): Point[] {
  if (path.length <= 2) return [...path];
  const result: Point[] = [];
  let previousDirection: Point | null = null;
  for (let index = 1; index < path.length; index += 1) {
    const before = path[index - 1]!;
    const current = path[index]!;
    const direction = { x: Math.sign(current.x - before.x), y: Math.sign(current.y - before.y) };
    if (previousDirection && (direction.x !== previousDirection.x || direction.y !== previousDirection.y)) {
      result.push(before);
    }
    previousDirection = direction;
  }
  result.push(path.at(-1)!);
  return result;
}

function planGridPath(
  location: LocationDefinition,
  obstacles: readonly Rect[],
  start: Point,
  target: Point,
  goalTest: (point: Point) => boolean,
  planningRadius: number,
): Point[] | null {
  const grid = buildGrid(location, obstacles, planningRadius);
  const goals = new Set<number>();
  const starts: number[] = [];
  for (let key = 0; key < grid.points.length; key += 1) {
    if (!grid.open[key]) continue;
    const point = grid.points[key]!;
    if (goalTest(point)) goals.add(key);
    if (distance(start, point) <= GRID_STEP * 2.5
      && lineIsOpen(start, point, planningRadius, location.bounds, obstacles)) starts.push(key);
  }
  if (goals.size === 0 || starts.length === 0) return null;

  const heap = new MinHeap();
  const costs = new Map<number, number>();
  const parents = new Map<number, number>();
  for (const key of starts) {
    const cost = distance(start, grid.points[key]!);
    if (cost >= (costs.get(key) ?? Number.POSITIVE_INFINITY)) continue;
    costs.set(key, cost);
    heap.push({ key, priority: cost + distance(grid.points[key]!, target) });
  }

  let reached: number | null = null;
  while (heap.size > 0) {
    const current = heap.pop()!;
    const knownCost = costs.get(current.key);
    if (knownCost === undefined) continue;
    if (goals.has(current.key)) {
      reached = current.key;
      break;
    }
    for (const neighbour of neighbourKeys(grid, current.key)) {
      const diagonal = Math.abs(neighbour - current.key) !== 1 && Math.abs(neighbour - current.key) !== grid.cols;
      const nextCost = knownCost + GRID_STEP * (diagonal ? Math.SQRT2 : 1);
      if (nextCost >= (costs.get(neighbour) ?? Number.POSITIVE_INFINITY)) continue;
      costs.set(neighbour, nextCost);
      parents.set(neighbour, current.key);
      heap.push({ key: neighbour, priority: nextCost + distance(grid.points[neighbour]!, target) });
    }
  }
  if (reached === null) return null;

  const reversed: Point[] = [];
  let cursor = reached;
  reversed.push(grid.points[cursor]!);
  while (parents.has(cursor)) {
    cursor = parents.get(cursor)!;
    reversed.push(grid.points[cursor]!);
  }
  reversed.reverse();
  return simplifyPath(reversed);
}

function targetDominatesNearby(
  point: Point,
  target: InteractionDefinition,
  location: LocationDefinition,
): boolean {
  const targetDistance = distance(point, target);
  for (const interaction of location.interactions) {
    if (interaction.id === target.id) continue;
    if (targetDistance + 2 > distance(point, interaction)) return false;
  }
  for (const npc of location.npcs) {
    // Interactions are considered before NPCs at equal distance in the game.
    if (targetDistance > distance(point, npc) + 0.5) return false;
  }
  return true;
}

function planInteractionPath(run: RunState, interaction: InteractionDefinition): Point[] {
  const location = LOCATIONS[run.locationId];
  const obstacles = activeObstacles(location, run);
  const footprint = getVisual(run.characterId).footprint.radius;
  for (const goalClearance of [28, 16, 6]) {
    for (const padding of [8, 4, 1]) {
      const planningRadius = footprint + padding;
      const path = planGridPath(
        location,
        obstacles,
        run.player,
        interaction,
        (point) => distance(point, interaction) <= interaction.radius - goalClearance
          && targetDominatesNearby(point, interaction, location),
        planningRadius,
      );
      if (path) return path;
    }
  }
  throw new Error(`No collision-safe public path reaches ${run.locationId}.${interaction.id}.`);
}

function pointHasNearbyBlocker(point: Point, location: LocationDefinition): boolean {
  return location.interactions.some((interaction) => distance(point, interaction) <= interaction.radius)
    || location.npcs.some((npc) => distance(point, npc) <= 78);
}

function exitApproaches(location: LocationDefinition, exit: ExitDefinition, run: RunState): ExitApproach[] {
  const radius = getVisual(run.characterId).footprint.radius;
  const obstacles = activeObstacles(location, run);
  const clearance = radius + 14;
  const entryInset = radius - 2;
  const fractions = [0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92];
  const candidates: ExitApproach[] = [];
  for (const fraction of fractions) {
    const y = exit.y + exit.height * fraction;
    const x = exit.x + exit.width * fraction;
    candidates.push(
      { point: { x: exit.x - clearance, y }, entry: { x: exit.x - entryInset, y }, key: 'ArrowRight' },
      { point: { x: exit.x + exit.width + clearance, y }, entry: { x: exit.x + exit.width + entryInset, y }, key: 'ArrowLeft' },
      { point: { x, y: exit.y - clearance }, entry: { x, y: exit.y - entryInset }, key: 'ArrowDown' },
      { point: { x, y: exit.y + exit.height + clearance }, entry: { x, y: exit.y + exit.height + entryInset }, key: 'ArrowUp' },
    );
  }
  return candidates.filter((candidate) => {
    if (!canOccupy(candidate.point, radius + 4, location.bounds, obstacles)) return false;
    if (!canOccupy(candidate.entry, radius, location.bounds, obstacles)) return false;
    if (!circleIntersectsRect(candidate.entry, radius + 1, exit)) return false;
    return !pointHasNearbyBlocker(candidate.entry, location);
  });
}

function planExitApproach(run: RunState, exit: ExitDefinition): { approach: ExitApproach; path: Point[] } {
  const location = LOCATIONS[run.locationId];
  const obstacles = activeObstacles(location, run);
  const radius = getVisual(run.characterId).footprint.radius;
  const candidates = exitApproaches(location, exit, run)
    .sort((left, right) => distance(run.player, left.point) - distance(run.player, right.point));

  for (const approach of candidates) {
    for (const padding of [6, 3, 0]) {
      const planningRadius = radius + padding;
      const path = planGridPath(
        location,
        obstacles,
        run.player,
        approach.point,
        (point) => distance(point, approach.point) <= GRID_STEP,
        planningRadius,
      );
      if (!path) continue;
      const last = path.at(-1) ?? run.player;
      if (lineIsOpen(last, approach.point, radius, location.bounds, obstacles)) path.push(approach.point);
      return { approach, path };
    }
  }
  throw new Error(`No collision-safe public approach reaches exit ${run.locationId}.${exit.id}.`);
}

async function releaseMovementKeys(page: Page): Promise<void> {
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ShiftLeft'] as const) {
    await page.keyboard.up(key);
  }
}

async function drainDialogue(page: Page, allowEnding = false): Promise<void> {
  const panel = page.locator('#dialogue-panel');
  const ending = page.locator('#ending-screen');
  for (let index = 0; index < 120; index += 1) {
    if (allowEnding && await ending.isVisible()) return;
    if (!await panel.isVisible()) return;
    const choices = page.locator('#dialogue-choices button');
    if (await choices.first().isVisible()) await page.keyboard.press('Digit1');
    else await page.keyboard.press('KeyE');
    await page.waitForTimeout(35);
  }
  throw new Error('Dialogue did not drain after 120 public keyboard advances.');
}

async function clearIncidentalBlockers(page: Page): Promise<void> {
  if (await page.locator('#dialogue-panel').isVisible()) await drainDialogue(page);
  const prompt = page.locator('#interaction-prompt');
  if (await prompt.isVisible() && (await page.locator('#interaction-label').textContent())?.includes('Escape Ross')) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
  }
}

async function driveToWaypoint(page: Page, locationId: LocationId, waypoint: Point): Promise<void> {
  let previous: Point | null = null;
  let stagnant = 0;
  const started = await readRun(page);
  const gameDeadline = started.elapsedSeconds + Math.max(10, distance(started.player, waypoint) / 45 + 8);
  const wallDeadline = Date.now() + 3 * 60_000;
  while (Date.now() < wallDeadline) {
    await clearIncidentalBlockers(page);
    if (await page.locator('#failure-screen').isVisible()) {
      await page.locator('#failure-retry-button').click();
      throw new Error(`A gameplay setback occurred while navigating ${locationId}; checkpoint retry was invoked through the public UI.`);
    }
    const run = await readRun(page);
    if (run.locationId !== locationId) throw new Error(`Unexpected transition ${locationId} -> ${run.locationId} while following a waypoint.`);
    if (run.elapsedSeconds > gameDeadline) break;
    const remaining = distance(run.player, waypoint);
    if (remaining <= POSITION_TOLERANCE) {
      await releaseMovementKeys(page);
      await page.waitForTimeout(260);
      const settled = await readRun(page);
      if (distance(settled.player, waypoint) <= POSITION_TOLERANCE + 7) return;
    }

    if (previous && distance(previous, run.player) < 1.25) stagnant += 1;
    else stagnant = 0;
    if (stagnant >= 9) {
      await releaseMovementKeys(page);
      throw new Error(`Public movement stalled near ${Math.round(run.player.x)},${Math.round(run.player.y)} en route to ${Math.round(waypoint.x)},${Math.round(waypoint.y)}.`);
    }
    previous = { ...run.player };

    const dx = waypoint.x - run.player.x;
    const dy = waypoint.y - run.player.y;
    const keys: ArrowKey[] = [];
    if (Math.abs(dx) > 5) keys.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
    if (Math.abs(dy) > 5) keys.push(dy < 0 ? 'ArrowUp' : 'ArrowDown');
    for (const key of keys) await page.keyboard.down(key);
    // Keep each physical key state alive long enough for software-WebGL
    // browsers under load to observe it on at least one game frame.
    const pulse = Math.max(240, Math.min(800, Math.round((remaining - 18) / 220 * 1000)));
    await page.waitForTimeout(pulse);
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(remaining < 65 ? 240 : 90);
  }
  await releaseMovementKeys(page);
  const run = await readRun(page);
  throw new Error(`Timed out at ${Math.round(run.player.x)},${Math.round(run.player.y)} driving toward ${Math.round(waypoint.x)},${Math.round(waypoint.y)}.`);
}

async function drivePath(page: Page, locationId: LocationId, path: readonly Point[]): Promise<void> {
  for (const waypoint of path) await driveToWaypoint(page, locationId, waypoint);
}

function locationRoute(start: LocationId, destination: LocationId, flags: readonly string[]): ExitDefinition[] {
  if (start === destination) return [];
  const queue: LocationId[] = [start];
  const visited = new Set<LocationId>([start]);
  const previous = new Map<LocationId, { location: LocationId; exit: ExitDefinition }>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const exit of LOCATIONS[current].exits) {
      if (exit.requiredFlag && !flags.includes(exit.requiredFlag)) continue;
      if (visited.has(exit.destination)) continue;
      visited.add(exit.destination);
      previous.set(exit.destination, { location: current, exit });
      if (exit.destination === destination) {
        const route: ExitDefinition[] = [];
        let cursor = destination;
        while (cursor !== start) {
          const step = previous.get(cursor);
          if (!step) throw new Error(`Broken route reconstruction from ${start} to ${destination}.`);
          route.push(step.exit);
          cursor = step.location;
        }
        return route.reverse();
      }
      queue.push(exit.destination);
    }
  }
  throw new Error(`No currently unlocked route connects ${start} to ${destination}.`);
}

async function takeExit(page: Page, exit: ExitDefinition): Promise<void> {
  let run = await readRun(page);
  expect(run.locationId, `Exit ${exit.id} must be used from its authored source.`).not.toBe(exit.destination);
  let approach: ExitApproach | null = null;
  let navigationError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    run = await readRun(page);
    const planned = planExitApproach(run, exit);
    approach = planned.approach;
    try {
      await drivePath(page, run.locationId, planned.path);
      navigationError = null;
      break;
    } catch (error) {
      navigationError = error;
      await releaseMovementKeys(page);
    }
  }
  if (navigationError || !approach) throw navigationError ?? new Error(`Exit ${exit.id} had no usable approach.`);
  await releaseMovementKeys(page);
  await page.waitForTimeout(900);

  const before = await readRun(page);
  expect(circleIntersectsRect(before.player, getVisual(before.characterId).footprint.radius + 1, exit)).toBe(false);
  await page.keyboard.down(approach.key);
  try {
    await expect.poll(
      async () => (await readRun(page)).locationId,
      { timeout: 3 * 60_000, intervals: [200, 350, 500] },
    ).toBe(exit.destination);
  } finally {
    await page.keyboard.up(approach.key);
  }
  await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('#hud')).toBeVisible();
  await page.waitForTimeout(160);
  const arrived = await readRun(page);
  expect(arrived.locationId).toBe(exit.destination);
  const spawn = LOCATIONS[exit.destination].spawns.find((candidate) => candidate.id === exit.destinationSpawn);
  expect(spawn, `Destination spawn ${exit.destination}.${exit.destinationSpawn} must exist.`).toBeTruthy();
  expect(distance(arrived.player, spawn!), `Exit ${exit.id} must arrive near ${exit.destinationSpawn}.`).toBeLessThan(75);
}

async function travelTo(page: Page, destination: LocationId): Promise<void> {
  let run = await readRun(page);
  const route = locationRoute(run.locationId, destination, run.flags);
  for (const exit of route) {
    await takeExit(page, exit);
    run = await readRun(page);
  }
  expect(run.locationId).toBe(destination);
}

async function useInteraction(page: Page, interactionId: string): Promise<void> {
  let run = await readRun(page);
  const location = LOCATIONS[run.locationId];
  const interaction = location.interactions.find((candidate) => candidate.id === interactionId);
  if (!interaction) throw new Error(`Interaction ${interactionId} is not authored in ${run.locationId}.`);
  if (run.completedTargets.includes(interactionId)) return;

  let navigationError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    run = await readRun(page);
    const path = planInteractionPath(run, interaction);
    try {
      await drivePath(page, run.locationId, path);
      navigationError = null;
      break;
    } catch (error) {
      navigationError = error;
      await releaseMovementKeys(page);
    }
  }
  if (navigationError) throw new Error(`Could not publicly navigate to ${interactionId} after three replans.`, { cause: navigationError });
  await releaseMovementKeys(page);
  await expect(page.locator('#interaction-prompt')).toBeVisible();
  await expect(page.locator('#interaction-label')).toHaveText(interaction.label);

  await page.keyboard.down('KeyE');
  try {
    const holdStarted = await readRun(page);
    const gameDeadline = holdStarted.elapsedSeconds + (interaction.holdMs ?? 280) / 1000 + 8;
    const wallDeadline = Date.now() + 3 * 60_000;
    let completed = false;
    while (Date.now() < wallDeadline) {
      const current = await readRun(page);
      completed = current.completedTargets.includes(interactionId);
      if (completed || current.elapsedSeconds > gameDeadline) break;
      await page.waitForTimeout(500);
    }
    expect(completed, `${interactionId} must complete while the real E key remains held.`).toBe(true);
  } finally {
    await page.keyboard.up('KeyE');
  }
  await page.waitForTimeout(55);
  await drainDialogue(page);
  expect((await readRun(page)).completedTargets).toContain(interactionId);
}

async function openCleanPublicGame(page: Page): Promise<void> {
  await page.addInitScript((marker) => {
    if (sessionStorage.getItem(marker)) return;
    localStorage.clear();
    sessionStorage.setItem(marker, '1');
  }, CLEAN_BOOT_MARKER);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 20_000 });
  await expect(page.locator('#title-screen')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__busyDayTest?.getState));

  // Exercise the actual settings menu; this is not a localStorage fixture.
  await page.locator('#title-settings-button').click();
  await expect(page.locator('#settings-menu')).toBeVisible();
  await page.locator('#mute-setting').setChecked(true);
  await page.locator('#typewriter-setting').setChecked(false);
  await page.locator('#reduced-motion-setting').setChecked(true);
  await page.locator('#relaxed-setting').setChecked(true);
  await page.locator('#settings-menu [data-close-settings]').click();
  await expect(page.locator('#settings-menu')).toBeHidden();
}

async function startShift(page: Page, character: 'mel' | 'josh'): Promise<void> {
  await page.locator(`[data-character="${character}"]`).click();
  await page.locator('#new-game-button').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect.poll(async () => (await readRun(page)).locationId).toBe('teaRoom');
  await drainDialogue(page);
  const run = await readRun(page);
  expect(run.characterId).toBe(character);
  expect(run.objectiveIndex).toBe(0);
  expect(run.completedTargets).toEqual([]);
}

async function completeShiftThroughPublicControls(page: Page, character: 'mel' | 'josh'): Promise<void> {
  await openCleanPublicGame(page);
  await startShift(page, character);

  while (true) {
    const run = await readRun(page);
    if (run.finished) break;
    const objective = OBJECTIVES[run.objectiveIndex];
    if (!objective) throw new Error(`No objective is authored at index ${run.objectiveIndex}.`);
    await test.step(`${run.objectiveIndex + 1}/${OBJECTIVES.length} ${objective.id}`, async () => {
      await travelTo(page, objective.location);
      for (const target of objective.targets) await useInteraction(page, target);
    });
    const progressed = await readRun(page);
    expect(progressed.completedObjectives).toContain(objective.id);
    expect(progressed.objectiveIndex).toBe(run.objectiveIndex + 1);
  }

  await drainDialogue(page, true);
  await expect(page.locator('#ending-screen')).toBeVisible({ timeout: 15_000 });
  const final = await readRun(page);
  expect(final.finished).toBe(true);
  expect(final.completedObjectives).toEqual(OBJECTIVES.map((objective) => objective.id));
  expect(final.completedTargets).toEqual(OBJECTIVES.flatMap((objective) => [...objective.targets]));
  await expect(page.locator('#ending-tasks')).toHaveText(`${OBJECTIVES.length}/${OBJECTIVES.length}`);
  expect(final.characterId).toBe(character);
  expect(final.meters.health).toBeGreaterThan(0);
}

test.describe.serial('public-input opening-to-ending journeys', () => {
  for (const character of ['mel', 'josh'] as const) {
    test(`${character} completes all ${OBJECTIVES.length} objectives without mutation helpers`, async ({ page }) => {
      const monitor = installRuntimeMonitor(page);
      await completeShiftThroughPublicControls(page, character);
      expect(monitor.issues, `Runtime issues during ${character}'s public journey:\n${monitor.issues.join('\n')}`).toEqual([]);
    });
  }
});
