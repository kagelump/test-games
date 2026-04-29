const { test, expect } = require('@playwright/test');

async function clickDesignOnCanvas(page, designX, designY) {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  const x = box.x + (designX / 1920) * box.width;
  const y = box.y + (designY / 1080) * box.height;
  await page.mouse.click(x, y);
}

test.describe('Catnip Cookie', () => {
  test('boots with menu phase and canvas visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.gameState && typeof window.gameState.phase === 'string');
    await expect(page.locator('#game-canvas')).toBeVisible();
    const phase = await page.evaluate(() => window.gameState.phase);
    expect(['menu', 'playing']).toContain(phase);
  });

  test('documented controls change playerPos (WASD)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.gameState && window.gameState.phase === 'menu');
    await clickDesignOnCanvas(page, 960, 608);
    await page.waitForFunction(() => window.gameState.phase === 'playing');
    await page.locator('#game-canvas').focus();
    const before = await page.evaluate(() => ({
      x: window.gameState.playerPos.x,
      y: window.gameState.playerPos.y,
    }));
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(200);
    await page.keyboard.up('KeyD');
    const after = await page.evaluate(() => ({
      x: window.gameState.playerPos.x,
      y: window.gameState.playerPos.y,
    }));
    expect(after.x).not.toBe(before.x);
  });

  test('devCheats.skipToWin reaches won phase', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.devCheats?.skipToWin === 'function');
    await page.evaluate(() => window.devCheats.skipToWin());
    await page.waitForFunction(() => window.gameState.phase === 'won');
    const phase = await page.evaluate(() => window.gameState.phase);
    expect(phase).toBe('won');
  });

  test('devCheats.skipToLose reaches lost phase', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.devCheats?.skipToLose === 'function');
    await page.evaluate(() => window.devCheats.skipToLose());
    await page.waitForFunction(() => window.gameState.phase === 'lost');
    const phase = await page.evaluate(() => window.gameState.phase);
    expect(phase).toBe('lost');
  });

});
