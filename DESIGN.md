# Technical Blueprint & Architecture Design: Web-Based Tic-Tac-Toe Game

## 1. Overview & Technical Stack
- **Feature Branch**: `feature-tictactoe`
- **Application Type**: Two-Player Turn-Based Web Game (Local Pass-and-Play)
- **Frontend Stack**: Vanilla HTML5, CSS3, Modern ES6+ JavaScript (Zero external build dependencies or frameworks)
- **Containerization**: Lightweight Nginx Alpine image listening on port `8080` for Cloud Run deployment
- **Design Philosophy**: Strict file separation and well-defined interface contracts allowing Athos, Porthos, and Aramis to develop in parallel with zero merge conflicts.

---

## 2. Modular File Tree & Component Ownership
```text
.
├── DESIGN.md           # Architecture blueprint and interface contracts (ArchitectAlex)
├── index.html          # Semantic HTML5 layout, UI controls, scoreboard (SCRUM-119)
├── styles.css          # Responsive styling, CSS grid board, animations (SCRUM-119)
├── Dockerfile          # Nginx container configuration on port 8080 (SCRUM-119)
├── nginx.conf          # Nginx server block routing to /usr/share/nginx/html (SCRUM-119)
├── .dockerignore       # Ignored files for Docker build context (SCRUM-119)
├── game.js             # Pure JavaScript TicTacToe game engine logic & state (SCRUM-120)
└── app.js              # UI controller, event bindings, and session scoreboard (SCRUM-121)
```

---

## 3. DOM IDs, Attributes & CSS Class Contracts

### 3.1 HTML Structure (`index.html`) Contract
`index.html` must include the following elements and IDs:
- Header:
  - `<h1 id="game-title">Tic-Tac-Toe</h1>`
- Turn & Game Status Indicator:
  - `<div id="status" class="status" aria-live="polite">Player X's Turn</div>`
- Scoreboard Section:
  - Container: `<div id="scoreboard" class="scoreboard">`
  - Player X score: `<div id="score-x-container" class="score-card"><span class="label">Player X:</span> <span id="score-x" class="score-value">0</span></div>`
  - Player O score: `<div id="score-o-container" class="score-card"><span class="label">Player O:</span> <span id="score-o" class="score-value">0</span></div>`
  - Ties score: `<div id="score-ties-container" class="score-card"><span class="label">Ties:</span> <span id="score-ties" class="score-value">0</span></div>`
- 3x3 Game Board:
  - Grid Container: `<div id="board" class="board" role="grid">`
  - 9 interactive cells (indices 0 to 8, row-major order):
    - `<button class="cell" id="cell-0" data-index="0" aria-label="Square 1" role="gridcell"></button>`
    - `<button class="cell" id="cell-1" data-index="1" aria-label="Square 2" role="gridcell"></button>`
    - `<button class="cell" id="cell-2" data-index="2" aria-label="Square 3" role="gridcell"></button>`
    - `<button class="cell" id="cell-3" data-index="3" aria-label="Square 4" role="gridcell"></button>`
    - `<button class="cell" id="cell-4" data-index="4" aria-label="Square 5" role="gridcell"></button>`
    - `<button class="cell" id="cell-5" data-index="5" aria-label="Square 6" role="gridcell"></button>`
    - `<button class="cell" id="cell-6" data-index="6" aria-label="Square 7" role="gridcell"></button>`
    - `<button class="cell" id="cell-7" data-index="7" aria-label="Square 8" role="gridcell"></button>`
    - `<button class="cell" id="cell-8" data-index="8" aria-label="Square 9" role="gridcell"></button>`
- Controls Container:
  - `<div id="controls" class="controls">`
  - Restart / New Round button: `<button id="reset-btn" class="btn">New Round</button>`
  - Reset Scoreboard button: `<button id="reset-score-btn" class="btn btn-secondary">Reset Scores</button>`
- Script inclusions at end of `<body>`:
  ```html
  <script src="game.js"></script>
  <script src="app.js"></script>
  ```

### 3.2 CSS Classes & Visual State Contracts (`styles.css`)
- `.board`: 3x3 grid display (`display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 360px; margin: 0 auto;`).
- `.cell`: Square aspect ratio (`aspect-ratio: 1 / 1; min-height: 100px`), centered content, large font (`font-size: 2.5rem; font-weight: bold`), pointer cursor, smooth background transitions.
- `.cell.x`: Text color for X player (e.g., `#2563eb` vibrant blue).
- `.cell.o`: Text color for O player (e.g., `#dc2626` bold crimson).
- `.cell.winner`: Victory state highlighting (e.g., background `#10b981` or `#fef08a` with pop animation/box-shadow).
- `.cell:disabled`: Cursor `not-allowed`.
- `.status`: Prominent typography, centered, margin for spacing.
- `.scoreboard`: Flex container displaying the 3 score cards in a row.
- `.btn`: Modern styled action buttons with `:hover` and `:active` effects.

---

## 4. JavaScript Interface Contracts

### 4.1 Game Logic Engine (`game.js`) - `TicTacToeGame` Class
`game.js` contains the pure, framework-free game state engine. It must attach `TicTacToeGame` to `window` (and support `module.exports` if applicable):

