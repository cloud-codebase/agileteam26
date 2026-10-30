/**
 * physics.js - Aerodynamic Flight Physics & Hill Geometry for Retro Ski Jumps (DSJ style)
 * Implements:
 * - In-run acceleration along the ramp curve
 * - Takeoff jump impulse & timing penalty
 * - Aerodynamic lift, drag, and angle of attack (AoA) pitch control
 * - Dynamic wind vector effects (headwind provides lift, tailwind drops the jumper)
 * - Hill geometry & landing slope collision detection
 * - Landing angle & vertical velocity evaluation (Telemark vs Two-foot vs Crash)
 * - Official FIS 5-judge scoring formula (middle 3 scores counted, highest & lowest dropped)
 */
(function() {
  'use strict';

  // Default hill geometry if none supplied
  const DEFAULT_HILL = {
    id: 'zakopane',
    name: 'Wielka Krokiew (Zakopane)',
    kPoint: 120,
    hsPoint: 134,
    inRunLength: 95,
    tableAngle: 10.5, // degrees takeoff incline
    landingAngleK: 35.5, // degrees at K point
    record: { distance: 140.5, holder: 'Adam Małysz', year: 2002 }
  };

  const GRAVITY = 9.81;

  class SkiPhysicsEngine {
    constructor() {
      this.currentHill = Object.assign({}, DEFAULT_HILL);
      this.inRunStart = { x: 50, y: 80 };
      this.takeoffTable = { x: 260, y: 195 };
    }

    /**
     * Set active hill configuration
     * @param {Object} hillConfig
     */
    initHill(hillConfig) {
      if (!hillConfig) return;
      this.currentHill = Object.assign({}, DEFAULT_HILL, hillConfig);
    }

    /**
     * Compute ground/snow surface height y at given horizontal distance x
     * Coordinates:
     * (0, 0) is top-left of canvas.
     * Table edge is at (260, 195).
     * Downhill slopes down and rightwards.
     * @param {number} x - canvas horizontal coordinate
     * @returns {number} y coordinate of snow surface
     */
    getHillY(x) {
      const tableX = this.takeoffTable.x;
      const tableY = this.takeoffTable.y;

      // In-run section
      if (x < tableX) {
        const startX = this.inRunStart.x;
        const startY = this.inRunStart.y;
        const t = Math.max(0, Math.min(1, (x - startX) / (tableX - startX)));
        // Smooth curved ramp (steep start, flattening towards table)
        return startY + Math.pow(t, 1.6) * (tableY - startY);
      }

      // Landing hill slope (knoll, landing hill, outrun)
      // Reference: K-Point is approximately tableX + 380 px
      const dx = x - tableX;
      const kPointPx = (this.currentHill.kPoint || 120) * 3.2; // ~384 px for K120

      // Natural ski jumping hill profile using Bezier-like cubic curve
      // 0 to 80px: the knoll (steepening)
      // 80 to K: maximum steep slope (~35 deg)
      // K to HS: transition zone flattening
      // beyond HS: outrun flattening to level ground
      let y = tableY + 22; // Drop below takeoff table

      if (dx <= 100) {
        // Knoll transition
        const t = dx / 100;
        y += 15 + Math.pow(t, 2) * 55;
      } else if (dx <= kPointPx) {
        // Main landing slope
        const t = (dx - 100) / (kPointPx - 100);
        const yAt100 = tableY + 22 + 70;
        const yAtK = yAt100 + (kPointPx - 100) * 0.72; // ~35.7 deg slope
        y = yAt100 + t * (yAtK - yAt100);
      } else if (dx <= kPointPx + 150) {
        // HS & transition flattening
        const t = (dx - kPointPx) / 150;
        const yAt100 = tableY + 22 + 70;
        const yAtK = yAt100 + (kPointPx - 100) * 0.72;
        y = yAtK + t * 75 * (1 - t * 0.4);
      } else {
        // Outrun flat area
        const yAt100 = tableY + 22 + 70;
        const yAtK = yAt100 + (kPointPx - 100) * 0.72;
        const yAtOutrun = yAtK + 150 * 0.6;
        const extra = dx - (kPointPx + 150);
        y = yAtOutrun + Math.min(25, extra * 0.05); // near horizontal
      }

      return y;
    }

    /**
     * Compute slope angle of hill at position x in radians
     */
    getHillSlopeAngle(x) {
      const step = 2.0;
      const y1 = this.getHillY(x - step);
      const y2 = this.getHillY(x + step);
      return Math.atan2(y2 - y1, step * 2);
    }

    /**
     * Map canvas x coordinate to real meters jumped
     */
    xToMeters(x) {
      const dx = Math.max(0, x - this.takeoffTable.x);
      return Math.round((dx / 3.2) * 2) / 2; // In 0.5m increments
    }

    /**
     * Map meters to canvas x
     */
    metersToX(meters) {
      return this.takeoffTable.x + meters * 3.2;
    }

    /**
     * Update flight physics frame-by-frame
     * @param {Object} state - { x, y, vx, vy, pitch, phase, inRunProgress, landed, crashed, ... }
     * @param {Object} input - { pitchUp, pitchDown, jumpPressed, landingPressed }
     * @param {number} dt - seconds elapsed (~0.016)
     * @param {Object} wind - { speed: m/s (-4 to +4), angle: degrees }
     */
    updateFlight(state, input, dt, wind = { speed: 0, angle: 0 }) {
      if (!state) return state;

      // 1. IN_RUN PHASE
      if (state.phase === 'IN_RUN') {
        const tableX = this.takeoffTable.x;
        const startX = this.inRunStart.x;

        // Acceleration down in-run track (m/s converted to px/s)
        const inRunDist = tableX - startX;
        state.vx = (state.vx || 60) + 180 * dt; // Accelerates to ~92 km/h
        state.x = (state.x || startX) + state.vx * dt;
        state.y = this.getHillY(state.x) - 10; // On the track
        state.pitch = 18; // In-run crouch pitch

        // Takeoff detection
        const distToTable = tableX - state.x;
        if (input.jumpPressed && distToTable > -15 && distToTable < 35 && !state.hasJumped) {
          // Player snapped takeoff!
          state.hasJumped = true;
          // Precision bonus: closer to edge (distToTable ~ 0) gives better impulse
          const precision = 1.0 - Math.min(1.0, Math.abs(distToTable) / 35);
          state.takeoffQuality = Math.round(70 + precision * 30); // 70 - 100%
          state.vy = -120 - precision * 45; // Upward jump impulse
          state.vx += 35 + precision * 25;
          state.phase = 'FLIGHT';
          state.pitch = 24; // Initial V-style flight angle
          if (window.SkiAudio && typeof window.SkiAudio.playTakeoff === 'function') {
            window.SkiAudio.playTakeoff();
          }
        } else if (state.x >= tableX) {
          // Late takeoff / skied off the edge without button press
          state.phase = 'FLIGHT';
          state.takeoffQuality = state.hasJumped ? state.takeoffQuality : 40;
          state.vy = -55; // weak auto pop
          state.pitch = 22;
        }

        return state;
      }

      // 2. FLIGHT PHASE
      if (state.phase === 'FLIGHT') {
        // Pitch Control: Jumper rotates body into wind / V-style
        const PITCH_RATE = 45; // degrees per second
        if (input.pitchUp) {
          state.pitch = Math.min(48, state.pitch + PITCH_RATE * dt);
        } else if (input.pitchDown) {
          state.pitch = Math.max(-10, state.pitch - PITCH_RATE * dt);
        }

        // Relative airspeed including wind
        // Wind speed: positive = headwind (from front-right), negative = tailwind (from behind)
        const windVx = (wind.speed || 0) * 15; // scaled to canvas px/s
        const relativeVx = state.vx + windVx;
        const relativeVy = state.vy;
        const airspeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

        // Angle of Attack (AoA)
        // Optimal V-style flight pitch is between 25 and 36 degrees
        const flightPathAngle = Math.atan2(state.vy, state.vx) * (180 / Math.PI);
        const aoa = state.pitch - flightPathAngle;

        // Aerodynamics: Lift & Drag coefficients based on AoA
        let liftCoeff = 0;
        let dragCoeff = 0.45;

        if (aoa > 0 && aoa < 55) {
          // Ideal lift curve
          const normalizedAoA = aoa / 32; // peak around 32 deg
          liftCoeff = 1.15 * Math.sin(normalizedAoA * Math.PI * 0.5);
          dragCoeff = 0.35 + 0.55 * Math.pow(aoa / 50, 2);
        } else if (aoa >= 55) {
          // Stall! Jumper leaned too far back
          liftCoeff = 0.25;
          dragCoeff = 1.8;
          state.isStalled = true;
        } else {
          // Nose dive
          liftCoeff = -0.2;
          dragCoeff = 0.6;
        }

        // Aerodynamic forces
        const dynamicPressure = 0.00075 * airspeed * airspeed;
        const liftForce = liftCoeff * dynamicPressure * 160;
        const dragForce = dragCoeff * dynamicPressure * 100;

        // Headwind extra lift bonus, tailwind down-draft
        const windLiftEffect = (wind.speed || 0) * 12;

        // Accelerations
        const ax = -dragForce * (state.vx / (airspeed || 1));
        const ay = (GRAVITY * 18.5) - liftForce - windLiftEffect;

        state.vx += ax * dt;
        state.vy += ay * dt;

        // Terminal fall velocity clamp
        state.vy = Math.max(-180, Math.min(220, state.vy));

        // Position update
        state.x += state.vx * dt;
        state.y += state.vy * dt;

        // Check landing collision against hill surface
        const groundY = this.getHillY(state.x);
        const jumperFeetY = state.y + 16; // Feet offset

        if (jumperFeetY >= groundY) {
          // Touchdown!
          state.y = groundY - 16;
          this.handleLanding(state, input, groundY);
        }

        return state;
      }

      // 3. LANDED / CRASHED ROLLOUT
      if (state.phase === 'LANDED' || state.phase === 'CRASHED') {
        const groundY = this.getHillY(state.x);
        state.y = groundY - 16;

        // Friction slowing down the jumper
        const friction = state.phase === 'CRASHED' ? 240 : 130;
        state.vx = Math.max(0, state.vx - friction * dt);
        state.x += state.vx * dt;

        if (state.vx <= 5 && !state.scored) {
          state.phase = 'SCORED';
          state.vx = 0;
        }
      }

      return state;
    }

    /**
     * Evaluate touchdown: Telemark landing vs Two-foot landing vs Crash
     */
    handleLanding(state, input, groundY) {
      const slopeAngleRad = this.getHillSlopeAngle(state.x);
      const slopeAngleDeg = slopeAngleRad * (180 / Math.PI);
      const jumperAngle = state.pitch;

      // Jumper vertical impact speed relative to slope
      const verticalImpact = state.vy;

      // Check crash conditions:
      // 1. Extreme stall angle (pitch > 45 or pitch < 5)
      // 2. Severe vertical slamming speed without flare (> 170)
      const isAngleDisastrous = jumperAngle > 44 || jumperAngle < 3;
      const isImpactViolent = verticalImpact > 185;

      if (isAngleDisastrous || isImpactViolent) {
        // Crash!
        state.phase = 'CRASHED';
        state.landingStyle = 'CRASH';
        state.crashed = true;
        if (window.SkiAudio && typeof window.SkiAudio.playCrash === 'function') {
          window.SkiAudio.playCrash();
        }
      } else if (input.landingPressed || input.jumpPressed || (jumperAngle >= 18 && jumperAngle <= 34)) {
        // Telemark landing executed! One ski forward, knees bent
        state.phase = 'LANDED';
        state.landingStyle = 'TELEMARK';
        state.crashed = false;
        if (window.SkiAudio && typeof window.SkiAudio.playLanding === 'function') {
          window.SkiAudio.playLanding();
        }
        if (window.SkiAudio && typeof window.SkiAudio.playCheer === 'function') {
          window.SkiAudio.playCheer();
        }
      } else {
        // Safe Two-Foot Landing (no telemark bonus)
        state.phase = 'LANDED';
        state.landingStyle = 'TWO_FOOT';
        state.crashed = false;
        if (window.SkiAudio && typeof window.SkiAudio.playLanding === 'function') {
          window.SkiAudio.playLanding();
        }
      }

      // Calculate final jump distance
      state.distance = this.xToMeters(state.x);
    }

    /**
     * Official FIS Ski Jumping Scoring Formula:
     * - Distance points: 60 pts at K-point, +/- 1.8 pts per meter (large hill) or 2.0 (normal hill)
     * - 5 Judges style points: 5 scores between 10.0 and 20.0, drop highest and lowest, sum remaining 3.
     * - Wind compensation: +/- points based on headwind / tailwind.
     * @returns {Object} { distancePoints, judgeScores, totalStylePoints, windCompensation, totalPoints }
     */
    calculateScore(distance, landingStyle = 'TELEMARK', windSpeed = 0) {
      const hill = this.currentHill;
      const kPoint = hill.kPoint || 120;
      const ptsPerMeter = kPoint >= 115 ? 1.8 : 2.0;

      // 1. Distance Points
      const distanceDiff = distance - kPoint;
      const distancePoints = Math.round((60.0 + distanceDiff * ptsPerMeter) * 10) / 10;

      // 2. Five Judges' Scores
      // Base score according to landing style
      let baseJudge = 18.5;
      if (landingStyle === 'TELEMARK') {
        baseJudge = 18.5 + (distance >= kPoint ? 0.5 : 0.0);
      } else if (landingStyle === 'TWO_FOOT') {
        baseJudge = 16.5; // deduction for lack of telemark
      } else {
        baseJudge = 9.5; // heavy fall/crash deduction
      }

      // Generate 5 realistic judge scores with minor variations (+/- 0.5)
      const judgeCountries = ['POL', 'AUT', 'NOR', 'GER', 'SLO'];
      const judgeScores = judgeCountries.map(country => {
        const jitter = (Math.floor(Math.random() * 3) - 1) * 0.5; // -0.5, 0, +0.5
        let score = Math.max(8.0, Math.min(20.0, baseJudge + jitter));
        return { country, score: Math.round(score * 2) / 2 };
      });

      // Sort, drop highest and lowest, sum middle 3
      const numericScores = judgeScores.map(j => j.score).sort((a, b) => a - b);
      const middleScores = numericScores.slice(1, 4);
      const totalStylePoints = Math.round(middleScores.reduce((acc, val) => acc + val, 0) * 10) / 10;

      // 3. Wind Compensation
      // Headwind (windSpeed > 0): subtracted compensation points
      // Tailwind (windSpeed < 0): added compensation points
      const windCompensation = Math.round((-windSpeed * 4.8) * 10) / 10;

      // 4. Total points
      const totalPoints = Math.max(0, Math.round((distancePoints + totalStylePoints + windCompensation) * 10) / 10);

      return {
        distance,
        distancePoints,
        judgeScores,
        totalStylePoints,
        windCompensation,
        totalPoints
      };
    }
  }

  window.SkiPhysics = new SkiPhysicsEngine();
})();
