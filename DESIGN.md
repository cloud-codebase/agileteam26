# Technical Architecture Blueprint — Sprint 1.0

## 1. Branch Name & Tech Stack
- **Feature Branch**: `feat-tictactoe-core`
- **Tech Stack**:
  - Semantic HTML5
  - Modern Responsive CSS3 (CSS Grid & Flexbox, smooth transitions)
  - Vanilla JavaScript (ES6+ Classes, zero build tools or bundlers required)
  - Containerization: Nginx Alpine Dockerfile exposing and listening on port `8080`

---

## 2. Modular File Tree
Each task strictly owns dedicated files to enable parallel development without merge conflicts:

```
.
├── index.html         # [SCRUM-84] Semantic structure, containers, element IDs
├── styles.css         # [SCRUM-84] Modern styling, 3x3 grid, tokens, animations
├── Dockerfile         # [SCRUM-84] Nginx configuration serving app on port 8080
├── game.js            # [SCRUM-85] Core game engine: state, turns, win/draw logic
├── app.js             # [SCRUM-86] DOM controller: event handlers, UI updates, scores
├── DESIGN.md          # [Architect] Technical specification contract
└── README.md          # Project documentation
```

---

## 3. DOM IDs & JS Interface Contracts

### 3.1 Script and Stylesheet Inclusions in `index.html`
In `<head>`:
```html
<link rel="stylesheet" href="styles.css">
```
At the end of `<body>`:
```html
<script src="game.js"></script>
<script src="app.js"></script>
```

### 3.2 HTML Structure & Element IDs (`index.html` <-> `styles.css` <-> `app.js`)

| Element Selector | Element Type | Description |
|---|---|---|
| `#game-container` | `div.game-container` | Main wrapper for the entire game view |
| `#status-banner` | `div.status-banner` | Text banner displaying turn status / game results |
| `#scoreboard` | `div.scoreboard` | Container holding the 3 score cards |
| `#score-x` | `span.score-val` | Player X win count (starts at 0) |
| `#score-o` | `span.score-val` | Player O win count (starts at 0) |
| `#score-draws` | `span.score-val` | Draw count (starts at 0) |
| `#board` | `div.board` | 3x3 CSS grid container hosting 9 cells |
| `.cell[data-index="0"]` to `.cell[data-index="8"]` | `button.cell` | Individual cell buttons with data attribute `data-index` 0 through 8 |
| `#reset-btn` | `button#reset-btn` | Button to reset current board round ("Play Again" / "Reset Round") |
| `#reset-score-btn` | `button#reset-score-btn` | Button to reset session scoreboard ("Reset Scores") |

#### Grid Cell Index Layout:
```
[ 0 ] [ 1 ] [ 2 ]
[ 3 ] [ 4 ] [ 5 ]
[ 6 ] [ 7 ] [ 8 ]
```

#### Dynamic CSS Classes on `.cell`:
- Default: `class="cell"`
- Occupied by X: `class="cell x"` (displays "X")
- Occupied by O: `class="cell o"` (displays "O")
- Winning combination cells: `class="cell x winning-cell"` or `class="cell o winning-cell"`

---

### 3.3 Core Game Logic Contract (`game.js` — Owned by `SCRUM-85`)

`game.js` must expose the class `TicTacToeGame` globally on `window`:

```javascript
class TicTacToeGame {
  constructor() {
    this.reset();
  }

  // Resets board state, currentPlayer to 'X', winner to null, etc.
  reset() {
    this.board = Array(9).fill(null); // 'X' | 'O' | null
    this.currentPlayer = 'X';
    this.winner = null;               // 'X' | 'O' | null
    this.winningLine = null;          // Array of 3 indices, e.g., [0, 1, 2] or null
    this.isDraw = false;              // boolean
    this.gameOver = false;            // boolean
  }

  // Winning combinations:
  // Rows: [0,1,2], [3,4,5], [6,7,8]
  // Columns: [0,3,6], [1,4,7], [2,5,8]
  // Diagonals: [0,4,8], [2,4,6]
  
  // Attempts to place move at index (0-8)
  // Returns true if valid move was made, false if invalid or game already over
  makeMove(index) {
    if (this.gameOver || index < 0 || index > 8 || this.board[index] !== null) {
      return false;
    }
    this.board[index] = this.currentPlayer;
    this._evaluateGame();
    if (!this.gameOver) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }
    return true;
  }

  _evaluateGame() {
    const winningCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (const combo of winningCombos) {
      const [a, b, c] = combo;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        this.winner = this.board[a];
        this.winningLine = combo;
        this.gameOver = true;
        return;
      }
    }
    if (this.board.every(cell => cell !== null)) {
      this.isDraw = true;
      this.gameOver = true;
    }
  }

  getState() {
    return {
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      winningLine: this.winningLine ? [...this.winningLine] : null,
      isDraw: this.isDraw,
      gameOver: this.gameOver
    };
  }
}

// Make accessible to both browser window and potential node environments
if (typeof window !== 'undefined') {
  window.TicTacToeGame = TicTacToeGame;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TicTacToeGame;
}
```

---

### 3.4 UI Controller Contract (`app.js` — Owned by `SCRUM-86`)

`app.js` runs on DOMContentLoaded and wires DOM elements with `TicTacToeGame`:

1. **State**:
   - `game = new TicTacToeGame();`
   - `scores = { X: 0, O: 0, draws: 0 };`
2. **DOM Selectors**:
   - `#status-banner`: Updates text ("Player X's Turn", "Player O's Turn", "Player X Wins!", "Player O Wins!", "It's a Draw!").
   - `#score-x`, `#score-o`, `#score-draws`: Render current session scores.
   - `.cell`: Render 'X' or 'O' text and class, add `.winning-cell` for indices in `game.getState().winningLine`.
   - `#reset-btn`: Calls `game.reset()` and updates UI without resetting score.
   - `#reset-score-btn`: Resets `scores = { X: 0, O: 0, draws: 0 }`, calls `game.reset()`, and re-renders UI.
3. **Event Listeners**:
   - Board click listener (or individual `.cell` click listeners) reading `event.target.dataset.index`.
   - Click listener for `#reset-btn`.
   - Click listener for `#reset-score-btn`.

---

### 3.5 Dockerfile Specification (`Dockerfile` — Owned by `SCRUM-84`)

A lightweight Nginx Alpine container serving the static files on port 8080:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
RUN sed -i 's/listen       80;/listen       8080;/g' /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. Task-to-File Mapping & Parallel Waves

| Task Key | Task Title | Target Files Owned | Wave |
|---|---|---|---|
| **SCRUM-84** | Task 1: Build Semantic HTML Structure and CSS Styling for Game Board | `index.html`, `styles.css`, `Dockerfile` | **Wave 1 (Parallel)** |
| **SCRUM-85** | Task 2: Implement Core 2-Player Game State and Win/Draw Engine | `game.js` | **Wave 1 (Parallel)** |
| **SCRUM-86** | Task 3: Implement UI Event Handlers, Game Controls, and Scoreboard | `app.js` | **Wave 1 (Parallel)** |

Since file ownership is 100% disjoint and interfaces are clearly pinned above, developers can execute all tasks concurrently in **Wave 1** without merge conflicts!
