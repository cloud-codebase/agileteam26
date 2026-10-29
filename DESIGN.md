# DESIGN.md — Sprint 1.0 Architecture & Technical Blueprint

## 1. Branch & Single-Container Architecture
- **Branch**: `feat-tictactoe4k`
- **Runtime**: Static Nginx Single-Container (`nginx:alpine`) listening on port `8080`.
- **Subpath Handling**: Hosted at `/demo/index.html`. All asset references in HTML and JS must be relative without leading slashes (e.g., `styles.css`, `game.js`, `app.js`).

## 2. Modular File Tree & Ownership
```
.
├── Dockerfile             (SCRUM-135) - Nginx listening on port 8080
├── nginx.conf             (SCRUM-135) - Nginx config with port 8080
├── index.html             (SCRUM-135) - Semantic layout, board grid, HUD, controls
├── styles.css             (SCRUM-135) - Kid-friendly responsive vibrant styling
├── game.js                (SCRUM-136) - Pure game state, board logic, AI algorithms
├── app.js                 (SCRUM-137) - UI wiring, Web Audio chimes, confetti, storage
├── cloudbuild.yaml        (PRESERVED) - CI/CD pipeline
└── README.md              (PRESERVED) - Project documentation
```

## 3. Interfaces & Contracts

### DOM Elements & IDs (`index.html`)
- `#player-turn`: Display text banner for current turn / game outcome announcement.
- `#score-x`: Score number for Player X (Puppy 🐶).
- `#score-o`: Score number for Player O (Kitten 🐱 / Friendly Robot 🤖).
- `#score-ties`: Score number for Tied rounds.
- `#game-board`: 3x3 container with `.cell` elements (`data-index="0"` to `"8"`).
- `#mode-select`: Dropdown or button toggle (`pvp` vs `pve` friendly robot).
- `#btn-reset-round`: Button to reset current board grid.
- `#btn-reset-score`: Button to reset cumulative scoreboard.
- `#btn-sound-toggle`: Button to mute / unmute audio chimes.
- `#confetti-canvas`: Fullscreen overlay `<canvas>` for celebratory particles.

### Script Load Order (`index.html`)
```html
<script src="game.js"></script>
<script src="app.js"></script>
```

### Game Logic Contract (`game.js` exposed on `window.TicTacToeGame`)
- `createGame(mode = 'pve')`: Returns `{ board, turn, mode, status, winner, winningLine }`.
- `makeMove(game, index)`: Validates & applies move. Returns `{ success, game, isWin, isTie, winningLine }`.
- `getBestMove(game, difficulty = 'friendly')`: Evaluates 3x3 grid; returns index `0-8` (mix of winning/blocking and playful exploratory moves for friendly kid mode).
- `resetRound(game)`: Resets grid and turn while preserving active mode.
- `checkWinner(board)`: Returns `{ winner: 'X'|'O'|null, isTie: boolean, line: number[]|null }`.

### Controller & Audio Contract (`app.js`)
- `SoundEffects`: Synthesized tones via `window.AudioContext` (`playMove()`, `playWin()`, `playTie()`, `playClick()`).
- `ConfettiCelebration`: Particle animation on `#confetti-canvas`.
- `StorageManager`: Persists scores and sound preferences in `localStorage` under `tictactoe4k_scores`.
- Wrap setup inside `document.addEventListener('DOMContentLoaded', ...)`.

## 4. Code Quality & Subpath Principles
- **Relative Paths**: Use `styles.css`, `game.js`, `app.js` without leading slashes.
- **Self-Contained Visuals**: Use emojis (🐶, 🐱, 🤖), SVG icons, and HTML5 Canvas for particles.
- **Defensive Coding**: Null-check all `getElementById` queries and handle WebAudio autoplay policies cleanly.

## 5. Task-to-File Mapping & Parallel Waves
| Task ID | Summary | Target Files | Wave |
|---|---|---|---|
| **SCRUM-135** | Kid-Friendly UI Layout, Styles & Dockerfile | `index.html`, `styles.css`, `Dockerfile`, `nginx.conf` | Wave 1 (Parallel) |
| **SCRUM-136** | Pure Tic-Tac-Toe Game Engine & Friendly AI | `game.js` | Wave 1 (Parallel) |
| **SCRUM-137** | UI Controller, Web Audio & Celebration Wiring | `app.js` | Wave 2 |
