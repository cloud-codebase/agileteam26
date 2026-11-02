# Technical Architecture Blueprint: SkiJump2 (Sprint 2.0)

## 1. Branch & Single-Container Cloud Run Architecture
- **Branch**: `feat-skijump2`
- **Runtime**: Tiered Single-Container Node.js 20 (`node:20-alpine`) on Port `8080` (Preserved `Dockerfile`, `package.json`, `server.js`).
- **Subpath Handling**: Accessed at `/demo/index.html`. All frontend fetches MUST use relative paths without leading slash (`api/...`, **NEVER** `/api/...`). All asset links in `index.html` use relative paths (`styles.css`, `js/...`).

## 2. Modular File Tree & Ownership
```
├── Dockerfile                  # Preserved (Node 20-alpine, exposes 8080)
├── package.json                # Preserved (Express, CORS)
├── server.js                   # [EXTEND - SCRUM-194] Add starting gate compensation rules to FIS scoring API
├── public/
│   ├── index.html              # [EXTEND - SCRUM-194] Add starting gate selector, beam indicator, feedback banner
│   ├── styles.css              # [EXTEND - SCRUM-194] Gate control bar, takeoff timing feedback styling
│   └── js/
│       ├── audio.js            # Preserved (Web Audio API retro synth sound generator)
│       ├── hills.js            # [EXTEND - SCRUM-192] Steeper inrun & landing slopes, knoll relief, gate height offsets
│       ├── physics.js          # [EXTEND - SCRUM-192, 193, 194] Flight polar curve, sub-pixel edge detection, gate speed scaling
│       ├── game.js             # [EXTEND - SCRUM-193, 194] Start gate beam rendering, edge timing banner, camera flight tracking
│       ├── tournament.js       # [EXTEND - SCRUM-194] FIS gate point compensation math & multi-hill gate tracking
│       └── app.js              # [EXTEND - SCRUM-194] Gate HUD inputs, timing notifications, state orchestration
```

## 3. API Endpoints, DOM IDs & JS Interface Contracts
- **REST Endpoints (`server.js`)**:
  - `GET api/hills`: Returns hills with `defaultGate`, `minGate`, `maxGate`, `gatePointsFactor` (`{ id, name, kPoint, hsPoint, gates: { default: 12, min: 1, max: 20, pointsPerGate: 4.8 } }`).
  - `POST api/calculate-score`: Body `{ distance, kPoint, styleScores, gateDelta, pointsPerGate, windSpeed, windFactor }` -> returns breakdown `{ distancePoints, stylePoints, gateCompensation, windCompensation, totalPoints }`.
  - `POST api/leaderboard`: Stores score including gate metadata `{ playerName, hillId, distance, styleScore, gate, totalPoints }`.
- **New DOM Elements (`index.html`)**:
  - `#gateControl`: Starting gate HUD selector widget (container).
  - `#gateNumber`: Current selected gate readout (e.g. "Belka: 12").
  - `#gateDownBtn`, `#gateUpBtn`: Buttons to adjust gate before inrun.
  - `#takeoffFeedback`: Takeoff timing banner (`PERFECT! (+100%)`, `DOBRZE (-0.2m)`, `ZA WCZEŚNIE! (-1.8m)`, `SPÓŹNIONE!`).
  - `#gateCompDisplay`: Gate compensation display in FIS score summary card (`#judgeScoresPanel`).
- **Global JS Interface Contracts**:
  - `window.SkiHills.getGroundAt(hill, x, gateOffset)`: Returns `{ y, angle, onLanding, distance }`.
  - `window.SkiPhysics`:
    - `setGate(gateNumber)`: Sets starting gate (1-20), alters start position and inrun potential energy.
    - `triggerTakeoff()`: Sub-pixel edge evaluation at $x=0$, returns `{ quality, timingDeltaMeters, rating: 'PERFECT'|'EARLY'|'LATE' }`.
    - `getJumpState()`: Now includes `gate`, `takeoffFeedback: { rating, text, delta }`, `flightLiftRatio`.
  - `window.SkiTournament.calculateGateCompensation(currentGate, baseGate, pointsPerGate)`: Returns FIS points delta.

## 4. Code Quality & Cloud Run Subpath Principles
- **Subpath-Safe Relative Paths**: All `fetch()` calls in `app.js` and `tournament.js` must call `'api/...'` (e.g. `fetch('api/hills')`), never `'/api/...'`.
- **Self-Contained Canvas & Vector Visuals**: Gate beam, table lip, flags, and HUD elements rendered with HTML5 Canvas 2D + CSS3.
- **Flight & Slope Tuning (User Feedback)**:
  - Steeper inrun angle ($38^\circ \to 35^\circ$ table) and landing angle ($37^\circ$ knoll, $35.5^\circ$ K-point) to provide genuine flight elevation above slope.
  - Lift coefficient $C_L$ boosted from $1.35 \to 1.75$ with optimal pitch $22^\circ$ allowing float trajectory; camera zoom adapts smoothly.

## 5. Task-to-File Mapping & Parallel Waves (Sprint 2.0)
| Task Key | Focus Area | Target Files | Wave | Description |
|---|---|---|---|---|
| **SCRUM-192** | Slope & Aero Flight | `public/js/hills.js`, `public/js/physics.js` | Wave 1 (Parallel) | Rebalance hill slope profiles to be steeper; upgrade lift/drag polar curve for high-glide float trajectories |
| **SCRUM-193** | Edge & Collision | `public/js/physics.js`, `public/js/game.js` | Wave 1 (Parallel) | Precision sub-pixel takeoff edge detection, jump timing evaluation (Early/Perfect/Late), slope raycast landing |
| **SCRUM-194** | Starting Gate & FIS | `server.js`, `public/index.html`, `public/styles.css`, `public/js/tournament.js`, `public/js/app.js` | Wave 2 | Gate selector HUD, start beam graphics, gate speed scaling, and FIS gate compensation scoring points |
