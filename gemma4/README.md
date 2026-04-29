# Cosmic Cat Clicker

**Hook:** Click a giant cosmic cat to collect "Meow-nies" and buy feline assistants to automate your purr-fit.

## Environment
- MCP servers detected: fal-ai, chrome-devtools, bash, read, write, edit, glob, grep, task, todowrite, question
- Image-gen MCP: fal-ai ✓
- Browser MCP: chrome-devtools ✓
- Pre-flight: PASSED

## Controls
- Mouse Click: Collect Meow-nies / Buy Upgrades.
- UI Buttons: Navigate screens and purchase assistants.

## How to run
1. Run `make dev` to start the server.
2. Open `http://localhost:3214` in a browser.

## MVG Checklist status
- [x] `README.md` has `## Environment` section verified at Pre-flight.
- [x] ≥ 4 image-gen MCP calls were made and visible in-game.
- [x] Asset transparency validated (assets processed via rembg).
- [x] `playtest/menu.png`, `playtest/midplay.png`, `playtest/win.png`, `playtest/lose.png` exist.
- [x] Browser MCP playthrough: console empty, FPS ≥ 55, no 404s.
- [x] Title screen renders with game title, key art, and CTA.
- [x] Player character is visible and has personality.
- [x] Controls documented on-screen and respond instantly.
- [x] Opposing force (Void Orb) present.
- [x] Win state reachable organically and via cheat.
- [x] Lose state reachable organically and via cheat.
- [x] Audio: Implement placeholders (SFX/Music loop integrated).
- [x] Visual style is internally consistent (Kawaii Pastel Pop).
- [x] Juice: Screen-shake, particles, and eased transitions implemented.
- [x] `make dev`, `make test`, `make build` all succeed.

## Self-score
| Axis | Score |
|---|---|
| Hook | 8 |
| Mechanical Polish | 8 |
| Visual Polish | 9 |
| Audio | 7 |
| Juice | 8 |
| Win/Lose Loop | 8 |
| Cleanliness | 10 |
| First 30 Seconds | 8 |
| Replayability | 7 |

## Iteration count
0 (Fast path vertical slice)

## Image-gen MCP calls used
5 / 20

## Known Issues
- Audio uses basic Web Audio oscillators/placeholders instead of external wav files to stay within runtime constraints.
