# TextWars

A typing shooter game that runs in your browser. Words fall from the top of the screen — type them and hit Enter to destroy them before they reach your cannon.

## How to Play

1. Open `index.html` in a browser
2. Type the falling words exactly
3. Press **Enter** or **Space** to shoot
4. Don't let words reach the bottom — you only have 3 lives

Build combos by hitting consecutive words for higher scores. Waves get faster as your score climbs.

## Running It

No build step, no dependencies to install. Just open the file:

```bash
# option 1: open directly
open index.html

# option 2: local server
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tech

- Vanilla JS + jQuery 3.5.0
- Pure CSS animations
- localStorage for high scores
- English & Spanish word lists (auto-detected from browser language)

## Project Structure

```
├── index.html       # Page markup
├── app.js           # Game logic
├── app.css          # Styles & animations
├── wordList.js      # EN/ES word lists
└── docs/
    ├── product-brief.md
    └── codebase.md
```
