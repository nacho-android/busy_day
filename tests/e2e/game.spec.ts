import { LOCATIONS } from '../../src/data/locations';
import { OBJECTIVES } from '../../src/data/story';
import { assertNoPageScroll, drainDialogue, expect, openCleanGame, startNewShift, state, test, traverseExit } from './support';

// The key that crosses an exit can advance the destination scene by one
// simulation step before Playwright observes the location change.
const ENTRY_STEP_TOLERANCE = 24;

test.describe('Busy Day V2 core journey', () => {
  test('title selection starts a playable shift and dialogue advances accessibly', async ({ page, runtimeIssues: _runtimeIssues }) => {
    await openCleanGame(page);

    await expect(page).toHaveTitle('Busy Day at the Viv V2');
    await expect(page.locator('#game-title')).toContainText('Busy Day');
    await expect(page.locator('#continue-button')).toBeHidden();
    await expect(page.locator('[data-character="mel"]')).toHaveAttribute('aria-pressed', 'true');

    await startNewShift(page, 'josh');
    await expect(page.locator('[data-character="josh"]')).toHaveAttribute('aria-pressed', 'true');

    await expect(page.locator('#hud-lead')).toHaveText('JOSH');
    await expect(page.locator('#hud-location')).toHaveText('TEA ROOM');
    await expect(page.locator('#hud-objective-title')).toHaveText('Check the shift board');
    await expect(page.locator('#dialogue-panel')).toBeVisible();
    await expect(page.locator('#dialogue-speaker')).toHaveText('Sally');

    // If the typewriter is still active, one activation reveals the full line.
    // On a slower browser the line may already have finished before Playwright arrives.
    const openingText = page.locator('#dialogue-text');
    if (!(await openingText.textContent())?.includes('Board first, cart second')) {
      // Dispatch atomically: WebKit's actionability wait can otherwise outlast
      // the typewriter and turn the same activation into a next-line action.
      await page.evaluate(() => document.querySelector<HTMLButtonElement>('#dialogue-advance')?.click());
    }
    await expect(openingText).toContainText('Board first, cart second');
    await drainDialogue(page);

    const run = await state(page);
    expect(run?.characterId).toBe('josh');
    expect(run?.objectiveIndex).toBe(0);
    await expect(page.locator('#game canvas')).toBeVisible();
    await assertNoPageScroll(page);
  });

  test('saved objective progress survives reload and Continue restores the run', async ({ page, runtimeIssues: _runtimeIssues }) => {
    await openCleanGame(page, { fast: true });
    await startNewShift(page);
    await drainDialogue(page);

    await expect.poll(() => page.evaluate(() => window.__busyDayTest?.teleportToInteraction('shift_board') ?? false)).toBe(true);
    const completed = await page.evaluate(() => window.__busyDayTest?.completeCurrentTarget() ?? false);
    expect(completed).toBe(true);

    const beforeReload = await state(page);
    expect(beforeReload?.completedObjectives).toContain('check_board');
    expect(beforeReload?.objectiveIndex).toBe(1);
    expect(beforeReload?.runId).toBeTruthy();

    await page.reload();
    await expect(page.locator('#title-screen')).toBeVisible();
    await expect(page.locator('#continue-button')).toBeVisible();
    await page.locator('#continue-button').click();

    await expect(page.locator('#hud')).toBeVisible();
    await expect(page.locator('#hud-objective-title')).toHaveText(OBJECTIVES[1]!.title);
    const restored = await state(page);
    expect(restored?.runId).toBe(beforeReload?.runId);
    expect(restored?.objectiveIndex).toBe(1);
    expect(restored?.completedObjectives).toContain('check_board');
    expect(restored?.failure).toBeNull();
  });

  test('all data-driven objectives progress to the win condition and ending', async ({ page, runtimeIssues: _runtimeIssues }) => {
    test.slow();
    await openCleanGame(page, { fast: true });
    await startNewShift(page);
    await drainDialogue(page);

    let completedTargets = 0;
    const expectedTargets = OBJECTIVES.reduce((total, objective) => total + objective.targets.length, 0);
    for (let objectiveIndex = 0; objectiveIndex < OBJECTIVES.length; objectiveIndex += 1) {
      const expectedLocation = OBJECTIVES[objectiveIndex]!.location;
      await expect.poll(() => page.evaluate(() => window.__busyDayTest?.travelToObjective() ?? false)).toBe(true);
      await expect.poll(() => page.evaluate(() => window.__busyDayTest?.getLocation() ?? null)).toBe(expectedLocation);

      while ((await state(page))?.objectiveIndex === objectiveIndex) {
        await expect.poll(() => page.evaluate(() => window.__busyDayTest?.completeCurrentTarget() ?? false)).toBe(true);
        completedTargets += 1;
        expect(completedTargets).toBeLessThanOrEqual(expectedTargets);
      }

      if (objectiveIndex < OBJECTIVES.length - 1 && await page.locator('#dialogue-panel').isVisible()) {
        await drainDialogue(page);
      }
    }

    const journey = { completedTargets, run: await state(page) };

    expect(journey.completedTargets).toBe(expectedTargets);
    expect(journey.run?.completedTargets).toHaveLength(expectedTargets);
    expect(journey.run?.completedObjectives).toHaveLength(OBJECTIVES.length);
    expect(journey.run?.objectiveIndex).toBe(OBJECTIVES.length);
    expect(journey.run?.finished).toBe(true);

    await drainDialogue(page, { untilEnding: true, limit: 120 });
    await expect(page.locator('#ending-screen')).toBeVisible();
    await expect(page.locator('#ending-title')).toContainText('Coffee');
    await expect(page.locator('#ending-tasks')).toHaveText(`${OBJECTIVES.length}/${OBJECTIVES.length}`);
    await expect(page.locator('#ending-rank')).toHaveText(/^[SABCD]$/);
    await expect(page.locator('#hud')).toBeHidden();
  });

  test('real reciprocal exits restart scenes at stable destination spawns', async ({ page, runtimeIssues: _runtimeIssues }) => {
    test.slow();
    await openCleanGame(page, { fast: true });
    await startNewShift(page);
    await drainDialogue(page);

    const hallFromTea = await traverseExit(page, 'tea_to_hall', 'mainHall');
    expect(hallFromTea.spawnId).toBe('fromTea');
    const hallFromTeaSpawn = LOCATIONS.mainHall.spawns.find((spawn) => spawn.id === 'fromTea')!;
    expect(Math.abs(hallFromTea.player.x - hallFromTeaSpawn.x)).toBeLessThanOrEqual(ENTRY_STEP_TOLERANCE);
    expect(Math.abs(hallFromTea.player.y - hallFromTeaSpawn.y)).toBeLessThanOrEqual(2);

    // Verify the restarted player rig still accepts movement before continuing.
    await page.waitForTimeout(900);
    const beforeMoveX = (await state(page))!.player.x;
    await page.keyboard.down('ArrowRight');
    try {
      await expect.poll(
        () => state(page).then((run) => run?.player.x ?? 0),
        { timeout: 10_000, intervals: [50, 100, 200] },
      ).toBeGreaterThan(beforeMoveX + 1);
    } finally {
      await page.keyboard.up('ArrowRight');
    }

    const feedFromHall = await traverseExit(page, 'hall_to_feed', 'feedStore');
    expect(feedFromHall.spawnId).toBe('fromHall');
    const feedFromHallSpawn = LOCATIONS.feedStore.spawns.find((spawn) => spawn.id === 'fromHall')!;
    expect(Math.abs(feedFromHall.player.x - feedFromHallSpawn.x)).toBeLessThanOrEqual(ENTRY_STEP_TOLERANCE);
    expect(Math.abs(feedFromHall.player.y - feedFromHallSpawn.y)).toBeLessThanOrEqual(2);
    await expect.poll(() => page.evaluate(() => window.__busyDayTest?.teleportToInteraction('feed_cart') ?? false)).toBe(true);

    const hallFromFeed = await traverseExit(page, 'feed_to_hall', 'mainHall');
    expect(hallFromFeed.spawnId).toBe('fromFeed');
    const hallFromFeedSpawn = LOCATIONS.mainHall.spawns.find((spawn) => spawn.id === 'fromFeed')!;
    expect(Math.abs(hallFromFeed.player.x - hallFromFeedSpawn.x)).toBeLessThanOrEqual(ENTRY_STEP_TOLERANCE);
    expect(Math.abs(hallFromFeed.player.y - hallFromFeedSpawn.y)).toBeLessThanOrEqual(2);
    await page.waitForTimeout(900);
    expect((await state(page))?.locationId).toBe('mainHall');
  });

  test('health failure presents a setback and retry restores the checkpoint', async ({ page, runtimeIssues: _runtimeIssues }) => {
    await openCleanGame(page, { fast: true });
    await startNewShift(page);
    await drainDialogue(page);

    await page.evaluate(() => window.__busyDayTest?.setMeters({ health: 0 }));
    await expect(page.locator('#failure-screen')).toBeVisible();
    await expect(page.locator('#failure-reason')).toContainText('Health reached zero');
    expect((await state(page))?.failure).toBe('health');

    await page.locator('#failure-retry-button').click();
    await expect(page.locator('#failure-screen')).toBeHidden();
    await expect(page.locator('#hud')).toBeVisible();
    const retried = await state(page);
    expect(retried?.failure).toBeNull();
    expect(retried?.objectiveIndex).toBe(0);
    expect(retried?.locationId).toBe('teaRoom');
    expect(retried?.meters.health).toBe(100);
  });

  test('portrait prompt pauses without losing state and landscape resumes immediately', async ({ page, runtimeIssues: _runtimeIssues }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openCleanGame(page, { fast: true });
    await startNewShift(page);
    await drainDialogue(page);
    const originalRunId = (await state(page))?.runId;

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#rotate-prompt')).toBeVisible();
    await expect(page.locator('#rotate-prompt')).toHaveAttribute('aria-hidden', 'false');
    await assertNoPageScroll(page);
    expect((await state(page))?.runId).toBe(originalRunId);

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#rotate-prompt')).toBeHidden();
    await expect(page.locator('#rotate-prompt')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#hud')).toBeVisible();
    await expect(page.locator('#touch-controls')).toBeVisible();
    expect((await state(page))?.runId).toBe(originalRunId);
  });
});
