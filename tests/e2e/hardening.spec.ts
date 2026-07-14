import type { Page } from '@playwright/test';
import { LOCATIONS, LOCATION_LIST } from '../../src/data/locations';
import { FINAL_DIALOGUE, OBJECTIVES } from '../../src/data/story';
import type { LocationId } from '../../src/types/game';
import {
  drainDialogue,
  expect,
  openCleanGame,
  restoreRunAt,
  startNewShift,
  state,
  test,
  traverseExit,
} from './support';

const EXIT_ROUTES = LOCATION_LIST.flatMap((location) => location.exits.map((exit) => ({
  origin: location.id,
  exit,
}))) as Array<{ origin: LocationId; exit: (typeof LOCATION_LIST)[number]['exits'][number] }>;

const ENTRY_STEP_TOLERANCE = 32;
const EXIT_ROUTE_GROUPS = [EXIT_ROUTES.slice(0, 6), EXIT_ROUTES.slice(6, 12), EXIT_ROUTES.slice(12)];

declare global {
  interface Window {
    __busyDayPad?: { setButton(index: number, pressed: boolean): void };
  }
}

async function installFakeGamepad(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      axes: [0, 0, 0, 0],
      buttons,
      connected: true,
      id: 'Busy Day E2E Standard Gamepad',
      index: 0,
      mapping: 'standard',
      timestamp: 0,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    window.__busyDayPad = {
      setButton(index, pressed) {
        const button = buttons[index];
        if (!button) return;
        button.pressed = pressed;
        button.touched = pressed;
        button.value = pressed ? 1 : 0;
        pad.timestamp = performance.now();
      },
    };
  });
}

async function pulseGamepadButton(page: Page, index: number): Promise<void> {
  const waitForPollFrames = async (): Promise<void> => page.evaluate(() => new Promise<void>((resolve) => {
    let remaining = 3;
    const next = (): void => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  }));
  await page.evaluate((buttonIndex) => window.__busyDayPad?.setButton(buttonIndex, true), index);
  await waitForPollFrames();
  await page.evaluate((buttonIndex) => window.__busyDayPad?.setButton(buttonIndex, false), index);
  await waitForPollFrames();
}

