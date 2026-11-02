/**
 * game.js - Canvas Game Loop, Camera Tracking & Retro DSJ2 Visuals
 * 60 FPS animation loop, dynamic camera lerp, procedural pixel winter terrain,
 * pine trees, crowd stands, K-point / HS-point lines, V-style skier sprite,
 * snow particles, takeoff timing feedback banner, and gate beam indicator.
 */
(function() {
  'use strict';

  class SkiGameRenderer {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 960;
      this.height = 540;

      // Camera coordinates in physics space
      this.camera = {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        zoom: 3.4, // pixels per meter
        targetZoom: 3.4
      };

      // Particle system (snowflakes and ski spray)
      this.snowflakes = [];
      this.sprayParticles = [];
      this.initSnow();

      // State
      this.hill = null;
      this.skierConfig = {
        suitColor: '#d63031', // classic Małysz red
        helmetColor: '#ffffff',
        skisColor: '#0984e3',
        hasMustache: true
      };

      this.running = false;
      this.lastTime = 0;
      this.inputState = {
        pitchUp: false,
        pitchDown: false,
        jump: false,
        landing: false,
        telemark: false
      };

      // Callbacks for phase changes and takeoff feedback
      this.onPhaseChange = null;
      this.onTakeoffFeedback = null;
      this.lastReportedPhase = null;

      // In-canvas banner feedback timer
      this.feedbackBanner = {
        visible: false,
        rating: '',
        text: '',
        color: '#fbc531',
        timeRemaining: 0
      };
    }

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.width = canvas.width || 960;
      this.height = canvas.height || 540;

      this.bindInputs();
      this.startLoop();
    }

    initSnow() {
      this.snowflakes = [];
      for (let i = 0; i < 120; i++) {
        this.snowflakes.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 1.8 + 0.6,
          speedX: Math.random() * 1.5 - 0.75,
          speedY: Math.random() * 1.5 + 1.0,
          alpha: Math.random() * 0.7 + 0.3
        });
      }
    }

    bindInputs() {
      if (this.inputsBound) return;
      this.inputsBound = true;

      // Keyboard controls
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          this.handleActionJump();
        } else if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          this.inputState.pitchUp = true;
        } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          this.inputState.pitchDown = true;
        } else if (e.code === 'KeyT' || e.key === 't') {
          // Telemark landing key
          this.handleActionLanding(true);
        } else if (e.code === 'KeyL' || e.key === 'l') {
          // Two-foot landing key
          this.handleActionLanding(false);
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          this.inputState.pitchUp = false;
        } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          this.inputState.pitchDown = false;
        }
      });

      // Canvas Mouse & Touch controls (Authentic DSJ2 two-button feel)
      if (this.canvas) {
        this.canvas.addEventListener('mousedown', (e) => {
          e.preventDefault();
          if (e.button === 0) {
            // Left click = Jump / Telemark landing
            const state = window.SkiPhysics ? window.SkiPhysics.getJumpState() : null;
            if (state && (state.phase === 'GATE' || state.phase === 'IN_RUN')) {
              this.handleActionJump();
            } else if (state && state.phase === 'FLIGHT') {
              this.handleActionLanding(true); // Telemark
            }
          } else if (e.button === 2) {
            // Right click = two-foot landing
            this.handleActionLanding(false);
          }
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        let lastMouseY = null;
        this.canvas.addEventListener('mousemove', (e) => {
          if (lastMouseY !== null) {
            const dy = e.clientY - lastMouseY;
            if (dy < -2) {
              this.inputState.pitchUp = true;
              this.inputState.pitchDown = false;
            } else if (dy > 2) {
              this.inputState.pitchDown = true;
              this.inputState.pitchUp = false;
            } else {
              this.inputState.pitchUp = false;
              this.inputState.pitchDown = false;
            }
          }
          lastMouseY = e.clientY;
        });

        // Touch support for mobile / tablet
        this.canvas.addEventListener('touchstart', (e) => {
          e.preventDefault();
          const state = window.SkiPhysics ? window.SkiPhysics.getJumpState() : null;
          if (state && (state.phase === 'GATE' || state.phase === 'IN_RUN')) {
            this.handleActionJump();
          } else if (state && state.phase === 'FLIGHT') {
            this.handleActionLanding(true);
          }
        }, { passive: false });
      }
    }

    handleActionJump() {
      if (!window.SkiPhysics) return;
      const state = window.SkiPhysics.getJumpState();
      if (state.phase === 'GATE') {
        window.SkiPhysics.startInrun();
        this.clearTakeoffBanner();
        if (window.SkiAudio && window.SkiAudio.playInRun) window.SkiAudio.playInRun();
      } else if (state.phase === 'IN_RUN') {
        const feedback = window.SkiPhysics.triggerTakeoff();
        if (feedback) {
          this.showTakeoffBanner(feedback);
        }
        if (window.SkiAudio && window.SkiAudio.playTakeoff) window.SkiAudio.playTakeoff();
      }
    }

    handleActionLanding(isTelemark) {
      if (!window.SkiPhysics) return;
      const state = window.SkiPhysics.getJumpState();
      if (state.phase === 'FLIGHT') {
        window.SkiPhysics.triggerLanding(isTelemark);
      }
    }

    showTakeoffBanner(feedback) {
      let color = '#44bd32'; // green for PERFECT
      if (feedback.rating === 'EARLY') {
        color = '#fbc531'; // yellow for early
      } else if (feedback.rating === 'LATE') {
        color = '#d63031'; // red for late
      }

      this.feedbackBanner = {
        visible: true,
        rating: feedback.rating,
        text: feedback.text,
        color: color,
        timeRemaining: 2.8 // seconds
      };

      // Also update DOM element #takeoffFeedback if present
      const domBanner = document.getElementById('takeoffFeedback');
      if (domBanner) {
        domBanner.textContent = feedback.text;
        domBanner.className = `takeoff-banner-active banner-${feedback.rating.toLowerCase()}`;
        domBanner.style.display = 'block';
      }

      if (this.onTakeoffFeedback) {
        this.onTakeoffFeedback(feedback);
      }
    }

    clearTakeoffBanner() {
      this.feedbackBanner.visible = false;
      this.feedbackBanner.timeRemaining = 0;
      const domBanner = document.getElementById('takeoffFeedback');
      if (domBanner) {
        domBanner.style.display = 'none';
        domBanner.textContent = '';
      }
    }

    startLoop() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();

      const loop = (currentTime) => {
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(dt);
        this.render();

        if (this.running) {
          requestAnimationFrame(loop);
        }
      };

      requestAnimationFrame(loop);
    }

    update(dt) {
      if (!window.SkiPhysics) return;

      // Physical simulation step
      window.SkiPhysics.update(dt, this.inputState);
      const state = window.SkiPhysics.getJumpState();

      // Check if auto-launch generated feedback that wasn't displayed yet
      if (state.takeoffFeedback && !this.feedbackBanner.visible && state.phase === 'FLIGHT' && state.time < 0.2) {
        this.showTakeoffBanner(state.takeoffFeedback);
      }

      // Update in-canvas feedback banner timer
      if (this.feedbackBanner.visible) {
        this.feedbackBanner.timeRemaining -= dt;
        if (this.feedbackBanner.timeRemaining <= 0) {
          this.clearTakeoffBanner();
        }
      }

      // Check for phase transitions to trigger sounds or HUD events
      if (state.phase !== this.lastReportedPhase) {
        if (this.onPhaseChange) this.onPhaseChange(state.phase, state);

        if (state.phase === 'GATE') {
          this.clearTakeoffBanner();
        } else if (state.phase === 'LANDED') {
          if (state.landingType === 'telemark') {
            if (window.SkiAudio && window.SkiAudio.playTelemark) window.SkiAudio.playTelemark();
          } else {
            if (window.SkiAudio && window.SkiAudio.playTwoFoot) window.SkiAudio.playTwoFoot();
          }
          if (window.SkiAudio && window.SkiAudio.playCrowdCheer) window.SkiAudio.playCrowdCheer();
        } else if (state.phase === 'CRASHED') {
          if (window.SkiAudio && window.SkiAudio.playCrash) window.SkiAudio.playCrash();
        }
        this.lastReportedPhase = state.phase;
      }

      // Camera lerp & tracking
      const lookAheadX = state.vx * 0.45;
      const lookAheadY = state.vy * 0.25;

      this.camera.targetX = state.x + lookAheadX + 12.0;
      this.camera.targetY = state.y + lookAheadY - 3.0;

      // Adjust zoom dynamically based on speed and flight phase
      if (state.phase === 'FLIGHT') {
        this.camera.targetZoom = 3.1;
      } else if (state.phase === 'IN_RUN') {
        this.camera.targetZoom = 3.8;
      } else {
        this.camera.targetZoom = 3.3;
      }

      const lerpSpeed = 5.0 * dt;
      this.camera.x += (this.camera.targetX - this.camera.x) * lerpSpeed;
      this.camera.y += (this.camera.targetY - this.camera.y) * lerpSpeed;
      this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * lerpSpeed;

      // Spray particles during slide/snow impact
      if ((state.phase === 'IN_RUN' || state.phase === 'LANDED' || state.phase === 'CRASHED') && state.speed > 5) {
        const count = state.phase === 'CRASHED' ? 4 : 2;
        for (let i = 0; i < count; i++) {
          this.sprayParticles.push({
            x: state.x - Math.random() * 1.5,
            y: state.y + Math.random() * 0.4,
            vx: -state.vx * 0.25 + (Math.random() - 0.5) * 4,
            vy: Math.random() * 4 + 1,
            life: 0.4 + Math.random() * 0.3
          });
        }
      }

      // Update snow particles
      for (const s of this.snowflakes) {
        s.x += s.speedX + (state.wind ? state.wind.vx * 0.15 : 0);
        s.y += s.speedY;
        if (s.y > this.height) {
          s.y = -5;
          s.x = Math.random() * this.width;
        }
        if (s.x > this.width) s.x = 0;
        if (s.x < 0) s.x = this.width;
      }

      // Update spray particles
      for (let i = this.sprayParticles.length - 1; i >= 0; i--) {
        const p = this.sprayParticles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 9.8 * dt; // gravity on snow spray
        if (p.life <= 0) {
          this.sprayParticles.splice(i, 1);
        }
      }
    }

    /**
     * Coordinate transformations between physics (meters) and canvas screen pixels
     */
    worldToScreen(wx, wy) {
      const sx = (wx - this.camera.x) * this.camera.zoom + this.width * 0.45;
      const sy = this.height * 0.55 - (wy - this.camera.y) * this.camera.zoom;
      return { x: sx, y: sy };
    }

    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const hill = this.hill || (window.SkiHills ? window.SkiHills.getHills()[0] : null);
      const state = window.SkiPhysics ? window.SkiPhysics.getJumpState() : { x: 0, y: 0, pitch: 0, phase: 'GATE' };

      // 1. Clear background & draw retro mountain sky
      this.renderSkyAndMountains(ctx, hill);

      // 2. Draw Inrun structure, tower & landing hill slope
      if (hill) {
        this.renderHillTerrain(ctx, hill);
      }

      // 3. Draw Trail / Smoke
      this.renderSkierTrail(ctx, state);

      // 4. Draw Jumper
      this.renderSkier(ctx, state);

      // 5. Draw Snow Spray & Ambient Snowfall
      this.renderSnow(ctx);

      // 6. Draw In-Canvas Takeoff Edge Timing Banner
      this.renderTakeoffBannerOverlay(ctx);

      // 7. Draw Retro CRT / Scanlines & Vignette
      this.renderRetroScanlines(ctx);
    }

    renderSkyAndMountains(ctx, hill) {
      const topColor = hill ? hill.skyColor : '#1b263b';
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, topColor);
      grad.addColorStop(0.65, '#3b5278');
      grad.addColorStop(1.0, '#778ca3');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Distant mountain silhouettes (parallax)
      ctx.fillStyle = hill ? hill.mountainColor : '#22304d';
      ctx.beginPath();
      ctx.moveTo(0, this.height * 0.7);

      const mtnOffset = -this.camera.x * 0.15;
      const mtnBaseY = this.height * 0.55;
      for (let x = 0; x <= this.width + 40; x += 40) {
        const wx = x - mtnOffset;
        const my = mtnBaseY - Math.sin(wx * 0.008) * 85 - Math.cos(wx * 0.02) * 35;
        ctx.lineTo(x, my);
      }
      ctx.lineTo(this.width, this.height);
      ctx.lineTo(0, this.height);
      ctx.closePath();
      ctx.fill();

      // Snowy mountain peaks highlight
      ctx.fillStyle = 'rgba(240, 246, 255, 0.4)';
      ctx.beginPath();
      for (let x = 0; x <= this.width + 40; x += 40) {
        const wx = x - mtnOffset;
        const my = mtnBaseY - Math.sin(wx * 0.008) * 85 - Math.cos(wx * 0.02) * 35;
        if (my < mtnBaseY - 50) {
          ctx.rect(x - 5, my, 12, 10);
        }
      }
      ctx.fill();
    }

    renderHillTerrain(ctx, hill) {
      const geom = hill.geometry;
      if (!geom) return;

      // Draw inrun support tower & wooden/steel scaffold
      const towerTop = this.worldToScreen(geom.inrunPoints[0].x, geom.inrunPoints[0].y);
      const towerBottom = this.worldToScreen(geom.inrunPoints[0].x, geom.inrunPoints[0].y - 35);

      ctx.strokeStyle = '#4b6584';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(towerTop.x, towerTop.y);
      ctx.lineTo(towerBottom.x, this.height);
      ctx.moveTo(towerTop.x + 20, towerTop.y);
      ctx.lineTo(towerBottom.x + 20, this.height);
      // Crossbars
      for (let y = towerTop.y; y < this.height; y += 25) {
        ctx.moveTo(towerTop.x, y);
        ctx.lineTo(towerTop.x + 20, y + 15);
      }
      ctx.stroke();

      // Draw landing slope snow mesh
      ctx.beginPath();
      const firstInrun = this.worldToScreen(geom.inrunPoints[0].x, geom.inrunPoints[0].y);
      ctx.moveTo(firstInrun.x, firstInrun.y);

      // Inrun track curve
      for (let i = 1; i < geom.inrunPoints.length; i++) {
        const p = this.worldToScreen(geom.inrunPoints[i].x, geom.inrunPoints[i].y);
        ctx.lineTo(p.x, p.y);
      }

      // Takeoff lip drop at x = 0
      const lipPt = this.worldToScreen(0, 0);
      const knollPt = this.worldToScreen(geom.landingPoints[0].x, geom.landingPoints[0].y);
      ctx.lineTo(lipPt.x, lipPt.y);
      ctx.lineTo(knollPt.x, knollPt.y);

      // Landing slope points
      for (let i = 1; i < geom.landingPoints.length; i++) {
        const p = this.worldToScreen(geom.landingPoints[i].x, geom.landingPoints[i].y);
        ctx.lineTo(p.x, p.y);
      }

      // Close polygon to bottom of screen for snow ground fill
      ctx.lineTo(this.width + 100, this.height + 200);
      ctx.lineTo(-100, this.height + 200);
      ctx.closePath();

      ctx.fillStyle = hill.hillSnowColor || '#f1f2f6';
      ctx.fill();

      // Hill surface outline / track groom lines
      ctx.strokeStyle = '#a4b0be';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inrun ice track groove
      ctx.strokeStyle = '#74b9ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < geom.inrunPoints.length; i++) {
        const p = this.worldToScreen(geom.inrunPoints[i].x, geom.inrunPoints[i].y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Takeoff Edge Marker (High-visibility red/white checkered threshold line at x=0)
      ctx.save();
      const edgeTop = this.worldToScreen(0, 0.4);
      const edgeBottom = this.worldToScreen(0, -3.2);
      ctx.strokeStyle = '#eb2f06';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(edgeTop.x, edgeTop.y);
      ctx.lineTo(edgeBottom.x, edgeBottom.y);
      ctx.stroke();

      // Subtle threshold lip marker
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(edgeTop.x - 2, edgeTop.y - 4, 4, 8);
      ctx.restore();

      // Draw Starting Gate Beam indicator (at top of inrun)
      ctx.save();
      const gatePt = this.worldToScreen(geom.inrunPoints[0].x, geom.inrunPoints[0].y + 0.3);
      ctx.strokeStyle = '#e67e22'; // wooden gate beam
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(gatePt.x - 12, gatePt.y);
      ctx.lineTo(gatePt.x + 12, gatePt.y);
      ctx.stroke();
      ctx.restore();

      // Draw K-Point Line (Red strip across slope)
      if (geom.kPoint.found) {
        const kPos = this.worldToScreen(geom.kPoint.x, geom.kPoint.y);
        ctx.save();
        ctx.strokeStyle = '#eb2f06'; // Red K-Point
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(kPos.x - 2, kPos.y - 12);
        ctx.lineTo(kPos.x + 2, kPos.y + 12);
        ctx.stroke();

        // K-point badge label
        ctx.fillStyle = '#eb2f06';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`K-${hill.kPoint}m`, kPos.x - 14, kPos.y - 16);
        ctx.restore();
      }

      // Draw HS-Point Line (Green strip across slope)
      if (geom.hsPoint.found) {
        const hsPos = this.worldToScreen(geom.hsPoint.x, geom.hsPoint.y);
        ctx.save();
        ctx.strokeStyle = '#2ed573'; // Green Hill Size
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(hsPos.x - 2, hsPos.y - 12);
        ctx.lineTo(hsPos.x + 2, hsPos.y + 12);
        ctx.stroke();

        ctx.fillStyle = '#2ed573';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`HS-${hill.hsPoint}m`, hsPos.x - 16, hsPos.y - 16);
        ctx.restore();
      }

      // Draw Pine Trees along the rim of the hill
      this.renderTrees(ctx, geom);

      // Draw Spectators & Banners at the outrun
      this.renderSpectators(ctx, geom);
    }

    renderTrees(ctx, geom) {
      ctx.fillStyle = '#1e3720';
      const treeSpacing = 28;
      for (let i = 10; i < geom.landingPoints.length; i += treeSpacing) {
        const pt = geom.landingPoints[i];
        const screen = this.worldToScreen(pt.x, pt.y);
        if (screen.x > -30 && screen.x < this.width + 30) {
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y - 25);
          ctx.lineTo(screen.x - 8, screen.y);
          ctx.lineTo(screen.x + 8, screen.y);
          ctx.closePath();
          ctx.fill();

          // Snow cap on tree
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y - 25);
          ctx.lineTo(screen.x - 4, screen.y - 16);
          ctx.lineTo(screen.x + 4, screen.y - 16);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#1e3720';
        }
      }
    }

    renderSpectators(ctx, geom) {
      if (!geom.hsPoint.found) return;
      const startX = geom.hsPoint.x * 1.15;

      const crowdColors = ['#e74c3c', '#f1c40f', '#3498db', '#ffffff', '#2ecc71', '#9b59b6'];
      for (let i = 0; i < 30; i++) {
        const ptX = startX + i * 4;
        const ground = window.SkiHills.getGroundAt(this.hill, ptX);
        const p = this.worldToScreen(ptX, ground.y);
        if (p.x > -20 && p.x < this.width + 20) {
          ctx.fillStyle = crowdColors[i % crowdColors.length];
          ctx.beginPath();
          ctx.arc(p.x, p.y - 12, 3, 0, Math.PI * 2);
          ctx.fill();

          // Polish flag held by fan
          if (i === 12 || i === 24) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(p.x + 4, p.y - 28, 12, 4);
            ctx.fillStyle = '#dc3545';
            ctx.fillRect(p.x + 4, p.y - 24, 12, 4);
            ctx.strokeStyle = '#555';
            ctx.beginPath();
            ctx.moveTo(p.x + 4, p.y - 28);
            ctx.lineTo(p.x + 4, p.y - 10);
            ctx.stroke();
          }
        }
      }
    }

    renderSkierTrail(ctx, state) {
      if (!state.trail || state.trail.length < 2) return;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < state.trail.length; i++) {
        const p = this.worldToScreen(state.trail[i].x, state.trail[i].y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    /**
     * Authentic DSJ2 V-style pixel skier renderer
     */
    renderSkier(ctx, state) {
      const pos = this.worldToScreen(state.x, state.y);
      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Rotate skier according to body pitch
      ctx.rotate((-state.pitch * Math.PI) / 180);

      const suitColor = this.skierConfig.suitColor || '#d63031';
      const skisColor = this.skierConfig.skisColor || '#0984e3';

      if (state.phase === 'CRASHED') {
        // Tumble sprite (jumbled skis and flailing skier)
        ctx.strokeStyle = skisColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.lineTo(15, 8);
        ctx.moveTo(-8, 12);
        ctx.lineTo(12, -14);
        ctx.stroke();

        ctx.fillStyle = suitColor;
        ctx.fillRect(-6, -6, 12, 12);

        ctx.fillStyle = '#ffeaa7'; // face
        ctx.beginPath();
        ctx.arc(0, -10, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return;
      }

      // Active Skier in Inrun / Flight / Telemark stance
      if (state.phase === 'IN_RUN' || state.phase === 'GATE') {
        // Tucked inrun crouch
        ctx.strokeStyle = skisColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-16, 2);
        ctx.lineTo(18, 2);
        ctx.stroke();

        // Crouched body
        ctx.fillStyle = suitColor;
        ctx.beginPath();
        ctx.ellipse(0, -6, 10, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Helmet
        ctx.fillStyle = this.skierConfig.helmetColor || '#ffffff';
        ctx.beginPath();
        ctx.arc(7, -9, 4, 0, Math.PI * 2);
        ctx.fill();

        // Goggles
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(8, -10, 3, 2);

      } else if (state.phase === 'FLIGHT' || state.phase === 'TAKEOFF') {
        // Iconic DSJ2 Aerodynamic V-Flight Stance
        ctx.strokeStyle = skisColor;
        ctx.lineWidth = 2.8;

        // Bottom/Right ski
        ctx.beginPath();
        ctx.moveTo(-18, 5);
        ctx.lineTo(20, -1);
        ctx.stroke();

        // Top/Left ski (V flare)
        ctx.beginPath();
        ctx.moveTo(-18, -3);
        ctx.lineTo(20, -10);
        ctx.stroke();

        // Skier body leaned forward flat between skis
        ctx.fillStyle = suitColor;
        ctx.beginPath();
        ctx.ellipse(2, -4, 12, 4.5, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // Helmet
        ctx.fillStyle = this.skierConfig.helmetColor || '#ffffff';
        ctx.beginPath();
        ctx.arc(14, -6, 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Goggles & visor
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(15, -7, 4, 2.5);

        // Famous Polish mustache!
        if (this.skierConfig.hasMustache) {
          ctx.fillStyle = '#2d3436';
          ctx.fillRect(14, -4, 3, 1.5);
        }

      } else if (state.phase === 'LANDED') {
        const isTele = state.landingType === 'telemark';

        ctx.strokeStyle = skisColor;
        ctx.lineWidth = 3;
        if (isTele) {
          // Front ski forward, rear ski staggered back
          ctx.beginPath();
          ctx.moveTo(-10, 2);
          ctx.lineTo(22, 2); // lead ski
          ctx.moveTo(-22, 3);
          ctx.lineTo(8, 3);  // trailing ski
          ctx.stroke();

          // Lunged Telemark posture
          ctx.fillStyle = suitColor;
          ctx.beginPath();
          ctx.ellipse(-2, -9, 8, 6, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Head & arms spread in triumph
          ctx.fillStyle = this.skierConfig.helmetColor || '#ffffff';
          ctx.beginPath();
          ctx.arc(4, -16, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = suitColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -11);
          ctx.lineTo(-8, -18); // left arm back
          ctx.moveTo(2, -11);
          ctx.lineTo(12, -17); // right arm forward
          ctx.stroke();

        } else {
          // Parallel two-foot landing
          ctx.beginPath();
          ctx.moveTo(-16, 2);
          ctx.lineTo(18, 2);
          ctx.stroke();

          ctx.fillStyle = suitColor;
          ctx.beginPath();
          ctx.ellipse(0, -8, 8, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = this.skierConfig.helmetColor || '#ffffff';
          ctx.beginPath();
          ctx.arc(0, -16, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    renderSnow(ctx) {
      // Dynamic snow spray from skis
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const p of this.sprayParticles) {
        const s = this.worldToScreen(p.x, p.y);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ambient snowflakes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (const s of this.snowflakes) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /**
     * Renders prominent retro arcade takeoff feedback banner right on canvas
     */
    renderTakeoffBannerOverlay(ctx) {
      if (!this.feedbackBanner.visible) return;

      ctx.save();
      const centerX = this.width * 0.5;
      const bannerY = 68;

      // Outer pill box
      ctx.fillStyle = 'rgba(10, 14, 23, 0.88)';
      ctx.strokeStyle = this.feedbackBanner.color;
      ctx.lineWidth = 2.5;

      const text = this.feedbackBanner.text;
      ctx.font = 'bold 15px "Press Start 2P", monospace';
      const textWidth = ctx.measureText(text).width;
      const padX = 22;
      const boxW = textWidth + padX * 2;
      const boxH = 34;

      ctx.beginPath();
      ctx.roundRect(centerX - boxW * 0.5, bannerY - boxH * 0.5, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      // Text label with shadow
      ctx.fillStyle = this.feedbackBanner.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(text, centerX, bannerY);

      ctx.restore();
    }

    renderRetroScanlines(ctx) {
      // Subtle CRT scanline overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      for (let y = 0; y < this.height; y += 4) {
        ctx.fillRect(0, y, this.width, 1.5);
      }
    }

    setHill(hill) {
      this.hill = hill;
    }

    setSkierConfig(config) {
      this.skierConfig = Object.assign(this.skierConfig, config);
    }
  }

  // Export to global window
  const renderer = new SkiGameRenderer();
  window.SkiRenderer = {
    init: (canvas) => renderer.init(canvas),
    setHill: (hill) => renderer.setHill(hill),
    setSkierConfig: (cfg) => renderer.setSkierConfig(cfg),
    showTakeoffBanner: (fb) => renderer.showTakeoffBanner(fb),
    clearTakeoffBanner: () => renderer.clearTakeoffBanner(),
    render: (jumpState, hill, skierConfig) => {
      if (hill) renderer.setHill(hill);
      if (skierConfig) renderer.setSkierConfig(skierConfig);
      renderer.render();
    },
    getInstance: () => renderer
  };

})();
