# DESIGN.md — Sprint 4.0 Architecture & Technical Blueprint

## 1. System Architecture & Cloud Run Container
- **App Type**: Tiered Single-Container Node.js 20 Express application on Port 8080 (`server.js` serves `public/` + `/api/hills`, `/api/leaderboard`).
- **Subpath Safe Rules**: Served at `/demo/index.html`. In `index.html`: relative assets (`css/style.css`, `js/...`). In JS `fetch()`: relative API routes (`api/hills`, `api/leaderboard`) — NEVER leading slashes!

## 2. Modular File Tree & Sprint 4.0 Ownership
```text
├── Dockerfile                  # Node:20-alpine container exposing port 8080 (Preserved)
├── package.json                # Express server dependencies (Preserved)
├── server.js                   # Express server with /api/hills, /api/leaderboard (SCRUM-184 extend)
├── cloudbuild.yaml             # CI/CD deployment configuration (Preserved)
├── README.md                   # Project overview (Preserved)
└── public/
    ├── index.html              # Shell, in-flight telemetry HUD (altitude, speed, distance) (SCRUM-186)
    ├── css/style.css           # Telemetry HUD gauges, slope altitude radar, CRT styling (SCRUM-186)
    └── js/
        ├── hills.js            # Steep FIS landing slope profiles, knoll drop, elevation functions (SCRUM-184)
        ├── physics.js          # Immediate landing bug fix, takeoff clearance window, glide physics (SCRUM-185)
        ├── game.js             # Telemetry binding, flight HUD updates, landing state sync (SCRUM-185)
        ├── renderer.js         # Dynamic camera slope tracking, steep terrain & FIS markers (SCRUM-186)
        ├── audio.js            # Web Audio SFX (Preserved)
        └── tournament.js       # FIS tournament & judge scoring (Preserved)
```

## 3. Sprint 4.0 Feature Specifications & Root Cause Fixes
*Feedback*: "The player is not really jumping after pressing jump - even when space is pressed on sweet spot. The player immediately lands instead of falling down the hill. Hill design is too flat."

### A. Hill Geometry Redesign & Steep FIS Slope Profiles (`hills.js`, `server.js` - SCRUM-184)
- **Problem**: Previous profile had flat table exit ($yP = P \cdot \tan(26^\circ)$ with flat ease $0.15t + 0.85t^{2.1}$) right after lip ($x=0$), causing table lip drop to quickly intersect with launch trajectory.
- **Steep FIS Profile Overhaul**:
  - Table drop ($h_t \approx 3.0\text{m} - 3.8\text{m}$): Immediate vertical drop-off below lip at $x=0$, starting knoll (*bula*) below $y=h_t$.
  - Knoll (*bula*) curve ($0 \le x \le P$): Quadratic drop accelerating quickly to $35^\circ - 38^\circ$. At $x=0^+$, slope is already $11.5^\circ - 14^\circ$, dropping steeply.
  - Steep Landing Zone ($P \le x \le K$): Sustained FIS landing incline ($\beta = 34^\circ - 38^\circ$).
  - Transition zone ($K \le x \le HS$): Radius curve easing from $35^\circ$ to $30^\circ$.
  - Outrun ($x > HS$): Smooth transition into horizontal flat deceleration basin ($x > HS + 40$).
- **API / Interface Contracts**:
  - Export `HillData.getGroundY(hill, x)` and `HillData.getGroundSlopeAngle(hill, x)` directly in `hills.js` (used uniformly by `physics.js` & `renderer.js`).
  - Update `server.js` `/api/hills` seed data with steep profile properties (`knollDrop: 3.5, betaK: 35.5, betaP: 38.0`).

### B. Immediate Landing Bug Fix & Aerodynamic Flight Trajectory (`physics.js`, `game.js` - SCRUM-185)
- **Root Cause of Immediate Landing**:
  1. `getGroundY` returned 0 at $x \le 0$ and close to 0 right past lip, so any slight downward $v_y$ or discrete Euler step immediately triggered `groundClearance <= 0.05` within 1–2 physics frames after takeoff.
  2. No clearance immunity window existed immediately after exiting the inrun table.
- **Kinematic & Collision Overhaul**:
  - **Takeoff Clearance Grace Period**: In `_updateFlight(dt)`: Ground collision is **IGNORED** while $x < 12.0\text{m}$ OR $t_{\text{flight}} < 0.65\text{s}$ unless vertical speed is downwards and clearance is negative.
  - **Descend-Only Collision Trigger**: Collision with ground is ONLY evaluated when jumper is descending into terrain: `groundClearance <= 0.15 && state.vy > 0 && state.x > 8.0`.
  - **True World Coordinates**: Lip at $(x=0, y=0)$. Table base ground at $x=0$ starts at $y = \text{tableHeight} \approx 3.0\text{m}-3.8\text{m}$.
  - **Flight Aerodynamics & Glide Cushion**: Lift-to-drag maintains skier floating $1.8\text{m} - 4.5\text{m}$ above the descending slope across $0 < x < K$, with controllable pitch ($\theta$) giving authentic DSJ floating feel.
  - **`game.js` Telemetry**: Track and publish `groundClearance`, `flightAltitude`, and `flightSpeed` to state and HUD.

### C. Camera Slope Tracking, Steep Terrain Visuals & Telemetry HUD (`renderer.js`, `index.html`, `style.css` - SCRUM-186)
- **Camera Tracking**:
  - During `FLIGHT`, camera smoothly tracks skier along steep descending mountain grade ($y$ descent), keeping skier in upper-center third with visible terrain drop below.
  - Zoom scaling expands dynamically: `targetScale = 2.65` during high flight, framing both skier and slope drop.
- **Steep Hill Rendering**:
  - High-contrast table drop face ($3\text{m}-4\text{m}$ deep dark metallic/stone wall below lip).
  - Clear painted FIS landing lines across steep slope: P-point (blue), K-point (bright red), HS-point (neon yellow/gold), Hill Record (emerald green).
- **In-Flight Telemetry HUD**:
  - DOM in `index.html`: `#flight-telemetry-hud` with `#telemetry-altitude` (meters above slope), `#telemetry-speed` (km/h), `#telemetry-glide-ratio`.
  - Styling in `style.css`: Compact translucent CRT radar overlay with neon green/cyan readouts, active during `FLIGHT` phase.

## 4. Subpath Safety & Robustness Checklist
- [x] Relative paths only: `index.html` uses `css/style.css` and `js/...`
- [x] Relative fetch calls: `api/leaderboard`, `api/hills` (never leading slash)
- [x] 100% Procedural canvas visuals & Web Audio synthesis (zero external asset dependencies)
- [x] Defensive DOM lookups (`DOMContentLoaded`, null-checks on every element)

## 5. Task-to-File Mapping & Parallel Waves (Sprint 4.0)
| Task ID | Developer Focus | Target Files | Wave |
|---|---|---|---|
| `SCRUM-184` | Steep FIS Hill Profiles, Knoll Drop-off & Elevation Functions | `public/js/hills.js`, `server.js` (Modify/Extend) | Wave 1 (Parallel) |
| `SCRUM-185` | Immediate Landing Bug Fix, Flight Clearance Window & Glide Physics | `public/js/physics.js`, `public/js/game.js` (Modify/Extend) | Wave 1 (Parallel) |
| `SCRUM-186` | Dynamic Camera Slope Tracking, Steep Terrain Visuals & In-Flight HUD | `public/js/renderer.js`, `public/index.html`, `public/css/style.css` (Modify/Extend) | Wave 2 |
