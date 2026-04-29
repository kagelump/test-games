import { test, expect } from '@playwright/test';

test('stub', async ({ page }) => {
  await page.goto('http://localhost:3214');
  expect(true).toBe(true);
});
