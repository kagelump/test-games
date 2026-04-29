# Captain Whiskers: Yarn Hoard

## Hook
You are Captain Whiskers, a treat-hungry cat hero clicking a sacred yarn ball to build a snack empire while batting away the villainous Sir Vacuum.

## Controls
- Click / Tap yarn ball: gain treats
- Click Sir Vacuum: damage enemy and protect treats
- `WASD` or Arrow Keys: move Captain Whiskers
- `Space` or on-screen Pounce: activate frenzy for stronger clicks
- `Q`: buy Helper Kitten
- `E`: buy Warm Milk Engine
- `~`: toggle FPS overlay

## How To Run
- `make dev` to run the game at `http://localhost:3214`
- `make test` to run Playwright logic/DOM tests and capture screenshots
- `make build` to produce `dist/` with dev cheats stripped

## Self-Score
| Axis | Score (1-10) |
|---|---|
| Hook | 8 |
| Mechanical Polish | 8 |
| Visual Polish | 8 |
| Audio | 7 |
| Juice | 8 |
| Win/Lose Loop | 8 |
| Cleanliness | 8 |
| First 30 Seconds | 8 |
| Replayability | 7 |

## Known Issues
- Web Audio starts after first user interaction due to browser autoplay policy.
- Mobile play is supported with touch controls, but very small screens can feel crowded.

## Iteration Count
3 review-fix cycles

## Fal.ai Calls Used
0 (all visuals are canvas-rendered; no generated assets)
