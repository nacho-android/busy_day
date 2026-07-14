import { expect, test as base, type Page } from '@playwright/test';
import type { BusyDayTestApi, LocationId, RunState } from '../../src/types/game';

const SAVE_KEY = 'busy_day_at_the_viv_v2_save';
const TEST_BOOT_MARKER = 'busy_day_e2e_bootstrapped';

const FAST_SETTINGS = {
  musicVolume: 0,
  sfxVolume: 0,
  muted: true,
  typewriter: false,
  reducedMotion: true,
  highContrast: false,
  subtitles: true,
  textSize: 'normal',
  handedness: 'right',
  relaxed: true,
} as const;

export const test = base.extend<{ runtimeIssues: string[] }>({
  runtimeIssues: async ({ page }, use) => {
    const issues: string[] = [];
    page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') issues.push(`console.error: ${message.text()}`);
    });

    await use(issues);

    expect(issues, `Unexpected browser errors:\n${issues.join('\n')}`).toEqual([]);
  },
});

export { expect } from '@playwright/test';

declare global {
  interface Window {
    __busyDayTest?: BusyDayTestApi;
  }
}

export async function openCleanGame(page: Page, options: { fast?: boolean } = {}): Promise<void> {
  const fast = options.fast ?? false;
  await page.addInitScript(({ marker, saveKey, useFastSettings, settings }) => {
    if (sessionStorage.getItem(marker)) return;
    localStorage.clear();
    if (useFastSettings) {
      localStorage.setItem(saveKey, JSON.stringify({
        schemaVersion: 2,
        savedAt: new Date(0).toISOString(),
        settings,
        profile: { bestRank: null, bestCoins: 0, completedRuns: 0 },
        activeRun: null,
      }));
    }
    sessionStorage.setItem(marker, '1');
  }, {
    marker: TEST_BOOT_MARKER,
    saveKey: SAVE_KEY,
    useFastSettings: fast,
    settings: FAST_SETTINGS,
  });

  await page.goto('/');
  await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('#title-screen')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__busyDayTest));
}

export async function startNewShift(page: Page, character: 'mel' | 'josh' = 'mel'): Promise<void> {
  if (character === 'josh') await page.locator('[data-character="josh"]').click();
  await page.locator('#new-game-button').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__busyDayTest?.getLocation() ?? null)).toBe('teaRoom');
}

export async function state(page: Page): Promise<RunState | null> {
  return page.evaluate(() => window.__busyDayTest?.getState() ?? null);
}

export async function traverseExit(page: Page, exitId: string, destination: LocationId): Promise<RunState> {
  // Let the freshly restarted scene clear its transition cooldown, then use
  // the real keyboard path through the actual exit rectangle.
  await page.waitForTimeout(900);
  const key = await page.evaluate((id) => window.__busyDayTest?.approachExit(id) ?? null, exitId);
  expect(key, `Expected ${exitId} to exist in the active location`).not.toBeNull();
  await page.waitForTimeout(150);

  await page.keyboard.down(key!);
  try {
    await expect.poll(
      () => page.evaluate(() => window.__busyDayTest?.getLocation() ?? null),
      { timeout: 20_000, intervals: [50, 100, 200] },
    ).toBe(destination);
  } finally {
    await page.keyboard.up(key!);
  }

  // Observe at least a few destination frames after releasing the crossing
  // direction so carried input cannot hide behind the location-state change.
  await page.waitForTimeout(100);
  const arrived = await state(page);
  expect(arrived).not.toBeNull();
  expect(arrived!.locationId).toBe(destination);
  return arrived!;
}

export async function drainDialogue(page: Page, options: { untilEnding?: boolean; limit?: number } = {}): Promise<void> {
  const panel = page.locator('#dialogue-panel');
  const ending = page.locator('#ending-screen');
  const limit = options.limit ?? 100;

  for (let index = 0; index < limit; index += 1) {
    if (options.untilEnding && await ending.isVisible()) return;
    if (!await panel.isVisible()) {
      if (!options.untilEnding) return;
      await page.waitForTimeout(20);
      continue;
    }

    const firstChoice = page.locator('#dialogue-choices button').first();
    if (await firstChoice.isVisible()) await firstChoice.click();
    else await page.locator('#dialogue-advance').click();
  }

  if (options.untilEnding) await expect(ending).toBeVisible();
  else await expect(panel).toBeHidden();
}

export async function assertNoPageScroll(page: Page): Promise<void> {
  const before = await page.evaluate(() => ({
    innerWidth,
    innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
    htmlOverscroll: getComputedStyle(document.documentElement).overscrollBehavior,
  }));

  expect(before.scrollWidth).toBeLessThanOrEqual(before.innerWidth);
  expect(before.scrollHeight).toBeLessThanOrEqual(before.innerHeight);
  expect(before.bodyOverflow).toBe('hidden');
  // Older WebKit exposes the functional rule but not this computed-style field.
  if (before.htmlOverscroll) expect(before.htmlOverscroll).toBe('none');

  await page.mouse.wheel(0, 1_000);
  await expect.poll(() => page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
}
