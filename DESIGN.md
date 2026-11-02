# DESIGN.md — Sprint 2.0 Architecture & Technical Blueprint

## 1. System Architecture & Cloud Run Container
- **App Type**: Tiered / Single-Container Node.js 20 Express application on Port 8080.
- **Port & Serving**: `server.js` listens on `0.0.0.0:8080`, serves static files from `public/`, and exposes high scores / leaderboard REST API endpoints.
- **Subpath Safe Rules**: Load balancer routes `https://.../demo/index.html` -> container `/index.html`.
  - In `index.html`: Relative assets (`href="css/style.css"`, `src="js/..."`). No leading slashes!
  - In JS fetch calls: Relative API paths (`fetch('api/leaderboard')`, `fetch('api/hills')`). Never `/api/...`!

## 2. Modular File Tree & Ownership
```text
├── Dockerfile                  # Node:20-alpine container exposing port 8080 (Preserved)
├── package.json                # Express server dependencies (Preserved)
├── server.js                   # Express server with /api/leaderboard, /api/hills (Preserved)
├── cloudbuild.yaml             # CI/CD deployment configuration (Preserved)
├── README.md                   # Project overview & instructions (Preserved)
└── public/
    ├── index.html              # Shell, CRT filter, HUD overlays, canvas, modals (SCRUM-177)
    ├── css/
    │   └── style.css           # Retro pixel/CRT scanline aesthetic & winter styling (SCRUM-177)
    ├── js/
    │   ├── hills.js            # Hill data (Zakopane K-120, Planica K-185, Wisla K-105) (Preserved)
    │   ├── physics.js          # Inrun, takeoff kinematics, 2D aerodynamics, wind, landing (Preserved)
    │   ├── renderer.js         # HTML5 Canvas rendering of profile, starting bar, jumper (SCRUM-176)
    │   ├── audio.js            # Web Audio SFX: FIS starting beeps, gate clearance (SCRUM-178)
    │   ├── tournament.js       # Round manager, 5-judge FIS tournament scoring (Preserved)
    │   └── game.js             # State orchestrator, gate countdown & readiness states (SCRUM-178)
```

## 3. Sprint 2.0 Feature: High-Contrast Starting Gate & FIS Readiness Prompts

### User Feedback:
*"Make the starting bar more visible for the player as it is hard to detect when to start the jump."*

### UI & DOM Elements (`public/index.html` & `public/css/style.css` - SCRUM-177):
- **FIS Starting Signal Lights Box**: `#gate-signal-lights` inside `.viewport-wrapper`
  - Child lights: `#light-red` (WAIT), `#light-yellow` (ATTENTION), `#light-green` (GO!)
  - Class states: `.light.active` with glowing retro box-shadow (`#ef4444`, `#eab308`, `#22c55e`).
- **Pulsing Gate Readiness Badge**: `#gate-prompt-banner` overlay across upper canvas
  - Text: `"WAITING FOR WIND CLEARANCE..."` -> `"ATTENTION: JUMPER ON BAR"` -> `"GREEN LIGHT - PRESS SPACE OR CLICK TO START"`
  - CSS animations: `@keyframes pulse-green`, `@keyframes neon-glow` for high visibility.
- **Starting Bar Height Indicator**: `#gate-bar-level` inside top HUD (e.g., `BAR #12 (ELEVATED)`).

### Canvas Starting Bar Rendering (`public/js/renderer.js` - SCRUM-176):
- **`SkiRenderer._drawInrunStructure(ctx, hill)` extension**:
  - Render heavy steel/wooden starting tower scaffolding with high-contrast safety stripes (yellow & black diagonal hazard stripes).
  - High-contrast starting bar beam: metallic bar positioned directly behind skier boots at `getInrunPos(hill, 0)` with neon safety pads.
  - Active gate clearance animation: When phase transitions from `GATE` to `INRUN`, render the starting bar pivoting upward/clearing with dynamic snow dust puff.
  - Dynamic camera focus: In `GATE` phase, zoom camera (`targetScale: 4.2`) focusing on tower gate and jumper, pulling smoothly out to `3.4` upon inrun start.

### Audio & Game State Synchronization (`public/js/audio.js` & `public/js/game.js` - SCRUM-178):
- **`SkiAudio` Interface Extensions**:
  - `playGateBeep(type)`: Authentic FIS electronic starting beeps (Short 440Hz beep on Red/Yellow; High 880Hz confirmation beep on Green).
  - `playGateRelease()`: Mechanical click / latch release sound when jumper pushes off bar.
- **`SkiGame` State Machine Extensions**:
  - Gate Sequence: When `resetJump()` is called, initiate gate readiness countdown:
    - Phase `GATE_WAIT` (Red light, 0.6s) -> `GATE_READY` (Yellow light, 0.6s) -> `GATE_CLEAR` (Green light, prompt active).
    - Player can only start inrun when green light is active or immediate manual start with visual feedback.
  - Synchronize DOM lights (`#light-red`, `#light-yellow`, `#light-green`), `#gate-prompt-banner`, and audio beeps.

## 4. Subpath Safety & Robustness Checklist
- [x] Relative paths only: `index.html` uses `css/style.css` and `js/...`
- [x] Fetch calls use `api/leaderboard` (no leading slash)
- [x] Canvas and graphics: 100% canvas & procedural styling (no external asset URLs)
- [x] Audio: 100% Web Audio API procedural synthesis (oscillator/noise buffers)
- [x] Defensive DOM lookups with `DOMContentLoaded` and null guards

## 5. Task-to-File Mapping & Parallel Waves (Sprint 2.0)
| Task ID | Developer Focus | Target Files | Wave |
|---|---|---|---|
| `SCRUM-176` | High-Contrast Starting Gate Visuals & Clearance Animation | `public/js/renderer.js` (Modify/Extend) | Wave 1 (Parallel) |
| `SCRUM-177` | Starting Gate HUD Signal Lights & Jump Timing Prompts | `public/index.html`, `public/css/style.css` (Modify/Extend) | Wave 1 (Parallel) |
| `SCRUM-178` | Starting Gate Audio Cues & State Machine Synchronization | `public/js/audio.js`, `public/js/game.js` (Modify/Extend) | Wave 2 |