async function pushFor(page: Page, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown', duration = 700): Promise<void> {
  await page.keyboard.down(key);
  try {
    await page.waitForTimeout(duration);
  } finally {
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(100);
}

async function verifyExitRoutes(page: Page, routes: typeof EXIT_ROUTES): Promise<void> {
  await openCleanGame(page, { fast: true });
  await startNewShift(page);
  await drainDialogue(page);

  for (const { origin, exit } of routes) {
    await test.step(`${origin}.${exit.id} -> ${exit.destination}.${exit.destinationSpawn}`, async () => {
      await expect.poll(() => page.evaluate(
        ({ locationId, exitId }) => window.__busyDayTest?.prepareExit(locationId, exitId) ?? false,
        { locationId: origin, exitId: exit.id },
      ), { timeout: 15_000, intervals: [50, 100, 250] }).toBe(true);
      await expect.poll(() => page.evaluate(() => window.__busyDayTest?.getLocation() ?? null)).toBe(origin);
      const arrived = await traverseExit(page, exit.id, exit.destination);
      const destinationSpawn = LOCATIONS[exit.destination].spawns.find((spawn) => spawn.id === exit.destinationSpawn);
      expect(destinationSpawn, `Missing destination spawn for ${origin}.${exit.id}`).toBeDefined();
      expect(arrived.spawnId).toBe(destinationSpawn!.id);
      expect(arrived.facing).toBe(destinationSpawn!.facing);
      expect(Math.abs(arrived.player.x - destinationSpawn!.x)).toBeLessThanOrEqual(ENTRY_STEP_TOLERANCE);
      expect(Math.abs(arrived.player.y - destinationSpawn!.y)).toBeLessThanOrEqual(ENTRY_STEP_TOLERANCE);

      const releasedPosition = { ...arrived.player };
      await page.waitForTimeout(300);
      const settled = await state(page);
      expect(settled?.locationId).toBe(exit.destination);
      expect(settled?.facing).toBe(destinationSpawn!.facing);
      expect(Math.abs((settled?.player.x ?? 0) - releasedPosition.x)).toBeLessThanOrEqual(1);
      expect(Math.abs((settled?.player.y ?? 0) - releasedPosition.y)).toBeLessThanOrEqual(1);
    });
  }
}

test.describe('Busy Day V2 browser hardening', () => {
  for (const [groupIndex, routes] of EXIT_ROUTE_GROUPS.entries()) {
    test(`all authored exit directions ${groupIndex * 6 + 1}-${groupIndex * 6 + routes.length} cross through real movement and settle at the named spawn`, async ({ page, runtimeIssues: _runtimeIssues }) => {
      test.slow();
      expect(EXIT_ROUTES).toHaveLength(18);
      await verifyExitRoutes(page, routes);
    });
  }

  test('fixed equipment, animal pens, parked cars, and a locked route remain impassable', async ({ page, runtimeIssues: _runtimeIssues }) => {
    test.slow();
    await openCleanGame(page, { fast: true });
    await startNewShift(page);
    await drainDialogue(page);

    await restoreRunAt(page, 'teaRoom', { objectiveIndex: 0, player: { x: 350, y: 365 }, facing: 'right' });
    await pushFor(page, 'ArrowRight');
    const tableCollision = await state(page);
    expect(tableCollision?.player.x).toBeLessThanOrEqual(374);
    expect(Math.abs((tableCollision?.player.y ?? 0) - 365)).toBeLessThanOrEqual(2);

    await restoreRunAt(page, 'pigHousing', { objectiveIndex: 0, player: { x: 350, y: 300 }, facing: 'left' });
    await pushFor(page, 'ArrowLeft');
    const penCollision = await state(page);
    expect(penCollision?.player.x).toBeGreaterThanOrEqual(326);
    expect(Math.abs((penCollision?.player.y ?? 0) - 300)).toBeLessThanOrEqual(2);

    const carParkIndex = OBJECTIVES.findIndex((objective) => objective.id === 'clear_carpark');
    expect(carParkIndex).toBeGreaterThan(0);
    await restoreRunAt(page, 'carPark', { objectiveIndex: carParkIndex, player: { x: 270, y: 250 }, facing: 'right' });
    await pushFor(page, 'ArrowRight');
    const carCollision = await state(page);
    expect(carCollision?.player.x).toBeLessThanOrEqual(296);
    expect(Math.abs((carCollision?.player.y ?? 0) - 250)).toBeLessThanOrEqual(2);

    await restoreRunAt(page, 'mainHall', { objectiveIndex: 0 });
    await page.waitForTimeout(900);
    const key = await page.evaluate(() => window.__busyDayTest?.approachExit('hall_to_car') ?? null);
    expect(key).toBe('ArrowDown');
    await pushFor(page, 'ArrowDown', 850);
    expect((await state(page))?.locationId).toBe('mainHall');
    await expect(page.locator('.toast').last()).toContainText('loading gate stays locked');
  });

  test('Wayne failure retries the car-park checkpoint and the checkpoint survives reload', async ({ page, runtimeIssues: _runtimeIssues }) => {
    test.slow();
    await openCleanGame(page, { fast: true });
    await startNewShift(page);
    await drainDialogue(page);

    const coffeeIndex = OBJECTIVES.findIndex((objective) => objective.id === 'coffee_finale');
    expect(coffeeIndex).toBeGreaterThan(0);
    const checkpoint = await restoreRunAt(page, 'carPark', { objectiveIndex: coffeeIndex, spawnId: 'fromHall' });
    const originalRunId = checkpoint.runId;

    await page.evaluate(() => window.__busyDayTest?.setMeters({ wayne: 100 }));
    await expect(page.locator('#failure-screen')).toBeVisible();
    await expect(page.locator('#failure-reason')).toContainText('Wayne reached maximum');
    expect((await state(page))?.failure).toBe('wayne');

    await page.locator('#failure-retry-button').click();
    await expect(page.locator('#failure-screen')).toBeHidden();
    const retried = await state(page);
    expect(retried?.runId).toBe(originalRunId);
    expect(retried?.failure).toBeNull();
    expect(retried?.objectiveIndex).toBe(coffeeIndex);
    expect(retried?.locationId).toBe('carPark');
    expect(retried?.spawnId).toBe('fromHall');
    expect(retried?.meters.wayne).toBeLessThanOrEqual(55);
    expect(retried?.flags).toContain('carParkClear');

    await page.reload();
    await expect(page.locator('#title-screen')).toBeVisible();
    await expect(page.locator('#continue-button')).toBeVisible();
    await page.locator('#continue-button').click();
    await expect(page.locator('#hud-location')).toHaveText('CAR PARK');
    const reloaded = await state(page);
    expect(reloaded?.runId).toBe(originalRunId);
    expect(reloaded?.objectiveIndex).toBe(coffeeIndex);
    expect(reloaded?.locationId).toBe('carPark');
  });

  test('pause freezes the shift and restart confirmations preserve or replace progress intentionally', async ({ page, runtimeIssues: _runtimeIssues }) => {
    await openCleanGame(page, { fast: true });
    await startNewShift(page);
    await drainDialogue(page);

    expect(await page.evaluate(() => window.__busyDayTest?.completeCurrentTarget() ?? false)).toBe(true);
    expect((await state(page))?.objectiveIndex).toBe(1);
    await drainDialogue(page);
    const originalRunId = (await state(page))!.runId;

    await page.locator('#pause-button').click();
    await expect(page.locator('#pause-menu')).toBeVisible();
    await expect(page.locator('#resume-button')).toBeFocused();
    const pausedAt = (await state(page))!.elapsedSeconds;
    await page.waitForTimeout(450);
    expect(Math.abs((await state(page))!.elapsedSeconds - pausedAt)).toBeLessThan(0.1);

    await page.locator('#restart-checkpoint-button').click();
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    await expect(page.locator('#confirm-cancel')).toBeFocused();
    await page.locator('#confirm-cancel').click();
    await expect(page.locator('#confirm-dialog')).toBeHidden();
    expect((await state(page))?.objectiveIndex).toBe(1);

    await page.locator('#restart-checkpoint-button').click();
    await page.locator('#confirm-accept').click();
    await expect(page.locator('#pause-menu')).toBeHidden();
    expect((await state(page))?.runId).toBe(originalRunId);
    expect((await state(page))?.objectiveIndex).toBe(0);

    await page.locator('#pause-button').click();
    await page.locator('#restart-shift-button').click();
    await expect(page.locator('#confirm-title')).toHaveText('Restart the whole shift?');
    await page.locator('#confirm-accept').click();
    await expect(page.locator('#hud')).toBeVisible();
    const restarted = await state(page);
    expect(restarted?.runId).not.toBe(originalRunId);
    expect(restarted?.objectiveIndex).toBe(0);
    expect(restarted?.locationId).toBe('teaRoom');
  });

  test('audio, accessibility, and handedness settings persist and reset only after confirmation', async ({ page, runtimeIssues: _runtimeIssues }) => {
    test.slow();
    await openCleanGame(page, { fast: true });
    await page.locator('#title-settings-button').click();
    await expect(page.locator('#settings-menu')).toBeVisible();
    await expect(page.locator('#music-volume')).toBeFocused();

    await page.locator('#music-volume').fill('0.3');
    await page.locator('#sfx-volume').fill('0.45');
    await page.locator('#mute-setting').uncheck();
    await page.locator('#typewriter-setting').check();
    await page.locator('#high-contrast-setting').check();
    await page.locator('#subtitles-setting').uncheck();
    await page.locator('#text-size-setting').selectOption('large');
    await page.locator('#handedness-setting').selectOption('left');
    await page.locator('[data-close-settings]').click();
    await expect(page.locator('#settings-menu')).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/text-large/);
    await expect(page.locator('body')).toHaveClass(/high-contrast/);
    await expect(page.locator('body')).toHaveClass(/touch-left/);

    await page.reload();
    await expect(page.locator('#title-screen')).toBeVisible();
    await page.locator('#title-settings-button').click();
    await expect(page.locator('#music-volume')).toHaveValue('0.3');
    await expect(page.locator('#sfx-volume')).toHaveValue('0.45');
    await expect(page.locator('#mute-setting')).not.toBeChecked();
    await expect(page.locator('#typewriter-setting')).toBeChecked();
    await expect(page.locator('#high-contrast-setting')).toBeChecked();
    await expect(page.locator('#subtitles-setting')).not.toBeChecked();
    await expect(page.locator('#text-size-setting')).toHaveValue('large');
    await expect(page.locator('#handedness-setting')).toHaveValue('left');

    await page.locator('#reset-save-button').click();
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    await page.locator('#confirm-cancel').click();
    await expect(page.locator('#settings-menu')).toBeVisible();
    await expect(page.locator('#music-volume')).toHaveValue('0.3');

    await page.locator('#reset-save-button').click();
    await expect(page.locator('#confirm-title')).toHaveText('Reset every saved shift?');
    await page.locator('#confirm-accept').click();
    await expect(page.locator('#title-screen')).toBeVisible();
    await expect(page.locator('#continue-button')).toBeHidden();

    await page.reload();
    await expect(page.locator('#title-screen')).toBeVisible();
    await page.locator('#title-settings-button').click();
    // Range controls normalise the stored 0.58/0.72 defaults to their
    // authored 0.05 UI step when rendered.
    await expect(page.locator('#music-volume')).toHaveValue('0.6');
    await expect(page.locator('#sfx-volume')).toHaveValue('0.7');
    await expect(page.locator('#mute-setting')).not.toBeChecked();
    await expect(page.locator('#text-size-setting')).toHaveValue('normal');
    await expect(page.locator('#handedness-setting')).toHaveValue('right');
  });

  test('left-handed touch joystick, hold-to-use, large text, and dialogue focus work on a phone viewport', async ({ page, runtimeIssues: _runtimeIssues }) => {
    test.slow();
    await page.setViewportSize({ width: 844, height: 390 });
    await openCleanGame(page, { fast: true });
    await page.locator('#title-settings-button').click();
    await page.locator('#text-size-setting').selectOption('large');
    await page.locator('#handedness-setting').selectOption('left');
    await page.locator('[data-close-settings]').click();
    await startNewShift(page);

    await expect(page.locator('#dialogue-panel')).toBeVisible();
    await expect(page.locator('#dialogue-advance')).toBeFocused();
    await drainDialogue(page);
    await expect(page.locator('#touch-controls')).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/touch-left/);

    const joystickBox = await page.locator('#joystick').boundingBox();
    const actionsBox = await page.locator('.touch-actions').boundingBox();
    expect(joystickBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(joystickBox!.x).toBeGreaterThan(actionsBox!.x);

    const beforeDrag = (await state(page))!.player.x;
    const centreX = joystickBox!.x + joystickBox!.width / 2;
    const centreY = joystickBox!.y + joystickBox!.height / 2;
    await page.mouse.move(centreX, centreY);
    await page.mouse.down();
    await page.mouse.move(centreX + joystickBox!.width * 0.3, centreY, { steps: 4 });
    try {
      await expect.poll(
        () => state(page).then((run) => run?.player.x ?? beforeDrag),
        { timeout: 15_000, intervals: [100, 250, 500] },
      ).toBeGreaterThan(beforeDrag + 8);
    } finally {
      await page.mouse.up();
    }
    const afterDrag = (await state(page))!.player.x;
    const settledX = await page.evaluate(async () => {
      let previous = window.__busyDayTest?.getState()?.player.x ?? 0;
      let stableFrames = 0;
      const deadline = performance.now() + 10_000;
      while (performance.now() < deadline) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const current = window.__busyDayTest?.getState()?.player.x ?? previous;
        stableFrames = Math.abs(current - previous) <= 1 ? stableFrames + 1 : 0;
        previous = current;
        if (stableFrames >= 4) return current;
      }
      throw new Error('Player did not settle across four consecutive animation frames');
    });
    expect((await state(page))!.player.x).toBeCloseTo(settledX, 0);
    expect((await state(page))!.player.x).toBeGreaterThanOrEqual(afterDrag);

    expect(await page.evaluate(() => window.__busyDayTest?.teleportToInteraction('shift_board') ?? false)).toBe(true);
    await expect(page.locator('#interaction-prompt')).toBeVisible();
    const useButton = page.locator('#touch-use');
    await useButton.hover();
    await page.mouse.down();
    await expect(useButton).toHaveClass(/active/);
    try {
      await expect.poll(
        () => state(page).then((run) => run?.objectiveIndex ?? -1),
        { timeout: 45_000, intervals: [250, 500, 1_000] },
      ).toBe(1);
    } finally {
      await page.mouse.up();
    }
    await drainDialogue(page);

    const longestLine = FINAL_DIALOGUE.reduce((longest, line) => line.text.length > longest.text.length ? line : longest);
    await page.evaluate((line) => window.__busyDayTest?.showDialogue([line]), longestLine);
    await expect(page.locator('#dialogue-panel')).toBeVisible();
    await expect(page.locator('#dialogue-speaker')).toHaveText(longestLine.speaker);
    await expect(page.locator('#dialogue-text')).toHaveText(longestLine.text);
    await expect(page.locator('#dialogue-advance')).toBeFocused();

    const panelBox = await page.locator('#dialogue-panel').boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(-1);
    expect(panelBox!.y).toBeGreaterThanOrEqual(-1);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(845);
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(391);
    expect(await page.locator('#dialogue-panel').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await drainDialogue(page);
  });

  test('gamepad-only title selection, dialogue, pause, and resume use standard controller buttons', async ({ page, runtimeIssues: _runtimeIssues }) => {
    await installFakeGamepad(page);
    await openCleanGame(page, { fast: true });
    await expect(page.locator('#new-game-button')).toBeFocused();

    await pulseGamepadButton(page, 12); // D-pad up: New Shift -> Josh.
    await expect(page.locator('[data-character="josh"]')).toBeFocused();
    await pulseGamepadButton(page, 0); // A: select Josh.
    await expect(page.locator('[data-character="josh"]')).toHaveAttribute('aria-pressed', 'true');
    await pulseGamepadButton(page, 13); // D-pad down: Josh -> New Shift.
    await expect(page.locator('#new-game-button')).toBeFocused();
    await pulseGamepadButton(page, 0); // A: start.

    await expect(page.locator('#hud-lead')).toHaveText('JOSH');
    await expect(page.locator('#dialogue-panel')).toBeVisible();
    await expect(page.locator('#dialogue-speaker')).toHaveText('Sally');
    await pulseGamepadButton(page, 0); // A: next opening line.
    await expect(page.locator('#dialogue-speaker')).toHaveText('Juan');
    await pulseGamepadButton(page, 0); // A: close opening.
    await expect(page.locator('#dialogue-panel')).toBeHidden();

    await pulseGamepadButton(page, 9); // Start: pause.
    await expect(page.locator('#pause-menu')).toBeVisible();
    await expect(page.locator('#resume-button')).toBeFocused();
    await pulseGamepadButton(page, 1); // B: back/resume.
    await expect(page.locator('#pause-menu')).toBeHidden();
    await expect(page.locator('#hud')).toBeVisible();
  });
});
