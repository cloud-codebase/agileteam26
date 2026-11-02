/**
 * physics.js - Ski Jump Kinematics & Aerodynamic Flight Physics Engine
 * Sprint 1.0 (SCRUM-173), Sprint 3.0 (SCRUM-182), Sprint 4.0 (SCRUM-185)
 *
 * Sprint 4.0 Overhaul (SCRUM-185):
 * - Immediate Landing Bug Resolution:
 *   1. Takeoff clearance immunity / grace period: suppress ground collision when x < 12.0m OR t_flight < 0.65s.
 *   2. Descend-only collision trigger: Ground contact is evaluated ONLY when jumper is descending into terrain:
 *      (groundClearance <= 0.15 && state.vy > 0 && state.x > 8.0).
 *   3. World Coordinates & Fallback: Uses HillData.getGroundY and HillData.getGroundSlopeAngle if available.
 *      Lip is at (x=0, y=0). Table base at x=0 starts at y=tableHeight (~3.0m - 3.8m).
 *   4. Aerodynamic Float Cushion: Authentic DSJ V-style float maintaining 1.8m - 4.5m altitude over descending mountain slope.
 *      Lift-to-drag dynamics with controllable pitch (theta) giving high soaring glide.
 *   5. In-flight Live Telemetry: Tracks groundClearance, flightAltitude (meters above ground),
 *      flightSpeed (km/h), glideRatio, distance along hill slope.
 */

