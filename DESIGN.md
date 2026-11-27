# System Architecture & Technical Design: Two-Player Fencing Duel Game

## 1. Branch & Single-Container Architecture
- **Branch**: `feat-webbasedfencinggame`
- **Deployment**: Single container Node.js Express (`node:20-alpine`) listening on `0.0.0.0:8080` via `Dockerfile`.
- **Subpath Safe**: App is served at `/demo/index.html`. All asset references in `index.html` use relative paths (`href="styles.css"`, `src="audio.js"`, etc.). All API/fetch endpoints use relative paths (`api/stats`, `api/health`).

## 2. Modular File Tree
```
├── Dockerfile                  # Node.js 20 alpine container on port 8080
├── package.json                # Express server dependencies & start scripts
├── server.js                   # Express server serving public/ & /api/health /api/match-stats
├── cloudbuild.yaml             # Preserved Google Cloud Build config
├── README.md                   # Project overview & instructions
└── public/
    ├── index.html              # Arena DOM layout, canvas viewport, scoreboard, controls legend
    ├── styles.css              # Cyber-classical fencing aesthetic, responsive canvas styling
    ├── audio.js                # Web Audio API sound generator (clash, parry, touché, buzzer, cheer)
    ├── fencer.js               # Fencer class: state machine, guard (zasłona) angles, animations
    └── game.js                 # Combat loop, collision detection, referee logic, scoring & reset
```

## 3. DOM & UI Component IDs (`public/index.html`)
- `#pisteCanvas`: 960x400 HTML5 Canvas rendering piste fencing strip, guard markers, and fencers.
- `#p1Score`, `#p2Score`: Numeric score badges (First to 5 touches wins match).
- `#matchClock`: Bout timer (3:00 minute fencing bout format).
- `#refereeBox`, `#refereeStatus`: Referee display ("En Garde!", "Prêts?", "Allez!", "Halte! Touché!").
- `#p1Indicator`, `#p2Indicator`: Green/Red touché scoring lights.
- `#btnStartMatch`, `#btnResetMatch`, `#btnToggleAudio`: Bout control buttons.
- `#controlsModal`, `#rulesModal`: Help overlays explaining guard angles & keyboard controls.

## 4. JS Interface Contracts
- **Input Controls**:
  - **Player 1**: `KeyA` (Left/retreat), `KeyD` (Right/advance), `KeyW` (High Zasłona/guard up), `KeyS` (Low Zasłona/guard down), `KeyE` (Push / thrust).
  - **Player 2**: `ArrowLeft` (Left/advance), `ArrowRight` (Right/retreat), `ArrowUp` (High Zasłona), `ArrowDown` (Low Zasłona), `Space` (Push / thrust).
- **`AudioFX` (`audio.js`)**:
  - `AudioFX.init()`, `AudioFX.playClash()`, `AudioFX.playParry()`, `AudioFX.playTouche()`, `AudioFX.playWhistle()`.
- **`Fencer` Class (`fencer.js`)**:
  - Constructor: `new Fencer({ id: 1|2, x, color, facing: 1|-1 })`
  - Methods: `update(keys, bounds)`, `draw(ctx)`, `thrust()`, `setGuard(type: 'high'|'low'|'neutral')`, `getBladeSegment()`, `getBodyHitbox()`.
  - Stance: `neutral` (blade middle), `zaslona_high` (deflects high thrust), `zaslona_low` (deflects low thrust).
- **`Game` Engine (`game.js`)**:
  - `Game.init()`, `Game.resetBout()`, `Game.checkCollisions()`, `Game.onHit(attacker, defender)`.
  - Combat rules: A thrusting blade hitting body scores 1 point unless intercepted by defender's blade in matching Zasłona guard pose (Parry Riposte).

## 5. REST API Endpoints (`server.js`)
- `GET api/health` -> `{ status: "ok", game: "Fencing Duel", uptime: number }`
- `GET api/match-stats` -> `{ boutsPlayed: number, p1Wins: number, p2Wins: number }`
- `POST api/match-stats` -> `{ winner: 1|2 }` (increments session stats)

## 6. Task-to-File Mapping & Parallel Waves
| Jira Task | Summary | Target Files | Wave |
|-----------|---------|--------------|------|
| **SCRUM-196** | Fencing Arena UI, Scoreboard, Piste Canvas & Audio FX | `public/index.html`, `public/styles.css`, `public/audio.js` | Wave 1 |
| **SCRUM-197** | Two-Player Input Controller, Zasłona & Fencer State Machine | `public/fencer.js` | Wave 1 |
| **SCRUM-198** | Combat Engine, Parry Resolution, Match Loop & Server | `public/game.js`, `server.js`, `package.json`, `Dockerfile` | Wave 2 |
