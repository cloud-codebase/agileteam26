# Retro Drift Race - Technical Design & Architecture Blueprint (Sprint 1.0)

## 1. Branch & Deployment Architecture
- **Git Branch**: `feat-retrodriftrace`
- **Runtime**: Single Node.js 20 Alpine container listening on `0.0.0.0:8080` (`node server.js`).
- **Cloud Run Subpath Safe**: Subpath rewrites `/demo/` -> `/`. All asset paths in `index.html` use relative paths without leading slash (`styles.css`, `js/...`). Client `fetch()` calls use relative paths (`api/scores` or `./api/scores`).

## 2. Modular File Tree
```
├── Dockerfile                  # Port 8080 Node 20 runner (SCRUM-200)
├── package.json                # Express & dev config (SCRUM-200)
├── server.js                   # Express static + /api/scores REST routes (SCRUM-200)
├── cloudbuild.yaml             # Pre-existing CI/CD (preserved)
├── README.md                   # Pre-existing docs (preserved)
├── DESIGN.md                   # Technical blueprint
└── public/
    ├── index.html              # Retro arcade UI, HUD, canvas (SCRUM-200)
    ├── styles.css              # Synthwave/cyberpunk neon arcade theme (SCRUM-200)
    └── js/
        ├── physics.js          # Vehicle kinematics, drift slip angle & inputs (SCRUM-201)
        ├── track.js            # Track layout, camera follow, skidmarks, particles (SCRUM-202)
        ├── audio.js            # Web Audio API procedural sound FX (SCRUM-203)
        └── game.js             # Scoring engine, game loop, HUD integration (SCRUM-203)
```

## 3. DOM IDs & Script Load Order
- **Script Order**: `js/physics.js` -> `js/track.js` -> `js/audio.js` -> `js/game.js`
- **Canvas**: `#game-canvas` (responsive 16:9 1280x720 internal rendering)
- **HUD IDs**:
  - `#speed-val`, `#gear-val`, `#drift-angle-val`, `#drift-meter-bar`
  - `#current-score`, `#combo-multiplier`, `#banked-score`, `#drift-badge`
  - `#lap-timer`, `#best-drift`, `#high-score-board`
  - `#btn-start`, `#btn-restart`, `#btn-mute`, `#overlay-screen`

## 4. API Endpoints & Interfaces
- **GET /api/scores**: Returns JSON array of top scores `[{ name: string, score: number, maxDrift: number, date: string }]`
- **POST /api/scores**: Accepts JSON `{ name, score, maxDrift }`, returns updated leaderboard.
- **Global Interfaces**:
  - `window.VehiclePhysics`: `init()`, `update(dt, inputState)`, `getState() => { x, y, angle, speed, vx, vy, slipAngle, isDrifting, handbrake }`
  - `window.TrackRenderer`: `init(canvas, ctx)`, `update(dt, vehicleState)`, `render(ctx, camera)`, `checkCollision(x, y)`
  - `window.RetroAudio`: `init()`, `playEngine(speedRatio)`, `playDriftScreech(intensity)`, `playScoreBank()`, `playCrash()`, `toggleMute()`
  - `window.GameEngine`: Central orchestration, scoring accumulator, combo timers, high score storage.

## 5. Task-to-File Ownership & Execution Waves

| Task Key | Description | Target Files | Wave |
|---|---|---|---|
| **SCRUM-200** | Project Setup, Retro Arcade UI/HUD & Express Web Server | `package.json`, `server.js`, `Dockerfile`, `public/index.html`, `public/styles.css` | Wave 1 |
| **SCRUM-201** | Vehicle Handling, Slip Angle & Drift Physics Simulation | `public/js/physics.js` | Wave 1 |
| **SCRUM-202** | Circuit Track Rendering, Camera Follow & Drift Particle Effects | `public/js/track.js` | Wave 1 |
| **SCRUM-203** | Drift Scoring Engine, Multipliers, Web Audio FX & Game Loop | `public/js/audio.js`, `public/js/game.js` | Wave 2 |
