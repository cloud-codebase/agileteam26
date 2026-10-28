# System Architecture Blueprint — RetoSnake4k (Sprint 1.0)

## 1. Branch & Single-Container Architecture
- **Git Branch**: `feat-retosnake4k`
- **Architecture**: Option B (Static Nginx SPA Container listening on port 8080)
- **Container**: `nginx:alpine` configured on `0.0.0.0:8080`, serving static assets from root or `/usr/share/nginx/html`.
- **Subpath Safe**: App is accessed via `/demo/index.html`. ALL asset links must be strictly relative (`href="styles.css"`, `src="audio.js"`).

## 2. Modular File Tree
```
├── .git/
├── cloudbuild.yaml          # Kept intact from main
├── README.md                # Project documentation
├── DESIGN.md                # Architectural contract (this document)
├── Dockerfile               # Nginx alpine container on port 8080
├── nginx.conf               # Nginx config listening on 8080 with subpath support
├── index.html               # Cyber-deck layout, HUD, overlays, modal (Task SCRUM-131)
├── styles.css               # Neon CRT scanlines, flicker, responsive cyber styling (Task SCRUM-131)
├── game.js                  # Core Snake engine, grid state, canvas rendering, loop (Task SCRUM-132)
├── audio.js                 # Web Audio API synthesizers & sound manager (Task SCRUM-133)
└── powerups.js              # Power-up spawns/effects & persistent leaderboard (Task SCRUM-133)
```

## 3. Script Load Order & Global Interface Contracts
Scripts in `index.html` load in sequence:
1. `audio.js` -> defines `window.CyberAudio`
2. `powerups.js` -> defines `window.PowerUpManager` and `window.LeaderboardManager`
3. `game.js` -> defines `window.CyberSnake` & initializes canvas game loop on `DOMContentLoaded`

### Interface Contracts
- **`window.CyberAudio`**:
  - `init()`: Inits `AudioContext` on first user interaction.
  - `playTone(type)`: `'eat'`, `'powerup'`, `'glitch'`, `'death'`, `'click'`.
  - `startArp()` / `stopArp()`: Cyber arpeggio background drone toggle.
  - `toggleMute()`: returns `boolean` (isMuted).
- **`window.PowerUpManager`**:
  - `activePowerUps`: Array of active powerup state objects `{ type, duration, remaining }`.
  - `types`: `{ OVERCLOCK: 'overclock', CHRONO: 'chrono', GHOST: 'ghost', MULTIPLIER: 'multiplier' }`.
  - `spawn(gridWidth, gridHeight, snakeBody, currentFood)`: Returns `{ x, y, type, expiresAt }` or `null`.
  - `applyEffect(type, gameState)`: Modifies game parameters (speed, phase through walls).
  - `update(deltaTime, gameState)`: Ticks active powerup durations and cleans expired effects.
  - `render(ctx, tileSize)`: Renders neon glowing pulsating glyphs on canvas.
- **`window.LeaderboardManager`**:
  - `getScores()`: Returns array of `{ name, score, date, wave }` seeded with 5 default cyber records.
  - `saveScore(name, score)`: Saves new score to `localStorage['retosnake4k_scores']`.
- **`window.CyberSnake`**:
  - `state`: `'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'`
  - `score`, `highScore`, `multiplier`, `speed`
  - `resetGame()`, `startGame()`, `togglePause()`

### DOM Elements & IDs
- `#game-canvas` (800x600 logical or responsive canvas)
- `#score-display`, `#high-score-display`, `#multiplier-display`
- `#powerup-bar`, `#powerup-label`, `#powerup-timer`
- `#btn-start`, `#btn-pause`, `#btn-restart`, `#btn-audio-toggle`
- `#crt-toggle`, `#leaderboard-btn`, `#leaderboard-modal`, `#leaderboard-list`
- `#touch-controls` (`#dpad-up`, `#dpad-down`, `#dpad-left`, `#dpad-right`)
- `#game-over-modal`, `#final-score`, `#player-name-input`, `#save-score-btn`

## 4. Code Quality & Cloud Run Subpath Principles
- **Relative Asset Paths**: No leading slash (`styles.css`, `game.js`, `audio.js`, `powerups.js`).
- **Defensive DOM**: All element references guarded with `document.getElementById(...)` checks.
- **Zero External Images**: All sprites, scanlines, grids, food nodes, and power-up icons drawn with HTML5 Canvas API and inline SVG/CSS gradients.

## 5. Task-to-File Mapping & Execution Waves
| Jira Task | Task Summary | Target Files | Wave |
|---|---|---|---|
| **SCRUM-131** | Cyberpunk UI Layout, Neon HUD & CRT Retro Styling | `index.html`, `styles.css`, `Dockerfile`, `nginx.conf` | Wave 1 (Parallel) |
| **SCRUM-133** | Cyber Power-Ups, Procedural Web Audio SFX & High Scores | `audio.js`, `powerups.js` | Wave 1 (Parallel) |
| **SCRUM-132** | Core Snake Engine, Grid Physics & Canvas Neon Rendering | `game.js` | Wave 2 (Integration) |
