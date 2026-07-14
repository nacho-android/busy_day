import { expect, test } from '@playwright/test';

test('production bundle starts, moves, persists Continue, loads hashed assets, and omits test hooks', async ({ page }) => {
  test.slow();
  const runtimeIssues: string[] = [];
  const failedResources: string[] = [];
  const loadedResources: string[] = [];
  page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeIssues.push(`console.error: ${message.text()}`);
  });
  page.on('response', (response) => {
    const type = response.request().resourceType();
    if (response.ok()) loadedResources.push(response.url());
    if (response.status() >= 400 && ['document', 'script', 'stylesheet', 'image', 'media', 'font'].includes(type)) {
      failedResources.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('#title-screen')).toBeVisible();
  await expect(page).toHaveTitle('Busy Day at the Viv V2');
  expect(await page.evaluate(() => typeof window.__busyDayTest)).toBe('undefined');

  const moduleSources = await page.locator('script[type="module"]').evaluateAll((scripts) => scripts.map((script) => script.getAttribute('src') ?? ''));
  const styleSources = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(moduleSources.some((source) => /\/assets\/index-[\w-]+\.js$/.test(source))).toBe(true);
  expect(styleSources.some((source) => /\/assets\/index-[\w-]+\.css$/.test(source))).toBe(true);

  await page.locator('#new-game-button').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hud-location')).toHaveText('TEA ROOM');
  await expect(page.locator('#dialogue-panel')).toBeVisible();
  for (let attempt = 0; attempt < 8 && await page.locator('#dialogue-panel').isVisible(); attempt += 1) {
    await page.locator('#dialogue-advance').click();
  }
  await expect(page.locator('#dialogue-panel')).toBeHidden();

  const holdKey = async (key: 'ArrowDown', duration: number): Promise<void> => {
    await page.keyboard.down(key);
    try {
      await page.waitForTimeout(duration);
    } finally {
      await page.keyboard.up(key);
    }
    await page.waitForTimeout(120);
  };
  // Exercise real production input, then inspect only the public persisted
  // save. This avoids relying on development-only positioning helpers while
  // remaining stable under Playwright's software-WebGL frame rate.
  await holdKey('ArrowDown', 8_000);
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('busy_day_at_the_viv_v2_save');
    if (!raw) return false;
    try {
      const save = JSON.parse(raw) as { activeRun?: { locationId?: string; player?: { y?: number } } };
      return save.activeRun?.locationId === 'teaRoom' && (save.activeRun.player?.y ?? 0) > 530;
    } catch {
      return false;
    }
  }, undefined, { timeout: 20_000 });
  expect(loadedResources.some((url) => url.includes('/assets/backgrounds/tea_room.webp'))).toBe(true);

  await page.reload();
  await expect(page.locator('#title-screen')).toBeVisible();
  await expect(page.locator('#continue-button')).toBeVisible();
  expect(await page.evaluate(() => typeof window.__busyDayTest)).toBe('undefined');
  await page.locator('#continue-button').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hud-location')).toHaveText('TEA ROOM');

  // Seed only through the public, versioned save contract before the app boots
  // again. Main Hall is not in PreloadScene, so this exercises the production
  // lazy-loader rather than a development-only scene helper.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('busy-day-preview-seed-hall') !== '1') return;
    sessionStorage.removeItem('busy-day-preview-seed-hall');
    const key = 'busy_day_at_the_viv_v2_save';
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const save = JSON.parse(raw) as { activeRun?: Record<string, unknown> };
    if (!save.activeRun) return;
    Object.assign(save.activeRun, {
      locationId: 'mainHall',
      spawnId: 'fromTea',
      player: { x: 120, y: 270 },
      facing: 'right',
    });
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.evaluate(() => sessionStorage.setItem('busy-day-preview-seed-hall', '1'));
  await page.reload();
  await expect(page.locator('#continue-button')).toBeVisible();
  await page.locator('#continue-button').click();
  await expect(page.locator('#hud-location')).toHaveText('MAIN HALLWAY', { timeout: 30_000 });
  expect(loadedResources.some((url) => url.includes('/assets/backgrounds/facility_hub.webp'))).toBe(true);

  expect(failedResources, `Failed production resources:\n${failedResources.join('\n')}`).toEqual([]);
  expect(runtimeIssues, `Unexpected production runtime errors:\n${runtimeIssues.join('\n')}`).toEqual([]);
});

test('production lazy loading retries transient artwork failures and preserves Continue recovery', async ({ page }) => {
  test.slow();
  let hallRequests = 0;
  await page.route('**/assets/backgrounds/facility_hub.webp', async (route) => {
    hallRequests += 1;
    if (hallRequests <= 2) await route.abort('connectionfailed');
    else await route.continue();
  });

  await page.goto('/');
  await expect(page.locator('#title-screen')).toBeVisible();
  await page.locator('#new-game-button').click();
  for (let attempt = 0; attempt < 8 && await page.locator('#dialogue-panel').isVisible(); attempt += 1) {
    await page.locator('#dialogue-advance').click();
  }
  await expect(page.locator('#dialogue-panel')).toBeHidden();

  await page.addInitScript(() => {
    if (sessionStorage.getItem('busy-day-preview-retry-hall') !== '1') return;
    sessionStorage.removeItem('busy-day-preview-retry-hall');
    const key = 'busy_day_at_the_viv_v2_save';
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const save = JSON.parse(raw) as { activeRun?: Record<string, unknown> };
    if (!save.activeRun) return;
    Object.assign(save.activeRun, {
      locationId: 'mainHall',
      spawnId: 'fromTea',
      player: { x: 120, y: 270 },
      facing: 'right',
    });
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.evaluate(() => sessionStorage.setItem('busy-day-preview-retry-hall', '1'));
  await page.reload();
  await expect(page.locator('#continue-button')).toBeVisible();
  await page.locator('#continue-button').click();

  await expect(page.locator('#hud-location')).toHaveText('MAIN HALLWAY', { timeout: 40_000 });
  expect(hallRequests).toBe(3);
  expect(await page.evaluate(() => typeof window.__busyDayTest)).toBe('undefined');
});
