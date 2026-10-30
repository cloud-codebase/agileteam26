/**
 * physics.js - Aerodynamic Flight Physics & Hill Geometry for Retro Ski Jumps (DSJ style)
 * Sprint 2.0 / SCRUM-147: Core Flight Physics Engine and Aerodynamics Model
 *
 * Implements:
 * - In-run acceleration along the curved ramp with takeoff impulse timing window
 * - Precision takeoff timing evaluation (takeoff quality, impulse vector, pop bonus/penalty)
 * - Aerodynamic Angle of Attack (AoA) model with pitch control and V-style flight dynamics
 * - Nonlinear Lift & Drag formulas (L = 0.5 * rho * Cl * v^2, D = 0.5 * rho * Cd * v^2)
 * - Stall, tumble, and nose-dive detection based on critical AoA boundaries
 * - Dynamic 2D wind vector interactions (headwind lift vs tailwind drop, cross/vertical components)
 * - Hill geometry & landing slope collision detection
 * - Landing evaluation (Telemark vs Two-foot vs Crash) and FIS 5-judge scoring formula
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
    tableAngle: 10.5,     // degrees takeoff incline
    landingAngleK: 35.5,  // degrees at K point
    record: { distance: 140.5, holder: 'Adam Małysz', year: 2002 }
  };

  const GRAVITY = 9.81;

  // Aerodynamic physical constants
  const AIR_DENSITY = 1.225; // kg/m^3 (ISA sea level / winter air)
  const JUMPER_AREA_REF = 0.85; // m^2 frontal/wing reference area of jumper + V-skis
  const PIXEL_SCALE = 3.2; // 3.2 canvas pixels = 1.0 real-world meter
  const TIME_SCALE = 1.0; // simulation time dilation factor

  class SkiPhysicsEngine {
    constructor() {
      this.currentHill = Object.assign({}, DEFAULT_HILL);
      this.inRunStart = { x: 50, y: 80 };
      this.takeoffTable = { x: 260, y: 195 };

      // Aerodynamic tuning parameters (DSJ authentic feel)
      this.aeroConfig = {
        optimalAoA: 31.0,         // degrees: peak lift in V-style posture
        stallAoA: 52.0,           // degrees: critical stall angle
        pitchRate: 48.0,          // degrees/sec: responsive jumper rotation
        maxPitch: 50.0,           // max backward lean
        minPitch: -12.0,          // max forward dive
        clMax: 1.42,              // maximum lift coefficient
        cdMin: 0.32,              // parasitic base drag coefficient
        cdStall: 1.85,            // stalled drag coefficient
        windScaleX: 18.0,         // px/s per m/s of horizontal wind
        windScaleY: 12.0          // px/s per m/s of vertical wind / lift modifier
      };
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
      // Reference: K-Point is approximately tableX + kPoint * PIXEL_SCALE
      const dx = x - tableX;
      const kPointPx = (this.currentHill.kPoint || 120) * PIXEL_SCALE; // ~384 px for K120

      // Natural ski jumping hill profile using smooth bezier transition
      // 0 to 100px: the knoll (steepening)
      // 100 to K: maximum steep slope (~35-37 deg)
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
      return Math.round((dx / PIXEL_SCALE) * 2) / 2; // In 0.5m increments
    }

    /**
     * Map meters to canvas x
     */
    metersToX(meters) {
      return this.takeoffTable.x + meters * PIXEL_SCALE;
    }

    /**
     * Calculate Lift and Drag aerodynamic coefficients for a given Angle of Attack (AoA)
     * @param {number} aoa - Angle of Attack in degrees
     * @returns {{ liftCoeff: number, dragCoeff: number, isStalled: boolean, isNoseDive: boolean }}
     */
    computeAeroCoefficients(aoa) {
      const cfg = this.aeroConfig;
      let liftCoeff = 0;
      let dragCoeff = cfg.cdMin;
      let isStalled = false;
      let isNoseDive = false;

      if (aoa >= 0 && aoa <= cfg.stallAoA) {
        // Linear-to-sinusoidal lift curve peaking at optimalAoA (~31 deg)
        const normalizedAoA = aoa / cfg.optimalAoA;
        if (normalizedAoA <= 1.0) {
          liftCoeff = cfg.clMax * Math.sin(normalizedAoA * (Math.PI * 0.5));
        } else {
          // Post-optimal gentle decline towards stall threshold
          const postRatio = (aoa - cfg.optimalAoA) / (cfg.stallAoA - cfg.optimalAoA);
          liftCoeff = cfg.clMax * (1.0 - 0.35 * Math.pow(postRatio, 1.4));
        }
        // Induced drag increases quadratically with AoA (polar drag curve: Cd = Cd0 + k * Cl^2)
        dragCoeff = cfg.cdMin + 0.65 * Math.pow(aoa / cfg.stallAoA, 2.0);
      } else if (aoa > cfg.stallAoA) {
        // Deep aerodynamic stall! Airflow detaches from jumper and skis
        isStalled = true;
        const overStall = Math.min(30, aoa - cfg.stallAoA);
        liftCoeff = Math.max(0.12, (cfg.clMax * 0.45) - (overStall * 0.015));
        dragCoeff = cfg.cdStall + (overStall * 0.025);
      } else {
        // Negative AoA: Nose dive (AoA < 0)
        isNoseDive = true;
        liftCoeff = Math.max(-0.45, aoa * 0.035);
        dragCoeff = cfg.cdMin + 0.25 * Math.min(1.0, Math.abs(aoa) / 20);
      }

      return { liftCoeff, dragCoeff, isStalled, isNoseDive };
    }

    /**
     * Update flight physics frame-by-frame
     * @param {Object} state - { x, y, vx, vy, pitch, phase, inRunProgress, landed, crashed, ... }
     * @param {Object} input - { pitchUp, pitchDown, jumpPressed, landingPressed, telemarkPressed }
     * @param {number} dt - seconds elapsed (~0.016)
     * @param {Object} wind - { speed: m/s (-4 to +4), angle: degrees }
     */
    updateFlight(state, input, dt, wind = { speed: 0, angle: 0 }) {
      if (!state) return state;

      // 1. IN_RUN PHASE
      if (state.phase === 'IN_RUN') {
        const tableX = this.takeoffTable.x;
        const startX = this.inRunStart.x;

        // Acceleration down in-run track (reaches realistic ~90-94 km/h at takeoff table)
        state.vx = (state.vx || 60) + 185 * dt;
        state.x = (state.x || startX) + state.vx * dt;
        state.y = this.getHillY(state.x) - 10; // Locked on the track
        state.pitch = 18; // In-run crouch pitch

        // Precision takeoff timing window:
        // Optimal jump window is when distToTable is between 0px and 25px before the edge lip
        const distToTable = tableX - state.x;

        if (input.jumpPressed && distToTable > -18 && distToTable < 38 && !state.hasJumped) {
          // Player snapped takeoff inside the timing window!
          state.hasJumped = true;

          // Precision evaluation: 0px to 8px before edge is 100% "Perfect Timing"
          let precisionFactor = 0;
          if (distToTable >= -2 && distToTable <= 14) {
            // Golden sweet spot!
            precisionFactor = 1.0 - (Math.abs(distToTable - 6) / 14) * 0.15;
          } else if (distToTable > 14) {
            // Early takeoff penalty
            precisionFactor = Math.max(0.45, 1.0 - ((distToTable - 14) / 24) * 0.55);
          } else {
            // Late takeoff penalty (skied past edge before impulse)
            precisionFactor = Math.max(0.35, 1.0 - (Math.abs(distToTable) / 18) * 0.65);
          }

          state.takeoffQuality = Math.round(precisionFactor * 100);

          // Impulse: vertical pop velocity and forward horizontal drive
          state.vy = -125 - (precisionFactor * 48); // Upward impulse
          state.vx += 32 + (precisionFactor * 28);  // Forward launch
          state.phase = 'FLIGHT';
          state.pitch = 24; // Initial V-style flight angle

          if (window.SkiAudio && typeof window.SkiAudio.playTakeoff === 'function') {
            window.SkiAudio.playTakeoff();
          }
        } else if (state.x >= tableX) {
          // Late takeoff / skied off the edge without button press (weak pop)
          state.phase = 'FLIGHT';
          state.hasJumped = false;
          state.takeoffQuality = 35;
          state.vy = -50;
          state.pitch = 21;
        }

        return state;
      }

      // 2. FLIGHT PHASE
      if (state.phase === 'FLIGHT') {
        const cfg = this.aeroConfig;

        // Jumper body posture & pitch control
        if (input.pitchUp) {
          state.pitch = Math.min(cfg.maxPitch, state.pitch + cfg.pitchRate * dt);
        } else if (input.pitchDown) {
          state.pitch = Math.max(cfg.minPitch, state.pitch - cfg.pitchRate * dt);
        }

        // Decompose dynamic wind vector (speed in m/s, angle in degrees)
        // Angle convention: 0° = straight headwind (blowing from front to back),
        // 180° = tailwind (blowing from back to front), 90° = updraft, 270° = downdraft
        const windSpeed = typeof wind.speed === 'number' ? wind.speed : 0;
        const windAngleRad = ((wind.angle || 0) * Math.PI) / 180;

        // Effective wind components in canvas frame
        // Positive windSpeed usually represents headwind in DSJ telemetry,
        // but if wind.angle is provided, we compute explicit directional vectors:
        let windVx = 0;
        let windVy = 0;

        if (wind.angle !== undefined && wind.angle !== null) {
          // Polar decomposition relative to flight direction
          windVx = windSpeed * Math.cos(windAngleRad) * cfg.windScaleX;
          windVy = -windSpeed * Math.sin(windAngleRad) * cfg.windScaleY;
        } else {
          // Fallback simple 1D headwind / tailwind scalar
          windVx = windSpeed * cfg.windScaleX;
          windVy = 0;
        }

        // Relative airspeed vector (airspeed experienced by jumper)
        const relativeVx = state.vx + windVx;
        const relativeVy = state.vy + windVy;
        const airspeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

        // Flight path angle in degrees
        const flightPathAngle = Math.atan2(state.vy, state.vx) * (180 / Math.PI);

        // Angle of Attack (AoA) = Jumper pitch minus flight trajectory angle
        const aoa = state.pitch - flightPathAngle;

        // Compute lift and drag coefficients from AoA model
        const aero = this.computeAeroCoefficients(aoa);
        state.isStalled = aero.isStalled;
        state.isNoseDive = aero.isNoseDive;

        // Dynamic pressure q = 0.5 * rho * v^2
        // Scaled appropriately for 60FPS canvas pixel velocities
        const dynamicPressure = 0.00078 * airspeed * airspeed;
        const liftForce = aero.liftCoeff * dynamicPressure * 165;
        const dragForce = aero.dragCoeff * dynamicPressure * 105;

        // Wind updraft/downdraft direct force
        const directWindLift = -windVy * 0.85;

        // Equations of motion
        // Drag opposes velocity vector, Lift is perpendicular upwards
        const unitVx = airspeed > 0 ? (state.vx / airspeed) : 1;
        const unitVy = airspeed > 0 ? (state.vy / airspeed) : 0;

        // Horizontal and vertical accelerations
        const ax = -dragForce * unitVx;
        const ay = (GRAVITY * 18.2) - liftForce + directWindLift + (dragForce * unitVy * 0.15);

        // Apply acceleration to velocities
        state.vx += ax * dt;
        state.vy += ay * dt;

        // Jumper stability & tumble check:
        // Extreme pitch combined with high airspeed can induce an in-air tumble
        if (state.pitch > 47 && state.isStalled && airspeed > 140) {
          state.isTumbling = true;
          state.tumbleRate = (state.tumbleRate || 0) + 120 * dt;
          state.pitch += state.tumbleRate * dt;
        }

        // Terminal fall velocity clamp
        state.vy = Math.max(-190, Math.min(235, state.vy));

        // Position integration
        state.x += state.vx * dt;
        state.y += state.vy * dt;

        // Surface collision & touchdown detection
        const groundY = this.getHillY(state.x);
        const jumperFeetY = state.y + 16; // Skis contact point offset

        if (jumperFeetY >= groundY) {
          // Touchdown collision resolved directly to hill surface
          state.y = groundY - 16;
          this.handleLanding(state, input, groundY);
        }

        return state;
      }

      // 3. LANDED / CRASHED ROLLOUT
      if (state.phase === 'LANDED' || state.phase === 'CRASHED') {
        const groundY = this.getHillY(state.x);
        state.y = groundY - 16;

        // Slope alignment during rollout
        const slopeAngleDeg = this.getHillSlopeAngle(state.x) * (180 / Math.PI);
        if (state.phase === 'LANDED') {
          // Gently align pitch to slope during rollout
          state.pitch += (slopeAngleDeg - state.pitch) * 0.2;
        }

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
     * Considers:
     * 1. Relative angle between jumper pitch and snow slope
     * 2. Vertical impact velocity (slamming onto the hill)
     * 3. User input: landingPressed (Space/click) or telemarkPressed ('T')
     * 4. Safe pitch window (around slope incline +/- tolerance)
     */
    handleLanding(state, input = {}, groundY) {
      const slopeAngleRad = this.getHillSlopeAngle(state.x);
      const slopeAngleDeg = slopeAngleRad * (180 / Math.PI);
      const jumperAngle = state.pitch;

      // Jumper vertical impact speed
      const verticalImpact = state.vy;

      // Relative angle between jumper body/skis and the hill slope
      // Jumper angle is in degrees; slopeAngleDeg is typically 30-38 degrees on landing hill
      const angleDiff = Math.abs(jumperAngle - slopeAngleDeg);

      // Check crash conditions:
      // 1. Extreme pitch deviation (jumper leaned too far back > 44 or forward nosedive < 4) or tumble
      // 2. Severe relative mismatch with the slope angle (> 24 deg off slope)
      // 3. Violent vertical impact (> 185 px/s)
      const isAngleDisastrous = jumperAngle > 44 || jumperAngle < 4 || angleDiff > 24 || state.isTumbling;
      const isImpactViolent = verticalImpact > 185;

      if (isAngleDisastrous || isImpactViolent) {
        // Crash / Fall on the landing slope
        state.phase = 'CRASHED';
        state.landingStyle = 'CRASH';
        state.crashed = true;
        if (window.SkiAudio && typeof window.SkiAudio.playCrash === 'function') {
          window.SkiAudio.playCrash();
        }
      } else {
        // Safe touchdown: evaluate Telemark vs Two-foot landing
        // Telemark requires conscious timing (input.landingPressed or input.telemarkPressed or input.jumpPressed)
        // AND good alignment with slope (within 14 degrees) AND moderate impact (vy < 155)
        const wantsTelemark = Boolean(input.telemarkPressed || input.landingPressed || input.jumpPressed);
        const isSmoothLanding = angleDiff <= 14 && verticalImpact <= 155;

        if (wantsTelemark && isSmoothLanding) {
          // Perfect / Classical Telemark Landing: one ski lead, knees bent, arms open
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
          // Two-Foot Landing (parallel skis, stiff knees, style mark deductions)
          state.phase = 'LANDED';
          state.landingStyle = 'TWO_FOOT';
          state.crashed = false;
          if (window.SkiAudio && typeof window.SkiAudio.playLanding === 'function') {
            window.SkiAudio.playLanding();
          }
        }
      }

      // Calculate final jump distance
      state.distance = this.xToMeters(state.x);
    }

    /**
     * Official FIS Ski Jumping Scoring Formula:
     * - Distance points: 60 pts at K-point (120 for Ski Flying K200),
     *   +/- 1.8 pts per meter (large hill >= 115m), 2.0 (normal hill < 115m), or 1.2 (ski flying K>=180m).
     * - 5 Judges style points: 5 scores between 10.0 and 20.0, drop highest and lowest, sum remaining 3.
     * - Wind compensation: +/- points based on headwind (minus compensation) or tailwind (plus compensation).
     * @param {number} distance - Distance jumped in meters
     * @param {string} landingStyle - 'TELEMARK' | 'TWO_FOOT' | 'CRASH'
     * @param {number} windSpeed - Wind speed in m/s (positive = headwind, negative = tailwind)
     * @returns {Object} { distance, distancePoints, judgeScores, totalStylePoints, stylePoints, windCompensation, windPoints, totalPoints }
     */
    calculateScore(distance, landingStyle = 'TELEMARK', windSpeed = 0) {
      const hill = this.currentHill || DEFAULT_HILL;
      const kPoint = hill.kPoint || 120;

      // FIS Points per meter by hill classification:
      // Ski Flying (K >= 180): 120 base at K, 1.2 pts/m
      // Large Hill (K >= 115): 60 base at K, 1.8 pts/m
      // Normal Hill (K < 115): 60 base at K, 2.0 pts/m
      let baseDistancePoints = 60.0;
      let ptsPerMeter = 1.8;

      if (kPoint >= 180) {
        baseDistancePoints = 120.0;
        ptsPerMeter = 1.2;
      } else if (kPoint >= 115) {
        baseDistancePoints = 60.0;
        ptsPerMeter = 1.8;
      } else {
        baseDistancePoints = 60.0;
        ptsPerMeter = 2.0;
      }

      // 1. Distance Points
      const distanceDiff = distance - kPoint;
      const distancePoints = Math.round((baseDistancePoints + distanceDiff * ptsPerMeter) * 10) / 10;

      // 2. Five Judges' Style Scores
      // Telemark: base 18.0 - 19.5 (up to 20.0 beyond K-point)
      // Two-foot: 15.5 - 17.0 (deduction of 2.0 - 3.0 pts for lack of telemark per FIS rule 433)
      // Crash: 7.0 - 9.5 (heavy deduction of 10.0 pts for fall)
      let baseJudge = 18.5;
      if (landingStyle === 'TELEMARK') {
        baseJudge = distance >= kPoint ? 19.0 : 18.5;
      } else if (landingStyle === 'TWO_FOOT') {
        baseJudge = 16.5;
      } else {
        baseJudge = 8.5;
      }

      const judgeCountries = ['POL', 'AUT', 'NOR', 'GER', 'SLO'];
      const judgeScores = judgeCountries.map((country, idx) => {
        // Pseudo-random minor jitter (-0.5, 0.0, +0.5) with slight home bias realism
        const jitterSteps = [0, 0.5, -0.5, 0.5, -0.5];
        const step = jitterSteps[idx % jitterSteps.length];
        let score = Math.max(6.0, Math.min(20.0, baseJudge + step));
        // Round to nearest 0.5 increment per FIS standards
        score = Math.round(score * 2) / 2;
        return { country, score };
      });

      // Sort, drop highest and lowest, sum middle 3
      const numericScores = judgeScores.map(j => j.score).sort((a, b) => a - b);
      const middleScores = numericScores.slice(1, 4);
      const totalStylePoints = Math.round(middleScores.reduce((acc, val) => acc + val, 0) * 10) / 10;

      // 3. Wind Compensation
      // Headwind (windSpeed > 0): helps flight -> minus compensation points
      // Tailwind (windSpeed < 0): hinders flight -> plus compensation points
      // FIS formula approximation: delta_pts = -windSpeed * (kPoint - 36) / 20
      const windFactor = (kPoint - 36) / 17.5;
      const windCompensation = Math.round((-windSpeed * windFactor) * 10) / 10;

      // 4. Total round points (non-negative)
      const totalPoints = Math.max(0, Math.round((distancePoints + totalStylePoints + windCompensation) * 10) / 10);

      return {
        distance,
        distancePoints,
        judgeScores,
        totalStylePoints,
        stylePoints: totalStylePoints, // Alias for seamless compatibility
        windCompensation,
        windPoints: windCompensation,   // Alias for seamless compatibility
        totalPoints
      };
    }
  }

  window.SkiPhysics = new SkiPhysicsEngine();
})();
