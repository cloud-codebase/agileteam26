/**
 * renderer.js - 2D Canvas Procedural Ski Jump Renderer
 * Sprint 1.0 (SCRUM-173)
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
      scale: 3.2,
      targetScale: 3.2
    },

    // Procedural background and weather state
    snowParticles: [],
    mountainPeaks: [],
    pineTrees: [],
    cheeringCrowd: [],

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
      for (let x = -80; x < 280; x += 14) {
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
      for (let i = 0; i < 90; i++) {
        this.cheeringCrowd.push({
          worldX: 50 + (i * 2.2) + Math.random() * 1.5,
          color: crowdColors[i % crowdColors.length],
          bobOffset: Math.random() * Math.PI * 2,
          bobSpeed: 3 + Math.random() * 4
        });
      }
    },

    /**
     * Updates camera smoothly tracking the jumper
     */
    updateCamera(physicsState) {
      if (!physicsState) return;

      const px = physicsState.x || 0;
      const py = physicsState.y || 0;

      // Desired camera target in world coordinates
      if (physicsState.phase === 'GATE' || physicsState.phase === 'INRUN') {
        this.camera.targetX = px + 12;
        this.camera.targetY = py - 4;
        this.camera.targetScale = 3.6;
      } else if (physicsState.phase === 'FLIGHT') {
        // Broad dynamic view giving wide angle of flight curve
        this.camera.targetX = px + 18;
        this.camera.targetY = py + 2;
        this.camera.targetScale = 2.85;
      } else {
        // Landing & outrun
        this.camera.targetX = px + 10;
        this.camera.targetY = py - 2;
        this.camera.targetScale = 3.0;
      }

      // Smooth lerp camera
      const lerpFactor = 0.08;
      this.camera.x += (this.camera.targetX - this.camera.x) * lerpFactor;
      this.camera.y += (this.camera.targetY - this.camera.y) * lerpFactor;
      this.camera.scale += (this.camera.targetScale - this.camera.scale) * lerpFactor;
    },

    /**
     * Converts world meter coordinates to canvas screen pixel coordinates
     */
    worldToScreen(wx, wy) {
      const cx = this.width * 0.42; // Focal center on screen
      const cy = this.height * 0.48;
      const sx = cx + (wx - this.camera.x) * this.camera.scale;
      const sy = cy + (wy - this.camera.y) * this.camera.scale;
      return { x: sx, y: sy };
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

      // Clear & Draw Sky Gradient (Alpine winter twilight / stadium night glow)
      this._drawSky(ctx);

      // Parallax Mountains
      this._drawMountains(ctx);

      // Save transform for world rendering
      ctx.save();

      // Draw Inrun Tower structure & Inrun slope track
      this._drawInrunStructure(ctx, hill);

      // Draw Landing Hill Profile & Snow terrain
      this._drawLandingHill(ctx, hill);

      // Draw Distance Markers (P-Point, K-Point, HS-Point, 100m, etc.)
      this._drawDistanceMarkers(ctx, hill);

      // Draw Pine trees & Cheering crowd
      this._drawScenery(ctx, hill, physicsState);

      // Draw Trajectory flight trail
      this._drawFlightTrail(ctx, physicsState);

      // Draw Skier Sprite with dynamic posture
      if (physicsState) {
        this._drawSkier(ctx, physicsState);
      }

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

    _drawInrunStructure(ctx, hill) {
      ctx.save();
      const physics = window.SkiPhysics;
      const getInrunPos = physics ? physics.getInrunPos : null;

      if (!getInrunPos) {
        ctx.restore();
        return;
      }

      // Draw wooden / steel lattice scaffolding under inrun
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;

      const samples = 18;
      const points = [];
      for (let i = 0; i <= samples; i++) {
        const s = i / samples;
        const pos = getInrunPos(hill, s);
        const screenPos = this.worldToScreen(pos.x, pos.y);
        points.push(screenPos);
      }

      // Scaffolding pillars downwards
      for (let i = 0; i < points.length; i += 3) {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[i].x, points[i].y + 160);
        ctx.stroke();

        // Cross bracing
        if (i + 3 < points.length) {
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y + 40);
          ctx.lineTo(points[i + 3].x, points[i + 3].y + 110);
          ctx.stroke();
        }
      }

      // Inrun track surface (snow & ceramic track groove)
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Guard rails
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y - 3.5);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y - 3.5);
      }
      ctx.stroke();

      // Starting Gate platform
      const gateScreen = points[0];
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(gateScreen.x - 14, gateScreen.y - 12, 14, 12);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('GATE', gateScreen.x - 13, gateScreen.y - 3);

      // Takeoff Table Lip (x = 0, y = 0)
      const lipScreen = points[points.length - 1];
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(lipScreen.x - 2, lipScreen.y - 2, 4, 10);

      ctx.restore();
    },

    _drawLandingHill(ctx, hill) {
      ctx.save();
      const physics = window.SkiPhysics;
      const getGroundY = physics ? physics.getGroundY : null;

      if (!getGroundY) {
        ctx.restore();
        return;
      }

      const k = (hill && hill.kPoint) ? hill.kPoint : 120;
      const endX = (hill && hill.hsPoint ? hill.hsPoint : k * 1.15) + 65;

      const step = 2.5; // meters per sample
      const screenPoints = [];

      for (let wx = 0; wx <= endX; wx += step) {
        const wy = getGroundY(hill, wx);
        screenPoints.push(this.worldToScreen(wx, wy));
      }

      // Terrain body fill
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
      }
      const last = screenPoints[screenPoints.length - 1];
      ctx.lineTo(last.x, this.height + 150);
      ctx.lineTo(screenPoints[0].x, this.height + 150);
      ctx.closePath();

      // Snow gradient with dirt/rock depth underneath
      const groundGrad = ctx.createLinearGradient(0, screenPoints[0].y, 0, this.height + 150);
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

    _drawDistanceMarkers(ctx, hill) {
      ctx.save();
      const physics = window.SkiPhysics;
      const getGroundY = physics ? physics.getGroundY : null;
      if (!getGroundY) {
        ctx.restore();
        return;
      }

      const k = (hill && hill.kPoint) ? hill.kPoint : 120;
      const hs = (hill && hill.hsPoint) ? hill.hsPoint : Math.round(k * 1.15);
      const record = (hill && hill.record) ? hill.record : Math.round(hs + 4);

      // Distance lines to mark on the landing hill:
      // Minor marks every 10m
      // Major markers: K-Point (Red line), HS-Point (Yellow line), Record (Green line)
      const markers = [
        { dist: Math.round(k * 0.8), label: `${Math.round(k * 0.8)}m`, color: '#64748b', isSpecial: false },
        { dist: 100, label: '100m', color: '#94a3b8', isSpecial: false },
        { dist: k, label: `K-${k}m`, color: '#ef4444', isSpecial: true, banner: 'K-POINT' },
        { dist: hs, label: `HS-${hs}m`, color: '#f59e0b', isSpecial: true, banner: 'HILL SIZE' },
        { dist: record, label: `REC ${record}m`, color: '#10b981', isSpecial: true, banner: 'RECORD' }
      ];

      ctx.font = 'bold 9px monospace';

      for (const m of markers) {
        const wx = m.dist * 0.88; // horizontal projection of slope distance
        const wy = getGroundY(hill, wx);
        const sp = this.worldToScreen(wx, wy);

        // Marker line along slope perpendicular
        ctx.strokeStyle = m.color;
        ctx.lineWidth = m.isSpecial ? 3.0 : 1.2;

        ctx.beginPath();
        ctx.moveTo(sp.x - 3, sp.y - 12);
        ctx.lineTo(sp.x + 3, sp.y + 12);
        ctx.stroke();

        // Flag / label banner
        ctx.fillStyle = m.color;
        ctx.fillText(m.label, sp.x - 14, sp.y - 16);

        if (m.banner) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(sp.x - 24, sp.y + 14, 48, 12);
          ctx.fillStyle = m.color;
          ctx.font = 'bold 8px monospace';
          ctx.fillText(m.banner, sp.x - 22, sp.y + 23);
        }
      }

      ctx.restore();
    },

    _drawScenery(ctx, hill, physicsState) {
      ctx.save();
      const physics = window.SkiPhysics;
      const getGroundY = physics ? physics.getGroundY : null;
      if (!getGroundY) {
        ctx.restore();
        return;
      }

      // Draw pine trees along the hill slope
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

      // Draw cheering spectators alongside landing zone
      const now = performance.now() * 0.003;
      for (const fan of this.cheeringCrowd) {
        const gy = getGroundY(hill, fan.worldX);
        const sp = this.worldToScreen(fan.worldX, gy);

        // Bob up and down when flight distance is great or landing
        const bob = Math.sin(now * fan.bobSpeed + fan.bobOffset) * 2.2;
        const headY = sp.y - 10 + bob;

        ctx.fillStyle = fan.color;
        // Torso / coat
        ctx.fillRect(sp.x - 1.5, headY + 3, 3, 5);
        // Head
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

    /**
     * Draws the retro pixel ski jumper sprite with realistic body posture
     * Transitions between Crouch, Flight V-Style, Telemark, and Crash.
     */
    _drawSkier(ctx, physicsState) {
      ctx.save();
      const sp = this.worldToScreen(physicsState.x, physicsState.y);

      ctx.translate(sp.x, sp.y);
      // Pitch angle rotation (degrees to radians)
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
        // Standard two-footed landing / stopped
        this._renderUprightPose(ctx);
      }

      ctx.restore();
    },

    _renderInrunCrouchPose(ctx) {
      // Skis (parallel to inrun track)
      ctx.strokeStyle = '#f59e0b'; // golden yellow racing skis
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-16, 2);
      ctx.lineTo(16, 2);
      ctx.stroke();

      // Ski tips curved up
      ctx.beginPath();
      ctx.moveTo(16, 2);
      ctx.lineTo(19, -1);
      ctx.stroke();

      // Tucked aerodynamic crouch: boots, bent knees, horizontal back, helmet
      // Boots
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3, 0, 6, 2);

      // Thighs & Torso tucked low
      ctx.strokeStyle = '#ef4444'; // Red suit
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -5); // knees forward
      ctx.lineTo(5, -6);  // tucked torso
      ctx.stroke();

      // Arms tucked back
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, -6);
      ctx.lineTo(-7, -4);
      ctx.stroke();

      // Helmet & Visor
      ctx.fillStyle = '#f8fafc'; // white helmet
      ctx.beginPath();
      ctx.arc(7, -7, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b'; // visor
      ctx.fillRect(8, -8, 2, 2);
    },

    _renderFlightPose(ctx, lean) {
      // Skis in V-Style
      // Left ski (tilted up slightly) & right ski (tilted down slightly to create perspective V)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.4;

      // Top ski
      ctx.beginPath();
      ctx.moveTo(-18, 1);
      ctx.lineTo(18, -2);
      ctx.lineTo(21, -5); // tip
      ctx.stroke();

      // Bottom ski
      ctx.beginPath();
      ctx.moveTo(-17, 3);
      ctx.lineTo(17, 5);
      ctx.lineTo(20, 3);
      ctx.stroke();

      // Jumper body stretched forward over the skis
      // Lean shifts torso forward/backward (-1 lean back, +1 lean forward)
      const forwardShift = 2 + lean * 3.5;
      const headX = 8 + forwardShift;
      const headY = -8 + lean * 2.0;

      // Legs stretched straight back into skis
      ctx.strokeStyle = '#ef4444'; // Racing suit
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.lineTo(headX - 6, headY + 3);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      // Arms spread wide beside torso for aerodynamic stability
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(headX - 5, headY + 2);
      ctx.lineTo(headX - 10, headY + 4);
      ctx.stroke();

      // Helmet & Google
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(headX, headY, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7'; // blue goggles
      ctx.fillRect(headX + 1, headY - 1, 2, 2);
    },

    _renderTelemarkPose(ctx) {
      // Classical Telemark landing: one ski forward, one ski back, knees bent, arms outstretched
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.4;

      // Front ski
      ctx.beginPath();
      ctx.moveTo(-12, 1);
      ctx.lineTo(20, 1);
      ctx.lineTo(23, -2);
      ctx.stroke();

      // Rear ski
      ctx.beginPath();
      ctx.moveTo(-20, 2);
      ctx.lineTo(10, 2);
      ctx.lineTo(13, -1);
      ctx.stroke();

      // Jumper body in lunged Telemark stance
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(-6, 2);  // back knee deep bend
      ctx.lineTo(-2, -5);
      ctx.lineTo(6, 1);   // front knee lunged
      ctx.stroke();

      // Torso upright & proud
      ctx.beginPath();
      ctx.moveTo(-1, -5);
      ctx.lineTo(0, -14);
      ctx.stroke();

      // Arms open wide in graceful balance
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(-8, -16);
      ctx.moveTo(0, -11);
      ctx.lineTo(8, -16);
      ctx.stroke();

      // Helmet
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -16, 3.2, 0, Math.PI * 2);
      ctx.fill();
    },

    _renderUprightPose(ctx) {
      // Skis
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-15, 2);
      ctx.lineTo(17, 2);
      ctx.lineTo(20, -1);
      ctx.stroke();

      // Jumper body upright
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(1, -7);
      ctx.lineTo(2, -14);
      ctx.stroke();

      // Arms at sides
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -11);
      ctx.lineTo(-2, -5);
      ctx.stroke();

      // Helmet
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(2, -16, 3.2, 0, Math.PI * 2);
      ctx.fill();
    },

    _renderCrashPose(ctx) {
      // Detached flying skis & tumble animation
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.2;

      // Broken ski 1
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(-2, -16);
      ctx.stroke();

      // Broken ski 2
      ctx.beginPath();
      ctx.moveTo(8, -12);
      ctx.lineTo(18, -4);
      ctx.stroke();

      // Tumbled skier body
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(-2, -8);
      ctx.stroke();

      // Helmet rolling in snow
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(6, -2, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Snow puff dust
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
      // Retro scanlines
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let y = 0; y < this.height; y += 3) {
        ctx.fillRect(0, y, this.width, 1);
      }

      // Vignette shadow on borders
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