```javascript
class TicTacToeGame {
  constructor() {
    this.WINNING_COMBINATIONS = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    this.reset();
  }

  reset() {
    this.board = Array(9).fill('');
    this.currentPlayer = 'X';
    this.isGameOver = false;
    this.winner = null;        // 'X' | 'O' | 'draw' | null
    this.winningLine = null;   // [number, number, number] | null
  }

  makeMove(index) {
    if (this.isGameOver || index < 0 || index > 8 || this.board[index] !== '') {
      return { valid: false, reason: 'Invalid move' };
    }

    this.board[index] = this.currentPlayer;
    const winCombo = this.checkWin(this.currentPlayer);

    if (winCombo) {
      this.isGameOver = true;
      this.winner = this.currentPlayer;
      this.winningLine = winCombo;
    } else if (this.isBoardFull()) {
      this.isGameOver = true;
      this.winner = 'draw';
      this.winningLine = null;
    } else {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return {
      valid: true,
      index,
      player: this.board[index],
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      winningLine: this.winningLine,
      isGameOver: this.isGameOver,
      board: [...this.board]
    };
  }

  checkWin(player) {
    for (const combo of this.WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (this.board[a] === player && this.board[b] === player && this.board[c] === player) {
        return combo;
      }
    }
    return null;
  }

  isBoardFull() {
    return this.board.every(cell => cell !== '');
  }

  getBoard() {
    return [...this.board];
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getWinner() {
    return this.winner;
  }

  getWinningLine() {
    return this.winningLine;
  }

  checkGameOver() {
    return this.isGameOver;
  }
}

if (typeof window !== 'undefined') {
  window.TicTacToeGame = TicTacToeGame;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TicTacToeGame };
}
```

### 4.2 UI Controller & Event Binding (`app.js`)
`app.js` runs when DOM is loaded, initializes `const game = new TicTacToeGame()`, manages score state, and binds event listeners:
- **Score State**:
  `scores = { X: 0, O: 0, ties: 0 }`
- **Cell Clicks (`.cell`)**:
  - Read `data-index` attribute.
  - Call `game.makeMove(index)`.
  - On valid move:
    - Update cell text (`X` or `O`) and add class `x` or `o`.
    - If `result.winner === 'X'` or `result.winner === 'O'`:
      - Highlight winning cells: add `.winner` class to cells in `result.winningLine`.
      - Update `#status` text: `Player ${result.winner} Wins!`.
      - Disable further board cell clicks (or set `disabled` property).
      - Increment `scores[result.winner]`, update `#score-x` or `#score-o`.
    - Else if `result.winner === 'draw'`:
      - Update `#status` text: `It's a Draw!`.
      - Increment `scores.ties`, update `#score-ties`.
    - Else:
      - Update `#status` text: `Player ${result.currentPlayer}'s Turn`.
- **Reset Button Click (`#reset-btn`)**:
  - Call `game.reset()`.
  - Clear text and `.x`, `.o`, `.winner` classes on all `.cell` elements.
  - Enable all cell buttons.
  - Reset `#status` to `Player X's Turn`.
- **Reset Scoreboard Click (`#reset-score-btn`)**:
  - Reset `scores = { X: 0, O: 0, ties: 0 }`.
  - Update `#score-x`, `#score-o`, `#score-ties` to `0`.

---

## 5. Container & Cloud Deployment (`Dockerfile` & `nginx.conf`)

### 5.1 `Dockerfile`
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### 5.2 `nginx.conf`
```nginx
server {
    listen 8080;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.3 `.dockerignore`
```text
.git
README.md
DESIGN.md
cloudbuild.yaml
```

---

## 6. Task-to-File Mapping & Execution Waves

All tasks operate on completely disjoint target files, allowing parallel execution without merge conflicts:

| Task Key | Task Title | Developer | Target Files | Wave |
|---|---|---|---|---|
| `SCRUM-119` | Web UI Structure, Layout, and Styling | Athos | `index.html`, `styles.css`, `Dockerfile`, `nginx.conf`, `.dockerignore` | **Wave 1 (Parallel)** |
| `SCRUM-120` | Core Game Logic, State, and Turn Management | Porthos | `game.js` | **Wave 1 (Parallel)** |
| `SCRUM-121` | UI Event Binding, Game Flow, and Score Tracking | Aramis | `app.js` | **Wave 1 (Parallel)** |

### Developer Execution Guidance
- **Athos (SCRUM-119)**: Create `index.html` matching the exact element IDs and tags defined above, `styles.css` with responsive grid and state classes, and the lightweight Nginx `Dockerfile` & `nginx.conf` listening on port `8080`.
- **Porthos (SCRUM-120)**: Implement `game.js` strictly following the `TicTacToeGame` class contract, winning combinations, and return shapes.
- **Aramis (SCRUM-121)**: Implement `app.js` binding the DOM IDs to the `TicTacToeGame` instance, handling win/draw UI updates, animations, and session scoreboards.
- Since contracts and IDs are pre-aligned in this document, all 3 developers can push commits cleanly and test integration immediately!
