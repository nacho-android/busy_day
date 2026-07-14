import { chromium } from '@playwright/test';

/* global document, navigator, performance, requestAnimationFrame */

const baseUrl = process.env.BUSY_DAY_URL ?? 'http://127.0.0.1:4176';
const browser = await chromium.launch({ headless: true });

async function sampleFrames(page, durationMs) {
  return page.evaluate((duration) => new Promise((resolve) => {
    const deltas = [];
    const started = performance.now();
    let previous = started;
    const frame = (now) => {
      const delta = now - previous;
      if (delta > 0) deltas.push(delta);
      previous = now;
      if (now - started < duration) {
        requestAnimationFrame(frame);
        return;
      }
      const ordered = [...deltas].sort((a, b) => a - b);
      const mean = deltas.reduce((sum, value) => sum + value, 0) / Math.max(1, deltas.length);
      resolve({
        frames: deltas.length,
        fps: Number((1000 / mean).toFixed(1)),
        meanMs: Number(mean.toFixed(1)),
        p95Ms: Number((ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * .95))] ?? 0).toFixed(1)),
        over50Ms: deltas.filter((value) => value > 50).length,
      });
    };
    requestAnimationFrame(frame);
  }), durationMs);
}

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const startedAt = Date.now();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const navigationMs = Date.now() - startedAt;
  await page.locator('#title-screen').waitFor({ state: 'visible' });

  const runtime = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    const memory = performance.memory;
    const resources = performance.getEntriesByType('resource');
    return {
      userAgent: navigator.userAgent,
      renderer: gl && extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      heapMiB: memory ? Number((memory.usedJSHeapSize / 1048576).toFixed(1)) : null,
      resources: resources.length,
      transferMiB: Number((resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0) / 1048576).toFixed(2)),
    };
  });
  const title = await sampleFrames(page, 4000);

  await page.locator('#new-game-button').click();
  const dialogue = page.locator('#dialogue-panel');
  for (let attempt = 0; attempt < 8 && await dialogue.isVisible(); attempt += 1) {
    await page.locator('#dialogue-advance').click();
  }
  await dialogue.waitFor({ state: 'hidden' });
  await page.waitForTimeout(750);
  await page.keyboard.down('ArrowRight');
  const active = await sampleFrames(page, 6000);
  await page.keyboard.up('ArrowRight');

  const afterPlay = await page.evaluate(() => {
    const memory = performance.memory;
    return { heapMiB: memory ? Number((memory.usedJSHeapSize / 1048576).toFixed(1)) : null };
  });

  process.stdout.write(`${JSON.stringify({
    scope: 'Local Playwright Chromium; automation sample, not physical-phone evidence',
    viewport: '1366x768',
    navigationMs,
    ...runtime,
    title,
    activeTeaRoom: active,
    activeHeapMiB: afterPlay.heapMiB,
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
