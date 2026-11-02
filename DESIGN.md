# Technical Design: Kid-Friendly Web Tic-Tac-Toe

## 1. Branch & Single-Container Architecture
- **Branch**: `feat-tictactoe`
- **Architecture**: Static SPA Container (`nginx:alpine`) on port `8080` (Option B).
- **Subpath Handling**: Served behind `/demo/` load balancer subpath. All asset paths and links MUST be relative without leading slashes.
- **Dockerfile**: Light Nginx container serving static files on port 8080 with custom port configuration.

## 2. Modular File Tree
```
├── Dockerfile                  # nginx:alpine listening on port 8080
├── README.md                   # Project description & run instructions
├── cloudbuild.yaml             # Preserved CI/CD deployment pipeline
├── DESIGN.md                   # Technical blueprint and interface contracts
├── index.html                  # Semantic HTML5 layout, controls, board & score modal
├── styles.css                  # Kid-friendly theme (bright pastel colors, bouncy typography, animations)
└── game.js                     # Turn tracking, win/draw detection, Web Audio FX, confetti/animations
```

## 3. DOM IDs, CSS Classes & JS Contracts

### DOM Elements (`index.html`)
- `#game-title`: Game header title with playful emoji.
- `#status-banner`: Dynamic banner displaying active player turn / win / draw status.
- `#score-x`, `#score-o`, `#score-ties`: Scoreboard counters for Player X, Player O, and Ties.
- `#game-board`: Grid container holding 9 interactive cell buttons.
- `.cell[data-index="0"`..`"8"]`: Interactive board cells with `aria-label` and keyboard accessibility.
- `#btn-reset`: "Play Again / Reset Board" button.
- `#btn-reset-scores`: "Clear Scores" button.
- `#confetti-canvas`: Fullscreen overlay `<canvas>` for celebratory victory particles.
- `<script src="game.js">`: Loaded at end of body or with `defer`, relative path without leading slash.

### CSS Theme & Visual Contracts (`styles.css`)
- Root variables: `--bg-gradient`, `--board-bg`, `--cell-bg`, `--color-x` (coral/orange), `--color-o` (sky blue), `--font-main` (rounded sans-serif like 'Fredoka', 'Nunito', system-ui).
- Board grid: `display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 380px;`.
- Cell styling: Large font, rounded corners (`border-radius: 16px`), bounce hover effect, distinct glow/colors for `.cell.x` and `.cell.o`.
- Animations: `@keyframes popIn`, `@keyframes winBounce`, `@keyframes pulseTurn`.
- Responsive: Fluid layout scaling gracefully on mobile and tablet screens.

### JavaScript Interfaces & Logic (`game.js`)
- `GameState`:
  - `board`: Array of 9 items (`''`, `'X'`, `'O'`)
  - `currentPlayer`: `'X'` | `'O'`
  - `scores`: `{ X: 0, O: 0, ties: 0 }`
  - `isGameOver`: boolean
- Win Combinations: `[[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]]`
- Key Functions:
  - `handleCellClick(index)`: Validates move, updates state & DOM, triggers sound, checks win/draw.
  - `checkWinner()`: Returns winning line array or null; checks for tie if all filled.
  - `highlightWinningCells(combo)`: Adds `.win-cell` class for celebratory animation.
  - `playTone(type)`: Web Audio API synthesizer for kid-friendly sounds ('pop', 'win', 'tie', 'reset') without external audio files.
  - `triggerConfetti()`: Self-contained particle effect rendered onto `#confetti-canvas`.
  - `resetBoard()` / `resetScores()`: Restores game state and updates DOM counters.

## 4. Code Quality & Cloud Run Subpath Principles
- **Relative Paths**: Use `href="styles.css"` and `src="game.js"`. Never use leading slashes `/styles.css` or `/game.js`.
- **Defensive DOM**: Wrap setup in `document.addEventListener('DOMContentLoaded', ...)`. Guard all DOM queries.
- **Self-Contained Assets**: Use inline SVG, Unicode symbols (❌ / ⭕ / 🐱 / 🐶 / 🌟), CSS shapes, and Web Audio API synthesis. No external CDN dependencies.

## 5. Task-to-File Mapping & Parallel Waves (Sprint 1.0)

| Task Key | Summary | Target Files | Wave |
|---|---|---|---|
| `SCRUM-160` | Build Semantic HTML5 Structure and Game Layout | `index.html`, `Dockerfile` | Wave 1 (Parallel) |
| `SCRUM-161` | Design Kid-Friendly Responsive UI and Playful Animations | `styles.css` | Wave 1 (Parallel) |
| `SCRUM-162` | Implement Core Game Logic, Win Detection, and Feedback | `game.js` | Wave 1 (Parallel) |
