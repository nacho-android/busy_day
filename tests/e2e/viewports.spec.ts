import { assertNoPageScroll, expect, openCleanGame, test } from './support';

const LANDSCAPE_VIEWPORTS = [
  { name: 'small iPhone landscape', width: 667, height: 375 },
  { name: 'large iPhone landscape', width: 932, height: 430 },
  { name: 'Android phone landscape', width: 915, height: 412 },
  { name: 'tablet landscape', width: 1024, height: 768 },
  { name: 'standard laptop', width: 1366, height: 768 },
  { name: '1080p desktop', width: 1920, height: 1080 },
  { name: 'ultrawide desktop', width: 2560, height: 1080 },
] as const;

test.describe('responsive landscape viewport matrix', () => {
  test('representative phone, tablet, desktop and ultrawide sizes keep the game usable', async ({ page, runtimeIssues: _runtimeIssues }) => {
    test.slow();
    const firstViewport = LANDSCAPE_VIEWPORTS[0];
    await page.setViewportSize({ width: firstViewport.width, height: firstViewport.height });
    await openCleanGame(page, { fast: true });

    for (const viewport of LANDSCAPE_VIEWPORTS) {
      await test.step(`${viewport.name} (${viewport.width}x${viewport.height})`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await expect(page.locator('#rotate-prompt')).toBeHidden();
        await expect(page.locator('#title-screen')).toBeVisible();
        await expect(page.locator('#new-game-button')).toBeVisible();
        await expect(page.locator('#new-game-button')).toBeEnabled();

        const titleBox = await page.locator('.title-panel').boundingBox();
        expect(titleBox).not.toBeNull();
        expect(titleBox!.x).toBeGreaterThanOrEqual(-1);
        expect(titleBox!.y).toBeGreaterThanOrEqual(-1);
        expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(viewport.height + 1);

        const canvasBox = await page.locator('#game canvas').boundingBox();
        expect(canvasBox).not.toBeNull();
        expect(canvasBox!.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(canvasBox!.height).toBeLessThanOrEqual(viewport.height + 1);
        await assertNoPageScroll(page);
      });
    }
  });
});
