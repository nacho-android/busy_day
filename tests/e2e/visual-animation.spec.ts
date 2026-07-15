import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { drainDialogue, expect, openCleanGame, restoreRunAt, startNewShift, state, test } from './support';

test('authored car frames turn and drive out over the empty car-park background', async ({ page, browserName, runtimeIssues: _runtimeIssues }) => {
  test.skip(browserName !== 'chromium', 'Visual frame capture is canonical in Chromium.');
  test.slow();
  const output = resolve('visual-qa', 'vehicle-driveout');
  mkdirSync(output, { recursive: true });

  await openCleanGame(page, { fast: true });
  await startNewShift(page);
  await drainDialogue(page);
  await page.evaluate(() => {
    const key = 'busy_day_at_the_viv_v2_save';
    const envelope = JSON.parse(localStorage.getItem(key) ?? '{}') as { settings?: { reducedMotion?: boolean } };
    if (envelope.settings) envelope.settings.reducedMotion = false;
    localStorage.setItem(key, JSON.stringify(envelope));
  });
  await restoreRunAt(page, 'carPark', { objectiveIndex: 16 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__busyDayTest?.setReducedMotion(false) ?? false)).toBe(true);

  await page.screenshot({ path: resolve(output, '01-parked.png') });
  expect(await page.evaluate(() => window.__busyDayTest?.setWorldTweenScale(.35) ?? false)).toBe(true);
  expect(await page.evaluate(() => window.__busyDayTest?.completeCurrentTarget() ?? false)).toBe(true);
  await page.waitForFunction(() => {
    const api = window.__busyDayTest;
    if ((api?.getWorldPropSnapshot('car_sally')?.x ?? 0) <= 370) return false;
    return api?.setWorldTweenScale(0) ?? false;
  });
  await page.screenshot({ path: resolve(output, '02-turning.png') });
  expect(await page.evaluate(() => window.__busyDayTest?.setWorldTweenScale(1) ?? false)).toBe(true);
  await page.waitForFunction(() => {
    const api = window.__busyDayTest;
    if ((api?.getWorldPropSnapshot('car_sally')?.x ?? 0) <= 650) return false;
    return api?.setWorldTweenScale(0) ?? false;
  });
  const drivingSnapshot = await page.evaluate(() => window.__busyDayTest?.getWorldPropSnapshot('car_sally') ?? null);
  expect(drivingSnapshot).not.toBeNull();
  expect(drivingSnapshot!.x).toBeGreaterThan(650);
  expect(drivingSnapshot!.x).toBeLessThan(1200);
  expect(drivingSnapshot!.alpha).toBeGreaterThan(.2);
  await page.screenshot({ path: resolve(output, '03-driving.png') });
  expect(await page.evaluate(() => window.__busyDayTest?.setWorldTweenScale(1) ?? false)).toBe(true);
  await page.waitForFunction(() => window.__busyDayTest?.getWorldPropSnapshot('car_sally') === null);
  await page.screenshot({ path: resolve(output, '04-cleared.png') });

  expect((await state(page))?.completedTargets).toContain('car_sally');
});
