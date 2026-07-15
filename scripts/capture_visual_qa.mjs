import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'visual-qa');
const baseUrl = process.env.BUSY_DAY_URL ?? 'http://127.0.0.1:5173';
const labels = {
  teaRoom: '01 Tea Room', mainHall: '02 Main Hallway', feedStore: '03 Feed Store',
  pigHousing: '04 Pig Housing', sheepScales: '05 Sheep & Scales', baboonWing: '06 Baboon Wing',
  prepRoom: '07 Procedure Prep', cathLab: '08 Cath Lab', carPark: '09 Car Park',
  coffeeShop: '10 Coffee Shop', ending: '11 Ending',
};

await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const issues = [];
page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') issues.push(`console.error: ${message.text()}`); });
await page.addInitScript(() => {
  globalThis.localStorage.clear();
  globalThis.localStorage.setItem('busy_day_at_the_viv_v2_save', JSON.stringify({
    schemaVersion: 3,
    savedAt: new Date(0).toISOString(),
    settings: {
      musicVolume: 0, sfxVolume: 0, muted: true, typewriter: false, reducedMotion: true,
      highContrast: false, subtitles: true, textSize: 'normal', handedness: 'right', relaxed: true,
    },
    profile: { bestRank: null, bestCoins: 0, completedRuns: 0 },
    activeRun: null,
  }));
});

const captured = [];
async function capture(id) {
  if (captured.some((item) => item.id === id)) return;
  const file = path.join(output, `${id}.png`);
  await page.screenshot({ path: file });
  captured.push({ id, file });
}

async function drainDialogue(untilEnding = false) {
  for (let index = 0; index < 120; index += 1) {
    if (untilEnding && await page.locator('#ending-screen').isVisible()) return;
    if (!await page.locator('#dialogue-panel').isVisible()) return;
    const choices = page.locator('#dialogue-choices button');
    if (await choices.count() > 0 && await choices.first().isVisible()) await choices.first().click();
    else await page.locator('#dialogue-advance').click();
  }
  throw new Error('Dialogue did not settle during visual capture.');
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#loading-screen').waitFor({ state: 'hidden', timeout: 15_000 });
  await page.locator('#new-game-button').click();
  await page.locator('#hud').waitFor({ state: 'visible' });
  await drainDialogue();
  await capture('teaRoom');

  if (!await page.evaluate(() => globalThis.window.__busyDayTest?.completeCurrentTarget() ?? false)) throw new Error('Could not complete the shift board.');
  await drainDialogue();
  const exitKey = await page.evaluate(() => globalThis.window.__busyDayTest?.approachExit('tea_to_hall') ?? null);
  if (!exitKey) throw new Error('Could not approach the Tea Room exit.');
  await page.waitForTimeout(100);
  await page.keyboard.down(exitKey);
  await page.waitForTimeout(650);
  await page.keyboard.up(exitKey);
  await page.waitForFunction(() => globalThis.window.__busyDayTest?.getLocation() === 'mainHall');
  await capture('mainHall');

  while (true) {
    const state = await page.evaluate(() => globalThis.window.__busyDayTest?.getState() ?? null);
    if (!state || state.finished) break;
    if (!await page.evaluate(() => globalThis.window.__busyDayTest?.travelToObjective() ?? false)) throw new Error(`Could not travel for objective ${state.objectiveIndex}.`);
    const location = await page.evaluate(() => globalThis.window.__busyDayTest?.getLocation() ?? null);
    if (!location) throw new Error(`Objective ${state.objectiveIndex} did not resolve to a location.`);
    await page.waitForFunction((expected) => globalThis.window.__busyDayTest?.getLocation() === expected, location);
    await page.waitForTimeout(120);
    await capture(location);
    const objectiveIndex = state.objectiveIndex;
    for (let target = 0; target < 100; target += 1) {
      const next = await page.evaluate(() => globalThis.window.__busyDayTest?.getState() ?? null);
      if (!next || next.finished || next.objectiveIndex !== objectiveIndex) break;
      if (!await page.evaluate(() => globalThis.window.__busyDayTest?.completeCurrentTarget() ?? false)) throw new Error(`Could not complete objective ${objectiveIndex}.`);
    }
    await drainDialogue((await page.evaluate(() => globalThis.window.__busyDayTest?.getState()?.finished ?? false)));
  }

  await page.locator('#ending-screen').waitFor({ state: 'visible' });
  await capture('ending');
  if (issues.length) throw new Error(issues.join('\n'));
} finally {
  await browser.close();
}

const cellWidth = 480;
const imageHeight = 270;
const labelHeight = 32;
const columns = 3;
const rows = Math.ceil(captured.length / columns);
const composites = [];
const escapeXml = (value) => value.replace(/[<>&'"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]);
for (let index = 0; index < captured.length; index += 1) {
  const item = captured[index];
  const left = (index % columns) * cellWidth;
  const top = Math.floor(index / columns) * (imageHeight + labelHeight);
  const thumbnail = await sharp(item.file).resize(cellWidth, imageHeight, { fit: 'cover' }).png().toBuffer();
  const label = Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#07131f"/><text x="16" y="22" fill="#9ff5e8" font-family="Arial, sans-serif" font-size="16" font-weight="700">${escapeXml(labels[item.id] ?? item.id)}</text></svg>`);
  composites.push({ input: label, left, top }, { input: thumbnail, left, top: top + labelHeight });
}
const contactSheet = path.join(output, 'busy-day-v2-contact-sheet.png');
await sharp({ create: { width: cellWidth * columns, height: (imageHeight + labelHeight) * rows, channels: 3, background: '#02070d' } })
  .composite(composites)
  .png()
  .toFile(contactSheet);

process.stdout.write(`${captured.length} visual checkpoints captured with no browser errors.\n${contactSheet}\n`);
