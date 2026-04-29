const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const URL = "http://127.0.0.1:3214/index.html";
const outDir = path.join(__dirname);

async function saveShot(page, file) {
  await page.screenshot({ path: path.join(outDir, file), fullPage: true });
}

async function run() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    const title = await page.locator("#overlay-title").textContent();
    assert.ok(title && title.includes("Captain Whiskers"), "Title screen failed to render.");
    await saveShot(page, "menu.png");

    await page.click("#start-button");
    await page.waitForTimeout(100);

    const before = await page.evaluate(() => window.gameState.playerPos);
    await page.keyboard.down("d");
    await page.waitForTimeout(260);
    await page.keyboard.up("d");
    const after = await page.evaluate(() => window.gameState.playerPos);
    assert.ok(after.x > before.x + 5, "Player did not move after documented controls.");

    await page.click("#game-canvas", { position: { x: 980, y: 560 } });
    await page.waitForTimeout(120);
    await saveShot(page, "mid-play.png");

    await page.evaluate(() => window.devCheats.skipToWin());
    await page.waitForFunction(() => window.gameState.phase === "won");
    const phaseWon = await page.evaluate(() => window.gameState.phase);
    assert.equal(phaseWon, "won", "skipToWin did not set game state to won.");
    await saveShot(page, "win.png");

    await page.click("#start-button");
    await page.waitForTimeout(80);
    await page.evaluate(() => window.devCheats.skipToLose());
    await page.waitForFunction(() => window.gameState.phase === "lost");
    const phaseLost = await page.evaluate(() => window.gameState.phase);
    assert.equal(phaseLost, "lost", "skipToLose did not set game state to lost.");
    await saveShot(page, "lose.png");

    const fps = await page.evaluate(() => window.gameState.fps);
    assert.ok(fps >= 30, "FPS unexpectedly low during smoke test.");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
