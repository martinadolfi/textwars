# TextWars — Product Brief

## What it is

TextWars is a browser-based typing game. Players destroy falling words by typing them before they hit the bottom of the screen. It's fast, arcade-y, and gets harder the longer you survive.

## Who it's for

Anyone who wants to practice typing or just kill a few minutes. Works on desktop browsers. No sign-up, no install.

## Core Loop

1. Words spawn at the top and fall down
2. Player types a word and presses Enter to shoot it
3. Hitting words builds a combo multiplier; missing resets it
4. Every 120 points triggers a new wave (faster spawns, faster words)
5. Lose a life when a word reaches the bottom. Three lives total.
6. Game ends → high score saved locally → play again

## What makes it stick

- **Combo system** — consecutive hits multiply your score and trigger milestone callouts (Nice!, Great!, Amazing!, UNSTOPPABLE!)
- **Visual feedback** — laser beams, explosions, screen shake, score popups. It feels good to play.
- **Escalating difficulty** — spawn rate and speed both scale with wave and combo, so the game pushes back as you improve
- **Persistent high scores** — best score and highest wave saved in localStorage

## Scope & Constraints

- Single-player only
- No backend, no accounts, no analytics
- Runs from a single HTML file + JS/CSS
- Supports English and Spanish (detected from browser language)
- No build tools or package manager needed

## Possible Next Steps

- Leaderboard (would need a backend)
- More languages / custom word lists
- Mobile touch input improvements
- Difficulty modes (easy / hard)
- Sound effects
