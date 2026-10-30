# Technical Architecture Blueprint: Retro Ski Jumps Game (Adam Małysz / DSJ Style)

## 1. Branch & Single-Container Cloud Run Architecture
- **Branch**: `feat-jumps5k`
- **Runtime**: Node.js 20 Alpine (`node:20-alpine`) single-container listening on `0.0.0.0:8080`.
- **Server**: Express.js serving static assets from `public/` and JSON REST API under `/api/...`.
- **Subpath Rule**: App runs behind load balancer `/demo/index.html`. All frontend asset tags (`href="styles.css"`, `src="physics.js"`) and API fetches (`fetch('api/hills')`, `fetch('api/leaderboard')`) **MUST** use relative paths with NO leading slash!

## 2. Modular File Tree & Ownership
```text
├── Dockerfile                  # Container definition on port 8080 (SCRUM-143)
├── package.json                # Express server dependencies & scripts (SCRUM-143)
├── server.js                   # Express server, in-memory seed data, REST routes (SCRUM-143)
├── public/
│   ├── index.html              # Retro DSJ markup, TVP-style HUD & modals (SCRUM-144)
│   ├── styles.css              # Pixel/retro TVP red-white broadcast theme & CRT FX (SCRUM-144)
│   ├── ui.js                   # HUD controller, modal manager, judge scores formatting (SCRUM-144)
│   ├── audio.js                # Web Audio retro synth FX (wind, takeoff, fanfares, crash) (SCRUM-145)
│   ├── physics.js              # In-run speed, flight pitch aerodynamics, landing & ragdoll (SCRUM-145)
│   └── game.js                 # 60FPS Canvas game loop, input handlers, tournament state (SCRUM-145)
├── cloudbuild.yaml             # PRESERVED from main
└── README.md                   # PRESERVED from main
```

## 3. API Contracts & Data Shapes (SCRUM-143)
- `GET /api/hills`: Returns array of hills:
  `[{ id: "zakopane", name: "Wielka Krokiew (Zakopane)", kPoint: 120, hsPoint: 134, record: { distance: 140.5, holder: "Adam Małysz", year: 2002 } }, ...]`
- `GET /api/leaderboard`: Returns high scores:
  `[{ rank: 1, name: "Adam Małysz", country: "POL", hill: "Zakopane", distance1: 138.5, distance2: 139.0, totalPoints: 285.5 }, ...]`
- `POST /api/leaderboard`: Body `{ name, country, hill, distance1, distance2, totalPoints }` -> appends & returns updated top 10.

## 4. DOM IDs & JS Interface Contracts
- **Script Order in `public/index.html`**:
  `audio.js` -> `ui.js` -> `physics.js` -> `game.js`
- **Key DOM Element IDs** (`public/index.html` owned by SCRUM-144):
  - `#gameCanvas`: `<canvas width="800" height="450">`
  - `#hillSelect`: Dropdown to pick active hill (Zakopane, Wisła, Planica, Oberstdorf)
  - `#hudSpeed`, `#hudDistance`, `#hudWindSpeed`, `#hudWindAngle`: In-flight status indicators
  - `#hudPhase`: Current phase ("IN_RUN", "FLIGHT", "LANDED", "CRASHED", "SCORED")
  - `#resultsModal`, `#judgeScoresList`, `#totalPointsDisplay`, `#btnNextRound`, `#btnRestart`
  - `#leaderboardModal`, `#leaderboardTableBody`
- **Global JS Interface Contracts**:
  - `window.SkiAudio = { playWind(speed), stopWind(), playTakeoff(), playLanding(), playCheer(), playCrash() }`
  - `window.SkiUI = { updateHUD(stats), showJudgeScores(details), renderLeaderboard(data) }`
  - `window.SkiPhysics = { initHill(hill), updateFlight(state, input, dt), calculateScore(distance, stylePoints, wind) }`
  - `window.SkiGame = { startJump(), reset(), tournamentRound: 1, roundScores: [] }`

## 5. Parallel Execution Task Mapping
| Task Key | Developer | Target Files | Wave |
|---|---|---|---|
| **SCRUM-143** | Athos | `package.json`, `server.js`, `Dockerfile` | Wave 1 |
| **SCRUM-144** | Porthos | `public/index.html`, `public/styles.css`, `public/ui.js` | Wave 1 |
| **SCRUM-145** | Aramis | `public/audio.js`, `public/physics.js`, `public/game.js` | Wave 1 |

*All tasks run in parallel (Wave 1). Integration verified in Wave 2 review.*
