# Two-Player Web-Based Tic-Tac-Toe Game

A modern, responsive, lightweight, and accessible two-player web-based Tic-Tac-Toe game built with semantic HTML5, modern CSS3 (Grid & Flexbox), and vanilla ES6+ JavaScript.

## Features

- **Responsive Game Board**: Centered 3x3 interactive grid styled with CSS Grid and accessible across desktop, tablet, and mobile viewports.
- **Turn Management & Move Validation**:
  - Alternating 'X' and 'O' moves, starting with Player X.
  - Strict move validation preventing accidental overrides on occupied cells.
  - Dynamic turn indicator with ARIA live announcements.
- **Win & Draw Detection Engine**:
  - Real-time evaluation of all 8 winning combinations (3 horizontal rows, 3 vertical columns, and 2 diagonals).
  - Clear win announcement banner and visual cell highlights with pulse animations.
  - Accurate tie/draw detection when all 9 cells are filled with no winner.
  - Automatic board locking upon game completion to prevent further moves.
- **Score Tracking & Game Reset**:
  - Session scoreboard tracking Player X wins, Player O wins, and Draws.
  - **Restart Game**: Clears board and begins a new round while preserving session scores.
  - **Reset Score**: Resets all score counters back to zero and starts a fresh game.
- **Containerized Deployment**:
  - Minimal `nginx:alpine` container configuration serving static assets on port `8080`.

## Quick Start

### Running Locally
Simply open `index.html` in any modern web browser.

### Running with Docker

1. **Build the Docker image**:
```bash
docker build -t tic-tac-toe:latest .
```

2. **Run the Docker container**:
```bash
docker run -d -p 8080:8080 --name tic-tac-toe-container tic-tac-toe:latest
```

3. **Access the application**:
Open your web browser and navigate to:
```
http://localhost:8080
```

### Running Automated Tests
Execute the unit and end-to-end integration test suite using Node.js:
```bash
node test.js
```
