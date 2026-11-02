# Technical Architecture Blueprint: SkiJump2 (Sprint 1.0)

## 1. Branch & Single-Container Cloud Run Architecture
- **Branch**: `feat-skijump2`
- **Runtime**: Tiered Single-Container Node.js 20 (`node:20-alpine`) on Port `8080`.
- **Server**: Express (`server.js`) serves static assets from `public/` and REST API endpoints (`/api/...`).
- **Subpath Handling**: Accessed via load balancer at `/demo/index.html`. All frontend fetches use relative paths (`api/...` / `./api/...`, **NEVER** `/api/...`). All asset links in `index.html` use relative paths (`styles.css`, `js/...`).

## 2. Modular File Tree
```
├── Dockerfile                  # Node 20-alpine, exposes 8080, runs node server.js
├── package.json                # express, cors
├── server.js                   # REST API routes + static public/ hosting
├── public/
│   ├── index.html              # Retro DSJ2 canvas viewport, HUD, tournament overlays
│   ├── styles.css              # Retro Polish 2000s winter pixel theme, CRT scanlines
│   └── js/
│       ├── audio.js            # Synthesized Web Audio API sound generator (whoosh, crowd, landing, crash)
│       ├── physics.js          # In-run velocity, takeoff impulse, aero lift/drag pitch, wind, landing detection
│       ├── hills.js            # Hill profiles (Zakopane K-120, Wisła K-105, Planica K-185, Oberstdorf K-115)
│       ├── game.js             # Canvas rendering (skier, snow, terrain, trail, camera lerp, anim loop)
│       ├── tournament.js       # World cup state, AI competitors, 5-judge scoring, leaderboard fetch/save
│       └── app.js              # DOM bindings, inputs (mouse/touch/keys), subpath-safe API integration
├── README.md                   # Preserved
└── cloudbuild.yaml             # Preserved
```

## 3. API Endpoints & Data Contracts
- `GET api/hills`: Returns array of hills `{ id, name, country, kPoint, hsPoint, record: { distance, holder } }`.
- `GET api/leaderboard?hillId=:id`: Returns top scores `[ { id, playerName, country, hillId, distance, styleScore, totalPoints, timestamp } ]`.
- `POST api/leaderboard`: Body `{ playerName, country, hillId, distance, styleScore, totalPoints }` -> validates and stores in-memory / seed persistent list.
- `GET api/ai-competitors`: Returns classic 2000s rivals `[ { name, country, skill, consistency } ]` (e.g. Schmitt, Hannawald, Malysz, Ahonen).

## 4. DOM IDs & JS Interface Contracts
- **Key DOM Elements (`index.html`)**:
  - `#gameCanvas`: Primary 960x540 retro pixel canvas.
  - `#windVane`, `#windSpeed`, `#windAngle`: Live wind indicator.
  - `#speedMeter`, `#distanceMeter`, `#jumpPhase`: Flight metrics HUD.
  - `#judgeScoresPanel`, `#judgesList`, `#totalPointsDisplay`: 5-judge scoring cards.
  - `#tournamentModal`, `#leaderboardTable`, `#hillSelect`, `#modeSelect`: Tournament and UI controls.
  - `#customizerPanel`, `#suitColorSelect`, `#mustacheToggle`: Skier customization.
- **Global JS Interface Contracts**:
  - `window.SkiAudio`: `{ init(), playGateBeep(), playInRun(), playTakeoff(), playWind(), playTelemark(), playTwoFoot(), playCrash(), playCrowdCheer() }`
  - `window.SkiPhysics`: `{ initJump(hill, wind), update(dt, inputState), getJumpState() }` (phases: `GATE`, `IN_RUN`, `FLIGHT`, `LANDED`, `CRASHED`)
  - `window.SkiHills`: `{ getHills(), getHill(id) }`
  - `window.SkiRenderer`: `{ init(canvas), render(jumpState, hill, skierConfig) }`
  - `window.SkiTournament`: `{ startTournament(hillIds, humanPlayer), processJumpResult(result), getStandings() }`
  - Script load order in `index.html`: `audio.js` -> `hills.js` -> `physics.js` -> `game.js` -> `tournament.js` -> `app.js`.

## 5. Subpath-Safe & Code Quality Rules
- Assets in `index.html`: `<link rel="stylesheet" href="styles.css">`, `<script src="js/audio.js">` (NO leading slash).
- Fetch in JS: `fetch('api/hills')`, `fetch('api/leaderboard')` (NO leading slash).
- Visuals: 100% generated via HTML5 Canvas 2D + SVG/CSS (mustache, Polish flag, winter trees, retro stands). No external image CDN dependencies.

## 6. Task-to-File Mapping & Parallel Waves (Sprint 1.0)
| Task Key | Developer | Target Files | Wave | Description |
|---|---|---|---|---|
| **SCRUM-190** | Backend/Fullstack | `Dockerfile`, `package.json`, `server.js`, `public/js/tournament.js` | Wave 1 | Cloud Run container, REST endpoints for hills/leaderboard/AI, tournament state & standings |
| **SCRUM-188** | Core Simulation | `public/js/hills.js`, `public/js/physics.js`, `public/js/game.js` | Wave 1 | Aerodynamic flight model, in-run momentum, camera lerp, Zakopane/Planica hill math, canvas drawing |
| **SCRUM-189** | UI / Polish / Audio | `public/index.html`, `public/styles.css`, `public/js/audio.js`, `public/js/app.js` | Wave 2 | Retro HUD, Polish winter CRT theme, jumper customizer, Web Audio SFX, input wiring & DOM integration |
