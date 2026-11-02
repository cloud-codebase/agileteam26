# Technical Design: Kid-Friendly Tic-Tac-Toe (Animal Faces & AI Opponent)

## 1. Branch & Single-Container Architecture
- **Branch**: `feat-tictactoe`
- **Architecture**: Static SPA Container (`nginx:alpine`) on port `8080`.
- **Subpath Handling**: Deployed behind `/demo/` subpath. Relative asset paths only (`href="styles.css"`, `src="game.js"`).

## 2. Modular File Tree
```
├── Dockerfile                  # [Existing] nginx:alpine serving /usr/share/nginx/html on port 8080
├── README.md                   # [Existing] Game overview & local testing instructions
├── cloudbuild.yaml             # [Existing] CI/CD deployment pipeline (Must NOT delete)
├── DESIGN.md                   # [Existing - Updated] Architecture specification & contracts
├── index.html                  # [Existing - SCRUM-164] Animal indicators, Mode toggle (AI vs 2-Player), updated board/scores
├── styles.css                  # [Existing - SCRUM-165] Animal avatar styles, mode toggle pills, bouncy animations
└── game.js                     # [Existing - SCRUM-166] Animal token mapping (🐶 Puppy vs 🐱 Kitten), AI opponent engine
```

## 3. DOM IDs, CSS Classes & JS Interface Contracts

### DOM Elements (`index.html` - SCRUM-164)
- `#game-title`: Title header ("Animal Tic-Tac-Toe! 🐾").
- `#mode-controls`: Segmented toggle container for Game Mode (`role="radiogroup"` or button toggle).
  - `#btn-mode-ai`: Button / tab "Play vs Computer 🤖" (Active by default).
  - `#btn-mode-pvp`: Button / tab "2 Players 👥".
- `#status-banner`: Live status banner announcing turn (e.g. "Puppy's Turn 🐶", "Computer is thinking... 💭", "Winner!").
- `#score-p1`: Player 1 score card label `#label-p1` ("Puppy 🐶") & counter `#score-x`.
- `#score-ties`: Tie score card label ("Ties 🎈") & counter `#score-ties`.
- `#score-p2`: Player 2 score card label `#label-p2` ("Computer 🤖" in AI mode, "Kitten 🐱" in 2P mode) & counter `#score-o`.
- `#game-board`: 3x3 grid containing `.cell[data-index="0"`..`"8"]`.
- `#btn-reset`: "Play Again 🔄" button.
- `#btn-reset-scores`: "Clear Scores 🧹" button.
- `#confetti-canvas`: Victory celebration canvas.

### CSS Theme & Visual Contracts (`styles.css` - SCRUM-165)
- Mode toggle styling: `#mode-controls`, `.mode-btn`, `.mode-btn.active` with playful pill design and bounce transition.
- Animal tokens: `.cell.token-puppy` (🐶 styling, soft orange/amber glow), `.cell.token-kitten` (🐱 styling, mint/teal glow).
- Support legacy classes `.cell.x`, `.cell.o` for backwards compatibility.
- Dynamic thinking state: `#status-banner.thinking` (gentle pulse animation).
- Victory highlights: `.cell.win-cell` (golden pulse and bounce).

### JavaScript Interfaces & Logic (`game.js` - SCRUM-166)
- **Animal Tokens**:
  - `PLAYER_1`: `{ symbol: 'X', emoji: '🐶', name: 'Puppy', cssClass: 'token-puppy' }`
  - `PLAYER_2`: `{ symbol: 'O', emoji: '🐱', name: 'Kitten', cssClass: 'token-kitten' }`
- **Game Modes**: `'ai'` (Default, computer plays O) and `'pvp'` (2-player pass-and-play).
- **Computer AI Logic**:
  - `makeComputerMove()`: Intelligent yet kid-friendly (1. Win if winning move exists, 2. Block opponent win, 3. Take center, 4. Take random open cell).
  - Adds 400-600ms natural delay + `#status-banner` "Computer is thinking... 💭" to feel engaging for children.
- **Exposed Namespace `window.TicTacToe`**:
  - `GameState`: `{ board, currentPlayer, gameMode, scores: { X, O, ties }, isGameOver, isThinking }`
  - `setGameMode(mode)`: Switches mode (`'ai'` | `'pvp'`), updates labels, resets board.
  - `handleCellClick(index)`: Human move handler; triggers AI move if in `'ai'` mode and game continues.
  - `makeComputerMove()`: AI turn execution.
  - `resetBoard()`, `resetScores()`, `playTone(type)`, `triggerConfetti()`.

## 4. Code Quality & Cloud Run Subpath Principles
- **Relative Paths**: Retain `href="styles.css"` and `src="game.js"`. Never use leading slashes.
- **Defensive Guarding**: Check elements before binding, check `isThinking` flag to prevent click spam during AI turns.
- **Zero External Assets**: Animal emojis (🐶, 🐱, 🤖) and Web Audio API synthesis ensure zero network dependencies.

## 5. Task-to-File Mapping & Parallel Waves (Sprint 2.0)

| Task Key | Summary | Target Files | Wave |
|---|---|---|---|
| `SCRUM-164` | HTML Structure & UI Controls for Animal Characters and AI Mode | `index.html` (modify) | Wave 1 (Parallel) |
| `SCRUM-165` | Playful CSS Styling and Animations for Animal Avatars and Game Modes | `styles.css` (modify) | Wave 1 (Parallel) |
| `SCRUM-166` | Game Logic & AI Opponent Engine with Animal Token System | `game.js` (modify) | Wave 1 (Parallel) |
