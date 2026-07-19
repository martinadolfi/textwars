# TextWars

**Type fast. Strike first.**

TextWars is a tactical typing-defense game that runs entirely in the browser. Enemy codewords descend toward your defense perimeter; type a codeword and press **Enter** or **Space** to destroy it before it breaches your shields.

## Play

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Features

- Three distinct difficulty modes: Cadet, Ace, and Onslaught
- English and Spanish word pools with an in-game language switch
- Target-lock feedback that tracks the most urgent matching threat
- Score multipliers, danger-clear bonuses, sectors, accuracy, and streaks
- Pause/resume, keyboard shortcuts, touch-friendly firing, and responsive layouts
- Synthesized Web Audio effects with a persistent mute preference
- Per-mode personal records stored locally—no account or backend required
- Reduced-motion support and accessible labels/live state announcements

## Controls

| Action | Control |
| --- | --- |
| Lock a target | Type its codeword |
| Fire | `Enter`, `Space`, or the Fire button |
| Pause / resume | `Esc`, `P`, or the Pause button |
| Restart | `Enter` on the mission-results screen |

## Development

The game remains dependency-free at runtime. The gameplay calculations live in a small standalone core so they can be tested with Node's built-in test runner.

```bash
npm test
npm run check
```

## Structure

```text
index.html              interface and game states
app.css                 responsive tactical-console visual system
app.js                  browser game loop, input, effects, audio, persistence
game-core.js            deterministic scoring, pacing, and word-selection rules
wordList.js             English and Spanish word pools
test/game-core.test.js  gameplay rule coverage
assets/                 social preview artwork
docs/                   product and architecture notes
```
