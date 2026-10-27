# Technical Blueprint - Sprint 1.0 (TicTacToeV2002)

## 1. Branch & Tech Stack
- **Branch**: `feature-tictactoe-v1`
- **Stack**: Vanilla HTML5, CSS3, Vanilla ES6 JavaScript
- **Web Server**: Nginx on port `8080` (Alpine base)

## 2. Modular File Tree
- `index.html`: Semantic layout, scoreboard, 3x3 grid container, status banner, controls.
- `styles.css`: Responsive CSS styling, CSS Grid for 3x3 board, animations, theme.
- `Dockerfile`: Nginx image exposing port 8080 serving `/usr/share/nginx/html`.
- `game.js`: Pure Tic-Tac-Toe state engine, turn tracking, win/draw detection.
- `app.js`: DOM event listeners, controller, board rendering, scoreboard updates.

## 3. DOM Contract & Assets (`index.html`)
- `<link rel="stylesheet" href="styles.css">` in `<head>`
- `<script src="game.js"></script>` and `<script src="app.js"></script>` at bottom of `<body>`
- Elements & IDs:
  - `#scoreboard`: Scoreboard container
  - `#score-x`: Player X win count display
  - `#score-o`: Player O win count display
  - `#score-ties`: Ties count display
  - `#status-message`: Status message (e.g., "Player X's Turn", "Player X Wins!")
  - `#board`: 3x3 grid container
  - `.cell`: 9 grid cell buttons with `data-index="0"` through `data-index="8"`
  - `#reset-btn`: Button to reset current game round
  - `#reset-all-btn`: Button to reset game round and clear scores

## 4. JS Interface Contract (`game.js`)
`window.TicTacToeGame` class contract:
- `constructor()`: Initializes board `Array(9).fill(null)`, `currentPlayer = 'X'`, `winner = null`, `isDraw = false`, `winningLine = null`, scores `{ X: 0, O: 0, ties: 0 }`.
- `makeMove(index)`: Validates move at index (0-8). If valid and game active, places symbol, checks 8 win lines / draw, updates scores if terminal, toggles player if active. Returns move result object: `{ success: boolean, winner: string|null, isDraw: boolean, winningLine: number[]|null, currentPlayer: string }`.
- `resetRound()`: Clears board and terminal states; preserves scores; sets `currentPlayer = 'X'`.
- `resetGame()`: Calls `resetRound()` and resets scores to `{ X: 0, O: 0, ties: 0 }`.
- `getState()`: Returns deep copy of current game state object `{ board, currentPlayer, winner, isDraw, winningLine, scores }`.

## 5. Task-to-File Mapping & Execution Waves
| Jira Task | Summary | Target Files | Wave |
|---|---|---|---|
| **SCRUM-88** | UI Layout, Styling, Responsive Board & Nginx Dockerfile | `index.html`, `styles.css`, `Dockerfile` | Wave 1 (Parallel) |
| **SCRUM-89** | Core Game Logic, Turn Engine, and Win Detection | `game.js` | Wave 1 (Parallel) |
| **SCRUM-90** | Interactive DOM Controller, Scoreboard & Reset Wiring | `app.js` | Wave 2 |
