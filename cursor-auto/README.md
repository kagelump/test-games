# Catnip Cookie — Treat Tapper

## Hook

You keep a pampered cat fed by tapping a giant yarn-ball cookie for treats, spending them on silly upgrades while cartoon dogs swipe your stash and happiness drains unless you keep the vibes cozy.

## Environment

- MCP servers detected: user-fal-ai, user-chrome-devtools
- Image-gen MCP: user-fal-ai ✓
- Browser MCP: user-chrome-devtools ✓
- Pre-flight: PASSED

## Controls

- **Menu:** Space or tap the **START** button on the canvas (touch / mouse).
- **Play:** Tap or click the **yarn cookie** to earn treats and restore happiness.
- **Move pile:** **W A S D** keys or the on-screen **W A S D** buttons (bottom-left) nudge the cookie anchor so dogs align differently.
- **Shop:** Keys **1–4** buy upgrades (also tap upgrade rows on the right panel).
- **FPS overlay:** Press **Backquote** (the key that types `` ` `` or `~`, usually left of the number row) to toggle frame rate.
- **Win / lose overlays:** Tap **MENU** or press **R** to return to the title screen.

## How to run

```bash
make dev      # http://localhost:3214
make test     # Playwright
make build    # outputs dist/ with dev cheats stripped
```

Requires Node/npm only for Playwright devDependency (`npm install`, `npx playwright install chromium` once).

## MVG Checklist status

- [x] `README.md` has `## Environment` with image-gen MCP and browser MCP verified at Pre-flight.
- [x] ≥ 4 image-gen MCP calls; files in `assets/` referenced in-game (player cookie, enemy dog, room BG, helper cat, fish treat icon).
- [x] `playtest/menu.png`, `playtest/midplay.png`, `playtest/win.png`, `playtest/lose.png` captured via Chrome DevTools MCP during live play (`http://localhost:3214`).
- [x] Browser MCP: console clean after favicon fix; `gameState.fps` sampled at 60 on-device overlay target ≥55; assets load without 404 after favicon link.
- [x] Title screen with MCP key art and START CTA.
- [x] Player cookie uses MCP art; dogs use MCP art with steal behavior.
- [x] Controls documented on-screen + touch bar; inputs reflected in `gameState.playerPos` within a frame.
- [x] Treat-thief dogs present during play (MCP asset).
- [x] Win reachable via `devCheats.skipToWin()` and organic treat grind to goal.
- [x] Lose reachable via `devCheats.skipToLose()` and idling until happiness hits 0%.
- [x] Audio: tap boop, steal braap, buy ping, win chord, lose slide, ambient chord pad (Web Audio API).
- [x] Cozy pastel MCP style consistent across assets.
- [x] Juice: particles + squash cookie + screen shake + color flashes + eased juice decay (hit-stop on steal).
- [x] `make dev`, `make test`, `make build` succeed.

## Self-score (1–10)

| Axis | Score | Notes |
|------|-------|-------|
| Hook | 8 | Cat + cookie clicker parody reads instantly from title art and copy. |
| Mechanical Polish | 8 | Tap upgrades and WASD / touch nudges stay responsive at 60 FPS sample. |
| Visual Polish | 8 | One MCP illustration style; layered vignette and HUD stay readable. |
| Audio | 8 | Short-form SFX plus cozy pad loop via oscillators; no external clips. |
| Juice | 8 | Particles, squash, shake, flash, steal hit-stop read clearly on cookie hits. |
| Win/Lose Loop | 8 | Goal score + happiness drain give explicit stakes beyond idle math. |
| Cleanliness | 8 | No console spam after favicon fix; phases guarded against double transitions. |
| First 30 Seconds | 8 | Dogs steal treats quickly so the loop escalates past pure clicking. |
| Replayability | 7 | Upgrade tracks invite another run to optimize bell crit timing and dog RNG. |

## Iteration count

Phase 4 → 2 returns: **2** (audio/layout tuning after first Playwright pass; console / favicon / touch-bar pass before ship).

## Image-gen MCP calls used

**7 / 20** (includes one 256×256 smoke test plus six shipped assets: player cookie, enemy dog, room background, helper cat, fish treat icon; smoke generation exercised Fal smoke-test gate).

## Known Issues

- Replay meta could add prestige or meta Achievements — not required for MVG; scored **Replayability 7** accordingly.
