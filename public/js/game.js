/**
 * Retro Drift Race - Drift Scoring Engine, Multipliers, Game Loop & Orchestration
 * Module: public/js/game.js
 * Author: Athos (Senior Full-Stack Developer - Wave 2 / SCRUM-203)
 *
 * Implements window.GameEngine adhering to DESIGN.md:
 * - Drift accumulation formula: score += speed * slipAngle * comboMultiplier * dt
 * - Dynamic combo multiplier growth & grace window decay
 * - Circuit boundary collision responses & curb slowdown
 * - Lap tracking & lap time telemetry
 * - Full HUD DOM updates (#speed-val, #drift-meter-bar, #current-score, etc.)
 * - 60fps requestAnimationFrame game loop
 * - Leaderboard modal submission (POST api/scores) and fetching (GET api/scores)
 */

(function (window) {
  'use strict';

  class GameEngine {
    constructor() {
      // DOM Elements
      this.canvas = null;
      this.ctx = null;
      this.speedValEl = null;
      this.gearValEl = null;
      this.driftAngleValEl = null;
      this.driftMeterBarEl = null;
      this.currentScoreEl = null;
      this.comboMultiplierEl = null;
      this.bankedScoreEl = null;
      this.driftBadgeEl = null;
      this.lapTimerEl = null;
      this.bestDriftEl = null;
      this.btnStart = null;
      this.btnRestart = null;
      this.overlayScreen = null;

      // Game States: 'idle', 'running', 'paused', 'finished'
      this.state = 'idle';

      // Drift Scoring & Combo System
      this.currentDriftScore = 0;   // Live accumulating score of the current drift
      this.bankedScore = 0;         // Total verified score banked from completed drifts
      this.comboMultiplier = 1.0;   // Starts at 1.0, increases up to 10.0
      this.maxCombo = 10.0;
      this.bestSingleDrift = 0;     // Highest single drift score achieved in session
      this.driftTime = 0;           // Seconds currently in drift
      this.comboGraceTimer = 0;     // Seconds remaining before combo expires after drift ends
      this.maxComboGrace = 1.6;     // Grace window (1.6s) to link next drift

      // Badge Milestones
      this.activeBadge = '';
      this.badgeTimeout = null;

      // Lap Tracking System
      this.lapStartTime = 0;
      this.currentLapTime = 0;
      this.bestLapTime = null;
      this.lapCount = 1;
      this.nextCheckpointIndex = 0;
      this.checkpointsPassed = 0;

      // Physics & Renderer handles
      this.physics = null;
      this.track = null;
      this.audio = null;

      // Game Loop timing
      this.lastFrameTime = 0;
      this.animationFrameId = null;

      // Wall collision cooldown to prevent bounce flicker
      this.collisionCooldown = 0;

      // Car render asset colors
      this.carColors = {
        body: '#00f0ff',
        cockpit: '#110924',
        glow: '#ff00a0',
        headlights: '#00ffff',
        taillights: '#ff0055'
      };
    }

    /**
     * Bootstrap game engine on DOMContentLoaded
     */
    init() {
      this.canvas = document.getElementById('game-canvas');
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d');
      }

      // Cache HUD DOM references
      this.speedValEl = document.getElementById('speed-val');
      this.gearValEl = document.getElementById('gear-val');
      this.driftAngleValEl = document.getElementById('drift-angle-val');
      this.driftMeterBarEl = document.getElementById('drift-meter-bar');
      this.currentScoreEl = document.getElementById('current-score');
      this.comboMultiplierEl = document.getElementById('combo-multiplier');
      this.bankedScoreEl = document.getElementById('banked-score');
      this.driftBadgeEl = document.getElementById('drift-badge');
      this.lapTimerEl = document.getElementById('lap-timer');
      this.bestDriftEl = document.getElementById('best-drift');
      this.btnStart = document.getElementById('btn-start');
      this.btnRestart = document.getElementById('btn-restart');
      this.overlayScreen = document.getElementById('overlay-screen');

      // Initialize sub-engines
      this.physics = window.VehiclePhysics;
      this.track = window.TrackRenderer;
      this.audio = window.RetroAudio;

      if (this.track && this.canvas && this.ctx) {
        this.track.init(this.canvas, this.ctx);
      }

      // Position car at spawn
      const spawn = this.track ? this.track.getSpawnPoint() : { x: 300, y: 350, angle: 0 };
      if (this.physics) {
        this.physics.init({
          startX: spawn.x,
          startY: spawn.y,
          startAngle: spawn.angle
        });
      }

      // Setup UI listeners
      this._setupEventListeners();

      // Initial visual render
      this.renderStatic();

      // Start the master RAF loop
      this.lastFrameTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));

      return this;
    }

    _setupEventListeners() {
      if (this.btnStart) {
        this.btnStart.addEventListener('click', () => {
          this.startGame();
        });
      }

      if (this.btnRestart) {
        this.btnRestart.addEventListener('click', () => {
          this.restartGame();
        });
      }

      // Keyboard shortcuts: 'R' to reset car position, 'P' to pause
      window.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
          if (this.state === 'running') {
            this.resetCarToTrack();
          }
        }
      });
    }

    startGame() {
      if (this.audio) {
        this.audio.init();
      }

      this.state = 'running';
      if (this.overlayScreen) {
        this.overlayScreen.classList.remove('active');
        this.overlayScreen.classList.add('hidden');
      }

      this.lapStartTime = performance.now();
      this.currentLapTime = 0;
    }

    restartGame() {
      this.currentDriftScore = 0;
      this.bankedScore = 0;
      this.comboMultiplier = 1.0;
      this.bestSingleDrift = 0;
      this.driftTime = 0;
      this.comboGraceTimer = 0;
      this.nextCheckpointIndex = 0;
      this.checkpointsPassed = 0;

      const spawn = this.track ? this.track.getSpawnPoint() : { x: 300, y: 350, angle: 0 };
      if (this.physics) {
        this.physics.reset(spawn.x, spawn.y, spawn.angle);
      }

      if (this.btnRestart) this.btnRestart.style.display = 'none';
      if (this.btnStart) this.btnStart.style.display = 'inline-block';

      this.startGame();
    }

    resetCarToTrack() {
      const state = this.physics ? this.physics.getState() : null;
      if (!state || !this.track) return;

      const col = this.track.checkCollision(state.x, state.y);
      if (col && col.nearestProj) {
        // Reset onto nearest centerline coordinate
        this.physics.reset(col.nearestProj.x, col.nearestProj.y, state.angle);
      }
    }

    /**
     * Master 60fps game loop
     */
    gameLoop(currentTime) {
      const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = currentTime;

      if (this.state === 'running') {
        this.update(dt);
      }

      this.render();

      this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * Main update step
     */
    update(dt) {
      if (!this.physics || !this.track) return;

      // 1. Step vehicle physics simulation
      const vState = this.physics.update(dt);

      // 2. Step track renderer (camera follow, tire marks, smoke/sparks)
      this.track.update(dt, vState);

      // 3. Track Boundary & Curb Collision Responses
      this.handleTrackCollisions(dt, vState);

      // 4. Lap Timing & Checkpoint Progression
      this.handleLapProgress(dt, vState);

      // 5. Drift Scoring & Combo Calculation
      this.handleDriftScoring(dt, vState);

      // 6. Audio FX modulation
      this.handleAudioFX(vState);

      // 7. Update HUD Telemetry
      this.updateHUD(vState);
    }

    handleTrackCollisions(dt, vState) {
      if (this.collisionCooldown > 0) {
        this.collisionCooldown -= dt;
      }

      const col = this.track.checkCollision(vState.x, vState.y);

      // Grass / Off-road drag penalty
      if (col.isOffTrack) {
        this.physics.applyOffroadPenalty(dt);
      }

      // Hard barrier collision bounce
      if (col.isWallCollision && this.collisionCooldown <= 0) {
        // Compute bounce normal away from wall toward track center
        const dx = col.nearestProj.x - vState.x;
        const dy = col.nearestProj.y - vState.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = dx / len;
        const ny = dy / len;

        // Bounce back into track
        const bounceSpeed = Math.max(vState.speed * 0.45, 120);
        this.physics.applyImpulse(nx * bounceSpeed, ny * bounceSpeed, 0.4);

        if (this.audio) {
          this.audio.playCrash();
        }

        // Drop current drift score on hard crash
        if (this.currentDriftScore > 50) {
          this.showDriftBadge('CRASHED! - COMBO LOST', '#ff0055');
          this.currentDriftScore = 0;
          this.comboMultiplier = 1.0;
        }

        this.collisionCooldown = 0.35;
      }
    }

    handleLapProgress(dt, vState) {
      this.currentLapTime += dt;

      const checkpoints = this.track.getCheckpoints();
      if (!checkpoints || checkpoints.length === 0) return;

      const targetCP = checkpoints[this.nextCheckpointIndex];
      const distToCP = Math.hypot(vState.x - targetCP.x, vState.y - targetCP.y);

      if (distToCP < targetCP.radius) {
        // Reached next checkpoint
        this.nextCheckpointIndex = (this.nextCheckpointIndex + 1) % checkpoints.length;
        this.checkpointsPassed++;

        if (this.audio) {
          this.audio.playCheckpoint();
        }

        // Full lap completed if looped back to start checkpoint
        if (this.nextCheckpointIndex === 0 && this.checkpointsPassed >= checkpoints.length) {
          this.onLapCompleted();
        }
      }
    }

    onLapCompleted() {
      const lapTimeSeconds = this.currentLapTime;
      if (!this.bestLapTime || lapTimeSeconds < this.bestLapTime) {
        this.bestLapTime = lapTimeSeconds;
      }

      this.lapCount++;
      this.currentLapTime = 0;
      this.checkpointsPassed = 0;
      this.showDriftBadge(`LAP ${this.lapCount - 1} COMPLETE!`, '#00ffff');

      // Auto check and submit leaderboard score if qualifying
      if (this.bankedScore > 1000) {
        this.submitScore('DRIFT_KING', this.bankedScore, Math.round(this.bestSingleDrift));
      }
    }

    /**
     * Drift Scoring Engine & Combo Multipliers
     * Formula: score += speed * slipAngle * comboMultiplier * dt
     */
    handleDriftScoring(dt, vState) {
      const isDrifting = vState.isDrifting;
      const speed = vState.speed;
      const slipAngle = Math.abs(vState.slipAngle);

      if (isDrifting && speed > 100 && slipAngle > 0.15) {
        this.driftTime += dt;
        this.comboGraceTimer = this.maxComboGrace;

        // Dynamic score accumulation
        const rawPoints = (speed * 0.4) * (slipAngle * 2.5) * this.comboMultiplier * dt;
        this.currentDriftScore += rawPoints;

        // Multiplier ramps up with sustained drift time
        const targetMultiplier = Math.min(this.maxCombo, 1.0 + (this.driftTime * 0.75));
        if (targetMultiplier > this.comboMultiplier) {
          this.comboMultiplier = targetMultiplier;
        }

        // Dynamic badges based on accumulated drift
        if (this.currentDriftScore > 4000) {
          this.showDriftBadge('DRIFT GOD! 🔥', '#ff00a0');
        } else if (this.currentDriftScore > 2000) {
          this.showDriftBadge('INSANE DRIFT! ⚡', '#00ffe0');
        } else if (this.currentDriftScore > 800) {
          this.showDriftBadge('SWEET SLIDE! ✨', '#ffe600');
        }

        if (this.currentDriftScore > this.bestSingleDrift) {
          this.bestSingleDrift = this.currentDriftScore;
        }
      } else {
        // Drift ended; begin grace timer before banking or decaying combo
        if (this.comboGraceTimer > 0) {
          this.comboGraceTimer -= dt;
        } else {
          // Grace expired -> Bank current drift into total score and reset combo
          if (this.currentDriftScore > 50) {
            this.bankedScore += Math.round(this.currentDriftScore);
            if (this.audio) {
              this.audio.playScoreBank(this.comboMultiplier);
            }
          }
          this.currentDriftScore = 0;
          this.driftTime = 0;
          this.comboMultiplier = 1.0;
        }
      }
    }

    handleAudioFX(vState) {
      if (!this.audio) return;

      const speedRatio = vState.speed / 680;
      this.audio.playEngine(speedRatio, vState.throttle);

      if (vState.isDrifting || vState.handbrake) {
        this.audio.playDriftScreech(vState.driftIntensity);
      } else {
        this.audio.playDriftScreech(0);
      }
    }

    updateHUD(vState) {
      if (this.speedValEl) this.speedValEl.textContent = vState.speedKph;
      if (this.gearValEl) this.gearValEl.textContent = vState.gear;
      if (this.driftAngleValEl) this.driftAngleValEl.textContent = vState.slipAngleDegrees;

      // Drift Intensity Meter Bar
      if (this.driftMeterBarEl) {
        const fillPercent = Math.min(100, Math.round(vState.driftIntensity * 100));
        this.driftMeterBarEl.style.width = `${fillPercent}%`;
        if (fillPercent > 70) {
          this.driftMeterBarEl.style.boxShadow = '0 0 16px #ff00a0, 0 0 30px #00ffff';
        } else {
          this.driftMeterBarEl.style.boxShadow = '0 0 8px #ff00a0';
        }
      }

      // Score displays
      if (this.currentScoreEl) {
        this.currentScoreEl.textContent = Math.round(this.currentDriftScore).toLocaleString();
      }
      if (this.comboMultiplierEl) {
        this.comboMultiplierEl.textContent = `x${this.comboMultiplier.toFixed(1)}`;
      }
      if (this.bankedScoreEl) {
        this.bankedScoreEl.textContent = Math.round(this.bankedScore).toLocaleString();
      }
      if (this.bestDriftEl) {
        this.bestDriftEl.textContent = Math.round(this.bestSingleDrift).toLocaleString();
      }

      // Lap Timer formatting mm:ss.ms
      if (this.lapTimerEl) {
        this.lapTimerEl.textContent = this.formatTime(this.currentLapTime);
      }
    }

    formatTime(totalSec) {
      const minutes = Math.floor(totalSec / 60);
      const seconds = Math.floor(totalSec % 60);
      const millis = Math.floor((totalSec % 1) * 100);
      const mStr = minutes.toString().padStart(2, '0');
      const sStr = seconds.toString().padStart(2, '0');
      const msStr = millis.toString().padStart(2, '0');
      return `${mStr}:${sStr}.${msStr}`;
    }

    showDriftBadge(text, color = '#ff00a0') {
      if (!this.driftBadgeEl) return;
      this.driftBadgeEl.textContent = text;
      this.driftBadgeEl.style.color = color;
      this.driftBadgeEl.classList.remove('drift-badge-hidden');
      this.driftBadgeEl.classList.add('drift-badge-visible');

      if (this.badgeTimeout) {
        clearTimeout(this.badgeTimeout);
      }

      this.badgeTimeout = setTimeout(() => {
        if (this.driftBadgeEl) {
          this.driftBadgeEl.classList.remove('drift-badge-visible');
          this.driftBadgeEl.classList.add('drift-badge-hidden');
        }
      }, 1500);
    }

    /**
     * Submit score to backend REST API using subpath-safe relative path
     */
    async submitScore(playerName = 'DRIFT_LEGEND', score, maxDrift) {
      try {
        const response = await fetch('api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: playerName,
            score: Math.round(score),
            maxDrift: Math.round(maxDrift)
          })
        });

        if (!response.ok) {
          console.warn('Leaderboard POST response not OK:', response.status);
        }
      } catch (err) {
        console.warn('Failed to submit score to api/scores:', err);
      }
    }

    renderStatic() {
      if (!this.track || !this.ctx || !this.canvas) return;
      this.track.render(this.ctx);
      const state = this.physics ? this.physics.getState() : null;
      if (state) {
        this.drawCar(this.ctx, state, this.track.getCamera());
      }
    }

    render() {
      if (!this.track || !this.ctx || !this.canvas) return;

      const cam = this.track.getCamera();

      // Render circuit track, skidmarks, and synthwave backdrop
      this.track.render(this.ctx, cam);

      // Render the player's drift racer car
      const state = this.physics ? this.physics.getState() : null;
      if (state) {
        this.drawCar(this.ctx, state, cam);
      }
    }

    /**
     * Draw sleek retro cyberpunk sports car (Countach / 80s Wedge aesthetic)
     */
    drawCar(ctx, vState, cam) {
      const width = this.canvas.width;
      const height = this.canvas.height;

      ctx.save();
      // Apply camera transformation
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // Car position & rotation
      ctx.translate(vState.x, vState.y);
      ctx.rotate(vState.angle);

      const length = vState.carLength || 48;
      const carW = vState.carWidth || 24;
      const halfL = length * 0.5;
      const halfW = carW * 0.5;

      // 1. Underglow neon halo (pulsing with drift intensity)
      ctx.save();
      const glowAlpha = 0.4 + vState.driftIntensity * 0.5;
      ctx.shadowColor = vState.isDrifting ? '#ff00a0' : '#00f0ff';
      ctx.shadowBlur = 14 + vState.driftIntensity * 12;
      ctx.fillStyle = `rgba(${vState.isDrifting ? '255, 0, 160' : '0, 240, 255'}, ${glowAlpha})`;
      ctx.fillRect(-halfL + 4, -halfW + 2, length - 8, carW - 4);
      ctx.restore();

      // 2. Car Body (Angular 80s wedge silhouette)
      ctx.save();
      ctx.fillStyle = '#0a0d18';
      ctx.strokeStyle = vState.isDrifting ? '#ff00a0' : '#00f0ff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(halfL, 0); // Front nose tip
      ctx.lineTo(halfL - 8, -halfW); // Front right corner
      ctx.lineTo(-halfL + 6, -halfW); // Rear right wing
      ctx.lineTo(-halfL, -halfW + 4); // Rear right edge
      ctx.lineTo(-halfL, halfW - 4); // Rear left edge
      ctx.lineTo(-halfL + 6, halfW); // Rear left wing
      ctx.lineTo(halfL - 8, halfW); // Front left corner
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Cockpit Windshield (tinted magenta/cyan glass)
      ctx.fillStyle = '#1e1136';
      ctx.strokeStyle = '#00ffe0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(halfL - 14, 0);
      ctx.lineTo(halfL - 22, -halfW + 4);
      ctx.lineTo(-halfL + 16, -halfW + 4);
      ctx.lineTo(-halfL + 16, halfW - 4);
      ctx.lineTo(halfL - 22, halfW - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4. Rear Spoiler Wing
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(-halfL - 2, -halfW - 2, 4, carW + 4);

      // 5. Headlights & Taillights
      // Front headlights (Cyan Laser)
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.fillRect(halfL - 5, -halfW + 2, 4, 4);
      ctx.fillRect(halfL - 5, halfW - 6, 4, 4);

      // Rear taillights (Neon Ruby Red)
      ctx.fillStyle = '#ff0033';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 10;
      ctx.fillRect(-halfL - 1, -halfW + 3, 3, carW - 6);

      // 6. Steered Front Wheels
      const steer = vState.steerAngle || 0;
      this.drawWheel(ctx, halfL - 10, -halfW - 2, steer);
      this.drawWheel(ctx, halfL - 10, halfW + 2, steer);

      // Rear Fixed Wheels
      this.drawWheel(ctx, -halfL + 12, -halfW - 2, 0);
      this.drawWheel(ctx, -halfL + 12, halfW + 2, 0);

      ctx.restore();
      ctx.restore();
    }

    drawWheel(ctx, x, y, steerAngle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(steerAngle);
      ctx.fillStyle = '#1c1b26';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.fillRect(-6, -2.5, 12, 5);
      ctx.strokeRect(-6, -2.5, 12, 5);
      ctx.restore();
    }
  }

  // Create singleton instance and export on window
  const engine = new GameEngine();
  window.GameEngine = engine;
  window.GameEngineClass = GameEngine;

  // Auto-init on page ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => engine.init());
    } else {
      engine.init();
    }
  }

})(typeof window !== 'undefined' ? window : globalThis);
