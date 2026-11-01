# System Architecture & Technical Design: Web-Based Chess Game (Single Player)

## 1. Branch & Cloud Run Architecture
- **Git Branch**: `feat-eval-session-1`
- **Hosting Model**: Single-container static web app via `nginx:alpine` on Cloud Run listening on port `8080`.
- **Subpath Safe**: All asset references in `index.html` MUST use relative paths without leading slash (`href="styles.css"`, `src="chess-engine.js"`, `src="app.js"`).
- **Zero External Assets**: Chess pieces rendered via clean Unicode characters (`♔♕♖♗♘♙`, `♚♛♜♝♞♟`) or inline SVGs.

## 2. Modular File Tree & Ownership
- `cloudbuild.yaml` (Preserved): Cloud Build deployment definition.
- `README.md` (Preserved): Project documentation.
- `Dockerfile` & `nginx.conf`: Nginx Alpine serving static files on port 8080.
- `index.html`: Responsive 8x8 chessboard container, game status, turn/captured displays, restart button.
- `styles.css`: Visual design, checkered board styling, square highlights (selected, legal moves, check, last move).
- `chess-engine.js`: Pure chess logic (board representation, move validation for all pieces, check/checkmate detection).
- `app.js`: Single-player controller, user interaction/click handling, AI opponent turn execution, game state coordination.

## 3. DOM IDs & UI Elements Specification (`index.html` & `styles.css`)
- `#app-container`: Main application wrapper.
- `#game-title`: Title header ("Web Chess - Single Player").
- `#status-panel`: Turn indicator (`#turn-indicator`), Check/Checkmate banner (`#game-status`).
- `#captured-white`, `#captured-black`: Containers for captured pieces.
- `#chessboard`: 8x8 grid element containing 64 `.square` elements (`data-row="0..7"`, `data-col="0..7"`, `data-square="e4"`).
  - Classes: `.light`, `.dark`, `.selected`, `.legal-target`, `.last-move`, `.in-check`.
  - Piece element: `<span class="piece" data-color="w|b" data-type="p|r|n|b|q|k"></span>`.
- `#reset-btn`: "New Game" restart button.
- `#difficulty-select`: Select dropdown for AI difficulty (e.g. "Random", "Tactical / Greedy").

## 4. JavaScript Contracts & Interfaces

### Script Loading Order in `index.html`:
1. `<script src="chess-engine.js"></script>`
2. `<script src="app.js"></script>`

### `chess-engine.js` (`window.ChessEngine`):
- `initBoard()`: Returns initial 8x8 board representation (row 0: black major, row 1: black pawns, row 6: white pawns, row 7: white major).
- `getLegalMoves(board, row, col, activeTurn)`: Returns array of valid `{ toRow, toCol, isCapture, isEnPassant, isPromotion }`.
- `makeMove(board, fromRow, fromCol, toRow, toCol)`: Returns `{ newBoard, capturedPiece, isCheck, isCheckmate, isStalemate }`.
- `isKingInCheck(board, color)`: Returns boolean if `color` king is under attack.
- `getAllLegalMoves(board, color)`: Returns array of all legal moves for `color` (`{ fromRow, fromCol, toRow, toCol, ... }`).
- `isGameOver(board, color)`: Returns `{ isOver: boolean, result: 'checkmate'|'stalemate'|null, winner: 'white'|'black'|'draw'|null }`.

### `app.js` (`window.ChessApp`):
- Initializes on `document.addEventListener('DOMContentLoaded', ...)`.
- Manages player color (`'white'`) vs AI opponent (`'black'`).
- Handles square selection, displays legal move dots, handles human moves.
- Triggers AI response move with subtle delay (~300ms) using `ChessEngine.getAllLegalMoves(board, 'black')` (prioritizing captures or highest value piece).
- Updates DOM status, captured piece trays, and game end alerts.

## 5. Task-to-File Mapping & Parallel Waves

| Task Key | Developer | Target Files | Wave | Scope / Deliverable |
|---|---|---|---|---|
| **SCRUM-151** | Athos | `index.html`, `styles.css`, `Dockerfile`, `nginx.conf` | Wave 1 | Board layout 8x8, coordinate labels, piece styling, status bar, container config on port 8080. |
| **SCRUM-152** | Porthos | `chess-engine.js` | Wave 1 | Chess board model, move validation (P, R, N, B, Q, K), obstacle detection, check/checkmate logic. |
| **SCRUM-153** | Aramis | `app.js` | Wave 2 | Board click handling, move dispatching, AI opponent engine, reset & status updates. |
