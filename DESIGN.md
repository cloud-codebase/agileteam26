# Retro Snake Game - Technical Architecture Blueprint

## 1. Tech Stack & Environment
- **Platform**: Vanilla HTML5, CSS3, ES6 JavaScript.
- **Server / Container**: Alpine Nginx listening on port `8080`.
- **Branch**: `feat-snake20`

## 2. Repository File Structure
```
├── index.html       # Semantic HTML5 layout, HUD, canvas, modal, D-pad (SCRUM-96)
├── styles.css       # Retro CRT scanlines, neon palette, responsive layout (SCRUM-96)
├── Dockerfile       # Nginx Alpine container serving on port 8080 (SCRUM-96)
├── nginx.conf       # Custom Nginx config listening on port 8080 (SCRUM-96)
├── game.js          # SnakeGame engine: grid physics, food, collision (SCRUM-97)
├── app.js           # AudioManager, UI controller, touch/keyboard wiring (SCRUM-98)
├── cloudbuild.yaml  # CI/CD deployment configuration (pre-existing)
└── README.md        # Project documentation
```

## 3. DOM & Interface Contracts

### 3.1 DOM Element IDs & Classes
- `#canvas-container`: Arcade cabinet wrapper with scanline effect.
- `#game-canvas`: HTML5 Canvas element (`width="400"`, `height="400"`).
- `#score-display`: Span displaying current player score.
- `#high-score-display`: Span displaying all-time high score.
- `#start-btn`: Button to start or toggle pause/resume.
- `#reset-btn`: Button to reset game to initial state.
- `#game-over-modal`: Modal overlay displayed on collision (`.hidden` class toggled).
- `#final-score`: Span showing final achieved score in modal.
- `#modal-restart-btn`: Button inside modal to play again.
- `#dpad`: Virtual D-pad container (`#dpad-up`, `#dpad-down`, `#dpad-left`, `#dpad-right`).
- Utility classes: `.hidden` (`display: none !important`), `.crt-screen`, `.neon-glow`.

### 3.2 JavaScript API Interface Contracts

#### `SnakeGame` (`game.js` -> exposed as `window.SnakeGame`)
- `constructor(canvasElement, options)`:
  - `options`: `{ gridSize: 20, onScore(score), onGameOver(score), onFoodEat() }`
- `start()`: Starts or resumes game loop.
- `pause()`: Halts game loop ticks.
- `reset()`: Resets snake to center, score to 0, regenerates food.
- `setDirection(dir)`: Accepts `'UP' | 'DOWN' | 'LEFT' | 'RIGHT'`. Ignores reverse direction.
- `getState()`: Returns `{ score, isRunning, isPaused, isGameOver, speed }`.

#### `AudioManager` (`app.js` -> exposed as `window.AudioManager`)
- Synthetic retro sound effects via Web Audio API:
  - `playEat()`: High-pitch ascending beep.
  - `playDie()`: Low-pitch descending crash noise.
  - `playMove()`: Subtle soft click.

#### `App Controller` (`app.js`)
- Initializes `SnakeGame` on `#game-canvas`.
- Synchronizes `#score-display` and `#high-score-display` (`localStorage` key: `snake_high_score`).
- Listens to Arrow keys / WASD and `#dpad` click/touch events.
- Controls `#game-over-modal` visibility and restart action.

## 4. Task-to-File Mapping & Execution Waves

| Jira Task | Title | Target Files | Wave |
|---|---|---|---|
| **SCRUM-96** | HTML/CSS Structure & Retro Arcade UI Layout | `index.html`, `styles.css`, `Dockerfile`, `nginx.conf` | Wave 1 (Parallel) |
| **SCRUM-97** | Core Game Loop, Movement & Collision Mechanics | `game.js` | Wave 1 (Parallel) |
| **SCRUM-98** | Scoreboard, Audio FX, State Overlays & Touch Controls | `app.js` | Wave 2 |
