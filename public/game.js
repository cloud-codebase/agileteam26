/**
 * Combat Engine, Referee State Machine, Collision Detection & Match Loop
 * Adheres strictly to DESIGN.md and integrates with:
 *  - Fencer (fencer.js): Kinematics, blade segments, hitboxes, guard stances
 *  - AudioFX (audio.js): Sound effects (clash, parry, touché, whistle, buzzer)
 *  - UI Scoreboard (index.html): #pisteCanvas, #p1Score, #p2Score, #refereeStatus, #matchClock, #p1Indicator, #p2Indicator
 *  - Backend API: relative 'api/match-stats' & 'api/health'
 */

(function (window) {
  'use strict';

  // Referee / Match states
  const REFEREE_STATES = {
    WAITING: 'waiting',       // Ready to start bout
    EN_GARDE: 'en_garde',     // "En Garde!"
    PRETS: 'prets',           // "Prêts?"
    ALLEZ: 'allez',           // "Allez!" (Active fencing)
    HALTE_TOUCHE: 'touche',   // "Halte! Touché!"
    HALTE_TIME: 'time_out',   // "Halte! Temps expiré!"
    MATCH_OVER: 'match_over'  // "Victoire!"
  };

  const BOUT_DURATION_SECONDS = 180; // 3 minutes standard Olympic bout
  const WINNING_SCORE = 5;

  class GameEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.fencer1 = null;
      this.fencer2 = null;

      // Match timing & referee
      this.state = REFEREE_STATES.WAITING;
      this.timeRemaining = BOUT_DURATION_SECONDS;
      this.clockTimerId = null;
      this.refereeSequenceTimerId = null;
      this.lastFrameTime = 0;
      this.animationFrameId = null;

      // Piste geometry
      this.pisteBounds = {
        minX: 70,
        maxX: 890,
        stripY: 300,
        stripH: 30
      };

      // Input tracking
      this.keysPressed = {};

      // Combat spark effects
      this.sparks = [];

      // Referee announcement banner
      this.announcementText = '';
      this.announcementTimer = 0;
      this.announcementColor = '#ffffff';

      // Statistics
      this.stats = {
        bouts: 0,
        p1Wins: 0,
        p2Wins: 0
      };

      // Touch cooldown to avoid multiple points during a single lunge
      this.touchCooldown = 0;
    }

    /**
     * Initialize DOM references, fencers, audio, listeners, and loop
     */
    init() {
      this.canvas = document.getElementById('pisteCanvas');
      if (!this.canvas) {
        console.warn('Fencing canvas #pisteCanvas not found in DOM.');
        return;
      }
      this.ctx = this.canvas.getContext('2d');

      // Create Fencers (P1 Blue facing right, P2 Red facing left)
      if (typeof window.Fencer === 'function') {
        this.fencer1 = new window.Fencer({ id: 1, x: 280, color: '#3b82f6', facing: 1 });
        this.fencer2 = new window.Fencer({ id: 2, x: 680, color: '#ef4444', facing: -1 });
      } else {
        console.error('Fencer class not loaded from fencer.js!');
      }

      // Attach keyboard input
      this.setupInputListeners();

      // Attach UI buttons
      this.setupButtonListeners();

      // Initial stats fetch from backend
      this.fetchStats();

      // Update UI elements
      this.updateScoreDisplay();
      this.updateClockDisplay();
      this.setRefereeMessage('En Garde! (Click Start Match)');

      // Start rendering loop
      this.lastFrameTime = performance.now();
      this.loop = this.loop.bind(this);
      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    setupInputListeners() {
      window.addEventListener('keydown', (e) => {
        // Prevent default scrolling for game controls
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }

        // Initialize audio on first user keystroke
        if (window.AudioFX) {
          window.AudioFX.init();
        }

        this.keysPressed[e.code] = true;
        this.keysPressed[e.key] = true;
      });

      window.addEventListener('keyup', (e) => {
        this.keysPressed[e.code] = false;
        this.keysPressed[e.key] = false;
      });

      // Clear keys on window blur
      window.addEventListener('blur', () => {
        this.keysPressed = {};
      });
    }

    setupButtonListeners() {
      const btnStart = document.getElementById('btnStartMatch');
      const btnReset = document.getElementById('btnResetMatch');

      if (btnStart) {
        btnStart.addEventListener('click', () => {
          if (window.AudioFX) window.AudioFX.init();
          this.startNewMatch();
        });
      }

      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (window.AudioFX) window.AudioFX.init();
          this.resetBout();
        });
      }
    }

    /**
     * Start entire match from 0-0
     */
    startNewMatch() {
      this.stopClock();
      clearTimeout(this.refereeSequenceTimerId);

      if (this.fencer1) this.fencer1.score = 0;
      if (this.fencer2) this.fencer2.score = 0;
      this.timeRemaining = BOUT_DURATION_SECONDS;

      this.updateScoreDisplay();
      this.updateClockDisplay();
      this.clearToucheIndicators();

      this.resetFencerPositions();
      this.beginRefereeSequence();
    }

    /**
     * Reset fencers to on-guard lines after a touch or user reset
     */
    resetBout() {
      this.stopClock();
      clearTimeout(this.refereeSequenceTimerId);

      this.resetFencerPositions();
      this.clearToucheIndicators();
      this.beginRefereeSequence();
    }

    resetFencerPositions() {
      if (this.fencer1) this.fencer1.resetPosition(280);
      if (this.fencer2) this.fencer2.resetPosition(680);
    }

    clearToucheIndicators() {
      const ind1 = document.getElementById('p1Indicator');
      const ind2 = document.getElementById('p2Indicator');
      if (ind1) ind1.classList.remove('active');
      if (ind2) ind2.classList.remove('active');

      const banner = document.getElementById('pisteAnnouncement');
      if (banner) banner.classList.remove('active');
    }

    /**
     * Authentic FIE Referee Cadence: "En Garde!" -> "Prêts?" -> "Allez!"
     */
    beginRefereeSequence() {
      this.state = REFEREE_STATES.EN_GARDE;
      this.setRefereeMessage('En Garde!');
      this.showAnnouncement('EN GARDE!', '#fbbf24', 1.0);
      if (window.AudioFX) window.AudioFX.playWhistle();

      this.refereeSequenceTimerId = setTimeout(() => {
        this.state = REFEREE_STATES.PRETS;
        this.setRefereeMessage('Prêts?');
        this.showAnnouncement('PRÊTS?', '#60a5fa', 0.8);

        this.refereeSequenceTimerId = setTimeout(() => {
          this.state = REFEREE_STATES.ALLEZ;
          this.setRefereeMessage('Allez!');
          this.showAnnouncement('ALLEZ!', '#34d399', 1.0);
          if (window.AudioFX) window.AudioFX.playWhistle();
          this.startClock();
        }, 800);
      }, 900);
    }

    startClock() {
      this.stopClock();
      this.clockTimerId = setInterval(() => {
        if (this.state === REFEREE_STATES.ALLEZ) {
          this.timeRemaining = Math.max(0, this.timeRemaining - 1);
          this.updateClockDisplay();

          if (this.timeRemaining <= 0) {
            this.handleTimeExpired();
          }
        }
      }, 1000);
    }

    stopClock() {
      if (this.clockTimerId) {
        clearInterval(this.clockTimerId);
        this.clockTimerId = null;
      }
    }

    updateClockDisplay() {
      const clockEl = document.getElementById('matchClock');
      if (!clockEl) return;
      const minutes = Math.floor(this.timeRemaining / 60);
      const seconds = this.timeRemaining % 60;
      clockEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateScoreDisplay() {
      const p1El = document.getElementById('p1Score');
      const p2El = document.getElementById('p2Score');
      if (p1El && this.fencer1) p1El.textContent = this.fencer1.score;
      if (p2El && this.fencer2) p2El.textContent = this.fencer2.score;
    }

    setRefereeMessage(text) {
      const el = document.getElementById('refereeStatus');
      if (el) el.textContent = text;
    }

    showAnnouncement(text, color = '#ffffff', duration = 1.2) {
      this.announcementText = text;
      this.announcementColor = color;
      this.announcementTimer = duration;

      const overlay = document.getElementById('pisteAnnouncement');
      if (overlay) {
        overlay.textContent = text;
        overlay.style.color = color;
        overlay.classList.add('active');
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
          overlay.classList.remove('active');
        }, duration * 1000);
      }
    }

    /**
     * Main animation frame loop
     */
    loop(currentTime) {
      const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.05);
      this.lastFrameTime = currentTime;

      this.update(dt);
      this.draw();

      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * Physics, kinematics, combat collision, and particle updates
     */
    update(dt) {
      if (this.announcementTimer > 0) {
        this.announcementTimer -= dt;
      }
      if (this.touchCooldown > 0) {
        this.touchCooldown -= dt;
      }

      // Update sparks
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) {
          this.sparks.splice(i, 1);
        }
      }

      // If active combat is underway, update fencers and check collisions
      if (this.state === REFEREE_STATES.ALLEZ) {
        if (this.fencer1) {
          this.fencer1.update(this.keysPressed, this.pisteBounds, dt);
        }
        if (this.fencer2) {
          this.fencer2.update(this.keysPressed, this.pisteBounds, dt);
        }

        // Prevent fencers from passing through each other (body collision constraint)
        this.resolveFencerBodies();

        // Check weapon blade intersections & body hitboxes
        this.checkCollisions();
      } else if (
        this.state === REFEREE_STATES.HALTE_TOUCHE ||
        this.state === REFEREE_STATES.EN_GARDE ||
        this.state === REFEREE_STATES.PRETS
      ) {
        // Minor idle update without keyboard input
        if (this.fencer1) this.fencer1.update({}, this.pisteBounds, dt);
        if (this.fencer2) this.fencer2.update({}, this.pisteBounds, dt);
      }
    }

    /**
     * Prevent fencers from walking through each other
     */
    resolveFencerBodies() {
      if (!this.fencer1 || !this.fencer2) return;
      const minDistance = 42; // minimum separation between centers
      const diff = this.fencer2.x - this.fencer1.x;

      if (diff < minDistance) {
        const overlap = (minDistance - diff) / 2;
        this.fencer1.x = Math.max(this.pisteBounds.minX, this.fencer1.x - overlap);
        this.fencer2.x = Math.min(this.pisteBounds.maxX, this.fencer2.x + overlap);
        this.fencer1.vx = 0;
        this.fencer2.vx = 0;
      }
    }

    /**
     * Line segment intersection helper
     */
    checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
      const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
      if (Math.abs(denom) < 0.0001) return null; // parallel

      const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
      const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

      if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        return {
          x: x1 + ua * (x2 - x1),
          y: y1 + ua * (y2 - y1)
        };
      }
      return null;
    }

    /**
     * Point in rectangle helper
     */
    pointInRect(px, py, rect) {
      return px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
    }

    /**
     * Line segment vs rectangle collision
     */
    segmentIntersectsRect(x1, y1, x2, y2, rect) {
      // Check if either end point is inside
      if (this.pointInRect(x1, y1, rect) || this.pointInRect(x2, y2, rect)) {
        return true;
      }
      // Check intersection with all 4 borders
      const top = this.checkLineIntersection(x1, y1, x2, y2, rect.left, rect.top, rect.right, rect.top);
      if (top) return true;
      const bottom = this.checkLineIntersection(x1, y1, x2, y2, rect.left, rect.bottom, rect.right, rect.bottom);
      if (bottom) return true;
      const left = this.checkLineIntersection(x1, y1, x2, y2, rect.left, rect.top, rect.left, rect.bottom);
      if (left) return true;
      const right = this.checkLineIntersection(x1, y1, x2, y2, rect.right, rect.top, rect.right, rect.bottom);
      if (right) return true;

      return false;
    }

    /**
     * Core Combat Engine: checks blade parries and body touches
     */
    checkCollisions() {
      if (this.touchCooldown > 0) return;
      if (!this.fencer1 || !this.fencer2) return;

      const blade1 = this.fencer1.getBladeSegment();
      const blade2 = this.fencer2.getBladeSegment();
      const body1 = this.fencer1.getBodyHitbox();
      const body2 = this.fencer2.getBodyHitbox();

      // 1. Blade vs Blade collision (Parry / Clash detection)
      const bladeClash = this.checkLineIntersection(
        blade1.x1, blade1.y1, blade1.x2, blade1.y2,
        blade2.x1, blade2.y1, blade2.x2, blade2.y2
      );

      let bladeDeflected = false;

      if (bladeClash) {
        // Case A: P1 is thrusting, P2 is in Zasłona Guard
        if (blade1.isThrusting && !blade2.isThrusting && blade2.guard !== 'neutral') {
          // Check high/low matching parry
          const thrustY = blade1.y2;
          const isHighAttack = thrustY < (this.pisteBounds.stripY - 55);

          const matchedParry = (isHighAttack && blade2.guard === 'zaslona_high') ||
                               (!isHighAttack && blade2.guard === 'zaslona_low');

          if (matchedParry) {
            this.handleParryDeflection(this.fencer2, this.fencer1, bladeClash.x, bladeClash.y);
            bladeDeflected = true;
          }
        }

        // Case B: P2 is thrusting, P1 is in Zasłona Guard
        if (blade2.isThrusting && !blade1.isThrusting && blade1.guard !== 'neutral') {
          const thrustY = blade2.y2;
          const isHighAttack = thrustY < (this.pisteBounds.stripY - 55);

          const matchedParry = (isHighAttack && blade1.guard === 'zaslona_high') ||
                               (!isHighAttack && blade1.guard === 'zaslona_low');

          if (matchedParry) {
            this.handleParryDeflection(this.fencer1, this.fencer2, bladeClash.x, bladeClash.y);
            bladeDeflected = true;
          }
        }

        // Case C: Both attacking or mutual blade bind (Clash)
        if (!bladeDeflected) {
          this.handleBladeClash(bladeClash.x, bladeClash.y);
        }
      }

      if (bladeDeflected) {
        return; // Attack was successfully defended by Zasłona
      }

      // 2. Touché Detection (Blade tip touching opponent's torso)
      let p1HitP2 = false;
      let p2HitP1 = false;

      // P1 touches P2
      if (blade1.isThrusting) {
        if (this.pointInRect(blade1.x2, blade1.y2, body2) ||
            this.segmentIntersectsRect(blade1.x1, blade1.y1, blade1.x2, blade1.y2, body2)) {
          p1HitP2 = true;
        }
      }

      // P2 touches P1
      if (blade2.isThrusting) {
        if (this.pointInRect(blade2.x2, blade2.y2, body1) ||
            this.segmentIntersectsRect(blade2.x1, blade2.y1, blade2.x2, blade2.y2, body1)) {
          p2HitP1 = true;
        }
      }

      // Resolve Hit
      if (p1HitP2 && p2HitP1) {
        // In foil/épée simultaneous hit (coup double)
        this.onSimultaneousHit();
      } else if (p1HitP2) {
        this.onHit(this.fencer1, this.fencer2, blade1.x2, blade1.y2);
      } else if (p2HitP1) {
        this.onHit(this.fencer2, this.fencer1, blade2.x2, blade2.y2);
      }
    }

    /**
     * Triggered when a defender successfully parries an attacker's thrust with Zasłona
     */
    handleParryDeflection(defender, attacker, px, py) {
      attacker.onParried();
      this.touchCooldown = 0.35;

      this.createSparkExplosion(px, py, '#38bdf8', 16);
      if (window.AudioFX) {
        window.AudioFX.playParry();
      }

      this.showAnnouncement(`PARRY! (P${defender.id} ZASŁONA)`, '#38bdf8', 0.8);
    }

    /**
     * Metallic blade clash when weapons collide without full parry deflection
     */
    handleBladeClash(px, py) {
      this.createSparkExplosion(px, py, '#fbbf24', 8);
      if (window.AudioFX) {
        window.AudioFX.playClash();
      }
    }

    /**
     * Touché resolution when an attacker strikes the opponent
     */
    onHit(attacker, defender, hitX, hitY) {
      attacker.score += 1;
      defender.onHit();
      this.touchCooldown = 1.0;

      // Visual indicator on scoreboard
      const indicator = document.getElementById(attacker.id === 1 ? 'p1Indicator' : 'p2Indicator');
      if (indicator) {
        indicator.classList.add('active');
      }

      // Spark burst at point d'arrêt contact
      const sparkColor = attacker.id === 1 ? '#60a5fa' : '#f87171';
      this.createSparkExplosion(hitX || defender.x, hitY || defender.y - 60, sparkColor, 24);

      if (window.AudioFX) {
        window.AudioFX.playTouche();
      }

      this.updateScoreDisplay();

      // Referee Halte!
      this.state = REFEREE_STATES.HALTE_TOUCHE;
      this.stopClock();
      this.setRefereeMessage(`Halte! Point à P${attacker.id}!`);
      this.showAnnouncement(`TOUCHÉ! POINT P${attacker.id}`, sparkColor, 1.4);

      // Check Match Victory
      if (attacker.score >= WINNING_SCORE) {
        this.handleMatchVictory(attacker);
      } else {
        // Prepare next touch after short dramatic pause
        this.refereeSequenceTimerId = setTimeout(() => {
          this.clearToucheIndicators();
          this.resetFencerPositions();
          this.beginRefereeSequence();
        }, 1600);
      }
    }

    /**
     * Coup double / simultaneous attack hit
     */
    onSimultaneousHit() {
      this.fencer1.score += 1;
      this.fencer2.score += 1;
      this.fencer1.onHit();
      this.fencer2.onHit();
      this.touchCooldown = 1.0;

      const ind1 = document.getElementById('p1Indicator');
      const ind2 = document.getElementById('p2Indicator');
      if (ind1) ind1.classList.add('active');
      if (ind2) ind2.classList.add('active');

      if (window.AudioFX) {
        window.AudioFX.playTouche();
      }

      this.updateScoreDisplay();
      this.state = REFEREE_STATES.HALTE_TOUCHE;
      this.stopClock();
      this.setRefereeMessage('Halte! Coup Double!');
      this.showAnnouncement('COUP DOUBLE!', '#fbbf24', 1.4);

      if (this.fencer1.score >= WINNING_SCORE || this.fencer2.score >= WINNING_SCORE) {
        if (this.fencer1.score > this.fencer2.score) {
          this.handleMatchVictory(this.fencer1);
        } else if (this.fencer2.score > this.fencer1.score) {
          this.handleMatchVictory(this.fencer2);
        } else {
          // Sudden death priority touch
          this.setRefereeMessage('Priority Bout! Next Touch Wins!');
          this.refereeSequenceTimerId = setTimeout(() => {
            this.clearToucheIndicators();
            this.resetFencerPositions();
            this.beginRefereeSequence();
          }, 1600);
        }
      } else {
        this.refereeSequenceTimerId = setTimeout(() => {
          this.clearToucheIndicators();
          this.resetFencerPositions();
          this.beginRefereeSequence();
        }, 1600);
      }
    }

    /**
     * Match complete via 5 touches
     */
    handleMatchVictory(winner) {
      this.state = REFEREE_STATES.MATCH_OVER;
      this.stopClock();
      const winnerName = winner.id === 1 ? 'P1 (Blue)' : 'P2 (Red)';
      this.setRefereeMessage(`Victoire! ${winnerName} gagne le match!`);
      this.showAnnouncement(`VICTOIRE! ${winnerName.toUpperCase()} WINS!`, winner.color, 3.0);

      if (window.AudioFX && typeof window.AudioFX.playBuzzer === 'function') {
        window.AudioFX.playBuzzer();
      }

      // Record match outcome via backend API
      this.recordMatchStats(winner.id);
    }

    /**
     * 3-minute bout timer expiration
     */
    handleTimeExpired() {
      this.state = REFEREE_STATES.HALTE_TIME;
      this.stopClock();

      if (window.AudioFX && typeof window.AudioFX.playBuzzer === 'function') {
        window.AudioFX.playBuzzer();
      }

      let winnerId = null;
      if (this.fencer1.score > this.fencer2.score) {
        winnerId = 1;
      } else if (this.fencer2.score > this.fencer1.score) {
        winnerId = 2;
      }

      if (winnerId) {
        this.handleMatchVictory(winnerId === 1 ? this.fencer1 : this.fencer2);
      } else {
        this.setRefereeMessage('Temps expiré! Égalité parfaite!');
        this.showAnnouncement('TEMPS EXPIRÉ - ÉGALITÉ', '#fbbf24', 2.5);
        this.recordMatchStats(null);
      }
    }

    /**
     * Spawn spark particle effects
     */
    createSparkExplosion(x, y, color, count = 12) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 220;
        this.sparks.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          color: color,
          size: 2 + Math.random() * 3,
          life: 0.25 + Math.random() * 0.35,
          maxLife: 0.6
        });
      }
    }

    /**
     * Render the Olympic Piste strip, warning lines, fencers, and sparks
     */
    draw() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;

      // 1. Clear background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(1, '#111a2e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Official Fencing Piste (Metallic Strip)
      const stripY = this.pisteBounds.stripY;
      const stripH = this.pisteBounds.stripH;
      const pisteLeft = 40;
      const pisteWidth = width - 80;

      // Metallic gradient
      const pisteGrad = ctx.createLinearGradient(0, stripY, 0, stripY + stripH);
      pisteGrad.addColorStop(0, '#3a4b6e');
      pisteGrad.addColorStop(0.5, '#263450');
      pisteGrad.addColorStop(1, '#182236');
      ctx.fillStyle = pisteGrad;
      ctx.fillRect(pisteLeft, stripY, pisteWidth, stripH);

      // Border
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(pisteLeft, stripY, pisteWidth, stripH);

      // Center Line (Yellow)
      const centerX = width / 2;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, stripY - 12);
      ctx.lineTo(centerX, stripY + stripH + 12);
      ctx.stroke();

      // On-guard lines (White, 2m from center)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      [centerX - 140, centerX + 140].forEach((gx) => {
        ctx.beginPath();
        ctx.moveTo(gx, stripY);
        ctx.lineTo(gx, stripY + stripH);
        ctx.stroke();
      });

      // Warning lines (Amber, 2m before end)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      [centerX - 360, centerX + 360].forEach((wx) => {
        ctx.beginPath();
        ctx.moveTo(wx, stripY);
        ctx.lineTo(wx, stripY + stripH);
        ctx.stroke();
      });

      // Rear limit lines (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      [pisteLeft, pisteLeft + pisteWidth].forEach((rx) => {
        ctx.beginPath();
        ctx.moveTo(rx, stripY - 6);
        ctx.lineTo(rx, stripY + stripH + 6);
        ctx.stroke();
      });

      // Piste strip label
      ctx.font = '700 13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText('PISTE OFFICIELLE DE COMBAT • 14m × 1.5m', centerX, stripY + 54);

      // Distance indicator
      if (this.fencer1 && this.fencer2) {
        const dist = Math.abs(this.fencer2.x - this.fencer1.x);
        ctx.font = '500 11px monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.fillText(`DISTANCE: ${(dist / 50).toFixed(2)}m`, centerX, stripY - 20);
      }

      // 3. Render Fencers
      if (this.fencer1) this.fencer1.draw(ctx);
      if (this.fencer2) this.fencer2.draw(ctx);

      // 4. Render Sparks
      for (let i = 0; i < this.sparks.length; i++) {
        const s = this.sparks[i];
        const alpha = Math.max(0, s.life / s.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /**
     * REST API: Fetch session stats from Express server
     * Adheres strictly to Subpath Safety: calls 'api/match-stats' WITHOUT leading slash!
     */
    fetchStats() {
      fetch('api/match-stats')
        .then((res) => {
          if (!res.ok) throw new Error('Network error fetching match stats');
          return res.json();
        })
        .then((data) => {
          this.stats.bouts = data.boutsPlayed || 0;
          this.stats.p1Wins = data.p1Wins || 0;
          this.stats.p2Wins = data.p2Wins || 0;
          this.updateStatsUI();
        })
        .catch((err) => {
          console.warn('Could not fetch match stats from server (running static preview?):', err.message);
        });
    }

    /**
     * REST API: Post match outcome to server
     * Relative path: 'api/match-stats'
     */
    recordMatchStats(winnerId) {
      fetch('api/match-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: winnerId })
      })
        .then((res) => res.json())
        .then((data) => {
          this.stats.bouts = data.boutsPlayed || this.stats.bouts + 1;
          this.stats.p1Wins = data.p1Wins || this.stats.p1Wins + (winnerId === 1 ? 1 : 0);
          this.stats.p2Wins = data.p2Wins || this.stats.p2Wins + (winnerId === 2 ? 1 : 0);
          this.updateStatsUI();
        })
        .catch((err) => {
          // Local fallback in case server is offline
          this.stats.bouts += 1;
          if (winnerId === 1) this.stats.p1Wins += 1;
          if (winnerId === 2) this.stats.p2Wins += 1;
          this.updateStatsUI();
          console.warn('Fallback local stat increment due to:', err.message);
        });
    }

    updateStatsUI() {
      const boutsEl = document.getElementById('statBouts');
      const p1WinsEl = document.getElementById('statP1Wins');
      const p2WinsEl = document.getElementById('statP2Wins');
      if (boutsEl) boutsEl.textContent = this.stats.bouts;
      if (p1WinsEl) p1WinsEl.textContent = this.stats.p1Wins;
      if (p2WinsEl) p2WinsEl.textContent = this.stats.p2Wins;
    }
  }

  // Expose GameEngine globally
  window.GameEngine = GameEngine;
  window.Game = new GameEngine();

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    if (window.Game) {
      window.Game.init();
    }
  });
})(typeof window !== 'undefined' ? window : this);
