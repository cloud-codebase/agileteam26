# DESIGN.md — Sprint 3.0 Architecture & Technical Blueprint

## 1. System Architecture & Cloud Run Container
- **App Type**: Tiered / Single-Container Node.js 20 Express application on Port 8080.
- **Port & Serving**: `server.js` listens on `0.0.0.0:8080`, serves static files from `public/`, and exposes high scores / leaderboard REST API endpoints (`/api/leaderboard`, `/api/hills`).
- **Subpath Safe Rules**: Load balancer routes `https://.../demo/index.html` -> container `/index.html`.
  - In `index.html`: Relative assets (`href="css/style.css"`, `src="js/..."`). No leading slashes!
  - In JS fetch calls: Relative API paths (`fetch('api/leaderboard')`, `fetch('api/hills')`). Never `/api/...`!

## 2. Modular File Tree & Ownership (Sprint 3.0)
```text
├── Dockerfile                  # Node:20-alpine container exposing port 8080 (Preserved)
├── package.json                # Express server dependencies (Preserved)
├── server.js                   # Express server with /api/leaderboard, /api/hills (Preserved)
├── cloudbuild.yaml             # CI/CD deployment configuration (Preserved)
├── README.md                   # Project overview & instructions (Preserved)
└── public/
    ├── index.html              # Shell, HUD overlays, #takeoff-timing-bar, #takeoff-prompt-badge (SCRUM-181)
    ├── css/style.css           # CRT styling, timing gauge meter, jump window & feedback badges (SCRUM-181)
    └── js/
        ├── hills.js            # Hill data (takeoff lip thresholds, warnZone, sweetSpot) (SCRUM-180)
        ├── renderer.js         # Take-off edge lip, warning track, guide flags, sweet spot glow (SCRUM-180)
        ├── physics.js          # Take-off aerodynamic lift impulse, flight glide overhaul (SCRUM-182)
        ├── game.js             # Real-time timing meter tracking, input triggers, HUD binding (SCRUM-182)
        ├── audio.js            # Synthesized launch chime, timing rating SFX, aero glide wind (SCRUM-182)
        └── tournament.js       # FIS tournament & judge scoring (Preserved)
```

## 3. Sprint 3.0 Feature Specification: Take-Off Edge & Jump Timing Engine
*Feedback*: "Make the take-off point more clear. When is the best time to press jump? Where is the edge? Users are jumping down right after start instead of flying."

### A. Take-Off Edge Visualization & Hill Data (`renderer.js`, `hills.js` - SCRUM-180)
- **`hills.js` extensions**: Add `takeoffConfig: { warningZoneLen: 12.0, sweetSpotLen: 2.8, lipHeight: 3.0 }` to each hill profile.
- **`renderer.js` extensions**:
  - `_drawTakeoffZone(ctx, hill, inrunPoints)`:
    - High-contrast edge lip at table exit `(x=0, y=0)`: bright neon red/amber edge stop block with vertical marker flags (`🚩 EDGE / TAKEOFF`).
    - Inrun warning track: 12m preceding edge rendered with alternating red/white safety chevrons / stripes along the track bed.
    - Sweet Spot Glow: 0.5m-3.0m before lip marked with glowing cyan/lime neon border and dynamic pulsation when skier enters zone.
    - Camera framing: Maintain smooth zoom transition so table lip is distinctly visible ahead of skier before launch.

### B. Take-Off Timing HUD Gauge & Feedback Badges (`index.html`, `style.css` - SCRUM-181)
- **DOM Additions in `index.html`** (inside `.viewport-wrapper`):
  - `#takeoff-hud-container`: Positioned prominently below top HUD or over center inrun view during INRUN phase.
  - `#takeoff-timing-bar`: Progress gauge tracking distance to edge (100% -> 0%).
    - Zones: `.zone-early` (gray/amber), `.zone-sweet` (neon green/cyan), `.zone-late` (red).
    - `#takeoff-needle`: Live moving marker indicating current position.
  - `#takeoff-prompt-badge`: Large retro pulsing alert appearing when entering sweet spot (`"⚡ JUMP NOW! [SPACE / CLICK] ⚡"`).
  - `#takeoff-feedback-badge`: Rating popup on takeoff (`PERFECT! (+LIFT)`, `GREAT!`, `EARLY`, `LATE`, `MISSED`).
- **CSS Styling in `style.css`**:
  - CRT neon glowing borders, retro monospace font, pulsing animations (`@keyframes jumpPulse`, `@keyframes sweetGlow`).
  - Rating badge color schemes: `#22c55e` (Perfect), `#38bdf8` (Great), `#eab308` (Early), `#ef4444` (Late).

### C. Take-Off Physics Engine Overhaul & Launch SFX (`physics.js`, `game.js`, `audio.js` - SCRUM-182)
- **`physics.js` Overhaul**:
  - Jump impulse calculation: Base upward lift impulse boosted from 2.2 m/s to 4.5–5.8 m/s depending on timing quality.
  - Aerodynamic initial glide: Skier exits table with positive initial lift-to-drag angle, eliminating immediate ground plunge.
  - Timing Window:
    - `0.2m - 2.8m` before edge: `PERFECT!` (1.20x lift boost, clean V-style trajectory).
    - `2.8m - 6.0m`: `GOOD` (1.05x lift boost).
    - `> 6.0m`: `EARLY` (0.85x lift boost).
    - Passed edge `< 0.0m`: `LATE` (0.80x lift boost).
    - No jump pressed: `MISSED` (0.65x downward slide off lip).
- **`game.js` Synchronization**:
  - Real-time updates of `#takeoff-needle` and `#takeoff-prompt-badge` during `INRUN`.
  - Multi-input responsiveness (Space, Enter, Click, Touch, Action Button).
  - Activate `#takeoff-feedback-badge` with accuracy text.
- **`audio.js` Extensions**:
  - `playTakeoffRating(quality)`: High pitch chime for PERFECT, melodic tone for GOOD, low dull thud for EARLY/LATE.
  - `playTakeoffLaunch()`: Enhanced satisfying dynamic air whoosh + ski pop.

## 4. Subpath Safety & Robustness Checklist
- [x] Relative paths only: `index.html` uses `css/style.css` and `js/...`
- [x] Relative fetch calls: `api/leaderboard`, `api/hills` (no leading slash)
- [x] 100% Procedural canvas visuals & Web Audio synthesis (zero external asset dependencies)
- [x] Defensive DOM lookups (`DOMContentLoaded`, null-checks on every getElementById)

## 5. Task-to-File Mapping & Parallel Waves (Sprint 3.0)
| Task ID | Developer Focus | Target Files | Wave |
|---|---|---|---|
| `SCRUM-180` | Take-Off Edge High-Contrast Lip, Warning Track & Lip Flags | `public/js/hills.js`, `public/js/renderer.js` (Modify/Extend) | Wave 1 (Parallel) |
| `SCRUM-181` | Take-Off Timing HUD Gauge, On-Screen Jump Window & Feedback Badges | `public/index.html`, `public/css/style.css` (Modify/Extend) | Wave 1 (Parallel) |
| `SCRUM-182` | Take-Off Physics Lift Overhaul, Responsive Inputs & Launch Audio | `public/js/physics.js`, `public/js/game.js`, `public/js/audio.js` (Modify/Extend) | Wave 2 |
