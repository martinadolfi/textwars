# Codebase Guide

## Files

| File | What it does |
|------|-------------|
| `index.html` | Page structure — game screen, HUD, input field, game-over panel |
| `app.js` | All game logic (~410 lines) |
| `app.css` | Styling, animations, and visual effects (~350 lines) |
| `wordList.js` | English and Spanish word arrays, picked based on `navigator.language` |
| `jquery-3.5.0.min.js` | jQuery (DOM manipulation, event handling) |

## app.js — How the game works

### State

Everything lives in a single `game` object:

```
game.running      — is the game active?
game.score         — current score
game.lives         — hearts remaining (starts at 3)
game.combo         — consecutive hit streak
game.wave          — current difficulty tier
game.enemies       — array of active word elements on screen
game.spawnTimerMs  — countdown until next word spawns
game.lastFrameTs   — last frame timestamp (for delta time)
```

### Main functions

- **`resetGame()`** — Clears the board, resets state, runs a 3-2-1 countdown, then starts the loop.
- **`gameLoop()`** — Called every frame via `requestAnimationFrame`. Spawns enemies on a timer, moves them down, checks if any reached the bottom.
- **`spawnEnemy()`** — Picks a random word, creates a DOM element, drops it at a random x-position at the top.
- **`submitShot()`** — Called on Enter/Space. Checks typed text against active enemies. Match = laser + explosion + points. Miss = penalty + combo reset.
- **`loseLife()`** — Decrements lives, shakes the screen. At 0 lives, calls `stopGame()`.
- **`stopGame()`** — Cancels the loop, saves high score to localStorage, shows the game-over panel.

### Difficulty scaling

Two things get harder as you progress:

- **Spawn interval**: `1200 - (wave × 80) - (combo × 12)` ms, clamped between 260–1200ms
- **Fall speed**: `40 + (wave × 11) + (combo × 1.2)` px per frame-unit

Waves advance every 120 points (`wave = floor(score / 120) + 1`).

### Input flow

1. Player types into a text input at the bottom of the screen
2. On each keystroke, `highlightMatches()` adds a glow to any enemy word that starts with the current input
3. On Enter or Space, `submitShot()` looks for an exact match among active enemies
4. Input is cleared after every shot attempt

### Visual effects

All effects are CSS-driven with JS triggers:

- **Laser beam** — a rotated `div` from the cannon to the target, calculated with `Math.atan2`
- **Explosions** — CSS `pop` keyframe animation at the target position
- **Score popups** — float-up animation showing points earned
- **Combo milestones** — centered text that scales in/out at streak thresholds
- **Screen shake** — CSS class toggled on the game screen
- **Danger glow** — words within 80px of the bottom pulse red

## app.css — Rendering

The game screen is a fixed-size container (`400×600` base, scales responsively) with layered elements:

- `.stars` — scrolling star background (CSS animation)
- `.scanlines` — CRT-style overlay
- `.wordLayer` — where enemy word elements live (absolutely positioned)
- `.fxLayer` — laser beams, explosions, popups (above words)
- `.cannon` — player's weapon, fixed at bottom center
- `.topBar` — HUD showing score, lives, wave, combo

## wordList.js — Word data

Two arrays exported to `window`:
- `window.wordListEN` — ~900 English words
- `window.wordListES` — ~900 Spanish words

On load, `app.js` picks the list based on `navigator.language.startsWith('es')`.

## No build system

Everything loads via `<script>` tags in `index.html`. No bundler, no transpiler, no npm. To work on it, just edit the files and refresh the browser.
