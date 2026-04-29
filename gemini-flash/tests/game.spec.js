import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3214');
  // Wait for assets to load
  await page.waitForFunction(() => window.gameState !== undefined);
});

test('Title screen renders correctly', async ({ page }) => {
  await expect(page.locator('#menu h1')).toContainText('CAT CLICKER');
  await expect(page.locator('#start-btn')).toBeVisible();
});

test('Can start game', async ({ page }) => {
  await page.click('#start-btn');
  const phase = await page.evaluate(() => window.gameState.phase);
  expect(phase).toBe('playing');
});

test('Clicking cat increases score', async ({ page }) => {
  await page.click('#start-btn');
  await page.waitForTimeout(500); // Wait for animations
  
  const initialScore = await page.evaluate(() => window.gameState.score);
  
  // Get canvas bounding box
  const canvas = await page.locator('#gameCanvas');
  const box = await canvas.boundingBox();
  
  // Click in the middle of the canvas
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + 100);
  
  const finalScore = await page.evaluate(() => window.gameState.score);
  expect(finalScore).toBeGreaterThan(initialScore);
});

test('devCheats.skipToWin works', async ({ page }) => {
  await page.click('#start-btn');
  await page.evaluate(() => window.devCheats.skipToWin());
  const phase = await page.evaluate(() => window.gameState.phase);
  expect(phase).toBe('won');
  await expect(page.locator('#win-screen')).toBeVisible();
});

test('devCheats.skipToLose works', async ({ page }) => {
  await page.click('#start-btn');
  await page.evaluate(() => window.devCheats.skipToLose());
  const phase = await page.evaluate(() => window.gameState.phase);
  expect(phase).toBe('lost');
  await expect(page.locator('#lose-screen')).toBeVisible();
});
