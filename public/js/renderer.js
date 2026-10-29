/**
 * SkiRenderer - Deluxe Ski Jump (DSJ) / Adam Małysz Style Canvas 2D Renderer
 * Complies with DESIGN.md contract: window.SkiRenderer
 */
(function(window) {
  'use strict';

  const SkiRenderer = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 500,
    dpr: 1,

    // Camera parameters
    camera: {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      scale: 4.8, // pixels per meter
      targetScale: 4.8,
      smoothing: 0.12
    },

    // Atmospheric snowflakes
    snowflakes: [],

    // Crowd spectators
    spectators: [],

    // Initialize renderer with Canvas DOM element
    init: function(canvasElement) {
      if (!canvasElement) {
        console.warn('[SkiRenderer] Canvas element not provided.');
        return;
      }

      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.dpr = window.devicePixelRatio || 1;

      this.resize();
      this._initSnowflakes();
      this._initCrowd();

      window.addEventListener('resize', () => this.resize());
    },

    // Handle high-DPI and responsive sizing
    resize: function() {
      if (!this.canvas) return;

      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 800;
      this.height = rect.height || 500;

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;

      if (this.ctx) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        this.ctx.scale(this.dpr, this.dpr);
      }
    },

    // Reset camera position back to gate
    resetCamera: function() {
      this.camera.x = -80;
      this.camera.y = -50;
      this.camera.targetX = -80;
      this.camera.targetY = -50;
      this.camera.scale = 5.2;
      this.camera.targetScale = 5.2;
    },

    // Create atmospheric falling snowflakes
    _initSnowflakes: function() {
      this.snowflakes = [];
      const count = 75;
      for (let i = 0; i < count; i++) {
        this.snowflakes.push({
          x: Math.random() * (this.width || 800),
          y: Math.random() * (this.height || 500),
          radius: Math.random() * 2.2 + 0.8,
          speedY: Math.random() * 1.5 + 0.8,
          speedX: Math.random() * 1.2 - 0.2,
          opacity: Math.random() * 0.7 + 0.3
        });
      }
    },

    // Generate procedural pixel-art crowd
    _initCrowd: function() {
      this.spectators = [];
      const colors = ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557', '#e76f51', '#f4a261', '#2a9d8f'];
      for (let i = 0; i < 180; i++) {
        this.spectators.push({
          relX: (i / 180) * 1.6 - 0.2, // relative distribution along hill
          coatColor: colors[Math.floor(Math.random() * colors.length)],
          hatColor: colors[Math.floor(Math.random() * colors.length)],
          hasFlag: Math.random() > 0.65, // Polish white-and-red banner
          jumpOffset: Math.random() * Math.PI * 2
        });
      }
    },

    // Main render call
    render: function(gameState, hillConfig, windVector) {
      if (!this.ctx || !this.canvas) return;

      const state = gameState || { x: 0, y: 0, angle: 0, state: 'GATE' };
      const hill = hillConfig || { kPoint: 120, hs: 134, name: 'Zakopane' };
      const wind = windVector || { x: 0, y: 0 };

      // Update camera smooth tracking
      this._updateCamera(state);

      // Clear canvas
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Save global canvas state
      this.ctx.save();

      // 1. Draw Static / Parallax Sky & Mountain Background
      this._drawSkyAndMountains();

      // 2. Apply World-to-Camera Coordinate Transformation
      this.ctx.save();
      const centerX = this.width * 0.35;
      const centerY = this.height * 0.55;
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(this.camera.scale, this.camera.scale);
      this.ctx.translate(-this.camera.x, -this.camera.y);

      // 3. Draw In-run Tower and Structure
      this._drawInrunStructure(hill);

      // 4. Draw Hill Ground Surface, K-Point / HS Markers & Outrun
      this._drawHillSurface(hill, state);

      // 5. Draw Crowd along the hill barriers
      this._drawCrowd(hill, state);

      // 6. Draw Skier Sprite with Posture (Inrun / Flight V-style / Telemark / Crash)
      this._drawSkier(state);

      // 7. Draw Takeoff Edge and Windsock in world coordinates
      this._drawWindsock(wind);

      // Restore World Transform
      this.ctx.restore();

      // 8. Draw Atmospheric Snow Layer (Screen coordinates)
      this._drawSnow(wind);

      // 9. Draw Broadcast TV Graphic HUD (Distance bar, speed, Adam Małysz vibe)
      this._drawBroadcastOverlay(state, hill, wind);

      // Restore Base Canvas State
      this.ctx.restore();
    },

    // Smooth Camera Tracking
    _updateCamera: function(state) {
      // Skier tracking target
      this.camera.targetX = state.x;
      this.camera.targetY = state.y;

      // Adjust camera zoom based on flight distance
      if (state.state === 'GATE' || state.state === 'INRUN') {
        this.camera.targetScale = 5.2;
      } else if (state.state === 'FLIGHT') {
        // Zoom out smoothly as jumper gets further down the hill
        this.camera.targetScale = Math.max(3.2, 5.2 - (state.x / 140) * 1.8);
      } else {
        this.camera.targetScale = 4.2;
      }

      // Linear interpolation
      const smooth = this.camera.smoothing;
      this.camera.x += (this.camera.targetX - this.camera.x) * smooth;
      this.camera.y += (this.camera.targetY - this.camera.y) * smooth;
      this.camera.scale += (this.camera.targetScale - this.camera.scale) * smooth;
    },

    // Retro Winter Sky and Tatry Mountain Peaks
    _drawSkyAndMountains: function() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // Sky Gradient (Cold Nordic / Zakopane Twilight Blue)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      skyGrad.addColorStop(0, '#102244');
      skyGrad.addColorStop(0.5, '#2b4d7c');
      skyGrad.addColorStop(1, '#8fa9c4');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant Parallax Mountain Range (Distant Tatry Peaks)
      ctx.fillStyle = '#4a6282';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      const peaks = [
        [0.1, 0.32], [0.25, 0.42], [0.4, 0.28], [0.55, 0.45],
        [0.7, 0.35], [0.85, 0.48], [1.0, 0.38]
      ];
      for (let i = 0; i < peaks.length; i++) {
        ctx.lineTo(w * peaks[i][0], h * peaks[i][1]);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Foreground Snow-capped Ridge
      ctx.fillStyle = '#6c85a2';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.lineTo(w * 0.18, h * 0.48);
      ctx.lineTo(w * 0.38, h * 0.58);
      ctx.lineTo(w * 0.62, h * 0.46);
      ctx.lineTo(w * 0.82, h * 0.56);
      ctx.lineTo(w, h * 0.50);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Snow caps on peaks
      ctx.fillStyle = '#e8f0fe';
      ctx.beginPath();
      ctx.moveTo(w * 0.18, h * 0.48);
      ctx.lineTo(w * 0.14, h * 0.52);
      ctx.lineTo(w * 0.22, h * 0.52);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w * 0.62, h * 0.46);
      ctx.lineTo(w * 0.58, h * 0.50);
      ctx.lineTo(w * 0.66, h * 0.50);
      ctx.closePath();
      ctx.fill();
    },

    // Inrun Scaffold Tower & Rails
    _drawInrunStructure: function(hill) {
      const ctx = this.ctx;
      const k = hill.kPoint || 120;
      const inrunLen = k * 0.85;
      const angle = (35 * Math.PI) / 180;
      const startX = -inrunLen * Math.cos(angle);
      const startY = -inrunLen * Math.sin(angle);

      // Steel truss pillar foundations
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 1.2;
      ctx.fillStyle = '#1a202c';

      // Tower starting booth
      ctx.fillRect(startX - 6, startY - 10, 10, 12);
      ctx.fillStyle = '#e53e3e'; // Red roof
      ctx.beginPath();
      ctx.moveTo(startX - 8, startY - 10);
      ctx.lineTo(startX - 1, startY - 14);
      ctx.lineTo(startX + 6, startY - 10);
      ctx.closePath();
      ctx.fill();

      // Gate platform bench
      ctx.fillStyle = '#ecc94b';
      ctx.fillRect(startX - 3, startY - 1.8, 6, 1.2);

      // Support trusses descending into ground
      ctx.strokeStyle = '#4a5568';
      ctx.beginPath();
      for (let x = startX + 10; x <= -8; x += 15) {
        const yOnInrun = (x / Math.cos(angle)) * Math.sin(angle);
        ctx.moveTo(x, yOnInrun);
        ctx.lineTo(x, yOnInrun + 30);
        // Cross bracing
        ctx.moveTo(x, yOnInrun + 5);
        ctx.lineTo(x + 15, yOnInrun + 25);
      }
      ctx.stroke();

      // Inrun icy track surface
      ctx.strokeStyle = '#bee3f8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(-20, -20 * Math.tan(angle));
      ctx.quadraticCurveTo(-10, -5, 0, 0);
      ctx.stroke();

      // Takeoff Table Red Edge
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(-1.5, -0.4, 2.0, 1.2);
    },

    // Procedural FIS Hill Profile Ground Surface
    _drawHillSurface: function(hill, state) {
      const ctx = this.ctx;
      const k = hill.kPoint || 120;
      const hs = hill.hs || Math.round(k * 1.12);

      // Compute ground coordinates using SkiPhysics profile logic
      const getGroundY = (window.SkiPhysics && window.SkiPhysics.hill)
        ? window.SkiPhysics.hill.getGroundY.bind(window.SkiPhysics.hill)
        : function(x) {
            // Fallback profile if physics not ready
            if (x < 0) return x * Math.tan((35 * Math.PI) / 180);
            return 0.2 * x + 0.003 * x * x;
          };

      // Fill Hill Ground Body
      ctx.fillStyle = '#e2e8f0'; // Snow white
      ctx.beginPath();
      ctx.moveTo(-120, 120);

      const xMin = -120;
      const xMax = hs + 75;
      const step = 2.0;

      for (let x = xMin; x <= xMax; x += step) {
        const y = getGroundY(x);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(xMax, 160);
      ctx.lineTo(-120, 160);
      ctx.closePath();
      ctx.fill();

      // Green grass underneath snow profile (classic DSJ retro look!)
      ctx.strokeStyle = '#38a169';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= xMax; x += step) {
        ctx.lineTo(x, getGroundY(x) + 0.3);
      }
      ctx.stroke();

      // Hill Snow Crust outline
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let x = xMin; x <= xMax; x += step) {
        ctx.lineTo(x, getGroundY(x));
      }
      ctx.stroke();

      // Red K-Point Line & Blue HS Line
      // Convert K and HS meter markers to horizontal x
      const kX = k / 1.14;
      const hsX = hs / 1.14;

      // K-Point Marker (FIS Red Line)
      const kY = getGroundY(kX);
      ctx.strokeStyle = '#e53e3e';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(kX - 2.5, kY - 0.2);
      ctx.lineTo(kX + 2.5, kY + 0.2);
      ctx.stroke();

      // K-Point Text Banner
      ctx.fillStyle = '#e53e3e';
      ctx.font = 'bold 3px sans-serif';
      ctx.fillText(`K-${k}`, kX - 3, kY - 2.5);

      // HS Marker (FIS Blue Line)
      const hsY = getGroundY(hsX);
      ctx.strokeStyle = '#3182ce';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(hsX - 2.5, hsY - 0.2);
      ctx.lineTo(hsX + 2.5, hsY + 0.2);
      ctx.stroke();

      // HS Text Banner
      ctx.fillStyle = '#3182ce';
      ctx.font = 'bold 3px sans-serif';
      ctx.fillText(`HS-${hs}`, hsX - 4, hsY - 2.5);

      // Outrun advertising boards / Polish fan banners
      ctx.fillStyle = '#c53030';
      ctx.fillRect(hsX + 15, getGroundY(hsX + 15) - 2.5, 12, 2.5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 1.8px sans-serif';
      ctx.fillText('ZAKOPANE', hsX + 16, getGroundY(hsX + 15) - 0.7);
    },

    // Cheering Crowd & Polish Flags
    _drawCrowd: function(hill, state) {
      const ctx = this.ctx;
      const getGroundY = (window.SkiPhysics && window.SkiPhysics.hill)
        ? window.SkiPhysics.hill.getGroundY.bind(window.SkiPhysics.hill)
        : (x) => 0.2 * x + 0.003 * x * x;

      const hs = hill.hs || 134;
      const xStart = 10;
      const xEnd = hs + 50;

      const isCheering = (state.state === 'FLIGHT' || state.state === 'LANDING');

      for (let i = 0; i < this.spectators.length; i++) {
        const spec = this.spectators[i];
        const x = xStart + (spec.relX * (xEnd - xStart));
        if (x < xStart || x > xEnd) continue;

        const groundY = getGroundY(x);
        const y = groundY - 2.2;

        let hop = 0;
        if (isCheering) {
          hop = Math.sin(Date.now() * 0.008 + spec.jumpOffset) * 0.4;
        }

        // Body
        ctx.fillStyle = spec.coatColor;
        ctx.fillRect(x, y + hop, 1.2, 1.8);

        // Head
        ctx.fillStyle = spec.hatColor;
        ctx.beginPath();
        ctx.arc(x + 0.6, y - 0.5 + hop, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Polish Flag (Biało-Czerwona) waved by crowd
        if (spec.hasFlag) {
          const flagX = x + 1.2;
          const flagY = y - 2.0 + hop;

          // Pole
          ctx.strokeStyle = '#4a5568';
          ctx.lineWidth = 0.2;
          ctx.beginPath();
          ctx.moveTo(flagX, y + hop);
          ctx.lineTo(flagX, flagY);
          ctx.stroke();

          // White upper half
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(flagX, flagY, 2.2, 0.8);
          // Red lower half
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(flagX, flagY + 0.8, 2.2, 0.8);
        }
      }
    },

    // Skier Sprite Rendering with Posture States
    _drawSkier: function(state) {
      const ctx = this.ctx;
      const x = state.x;
      const y = state.y;
      const angle = state.angle || 0;
      const phase = state.state || 'GATE';

      ctx.save();
      ctx.translate(x, y);

      if (phase === 'FALL') {
        // Tumble / Crash ragdoll
        ctx.rotate(angle);
        ctx.fillStyle = '#dc2626'; // Red suit
        ctx.fillRect(-1.0, -0.6, 2.0, 1.2);
        // Flying skis
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(-2.5, -2.0);
        ctx.lineTo(2.0, -1.2);
        ctx.moveTo(-1.8, 2.2);
        ctx.lineTo(2.2, 1.4);
        ctx.stroke();
        // Helmet
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, -1.2, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // Rotate skier into flight / inrun / landing pitch angle
      ctx.rotate(angle);

      // Ski Dimensions
      const skiLength = 4.8;
      const skiThickness = 0.28;

      if (phase === 'GATE' || phase === 'INRUN') {
        // In-run crouch egg posture (low drag)
        // Skis flat along track
        ctx.fillStyle = '#1e3a8a'; // Blue Fischer skis
        ctx.fillRect(-skiLength * 0.45, 0.5, skiLength, skiThickness);
        // Ski tip curve
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(skiLength * 0.45, 0.2, 0.5, 0.4);

        // Crouched Legs / Torso
        ctx.fillStyle = '#dc2626'; // Red Poland suit
        ctx.beginPath();
        ctx.moveTo(-0.8, 0.5);
        ctx.lineTo(-0.2, -0.6); // knees bent
        ctx.lineTo(0.6, -0.4);  // torso low
        ctx.lineTo(0.2, 0.5);
        ctx.closePath();
        ctx.fill();

        // Helmet (Yellow)
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0.7, -0.5, 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Adam Małysz Mustache tribute!
        ctx.fillStyle = '#451a03';
        ctx.fillRect(0.85, -0.4, 0.25, 0.15);

      } else if (phase === 'FLIGHT') {
        // Classic DSJ / Adam Małysz V-Style Flight Posture!
        // Skis spread open in aerodynamic V
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 0.35;

        // Bottom ski
        ctx.beginPath();
        ctx.moveTo(-skiLength * 0.5, 0.7);
        ctx.lineTo(skiLength * 0.5, 0.3);
        ctx.stroke();

        // Top ski (V-angle)
        ctx.beginPath();
        ctx.moveTo(-skiLength * 0.45, 0.1);
        ctx.lineTo(skiLength * 0.52, -0.5);
        ctx.stroke();

        // Ski tips fluorescent red
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(skiLength * 0.48, 0.15, 0.5, 0.3);
        ctx.fillRect(skiLength * 0.5, -0.65, 0.5, 0.3);

        // Skier body leaning aggressively forward between skis
        ctx.fillStyle = '#dc2626'; // Red jumpsuit
        ctx.beginPath();
        ctx.moveTo(-0.8, 0.4);   // Boots
        ctx.lineTo(0.3, 0.0);    // Hips
        ctx.lineTo(1.2, -0.4);   // Head / Chest forward
        ctx.lineTo(0.8, 0.2);
        ctx.closePath();
        ctx.fill();

        // Arms stretched back aerodynamic
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.moveTo(0.8, -0.2);
        ctx.lineTo(-0.2, 0.1);
        ctx.stroke();

        // Yellow Red Bull / Malysz Helmet
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(1.4, -0.45, 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Goggles
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(1.5, -0.55, 0.3, 0.22);

        // Adam Małysz Iconic Mustache!
        ctx.fillStyle = '#3f1d0b';
        ctx.fillRect(1.55, -0.35, 0.22, 0.12);

      } else if (phase === 'LANDING' || phase === 'STOPPED') {
        if (state.telemarkSuccess) {
          // Elegant Telemark: one ski forward, one ski back, knees lunged, arms spread
          ctx.strokeStyle = '#1e3a8a';
          ctx.lineWidth = 0.35;

          // Lead ski
          ctx.beginPath();
          ctx.moveTo(-skiLength * 0.3, 0.6);
          ctx.lineTo(skiLength * 0.6, 0.6);
          ctx.stroke();

          // Rear ski
          ctx.beginPath();
          ctx.moveTo(-skiLength * 0.6, 0.6);
          ctx.lineTo(skiLength * 0.3, 0.6);
          ctx.stroke();

          // Lunge posture
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(-0.6, 0.6);  // back boot
          ctx.lineTo(-0.2, -0.2); // pelvis
          ctx.lineTo(0.4, 0.6);   // front boot
          ctx.lineTo(0.0, -1.2);  // upright chest
          ctx.closePath();
          ctx.fill();

          // Spread arms for balance & grace
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.3;
          ctx.beginPath();
          ctx.moveTo(-0.8, -0.8);
          ctx.lineTo(0.8, -0.8);
          ctx.stroke();

          // Helmet
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0.0, -1.4, 0.45, 0, Math.PI * 2);
          ctx.fill();

        } else {
          // Two-feet safe landing (parallel skis)
          ctx.strokeStyle = '#1e3a8a';
          ctx.lineWidth = 0.35;
          ctx.beginPath();
          ctx.moveTo(-skiLength * 0.45, 0.6);
          ctx.lineTo(skiLength * 0.5, 0.6);
          ctx.stroke();

          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-0.4, -0.8, 0.8, 1.4);

          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0.0, -1.1, 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    },

    // Animated Windsock at Takeoff Table
    _drawWindsock: function(wind) {
      const ctx = this.ctx;
      const sockX = 3.0;
      const sockY = -3.5;

      // Mast pole
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(sockX, 0);
      ctx.lineTo(sockX, sockY);
      ctx.stroke();

      // Windsock cone pointing with wind direction
      const windAngle = Math.atan2(wind.y || 0, (wind.x || 0) + 1.2);
      const windSpeed = Math.sqrt((wind.x || 0) * (wind.x || 0) + (wind.y || 0) * (wind.y || 0));
      const sockLength = Math.min(4.5, 2.0 + windSpeed * 0.5);

      ctx.save();
      ctx.translate(sockX, sockY);
      ctx.rotate(windAngle);

      // Red and white stripes
      const segments = ['#dc2626', '#ffffff', '#dc2626', '#ffffff', '#dc2626'];
      const segWidth = sockLength / segments.length;
      for (let i = 0; i < segments.length; i++) {
        const topH = 0.8 * (1 - (i / segments.length) * 0.5);
        ctx.fillStyle = segments[i];
        ctx.beginPath();
        ctx.moveTo(i * segWidth, -topH / 2);
        ctx.lineTo((i + 1) * segWidth, -topH * 0.4);
        ctx.lineTo((i + 1) * segWidth, topH * 0.4);
        ctx.lineTo(i * segWidth, topH / 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    },

    // Atmospheric Falling Snowflakes
    _drawSnow: function(wind) {
      const ctx = this.ctx;
      const windX = (wind.x || 0) * 0.4;

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < this.snowflakes.length; i++) {
        const flake = this.snowflakes[i];
        flake.y += flake.speedY;
        flake.x += flake.speedX + windX;

        if (flake.y > this.height) {
          flake.y = -5;
          flake.x = Math.random() * this.width;
        }
        if (flake.x > this.width) flake.x = 0;
        if (flake.x < 0) flake.x = this.width;

        ctx.globalAlpha = flake.opacity;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    },

    // Retro Telewizja Polska (TVP / Eurosport) Broadcast Overlay
    _drawBroadcastOverlay: function(state, hill, wind) {
      const ctx = this.ctx;
      const w = this.width;

      // Broadcast TV banner (Top right or top left)
      // Top Left: Hill name and K-Point
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(16, 16, 220, 36);
      ctx.fillStyle = '#38bdf8'; // Blue accent bar
      ctx.fillRect(16, 16, 4, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(hill.name || 'Zakopane HS-134', 26, 32);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText(`K-Point: ${hill.kPoint || 120}m | HS: ${hill.hs || 134}m`, 26, 46);

      // Top Right: Live Distance & Speed Telemetry
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(w - 210, 16, 194, 36);
      ctx.fillStyle = '#ef4444'; // Red accent bar
      ctx.fillRect(w - 16, 16, 4, 36);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      const dist = (state.distanceMeters || 0).toFixed(1);
      ctx.fillText(`DIST: ${dist} m`, w - 198, 32);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px monospace';
      const spd = (state.speedKmH || 0).toFixed(1);
      ctx.fillText(`SPD: ${spd} km/h`, w - 198, 46);

      // Flight status banner when finished
      if (state.state === 'LANDING' || state.state === 'STOPPED' || state.state === 'FALL') {
        const bannerW = 280;
        const bannerH = 48;
        const bx = (w - bannerW) / 2;
        const by = 64;

        ctx.fillStyle = state.isCrashed ? 'rgba(185, 28, 28, 0.92)' : 'rgba(16, 185, 129, 0.92)';
        ctx.fillRect(bx, by, bannerW, bannerH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';

        if (state.isCrashed) {
          ctx.fillText('CRASH LANDING!', bx + bannerW / 2, by + 20);
          ctx.font = '11px sans-serif';
          ctx.fillText(`Distance: ${dist}m  |  Style: ${state.stylePoints || 0} pts`, bx + bannerW / 2, by + 38);
        } else if (state.telemarkSuccess) {
          ctx.fillText('PERFECT TELEMARK!', bx + bannerW / 2, by + 20);
          ctx.font = '11px sans-serif';
          ctx.fillText(`Distance: ${dist}m  |  Total: ${state.totalPoints || 0} pts`, bx + bannerW / 2, by + 38);
        } else {
          ctx.fillText('CLEAN LANDING (TWO FEET)', bx + bannerW / 2, by + 20);
          ctx.font = '11px sans-serif';
          ctx.fillText(`Distance: ${dist}m  |  Total: ${state.totalPoints || 0} pts`, bx + bannerW / 2, by + 38);
        }

        ctx.textAlign = 'left'; // Reset
      }
    }
  };

  // Export to global scope
  window.SkiRenderer = SkiRenderer;

})(typeof window !== 'undefined' ? window : this);
