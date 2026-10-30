/**
 * game.js - Canvas Game Engine & Tournament Manager for Retro Ski Jumps (DSJ style)
 * Implements:
 * - 60 FPS requestAnimationFrame canvas rendering loop
 * - Dynamic camera tracking following ski jumper down hill
 * - Procedural ski jumping hill rendering (tower, in-run ramp, snow hill profile, distance markers: K-point red line, HS-point green line)
 * - Animated ski jumper character (in-run crouch, V-style aerodynamic flight, telemark landing pose, crash ragdoll/tumble)
 * - Animated spectators, Polish flags waving in wind, pine trees, falling snow particles
 * - Keyboard (Space, ArrowUp, ArrowDown, W, S, T), Mouse (clicks / drag), and Touch controls
 * - Two-round tournament system with score aggregation and relative fetch calls to backend ('api/hills', 'api/leaderboard')
 */
(function() {
  'use strict';

  class SkiGameEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.isRunning = false;
      this.animationFrameId = null;

      // Tournament state
      this.tournamentRound = 1;
      this.roundScores = [];
      this.currentHillId = 'zakopane';
      this.hills = [];
      this.jumperName = 'Adam Małysz';
      this.jumperCountry = 'POL';

      // Simulation physics state
      this.state = this.getInitialState();

      // Wind conditions (regenerated per jump)
      this.wind = {
        speed: 1.2, // m/s (-3.0 to +3.5)
        angle: 45   // degrees
      };

      // Input tracking
      this.input = {
        pitchUp: false,
        pitchDown: false,
        jumpPressed: false,
        landingPressed: false,
        telemarkPressed: false
      };

      // Camera
      this.camera = { x: 0, y: 0 };

      // Background Snow Particles
      this.snowflakes = [];
      this.initSnowflakes(70);

      // Spectators along the hill
      this.spectators = [];
      this.initSpectators();

      // Bind methods
      this.loop = this.loop.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerUp = this.handlePointerUp.bind(this);
    }

    getInitialState() {
      return {
        phase: 'READY', // 'READY', 'IN_RUN', 'FLIGHT', 'LANDED', 'CRASHED', 'SCORED'
        x: 60,
        y: 85,
        vx: 0,
        vy: 0,
        pitch: 18,
        hasJumped: false,
        takeoffQuality: 0,
        distance: 0,
        landingStyle: 'TELEMARK',
        crashed: false,
        scored: false,
        scoreDetails: null,
        tumbleAngle: 0
      };
    }

    initSnowflakes(count) {
      this.snowflakes = [];
      for (let i = 0; i < count; i++) {
        this.snowflakes.push({
          x: Math.random() * 850,
          y: Math.random() * 480,
          speed: 15 + Math.random() * 35,
          drift: (Math.random() - 0.5) * 20,
          radius: 1 + Math.random() * 2.5
        });
      }
    }

    initSpectators() {
      this.spectators = [];
      // Generate spectators clustered between takeoff and HS
      for (let i = 0; i < 40; i++) {
        const xOffset = 290 + i * 15 + (Math.random() * 8 - 4);
        const hasFlag = i % 4 === 0; // Every 4th spectator holds a Polish flag
        const coatColor = ['#d32f2f', '#ffffff', '#1976d2', '#388e3c', '#fbc02d', '#424242'][i % 6];
        this.spectators.push({
          x: xOffset,
          coatColor,
          hasFlag,
          bobOffset: Math.random() * Math.PI * 2
        });
      }
    }

    /**
     * Initialize DOM bindings, canvas, event listeners, and fetch hills/leaderboard
     */
    init() {
      this.canvas = document.getElementById('gameCanvas');
      if (!this.canvas) {
        console.warn('SkiGame: #gameCanvas element not found in DOM yet.');
        return;
      }
      this.ctx = this.canvas.getContext('2d');

      // Bind input events
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);

      this.canvas.addEventListener('mousedown', this.handlePointerDown);
      window.addEventListener('mouseup', this.handlePointerUp);
      this.canvas.addEventListener('touchstart', this.handlePointerDown, { passive: false });
      window.addEventListener('touchend', this.handlePointerUp, { passive: false });

      // Listen for Hill change from UI
      const hillSelect = document.getElementById('hillSelect');
      if (hillSelect) {
        hillSelect.addEventListener('change', (e) => {
          this.setHill(e.target.value);
        });
      }

      // Fetch hills & high scores using strictly relative paths (no leading slash)
      this.fetchHills();

      // Set initial wind
      this.randomizeWind();

      // Start rendering loop
      this.startLoop();
    }

    fetchHills() {
      fetch('api/hills')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(hills => {
          if (Array.isArray(hills) && hills.length > 0) {
            this.hills = hills;
            this.setHill(hills[0].id || 'zakopane');
          }
        })
        .catch(err => {
          console.warn('Could not fetch api/hills (offline or static mode), using fallback hill:', err);
          if (window.SkiPhysics) {
            window.SkiPhysics.initHill({
              id: 'zakopane',
              name: 'Wielka Krokiew (Zakopane)',
              kPoint: 120,
              hsPoint: 134,
              record: { distance: 140.5, holder: 'Adam Małysz', year: 2002 }
            });
          }
        });
    }

    setHill(hillId) {
      this.currentHillId = hillId;
      const found = this.hills.find(h => h.id === hillId);
      if (found && window.SkiPhysics) {
        window.SkiPhysics.initHill(found);
      }
      this.reset();
    }

    randomizeWind() {
      // Wind speed between -3.0 (tailwind) and +3.5 (headwind)
      const speed = Math.round(((Math.random() * 6.5) - 3.0) * 10) / 10;
      const angle = Math.floor(Math.random() * 360);
      this.wind = { speed, angle };

      // Update HUD if UI module is present
      this.updateHUD();
    }

    startJump() {
      if (this.state.phase === 'READY' || this.state.phase === 'SCORED') {
        this.reset();
        this.state.phase = 'IN_RUN';
        this.state.vx = 45;
        this.state.vy = 0;
        this.randomizeWind();

        if (window.SkiAudio && typeof window.SkiAudio.playInRunWhoosh === 'function') {
          window.SkiAudio.playInRunWhoosh(50);
        }
      } else if (this.state.phase === 'IN_RUN') {
        // Space / Click pressed while in-run triggers takeoff jump!
        this.input.jumpPressed = true;
      } else if (this.state.phase === 'FLIGHT') {
        // Space / Click pressed while in flight triggers landing preparation
        this.input.landingPressed = true;
      }
    }

    reset() {
      this.state = this.getInitialState();
      this.input.jumpPressed = false;
      this.input.landingPressed = false;
      this.input.telemarkPressed = false;
      this.input.pitchUp = false;
      this.input.pitchDown = false;
      if (window.SkiAudio && typeof window.SkiAudio.stopWind === 'function') {
        window.SkiAudio.stopWind();
      }
      this.updateHUD();
    }

    nextRound() {
      if (this.tournamentRound === 1) {
        this.tournamentRound = 2;
        this.reset();
      } else {
        // Tournament finished, reset to round 1
        this.tournamentRound = 1;
        this.roundScores = [];
        this.reset();
      }
      this.updateHUD();
    }

    handleKeyDown(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state.phase === 'READY') {
          this.startJump();
        } else if (this.state.phase === 'IN_RUN') {
          this.input.jumpPressed = true;
        } else if (this.state.phase === 'FLIGHT') {
          this.input.landingPressed = true;
        }
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        if (this.state.phase === 'FLIGHT') {
          this.input.telemarkPressed = true;
          this.input.landingPressed = true;
        }
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.input.pitchUp = true;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.input.pitchDown = true;
      } else if (e.code === 'KeyR') {
        this.reset();
      }
    }

    handleKeyUp(e) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.input.pitchUp = false;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.input.pitchDown = false;
      } else if (e.code === 'Space') {
        this.input.jumpPressed = false;
      } else if (e.code === 'KeyT') {
        this.input.telemarkPressed = false;
      }
    }

    handlePointerDown(e) {
      if (e.cancelable) e.preventDefault();
      if (this.state.phase === 'READY') {
        this.startJump();
      } else if (this.state.phase === 'IN_RUN') {
        this.input.jumpPressed = true;
      } else if (this.state.phase === 'FLIGHT') {
        // Upper half of canvas = pitch up, lower half = pitch down / landing
        const rect = this.canvas.getBoundingClientRect();
        const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        const relativeY = clientY - rect.top;
        if (relativeY < rect.height * 0.45) {
          this.input.pitchUp = true;
        } else {
          this.input.pitchDown = true;
          this.input.landingPressed = true;
          this.input.telemarkPressed = true;
        }
      }
    }

    handlePointerUp(e) {
      this.input.jumpPressed = false;
      this.input.pitchUp = false;
      this.input.pitchDown = false;
    }

    startLoop() {
      if (!this.isRunning) {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.loop);
      }
    }

    stopLoop() {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
    }

    loop(currentTime) {
      if (!this.isRunning) return;

      const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;

      // Update simulation
      this.update(dt);

      // Render canvas scene
      this.render();

      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    update(dt) {
      const state = this.state;

      if (window.SkiPhysics && (state.phase === 'IN_RUN' || state.phase === 'FLIGHT' || state.phase === 'LANDED' || state.phase === 'CRASHED')) {
        window.SkiPhysics.updateFlight(state, this.input, dt, this.wind);

        // Sound sync
        if (state.phase === 'FLIGHT' && window.SkiAudio) {
          window.SkiAudio.playWind(Math.min(100, (state.vx / 3) + Math.abs(this.wind.speed) * 8));
        }

        // Tumble rotation for crash ragdoll
        if (state.phase === 'CRASHED') {
          state.tumbleAngle += 360 * dt * 2.5;
        }

        // Scoring trigger when rollout finishes
        if (state.phase === 'SCORED' && !state.scored) {
          state.scored = true;
          if (window.SkiAudio) {
            window.SkiAudio.stopWind();
          }
          this.finalizeScore();
        }
      }

      // Update camera smooth follow
      if (state.phase !== 'READY') {
        const targetCamX = state.x - 280;
        const targetCamY = state.y - 250;
        this.camera.x += (targetCamX - this.camera.x) * 0.12;
        this.camera.y += (targetCamY - this.camera.y) * 0.12;
      } else {
        this.camera.x += (0 - this.camera.x) * 0.08;
        this.camera.y += (0 - this.camera.y) * 0.08;
      }

      // Update snowflakes
      for (const flake of this.snowflakes) {
        flake.y += flake.speed * dt;
        flake.x += (flake.drift + (this.wind.speed * 8)) * dt;
        if (flake.y > 480) {
          flake.y = -5;
          flake.x = Math.random() * 850;
        }
        if (flake.x > 850) flake.x = 0;
        if (flake.x < 0) flake.x = 850;
      }

      // Periodic HUD update
      this.updateHUD();
    }

    finalizeScore() {
      const state = this.state;
      if (!window.SkiPhysics) return;

      const score = window.SkiPhysics.calculateScore(state.distance, state.landingStyle, this.wind.speed);
      state.scoreDetails = score;
      this.roundScores.push(score);

      // Play fanfare if distance exceeded K-point safely
      const kPoint = (window.SkiPhysics.currentHill && window.SkiPhysics.currentHill.kPoint) || 120;
      if (state.distance >= kPoint && !state.crashed && window.SkiAudio) {
        window.SkiAudio.playFanfare();
      }

      // Trigger UI modal if window.SkiUI is available
      if (window.SkiUI && typeof window.SkiUI.showJudgeScores === 'function') {
        window.SkiUI.showJudgeScores({
          round: this.tournamentRound,
          distance: score.distance,
          landingStyle: state.landingStyle,
          distancePoints: score.distancePoints,
          judgeScores: score.judgeScores,
          totalStylePoints: score.totalStylePoints,
          stylePoints: score.totalStylePoints,
          windCompensation: score.windCompensation,
          windPoints: score.windCompensation,
          totalPoints: score.totalPoints,
          roundScores: this.roundScores
        });
      }

      // If round 2 completed, submit highscore to backend
      if (this.tournamentRound >= 2 && this.roundScores.length >= 2) {
        this.submitTournamentScore();
      }
    }

    submitTournamentScore() {
      const d1 = this.roundScores[0] ? this.roundScores[0].distance : 0;
      const d2 = this.roundScores[1] ? this.roundScores[1].distance : 0;
      const totalPoints = (this.roundScores[0] ? this.roundScores[0].totalPoints : 0) +
                          (this.roundScores[1] ? this.roundScores[1].totalPoints : 0);

      const payload = {
        name: this.jumperName,
        country: this.jumperCountry,
        hill: (window.SkiPhysics && window.SkiPhysics.currentHill.name) || 'Zakopane',
        distance1: d1,
        distance2: d2,
        totalPoints: Math.round(totalPoints * 10) / 10
      };

      // Strict relative fetch path without leading slash
      fetch('api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(leaderboard => {
        if (window.SkiUI && typeof window.SkiUI.renderLeaderboard === 'function') {
          window.SkiUI.renderLeaderboard(leaderboard);
        }
      })
      .catch(err => console.warn('Could not POST to api/leaderboard:', err));
    }

    updateHUD() {
      if (window.SkiUI && typeof window.SkiUI.updateHUD === 'function') {
        const speedKmh = Math.round((this.state.vx * 3.6 / 3.2) * 10) / 10;
        window.SkiUI.updateHUD({
          speed: this.state.phase === 'READY' ? 0 : speedKmh,
          distance: this.state.distance || (window.SkiPhysics ? window.SkiPhysics.xToMeters(this.state.x) : 0),
          windSpeed: this.wind.speed,
          windAngle: this.wind.angle,
          phase: this.state.phase,
          round: this.tournamentRound
        });
      } else {
        // Direct DOM fallbacks matching DESIGN.md
        const hudSpeed = document.getElementById('hudSpeed');
        const hudDist = document.getElementById('hudDistance');
        const hudWindSpeed = document.getElementById('hudWindSpeed');
        const hudWindAngle = document.getElementById('hudWindAngle');
        const hudPhase = document.getElementById('hudPhase');

        if (hudSpeed) hudSpeed.textContent = (this.state.phase === 'READY' ? 0 : Math.round(this.state.vx * 3.6 / 3.2)) + ' km/h';
        if (hudDist) hudDist.textContent = (this.state.distance || 0).toFixed(1) + ' m';
        if (hudWindSpeed) hudWindSpeed.textContent = (this.wind.speed > 0 ? '+' : '') + this.wind.speed.toFixed(1) + ' m/s';
        if (hudWindAngle) hudWindAngle.textContent = this.wind.angle + '°';
        if (hudPhase) hudPhase.textContent = this.state.phase;
      }
    }

    render() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // 1. Sky Gradient (Winter Dusk / TVP Polish Retro Atmosphere)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#10223d');
      skyGrad.addColorStop(0.45, '#2d5885');
      skyGrad.addColorStop(0.75, '#5d8bb3');
      skyGrad.addColorStop(1, '#a6cde3');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Save context for camera transformation
      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);

      // 2. Distant Tatra Mountains Silhouette
      this.renderMountains(ctx);

      // 3. Pine Trees on Hillside
      this.renderTrees(ctx);

      // 4. In-Run Ramp Tower & Scaffold
      this.renderInRunTower(ctx);

      // 5. Snow Hill & Distance Marking Lines (K-point, HS-point)
      this.renderHillSlope(ctx);

      // 6. Cheering Spectators & Polish Red-White Flags
      this.renderSpectators(ctx);

      // 7. Ski Jumper Character (Dynamic Sprite / Ragdoll)
      this.renderJumper(ctx);

      ctx.restore();

      // 8. Foreground Snowstorm Particles (Screen Space)
      this.renderSnowflakes(ctx);

      // 9. Retro CRT Scanline & TV Vignette Effect
      this.renderScanlines(ctx, w, h);
    }

    renderMountains(ctx) {
      ctx.fillStyle = '#223c5a';
      ctx.beginPath();
      ctx.moveTo(-200, 320);
      ctx.lineTo(80, 160);
      ctx.lineTo(260, 240);
      ctx.lineTo(440, 130);
      ctx.lineTo(680, 260);
      ctx.lineTo(950, 140);
      ctx.lineTo(1300, 340);
      ctx.lineTo(1300, 600);
      ctx.lineTo(-200, 600);
      ctx.closePath();
      ctx.fill();

      // Snowy mountain peaks
      ctx.fillStyle = '#d4e6f1';
      ctx.beginPath();
      ctx.moveTo(70, 175);
      ctx.lineTo(80, 160);
      ctx.lineTo(95, 180);
      ctx.lineTo(85, 185);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(425, 150);
      ctx.lineTo(440, 130);
      ctx.lineTo(455, 150);
      ctx.lineTo(438, 158);
      ctx.closePath();
      ctx.fill();
    }

    renderTrees(ctx) {
      if (!window.SkiPhysics) return;
      ctx.fillStyle = '#1b382b';
      // Procedural evergreen trees behind the hill
      for (let x = 180; x < 950; x += 38) {
        const groundY = window.SkiPhysics.getHillY(x);
        const treeH = 32 + (x % 7) * 3;
        ctx.beginPath();
        ctx.moveTo(x, groundY - 6);
        ctx.lineTo(x + 10, groundY - 6);
        ctx.lineTo(x + 5, groundY - treeH);
        ctx.closePath();
        ctx.fill();
      }
    }

    renderInRunTower(ctx) {
      if (!window.SkiPhysics) return;
      const startX = window.SkiPhysics.inRunStart.x;
      const startY = window.SkiPhysics.inRunStart.y;
      const tableX = window.SkiPhysics.takeoffTable.x;
      const tableY = window.SkiPhysics.takeoffTable.y;

      // Wooden / Steel Scaffold Pillars
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX, startY + 220);
      ctx.moveTo(startX + 80, startY + 45);
      ctx.lineTo(startX + 80, startY + 220);
      ctx.moveTo(tableX - 25, tableY);
      ctx.lineTo(tableX - 25, tableY + 160);
      ctx.stroke();

      // Start gate bench
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(startX - 18, startY - 14, 28, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(startX - 18, startY - 10, 28, 4);

      // In-run track surface
      ctx.beginPath();
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#90caf9'; // icy blue track
      ctx.moveTo(startX, startY);
      for (let x = startX; x <= tableX; x += 10) {
        ctx.lineTo(x, window.SkiPhysics.getHillY(x));
      }
      ctx.stroke();

      // Takeoff table edge lip
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(tableX - 6, tableY - 4, 8, 14);
    }

    renderHillSlope(ctx) {
      if (!window.SkiPhysics) return;
      const tableX = window.SkiPhysics.takeoffTable.x;
      const hill = window.SkiPhysics.currentHill || { kPoint: 120, hsPoint: 134 };
      const kX = window.SkiPhysics.metersToX(hill.kPoint || 120);
      const hsX = window.SkiPhysics.metersToX(hill.hsPoint || 134);

      // Thick pure snow slope
      ctx.beginPath();
      ctx.moveTo(tableX, window.SkiPhysics.getHillY(tableX) + 20);
      for (let x = tableX; x <= 1100; x += 12) {
        ctx.lineTo(x, window.SkiPhysics.getHillY(x));
      }
      ctx.lineTo(1100, 750);
      ctx.lineTo(tableX, 750);
      ctx.closePath();

      const snowGrad = ctx.createLinearGradient(0, 200, 0, 600);
      snowGrad.addColorStop(0, '#ffffff');
      snowGrad.addColorStop(0.6, '#e0f2fe');
      snowGrad.addColorStop(1, '#90a4ae');
      ctx.fillStyle = snowGrad;
      ctx.fill();

      // Top edge crust
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#b0bec5';
      ctx.stroke();

      // Red K-Point Line across the hill
      const ky = window.SkiPhysics.getHillY(kX);
      ctx.strokeStyle = '#d32f2f'; // Polish Broadcast Red
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(kX - 12, ky - 8);
      ctx.lineTo(kX + 12, ky + 8);
      ctx.stroke();

      ctx.fillStyle = '#d32f2f';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(`K-${hill.kPoint}`, kX - 18, ky - 14);

      // Green HS-Point Line
      const hsy = window.SkiPhysics.getHillY(hsX);
      ctx.strokeStyle = '#2e7d32'; // Forest Green
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hsX - 12, hsy - 8);
      ctx.lineTo(hsX + 12, hsy + 8);
      ctx.stroke();

      ctx.fillStyle = '#2e7d32';
      ctx.fillText(`HS-${hill.hsPoint}`, hsX - 22, hsy - 14);

      // Distance markers every 10 meters (80, 90, 100, 110, etc.)
      ctx.fillStyle = '#546e7a';
      ctx.font = '10px "Courier New", monospace';
      for (let m = 70; m <= 140; m += 10) {
        if (m === hill.kPoint || m === hill.hsPoint) continue;
        const mx = window.SkiPhysics.metersToX(m);
        const my = window.SkiPhysics.getHillY(mx);
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mx - 6, my - 4);
        ctx.lineTo(mx + 6, my + 4);
        ctx.stroke();
        ctx.fillText(`${m}m`, mx - 10, my - 7);
      }
    }

    renderSpectators(ctx) {
      if (!window.SkiPhysics) return;
      const now = performance.now() / 1000;

      for (const s of this.spectators) {
        const groundY = window.SkiPhysics.getHillY(s.x);
        const bounce = Math.sin(now * 4 + s.bobOffset) * 2;
        const y = groundY - 20 + bounce;

        // Spectator Body
        ctx.fillStyle = s.coatColor;
        ctx.fillRect(s.x - 3, y + 8, 6, 12);

        // Head with Beanie
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(s.x, y + 4, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(s.x - 3, y, 6, 3);

        // Polish Red-White Banner waving
        if (s.hasFlag) {
          const wave = Math.sin(now * 8 + s.x) * 3;
          ctx.strokeStyle = '#8d6e63';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(s.x + 3, y + 10);
          ctx.lineTo(s.x + 3, y - 12);
          ctx.stroke();

          // White upper half
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(s.x + 4, y - 12 + wave, 12, 5);
          // Red lower half
          ctx.fillStyle = '#d32f2f';
          ctx.fillRect(s.x + 4, y - 7 + wave, 12, 5);
        }
      }
    }

    renderJumper(ctx) {
      const state = this.state;
      const x = state.x;
      const y = state.y;

      ctx.save();
      ctx.translate(x, y);

      if (state.phase === 'CRASHED') {
        // Tumble ragdoll rotation
        ctx.rotate((state.tumbleAngle * Math.PI) / 180);
        this.drawJumperRagdoll(ctx);
      } else {
        // Normal pitch rotation (in-run, flight, telemark)
        const rad = (state.pitch * Math.PI) / 180;
        ctx.rotate(rad);
        if (state.phase === 'IN_RUN' || state.phase === 'READY') {
          this.drawJumperInRun(ctx);
        } else if (state.phase === 'FLIGHT') {
          this.drawJumperFlight(ctx);
        } else {
          // LANDED or SCORED
          if (state.landingStyle === 'TELEMARK') {
            this.drawJumperTelemark(ctx);
          } else {
            this.drawJumperTwoFoot(ctx);
          }
        }
      }

      ctx.restore();
    }

    drawJumperInRun(ctx) {
      // Skis parallel flat on track
      ctx.fillStyle = '#ffeb3b'; // Fluorescent yellow skis (classic Fischer/Elan)
      ctx.fillRect(-22, 10, 44, 3.5);
      ctx.fillStyle = '#1565c0'; // Ski tip accent
      ctx.fillRect(18, 8, 5, 4);

      // Crouched aerodynamic tuck (red suit, Małysz yellow helmet)
      ctx.fillStyle = '#d32f2f'; // Red suit
      ctx.beginPath();
      ctx.ellipse(-2, 2, 9, 6, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Yellow Polish Eagle Helmet
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(8, -4, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Goggles
      ctx.fillStyle = '#212121';
      ctx.fillRect(10, -5, 4, 3);
    }

    drawJumperFlight(ctx) {
      // V-Style Skis (spread apart for lift)
      ctx.fillStyle = '#ffd600';
      // Upper ski
      ctx.save();
      ctx.rotate(-0.16);
      ctx.fillRect(-24, 7, 52, 3);
      ctx.restore();
      // Lower ski
      ctx.save();
      ctx.rotate(0.18);
      ctx.fillRect(-22, 12, 50, 3);
      ctx.restore();

      // Forward leaning aerodynamic torso & legs (classic DSJ Adam pose)
      ctx.fillStyle = '#d32f2f'; // Red jumpsuit
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.lineTo(8, -10);
      ctx.lineTo(14, -8);
      ctx.lineTo(2, 10);
      ctx.closePath();
      ctx.fill();

      // Arms tucked alongside thighs
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(8, -6);
      ctx.lineTo(-6, 4);
      ctx.stroke();

      // Iconic Helmet & Visor
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(14, -12, 6, 0, Math.PI * 2);
      ctx.fill();

      // Black visor & moustache homage
      ctx.fillStyle = '#111111';
      ctx.fillRect(16, -14, 4, 3.5);
      ctx.fillRect(16, -9, 3, 1.8); // moustache
    }

    drawJumperTelemark(ctx) {
      // Front ski forward, rear ski trailing
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(-12, 11, 48, 3.5); // Lead ski
      ctx.fillRect(-28, 11, 38, 3.5); // Trailing ski

      // Telemark lunging knees
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.moveTo(-16, 11);
      ctx.lineTo(-4, -4);
      ctx.lineTo(8, 11);
      ctx.lineTo(0, 11);
      ctx.lineTo(-6, 2);
      ctx.closePath();
      ctx.fill();

      // Torso & Outstretched triumphant arms for style marks
      ctx.fillRect(-4, -14, 8, 12);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(12, -8);
      ctx.stroke();

      // Helmet
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(0, -18, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawJumperTwoFoot(ctx) {
      // Parallel flat landing
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(-20, 11, 44, 3.5);

      // Stiff knees
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(-6, -8, 12, 18);

      // Helmet
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(0, -14, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawJumperRagdoll(ctx) {
      // Skis detached flying
      ctx.fillStyle = '#ffd600';
      ctx.save();
      ctx.rotate(0.8);
      ctx.fillRect(-25, -15, 35, 3);
      ctx.restore();

      ctx.save();
      ctx.rotate(-0.9);
      ctx.fillRect(10, 12, 35, 3);
      ctx.restore();

      // Tumbled limbs
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(8, 8);
      ctx.moveTo(-8, 8);
      ctx.lineTo(8, -8);
      ctx.stroke();

      // Helmet rolling
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(10, -8, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    renderSnowflakes(ctx) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const flake of this.snowflakes) {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    renderScanlines(ctx, w, h) {
      // CRT TV scanlines effect
      ctx.fillStyle = 'rgba(10, 15, 25, 0.08)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }

      // Vignette
      const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 0.85);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Instantiate and expose globally
  window.SkiGame = new SkiGameEngine();

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.SkiGame.init();
    });
  } else {
    window.SkiGame.init();
  }
})();
