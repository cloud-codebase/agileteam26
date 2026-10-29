# SkiJumps2 (Deluxe Ski Jump / Adam Małysz Style) - Technical Blueprint

## 1. Single-Container Cloud Run Architecture
- **Runtime**: Node.js 20 (`node:20-alpine`), listening on `0.0.0.0:8080`.
- **Static Hosting**: Express serves static files from `public/` directory via `app.use(express.static('public'))`.
- **Subpath Safety Rule**: App is served behind `/demo/` load balancer rewrite. All asset paths in `index.html` (`styles.css`, `js/...`) and `fetch()` requests in frontend JS MUST be relative without leading slash (`fetch('api/hills')`, **never** `fetch('/api/hills')`).
- **Container**: `Dockerfile` exposes `8080` running `npm start` (`node server.js`).

## 2. Modular File Tree
```
├── Dockerfile                  # Owned by SCRUM-139 (Node.js 20 alpine, port 8080)
├── package.json                # Owned by SCRUM-139 (Express, CORS, dependencies)
├── server.js                   # Owned by SCRUM-139 (REST API + static server)
├── public/
│   ├── index.html              # Owned by SCRUM-141 (Semantic HUD, Canvas mount, modals)
│   ├── styles.css              # Owned by SCRUM-141 (Retro broadcast theme, animations, radar)
│   └── js/
│       ├── physics.js          # Owned by SCRUM-140 (In-run, takeoff, flight, telemark, crash)
│       ├── renderer.js         # Owned by SCRUM-140 (Canvas 2D camera, hill curve, skier, snow)
│       ├── audio.js            # Owned by SCRUM-141 (Web Audio API synthesizers & sound effects)
│       └── app.js              # Owned by SCRUM-141 (Game loop orchestration, UI, API fetch, tournament)
├── DESIGN.md                   # Tech Lead architecture blueprint
├── cloudbuild.yaml             # Deployment configuration (DO NOT MODIFY)
└── README.md                   # Documentation
```

## 3. Interfaces & Contracts

### REST API Endpoints (`server.js`)
- `GET api/health` -> `{ status: "ok", timestamp: number }`
- `GET api/hills` -> `[ { id: "zakopane", name: "Zakopane - Wielka Krokiew", kPoint: 120, hs: 134, inrunAngle: 35, record: 140.5, recordHolder: "Adam Małysz" }, ... ]`
- `GET api/jumpers` -> `[ { id: "malysz", name: "Adam Małysz", country: "POL", skill: 98, mustache: true }, { id: "hannawald", name: "Sven Hannawald", country: "GER", skill: 96 }, ... ]`
- `GET api/leaderboard` -> `[ { id: string, jumperName: string, hillId: string, distance: number, stylePoints: number, totalPoints: number, timestamp: number } ]`
- `POST api/leaderboard` -> body `{ jumperName: string, hillId: string, distance: number, stylePoints: number, totalPoints: number }` -> returns created entry.

### Physics Engine Interface (`physics.js` -> `window.SkiPhysics`)
- `initJump(hillConfig)`: Resets state (`state: 'GATE' | 'INRUN' | 'TAKEOFF' | 'FLIGHT' | 'LANDING' | 'FALL' | 'STOPPED'`).
- `update(dt, inputState, wind)`: Updates position `(x, y)`, velocity `(vx, vy)`, rotation angle, lift, drag.
- `triggerTakeoff()`: Calculates takeoff impulse based on precision window at takeoff edge.
- `triggerLanding(telemarkRequested)`: Calculates landing quality, judges style score (3-20 pts each, drop min/max), or crash ragdoll state.
- `getState()`: Returns `{ phase, x, y, vx, vy, angle, distanceMeters, isCrashed, telemarkSuccess, points }`.

### Canvas Renderer Interface (`renderer.js` -> `window.SkiRenderer`)
- `init(canvasElement)`: Sets up 2D canvas, viewport scaling, high-DPI support.
- `render(gameState, hillConfig, windVector)`: Renders sky, snow mountain backdrop, in-run tower, profile curve, K/HS markers, skier sprite with posture, crowd, and active windsock.
- `resetCamera()`: Resets smooth camera tracking to gate.

### Audio Interface (`audio.js` -> `window.SkiAudio`)
- `init()`: Inits `AudioContext` on user interaction.
- `play(soundName)`: Sounds: `'gate'`, `'inrun'`, `'takeoff'`, `'wind'`, `'telemark'`, `'crash'`, `'trumpet'`, `'cheer'`. Polish fan trumpet fanfare synthesized via Web Audio oscillators.

### UI & DOM Contract (`index.html` & `app.js`)
- Essential IDs: `#game-canvas`, `#btn-jump`, `#speed-display`, `#distance-display`, `#wind-speed`, `#wind-arrow`, `#score-board`, `#hill-select`, `#jumper-select`, `#mode-select`, `#modal-podium`, `#leaderboard-list`.
- Script load order in `index.html`:
  `<script src="js/physics.js"></script>`
  `<script src="js/renderer.js"></script>`
  `<script src="js/audio.js"></script>`
  `<script src="js/app.js"></script>`

## 4. Task Ownership & Parallel Waves

| Task ID | Component & Files Owned | Wave | Developer |
|---------|-------------------------|------|-----------|
| **SCRUM-139** | Backend REST API & Container (`server.js`, `package.json`, `Dockerfile`) | Wave 1 | Backend Developer |
| **SCRUM-140** | Physics Engine & 2D Canvas (`public/js/physics.js`, `public/js/renderer.js`) | Wave 1 | Game/Canvas Developer |
| **SCRUM-141** | Retro UI, Tournament, Audio & State (`public/index.html`, `public/styles.css`, `public/js/audio.js`, `public/js/app.js`) | Wave 2 | Frontend Developer |
