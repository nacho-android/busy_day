/* global localStorage, window */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const output = path.resolve('visual-qa', 'portal-transition');
const baseUrl = process.env.BUSY_DAY_URL ?? 'http://127.0.0.1:5173';
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const issues = [];
page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') issues.push(`console.error: ${message.text()}`); });
await page.addInitScript(() => {
  localStorage.clear();
  localStorage.setItem('busy_day_at_the_viv_v2_save', JSON.stringify({
    schemaVersion: 3,
    savedAt: new Date(0).toISOString(),
    settings: {
      musicVolume: 0, sfxVolume: 0, muted: true, typewriter: false, reducedMotion: false,
      highContrast: false, subtitles: true, textSize: 'normal', handedness: 'right', relaxed: true,
    },
    profile: { bestRank: null, bestCoins: 0, completedRuns: 0 },
    activeRun: null,
  }));
});

async function drainDialogue() {
  for (let index = 0; index < 20 && await page.locator('#dialogue-panel').isVisible(); index += 1) {
    await page.locator('#dialogue-advance').click();
  }
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#loading-screen').waitFor({ state: 'hidden', timeout: 15_000 });
  await page.locator('#new-game-button').click();
  await page.locator('#hud').waitFor({ state: 'visible' });
  await drainDialogue();
  await page.waitForTimeout(900);
  const key = await page.evaluate(() => window.__busyDayTest?.approachExit('tea_to_hall') ?? null);
  if (!key) throw new Error('Tea Room portal has no collision-safe approach.');
  await page.screenshot({ path: path.join(output, '01-before.png') });
  await page.keyboard.down(key);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(output, '02-entering.png') });
  await page.waitForTimeout(190);
  await page.screenshot({ path: path.join(output, '03-occluded.png') });
  await page.keyboard.up(key);
  await page.waitForFunction(() => window.__busyDayTest?.getLocation() === 'mainHall', undefined, { timeout: 10_000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(output, '04-arrived.png') });
  if (issues.length) throw new Error(issues.join('\n'));
  process.stdout.write(`Portal QA captured at ${output}\n`);
} finally {
  await browser.close();
}
