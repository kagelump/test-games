# One-Shot Game Eval — Scoring Rubric

Use this rubric to grade each model's one-shot output consistently. Companion to [`GAME_DEV.md`](./GAME_DEV.md).

> **Score blind first.** Play the game and fill out the rubric *before* reading the agent's own self-score in `README.md`. Otherwise you'll anchor.

---

## Run Metadata

| Field | Value |
|---|---|
| Model | |
| Date | |
| Prompt (1–2 sentences) | |
| Wall-clock time (start → "done") | |
| Iterations completed (Phase 4 → 2 returns) | |
| Approx tokens consumed | |
| Image-gen MCP calls used | / 20 |

---

## Environment Gate — score this FIRST

This is the most important section of the rubric. The brief requires the agent to enumerate available MCPs at Pre-flight, verify image-gen and browser MCPs are reachable, smoke-test them, and **halt** if either is missing. This gate exists to detect runs where the *environment* (not the model) was the limiter, so you don't accidentally compare apples to oranges.

| Check | Status |
|---|---|
| `README.md` has an `## Environment` section listing detected MCPs | ✅ / ❌ |
| Image-gen MCP was verified at Pre-flight AND used (≥ 4 files in `assets/`, referenced in-game) | ✅ / ❌ |
| Browser MCP was verified at Pre-flight AND used (artifacts present in `playtest/`) | ✅ / ❌ |
| `playtest/menu.png`, `playtest/midplay.png`, `playtest/win.png`, `playtest/lose.png` all present | ✅ / ❌ |
| If MCPs were missing, agent halted at Pre-flight with `PRE_FLIGHT_FAILURE.md` (instead of silently continuing) | ✅ / ❌ / N/A |

**Resulting status — pick exactly one:**

- 🟢 **PASS** — every check ✅. Score the rest of the rubric normally and add this run to the comparison table.
- 🟡 **ENV-LIMITED** — `PRE_FLIGHT_FAILURE.md` exists; agent correctly halted because MCPs were missing in *your* environment. *This is correct behavior under the brief — not a model failure.* Log under "ENV-LIMITED" in the comparison table; the fix is on you (enable the MCPs and re-run). Do NOT score axes.
- 🔴 **TOOLS-NOT-USED** — MCPs were available but the agent didn't use them (e.g. 0 image-gen calls, no `playtest/` artifacts) and didn't halt at Pre-flight. **This is a model failure** — exactly the behavior the brief is designed to prevent. Mark as DNF and call it out specifically in notes; this is a strong signal about the model's tool-discovery / instruction-following.

If status is 🟡 or 🔴, **stop here.** The rest of the rubric is not comparable to a 🟢 PASS run. Note which axes you'd *want* to comment on, and move on.

---

## Pass / Fail Gates (only score if Environment status is 🟢 PASS)

If **any** gate fails, record the run as **DNF** regardless of how nice the rest looks. The bar for "one-shot" is "actually plays."

- [ ] Game loads at `http://localhost:3214` without console errors
- [ ] Player is visible and controllable on first try (no hidden controls)
- [ ] Win state reachable through normal play (verify yourself, don't trust cheats)
- [ ] Lose state reachable through normal play
- [ ] No console errors over a 60s play session
- [ ] ≥ 55 FPS sustained (toggle the FPS overlay with `~`)
- [ ] All declared controls actually do what the on-screen hints say
- [ ] Audio plays (≥ 3 SFX + 1 music loop, none silent)
- [ ] `make test` passes
- [ ] `make build` produces `dist/` and the built version still runs

---

## Scoring Axes (1–10 each)

Score each axis after one ~3-minute play session. Anchor: **5 = "shipped indie game jam entry"**, **8 = "I'd send this to a friend"**, **10 = "I'd pay for this."**

| Axis | Question | Score |
|---|---|---|
| Hook | Does the title screen / first frame make me curious? | / 10 |
| Mechanical Polish | Controls snappy, predictable, forgiving? | / 10 |
| Visual Polish | Cohesive style; characters have personality, not bare shapes? | / 10 |
| Audio | Music + SFX layered, satisfying, not jarring? | / 10 |
| Juice | Squash/stretch, screen-shake, particles, easing — does the screen *react*? | / 10 |
| Win/Lose Loop | Clear goal, clear failure, motivating progression? | / 10 |
| First 30 Seconds | Would a stranger keep playing past 30s? | / 10 |
| Replayability | Is there a reason for round 2? | / 10 |
| Cleanliness | Inverted scale: more visible bugs / friction = lower score | / 10 |

**Composite: ___ / 90**

---

## The One Number That Actually Matters

The composite is for axis-by-axis comparison. The single number you should track per run is:

> **Fun (1–10): how fun was this game to play for 60 seconds, ignoring everything else?**

**Fun: ___ / 10**

---

## Subjective Notes (one line each, one per run)

- **Most surprising thing the model did well:**
- **Most embarrassing thing the model produced:**
- **One change that would have doubled the fun:**
- **Did the model genuinely self-playtest?** (Y/N — judged by whether `playtest/` screenshots look like they came from organic play and the game's bugs are *not* the kind a 30s playthrough would catch)
- **Tool-use evidence:** (what counts: `assets/` images visibly used in-game; `playtest/*.png` look right; transcript shows MCP tool calls)

---

## Cross-Model Comparison Log

Append one row per run. Sort by **Fun**, not Composite — that's the headline. Use the Status column to keep ENV-LIMITED and TOOLS-NOT-USED rows separate from PASS rows when comparing.

| Date | Model | Prompt (≤ 8 words) | Status (🟢/🟡/🔴) | Composite / 90 | Fun / 10 | Iters | Image-gen calls | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

---

## Eval Hygiene Checklist (before each run)

To keep results comparable across models:

- [ ] Workspace is clean (no leftover game files, no `assets/`, no `playtest/`, no `package-lock.json`, no `node_modules/` from prior runs)
- [ ] No `MEMORY.md` / `AGENTS.md` / scratchpad describing a *previous* game
- [ ] Same `GAME_DEV.md` brief is being used for every model (don't tweak it mid-eval)
- [ ] Same Prompt across the models you're comparing (re-running the same prompt is the only way to A/B fairly)
- [ ] **Image-gen MCP is enabled in this Cursor / agent instance** (verify by checking the MCP server list in settings — the brief will halt at Pre-flight if it isn't)
- [ ] **Browser MCP is enabled in this Cursor / agent instance** (same)
- [ ] Network is up (image-gen MCP needs to be reachable)
- [ ] Playwright Chromium is installable in this env (`npx playwright install chromium` won't be blocked)
