# Technical Blueprint - Sprint 1.0 (TicTacToeV2003)

## 1. Branch & Tech Stack
- **Branch**: `feature-tictactoe-v1`
- **Stack**: Vanilla HTML5, CSS3, Vanilla ES6 JavaScript
- **Web Server**: Nginx on port `8080` (Alpine base)

## 2. Modular File Tree
- `index.html`: Semantic layout, scoreboard, 3x3 board container, status banner, reset controls.
- `styles.css`: Modern responsive styles, CSS Grid board layout, marker styling, hover & animations.
- `Dockerfile`: Nginx static server listening on port `8080` serving root static files.
- `game.js`: Pure Tic-Tac-Toe state engine, turn manager, win/draw condition detection.
- `app.js`: DOM event listeners, board renderer, scoreboard/status controller, game wiring.

## 3. DOM Contract & Assets (`index.html`)
- `<link rel="stylesheet" href="styles.css">` inside `<head>`
- `<script src="game.js"></script>` followed by `<script src="app.js"></script>` before `</body>`
- Elements & IDs:
  - `#scoreboard`: Scoreboard container
  - `#score-x`: Player X win count display
  - `#score-o`: Player O win count display
  - `#score-ties`: Ties count display
  - `#status-message`: Turn and game-over status display
  - `#board`: 3x3 grid container
  - `.cell`: 9 grid cell buttons with `data-index="0"` through `data-index="8"`
  - `#reset-btn`: Round reset button (preserves scores)
  - `#reset-all-btn`: Match reset button (clears scores)
- Cell dynamic classes: `.x`, `.o`, `.winning`

## 4. JS Interface Contract (`game.js`)
Global `window.TicTacToeGame` class specification:
- `constructor()`: Initializes board `Array(9).fill(null)`, `currentPlayer = 'X'`, `winner = null`, `isDraw = false`, `winningLine = null`, scores `{ X: 0, O: 0, ties: 0 }`.
- `makeMove(index)`: Validates cell index (0-8) and move legality. Updates board, evaluates 8 winning lines & draw condition, tracks score on terminal state, toggles player if ongoing. Returns `{ success: boolean, winner: string|null, isDraw: boolean, winningLine: number[]|null, currentPlayer: string }`.
- `resetRound()`: Clears board array, winner, isDraw, and winningLine; keeps scores; sets `currentPlayer = 'X'`.
- `resetGame()`: Calls `resetRound()` and clears scores `{ X: 0, O: 0, ties: 0 }`.
- `getState()`: Returns deep copy of `{ board, currentPlayer, winner, isDraw, winningLine, scores }`.

## 5. Task-to-File Mapping & Parallel Waves
| Jira Task | Summary | Target Files | Wave |
|---|---|---|---|
| **SCRUM-92** | Task 1: HTML/CSS Structure & Board Layout | `index.html`, `styles.css`, `Dockerfile` | Wave 1 (Parallel) |
| **SCRUM-93** | Task 2: Core Game Logic & Win Condition Engine | `game.js` | Wave 1 (Parallel) |
| **SCRUM-94** | Task 3: Scoreboard, Status Display & Reset Controls | `app.js` | Wave 2 |