(function (window) {
  'use strict';

  // Default hill geometry fallback
  const DEFAULT_HILLS = {
    zakopane: {
      id: 'zakopane',
      name: 'Zakopane (Wielka Krokiew)',
      kPoint: 120,
      hsPoint: 140,
      inrunAngle: 35.0, // degrees
      tableAngle: 10.5, // degrees at lip
      tableHeight: 3.0,
      inrunLength: 98.7, // meters
      takeoffConfig: {
        warningZoneLen: 12.0,
        sweetSpotLen: 2.8,
        lipHeight: 3.0
      },
      record: 147.0,
      baseSpeed: 91.5 // km/h
    },
    planica: {
      id: 'planica',
      name: 'Planica (Letalnica bratov Gorišek)',
      kPoint: 185,
      hsPoint: 240,
      inrunAngle: 35.1,
      tableAngle: 11.2,
      tableHeight: 3.8,
      inrunLength: 133.8,
      takeoffConfig: {
        warningZoneLen: 14.0,
        sweetSpotLen: 3.2,
        lipHeight: 3.8
      },
      record: 252.0,
      baseSpeed: 102.0
    },
    wisla: {
      id: 'wisla',
      name: 'Wisła (Malinka)',
      kPoint: 120,
      hsPoint: 134,
      inrunAngle: 35.0,
      tableAngle: 10.5,
      tableHeight: 2.9,
      inrunLength: 88.2,
      takeoffConfig: {
        warningZoneLen: 11.0,
        sweetSpotLen: 2.6,
        lipHeight: 2.9
      },
      record: 139.0,
      baseSpeed: 89.5
    },
    oberstdorf: {
      id: 'oberstdorf',
      name: 'Oberstdorf (Schattenbergschanze)',
      kPoint: 120,
      hsPoint: 137,
      inrunAngle: 35.5,
      tableAngle: 11.0,
      tableHeight: 3.2,
      inrunLength: 95.5,
      takeoffConfig: {
        warningZoneLen: 12.0,
        sweetSpotLen: 2.8,
        lipHeight: 3.2
      },
      record: 143.5,
      baseSpeed: 92.0
    }
  };

  /**
   * Evaluates the landing hill ground y coordinate in world coordinates for a given world x (x >= 0).
   * First delegates to HillData.getGroundY if exported by hills.js (Sprint 4.0 SCRUM-184),
   * otherwise uses internal FIS profile calculation with authentic table drop.
   */
  function getGroundY(hill, x) {
    if (x <= 0) {
      // At or before takeoff lip, lip edge is at y = 0
      return 0;
    }

    if (window.HillData && typeof window.HillData.getGroundY === 'function') {
      return window.HillData.getGroundY(hill, x);
    }

    const k = (hill && hill.kPoint) ? hill.kPoint : 120;
    const tableHeight = (hill && hill.tableHeight) ? hill.tableHeight : ((hill && hill.takeoffConfig && hill.takeoffConfig.lipHeight) ? hill.takeoffConfig.lipHeight : 3.2);
    const P = k * 0.78;
    const K = k;
    const HS = (hill && hill.hsPoint) ? hill.hsPoint : (k * 1.15);
    const outrunStart = HS + 25;
    const outrunFlat = outrunStart + 35;

    // Steep FIS profile with table drop:
    // Knoll (bula) starts at tableHeight below lip
    if (x <= P) {
      const t = x / P;
      const knollDrop = P * Math.tan((35.5 * Math.PI) / 180);
      return tableHeight + knollDrop * (0.15 * t + 0.85 * Math.pow(t, 1.85));
    } else if (x <= K) {
      const yP = tableHeight + P * Math.tan((35.5 * Math.PI) / 180);
      const steepSlope = Math.tan((36.5 * Math.PI) / 180);
      return yP + (x - P) * steepSlope;
    } else if (x <= HS) {
      const yP = tableHeight + P * Math.tan((35.5 * Math.PI) / 180);
      const steepSlope = Math.tan((36.5 * Math.PI) / 180);
      const yK = yP + (K - P) * steepSlope;
      const t = (x - K) / (HS - K);
      const avgSlope = Math.tan(((36.5 - 7.0 * t) * Math.PI) / 180);
      return yK + (x - K) * avgSlope;
    } else if (x <= outrunStart) {
      const yP = tableHeight + P * Math.tan((35.5 * Math.PI) / 180);
      const steepSlope = Math.tan((36.5 * Math.PI) / 180);
      const yK = yP + (K - P) * steepSlope;
      const yHS = yK + (HS - K) * Math.tan((31 * Math.PI) / 180);
      const t = (x - HS) / (outrunStart - HS);
      const avgSlope = Math.tan((Math.max(4, 28 * (1 - t * 0.85)) * Math.PI) / 180);
      return yHS + (x - HS) * avgSlope;
    } else if (x <= outrunFlat) {
      const yP = tableHeight + P * Math.tan((35.5 * Math.PI) / 180);
      const steepSlope = Math.tan((36.5 * Math.PI) / 180);
      const yK = yP + (K - P) * steepSlope;
      const yHS = yK + (HS - K) * Math.tan((31 * Math.PI) / 180);
      const yOut = yHS + (outrunStart - HS) * Math.tan((10 * Math.PI) / 180);
      const t = (x - outrunStart) / (outrunFlat - outrunStart);
      return yOut + (x - outrunStart) * Math.tan((5 * (1 - t) * Math.PI) / 180);
    } else {
      const yP = tableHeight + P * Math.tan((35.5 * Math.PI) / 180);
      const steepSlope = Math.tan((36.5 * Math.PI) / 180);
      const yK = yP + (K - P) * steepSlope;
      const yHS = yK + (HS - K) * Math.tan((31 * Math.PI) / 180);
      const yOut = yHS + (outrunStart - HS) * Math.tan((10 * Math.PI) / 180);
      const yFlat = yOut + (outrunFlat - outrunStart) * Math.tan((2.5 * Math.PI) / 180);
      return yFlat;
    }
  }

  /**
   * Computes ground tangent angle in degrees at coordinate x.
   * Delegates to HillData.getGroundSlopeAngle if available.
   */
  function getGroundSlopeAngle(hill, x) {
    if (window.HillData && typeof window.HillData.getGroundSlopeAngle === 'function') {
      return window.HillData.getGroundSlopeAngle(hill, x);
    }
    const delta = 0.2;
    const y1 = getGroundY(hill, Math.max(0, x - delta));
    const y2 = getGroundY(hill, x + delta);
    const dy = y2 - y1;
    const dx = 2 * delta;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  /**
   * Evaluates inrun profile coordinates for s in [0, 1] where 0 = starting gate, 1 = takeoff lip (x=0, y=0).
   */
  function getInrunPos(hill, s) {
    const inrunLength = (hill && hill.inrunLength) ? hill.inrunLength : 98;
    const inrunAngle = ((hill && hill.inrunAngle) ? hill.inrunAngle : 35) * (Math.PI / 180);
    const tableAngle = ((hill && hill.tableAngle) ? hill.tableAngle : 10.5) * (Math.PI / 180);

    const totalX = inrunLength * Math.cos((inrunAngle + tableAngle) / 2);
    const totalY = inrunLength * Math.sin((inrunAngle + tableAngle) / 2);

    const progress = Math.max(0, Math.min(1, s));
    const x = -totalX * (1 - progress);
    const y = -totalY * Math.pow(1 - progress, 1.25);

    const currentAngleDeg = (inrunAngle * (1 - progress) + tableAngle * progress) * (180 / Math.PI);

    return { x, y, angle: currentAngleDeg };
  }

  const SkiPhysics = {
    state: null,
    hill: null,
    wind: { x: 0, y: 0, speed: 0, angle: 0 },
    gravity: 9.81,

    /**
     * Initializes a new jump attempt on the specified hill.
     */
    initJump(hillInput, windVector) {
      let hillObj = null;
      if (typeof hillInput === 'string') {
        if (window.HillData && window.HillData.get) {
          hillObj = window.HillData.get(hillInput);
        } else if (window.HillData && window.HillData[hillInput]) {
          hillObj = window.HillData[hillInput];
        } else if (DEFAULT_HILLS[hillInput]) {
          hillObj = DEFAULT_HILLS[hillInput];
        } else {
          hillObj = DEFAULT_HILLS.zakopane;
        }
      } else if (hillInput && typeof hillInput === 'object') {
        hillObj = hillInput;
      } else {
        hillObj = DEFAULT_HILLS.zakopane;
      }

      this.hill = hillObj;

      if (windVector && typeof windVector === 'object') {
        this.wind = {
          speed: windVector.speed || 0,
          angle: windVector.angle || 0,
          x: windVector.x !== undefined ? windVector.x : (windVector.speed || 0) * Math.cos((windVector.angle || 0) * Math.PI / 180),
          y: windVector.y !== undefined ? windVector.y : -(windVector.speed || 0) * Math.sin((windVector.angle || 0) * Math.PI / 180)
        };
      } else {
        const speed = (Math.random() * 4.0 - 2.0);
        this.wind = {
          speed: parseFloat(speed.toFixed(1)),
          angle: speed >= 0 ? 0 : 180,
          x: speed,
          y: (Math.random() * 0.8 - 0.4)
        };
      }

      const initialPos = getInrunPos(this.hill, 0);

      this.state = {
        phase: 'GATE', // 'GATE' -> 'INRUN' -> 'FLIGHT' -> 'LANDING' -> 'STOPPED'
        x: initialPos.x,
        y: initialPos.y,
        vx: 0,
        vy: 0,
        angle: initialPos.angle, // Pitch angle of skier in degrees relative to horizontal
        skierLean: 0, // Player controlled lean: -1 (pitch up) to +1 (forward aerodynamic V-style)
        inrunProgress: 0, // 0 to 1
        speed: 0, // km/h
        groundClearance: 3.0, // meters above landing slope
        flightAltitude: 3.0, // live meters above mountain terrain
        flightSpeed: 0, // live km/h
        glideRatio: 0, // vx / vy ratio
        distance: 0, // Jumped distance along slope in meters
        isCrash: false,
        isTelemark: false,
        wantsTelemark: false,
        takeoffQuality: 0,
        takeoffAccuracyText: 'WAIT',
        takeoffLiftBoost: 1.0,
        verticalLiftImpulse: 4.8,
        flightDuration: 0, // seconds
        maxHeight: 0,
        landingAngleDiff: 0,
        landingSpeed: 0,
        trail: [],
        wind: this.wind,
        hill: this.hill,
        hasTriggeredTakeoff: false,
        outrunProgress: 0,
        stopTimer: 0
      };

      return this.getState();
    },

    /**
     * Start inrun descent from the gate
     */
    startInrun() {
      if (this.state && (this.state.phase === 'GATE' || this.state.phase === 'STOPPED')) {
        this.state.phase = 'INRUN';
        this.state.inrunProgress = 0;
        this.state.speed = 10;
        this.state.trail = [];
        this.state.isCrash = false;
        this.state.isTelemark = false;
        this.state.wantsTelemark = false;
        this.state.hasTriggeredTakeoff = false;
      }
    },

    /**
     * Trigger takeoff impulse when player presses SPACE / Jump Action
     */
    triggerTakeoff() {
      if (!this.state) return null;

      if (this.state.phase === 'INRUN') {
        const inrunLength = this.hill.inrunLength || 98;
        const distRemaining = (1 - this.state.inrunProgress) * inrunLength;

        let ratingKey = 'GREAT';
        let accuracyText = 'GREAT!';
        let liftBoost = 1.08;
        let liftImpulse = 5.2;

        if (distRemaining > 6.0) {
          ratingKey = 'EARLY';
          accuracyText = 'EARLY';
          liftBoost = 0.88;
          liftImpulse = 4.4;
        } else if (distRemaining >= 0.2 && distRemaining <= 2.8) {
          ratingKey = 'PERFECT';
          accuracyText = 'PERFECT! (+LIFT)';
          liftBoost = 1.25;
          liftImpulse = 6.0; // Explosive upward pop
        } else if (distRemaining > 2.8 && distRemaining <= 6.0) {
          ratingKey = 'GREAT';
          accuracyText = 'GREAT!';
          liftBoost = 1.08;
          liftImpulse = 5.2;
        } else if (distRemaining >= 0.0 && distRemaining < 0.2) {
          ratingKey = 'GREAT';
          accuracyText = 'GREAT!';
          liftBoost = 1.04;
          liftImpulse = 5.0;
        } else {
          ratingKey = 'LATE';
          accuracyText = 'LATE';
          liftBoost = 0.82;
          liftImpulse = 4.2;
        }

        this.state.takeoffQuality = ratingKey;
        this.state.takeoffAccuracyText = accuracyText;
        this.state.takeoffLiftBoost = liftBoost;
        this.state.verticalLiftImpulse = liftImpulse;
        this.state.hasTriggeredTakeoff = true;

        return {
          rating: ratingKey,
          quality: ratingKey,
          accuracyText: accuracyText,
          distRemaining: distRemaining,
          liftBoost: liftBoost
        };
      } else if (this.state.phase === 'FLIGHT') {
        this.attemptTelemarkLanding();
      }
      return null;
    },

    /**
     * Prepare or commit to Telemark landing
     */
    attemptTelemarkLanding() {
      if (!this.state || this.state.phase !== 'FLIGHT') return;
      this.state.wantsTelemark = true;
    },

    /**
     * Main physics step
     */
    update(dt, inputState) {
      if (!this.state) {
        return null;
      }

      const clampedDt = Math.min(0.066, Math.max(0.001, dt || 0.016));
      const input = inputState || {};

      if (typeof input.lean === 'number') {
        const targetLean = Math.max(-1, Math.min(1, input.lean));
        this.state.skierLean += (targetLean - this.state.skierLean) * Math.min(1, clampedDt * 8.0);
      }

      switch (this.state.phase) {
        case 'GATE':
          break;

        case 'INRUN':
          this._updateInrun(clampedDt);
          break;

        case 'FLIGHT':
          this._updateFlight(clampedDt, input);
          break;

        case 'LANDING':
          this._updateOutrun(clampedDt);
          break;

        case 'STOPPED':
          break;
      }

      return this.getState();
    },

    /**
     * Inrun acceleration kinematics
     */
    _updateInrun(dt) {
      const inrunLength = this.hill.inrunLength || 98;
      const targetSpeedMs = ((this.hill.baseSpeed || 92) * 1000) / 3600;

      const avgAngleRad = ((this.hill.inrunAngle || 35) * Math.PI) / 180;
      const acceleration = this.gravity * Math.sin(avgAngleRad) * 0.95;

      let currentSpeedMs = (this.state.speed * 1000) / 3600;
      currentSpeedMs += acceleration * dt;

      const maxSpeedMs = targetSpeedMs * 1.06;
      if (currentSpeedMs > maxSpeedMs) currentSpeedMs = maxSpeedMs;

      const distStep = currentSpeedMs * dt;
      this.state.inrunProgress += distStep / inrunLength;
      this.state.speed = parseFloat(((currentSpeedMs * 3600) / 1000).toFixed(1));

      const pos = getInrunPos(this.hill, this.state.inrunProgress);
      this.state.x = pos.x;
      this.state.y = pos.y;
      this.state.angle = pos.angle;

      if (this.state.inrunProgress >= 1.0 || this.state.x >= 0) {
        this._launchIntoFlight();
      }
    },

    /**
     * Transition from Inrun to Flight at edge of table (x = 0, y = 0)
     * Sprint 4.0 Kinematics:
     * - Lip is at (0, 0)
     * - Immediate upward lift component ensures upward/float clearance over knoll
     * - Sets initial groundClearance to hill's table drop height (~3.0m - 3.8m)
     */
    _launchIntoFlight() {
      this.state.phase = 'FLIGHT';
      this.state.x = 0;
      this.state.y = 0;

      const baseSpeedMs = (this.state.speed * 1000) / 3600;

      if (!this.state.hasTriggeredTakeoff) {
        this.state.takeoffQuality = 'MISSED';
        this.state.takeoffAccuracyText = 'MISSED';
        this.state.takeoffLiftBoost = 0.70;
        this.state.verticalLiftImpulse = 2.8;
      }

      const liftBoost = this.state.takeoffLiftBoost || 1.0;
      const verticalImpulse = this.state.verticalLiftImpulse || 5.0;

      const tableAngleRad = ((this.hill.tableAngle || 10.5) * Math.PI) / 180;
      const launchSpeed = baseSpeedMs * (0.98 + (liftBoost - 1.0) * 0.05);

      this.state.vx = launchSpeed * Math.cos(tableAngleRad);

      // In canvas coordinates, Y is positive downwards.
      // Net vertical velocity: table lip slope component minus upward takeoff impulse.
      // Produces an upward/flatter departure (vy negative or near 0) allowing aerodynamic cushion to catch air.
      const initialDownwardVel = launchSpeed * Math.sin(tableAngleRad) * 0.55;
      this.state.vy = initialDownwardVel - verticalImpulse;

      this.state.angle = Math.max(16.0, (this.hill.tableAngle || 10.5) + 6.0);
      this.state.flightDuration = 0;
      this.state.trail = [{ x: 0, y: 0 }];

      // Initial ground clearance at lip is the table drop height
      const initialGroundY = getGroundY(this.hill, 0.1);
      this.state.groundClearance = Math.max(2.5, initialGroundY - this.state.y);
      this.state.flightAltitude = this.state.groundClearance;
    },

    /**
     * Aerodynamic flight simulation with DSJ V-style float cushion
     * Sprint 4.0 (SCRUM-185):
     * - Takeoff clearance grace period / immunity: suppress ground collision for x < 12.0m OR t_flight < 0.65s.
     * - Descend-only collision trigger: Ground contact is evaluated ONLY when jumper is descending into terrain:
     *   (groundClearance <= 0.15 && state.vy > 0 && state.x > 8.0).
     * - Float cushion: maintains authentic DSJ V-style float maintaining 1.8m - 4.5m altitude over mountain slope.
     * - In-flight telemetry tracking: groundClearance, flightAltitude, flightSpeed, glideRatio.
     */
    _updateFlight(dt, input) {
      this.state.flightDuration += dt;

      // Relative air velocity
      const vrelX = this.state.vx - this.wind.x;
      const vrelY = this.state.vy - this.wind.y;
      const vrelMag = Math.hypot(vrelX, vrelY);

      if (vrelMag < 0.001) return;

      // Skier pitch angle theta (relative to horizontal)
      // Skier lean: +1 = aggressive forward aerodynamic V-style (~23°), 0 = standard (~27°), -1 = flare up (~38°)
      const targetAngle = 27.0 - (this.state.skierLean * 9.0);
      this.state.angle += (targetAngle - this.state.angle) * Math.min(1, dt * 6.5);

      // Angle of attack (alpha)
      const flightPathAngleDeg = (Math.atan2(this.state.vy, this.state.vx) * 180) / Math.PI;
      const alphaDeg = flightPathAngleDeg - this.state.angle;
      const alphaClamped = Math.max(-10, Math.min(65, alphaDeg));

      // Aerodynamic Lift (Cl) and Drag (Cd) coefficients for ski jumping V-style
      // Higher base lift coefficient provides authentic float cushion over mountain slope
      let Cl = 0.46 + 0.046 * alphaClamped;
      let Cd = 0.18 + 0.00062 * Math.pow(alphaClamped, 2);

      // Takeoff quality boost across first 1.4s of flight
      if (this.state.flightDuration < 1.4) {
        const bonus = (this.state.takeoffLiftBoost || 1.0);
        Cl *= (0.88 + bonus * 0.15);
      }

      // Ground effect aerodynamic float cushion:
      // When skiing within 2.0m - 5.0m of the slope, ram air cushion increases lift and reduces induced drag
      const currentGroundY = getGroundY(this.hill, Math.max(0, this.state.x));
      const currentClearance = currentGroundY - this.state.y;
      if (currentClearance > 0 && currentClearance < 5.0) {
        const cushionFactor = Math.max(0, (5.0 - currentClearance) / 5.0);
        Cl += 0.12 * cushionFactor;
        Cd = Math.max(0.14, Cd - 0.03 * cushionFactor);
      }

      if (alphaClamped > 40) {
        Cl *= Math.max(0.2, 1.0 - (alphaClamped - 40) * 0.045);
        Cd += 0.20;
      }

      // Dynamic pressure force
      const aeroScale = 0.0178;
      const q = 0.5 * vrelMag * vrelMag * aeroScale;

      const unitRelX = vrelX / vrelMag;
      const unitRelY = vrelY / vrelMag;

      // Lift is perpendicular to relative velocity (upwards in canvas coordinates)
      const liftUnitX = unitRelY;
      const liftUnitY = -unitRelX;

      const liftForce = Cl * q;
      const dragForce = Cd * q;

      const fxAero = -dragForce * unitRelX + liftForce * liftUnitX;
      const fyAero = -dragForce * unitRelY + liftForce * liftUnitY;

      // Gravity pulls downwards (+y in canvas)
      const ax = fxAero;
      const ay = this.gravity + fyAero;

      // Euler-Cromer integration
      this.state.vx += ax * dt;
      this.state.vy += ay * dt;

      this.state.x += this.state.vx * dt;
      this.state.y += this.state.vy * dt;

      // Update telemetry
      const currentSpeedMs = Math.hypot(this.state.vx, this.state.vy);
      this.state.speed = parseFloat(((currentSpeedMs * 3600) / 1000).toFixed(1));
      this.state.flightSpeed = this.state.speed;
      this.state.glideRatio = this.state.vy > 0 ? parseFloat((this.state.vx / this.state.vy).toFixed(2)) : 9.99;

      // Ground clearance and altitude above terrain
      const groundY = getGroundY(this.hill, this.state.x);
      this.state.groundClearance = groundY - this.state.y;
      this.state.flightAltitude = Math.max(0, parseFloat(this.state.groundClearance.toFixed(2)));

      if (this.state.y < this.state.maxHeight) {
        this.state.maxHeight = this.state.y;
      }

      // Distance estimation along landing hill curve
      const slopeDist = Math.hypot(this.state.x, groundY);
      this.state.distance = parseFloat(slopeDist.toFixed(1));

      // Append trail sample
      if (!this.state.trail || this.state.trail.length === 0 ||
          Math.hypot(this.state.x - this.state.trail[this.state.trail.length - 1].x,
                     this.state.y - this.state.trail[this.state.trail.length - 1].y) > 1.2) {
        this.state.trail.push({ x: this.state.x, y: this.state.y });
        if (this.state.trail.length > 350) {
          this.state.trail.shift();
        }
      }

      // =========================================================================
      // Sprint 4.0 Collision Logic (SCRUM-185):
      // 1. Takeoff clearance immunity / grace period:
      //    Collision with ground is IGNORED while x < 12.0m OR flightDuration < 0.65s
      //    unless vertical speed is downwards and clearance is negative.
      // 2. Descend-only collision trigger:
      //    Collision is ONLY evaluated when jumper is descending into terrain:
      //    groundClearance <= 0.15 && state.vy > 0 && state.x > 8.0.
      // =========================================================================
      const inTakeoffImmunity = (this.state.x < 12.0 || this.state.flightDuration < 0.65);

      if (inTakeoffImmunity) {
        // Enforce clearance immunity: do not trigger premature ground contact
        // If jumper fell way below ground during immunity (e.g. negative clearance with downward vy),
        // only then allow landing resolution
        if (this.state.groundClearance < -0.2 && this.state.vy > 0) {
          this._resolveLanding(groundY);
        }
      } else {
        // Normal flight regime: descend-only ground collision check
        const isDescending = this.state.vy > 0;
        const reachedGround = (this.state.groundClearance <= 0.15);
        const pastLipMin = (this.state.x > 8.0);

        if (reachedGround && isDescending && pastLipMin) {
          this._resolveLanding(groundY);
        }
      }
    },

    /**
     * Resolves landing impact: checks telemark posture vs two-footed landing vs crash
     */
    _resolveLanding(groundY) {
      this.state.phase = 'LANDING';
      this.state.y = groundY;
      this.state.groundClearance = 0;
      this.state.flightAltitude = 0;

      // Ground slope angle at impact point
      const slopeAngleDeg = getGroundSlopeAngle(this.hill, this.state.x);

      // Trajectory angle at landing
      const trajectoryAngleDeg = (Math.atan2(this.state.vy, this.state.vx) * 180) / Math.PI;

      // Skier pitch relative to slope
      const angleDiffWithSlope = Math.abs(this.state.angle - slopeAngleDeg);
      const angleDiffWithTraj = Math.abs(trajectoryAngleDeg - slopeAngleDeg);

      this.state.landingAngleDiff = angleDiffWithSlope;
      this.state.landingSpeed = this.state.speed;

      // Crash conditions:
      const isExtremeTilt = this.state.angle < 7 || this.state.angle > 55;
      const isSevereImpact = angleDiffWithTraj > 36;

      if (isExtremeTilt || isSevereImpact) {
        this.state.isCrash = true;
        this.state.isTelemark = false;
      } else {
        this.state.isCrash = false;
        // Telemark requires matching slope angle nicely and wanting telemark or having lean centered
        if (this.state.wantsTelemark || (angleDiffWithSlope < 15 && Math.abs(this.state.skierLean) < 0.50)) {
          this.state.isTelemark = true;
        } else {
          this.state.isTelemark = false; // Two-footed landing
        }
      }

      // Convert velocity onto slope tangent
      const slopeRad = (slopeAngleDeg * Math.PI) / 180;
      const speedMag = Math.hypot(this.state.vx, this.state.vy) * (this.state.isCrash ? 0.45 : 0.93);
      this.state.vx = speedMag * Math.cos(slopeRad);
      this.state.vy = speedMag * Math.sin(slopeRad);
    },

    /**
     * Updates outrun deceleration until stopped
     */
    _updateOutrun(dt) {
      const friction = this.state.isCrash ? 16.0 : 5.6;
      let speedMs = Math.hypot(this.state.vx, this.state.vy);

      speedMs = Math.max(0, speedMs - friction * dt);
      this.state.speed = parseFloat(((speedMs * 3600) / 1000).toFixed(1));

      const slopeAngleDeg = getGroundSlopeAngle(this.hill, this.state.x);
      const slopeRad = (slopeAngleDeg * Math.PI) / 180;

      this.state.vx = speedMs * Math.cos(slopeRad);
      this.state.vy = speedMs * Math.sin(slopeRad);

      this.state.x += this.state.vx * dt;
      this.state.y = getGroundY(this.hill, this.state.x);
      this.state.angle = slopeAngleDeg;
      this.state.groundClearance = 0;
      this.state.flightAltitude = 0;

      if (speedMs <= 0.5) {
        this.state.vx = 0;
        this.state.vy = 0;
        this.state.speed = 0;
        this.state.phase = 'STOPPED';
      }
    },

    /**
     * Get read-only snapshot of current physics state
     */
    getState() {
      if (!this.state) return null;
      return {
        phase: this.state.phase,
        x: this.state.x,
        y: this.state.y,
        vx: this.state.vx,
        vy: this.state.vy,
        angle: this.state.angle,
        skierLean: this.state.skierLean,
        inrunProgress: this.state.inrunProgress,
        speed: this.state.speed,
        groundClearance: this.state.groundClearance,
        flightAltitude: this.state.flightAltitude !== undefined ? this.state.flightAltitude : this.state.groundClearance,
        flightSpeed: this.state.flightSpeed !== undefined ? this.state.flightSpeed : this.state.speed,
        glideRatio: this.state.glideRatio || 0,
        distance: this.state.distance,
        isCrash: this.state.isCrash,
        isTelemark: this.state.isTelemark,
        wantsTelemark: this.state.wantsTelemark,
        takeoffQuality: this.state.takeoffQuality,
        takeoffAccuracyText: this.state.takeoffAccuracyText,
        takeoffLiftBoost: this.state.takeoffLiftBoost,
        verticalLiftImpulse: this.state.verticalLiftImpulse,
        flightDuration: parseFloat(this.state.flightDuration.toFixed(2)),
        trail: this.state.trail || [],
        wind: this.wind,
        hill: this.hill
      };
    },

    getGroundY,
    getGroundSlopeAngle,
    getInrunPos,
    DEFAULT_HILLS
  };

  window.SkiPhysics = SkiPhysics;
})(typeof window !== 'undefined' ? window : global);
