/**
 * physics.js - Ski Jump Kinematics & Aerodynamic Flight Physics Engine
 * Sprint 1.0 (SCRUM-173)
 */

(function (window) {
  'use strict';

  // Default hill geometry if HillData is not loaded yet
  const DEFAULT_HILLS = {
    zakopane: {
      id: 'zakopane',
      name: 'Wielka Krokiew (Zakopane)',
      kPoint: 120,
      hsPoint: 140,
      inrunAngle: 35.0, // degrees
      tableAngle: 10.5, // degrees at lip
      inrunLength: 98.5, // meters
      record: 147.0,
      baseSpeed: 91.5 // km/h
    },
    planica: {
      id: 'planica',
      name: 'Letalnica bratov Gorišek (Planica)',
      kPoint: 200,
      hsPoint: 240,
      inrunAngle: 35.5,
      tableAngle: 11.2,
      inrunLength: 133.8,
      record: 252.0,
      baseSpeed: 102.0
    },
    wisla: {
      id: 'wisla',
      name: 'Malinka (Wisła)',
      kPoint: 120,
      hsPoint: 134,
      inrunAngle: 34.8,
      tableAngle: 10.0,
      inrunLength: 89.0,
      record: 139.0,
      baseSpeed: 89.5
    }
  };

  /**
   * Evaluates the landing hill ground y coordinate in world coordinates for a given world x (x >= 0, where 0 is edge of takeoff table).
   * Takes hill profile parameters (K-point, HS-point).
   */
  function getGroundY(hill, x) {
    if (x <= 0) {
      // Before takeoff lip, table edge is at y = 0
      return 0;
    }

    const k = (hill && hill.kPoint) ? hill.kPoint : 120;
    // Standard FIS ski jump hill geometry approximation:
    // Landing knoll (culmination), P-point (~0.8 * K), K-point, HS-point (~1.15 * K), Outrun transition (U-curve), Flat outrun.
    const P = k * 0.78;
    const K = k;
    const HS = (hill && hill.hsPoint) ? hill.hsPoint : (k * 1.15);
    const outrunStart = HS + 25;
    const outrunFlat = outrunStart + 35;

    // We define slope angle alpha(x). Landing hill drops downwards (positive y in canvas coordinate frame).
    // Slope angles:
    // At lip (x=0): ~11°
    // At knoll (x=P/2): accelerates down to ~35°-37° (K-point angle)
    // Between P and K: steepest ~35° - 37°
    // Past K to HS: transition curve flattening out to ~30° then ~15°
    // Outrun transition: flattening to ~0°

    if (x <= P) {
      // Transition from table dip (10.5°) to knoll and steep landing zone (35.5°)
      const t = x / P;
      // Smooth cubic ease
      const yP = P * Math.tan((26 * Math.PI) / 180);
      return yP * (0.15 * t + 0.85 * Math.pow(t, 2.1));
    } else if (x <= K) {
      const yP = P * Math.tan((26 * Math.PI) / 180);
      const steepSlope = Math.tan((35.5 * Math.PI) / 180);
      return yP + (x - P) * steepSlope;
    } else if (x <= HS) {
      const yP = P * Math.tan((26 * Math.PI) / 180);
      const steepSlope = Math.tan((35.5 * Math.PI) / 180);
      const yK = yP + (K - P) * steepSlope;
      const t = (x - K) / (HS - K);
      // Gentle deceleration of slope from 35.5 deg to 28 deg
      const avgSlope = Math.tan(((35.5 - 7.5 * t) * Math.PI) / 180);
      return yK + (x - K) * avgSlope;
    } else if (x <= outrunStart) {
      const yP = P * Math.tan((26 * Math.PI) / 180);
      const steepSlope = Math.tan((35.5 * Math.PI) / 180);
      const yK = yP + (K - P) * steepSlope;
      const yHS = yK + (HS - K) * Math.tan((31 * Math.PI) / 180);
      const t = (x - HS) / (outrunStart - HS);
      const avgSlope = Math.tan((Math.max(4, 28 * (1 - t * 0.85)) * Math.PI) / 180);
      return yHS + (x - HS) * avgSlope;
    } else if (x <= outrunFlat) {
      const yP = P * Math.tan((26 * Math.PI) / 180);
      const steepSlope = Math.tan((35.5 * Math.PI) / 180);
      const yK = yP + (K - P) * steepSlope;
      const yHS = yK + (HS - K) * Math.tan((31 * Math.PI) / 180);
      const yOut = yHS + (outrunStart - HS) * Math.tan((10 * Math.PI) / 180);
      const t = (x - outrunStart) / (outrunFlat - outrunStart);
      return yOut + (x - outrunStart) * Math.tan((5 * (1 - t) * Math.PI) / 180);
    } else {
      // Flat bottom
      const yP = P * Math.tan((26 * Math.PI) / 180);
      const steepSlope = Math.tan((35.5 * Math.PI) / 180);
      const yK = yP + (K - P) * steepSlope;
      const yHS = yK + (HS - K) * Math.tan((31 * Math.PI) / 180);
      const yOut = yHS + (outrunStart - HS) * Math.tan((10 * Math.PI) / 180);
      const yFlat = yOut + (outrunFlat - outrunStart) * Math.tan((2.5 * Math.PI) / 180);
      return yFlat;
    }
  }

  /**
   * Computes ground tangent angle in degrees at coordinate x.
   */
  function getGroundSlopeAngle(hill, x) {
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

    // Inrun starts up and to the left (negative x, negative y / elevated)
    // Curvature transitions from inrunAngle to tableAngle near the edge
    const totalX = inrunLength * Math.cos((inrunAngle + tableAngle) / 2);
    const totalY = inrunLength * Math.sin((inrunAngle + tableAngle) / 2);

    // s: 0 -> gate at (-totalX, -totalY), 1 -> takeoff lip at (0, 0)
    // Cubic transition curve for realistic inrun transition
    const progress = Math.max(0, Math.min(1, s));
    const x = -totalX * (1 - progress);
    const y = -totalY * Math.pow(1 - progress, 1.25);

    // Tangent angle at progress
    const currentAngleDeg = (inrunAngle * (1 - progress) + tableAngle * progress) * (180 / Math.PI);

    return { x, y, angle: currentAngleDeg };
  }

  const SkiPhysics = {
    // Current state variables
    state: null,
    hill: null,
    wind: { x: 0, y: 0, speed: 0, angle: 0 },
    gravity: 9.81,

    /**
     * Initializes a new jump attempt on the specified hill.
     * @param {string|Object} hillInput - Hill identifier or Hill object
     * @param {Object} [windVector] - { speed: number (m/s), angle: number (deg), x: number, y: number }
     */
    initJump(hillInput, windVector) {
      let hillObj = null;
      if (typeof hillInput === 'string') {
        if (window.HillData && window.HillData[hillInput]) {
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

      // Wind: negative wind.x = headwind (lift up + more drag, longer flight if trimmed properly), positive wind.x = tailwind
      // wind.y: negative = updraft, positive = downdraft
      if (windVector && typeof windVector === 'object') {
        this.wind = {
          speed: windVector.speed || 0,
          angle: windVector.angle || 0,
          x: windVector.x !== undefined ? windVector.x : (windVector.speed || 0) * Math.cos((windVector.angle || 0) * Math.PI / 180),
          y: windVector.y !== undefined ? windVector.y : -(windVector.speed || 0) * Math.sin((windVector.angle || 0) * Math.PI / 180)
        };
      } else {
        // Random wind between -3.0 and +3.0 m/s
        const speed = (Math.random() * 4.0 - 2.0); // e.g. -2.0 to +2.0
        this.wind = {
          speed: parseFloat(speed.toFixed(1)),
          angle: speed >= 0 ? 0 : 180,
          x: speed,
          y: (Math.random() * 0.8 - 0.4)
        };
      }

      const inrunLength = this.hill.inrunLength || 98;
      const initialPos = getInrunPos(this.hill, 0);

      this.state = {
        phase: 'GATE', // 'GATE' -> 'INRUN' -> 'TAKEOFF_WINDOW' -> 'FLIGHT' -> 'LANDING' -> 'STOPPED'
        x: initialPos.x,
        y: initialPos.y,
        vx: 0,
        vy: 0,
        angle: initialPos.angle, // Pitch angle of skier in degrees relative to horizontal
        skierLean: 0, // Player controlled lean: -1 (lean back / pitch up) to +1 (lean forward / aerodynamic V-style)
        inrunProgress: 0, // 0 to 1
        speed: 0, // km/h
        groundClearance: 0, // meters above landing slope
        distance: 0, // Jumped distance along slope in meters
        isCrash: false,
        isTelemark: false,
        takeoffQuality: 0, // -1 to 1 (0 = perfect, >0 = late, <0 = early)
        takeoffAccuracyText: 'WAIT', // 'PERFECT!', 'GOOD', 'EARLY', 'LATE', 'MISSED'
        flightDuration: 0, // seconds
        maxHeight: 0,
        landingAngleDiff: 0,
        landingSpeed: 0,
        trail: [], // Sample of [x, y] coordinates for visual arc
        wind: this.wind,
        hill: this.hill,
        // Detailed metrics for scoring
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
        this.state.speed = 10; // initial nudge
        this.state.trail = [];
        this.state.isCrash = false;
        this.state.isTelemark = false;
      }
    },

    /**
     * Trigger takeoff impulse when player presses SPACE / Jump Action
     * Timing window is evaluated based on distance to the edge of the inrun table (x=0).
     */
    triggerTakeoff() {
      if (!this.state) return null;

      if (this.state.phase === 'INRUN') {
        const inrunLength = this.hill.inrunLength || 98;
        const distRemaining = (1 - this.state.inrunProgress) * inrunLength; // meters to edge

        // Optimal jump window is within [0.2m, 2.8m] before edge
        // If distRemaining > 9m -> too early
        // If distRemaining < 0m -> late
        let quality = 0;
        let accuracyText = 'GOOD';
        let jumpBoost = 1.0;

        if (distRemaining > 9.0) {
          quality = -1.0;
          accuracyText = 'WAY TOO EARLY!';
          jumpBoost = 0.72;
        } else if (distRemaining > 4.5) {
          quality = -0.6;
          accuracyText = 'EARLY';
          jumpBoost = 0.85;
        } else if (distRemaining >= 0.8 && distRemaining <= 3.2) {
          quality = 0.0;
          accuracyText = 'PERFECT!';
          jumpBoost = 1.12;
        } else if (distRemaining >= 0.0 && distRemaining < 0.8) {
          quality = 0.3;
          accuracyText = 'GREAT!';
          jumpBoost = 1.05;
        } else {
          // Passed edge
          quality = 0.8;
          accuracyText = 'LATE';
          jumpBoost = 0.88;
        }

        this.state.takeoffQuality = quality;
        this.state.takeoffAccuracyText = accuracyText;

        // Perform immediate transition to flight if close enough, or store impulse
        this.state.hasTriggeredTakeoff = true;
        this.state.takeoffBoost = jumpBoost;

        return {
          quality,
          accuracyText,
          distRemaining
        };
      } else if (this.state.phase === 'FLIGHT') {
        // In flight, triggering jump action attempts Telemark landing prep
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
     * @param {number} dt - delta time in seconds (e.g. 1/60 ~ 0.016)
     * @param {Object} inputState - { lean: number (-1 to 1), jumpPressed: boolean, telemarkPressed: boolean }
     */
    update(dt, inputState) {
      if (!this.state) {
        return null;
      }

      // Clamp dt to avoid physics explodes on tab switch
      const clampedDt = Math.min(0.066, Math.max(0.001, dt || 0.016));
      const input = inputState || {};

      // Smooth lean adjustment
      if (typeof input.lean === 'number') {
        // Lean range: -1.0 (recline / flare up) to +1.0 (aggressive forward V-style flight)
        const targetLean = Math.max(-1, Math.min(1, input.lean));
        this.state.skierLean += (targetLean - this.state.skierLean) * Math.min(1, clampedDt * 8.0);
      }

      switch (this.state.phase) {
        case 'GATE':
          // Jumper waiting at the gate
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
          // Finished, waiting for next jump or reset
          break;
      }

      return this.getState();
    },

    /**
     * Private inrun acceleration kinematics
     */
    _updateInrun(dt) {
      const inrunLength = this.hill.inrunLength || 98;
      const targetSpeedMs = ((this.hill.baseSpeed || 92) * 1000) / 3600; // ~25.5 m/s

      // Gravity along slope accelerates the skier: a = g * sin(angle) - friction
      const avgAngleRad = ((this.hill.inrunAngle || 35) * Math.PI) / 180;
      const acceleration = this.gravity * Math.sin(avgAngleRad) * 0.94; // friction deduction

      let currentSpeedMs = (this.state.speed * 1000) / 3600;
      currentSpeedMs += acceleration * dt;

      // Cap at realistic maximum for the hill
      const maxSpeedMs = targetSpeedMs * 1.05;
      if (currentSpeedMs > maxSpeedMs) currentSpeedMs = maxSpeedMs;

      // Advance progress along inrun length
      const distStep = currentSpeedMs * dt;
      this.state.inrunProgress += distStep / inrunLength;
      this.state.speed = parseFloat(((currentSpeedMs * 3600) / 1000).toFixed(1));

      // Calculate position
      const pos = getInrunPos(this.hill, this.state.inrunProgress);
      this.state.x = pos.x;
      this.state.y = pos.y;
      this.state.angle = pos.angle;

      // Check for takeoff lip exit (progress >= 1.0 or x >= 0)
      if (this.state.inrunProgress >= 1.0 || this.state.x >= 0) {
        this._launchIntoFlight();
      }
    },

    /**
     * Transition from Inrun to Flight at edge of table (x = 0, y = 0)
     */
    _launchIntoFlight() {
      this.state.phase = 'FLIGHT';
      this.state.x = 0;
      this.state.y = 0;

      const baseSpeedMs = (this.state.speed * 1000) / 3600;
      const boost = this.state.hasTriggeredTakeoff ? (this.state.takeoffBoost || 1.0) : 0.8;
      if (!this.state.hasTriggeredTakeoff) {
        this.state.takeoffQuality = 1.0;
        this.state.takeoffAccuracyText = 'MISSED TAKEOFF!';
      }

      // Takeoff lip angle (downward pitch, e.g. 10.5°)
      const tableAngleRad = ((this.hill.tableAngle || 10.5) * Math.PI) / 180;

      // Initial velocity vector: skier shoots off forward and slightly downwards along table angle
      // with vertical impulse from leg extension (boost)
      const launchSpeed = baseSpeedMs * (0.97 + boost * 0.05);
      const verticalImpulse = boost * 2.2; // upward lift kick in m/s

      this.state.vx = launchSpeed * Math.cos(tableAngleRad);
      // Canvas Y is positive downwards, so upward impulse subtracts from vy
      this.state.vy = launchSpeed * Math.sin(tableAngleRad) - verticalImpulse;

      this.state.angle = this.hill.tableAngle || 10.5;
      this.state.flightDuration = 0;
      this.state.trail = [{ x: 0, y: 0 }];
    },

    /**
     * Private 2D aerodynamic flight simulation
     * Uses Lift (Cl) and Drag (Cd) coefficients mapped to skier pitch vs apparent wind vector.
     */
    _updateFlight(dt, input) {
      this.state.flightDuration += dt;

      // Wind apparent vector
      // Relative air velocity: V_rel = V_skier - V_wind
      const vrelX = this.state.vx - this.wind.x;
      // In canvas y, downward is positive; wind.y is negative for updraft
      const vrelY = this.state.vy - this.wind.y;
      const vrelMag = Math.hypot(vrelX, vrelY);

      if (vrelMag < 0.001) return;

      // Skier pitch angle theta (relative to horizontal).
      // Skier lean modifies pitch: lean +1 (V-style forward lean: ~24°), lean 0 (~30°), lean -1 (flare upright: ~42°)
      const targetAngle = 29.0 - (this.state.skierLean * 9.0);
      this.state.angle += (targetAngle - this.state.angle) * Math.min(1, dt * 6.0);

      // Angle of Attack (alpha) is difference between skier pitch and velocity flight path
      const flightPathAngleDeg = (Math.atan2(this.state.vy, this.state.vx) * 180) / Math.PI;
      const alphaDeg = flightPathAngleDeg - this.state.angle;

      // Aerodynamic Lift & Drag coefficients:
      // Peak lift for ski jumping V-style occurs around alpha = 24°-32°.
      // If alpha is too steep (>45°), aerodynamic stall occurs -> drag spikes, lift drops!
      // If alpha is negative, downward lift force is created.
      const alphaClamped = Math.max(-10, Math.min(65, alphaDeg));
      let Cl = 0.35 + 0.038 * alphaClamped; // Lift coefficient
      let Cd = 0.22 + 0.00075 * Math.pow(alphaClamped, 2); // Drag coefficient

      if (alphaClamped > 38) {
        // Stall regime
        Cl *= Math.max(0.2, 1.0 - (alphaClamped - 38) * 0.045);
        Cd += 0.25;
      }

      // Air density factor (rho / 2 * S / m) ~ constant scale
      const aeroScale = 0.0165;
      const q = 0.5 * vrelMag * vrelMag * aeroScale;

      // Lift force is perpendicular to relative wind direction (upwards)
      // Drag force is parallel to relative wind direction (backwards)
      const unitRelX = vrelX / vrelMag;
      const unitRelY = vrelY / vrelMag;

      // Normal vector perpendicular to relative wind (lift points counter-clockwise from velocity)
      const liftUnitX = unitRelY;
      const liftUnitY = -unitRelX;

      const liftForce = Cl * q;
      const dragForce = Cd * q;

      const fxAero = -dragForce * unitRelX + liftForce * liftUnitX;
      const fyAero = -dragForce * unitRelY + liftForce * liftUnitY;

      // Gravity acts purely along positive y (downwards in canvas)
      const ax = fxAero;
      const ay = this.gravity + fyAero;

      // Numerical integration (Euler-Cromer)
      this.state.vx += ax * dt;
      this.state.vy += ay * dt;

      this.state.x += this.state.vx * dt;
      this.state.y += this.state.vy * dt;

      // Current live speed in km/h
      const currentSpeedMs = Math.hypot(this.state.vx, this.state.vy);
      this.state.speed = parseFloat(((currentSpeedMs * 3600) / 1000).toFixed(1));

      // Calculate ground collision & distance along hill
      const groundY = getGroundY(this.hill, this.state.x);
      this.state.groundClearance = groundY - this.state.y;

      if (this.state.y < this.state.maxHeight) {
        this.state.maxHeight = this.state.y;
      }

      // Distance estimation along landing hill curve
      // In FIS jumping, distance = distance from table edge along landing slope to landing point
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

      // Collision check with ground
      if (this.state.groundClearance <= 0.05) {
        this._resolveLanding(groundY);
      }
    },

    /**
     * Resolves landing impact: checks telemark posture vs two-footed landing vs crash
     */
    _resolveLanding(groundY) {
      this.state.phase = 'LANDING';
      this.state.y = groundY;
      this.state.groundClearance = 0;

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
      // 1. Skier pitch is dangerously tilted forward (> 48°) or backward (< 8°)
      // 2. Trajectory angle is crashing perpendicularly into hill (angleDiffWithSlope > 32°)
      // 3. Jumper landed way past outrun on flat ground with high vertical speed
      const isExtremeTilt = this.state.angle < 8 || this.state.angle > 52;
      const isSevereImpact = angleDiffWithTraj > 34;

      if (isExtremeTilt || isSevereImpact) {
        this.state.isCrash = true;
        this.state.isTelemark = false;
      } else {
        this.state.isCrash = false;
        // Telemark requires matching slope angle nicely and wanting telemark or having lean centered
        if (this.state.wantsTelemark || (angleDiffWithSlope < 14 && Math.abs(this.state.skierLean) < 0.45)) {
          this.state.isTelemark = true;
        } else {
          this.state.isTelemark = false; // Two-footed landing
        }
      }

      // Convert velocity onto slope tangent
      const slopeRad = (slopeAngleDeg * Math.PI) / 180;
      const speedMag = Math.hypot(this.state.vx, this.state.vy) * (this.state.isCrash ? 0.45 : 0.92);
      this.state.vx = speedMag * Math.cos(slopeRad);
      this.state.vy = speedMag * Math.sin(slopeRad);
    },

    /**
     * Updates outrun deceleration until stopped
     */
    _updateOutrun(dt) {
      const friction = this.state.isCrash ? 16.0 : 5.8;
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
        speed: this.state.speed,
        groundClearance: this.state.groundClearance,
        distance: this.state.distance,
        isCrash: this.state.isCrash,
        isTelemark: this.state.isTelemark,
        takeoffQuality: this.state.takeoffQuality,
        takeoffAccuracyText: this.state.takeoffAccuracyText,
        flightDuration: parseFloat(this.state.flightDuration.toFixed(2)),
        trail: this.state.trail || [],
        wind: this.wind,
        hill: this.hill
      };
    },

    // Expose utility functions for renderer and testing
    getGroundY,
    getGroundSlopeAngle,
    getInrunPos,
    DEFAULT_HILLS
  };

  window.SkiPhysics = SkiPhysics;
})(typeof window !== 'undefined' ? window : global);
