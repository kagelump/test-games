// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Cat Cookie Bakery - Core Flow", () => {
  test("page loads and shows title screen", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    
    const canvas = page.locator("canvas#game-canvas");
    await expect(canvas).toBeDefined();
    
    const phase = await page.evaluate(() => window.gameState.phase);
    expect(phase).toBe("menu");
  });

  test("clicking start begins playing phase", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const canvas = document.getElementById("game-canvas");
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height * 0.6,
        bubbles: true,
      }));
    });
    await page.waitForTimeout(500);
    
    const phase = await page.evaluate(() => window.gameState.phase);
    expect(phase).toBe("playing");
  });

  test("clicking cat increases cookies", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const canvas = document.getElementById("game-canvas");
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height * 0.6,
        bubbles: true,
      }));
    });
    await page.waitForTimeout(500);
    
    const cookiesBefore = await page.evaluate(() => window.gameState.totalCookies);
    await page.evaluate(() => {
      const canvas = document.getElementById("game-canvas");
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
      }));
    });
    await page.waitForTimeout(300);
    const cookiesAfter = await page.evaluate(() => window.gameState.totalCookies);
    
    expect(cookiesAfter).toBeGreaterThan(cookiesBefore);
  });

  test("devCheats.skipToWin works", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => window.devCheats.skipToWin());
    await page.waitForTimeout(500);
    
    const phase = await page.evaluate(() => window.gameState.phase);
    expect(phase).toBe("won");
  });

  test("devCheats.skipToLose works", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => window.devCheats.skipToLose());
    await page.waitForTimeout(500);
    
    const phase = await page.evaluate(() => window.gameState.phase);
    expect(phase).toBe("lost");
  });

  test("FPS is above 55 after warmup", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(3000);
    
    const fps = await page.evaluate(() => window.gameState.fps);
    expect(fps).toBeGreaterThanOrEqual(55);
  });

  test("no console errors after 5 seconds", async ({ page }) => {
    const errors = [];
    page.on("console", msg => {
      if (msg.type() === "error" || msg.type() === "warn") {
        errors.push(msg.text());
      }
    });
    
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(5000);
    
    expect(errors.length).toBe(0);
  });

  test("capture menu screenshot", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playtest/menu.png", fullPage: false });
  });

  test("capture midplay screenshot", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const canvas = document.getElementById("game-canvas");
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height * 0.6,
        bubbles: true,
      }));
    });
    await page.waitForTimeout(500);
    
    await page.evaluate(() => {
      const canvas = document.getElementById("game-canvas");
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < 3; i++) {
        canvas.dispatchEvent(new MouseEvent("click", {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          bubbles: true,
        }));
      }
    });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: "playtest/midplay.png", fullPage: false });
  });

  test("capture win screenshot", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => window.devCheats.skipToWin());
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: "playtest/win.png", fullPage: false });
  });

  test("capture lose screenshot", async ({ page }) => {
    await page.goto("http://localhost:3214");
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => window.devCheats.skipToLose());
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: "playtest/lose.png", fullPage: false });
  });
});
