# TextWars — Codebase Guide

## Architecture

TextWars is a dependency-free browser game. It deliberately avoids a framework and build step so the repository can be opened directly or hosted as static files.

The implementation is split into two layers:

- `game-core.js` contains pure gameplay rules and exports to both the browser and Node.
- `app.js` owns DOM rendering, the animation loop, input, audio, effects, and local persistence.

## Runtime state

The browser layer uses an explicit phase machine:

```text
briefing → countdown → playing ⇄ paused → ended
```

The main `game` object tracks the current run: score, shields, combo, sector, attempts, enemies, timers, and the saved player profile. A single `requestAnimationFrame` loop advances enemies and schedules spawns. Timers used by countdowns and effects are centrally tracked so restarting cannot leave stale callbacks behind.

## Gameplay rules

`game-core.js` owns the deterministic rules:

- difficulty configuration and shield counts
- score multiplier thresholds
- points and danger-clear bonuses
- sector progression
- spawn intervals and fall speed
- accuracy calculation
- wave-aware word-length ranges
- duplicate-safe word selection

These rules are covered by `test/game-core.test.js` using Node's built-in test runner.

## Rendering and targeting

Enemy positions are represented in game coordinates and rendered with GPU-friendly transforms. Spawning uses responsive horizontal lanes and avoids lanes already occupied near the top of the battlefield.

As the player types, matching enemies receive per-letter highlighting. When multiple words share a prefix, the lowest matching enemy becomes the locked target. The cannon rotates toward that target. An exact shot also selects the lowest duplicate, so the most urgent threat is always handled first.

## Persistence

`localStorage` stores only device-local preferences and records:

- selected mode
- word language
- sound preference
- best score, sector, and streak for each difficulty

Legacy `tw_highScore` and `tw_highWave` values are migrated into the Ace record when available.

## Verification

```bash
npm test       # gameplay rules
npm run check  # JavaScript syntax
```

The live game also exposes a read-only `window.__textWars.getState()` helper for browser smoke tests.
