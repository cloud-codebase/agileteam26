/**
 * game.js - Master Game Orchestrator & State Loop
 * Sprint 1.0 (SCRUM-174), Sprint 2.0 (SCRUM-178), Sprint 3.0 (SCRUM-182), Sprint 4.0 (SCRUM-185)
 *
 * Integrates:
 * - window.SkiPhysics (kinematics, aerodynamics, collision, lift overhaul, takeoff immunity, float cushion)
 * - window.SkiRenderer (procedural canvas rendering, CRT, stadium, gate lift, edge visualization)
 * - window.SkiAudio (Web Audio SFX: gate beeps, release clack, inrun, flight wind, takeoff launch, rating chimes, landing, cheering, fanfare)
 * - window.SkiTournament (FIS competition scoring, 5 judges, AI competitors, leaderboard)
 * - DOM HUD elements:
 *   - FIS starting lights (#gate-signal-lights, #gate-prompt-banner, #gate-bar-level)
 *   - Sprint 3.0 Take-Off Timing HUD (#takeoff-hud-container, #takeoff-timing-bar, #takeoff-needle, #takeoff-dist-label, badges)
 *   - Sprint 4.0 Flight Telemetry HUD (#flight-telemetry-hud, #telemetry-altitude, #telemetry-speed, #telemetry-glide-ratio)
 *   - Speedometer, wind sensor, live distance counter
 * - Keyboard (Space, Enter, Arrow Up/Down, W/S), Mouse click, and Touch controls
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

    // Starting Gate State Machine: 'GATE_WAIT' | 'GATE_READY' | 'GATE_CLEAR' | 'IN_FLIGHT'
    gateState: 'GATE_CLEAR',
    gateTimer: 0,
    gateWaitDuration: 0.6,   // seconds on Red
    gateReadyDuration: 0.6,  // seconds on Yellow

    // Takeoff HUD & Feedback timing timer
    feedbackHideTimeout: null,

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
        leaderboardBody: document.getElementById('leaderboard-body'),

        // FIS Starting Gate HUD elements (SCRUM-177 / SCRUM-178)
        gateSignalLights: document.getElementById('gate-signal-lights'),
        lightRed: document.getElementById('light-red'),
        lightYellow: document.getElementById('light-yellow'),
        lightGreen: document.getElementById('light-green'),
        gatePromptBanner: document.getElementById('gate-prompt-banner'),
        gateBarLevel: document.getElementById('gate-bar-level'),

        // Take-Off Timing HUD elements (SCRUM-181 / SCRUM-182)
        takeoffHudContainer: document.getElementById('takeoff-hud-container'),
        takeoffTimingBar: document.getElementById('takeoff-timing-bar'),
        takeoffNeedle: document.getElementById('takeoff-needle'),
        takeoffDistLabel: document.getElementById('takeoff-dist-label'),
        takeoffPromptBadge: document.getElementById('takeoff-prompt-badge'),
        takeoffFeedbackBadge: document.getElementById('takeoff-feedback-badge'),

        // Sprint 4.0 Flight Telemetry HUD elements (SCRUM-185 / SCRUM-186)
        flightTelemetryHud: document.getElementById('flight-telemetry-hud'),
        telemetryAltitude: document.getElementById('telemetry-altitude'),
        telemetrySpeed: document.getElementById('telemetry-speed'),
        telemetryGlideRatio: document.getElementById('telemetry-glide-ratio')
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

      // Start with starting gate readiness sequence
      this._startGateSequence();

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

      // Clear pending feedback badge timeouts
      if (this.feedbackHideTimeout) {
        clearTimeout(this.feedbackHideTimeout);
        this.feedbackHideTimeout = null;
      }

      // Hide takeoff timing, feedback badges, and flight telemetry
      if (this.dom.takeoffHudContainer) {
        this.dom.takeoffHudContainer.classList.add('hidden');
      }
      if (this.dom.takeoffPromptBadge) {
        this.dom.takeoffPromptBadge.classList.add('hidden');
      }
      if (this.dom.takeoffFeedbackBadge) {
        this.dom.takeoffFeedbackBadge.classList.add('hidden');
      }
      if (this.dom.flightTelemetryHud) {
        this.dom.flightTelemetryHud.classList.add('hidden');
      }

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

      // Start starting gate preparation sequence: GATE_WAIT -> GATE_READY -> GATE_CLEAR
      this._startGateSequence();

      this._updateActionButton();
      this._updateHUD();
    },

    /**
     * Initiates the FIS gate preparation sequence
     */
    _startGateSequence: function () {
      this.gateState = 'GATE_WAIT';
      this.gateTimer = 0;

      this._applyGateUIState('GATE_WAIT');

      if (window.SkiAudio) {
        window.SkiAudio.playGateBeep('red');
      }
    },

    /**
     * Updates the gate state countdown during the RAF loop
     */
    _updateGateStateMachine: function (dt) {
      if (!window.SkiPhysics) return;
      var state = window.SkiPhysics.getState();
      var phase = state ? state.phase : 'GATE';

      // Only advance gate sequence while still at starting gate
      if (phase !== 'GATE') {
        if (this.gateState !== 'IN_FLIGHT') {
          this.gateState = 'IN_FLIGHT';
          this._applyGateUIState('IN_FLIGHT');
        }
        return;
      }

      if (this.gateState === 'GATE_WAIT') {
        this.gateTimer += dt;
        if (this.gateTimer >= this.gateWaitDuration) {
          this.gateState = 'GATE_READY';
          this.gateTimer = 0;
          this._applyGateUIState('GATE_READY');
          if (window.SkiAudio) {
            window.SkiAudio.playGateBeep('yellow');
          }
        }
      } else if (this.gateState === 'GATE_READY') {
        this.gateTimer += dt;
        if (this.gateTimer >= this.gateReadyDuration) {
          this.gateState = 'GATE_CLEAR';
          this.gateTimer = 0;
          this._applyGateUIState('GATE_CLEAR');
          if (window.SkiAudio) {
            window.SkiAudio.playGateBeep('green');
          }
        }
      }
    },

    /**
     * Synchronizes DOM lights, prompt banner, and bar level with gate state
     */
    _applyGateUIState: function (stateName) {
      var d = this.dom;

      function setLights(red, yellow, green) {
        if (d.lightRed) d.lightRed.classList.toggle('active', red);
        if (d.lightYellow) d.lightYellow.classList.toggle('active', yellow);
        if (d.lightGreen) d.lightGreen.classList.toggle('active', green);
      }

      function setBanner(show, cssClass, icon, text) {
        if (!d.gatePromptBanner) return;
        if (!show) {
          d.gatePromptBanner.classList.add('hidden');
          return;
        }
        d.gatePromptBanner.classList.remove('hidden', 'state-red', 'state-yellow', 'state-green');
        d.gatePromptBanner.classList.add(cssClass);
        var iconEl = d.gatePromptBanner.querySelector('.gate-prompt-icon');
        var textEl = d.gatePromptBanner.querySelector('.gate-prompt-text');
        if (iconEl) iconEl.textContent = icon;
        if (textEl) textEl.textContent = text;
      }

      switch (stateName) {
        case 'GATE_WAIT':
          setLights(true, false, false);
          setBanner(true, 'state-red', '🔴', 'WAITING FOR WIND CLEARANCE...');
          if (d.gateBarLevel) d.gateBarLevel.textContent = 'BAR #12 (LOCKED)';
          if (d.jumpPhase) d.jumpPhase.textContent = 'GATE: RED LIGHT (WAIT)';
          break;

        case 'GATE_READY':
          setLights(false, true, false);
          setBanner(true, 'state-yellow', '🟡', 'ATTENTION: JUMPER ON BAR');
          if (d.gateBarLevel) d.gateBarLevel.textContent = 'BAR #12 (PREPARE)';
          if (d.jumpPhase) d.jumpPhase.textContent = 'GATE: YELLOW (ATTENTION)';
          break;

        case 'GATE_CLEAR':
          setLights(false, false, true);
          setBanner(true, 'state-green', '🟢', 'GREEN LIGHT - PRESS SPACE OR CLICK TO START');
          if (d.gateBarLevel) d.gateBarLevel.textContent = 'BAR #12 (CLEARED)';
          if (d.jumpPhase) d.jumpPhase.textContent = 'GATE: GREEN LIGHT (GO!)';
          break;

        case 'IN_FLIGHT':
        default:
          setLights(false, false, false);
          setBanner(false);
          if (d.gateBarLevel) d.gateBarLevel.textContent = 'BAR #12 (IN USE)';
          break;
      }

      this._updateActionButton();
    },

    /**
     * Real-time inrun progress tracking for take-off edge proximity & HUD timing meter
     */
    _updateTakeoffHUD: function (state) {
      if (!state) return;
      var d = this.dom;
      var phase = state.phase;

      if (phase === 'INRUN') {
        var inrunLen = (this.currentHill && this.currentHill.inrunLength) ? this.currentHill.inrunLength : 98.7;
        var inrunProgress = (typeof state.inrunProgress === 'number') ? state.inrunProgress : 0;
        var distRemaining = Math.max(0, (1 - inrunProgress) * inrunLen);

        var takeoffCfg = (this.currentHill && this.currentHill.takeoffConfig) ? this.currentHill.takeoffConfig : {
          warningZoneLen: 12.0,
          sweetSpotLen: 2.8
        };
        var warnZoneLen = takeoffCfg.warningZoneLen || 12.0;
        var sweetSpotLen = takeoffCfg.sweetSpotLen || 2.8;

        if (distRemaining <= (warnZoneLen + 6.0) || inrunProgress > 0.6) {
          if (d.takeoffHudContainer) {
            d.takeoffHudContainer.classList.remove('hidden');
          }

          var gaugeProgress = Math.max(0, Math.min(1.0, 1.0 - (distRemaining / warnZoneLen)));
          var needleLeftPercent = (gaugeProgress * 100).toFixed(1);

          if (d.takeoffNeedle) {
            d.takeoffNeedle.style.left = needleLeftPercent + '%';
          }

          if (d.takeoffDistLabel) {
            d.takeoffDistLabel.textContent = distRemaining.toFixed(1) + 'm TO LIP';
          }

          var inSweetSpot = (distRemaining >= 0.2 && distRemaining <= (sweetSpotLen + 0.4));
          if (d.takeoffPromptBadge) {
            if (inSweetSpot) {
              d.takeoffPromptBadge.classList.remove('hidden');
            } else {
              d.takeoffPromptBadge.classList.add('hidden');
            }
          }
        }
      } else {
        if (d.takeoffHudContainer) {
          d.takeoffHudContainer.classList.add('hidden');
        }
        if (d.takeoffPromptBadge) {
          d.takeoffPromptBadge.classList.add('hidden');
        }
      }
    },

    /**
     * Updates in-flight telemetry HUD (Sprint 4.0 SCRUM-185)
     */
    _updateFlightTelemetryHUD: function (state) {
      if (!state) return;
      var d = this.dom;
      var phase = state.phase;

      if (phase === 'FLIGHT') {
        if (d.flightTelemetryHud) {
          d.flightTelemetryHud.classList.remove('hidden');
        }

        var altitude = (typeof state.flightAltitude === 'number')
          ? state.flightAltitude
          : (typeof state.groundClearance === 'number' ? state.groundClearance : 0);

        var speed = (typeof state.flightSpeed === 'number')
          ? state.flightSpeed
          : (typeof state.speed === 'number' ? state.speed : 0);

        var glide = (typeof state.glideRatio === 'number')
          ? state.glideRatio
          : 0;

        if (d.telemetryAltitude) {
          d.telemetryAltitude.textContent = Math.max(0, altitude).toFixed(1) + 'm';
        }
        if (d.telemetrySpeed) {
          d.telemetrySpeed.textContent = speed.toFixed(1) + ' km/h';
        }
        if (d.telemetryGlideRatio) {
          d.telemetryGlideRatio.textContent = glide > 0 ? glide.toFixed(2) : '--';
        }
      } else {
        if (d.flightTelemetryHud) {
          d.flightTelemetryHud.classList.add('hidden');
        }
      }
    },

    /**
     * Displays timing feedback badge popup on takeoff and plays rating audio
     */
    _displayTakeoffFeedback: function (ratingInfo) {
      if (!ratingInfo) return;
      var d = this.dom;
      var rating = (ratingInfo.rating || ratingInfo.quality || 'GREAT').toUpperCase();
      var text = ratingInfo.accuracyText || 'GREAT!';

      if (window.SkiAudio) {
        if (typeof window.SkiAudio.playTakeoffRating === 'function') {
          window.SkiAudio.playTakeoffRating(rating);
        }
        if (typeof window.SkiAudio.playTakeoffLaunch === 'function') {
          window.SkiAudio.playTakeoffLaunch();
        } else if (typeof window.SkiAudio.playTakeoff === 'function') {
          window.SkiAudio.playTakeoff();
        }
      }

      if (!d.takeoffFeedbackBadge) return;

      d.takeoffFeedbackBadge.className = 'takeoff-feedback-badge';
      var variantClass = 'rating-great';

      if (rating.indexOf('PERFECT') !== -1) {
        variantClass = 'rating-perfect';
      } else if (rating.indexOf('EARLY') !== -1) {
        variantClass = 'rating-early';
      } else if (rating.indexOf('LATE') !== -1) {
        variantClass = 'rating-late';
      } else if (rating.indexOf('MISSED') !== -1) {
        variantClass = 'rating-missed';
      }

      d.takeoffFeedbackBadge.classList.add(variantClass);
      var textEl = d.takeoffFeedbackBadge.querySelector('.feedback-text');
      if (textEl) {
        textEl.textContent = text;
      } else {
        d.takeoffFeedbackBadge.textContent = text;
      }

      d.takeoffFeedbackBadge.classList.remove('hidden');

      if (this.feedbackHideTimeout) {
        clearTimeout(this.feedbackHideTimeout);
      }

      this.feedbackHideTimeout = setTimeout(function () {
        if (d.takeoffFeedbackBadge) {
          d.takeoffFeedbackBadge.classList.add('hidden');
        }
      }, 1600);
    },

    /**
     * Primary jump action (Start Inrun / Takeoff Impulse / Telemark Commit)
     */
    triggerJumpAction: function () {
      if (window.SkiAudio) {
        window.SkiAudio.init();
      }

      if (!window.SkiPhysics) return;
      var state = window.SkiPhysics.getState();
      if (!state) return;

      switch (state.phase) {
        case 'GATE':
          if (this.gateState !== 'GATE_CLEAR') {
            this.gateState = 'GATE_CLEAR';
            this._applyGateUIState('GATE_CLEAR');
            if (window.SkiAudio) {
              window.SkiAudio.playGateBeep('green');
            }
          }

          if (window.SkiAudio) {
            window.SkiAudio.playGateRelease();
          }

          window.SkiPhysics.startInrun();
          this.gateState = 'IN_FLIGHT';
          this._applyGateUIState('IN_FLIGHT');
          break;

        case 'INRUN':
          var takeoffResult = window.SkiPhysics.triggerTakeoff();
          if (takeoffResult) {
            this._displayTakeoffFeedback(takeoffResult);
            if (this.dom.jumpPhase) {
              this.dom.jumpPhase.textContent = takeoffResult.accuracyText;
            }
          } else {
            if (window.SkiAudio && typeof window.SkiAudio.playTakeoffLaunch === 'function') {
              window.SkiAudio.playTakeoffLaunch();
            }
          }
          break;

        case 'FLIGHT':
          window.SkiPhysics.attemptTelemarkLanding();
          if (this.dom.jumpPhase) {
            this.dom.jumpPhase.textContent = 'TELEMARK READY!';
          }
          break;

        case 'LANDING':
        case 'STOPPED':
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

      if (this.dom.btnJump) {
        this.dom.btnJump.addEventListener('click', function (e) {
          e.preventDefault();
          self.triggerJumpAction();
        });
      }

      if (this.dom.btnReset) {
        this.dom.btnReset.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.SkiAudio) window.SkiAudio.playClick();
          self.resetJump();
        });
      }

      if (this.dom.hillSelect) {
        this.dom.hillSelect.addEventListener('change', function (e) {
          self.setHill(e.target.value);
        });
      }

      if (this.dom.modalCloseBtn) {
        this.dom.modalCloseBtn.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.SkiAudio) window.SkiAudio.playClick();
          self.resetJump();
        });
      }

      window.addEventListener('keydown', function (e) {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
          }
          self.inputs.spacePressed = true;
          self.triggerJumpAction();
        }

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

      if (this.canvas) {
        this.canvas.addEventListener('mousedown', function (e) {
          if (e.button === 0) {
            self.triggerJumpAction();
          }
        });

        this.canvas.addEventListener('mousemove', function (e) {
          var rect = self.canvas.getBoundingClientRect();
          var mouseY = e.clientY - rect.top;
          var normY = (mouseY / rect.height) * 2 - 1;
          self.inputs.lean = Math.max(-1, Math.min(1, -normY * 1.5));
        });

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

      if (dt > 0.1) dt = 0.1;

      this._updateGateStateMachine(dt);

      var physicsState = null;
      if (window.SkiPhysics) {
        physicsState = window.SkiPhysics.update(dt, {
          lean: this.inputs.lean,
          jumpPressed: this.inputs.spacePressed
        });
      }

      this._updateAudio(physicsState);

      if (window.SkiRenderer && physicsState) {
        window.SkiRenderer.draw(this.currentHill, physicsState);
      }

      if (physicsState) {
        this._updateHUD(physicsState);
        this._updateTakeoffHUD(physicsState);
        this._updateFlightTelemetryHUD(physicsState);
        this._checkPhaseTransitions(physicsState);
      }

      if (this.isRunning) {
        requestAnimationFrame(this._loop.bind(this));
      }
    },

    _updateAudio: function (state) {
      if (!state || !window.SkiAudio) return;

      if (state.phase === 'INRUN') {
        window.SkiAudio.playInrunWhoosh(state.speed);
      } else if (state.phase === 'FLIGHT') {
        window.SkiAudio.stopInrunWhoosh();
        window.SkiAudio.playFlightWind(state.speed, state.skierLean);
      }
    },

    _checkPhaseTransitions: function (state) {
      if (!state) return;

      if (state.phase === 'LANDING' && !this.hasEvaluatedLanding) {
        this.hasEvaluatedLanding = true;

        if (window.SkiAudio) {
          window.SkiAudio.playLanding(state.isTelemark, state.isCrash);
        }

        if (window.SkiTournament) {
          var result = window.SkiTournament.calculatePoints(
            this.currentHill,
            state.distance,
            state.isTelemark,
            state.isCrash,
            state.wind
          );

          this.latestResult = result;

          var k = (this.currentHill && this.currentHill.kPoint) ? this.currentHill.kPoint : 120;
          var hs = (this.currentHill && this.currentHill.hsPoint) ? this.currentHill.hsPoint : 140;

          if (state.isCrash) {
            // Handled in playLanding
          } else if (state.distance >= (this.currentHill && this.currentHill.record ? this.currentHill.record : hs + 2)) {
            window.SkiAudio.playFanfare();
            window.SkiAudio.playCrowdCheer(1.0);
          } else if (state.distance >= k) {
            var intensity = 0.5 + (state.distance - k) / (hs - k + 10) * 0.5;
            window.SkiAudio.playCrowdCheer(intensity);
          } else {
            window.SkiAudio.playCrowdCheer(0.35);
          }

          this._handleJumpFinished(result);
        }
      }
    },

    _handleJumpFinished: function (result) {
      var self = this;
      var playerName = (this.dom.playerNameInput && this.dom.playerNameInput.value.trim())
        ? this.dom.playerNameInput.value.trim()
        : 'Player 1';

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

      setTimeout(function () {
        if (self.dom.scoreModal) {
          self.dom.scoreModal.classList.add('active');
        }
      }, 700);

      if (window.SkiTournament && window.SkiTournament.submitScore) {
        window.SkiTournament.submitScore(playerName, this.currentHillId, result, function (err, res) {
          if (!err && res) {
            self.refreshLeaderboard();
          }
        });
      }

      this._updateActionButton();
    },

    _updateActionButton: function () {
      if (!this.dom.btnJump || !window.SkiPhysics) return;
      var state = window.SkiPhysics.getState();
      var phase = state ? state.phase : 'GATE';

      switch (phase) {
        case 'GATE':
          if (this.gateState === 'GATE_WAIT') {
            this.dom.btnJump.textContent = '🔴 WAIT FOR GREEN';
            this.dom.btnJump.className = 'btn-action btn-secondary';
          } else if (this.gateState === 'GATE_READY') {
            this.dom.btnJump.textContent = '🟡 GET READY...';
            this.dom.btnJump.className = 'btn-action btn-warning';
          } else {
            this.dom.btnJump.textContent = '🚀 START INRUN';
            this.dom.btnJump.className = 'btn-action btn-primary';
          }
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

    _updateHUD: function (state) {
      var s = state || (window.SkiPhysics ? window.SkiPhysics.getState() : null);

      if (this.dom.inrunSpeed) {
        this.dom.inrunSpeed.textContent = (s && typeof s.speed === 'number') ? s.speed.toFixed(1) : '0.0';
      }

      if (this.dom.windSpeed && this.dom.windArrow && s && s.wind) {
        var w = s.wind;
        var windVal = (typeof w.x === 'number') ? w.x : (w.speed || 0);
        var sign = windVal > 0 ? '+' : '';
        this.dom.windSpeed.textContent = sign + windVal.toFixed(1) + ' m/s';

        if (windVal < -0.1) {
          this.dom.windArrow.textContent = '⬅';
          this.dom.windArrow.style.color = '#38bdf8';
        } else if (windVal > 0.1) {
          this.dom.windArrow.textContent = '➔';
          this.dom.windArrow.style.color = '#f59e0b';
        } else {
          this.dom.windArrow.textContent = '•';
          this.dom.windArrow.style.color = '#94a3b8';
        }
      }

      if (this.dom.liveDistance && s) {
        this.dom.liveDistance.textContent = (s.distance || 0).toFixed(1) + ' m';
      }

      if (this.dom.jumpPhase && s) {
        var phaseText = s.phase;
        if (s.phase === 'GATE') {
          if (this.gateState === 'GATE_WAIT') phaseText = 'GATE: RED LIGHT (WAIT)';
          else if (this.gateState === 'GATE_READY') phaseText = 'GATE: YELLOW (ATTENTION)';
          else phaseText = 'GATE: GREEN LIGHT (GO!)';
        } else if (s.phase === 'INRUN') {
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

  window.SkiGame = SkiGame;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.SkiGame.init();
    });
  } else {
    window.SkiGame.init();
  }
})(typeof window !== 'undefined' ? window : global);
