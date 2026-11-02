# DESIGN.md — Sprint 1.0 Architecture & Technical Blueprint

## 1. System Architecture & Cloud Run Container
- **App Type**: Tiered / Single-Container Node.js 20 Express application on Port 8080.
- **Port & Serving**: `server.js` listens on `0.0.0.0:8080`, serves static files from `public/`, and exposes high scores / leaderboard REST API endpoints.
- **Subpath Safe Rules**: Load balancer routes `https://.../demo/index.html` -> container `/index.html`.
  - In `index.html`: Relative assets (`href="css/style.css"`, `src="js/..."`). No leading slashes!
  - In JS fetch calls: Relative API paths (`fetch('api/leaderboard')`, `fetch('api/hills')`). Never `/api/...`!

## 2. Modular File Tree & Ownership
```text
├── Dockerfile                  # Node:20-alpine container exposing port 8080
├── package.json                # Express server dependencies
├── server.js                   # Express server with /api/leaderboard, /api/hills
├── cloudbuild.yaml             # CI/CD deployment configuration (preserved)
├── README.md                   # Project overview & instructions (preserved)
└── public/
    ├── index.html              # Shell, CRT filter, HUD overlays, canvas, modals (SCRUM-172)
    ├── css/
    │   └── style.css           # Retro pixel/CRT scanline aesthetic & winter styling (SCRUM-172)
    ├── js/
    │   ├── hills.js            # Hill data (Zakopane K-120, Planica K-185, Wisla K-105) (SCRUM-172)
    │   ├── physics.js          # Inrun, takeoff kinematics, 2D aerodynamics, wind, landing (SCRUM-173)
    │   ├── renderer.js         # HTML5 Canvas rendering of profile, skier posture, weather (SCRUM-173)
    │   ├── audio.js            # Procedural Web Audio API sound effects (wind, whoosh, cheer) (SCRUM-174)
    │   ├── tournament.js       # Round manager, 5-judge style scoring, distance points, table (SCRUM-174)
    │   └── game.js             # State orchestrator, input handling (space/click/keys), loop (SCRUM-174)
```

## 3. Interfaces, DOM Elements & JS Contracts

### DOM Elements (`index.html`):
- Canvas: `<canvas id="game-canvas" width="960" height="540"></canvas>`
- HUD Overlays:
  - Wind indicator: `#wind-arrow`, `#wind-speed` (e.g. `+1.8 m/s`)
  - Speedometer: `#inrun-speed` (e.g. `92.4 km/h`)
  - Gate / Hill info: `#hill-name`, `#hill-k-point`, `#hill-hs-point`
  - Jumper status: `#jump-phase` (READY, INRUN, FLIGHT, LANDING, FINISHED)
  - Distance live counter: `#live-distance`
- Control Panel / Hill Selector:
  - Hill Select: `<select id="hill-select">`
  - Start Jump Button: `#btn-jump-action`, Reset Button: `#btn-reset`
- Scoreboard & Judge Modal:
  - `#score-modal`: `#judge-scores` (5 judges, drop high/low), `#distance-score`, `#total-points`
  - Leaderboard Table: `#leaderboard-table` (rank, jumper, hill, distance, total)

### JS Modules & Global Contracts:
- `window.HillData`: `{ [hillId: string]: { name, kPoint, hsPoint, inrunAngle, tableAngle, inrunLength, landingCurve, record } }`
- `window.SkiPhysics`:
  - `initJump(hillId, windVector)`
  - `update(dt, inputState)` -> returns `{ x, y, vx, vy, angle, phase, distance, speed, isCrash, isTelemark }`
  - Phases: `'GATE'`, `'INRUN'`, `'FLIGHT'`, `'LANDING'`, `'STOPPED'`
- `window.SkiRenderer`:
  - `init(canvasElement)`
  - `draw(hill, physicsState, weather)`: renders procedural snow terrain, tower, spectators, jumper sprite posture, trails
- `window.SkiAudio`:
  - `playInrunWhoosh(speed)`
  - `playTakeoff()`
  - `playLanding(telemark, crash)`
  - `playCrowdCheer(points)`
- `window.SkiTournament`:
  - `calculatePoints(hill, distance, isTelemark, isCrash, wind)` -> `{ distancePoints, judgePoints, windComp, totalPoints, judges: [5] }`
  - `addScore(entry)`, `getLeaderboard()`
- `window.SkiGame`:
  - Main loop `requestAnimationFrame`, inputs: `SPACE`/`LEFT_CLICK` (Takeoff / Landing), `UP`/`DOWN` / Mouse movement (aerodynamic angle of attack / lean)

## 4. API Routes (`server.js`):
- `GET api/hills` -> `[{ id, name, kPoint, hsPoint, record }]`
- `GET api/leaderboard` -> `[{ id, playerName, hillId, distance, totalPoints, date }]`
- `POST api/leaderboard` -> saves entry in-memory / JSON, returns updated top 10

## 5. Subpath Safety & Robustness Checklist
- [x] Relative paths only: `index.html` uses `css/style.css` and `js/...`
- [x] Fetch calls use `api/leaderboard` (no leading slash)
- [x] Canvas and graphics: 100% canvas & procedural styling (no external asset URLs)
- [x] Audio: 100% Web Audio API procedural synthesis (oscillator/noise buffers)
- [x] Defensive DOM lookups with `DOMContentLoaded` and null guards

## 6. Task-to-File Mapping & Parallel Waves
| Task ID | Developer Focus | Target Files | Wave |
|---|---|---|---|
| `SCRUM-172` | UI Shell, Hill Selector, CRT & HUD Styling | `public/index.html`, `public/css/style.css`, `public/js/hills.js`, `package.json`, `server.js`, `Dockerfile` | Wave 1 |
| `SCRUM-173` | Physics Engine & 2D Canvas Renderer | `public/js/physics.js`, `public/js/renderer.js` | Wave 1 |
| `SCRUM-174` | Audio, Scoring Engine & Game Orchestrator | `public/js/audio.js`, `public/js/tournament.js`, `public/js/game.js` | Wave 2 |
