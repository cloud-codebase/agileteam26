/**
 * game.js - Master Game Orchestrator & State Loop
 * Sprint 1.0 (SCRUM-174)
 *
 * Integrates:
 * - window.SkiPhysics (kinematics, aerodynamics, collision)
 * - window.SkiRenderer (procedural canvas rendering, CRT, stadium)
 * - window.SkiAudio (Web Audio SFX: inrun, flight wind, takeoff, landing, cheering, fanfare)
 * - window.SkiTournament (FIS competition scoring, 5 judges, AI competitors, leaderboard)
 * - DOM HUD elements (speedometer, wind sensor, distance ticker, round modals)
 * - Keyboard (Space, Arrow Up/Down, W/S) & Mouse/Touch controls
 */

(function (window) {
  'use strict';

  var SkiGame = {
    canvas: null,
    currentHillId: 'zakopane',
    currentHill: null,

    // Input state
    inputs: {
      lean: 0, // -1 (back/flare) to +1 (forward aerodynamic)
      spacePressed: false,
      isMouseDown: false
    },

    // Game lifecycle state
    isRunning: false,
    lastTime: 0,
    hasEvaluatedLanding: false,
    latestResult: null,

    // DOM Element cache
    dom: {},

    /**
     * Bootstraps the game, binds DOM elements and event handlers
     */
    init: function () {
      var self = this;

      // Cache DOM references defensively
      this.dom = {
        canvas: document.getElementById('game-canvas'),
        hillSelect: document.getElementById('hill-select'),
        hillName: document.getElementById('hill-name'),
        hillKPoint: document.getElementById('hill-k-point'),
        hillHsPoint: document.getElementById('hill-hs-point'),
        playerNameInput: document.getElementById('player-name-input'),
        btnJump: document.getElementById('btn-jump-action'),
        btnReset: document.getElementById('btn-reset'),
        windArrow: document.getElementById('wind-arrow'),
        windSpeed: document.getElementById('wind-speed'),
        inrunSpeed: document.getElementById('inrun-speed'),
        liveDistance: document.getElementById('live-distance'),
        jumpPhase: document.getElementById('jump-phase'),
        gateIndicator: document.getElementById('gate-indicator'),
        scoreModal: document.getElementById('score-modal'),
        modalHillName: document.getElementById('modal-hill-name'),
        modalDistance: document.getElementById('modal-distance-text'),
        distanceScore: document.getElementById('distance-score'),
        modalJudgeScore: document.getElementById('modal-judge-score'),
        modalWindComp: document.getElementById('modal-wind-comp'),
        totalPoints: document.getElementById('total-points'),
        judgeScoresGrid: document.getElementById('judge-scores'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        leaderboardBody: document.getElementById('leaderboard-body')
      };

      this.canvas = this.dom.canvas;

      // Determine initial hill
      if (this.dom.hillSelect && this.dom.hillSelect.value) {
        this.currentHillId = this.dom.hillSelect.value;
      }
      this.currentHill = (window.HillData && window.HillData.get)
        ? window.HillData.get(this.currentHillId)
        : null;

      // Initialize sub-modules
      if (window.SkiRenderer && this.canvas) {
        window.SkiRenderer.init(this.canvas);
      }
      if (window.SkiTournament) {
        window.SkiTournament.init(this.currentHill);
      }
      if (window.SkiPhysics) {
        window.SkiPhysics.initJump(this.currentHill);
      }

      // Bind input events
      this._bindInputs();

      // Start RAF loop
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this._loop.bind(this));

      // Initial HUD refresh
      this._updateHUD();
      this.refreshLeaderboard();
    },

    /**
     * Switches active hill
     */
    setHill: function (hillId) {
      this.currentHillId = hillId;
      this.currentHill = (window.HillData && window.HillData.get)
        ? window.HillData.get(hillId)
        : null;

      if (window.SkiTournament) {
        window.SkiTournament.setHill(this.currentHill);
      }

      this.resetJump();
      this.refreshLeaderboard();
    },

    /**
     * Resets jumper back to the starting gate on the inrun tower
     */
    resetJump: function () {
      this.hasEvaluatedLanding = false;
      this.latestResult = null;
      this.inputs.lean = 0;

      // Generate realistic randomized wind for the new jump (-2.5 to +2.5 m/s)
      var windX = Math.round((Math.random() * 5.0 - 2.5) * 10) / 10;
      var windY = (Math.random() * 0.6 - 0.3);

      if (window.SkiPhysics) {
        window.SkiPhysics.initJump(this.currentHill, {
          x: windX,
          y: windY,
          speed: Math.abs(windX),
          angle: windX < 0 ? 180 : 0
        });
      }

      if (window.SkiAudio) {
        window.SkiAudio.stopInrunWhoosh();
        window.SkiAudio.stopFlightWind();
      }

      // Close modal if open
      if (this.dom.scoreModal) {
        this.dom.scoreModal.classList.remove('active');
      }

      this._updateActionButton();
      this._updateHUD();
    },

    /**
     * Handles primary jump action (Start Inrun / Takeoff Impulse / Telemark Commit)
     */
    triggerJumpAction: function () {
      // Audio unlock on user interaction
      if (window.SkiAudio) {
        window.SkiAudio.init();
      }

      if (!window.SkiPhysics) return;
      var state = window.SkiPhysics.getState();
      if (!state) return;

      switch (state.phase) {
        case 'GATE':
          // Jumper begins descent
          window.SkiPhysics.startInrun();
          if (window.SkiAudio) {
            window.SkiAudio.playClick();
          }
          break;

        case 'INRUN':
          // Takeoff impulse at edge
          var takeoffResult = window.SkiPhysics.triggerTakeoff();
          if (window.SkiAudio) {
            window.SkiAudio.playTakeoff();
          }
          if (takeoffResult && this.dom.jumpPhase) {
            this.dom.jumpPhase.textContent = takeoffResult.accuracyText;
          }
          break;

        case 'FLIGHT':
          // Attempt Telemark landing posture
          window.SkiPhysics.attemptTelemarkLanding();
          if (this.dom.jumpPhase) {
            this.dom.jumpPhase.textContent = 'TELEMARK READY!';
          }
          break;

        case 'LANDING':
        case 'STOPPED':
          // Ready for next attempt
          this.resetJump();
          break;
      }

      this._updateActionButton();
    },

    /**
     * Binds keyboard, mouse, and touch events
     */
    _bindInputs: function () {
      var self = this;

      // Jump Action Button
      if (this.dom.btnJump) {
        this.dom.btnJump.addEventListener('click', function (e) {
          e.preventDefault();
          self.triggerJumpAction();
        });
      }

      // Reset Button
      if (this.dom.btnReset) {
        this.dom.btnReset.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.SkiAudio) window.SkiAudio.playClick();
          self.resetJump();
        });
      }

      // Hill Select Change
      if (this.dom.hillSelect) {
        this.dom.hillSelect.addEventListener('change', function (e) {
          self.setHill(e.target.value);
        });
      }

      // Score Modal Close / Next Jump
      if (this.dom.modalCloseBtn) {
        this.dom.modalCloseBtn.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.SkiAudio) window.SkiAudio.playClick();
          self.resetJump();
        });
      }

      // Global Keyboard Controls
      window.addEventListener('keydown', function (e) {
        // Spacebar or Enter triggers jump action
        if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
          // Prevent scroll
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
          }
          self.inputs.spacePressed = true;
          self.triggerJumpAction();
        }

        // Aerodynamic Pitch adjustment:
        // ArrowUp or W: Lean forward / tuck into aerodynamic V-style flight
        // ArrowDown or S: Flare back / recline
        if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          self.inputs.lean = 1.0;
        } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          self.inputs.lean = -1.0;
        } else if (e.code === 'KeyR' || e.key === 'r') {
          self.resetJump();
        } else if (e.code === 'KeyM' || e.key === 'm') {
          if (window.SkiAudio) window.SkiAudio.toggleMute();
        }
      });

      window.addEventListener('keyup', function (e) {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
          self.inputs.spacePressed = false;
        }
        if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W' ||
            e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          self.inputs.lean = 0;
        }
      });

      // Canvas Mouse & Touch controls for intuitive mobile/desktop play
      if (this.canvas) {
        this.canvas.addEventListener('mousedown', function (e) {
          if (e.button === 0) { // left click
            self.triggerJumpAction();
          }
        });

        this.canvas.addEventListener('mousemove', function (e) {
          var rect = self.canvas.getBoundingClientRect();
          var mouseY = e.clientY - rect.top;
          var normY = (mouseY / rect.height) * 2 - 1; // -1 (top) to +1 (bottom)
          // Moving mouse up pitches forward (+lean), moving down flares (-lean)
          self.inputs.lean = Math.max(-1, Math.min(1, -normY * 1.5));
        });

        // Touch support
        this.canvas.addEventListener('touchstart', function (e) {
          e.preventDefault();
          self.triggerJumpAction();
        }, { passive: false });
      }
    },

    /**
     * Main animation loop
     */
    _loop: function (timestamp) {
      var dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      // Cap delta time to prevent instability
      if (dt > 0.1) dt = 0.1;

      // 1. Update Physics
      var physicsState = null;
      if (window.SkiPhysics) {
        physicsState = window.SkiPhysics.update(dt, {
          lean: this.inputs.lean,
          jumpPressed: this.inputs.spacePressed
        });
      }

      // 2. Sound Effects orchestration
      this._updateAudio(physicsState);

      // 3. Render Canvas Frame
      if (window.SkiRenderer && physicsState) {
        window.SkiRenderer.draw(this.currentHill, physicsState);
      }

      // 4. Update HUD and inspect landing resolution
      if (physicsState) {
        this._updateHUD(physicsState);
        this._checkPhaseTransitions(physicsState);
      }

      if (this.isRunning) {
        requestAnimationFrame(this._loop.bind(this));
      }
    },

    /**
     * Orchestrates Web Audio based on physics phase
     */
    _updateAudio: function (state) {
      if (!state || !window.SkiAudio) return;

      if (state.phase === 'INRUN') {
        window.SkiAudio.playInrunWhoosh(state.speed);
      } else if (state.phase === 'FLIGHT') {
        window.SkiAudio.stopInrunWhoosh();
        window.SkiAudio.playFlightWind(state.speed, state.skierLean);
      }
    },

    /**
     * Checks transitions to landing or stopped, triggers judge scoring and modal
     */
    _checkPhaseTransitions: function (state) {
      if (!state) return;

      // Trigger landing sound once at transition into LANDING phase
      if (state.phase === 'LANDING' && !this.hasEvaluatedLanding) {
        this.hasEvaluatedLanding = true;

        if (window.SkiAudio) {
          window.SkiAudio.playLanding(state.isTelemark, state.isCrash);
        }

        // Calculate competition score via Tournament Engine
        if (window.SkiTournament) {
          var result = window.SkiTournament.calculatePoints(
            this.currentHill,
            state.distance,
            state.isTelemark,
            state.isCrash,
            state.wind
          );

          this.latestResult = result;

          // Sound reactions
          var k = (this.currentHill && this.currentHill.kPoint) ? this.currentHill.kPoint : 120;
          var hs = (this.currentHill && this.currentHill.hsPoint) ? this.currentHill.hsPoint : 140;

          if (state.isCrash) {
            // Already played crash sound in playLanding
          } else if (state.distance >= (this.currentHill && this.currentHill.record ? this.currentHill.record : hs + 2)) {
            // New Hill Record! Fanfare + max crowd
            window.SkiAudio.playFanfare();
            window.SkiAudio.playCrowdCheer(1.0);
          } else if (state.distance >= k) {
            // Past K-Point: big cheer
            var intensity = 0.5 + (state.distance - k) / (hs - k + 10) * 0.5;
            window.SkiAudio.playCrowdCheer(intensity);
          } else {
            // Normal polite applause
            window.SkiAudio.playCrowdCheer(0.35);
          }

          // Automatically record score to backend and show score modal
          this._handleJumpFinished(result);
        }
      }
    },

    /**
     * Displays scoring modal and submits result to backend
     */
    _handleJumpFinished: function (result) {
      var self = this;
      var playerName = (this.dom.playerNameInput && this.dom.playerNameInput.value.trim())
        ? this.dom.playerNameInput.value.trim()
        : 'Player 1';

      // Populate Judges Modal
      if (this.dom.modalHillName) {
        this.dom.modalHillName.textContent = this.currentHill ? this.currentHill.name : 'Normal Hill';
      }
      if (this.dom.modalDistance) {
        this.dom.modalDistance.textContent = result.distance.toFixed(1) + ' m';
      }
      if (this.dom.distanceScore) {
        this.dom.distanceScore.textContent = result.distancePoints.toFixed(1) + ' pts';
      }
      if (this.dom.modalJudgeScore) {
        this.dom.modalJudgeScore.textContent = result.judgePoints.toFixed(1) + ' pts';
      }
      if (this.dom.modalWindComp) {
        var sign = result.windComp >= 0 ? '+' : '';
        this.dom.modalWindComp.textContent = sign + result.windComp.toFixed(1) + ' pts';
      }
      if (this.dom.totalPoints) {
        this.dom.totalPoints.textContent = result.totalPoints.toFixed(1) + ' pts';
      }

      // Populate 5 judges breakdown
      if (this.dom.judgeScoresGrid && Array.isArray(result.judges)) {
        var judgesHtml = '';
        result.judges.forEach(function (j) {
          var droppedClass = j.isDropped ? 'style="opacity: 0.45; text-decoration: line-through;"' : '';
          judgesHtml += '<div class="judge-box" ' + droppedClass + '>' +
            '<div class="judge-name">J' + j.judgeId + ' (' + j.country + ')</div>' +
            '<div class="judge-val">' + j.score.toFixed(1) + '</div>' +
            '</div>';
        });
        this.dom.judgeScoresGrid.innerHTML = judgesHtml;
      }

      // Show modal after brief delay so player sees landing
      setTimeout(function () {
        if (self.dom.scoreModal) {
          self.dom.scoreModal.classList.add('active');
        }
      }, 700);

      // Submit score to backend
      if (window.SkiTournament && window.SkiTournament.submitScore) {
        window.SkiTournament.submitScore(playerName, this.currentHillId, result, function (err, res) {
          if (!err && res) {
            self.refreshLeaderboard();
          }
        });
      }

      this._updateActionButton();
    },

    /**
     * Updates Action button label based on jump phase
     */
    _updateActionButton: function () {
      if (!this.dom.btnJump || !window.SkiPhysics) return;
      var state = window.SkiPhysics.getState();
      var phase = state ? state.phase : 'GATE';

      switch (phase) {
        case 'GATE':
          this.dom.btnJump.textContent = '🚀 START INRUN';
          this.dom.btnJump.className = 'btn-action btn-primary';
          break;
        case 'INRUN':
          this.dom.btnJump.textContent = '⚡ JUMP NOW!';
          this.dom.btnJump.className = 'btn-action btn-warning';
          break;
        case 'FLIGHT':
          this.dom.btnJump.textContent = '🎿 TELEMARK LANDING';
          this.dom.btnJump.className = 'btn-action btn-primary';
          break;
        case 'LANDING':
        case 'STOPPED':
          this.dom.btnJump.textContent = '↺ NEXT JUMP';
          this.dom.btnJump.className = 'btn-action btn-secondary';
          break;
      }
    },

    /**
     * Updates retro HUD overlays
     */
    _updateHUD: function (state) {
      var s = state || (window.SkiPhysics ? window.SkiPhysics.getState() : null);

      // Inrun Speed
      if (this.dom.inrunSpeed) {
        this.dom.inrunSpeed.textContent = (s && typeof s.speed === 'number') ? s.speed.toFixed(1) : '0.0';
      }

      // Wind Indicator
      if (this.dom.windSpeed && this.dom.windArrow && s && s.wind) {
        var w = s.wind;
        var windVal = (typeof w.x === 'number') ? w.x : (w.speed || 0);
        var sign = windVal > 0 ? '+' : '';
        this.dom.windSpeed.textContent = sign + windVal.toFixed(1) + ' m/s';

        // Headwind (< 0) arrow points left (➔ rotated or ⬅), Tailwind (> 0) points right
        if (windVal < -0.1) {
          this.dom.windArrow.textContent = '⬅';
          this.dom.windArrow.style.color = '#38bdf8'; // cold blue headwind
        } else if (windVal > 0.1) {
          this.dom.windArrow.textContent = '➔';
          this.dom.windArrow.style.color = '#f59e0b'; // warm tailwind
        } else {
          this.dom.windArrow.textContent = '•';
          this.dom.windArrow.style.color = '#94a3b8';
        }
      }

      // Live distance counter
      if (this.dom.liveDistance && s) {
        this.dom.liveDistance.textContent = (s.distance || 0).toFixed(1) + ' m';
      }

      // Status text
      if (this.dom.jumpPhase && s) {
        var phaseText = s.phase;
        if (s.phase === 'INRUN') {
          phaseText = 'INRUN ACCELERATING';
        } else if (s.phase === 'FLIGHT') {
          phaseText = 'SOARING • ' + (s.takeoffAccuracyText || 'IN FLIGHT');
        } else if (s.phase === 'LANDING') {
          if (s.isCrash) phaseText = '💥 CRASH!';
          else if (s.isTelemark) phaseText = '✨ TELEMARK!';
          else phaseText = 'TWO-FOOTED LANDING';
        } else if (s.phase === 'STOPPED') {
          phaseText = 'FINISHED';
        }
        this.dom.jumpPhase.textContent = phaseText;
      }
    },

    /**
     * Refreshes leaderboard from relative 'api/leaderboard'
     */
    refreshLeaderboard: function () {
      var self = this;
      if (!this.dom.leaderboardBody) return;

      var url = 'api/leaderboard' + (this.currentHillId ? '?hillId=' + encodeURIComponent(this.currentHillId) : '');
      fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('Network error');
          return res.json();
        })
        .then(function (data) {
          if (!Array.isArray(data) || data.length === 0) {
            self.dom.leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No scores recorded yet. Be the first!</td></tr>';
            return;
          }
          var html = '';
          data.forEach(function (entry, index) {
            var medal = index === 0 ? '🥇 ' : (index === 1 ? '🥈 ' : (index === 2 ? '🥉 ' : ''));
            html += '<tr>' +
              '<td class="rank-cell">' + medal + (index + 1) + '</td>' +
              '<td>' + (entry.playerName || 'Anonymous') + '</td>' +
              '<td>' + (entry.hillName || entry.hillId) + '</td>' +
              '<td class="distance-cell">' + Number(entry.distance || 0).toFixed(1) + 'm</td>' +
              '<td class="points-cell">' + Number(entry.totalPoints || 0).toFixed(1) + '</td>' +
              '</tr>';
          });
          self.dom.leaderboardBody.innerHTML = html;
        })
        .catch(function (err) {
          console.warn('[SkiGame] Could not refresh leaderboard:', err);
        });
    }
  };

  // Mount SkiGame on window
  window.SkiGame = SkiGame;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.SkiGame.init();
    });
  } else {
    window.SkiGame.init();
  }
})(typeof window !== 'undefined' ? window : global);
