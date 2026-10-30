# Technical Architecture Blueprint: Retro Ski Jumps (DSJ / Adam Małysz) - Sprint 2.0

## 1. Branch & Single-Container Cloud Run Architecture
- **Git Branch**: `feat-jumps5k`
- **Runtime**: Node.js 20 Alpine (`node:20-alpine`) single container listening on `0.0.0.0:8080`.
- **Server**: Express.js serving static assets from `public/` and JSON REST API under `/api/...`.
- **Subpath Safe Rules**: App runs behind load-balancer at `/demo/index.html`.
  - In `index.html`: strictly relative asset tags without leading slash (`href="styles.css"`, `src="physics.js"`).
  - In Frontend JS: strictly relative `fetch('api/hills')`, `fetch('api/leaderboard')` — **NEVER** `/api/...`.

## 2. Modular File Tree & Developer Ownership
```text
├── Dockerfile                  # Container definition on port 8080 (PRESERVED)
├── package.json                # Express server dependencies & scripts (PRESERVED)
├── server.js                   # Express server, hill profiles & leaderboard API (SCRUM-149)
├── public/
│   ├── index.html              # TVP broadcast markup, telemetry HUD overlays, modals (SCRUM-149)
│   ├── styles.css              # CRT scanlines, TVP styling, telemetry HUD styling (SCRUM-149)
│   ├── ui.js                   # HUD controller, 5-judge score modal & leaderboard view (SCRUM-148, SCRUM-149)
│   ├── physics.js              # DSJ Flight aerodynamics, AoA lift/drag, takeoff timing (SCRUM-147)
│   ├── audio.js                # Web Audio synthesizer SFX (takeoff, whoosh, crowd, crash) (PRESERVED)
│   └── game.js                 # 60FPS Canvas loop, hill geometry render, landing & HUD link (SCRUM-148, SCRUM-149)
├── cloudbuild.yaml             # PRESERVED from main
└── README.md                   # PRESERVED from main
```

## 3. Sprint 2.0 Task-to-File Mapping & Parallel Waves
| Task Key | Developer | Target Files | Wave | Core Responsibilities |
|---|---|---|---|---|
| **SCRUM-147** | Aramis | `public/physics.js` | Wave 1 | Flight aerodynamics overhaul: AoA lift/drag formulas ($L=C_l \cdot v^2, D=C_d \cdot v^2$), precision takeoff impulse window, stall/tumble detection, dynamic wind vectors |
| **SCRUM-148** | Athos | `public/physics.js` (scoring/landing sections), `public/ui.js` | Wave 1 | Contact collision along hill curves, telemark vs two-foot vs crash detection, FIS scoring formula (middle 3 of 5 judges, wind points, distance +/- pts) |
| **SCRUM-149** | Porthos | `server.js`, `public/index.html`, `public/styles.css`, `public/game.js` | Wave 1 | Real-world hill profiles (Zakopane K120/HS134, Planica K200/HS240, Lahti K116), TVP telemetry HUD (km/h, green leader to-beat line on snow), leaderboard API |

*To prevent merge conflicts during Wave 1*: Aramis owns `public/physics.js` aerodynamic flight & takeoff. Athos coordinates landing & FIS scoring functions in `public/physics.js` / `public/ui.js`. Porthos owns `server.js`, `index.html`, `styles.css`, and canvas hill rendering in `game.js`.

## 4. API Endpoints & Data Contracts (SCRUM-149)
- `GET api/hills`: Returns array of hills:
  `[{ id: "zakopane", name: "Wielka Krokiew (Zakopane)", kPoint: 120, hsPoint: 134, record: { distance: 140.5, holder: "Adam Małysz", year: 2002 } }, { id: "planica", name: "Letalnica bratov Gorišek (Planica)", kPoint: 200, hsPoint: 240, record: { distance: 252.0, holder: "Ryoyu Kobayashi", year: 2019 } }, { id: "lahti", name: "Salpausselkä (Lahti)", kPoint: 116, hsPoint: 130, record: { distance: 138.0, holder: "Andreas Widhölzl", year: 2006 } }]`
- `GET api/leaderboard`: Returns high scores array sorted by totalPoints desc.
- `POST api/leaderboard`: Body `{ name, country, hill, distance1, distance2, totalPoints }` -> appends & returns top 20.

## 5. Global JavaScript Interfaces & DOM Contracts
- **Script Execution Order** in `public/index.html`:
  `audio.js` -> `ui.js` -> `physics.js` -> `game.js`
- **DOM IDs**:
  - Canvas: `#gameCanvas` (800x450)
  - Telemetry HUD: `#hudSpeed`, `#hudDistance`, `#hudWindSpeed`, `#hudWindAngle`, `#hudPhase`, `#hudHillPoints`, `#windArrow`
  - Green To-Beat Line: Rendered directly on Canvas slope at leader's required distance
  - Results Modal: `#resultsModal`, `#resJumperName`, `#resDistanceDisplay`, `#resDistPts`, `#resWindPts`, `#judgeScoresList`, `#resStyleSum`, `#totalPointsDisplay`
- **Global JS Interface Contracts**:
  - `window.SkiPhysics = { initHill(hillConfig), getHillY(x), getHillSlopeAngle(x), xToMeters(x), metersToX(meters), updateFlight(state, input, dt, wind), handleLanding(state, input, groundY), calculateScore(distance, landingStyle, windSpeed) }`
  - `window.SkiUI = { updateHUD(stats), showJudgeScores(details), renderLeaderboard(data), fetchLeaderboard() }`
  - `window.SkiGame = { startJump(), reset(), tournamentRound, roundScores, leaderDistance }`

## 6. Cloud Run Subpath & Code Quality Checklist
- Relative fetch paths ONLY: `fetch('api/hills')`, `fetch('api/leaderboard')`.
- All DOM queries wrapped in `document.addEventListener('DOMContentLoaded', ...)` or guarded against `null`.
- Pure HTML5 Canvas & procedural rendering: no external assets, fonts, or images.
