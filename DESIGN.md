# Technical Architecture Blueprint: Two-Player Web-Based TicTacToe Game

## 1. Branch Name & Tech Stack
- **Git Feature Branch:** `tictactoe-web-game`
- **Frontend Stack:** Semantic HTML5, Modern CSS3 (CSS Grid & Flexbox), Vanilla JavaScript (ES6+, zero build step / no framework dependencies).
- **Web Server & Containerization:** Nginx (alpine-based) serving static assets on port `8080`.

---

## 2. Modular File Architecture
To enable seamless parallel development across Athos, Porthos, and Aramis without merge conflicts, each developer owns disjoint files:

```
├── index.html       # HTML5 skeleton, DOM elements, script and stylesheet links
├── styles.css       # 3x3 CSS Grid layout, responsive styling, themes, animations
├── game.js          # Core turn management, board state, move handler, event listeners
├── rules.js         # Win & draw detection algorithms, 8 combos, victory highlights, reset logic
├── Dockerfile       # Nginx Alpine container definition exposing port 8080
├── nginx.conf       # Custom Nginx configuration listening on port 8080
└── DESIGN.md        # Technical contract and architecture blueprint
```

---

## 3. DOM Contract & IDs

### 3.1 Required Element IDs & Classes
`index.html` MUST provide the following exact IDs and classes so that `styles.css`, `game.js`, and `rules.js` can integrate directly:

| DOM Element | ID / Selector | Attributes | Purpose |
|---|---|---|---|
| Main Container | `#game-container` | `class="container"` | Outer centered game card |
| Game Title | `#game-title` | — | Heading "Tic-Tac-Toe" |
| Status Banner | `#status` | `class="status-banner"` | Real-time status: "Player X's Turn", "Player X Wins!", "It's a Draw!" |
| Game Board | `#board` | `class="board-grid"` | 3x3 grid container |
| Board Cells (9) | `.cell` | `data-index="0"` to `data-index="8"` | Interactive cells for grid indices 0-8 |
| Reset Button | `#reset-btn` | `class="btn-reset"` | Restarts the game to initial state |

### 3.2 Cell Layout & Index Mapping
The 3x3 grid layout corresponds to index `0` through `8`:
```
[ 0 ] [ 1 ] [ 2 ]
[ 3 ] [ 4 ] [ 5 ]
[ 6 ] [ 7 ] [ 8 ]
```

### 3.3 CSS State Classes
- `.cell`: Default cell styling (pointer cursor, centered font, border/grid lines, responsive min-size e.g. 80-100px).
- `.cell.x`: Displays 'X' symbol styling.
- `.cell.o`: Displays 'O' symbol styling.
- `.cell.taken`: Indicates cell is occupied and unclickable.
- `.cell.winning`: Visual highlight for the 3 winning cells (e.g. golden/green background, pulse animation).
- `.status-banner`: High-contrast, dynamic player status indicator.

### 3.4 Script & Stylesheet Inclusion in `index.html`
```html
<link rel="stylesheet" href="styles.css">
<!-- rules.js loaded before game.js to provide validation and win-check utilities -->
<script src="rules.js"></script>
<script src="game.js"></script>
```

---

## 4. JavaScript Interface Contracts

### 4.1 Win & Draw Rules Contract (`rules.js`)
Owned by: **Aramis** (SCRUM-113 / SCRUM-108)

The 8 standard winning combinations:
```javascript
const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Column 1
  [1, 4, 7], // Column 2
  [2, 5, 8], // Column 3
  [0, 4, 8], // Diagonal 1
  [2, 4, 6]  // Diagonal 2
];
```

Exposed on `window.TicTacToeRules`:
- `window.TicTacToeRules.checkWinner(boardState)`:
  - Input: Array of 9 strings (e.g., `['X', '', 'O', ...]`)
  - Output: `{ winner: 'X' | 'O', combination: [i, j, k] }` if won, else `null`.
- `window.TicTacToeRules.checkDraw(boardState)`:
  - Input: Array of 9 strings
  - Output: `boolean` (`true` if all 9 cells are non-empty and no winner, else `false`).
- `window.TicTacToeRules.highlightWinningCells(combination)`:
  - Applies `.winning` class to cells matching indices in `combination`.
- `window.TicTacToeRules.resetGame()`:
  - Clears cell text, removes `.x`, `.o`, `.taken`, `.winning` classes, and resets board.

### 4.2 Game State & Turn Management Contract (`game.js`)
Owned by: **Porthos** (SCRUM-112 / SCRUM-107)

Manages:
- Internal state:
  - `boardState`: `Array(9).fill('')`
  - `currentPlayer`: `'X'` (Player X always starts)
  - `isGameOver`: `boolean` (`false` initially)
- Event listeners:
  - Attach click handler to `.cell` elements:
    1. Read `cell.getAttribute('data-index')`.
    2. If cell is occupied or `isGameOver === true`, ignore click.
    3. Place mark `currentPlayer` in cell and `boardState[index]`.
    4. Call `window.TicTacToeRules.checkWinner(boardState)`:
       - If winner: set `isGameOver = true`, highlight winning cells, set `#status` text to `Player ${winner} Wins!`.
       - If draw (`window.TicTacToeRules.checkDraw(boardState)`): set `isGameOver = true`, set `#status` text to `It's a Draw!`.
       - Otherwise: toggle `currentPlayer = currentPlayer === 'X' ? 'O' : 'X'`, set `#status` text to `Player ${currentPlayer}'s Turn`.
  - Attach click handler to `#reset-btn`:
    - Resets `boardState`, `currentPlayer = 'X'`, `isGameOver = false`.
    - Resets UI status text to `Player X's Turn`.
    - Calls `window.TicTacToeRules.resetGame()`.

Exposed on `window.TicTacToeGame`:
- `getBoardState()`: returns current 9-element array
- `getCurrentPlayer()`: returns `'X'` or `'O'`
- `isGameActive()`: returns `!isGameOver`
- `restart()`: triggers full reset

---

## 5. Docker & Containerization Contract (`Dockerfile` & `nginx.conf`)
Owned by: **Athos / DevOps** (SCRUM-109)

- Base image: `nginx:alpine`
- Configuration: Custom `nginx.conf` listening on `listen 8080;` with root `/usr/share/nginx/html;` and `index index.html;`
- Expose port: `8080`
- Copied files: `index.html`, `styles.css`, `game.js`, `rules.js`, `nginx.conf`

---

## 6. Parallel Task Execution Waves

### Wave 1 (Fully Parallel - Disjoint File Ownership)
Each developer works simultaneously on independent target files:

| Task Key | Developer | Target File(s) | Description |
|---|---|---|---|
| **SCRUM-111 / SCRUM-106** | **Athos** | `index.html`, `styles.css` | UI structure, 3x3 grid layout, CSS styling, responsive media queries, `#board`, `#status`, `#reset-btn`. |
| **SCRUM-112 / SCRUM-107** | **Porthos** | `game.js` | Turn-based logic, player alternation ('X'/'O'), move validation, board state, event listeners. |
| **SCRUM-113 / SCRUM-108** | **Aramis** | `rules.js` | Win/draw detection algorithms, 8 combinations check, `.winning` highlight, board reset helper. |
| **SCRUM-109** | **Athos** | `Dockerfile`, `nginx.conf` | Alpine Nginx container listening on port 8080. |

### Wave 2 (Integration & Verification)
- Verify end-to-end user interactions in browser.
- Verify container build and runtime serving on port 8080.
