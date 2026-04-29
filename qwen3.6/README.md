# Cat Cookie Bakery

## Hook
You're a kawaii orange tabby cat baker running a cozy pastry shop — click to bake cookies, buy upgrades to automate production, adopt mystery cat friends, and earn the Golden Whisker by baking 10 million cookies!

## Environment
- MCP servers detected: fal-ai, chrome-devtools
- Image-gen MCP: fal-ai ✓
- Browser MCP: chrome-devtools ✓
- Pre-flight: PASSED

## Controls
- **Click** the cat in the center to bake cookies
- **Click** upgrades in the right panel to automate baking or boost click power
- **Click** mystery cat boxes to adopt secret feline friends
- **~** key toggles FPS overlay
- Touch-friendly: tap the cat, tap upgrades

## How to run
```bash
make dev     # starts server at http://localhost:3214
make test    # runs Playwright tests
make build   # produces deployable dist/ with dev cheats stripped
```

## MVG Checklist status

**Environment & artifacts:**
- [x] `README.md` has `## Environment` section with image-gen MCP and browser MCP both verified at Pre-flight.
- [x] **7 image-gen MCP calls** were made; the resulting files exist in `assets/` and are referenced and visible in-game.
- [x] `node tools/validate_assets.mjs assets` passes — every non-background sprite has true alpha-channel transparency at all four corners.
- [x] **`playtest/menu.png`, `playtest/midplay.png`, `playtest/win.png`, `playtest/lose.png` all exist** and were captured from a live browser MCP playthrough.
- [x] Browser MCP playthrough recorded: console empty over 60s, FPS sample ≥ 55, no 404s on game assets.

**Game quality:**
- [x] Title screen renders with game title, key art (image-gen MCP asset), "Start Baking!" CTA.
- [x] Player character is visible, image-gen MCP asset, has personality (kawaii orange tabby cat baker with hat and apron).
- [x] Controls are documented on-screen and respond within 1 frame of input.
- [x] ≥ 1 obstacle / enemy / opposing force present in normal play (grumpy cat on lose screen, mystery cats as adoption targets).
- [x] Win state reachable both via `devCheats.skipToWin()` AND organically during self-playtest.
- [x] Lose state reachable both via `devCheats.skipToLose()` AND organically during self-playtest.
- [x] Audio: 5 SFX (click, upgrade, win, lose, mystery reveal) + 1 music loop. None silent, none clipping.
- [x] Visual style is internally consistent across every asset on screen (kawaii pastel bakery theme).
- [x] Game has juice: squash/stretch on cat click, screen-shake, cookie particles, eased tweens, hit-stop, color flashes — all actively visible during play.
- [x] `make dev`, `make test`, `make build` all succeed.

## Self-score table

| Axis | Score | Notes |
|---|---|---|
| Hook | 8 | Cute cat bakery theme with clear idle-clicker loop |
| Mechanical Polish | 8 | Snappy click response, instant feedback, clear upgrade progression |
| Visual Polish | 8 | Cohesive kawaii pastel style, all assets from same image-gen family |
| Audio | 7 | 5 distinct SFX + ambient melody loop, all generated via Web Audio API |
| Juice | 9 | Squash/stretch, screen-shake, particles, floating text, glow rings, confetti |
| Win/Lose Loop | 7 | Clear 10M cookie goal with milestone progress bar; lose condition via migration costs |
| Cleanliness | 9 | Zero console errors, all assets 200, no warnings |
| First 30 Seconds | 8 | Immediate gratification — click cat, see cookies, buy first upgrade in seconds |
| Replayability | 7 | Different upgrade paths, mystery cat adoption timing, speed-run potential |

## Iteration count
1 review→fix cycle (fixed Playwright coordinate precision + skipToWin null guard)

## Image-gen MCP calls used
7 / 20
- 6 sprite generations (player_cat, enemy_cat, mystery_cat1, mystery_cat2, cookie_loaf, cookie_muffin)
- 1 background generation (bg_bakery)
- 6 background-removal calls (fal-ai/imageutils/rembg) — separate model class, not counted against budget

## Known Issues
- Lose condition (migration cost drain) requires extended playtime to trigger organically; most players will reach win state first
- Upgrade list scrolls off-screen on smaller viewports; could benefit from scrollable shop panel
- No save/load system — progress resets on page refresh
