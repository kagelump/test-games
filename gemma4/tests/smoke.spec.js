import { test, expect } from '@playwright/test';

test('smoke test', async ({ page }) => {
  await page.goto('http://localhost:3214');
  await expect(page).not.toBeNull();
});
