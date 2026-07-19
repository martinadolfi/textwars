# TextWars — Product Brief

## Product promise

TextWars turns typing practice into a tense, instantly understandable arcade defense game: **type fast, strike first, survive longer**.

It is designed for anyone who wants a short, satisfying typing challenge without signing in, installing an app, or learning complicated controls.

## Core loop

1. Enemy codewords descend toward the defense perimeter.
2. Typing highlights matching letters and locks the most urgent matching target.
3. Enter or Space fires the cannon.
4. Consecutive hits increase the multiplier; danger-zone clears add bonus points.
5. Higher scores unlock faster sectors with longer codewords and heavier pressure.
6. A breach removes one shield. When shields reach zero, the run ends and per-mode records are saved locally.

## Design principles

- **Readable under pressure.** Targets, threat states, and weapon feedback are always visually distinct.
- **Skillful, not arbitrary.** Lane-aware spawning, duplicate prevention, and progressive word length create fair pressure.
- **Every action feels physical.** Target tracking, cannon aim, recoil, laser fire, particles, audio, and screen feedback make typing feel like combat.
- **Fast replay.** One action starts or restarts a run; the results screen explains performance immediately.
- **Local by default.** No account, backend, tracking, or network connection is required to play.
- **Works everywhere.** Desktop keyboard play is primary, with responsive touch controls and reduced-motion support.

## Modes

| Mode | Shields | Pace | Intent |
| --- | ---: | --- | --- |
| Cadet | 5 | Calm | Learn the loop and build confidence |
| Ace | 3 | Adaptive | The balanced default experience |
| Onslaught | 2 | Aggressive | High-pressure challenge for fast typists |

## Success signals

- A new player understands the loop from the briefing screen without documentation.
- Targeting and firing feel immediate and unambiguous.
- A finished run makes the player want to redeploy and beat a visible personal record.
- The game remains smooth and readable across desktop and mobile viewport sizes.
