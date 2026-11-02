/**
 * renderer.js - 2D Canvas Procedural Ski Jump Renderer
 * Sprint 1.0 (SCRUM-173), Sprint 2.0 (SCRUM-176), Sprint 3.0 (SCRUM-180), Sprint 4.0 (SCRUM-186)
 *
 * Sprint 4.0 Enhancements (SCRUM-186):
 * - Dynamic Camera Slope Tracking: Smoothly follows the jumper descending down the steep mountain slope (y drop),
 *   framing the skier in the upper-center third and dynamically expanding zoom (targetScale ~ 2.65 in FLIGHT)
 *   so the player has high visibility of the slope drop and flight cushion ahead.
 * - Steep Terrain Profile Visuals: High-contrast vertical table drop face (3.0m - 3.8m deep metallic/stone wall below lip).
 *   FIS standard distance markers on the steep landing slope:
 *   - Blue P-Point (Knoll / Bula limit)
 *   - Bright Red K-Point (Critical point)
 *   - Neon Yellow / Gold HS-Point (Hill Size)
 *   - Emerald Green Hill Record line with official distance and record-holder banner.
 * - Retro DSJ CRT aesthetics, procedural snow, crowd, and tree placement conforming to steep hill geometry.
 */

(function (window) {
  'use strict';

  const SkiRenderer = {
    canvas: null,
    ctx: null,
    width: 960,
    height: 540,

    // Camera viewport offset and scale in world units
    camera: {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      scale: 3.4,
      targetScale: 4.2
    },

    // Procedural background and weather state
    snowParticles: [],
    mountainPeaks: [],
    pineTrees: [],
    cheeringCrowd: [],

    // Gate Clearance Animation state
    gateAnimation: {
      prevPhase: 'GATE',
      isClearing: false,
      liftProgress: 0, // 0 (bar lowered / resting) -> 1 (fully cleared / pivoted up)
      clearTimer: 0,
      snowPuffs: [] // dynamic particles when jumper pushes off
    },

    /**
     * Initializes the canvas and pregenerates background scenery
     * @param {HTMLCanvasElement|string} canvasElement
     */
    init(canvasElement) {
      if (typeof canvasElement === 'string') {
        this.canvas = document.getElementById(canvasElement);
      } else {
        this.canvas = canvasElement;
      }

      if (!this.canvas) {
        console.warn('SkiRenderer.init: canvas element not found yet.');
        return;
      }

      this.ctx = this.canvas.getContext('2d');
      this.width = this.canvas.width || 960;
      this.height = this.canvas.height || 540;

      this._initWeatherParticles();
      this._initScenery();
    },

    _initWeatherParticles() {
      this.snowParticles = [];
      const count = 120;
      for (let i = 0; i < count; i++) {
        this.snowParticles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 2.2 + 0.8,
          speedY: Math.random() * 1.5 + 0.8,
          speedX: (Math.random() - 0.3) * 1.0,
          opacity: Math.random() * 0.6 + 0.3
        });
      }
    },

    _initScenery() {
      // Background mountains
      this.mountainPeaks = [
        { x: -200, y: 220, w: 450, h: 260, color: '#16233b' },
        { x: 150, y: 190, w: 500, h: 300, color: '#1a2b48' },
        { x: 500, y: 210, w: 520, h: 280, color: '#142036' },
        { x: 880, y: 230, w: 480, h: 250, color: '#182740' }
      ];

      // Procedural trees along the hill slopes
      this.pineTrees = [];
      for (let x = -80; x < 320; x += 12) {
        if (x > -8 && x < 8) continue; // skip takeoff lip
        this.pineTrees.push({
          worldX: x + (Math.random() * 6 - 3),
          height: 12 + Math.random() * 10,
          width: 6 + Math.random() * 4,
          tint: Math.random() > 0.5 ? '#103020' : '#0a2216'
        });
      }

      // Spectator stands dots
      this.cheeringCrowd = [];
      const crowdColors = ['#e63946', '#457b9d', '#f1faee', '#e9c46a', '#2a9d8f', '#ffb703'];
      for (let i = 0; i < 110; i++) {
        this.cheeringCrowd.push({
          worldX: 40 + (i * 2.4) + Math.random() * 1.5,
          color: crowdColors[i % crowdColors.length],
          bobOffset: Math.random() * Math.PI * 2,
          bobSpeed: 3 + Math.random() * 4
        });
      }
    },

    /**
     * Updates camera smoothly tracking the jumper
     * Sprint 4.0 (SCRUM-186):
     * - In FLIGHT phase, tracks skier along steep descending mountain grade (y descent),
     *   keeping skier in upper-center third with visible terrain drop below.
     * - Target scale dynamic expansion: targetScale = 2.65 during high flight, framing both skier and slope drop.
     */
    updateCamera(physicsState) {
      if (!physicsState) return;

      const px = physicsState.x || 0;
      const py = physicsState.y || 0;
      const phase = physicsState.phase || 'GATE';

      // Desired camera target in world coordinates
      if (phase === 'GATE') {
        // Close-up on starting gate and jumper sitting on bar
        this.camera.targetX = px + 8;
        this.camera.targetY = py - 3;
        this.camera.targetScale = 4.2;
      } else if (phase === 'INRUN') {
        // Camera leads ahead towards table lip (x=0) so player anticipates takeoff timing
        this.camera.targetX = px + 14;
        this.camera.targetY = py - 3.5;
        this.camera.targetScale = 3.35;
      } else if (phase === 'FLIGHT') {
        // Dynamic camera tracking down the steep slope drop:
        // Skier descends rapidly down y; lead X ahead by 22m and Y down slightly (+8m)
        // to place skier in upper-center third with slope drop and K-point clearly visible ahead.
        this.camera.targetX = px + 22;
        this.camera.targetY = py + 8.5;
        this.camera.targetScale = 2.65;
      } else {
        // Landing & outrun: smoothly frame the skier deceleration in the basin
        this.camera.targetX = px + 12;
        this.camera.targetY = py + 2;
        this.camera.targetScale = 2.95;
      }

      // Smooth lerp camera
      const lerpFactor = (phase === 'FLIGHT') ? 0.10 : 0.08;
      this.camera.x += (this.camera.targetX - this.camera.x) * lerpFactor;
      this.camera.y += (this.camera.targetY - this.camera.y) * lerpFactor;
      this.camera.scale += (this.camera.targetScale - this.camera.scale) * lerpFactor;
    },

    /**
     * Converts world meter coordinates to canvas screen pixel coordinates
     */
    worldToScreen(wx, wy) {
      const cx = this.width * 0.40; // Focal center on screen
      const cy = this.height * 0.45;
      const sx = cx + (wx - this.camera.x) * this.camera.scale;
      const sy = cy + (wy - this.camera.y) * this.camera.scale;
      return { x: sx, y: sy };
    },

    /**
     * Updates gate clearance animation and snow dust particles
     */
    _updateGateAnimation(physicsState, dt) {
      const currentPhase = (physicsState && physicsState.phase) ? physicsState.phase : 'GATE';
      const anim = this.gateAnimation;

      // Detect transition from GATE -> INRUN (push-off)
      if (anim.prevPhase === 'GATE' && currentPhase === 'INRUN') {
        anim.isClearing = true;
        anim.clearTimer = 0;
        anim.liftProgress = 0;

        // Spawn dynamic snow puff particles at the gate
        const hill = physicsState ? physicsState.hill : null;
        const physics = window.SkiPhysics;
        if (physics && physics.getInrunPos) {
          const gatePos = physics.getInrunPos(hill, 0);
          const screenGate = this.worldToScreen(gatePos.x, gatePos.y);

          anim.snowPuffs = [];
          for (let i = 0; i < 28; i++) {
            const angle = Math.PI * 0.9 + Math.random() * Math.PI * 0.6; // puff backwards & upwards
            const speed = 1.2 + Math.random() * 2.8;
            anim.snowPuffs.push({
              x: screenGate.x - 6 + (Math.random() * 12 - 6),
              y: screenGate.y + 2 + (Math.random() * 4 - 2),
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 0.5,
              radius: 1.5 + Math.random() * 2.8,
              opacity: 0.85 + Math.random() * 0.15,
              life: 0,
              maxLife: 0.6 + Math.random() * 0.5
            });
          }
        }
      } else if (currentPhase === 'GATE') {
        // Reset when back at gate
        anim.isClearing = false;
        anim.liftProgress = 0;
        anim.clearTimer = 0;
        anim.snowPuffs = [];
      }

      anim.prevPhase = currentPhase;

      // Progress lift animation if clearing
      if (anim.isClearing) {
        anim.clearTimer += (dt || 0.016);
        anim.liftProgress = Math.min(1.0, anim.clearTimer / 0.45);
      }

      // Update snow puffs
      if (anim.snowPuffs && anim.snowPuffs.length > 0) {
        for (let i = anim.snowPuffs.length - 1; i >= 0; i--) {
          const p = anim.snowPuffs[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05; // gentle gravity
          p.radius += 0.04; // expand
          p.life += (dt || 0.016);
          p.opacity = Math.max(0, 1 - (p.life / p.maxLife));
          if (p.life >= p.maxLife) {
            anim.snowPuffs.splice(i, 1);
          }
        }
      }
    },

    /**
     * Main Draw Frame
     * @param {Object} hill - Hill data object
     * @param {Object} physicsState - Physics snapshot
     * @param {Object} [weather] - { snowIntensity, windSpeed }
     */
    draw(hill, physicsState, weather) {
      if (!this.ctx) {
        if (this.canvas) this.ctx = this.canvas.getContext('2d');
        else return;
      }

      const ctx = this.ctx;
      this.updateCamera(physicsState);
      this._updateGateAnimation(physicsState, 0.016);

      // Clear & Draw Sky Gradient (Alpine winter twilight / stadium night glow)
      this._drawSky(ctx);

      // Parallax Mountains
      this._drawMountains(ctx);

      // Save transform for world rendering
      ctx.save();

      // Draw Inrun Tower structure & Inrun slope track (with enhanced metallic scaffolding, starting bar & hazard pads)
      this._drawInrunStructure(ctx, hill, physicsState);

      // Draw Landing Hill Profile & Snow terrain with steep FIS knoll drop
      this._drawLandingHill(ctx, hill);

      // Draw Distance Markers (Blue P-Point, Red K-Point, Gold HS-Point, Emerald Record Line)
      this._drawDistanceMarkers(ctx, hill);

      // Draw Pine trees & Cheering crowd
      this._drawScenery(ctx, hill, physicsState);

      // Draw Trajectory flight trail
      this._drawFlightTrail(ctx, physicsState);

      // Draw Skier Sprite with dynamic posture
      if (physicsState) {
        this._drawSkier(ctx, physicsState);
      }

      // Draw Gate Clearance Snow Puffs
      this._drawGateSnowPuffs(ctx);

      ctx.restore();

      // Foreground Falling Snow
      this._drawSnow(ctx, physicsState ? physicsState.wind : null);

      // Retro CRT Scanlines & Vignette overlay
      this._drawRetroCRT(ctx);
    },

    _drawSky(ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#09101f'); // deep winter night blue
      grad.addColorStop(0.5, '#13203b');
      grad.addColorStop(1, '#223859'); // stadium floodlit horizon
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Stadium floodlight glow cone
      ctx.save();
      const floodGrad = ctx.createRadialGradient(
        this.width * 0.35, this.height * 0.15, 20,
        this.width * 0.35, this.height * 0.15, 380
      );
      floodGrad.addColorStop(0, 'rgba(255, 248, 220, 0.22)');
      floodGrad.addColorStop(1, 'rgba(255, 248, 220, 0)');
      ctx.fillStyle = floodGrad;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    },

    _drawMountains(ctx) {
      ctx.save();
      const pOffset = (this.camera.x * 0.15); // gentle parallax

      for (const m of this.mountainPeaks) {
        ctx.fillStyle = m.color;
        ctx.beginPath();
        const startX = m.x - pOffset;
        ctx.moveTo(startX, this.height);
        ctx.lineTo(startX + m.w * 0.5, this.height - m.h);
        ctx.lineTo(startX + m.w, this.height);
        ctx.closePath();
        ctx.fill();

        // Snowy peak cap
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(startX + m.w * 0.38, this.height - m.h * 0.76);
        ctx.lineTo(startX + m.w * 0.5, this.height - m.h);
        ctx.lineTo(startX + m.w * 0.62, this.height - m.h * 0.76);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    /**
     * Enhanced Inrun Structure Rendering
     * Renders heavy metallic scaffolding, yellow/black hazard diagonal stripes, starting tower,
     * high-contrast starting bar beam, take-off warning track, sweet spot glow,
     * high-contrast table lip, and guide flags.
     */
    _drawInrunStructure(ctx, hill, physicsState) {
      ctx.save();
      const physics = window.SkiPhysics;
      const getInrunPos = physics ? physics.getInrunPos : null;

      if (!getInrunPos) {
        ctx.restore();
        return;
      }

      const samples = 36;
      const points = [];
      const worldPoints = [];
      for (let i = 0; i <= samples; i++) {
        const s = i / samples;
        const pos = getInrunPos(hill, s);
        worldPoints.push(pos);
        const screenPos = this.worldToScreen(pos.x, pos.y);
        points.push(screenPos);
      }

      const gateScreen = points[0];

      // 1. Draw Starting Tower Structure & Platform behind gate
      this._drawStartingTower(ctx, gateScreen);

      // 2. Heavy steel metallic lattice scaffolding under inrun track
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.8;

      for (let i = 0; i < points.length; i += 4) {
        // Main pillar
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[i].x, points[i].y + 175);
        ctx.stroke();

        // Highlight sheen
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(points[i].x + 1, points[i].y);
        ctx.lineTo(points[i].x + 1, points[i].y + 175);
        ctx.stroke();

        // Cross bracing trusses
        if (i + 4 < points.length) {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y + 35);
          ctx.lineTo(points[i + 4].x, points[i + 4].y + 115);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y + 115);
          ctx.lineTo(points[i + 4].x, points[i + 4].y + 35);
          ctx.stroke();
        }
      }

      // 3. Inrun track surface (snow bed & ceramic track groove)
      ctx.lineWidth = 5.0;
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Guard rails with safety cyan glow
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y - 4.0);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y - 4.0);
      }
      ctx.stroke();

      // 4. Takeoff Zone Rendering: warning stripes, sweet spot pulsing glow, table lip, stop block, and guide flags
      this._drawTakeoffZone(ctx, hill, physicsState);

      // 5. Draw Starting Gate Slot, Hazard Pads & Bar Beam
      this._drawStartingGate(ctx, gateScreen, physicsState);

      ctx.restore();
    },

    /**
     * Take-Off Zone Visualization (SCRUM-180 & SCRUM-186)
     * - Table drop face: High-contrast vertical metallic foundation wall (3.0m - 3.8m deep)
     * - Warning track chevrons
     * - Sweet spot neon glow
     * - Stop block and threshold guide flags
     */
    _drawTakeoffZone(ctx, hill, physicsState) {
      const physics = window.SkiPhysics;
      const getInrunPos = physics ? physics.getInrunPos : null;
      if (!getInrunPos) return;

      const inrunLen = (hill && hill.inrunLength) ? hill.inrunLength : 98.7;
      const takeoffCfg = (hill && hill.takeoffConfig) ? hill.takeoffConfig : {
        warningZoneLen: 12.0,
        sweetSpotLen: 2.8,
        lipHeight: 3.2
      };

      const warnLen = takeoffCfg.warningZoneLen || 12.0;
      const sweetLen = takeoffCfg.sweetSpotLen || 2.8;

      ctx.save();

      // 1. Render Red/White Warning Track Stripes along the inrun track bed
      const numStripes = 16;
      for (let i = 0; i < numStripes; i++) {
        const dist1 = warnLen * (1 - (i / numStripes));
        const dist2 = warnLen * (1 - ((i + 1) / numStripes));

        const s1 = Math.max(0, 1 - (dist1 / inrunLen));
        const s2 = Math.max(0, 1 - (dist2 / inrunLen));

        const pos1 = getInrunPos(hill, s1);
        const pos2 = getInrunPos(hill, s2);

        const sp1 = this.worldToScreen(pos1.x, pos1.y);
        const sp2 = this.worldToScreen(pos2.x, pos2.y);

        const isRed = (i % 2 === 0);
        ctx.strokeStyle = isRed ? '#ef4444' : '#ffffff';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(sp1.x, sp1.y);
        ctx.lineTo(sp2.x, sp2.y);
        ctx.stroke();

        if (i % 2 === 0) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(sp1.x, sp1.y - 2);
          ctx.lineTo(sp1.x + 1.5, sp1.y + 2);
          ctx.stroke();
        }
      }

      // 2. Render Sweet Spot Zone with pulsing neon glow
      const phase = physicsState ? physicsState.phase : 'GATE';
      const inrunProgress = (physicsState && typeof physicsState.inrunProgress === 'number') ? physicsState.inrunProgress : 0;
      const distRemaining = (1 - inrunProgress) * inrunLen;
      const inSweetSpot = (phase === 'INRUN' && distRemaining >= 0.2 && distRemaining <= (sweetLen + 0.6));

      const sweetStartDist = sweetLen + 0.4;
      const sweetEndDist = 0.4;
      const sSweet1 = Math.max(0, 1 - (sweetStartDist / inrunLen));
      const sSweet2 = Math.max(0, 1 - (sweetEndDist / inrunLen));

      const sweetPos1 = getInrunPos(hill, sSweet1);
      const sweetPos2 = getInrunPos(hill, sSweet2);

      const spSweet1 = this.worldToScreen(sweetPos1.x, sweetPos1.y);
      const spSweet2 = this.worldToScreen(sweetPos2.x, sweetPos2.y);

      const now = performance.now() * 0.008;
      const pulse = inSweetSpot ? (0.75 + 0.25 * Math.sin(now * 3.5)) : (0.55 + 0.2 * Math.sin(now * 1.5));
      const glowColor = inSweetSpot ? `rgba(34, 197, 94, ${pulse})` : `rgba(56, 189, 248, ${pulse})`;

      ctx.save();
      ctx.lineWidth = inSweetSpot ? 8.0 : 6.0;
      ctx.strokeStyle = glowColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(spSweet1.x, spSweet1.y - 1);
      ctx.lineTo(spSweet2.x, spSweet2.y - 1);
      ctx.stroke();

      ctx.lineWidth = inSweetSpot ? 3.2 : 2.4;
      ctx.strokeStyle = inSweetSpot ? '#86efac' : '#a5f3fc';
      ctx.beginPath();
      ctx.moveTo(spSweet1.x, spSweet1.y - 1);
      ctx.lineTo(spSweet2.x, spSweet2.y - 1);
      ctx.stroke();

      ctx.fillStyle = inSweetSpot ? '#22c55e' : '#38bdf8';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('⚡ SWEET SPOT', spSweet1.x - 2, spSweet1.y - 8);
      ctx.restore();

      // 3. High-Contrast Table Lip at (x=0, y=0) & Vertical Table Drop Wall (SCRUM-186)
      const lipWorld = getInrunPos(hill, 1.0); // (0, 0)
      const lipScreen = this.worldToScreen(lipWorld.x, lipWorld.y);

      // Vertical table drop height (ht ~ 3.0m - 3.8m deep below lip)
      const ht = (hill && hill.knollDrop !== undefined) ? hill.knollDrop :
                 ((hill && hill.tableHeight !== undefined) ? hill.tableHeight : (takeoffCfg.lipHeight || 3.4));

      const lipDropBottom = this.worldToScreen(0, ht);

      // Deep dark metallic/stone wall below lip
      const wallWidth = 10;
      const wallHeight = Math.max(16, lipDropBottom.y - lipScreen.y);

      // Wall shadow and metallic masonry texture
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(lipScreen.x - wallWidth, lipScreen.y, wallWidth, wallHeight);

      // Vertical masonry panels
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(lipScreen.x - wallWidth, lipScreen.y, wallWidth, wallHeight);

      // Table drop hazard edge border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(lipScreen.x, lipScreen.y);
      ctx.lineTo(lipScreen.x, lipDropBottom.y);
      ctx.stroke();

      // High-contrast edge stop block (bright red neon hazard pad)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(lipScreen.x - 3, lipScreen.y - 2, 4, 16);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(lipScreen.x - 3, lipScreen.y - 2, 4, 16);

      // Brilliant neon white line right on takeoff edge (x = 0)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(lipScreen.x, lipScreen.y - 4);
      ctx.lineTo(lipScreen.x, lipScreen.y + 14);
      ctx.stroke();

      // 4. Threshold Guide Flags (🚩 EDGE / TAKEOFF)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(lipScreen.x, lipScreen.y);
      ctx.lineTo(lipScreen.x, lipScreen.y - 28);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(lipScreen.x, lipScreen.y - 28, 2.0, 0, Math.PI * 2);
      ctx.fill();

      const flagWave = Math.sin(now * 2.0) * 1.5;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(lipScreen.x, lipScreen.y - 28);
      ctx.lineTo(lipScreen.x + 18 + flagWave, lipScreen.y - 22);
      ctx.lineTo(lipScreen.x, lipScreen.y - 16);
      ctx.closePath();
      ctx.fill();

      // Guide banner badge above lip
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(lipScreen.x - 18, lipScreen.y - 42, 38, 11);
      ctx.strokeStyle = inSweetSpot ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(lipScreen.x - 18, lipScreen.y - 42, 38, 11);

      ctx.fillStyle = inSweetSpot ? '#86efac' : '#ffffff';
      ctx.font = 'bold 6.5px monospace';
      ctx.fillText('🚩 EDGE', lipScreen.x - 14, lipScreen.y - 34);

      ctx.restore();
    },

    /**
     * Draws starting tower housing & platform
     */
    _drawStartingTower(ctx, gateScreen) {
      ctx.save();
      const towerX = gateScreen.x - 42;
      const towerY = gateScreen.y - 48;
      const towerW = 42;
      const towerH = 120;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(towerX, towerY, towerW, towerH);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(towerX - 4, towerY - 6, towerW + 8, 8);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(towerX + 2, towerY + 3, towerW - 4, 7);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('FIS TOWER', towerX + 5, towerY + 8);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(towerX, towerY, towerW, towerH);

      ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.fillRect(towerX + 6, towerY + 14, 12, 10);
      ctx.fillRect(towerX + 22, towerY + 14, 12, 10);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(towerX, gateScreen.y + 12);
      ctx.lineTo(gateScreen.x, gateScreen.y + 4);
      ctx.stroke();

      ctx.restore();
    },

    /**
     * Draws starting gate platform, hazard pads and starting bar beam
     */
    _drawStartingGate(ctx, gateScreen, physicsState) {
      ctx.save();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gateScreen.x - 22, gateScreen.y - 12, 22, 16);

      this._drawHazardPad(ctx, gateScreen.x - 22, gateScreen.y - 12, 22, 5);
      this._drawHazardPad(ctx, gateScreen.x - 22, gateScreen.y + 2, 22, 4);

      ctx.fillStyle = '#334155';
      ctx.fillRect(gateScreen.x - 14, gateScreen.y - 24, 4, 26);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(gateScreen.x - 13, gateScreen.y - 22, 2, 22);

      ctx.fillStyle = '#334155';
      ctx.fillRect(gateScreen.x - 4, gateScreen.y - 24, 4, 26);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(gateScreen.x - 3, gateScreen.y - 22, 2, 22);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(gateScreen.x - 16, gateScreen.y - 26, 18, 4);

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(gateScreen.x - 14, gateScreen.y - 32, 14, 6);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 5px monospace';
      ctx.fillText('GATE 12', gateScreen.x - 13, gateScreen.y - 27);

      const anim = this.gateAnimation;
      const liftProgress = anim.liftProgress || 0;

      const barBaseY = gateScreen.y - 6 - (liftProgress * 18);
      const barRotation = -liftProgress * 0.45;

      ctx.save();
      ctx.translate(gateScreen.x - 14, barBaseY);
      ctx.rotate(barRotation);

      ctx.fillStyle = '#000000';
      ctx.fillRect(-2, -3, 18, 6);

      this._drawHazardPad(ctx, -1, -2, 16, 4);

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-2, -3, 18, 6);

      ctx.fillStyle = liftProgress > 0.1 ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 5px monospace';
      ctx.fillText('BAR', 3, 1.5);

      ctx.restore();
      ctx.restore();
    },

    _drawHazardPad(ctx, x, y, width, height) {
      ctx.save();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x, y, width, height);

      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;

      const step = 4.5;
      for (let sx = x - height; sx < x + width + height; sx += step) {
        ctx.beginPath();
        ctx.moveTo(sx, y + height);
        ctx.lineTo(sx + height, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
    },

    _drawGateSnowPuffs(ctx) {
      const anim = this.gateAnimation;
      if (!anim.snowPuffs || anim.snowPuffs.length === 0) return;

      ctx.save();
      for (const p of anim.snowPuffs) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    /**
     * Renders steep FIS Landing Hill Profile & Snow terrain (SCRUM-186)
     * Utilizes HillData.getGroundY or SkiPhysics.getGroundY
     */
    _drawLandingHill(ctx, hill) {
      ctx.save();
      const getGroundY = (window.HillData && typeof window.HillData.getGroundY === 'function')
        ? window.HillData.getGroundY
        : (window.SkiPhysics ? window.SkiPhysics.getGroundY : null);

      if (!getGroundY) {
        ctx.restore();
        return;
      }

      const k = (hill && hill.kPoint) ? hill.kPoint : 120;
      const hs = (hill && hill.hsPoint) ? hill.hsPoint : Math.round(k * 1.15);
      const endX = hs + 80;

      const step = 2.0; // high sampling resolution for steep curve
      const screenPoints = [];

      for (let wx = 0; wx <= endX; wx += step) {
        const wy = getGroundY(hill, wx);
        screenPoints.push(this.worldToScreen(wx, wy));
      }

      if (screenPoints.length < 2) {
        ctx.restore();
        return;
      }

      // Terrain body polygon fill
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
      }
      const last = screenPoints[screenPoints.length - 1];
      ctx.lineTo(last.x, this.height + 250);
      ctx.lineTo(screenPoints[0].x, this.height + 250);
      ctx.closePath();

      // Snow gradient with deep winter rock/dirt underneath
      const groundGrad = ctx.createLinearGradient(0, screenPoints[0].y, 0, this.height + 250);
      groundGrad.addColorStop(0, '#f8fafc'); // fresh packed white snow
      groundGrad.addColorStop(0.04, '#e2e8f0');
      groundGrad.addColorStop(0.12, '#94a3b8');
      groundGrad.addColorStop(0.35, '#334155');
      groundGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = groundGrad;
      ctx.fill();

      // Packed snow surface highlight stroke
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
      }
      ctx.stroke();

      ctx.restore();
    },

    /**
     * Distance Markers (SCRUM-186)
     * Renders authentic FIS markers adapted to the steep hill geometry:
     * - Blue P-Point (Knoll / Bula limit)
     * - Bright Red K-Point (Critical point)
     * - Neon Yellow / Gold HS-Point (Hill Size)
     * - Emerald Green Hill Record line with official distance and record-holder banner
     */
    _drawDistanceMarkers(ctx, hill) {
      ctx.save();
      const getGroundY = (window.HillData && typeof window.HillData.getGroundY === 'function')
        ? window.HillData.getGroundY
        : (window.SkiPhysics ? window.SkiPhysics.getGroundY : null);

      const getSlopeAngle = (window.HillData && typeof window.HillData.getGroundSlopeAngle === 'function')
        ? window.HillData.getGroundSlopeAngle
        : (window.SkiPhysics ? window.SkiPhysics.getGroundSlopeAngle : null);

      if (!getGroundY) {
        ctx.restore();
        return;
      }

      const k = (hill && hill.kPoint) ? hill.kPoint : 120;
      const hs = (hill && hill.hsPoint) ? hill.hsPoint : Math.round(k * 1.15);
      const p = Math.round(k * 0.78);
      const record = (hill && hill.record) ? hill.record : Math.round(hs + 4);
      const holder = (hill && hill.recordHolder) ? hill.recordHolder : 'World Record';

      // FIS Landing markers along steep mountain slope
      const markers = [
        {
          dist: p,
          label: `P-${p}m`,
          banner: 'P-POINT',
          color: '#38bdf8', // Blue P-point (Bula)
          lineWidth: 2.8,
          isMajor: true
        },
        {
          dist: Math.round(k * 0.9),
          label: `${Math.round(k * 0.9)}m`,
          banner: null,
          color: '#94a3b8',
          lineWidth: 1.2,
          isMajor: false
        },
        {
          dist: k,
          label: `K-${k}m`,
          banner: 'K-POINT',
          color: '#ef4444', // FIS Bright Red K-Point line
          lineWidth: 3.5,
          isMajor: true,
          glowColor: 'rgba(239, 68, 68, 0.45)'
        },
        {
          dist: hs,
          label: `HS-${hs}m`,
          banner: 'HILL SIZE',
          color: '#fbbf24', // FIS Neon Yellow/Gold HS line
          lineWidth: 3.2,
          isMajor: true,
          glowColor: 'rgba(251, 191, 36, 0.4)'
        },
        {
          dist: record,
          label: `REC ${record}m`,
          banner: `RECORD: ${holder} (${record}m)`,
          color: '#10b981', // Emerald Green Hill Record Line
          lineWidth: 3.5,
          isMajor: true,
          glowColor: 'rgba(16, 185, 129, 0.5)'
        }
      ];

      for (const m of markers) {
        // Horizontal projection along steep slope
        const wx = m.dist * 0.88;
        const wy = getGroundY(hill, wx);
        const sp = this.worldToScreen(wx, wy);

        // Ground slope normal angle for perpendicular marker line
        const slopeDeg = getSlopeAngle ? getSlopeAngle(hill, wx) : 35;
        const normRad = ((slopeDeg - 90) * Math.PI) / 180;

        const lineLen = m.isMajor ? 18 : 10;
        const dx = Math.cos(normRad) * lineLen;
        const dy = Math.sin(normRad) * lineLen;

        // Glow for major FIS lines
        if (m.glowColor) {
          ctx.strokeStyle = m.glowColor;
          ctx.lineWidth = m.lineWidth + 3.0;
          ctx.beginPath();
          ctx.moveTo(sp.x - dx, sp.y - dy);
          ctx.lineTo(sp.x + dx * 0.5, sp.y + dy * 0.5);
          ctx.stroke();
        }

        // Primary painted marker line across snow slope
        ctx.strokeStyle = m.color;
        ctx.lineWidth = m.lineWidth;
        ctx.beginPath();
        ctx.moveTo(sp.x - dx, sp.y - dy);
        ctx.lineTo(sp.x + dx * 0.5, sp.y + dy * 0.5);
        ctx.stroke();

        // Distance text label above line
        ctx.font = 'bold 9px "Courier New", monospace';
        ctx.fillStyle = m.color;
        ctx.fillText(m.label, sp.x - 16, sp.y - 14);

        // Banner badge for major lines
        if (m.banner) {
          const bannerText = m.banner;
          const textWidth = ctx.measureText(bannerText).width;
          const boxW = textWidth + 12;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(sp.x - boxW * 0.5, sp.y + 14, boxW, 13);
          ctx.strokeStyle = m.color;
          ctx.lineWidth = 1.0;
          ctx.strokeRect(sp.x - boxW * 0.5, sp.y + 14, boxW, 13);

          ctx.fillStyle = m.color;
          ctx.font = 'bold 8px "Courier New", monospace';
          ctx.fillText(bannerText, sp.x - boxW * 0.5 + 6, sp.y + 24);
        }
      }

      ctx.restore();
    },

    _drawScenery(ctx, hill, physicsState) {
      ctx.save();
      const getGroundY = (window.HillData && typeof window.HillData.getGroundY === 'function')
        ? window.HillData.getGroundY
        : (window.SkiPhysics ? window.SkiPhysics.getGroundY : null);

      if (!getGroundY) {
        ctx.restore();
        return;
      }

      // Pine trees along slope
      for (const tree of this.pineTrees) {
        const gy = getGroundY(hill, tree.worldX);
        const sp = this.worldToScreen(tree.worldX, gy);

        ctx.fillStyle = tree.tint;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y - tree.height);
        ctx.lineTo(sp.x - tree.width * 0.5, sp.y);
        ctx.lineTo(sp.x + tree.width * 0.5, sp.y);
        ctx.closePath();
        ctx.fill();

        // Snow on pine branches
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y - tree.height);
        ctx.lineTo(sp.x - tree.width * 0.35, sp.y - tree.height * 0.45);
        ctx.lineTo(sp.x + tree.width * 0.35, sp.y - tree.height * 0.45);
        ctx.closePath();
        ctx.fill();
      }

      // Cheering crowd spectators
      const now = performance.now() * 0.003;
      for (const fan of this.cheeringCrowd) {
        const gy = getGroundY(hill, fan.worldX);
        const sp = this.worldToScreen(fan.worldX, gy);

        const bob = Math.sin(now * fan.bobSpeed + fan.bobOffset) * 2.2;
        const headY = sp.y - 10 + bob;

        ctx.fillStyle = fan.color;
        ctx.fillRect(sp.x - 1.5, headY + 3, 3, 5);
        ctx.beginPath();
        ctx.arc(sp.x, headY + 1.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },

    _drawFlightTrail(ctx, physicsState) {
      if (!physicsState || !physicsState.trail || physicsState.trail.length < 2) return;

      ctx.save();
      const trail = physicsState.trail;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      for (let i = 1; i < trail.length; i++) {
        const p1 = this.worldToScreen(trail[i - 1].x, trail[i - 1].y);
        const p2 = this.worldToScreen(trail[i].x, trail[i].y);

        const progress = i / trail.length;
        ctx.strokeStyle = `rgba(56, 189, 248, ${progress * 0.75})`;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    },

    _drawSkier(ctx, physicsState) {
      ctx.save();
      const sp = this.worldToScreen(physicsState.x, physicsState.y);

      ctx.translate(sp.x, sp.y);
      const pitchRad = ((physicsState.angle || 0) * Math.PI) / 180;
      ctx.rotate(pitchRad);

      const phase = physicsState.phase || 'GATE';
      const isCrash = physicsState.isCrash;
      const isTelemark = physicsState.isTelemark;

      if (isCrash) {
        this._renderCrashPose(ctx);
      } else if (phase === 'FLIGHT') {
        this._renderFlightPose(ctx, physicsState.skierLean || 0);
      } else if (phase === 'LANDING' && isTelemark) {
        this._renderTelemarkPose(ctx);
      } else if (phase === 'INRUN' || phase === 'GATE') {
        this._renderInrunCrouchPose(ctx);
      } else {
        this._renderUprightPose(ctx);
      }

      ctx.restore();
    },

    _renderInrunCrouchPose(ctx) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-16, 2);
      ctx.lineTo(16, 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(16, 2);
      ctx.lineTo(19, -1);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3, 0, 6, 2);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(5, -6);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, -6);
      ctx.lineTo(-7, -4);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(7, -7, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, -8, 2, 2);
    },

    _renderFlightPose(ctx, lean) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.4;

      ctx.beginPath();
      ctx.moveTo(-18, 1);
      ctx.lineTo(18, -2);
      ctx.lineTo(21, -5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-17, 3);
      ctx.lineTo(17, 5);
      ctx.lineTo(20, 3);
      ctx.stroke();

      const forwardShift = 2 + lean * 3.5;
      const headX = 8 + forwardShift;
      const headY = -8 + lean * 2.0;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.lineTo(headX - 6, headY + 3);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(headX - 5, headY + 2);
      ctx.lineTo(headX - 10, headY + 4);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(headX, headY, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(headX + 1, headY - 1, 2, 2);
    },

    _renderTelemarkPose(ctx) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.4;

      ctx.beginPath();
      ctx.moveTo(-12, 1);
      ctx.lineTo(20, 1);
      ctx.lineTo(23, -2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-20, 2);
      ctx.lineTo(10, 2);
      ctx.lineTo(13, -1);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(-6, 2);
      ctx.lineTo(-2, -5);
      ctx.lineTo(6, 1);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-1, -5);
      ctx.lineTo(0, -14);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(-8, -16);
      ctx.moveTo(0, -11);
      ctx.lineTo(8, -16);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -16, 3.2, 0, Math.PI * 2);
      ctx.fill();
    },

    _renderUprightPose(ctx) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-15, 2);
      ctx.lineTo(17, 2);
      ctx.lineTo(20, -1);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(1, -7);
      ctx.lineTo(2, -14);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -11);
      ctx.lineTo(-2, -5);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(2, -16, 3.2, 0, Math.PI * 2);
      ctx.fill();
    },

    _renderCrashPose(ctx) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(-2, -16);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(8, -12);
      ctx.lineTo(18, -4);
      ctx.stroke();

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(-2, -8);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(6, -2, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(0, -2, 6, 0, Math.PI * 2);
      ctx.arc(7, -1, 5, 0, Math.PI * 2);
      ctx.arc(-6, -1, 4, 0, Math.PI * 2);
      ctx.fill();
    },

    _drawSnow(ctx, wind) {
      ctx.save();
      const windForceX = (wind && typeof wind.x === 'number') ? wind.x * 0.7 : 0.5;

      for (const p of this.snowParticles) {
        p.x += p.speedX + windForceX;
        p.y += p.speedY;

        if (p.y > this.height) {
          p.y = -5;
          p.x = Math.random() * this.width;
        }
        if (p.x > this.width) p.x = 0;
        if (p.x < 0) p.x = this.width;

        ctx.fillStyle = `rgba(240, 248, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    _drawRetroCRT(ctx) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let y = 0; y < this.height; y += 3) {
        ctx.fillRect(0, y, this.width, 1);
      }

      const vignette = ctx.createRadialGradient(
        this.width * 0.5, this.height * 0.5, this.width * 0.42,
        this.width * 0.5, this.height * 0.5, this.width * 0.65
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.restore();
    }
  };

  window.SkiRenderer = SkiRenderer;
})(typeof window !== 'undefined' ? window : global);
