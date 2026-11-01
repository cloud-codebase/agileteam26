# Technical Design Blueprint - Sprint 1.0 (ChessMaster1)

## 1. Branch & Single-Container Architecture
- **Branch**: `feat-chessmaster1` | **Port**: `8080` (Cloud Run single container)
- **Runtime**: Node.js (`node:20-alpine`) + Express serving `public/` and health API `/api/health`
- **Subpath Safety**: Served at subpath `/demo/index.html`. ALL asset links and frontend `fetch()` calls MUST be relative without leading slash (`styles.css`, `app.js`, `api/health`).

## 2. Modular File Tree
- `package.json`: Express server configuration & start script
- `Dockerfile`: `node:20-alpine` exposing port 8080 (`CMD ["npm", "start"]`)
- `server.js`: Express server on `0.0.0.0:8080`, serves `public/` & `api/health`
- `public/index.html`: Chess app shell, board container, sidebar panels, controls & modal dialogs
- `public/styles.css`: Modern responsive chessboard styling, piece glyphs, timers, move history, modals
- `public/chess-engine.js`: Pure JS rule engine (board state, legal moves, check/checkmate/stalemate, castling, en passant, promotion)
- `public/ai-player.js`: Single-player AI engine (easy: random/captures, medium: material evaluation + depth 2 minimax, hard: depth 3 alpha-beta + piece-square tables)
- `public/app.js`: DOM event wiring, user interactions, drag-and-drop / click-to-move, AI turn trigger, audio/visual cues, timer & state management

## 3. DOM IDs & Script Load Order
- **Scripts in `index.html`**:
  ```html
  <script src="chess-engine.js"></script>
  <script src="ai-player.js"></script>
  <script src="app.js"></script>
  ```
- **Key DOM Elements**:
  - `#chessboard`: 8x8 grid container (`.square`, `.light`, `.dark`, `.selected`, `.valid-move`, `.last-move`, `.in-check`)
  - `#difficulty-select`: AI level dropdown (`easy`, `medium`, `hard`)
  - `#player-color-select`: Color selection (`white`, `black`)
  - `#btn-new-game`, `#btn-restart`, `#btn-undo`: Action buttons
  - `#turn-indicator`, `#game-status`: Game state & banner alerts
  - `#white-timer`, `#black-timer`: Countdown / elapsed timers
  - `#move-history-list`: Ordered notation list of half-moves
  - `#captured-white`, `#captured-black`: Containers for captured piece icons
  - `#promotion-modal`, `#promotion-choices`: Pawn promotion picker (`queen`, `rook`, `bishop`, `knight`)

## 4. Interfaces & Contracts
- **ChessEngine (`window.ChessEngine`)**:
  - `initBoard(fen?)`: returns initial state representation
  - `getPiece(row, col)`: returns `{ type: 'p'|'r'|'n'|'b'|'q'|'k', color: 'w'|'b' }` or null
  - `getValidMoves(row, col)`: returns array of valid `{ from: {r, c}, to: {r, c}, flag?: string }`
  - `makeMove(move)`: updates board state; handles captures, en-passant, castling, promotion; toggles turn
  - `undoMove()`: reverts last move & restores board state
  - `isCheck(color)`, `isCheckmate(color)`, `isStalemate(color)`, `isDraw()`: status checkers
  - `getHistory()`: returns array of executed moves
  - `reset()`: resets to standard starting position
- **ChessAI (`window.ChessAI`)**:
  - `getBestMove(engine, difficulty)`: returns `{ from: {r, c}, to: {r, c}, promotion?: string }`
  - Supports async / setTimeout worker yield so UI remains responsive.
- **Visuals**: Unicode chess symbols (`♔ ♕ ♖ ♗ ♘ ♙ / ♚ ♛ ♜ ♝ ♞ ♟`) with CSS styling for crisp display.

## 5. Task-to-File Mapping & Execution Waves
| Jira Task | Developer | Target Files | Wave |
|---|---|---|---|
| **SCRUM-155**: Chess Board UI & Responsive Styling | Frontend Dev | `public/index.html`, `public/styles.css` | Wave 1 (Parallel) |
| **SCRUM-156**: Core Chess Rules Engine & Validation | Logic Dev | `public/chess-engine.js` | Wave 1 (Parallel) |
| **SCRUM-157**: Single-Player AI Opponent Engine | AI Dev | `public/ai-player.js` | Wave 1 (Parallel) |
| **SCRUM-158**: Controller, Server & Docker Packaging | Full-Stack Dev | `server.js`, `package.json`, `Dockerfile`, `public/app.js` | Wave 2 (Integration) |
