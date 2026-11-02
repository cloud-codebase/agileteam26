# DESIGN.md - Architecture Specification & Task Contracts

## 1. Branch & Cloud Run Architecture
- **Git Branch**: `feat-invaders`
- **Container Target**: Single-container Dockerfile listening on port `8080` (Option B: `nginx:alpine` serving static web app from `/usr/share/nginx/html`).
- **Load Balancer Subpath Rule**: Hosted at `/demo/index.html`. ALL asset references (`<link>`, `<script>`) MUST use relative paths without leading slash (`styles.css`, `audio.js`, `player.js`, `invaders.js`, `game.js`).
- **Visuals**: 100% self-contained HTML5 Canvas 2D pixel rendering and CSS CRT scanline/flicker effects. Zero external image dependencies.

## 2. Modular File Tree
```
├── cloudbuild.yaml        (Preserved)
├── README.md              (Preserved)
├── Dockerfile             (Port 8080 Nginx container)
├── nginx.conf             (Nginx listening on port 8080)
├── index.html             (Canvas, HUD, overlays, CRT scanlines, touch buttons)
├── styles.css             (Arcade cabinet aesthetic, scanlines, glow, responsive canvas)
├── audio.js               (Web Audio API synthesizer: shoots, march beats, explosions, UFO)
├── player.js              (Player ship, player lasers, destructible bunker blocks & particles)
├── invaders.js            (Alien grid, marching logic, alien bombs, mystery saucer UFO)
└── game.js                (Main game loop, state machine, collision detector, high scores)
```

## 3. Interfaces & State Contracts
### DOM IDs & Canvas Dimensions
- Internal Canvas Resolution: `800x600` (`<canvas id="game-canvas" width="800" height="600">`)
- HUD Elements: `#score-display`, `#high-score-display`, `#lives-display`, `#wave-display`
- Overlays: `#start-modal`, `#game-over-modal`, `#pause-modal`, `#start-btn`, `#restart-btn`, `#resume-btn`
- Touch Controls: `#btn-left`, `#btn-right`, `#btn-fire`
- Script Load Order: `audio.js` -> `player.js` -> `invaders.js` -> `game.js`

### Global Game Object & Shared Namespaces
- `window.AudioEngine`:
  - `playShoot()`, `playInvaderKilled()`, `playPlayerExplosion()`, `playMarchBeat(step: 0..3)`, `playUfoSound()`, `stopUfoSound()`
- `window.PlayerManager`:
  - `init(canvasWidth, canvasHeight)` -> resets player state & bunkers
  - `update(inputState, dt)` -> moves player, updates player bullets
  - `render(ctx)` -> draws player ship, active bullets, bunker blocks
  - `getBullets()`, `takeDamage()`, `resetPosition()`, `getBunkers()`
  - `damageBunker(bunkerIdx, blockIdx)` / `checkBunkerHit(bullet)`
- `window.InvaderManager`:
  - `init(waveNumber, canvasWidth, canvasHeight)` -> spawns grid (5 rows x 11 cols) & saucer timer
  - `update(dt, playerX)` -> marching steps, drops alien bombs, moves saucer
  - `render(ctx)` -> draws aliens (pixel art), mystery saucer, alien bombs
  - `getAliens()`, `getBombs()`, `getSaucer()`
  - `killAlien(alien)`, `killSaucer()`
- `window.GameEngine`:
  - State Machine: `'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'WAVECLEAR'`
  - Input listeners for ArrowLeft/ArrowRight/KeyA/KeyD, Space, KeyP
  - LocalStorage high score key: `invaders_high_score`

## 4. Task-to-File Ownership & Execution Waves

| Task Key | Description | Target Files | Wave |
|---|---|---|---|
| **SCRUM-168** | Arcade Layout, CRT Styling, Canvas HUD & Dockerfile | `Dockerfile`, `nginx.conf`, `index.html`, `styles.css` | **Wave 1** (Parallel) |
| **SCRUM-169** | Player Ship, Controls, Bunkers & Web Audio Synthesizer | `audio.js`, `player.js` | **Wave 1** (Parallel) |
| **SCRUM-170** | Invader Armada, UFO, Collisions, Wave Logic & Game Loop | `invaders.js`, `game.js` | **Wave 2** (Depends on 168/169 interfaces) |
