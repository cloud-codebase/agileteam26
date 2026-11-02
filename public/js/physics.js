/**
 * physics.js - Retro 2D Ski Jumping Physics Engine (DSJ2 inspired)
 * Sprint 2.0: Steeper slope support, upgraded aerodynamic lift-to-drag polar curve for high glide,
 * sub-pixel takeoff edge evaluation & timing feedback (PERFECT/EARLY/LATE), continuous slope collision raycasting,
 * and starting gate energy scaling.
 */
(function() {
  'use strict';

  // Constants & Tuning
  const GRAVITY = 9.81; // m/s^2
  const AIR_DENSITY = 1.225; // kg/m^3
  const SKIER_MASS = 70.0; // kg with equipment

  // DSJ2 characteristic flight parameters (Sprint 2.0 Enhanced)
  const OPTIMAL_PITCH_DEG = 22.0; // Angle relative to flight trajectory
  const MAX_PITCH_CHANGE_RATE = 48.0; // deg / sec

  class SkiJumpPhysics {
    constructor() {
      this.hill = null;
      this.wind = { speed: 0, angle: 0, vx: 0, vy: 0 }; // angle in degrees: 0 = headwind, 180 = tailwind, 90 = updraft, 270 = downdraft
      this.currentGate = 12;
      this.reset();
    }

    reset() {
      this.phase = 'GATE'; // GATE, IN_RUN, TAKEOFF, FLIGHT, LANDED, CRASHED, STOPPED
      this.x = 0;
      this.y = 0;
      this.prevX = 0;
      this.prevY = 0;
      this.vx = 0;
      this.vy = 0;
      this.speed = 0; // km/h
      this.pitch = 0; // jumper angle relative to horizontal (deg)
      this.inrunDistance = 0;
      this.takeoffQuality = 0; // 0 to 100%
      this.takeoffFeedback = null; // { rating: 'PERFECT'|'EARLY'|'LATE', text: string, delta: number, quality: number }
      this.flightLiftRatio = 1.0;
      this.jumpDistance = 0; // measured along landing slope
      this.landingType = null; // 'telemark', 'two-foot', 'crash'
      this.styleScore = 0;
      this.heightAboveGround = 0;
      this.timeInPhase = 0;
      this.wantsLanding = false;
      this.wantsTelemark = false;
      this.trail = []; // trajectory history for visual smoke/trail
    }

    /**
     * Sets starting gate (1-20). Alters starting position and inrun potential energy.
     */
    setGate(gateNumber) {
      this.currentGate = Math.max(1, Math.min(20, Math.round(gateNumber || 12)));
      if (this.phase === 'GATE' && this.hill) {
        this.positionAtGate();
      }
    }

    /**
     * Positions jumper on the inrun according to the selected starting gate.
     */
    positionAtGate() {
      if (!this.hill || !this.hill.geometry) return;
      const pts = this.hill.geometry.inrunPoints;
      const defaultGate = (this.hill.gates && this.hill.gates.default) || 12;
      const gateDiff = this.currentGate - defaultGate;

      // Gate shifts starting index along inrun curve (each gate is ~2.5m along track)
      const baseIndex = Math.max(0, Math.min(pts.length - 20, Math.floor(pts.length * 0.08)));
      // Higher gate = higher up track (lower index)
      const targetIndex = Math.max(0, Math.min(pts.length - 15, baseIndex - gateDiff * 2));
      const gatePt = pts[targetIndex] || pts[0];

      this.x = gatePt.x;
      this.y = gatePt.y + 0.1;
      this.prevX = this.x;
      this.prevY = this.y;
      this.pitch = (Math.atan2(pts[Math.min(pts.length - 1, targetIndex + 1)].y - gatePt.y,
                               pts[Math.min(pts.length - 1, targetIndex + 1)].x - gatePt.x) * 180) / Math.PI;
    }

    /**
     * Initializes a new jump on the specified hill.
     * wind: { speed: meters/sec (0-5), angle: degrees (0=headwind, 180=tailwind) }
     */
    initJump(hill, wind) {
      this.reset();
      this.hill = hill || (window.SkiHills ? window.SkiHills.getHills()[0] : null);
      if (this.hill && this.hill.gates && typeof this.hill.gates.default === 'number') {
        this.currentGate = this.hill.gates.default;
      }
      const wSpeed = (wind && typeof wind.speed === 'number') ? wind.speed : (Math.random() * 3.5);
      const wAngle = (wind && typeof wind.angle === 'number') ? wind.angle : (Math.random() * 360);
      
      // Wind vector components (pointing into the jumper's reference frame)
      // Jumper flies in +X direction. A headwind blows in -X direction.
      const rad = (wAngle * Math.PI) / 180;
      this.wind = {
        speed: wSpeed,
        angle: wAngle,
        vx: -Math.cos(rad) * wSpeed,
        vy: Math.sin(rad) * wSpeed
      };

      this.positionAtGate();
      this.phase = 'GATE';
    }

    startInrun() {
      if (this.phase === 'GATE') {
        this.phase = 'IN_RUN';
        // Initial impulse scaled slightly by starting gate height
        const gateSpeedBonus = (this.currentGate - 10) * 0.1;
        this.vx = Math.max(1.5, 2.2 + gateSpeedBonus);
        this.vy = 0;
        this.timeInPhase = 0;
      }
    }

    /**
     * Trigger takeoff impulse when jumper springs off the lip.
     * Evaluates sub-pixel edge detection relative to lip (x = 0).
     * Returns: { quality, timingDeltaMeters, rating: 'PERFECT'|'EARLY'|'LATE', text }
     */
    triggerTakeoff() {
      if (this.phase !== 'IN_RUN') return this.takeoffFeedback;

      // Edge is defined at x = 0 (takeoff table lip)
      // distToLip: > 0 means before lip (early), < 0 means past lip (late)
      const distToLip = -this.x; // since x <= 0 before lip
      let rating = 'PERFECT';
      let text = 'PERFECT! (+100%)';
      let quality = 100;
      const timingDelta = Math.round(distToLip * 100) / 100;

      if (distToLip < -0.05) {
        // Late takeoff past lip edge
        rating = 'LATE';
        const pastMeters = Math.abs(distToLip);
        quality = Math.max(10, Math.round(100 - pastMeters * 80));
        text = `SPÓŹNIONE! (+${pastMeters.toFixed(2)}m)`;
      } else if (distToLip <= 0.35) {
        // Sub-pixel sweet spot right on the threshold (0 to 35cm before edge)
        rating = 'PERFECT';
        quality = Math.round(100 - (distToLip / 0.35) * 5);
        text = `PERFECT! (${quality}%)`;
      } else if (distToLip <= 1.2) {
        // Very good near edge
        rating = 'PERFECT';
        quality = Math.round(95 - ((distToLip - 0.35) / 0.85) * 12);
        text = `DOBRZE (-${distToLip.toFixed(2)}m)`;
      } else if (distToLip <= 4.0) {
        // Noticeably early
        rating = 'EARLY';
        quality = Math.max(35, Math.round(80 - (distToLip - 1.2) * 18));
        text = `ZA WCZEŚNIE! (-${distToLip.toFixed(2)}m)`;
      } else {
        // Drastically early jump
        rating = 'EARLY';
        quality = Math.max(15, Math.round(35 - (distToLip - 4.0) * 8));
        text = `BARDZO ZA WCZEŚNIE! (-${distToLip.toFixed(1)}m)`;
      }

      this.takeoffQuality = quality;
      this.takeoffFeedback = {
        rating: rating,
        text: text,
        delta: timingDelta,
        quality: quality
      };

      this.phase = 'TAKEOFF';
      this.timeInPhase = 0;

      // Vertical impulse perpendicular to takeoff table
      // Boosted for high-float trajectory on steeper slopes
      const impulsePower = 2.85 * (this.takeoffQuality / 100);
      const tableRad = (this.hill.inrun.tableAngle * Math.PI) / 180;
      this.vx += Math.sin(tableRad) * impulsePower * 0.45;
      this.vy += Math.cos(tableRad) * impulsePower;

      return this.takeoffFeedback;
    }

    /**
     * Trigger landing attempt (telemark or two-foot)
     */
    triggerLanding(isTelemark) {
      if (this.phase === 'FLIGHT') {
        this.wantsLanding = true;
        this.wantsTelemark = isTelemark;
      }
    }

    /**
     * Main physical update step
     * @param {number} dt Delta time in seconds (e.g. 1/60)
     * @param {Object} inputState { pitchUp: bool, pitchDown: bool, jump: bool, telemark: bool }
     */
    update(dt, inputState) {
      if (!this.hill) return;
      dt = Math.min(dt, 0.05); // clamp lag spikes
      this.timeInPhase += dt;

      this.prevX = this.x;
      this.prevY = this.y;

      const ground = window.SkiHills.getGroundAt(this.hill, this.x);
      this.heightAboveGround = Math.max(0, this.y - ground.y);

      switch (this.phase) {
        case 'GATE':
          this.positionAtGate();
          break;

        case 'IN_RUN':
          this.updateInrun(dt, ground, inputState);
          break;

        case 'TAKEOFF':
          // Transitioning off the lip
          if (this.x >= 0) {
            this.phase = 'FLIGHT';
          } else {
            this.updateInrun(dt, ground, inputState);
          }
          break;

        case 'FLIGHT':
          this.updateFlight(dt, ground, inputState);
          break;

        case 'LANDED':
        case 'CRASHED':
          this.updateOutrun(dt, ground);
          break;

        case 'STOPPED':
          // Stationary
          break;
      }

      // Compute display speed (km/h)
      this.speed = Math.hypot(this.vx, this.vy) * 3.6;

      // Keep recent position trail for retro smoke / ski ribbon effect
      if (this.phase === 'FLIGHT' || this.phase === 'LANDED') {
        if (this.trail.length > 70) this.trail.shift();
        this.trail.push({ x: this.x, y: this.y });
      }
    }

    /**
     * In-run downhill acceleration along track curve with gate energy scaling
     */
    updateInrun(dt, ground, inputState) {
      const slopeAngle = ground.angle; // negative angle downhill
      // Gravity component along track
      const aParallel = -GRAVITY * Math.sin(slopeAngle);
      // Inrun friction
      const frictionCoeff = 0.022;
      const friction = GRAVITY * Math.cos(slopeAngle) * frictionCoeff;
      const netA = Math.max(0, aParallel - friction);

      // Current track tangential speed
      let vTrack = Math.hypot(this.vx, this.vy);
      vTrack += netA * dt;

      // Project onto track slope
      this.vx = vTrack * Math.cos(slopeAngle);
      this.vy = vTrack * Math.sin(slopeAngle);

      this.x += this.vx * dt;
      // Clamped directly to inrun track
      const newGround = window.SkiHills.getGroundAt(this.hill, this.x);
      this.y = newGround.y;
      this.pitch = (newGround.angle * 180) / Math.PI;

      // Auto-launch if reaching or crossing the lip (x >= 0) without prior manual takeoff jump
      if (this.x >= 0) {
        if (this.phase === 'IN_RUN') {
          // Passive runoff past edge without pop
          this.takeoffQuality = 25;
          this.takeoffFeedback = {
            rating: 'LATE',
            text: 'SPÓŹNIONE! (AUTO-WYBICIE)',
            delta: Math.round(-this.x * 100) / 100,
            quality: 25
          };
          this.phase = 'FLIGHT';
        }
      }
    }

    /**
     * Upgraded V-Style 2D Aerodynamic flight model (Sprint 2.0 DESIGN.md)
     * Lift coefficient C_L boosted from 1.35 to 1.75 with optimal pitch 22 deg,
     * providing genuine altitude clearance over the steeper knoll and sustained glide float.
     * Incorporates continuous collision raycasting against landing slope profile.
     */
    updateFlight(dt, ground, inputState) {
      // Pitch control
      if (inputState && inputState.pitchUp) {
        this.pitch += MAX_PITCH_CHANGE_RATE * dt;
      } else if (inputState && inputState.pitchDown) {
        this.pitch -= MAX_PITCH_CHANGE_RATE * dt;
      }
      // Bound pitch angles (-35 to +50 deg)
      this.pitch = Math.max(-32, Math.min(48, this.pitch));

      // Apparent wind vector (velocity relative to surrounding air mass)
      const uAir = this.vx - this.wind.vx;
      const vAir = this.vy - this.wind.vy;
      const vRel = Math.hypot(uAir, vAir);

      // Trajectory angle relative to horizontal
      const trajAngle = Math.atan2(vAir, uAir);
      const trajAngleDeg = (trajAngle * 180) / Math.PI;

      // Angle of Attack (alpha) is difference between jumper body pitch and air stream
      const alpha = this.pitch - trajAngleDeg;
      const alphaRad = (alpha * Math.PI) / 180;

      // Sprint 2.0 Rebalanced Polar Curve:
      // Peak C_L of 1.75 at ~22 degrees alpha, with streamlined drag for long glide
      let cl = Math.sin(2 * alphaRad) * 1.75;
      let cd = 0.22 + (1 - Math.cos(alphaRad)) * 1.35;

      // Optimal flight efficiency factor
      const pitchDiffFromOptimal = Math.abs(alpha - OPTIMAL_PITCH_DEG);
      if (pitchDiffFromOptimal < 5.0) {
        cl *= 1.08; // Sweet spot lift cushion
        cd *= 0.92;
      }

      // Stalling or over-rotation penalties
      if (alpha > 42) {
        cl *= 0.45; // stall
        cd *= 2.0;
      } else if (alpha < -6) {
        cl *= 0.15; // diving
      }

      this.flightLiftRatio = Math.max(0, cl / Math.max(0.1, cd));

      // Aerodynamic forces
      const dynamicPressure = 0.5 * AIR_DENSITY * (vRel * vRel);
      const refArea = 0.98; // skier surface area in m^2

      const liftMag = dynamicPressure * cl * refArea;
      const dragMag = dynamicPressure * cd * refArea;

      // Lift is perpendicular to relative wind, drag is opposite
      const liftDirX = -Math.sin(trajAngle);
      const liftDirY = Math.cos(trajAngle);
      const dragDirX = -Math.cos(trajAngle);
      const dragDirY = -Math.sin(trajAngle);

      const fLiftX = liftMag * liftDirX;
      const fLiftY = liftMag * liftDirY;
      const fDragX = dragMag * dragDirX;
      const fDragY = dragMag * dragDirY;

      // Gravity force
      const fGravityY = -SKIER_MASS * GRAVITY;

      // Total acceleration
      const ax = (fLiftX + fDragX) / SKIER_MASS;
      const ay = (fLiftY + fDragY + fGravityY) / SKIER_MASS;

      this.vx += ax * dt;
      this.vy += ay * dt;

      const nextX = this.x + this.vx * dt;
      const nextY = this.y + this.vy * dt;

      // Continuous collision raycasting between (this.x, this.y) and (nextX, nextY)
      const rayResult = this.checkSlopeRaycastCollision(this.x, this.y, nextX, nextY);

      if (rayResult.hit) {
        this.x = rayResult.impactX;
        this.y = rayResult.impactY;
        const impactGround = window.SkiHills.getGroundAt(this.hill, this.x);
        this.resolveTouchdown(impactGround, inputState);
      } else {
        this.x = nextX;
        this.y = nextY;
      }
    }

    /**
     * Sub-step raycasting against the landing slope geometry between current (x1, y1) and next (x2, y2).
     * Prevents tunneling at high flight speeds and provides sub-meter precision touchdown points.
     */
    checkSlopeRaycastCollision(x1, y1, x2, y2) {
      const g2 = window.SkiHills.getGroundAt(this.hill, x2);
      if (y2 > g2.y) {
        return { hit: false };
      }

      // If y2 is at or below ground, find exact sub-step intersection via binary search / linear interpolation
      let tMin = 0.0;
      let tMax = 1.0;
      let impactX = x2;
      let impactY = g2.y;

      for (let iter = 0; iter < 5; iter++) {
        const tMid = (tMin + tMax) * 0.5;
        const midX = x1 + tMid * (x2 - x1);
        const midY = y1 + tMid * (y2 - y1);
        const midGround = window.SkiHills.getGroundAt(this.hill, midX);

        if (midY <= midGround.y) {
          tMax = tMid;
          impactX = midX;
          impactY = midGround.y;
        } else {
          tMin = tMid;
        }
      }

      return { hit: true, impactX, impactY };
    }

    /**
     * Landing resolution: Evaluates slope alignment, pitch angle, vertical velocity,
     * and user input timing (Telemark vs two-foot vs crash).
     */
    resolveTouchdown(ground, inputState) {
      this.y = ground.y;
      this.jumpDistance = Math.round(ground.distance * 10) / 10;

      const groundAngleDeg = (ground.angle * 180) / Math.PI;
      const pitchMismatch = Math.abs(this.pitch - groundAngleDeg);
      const impactVelocity = Math.abs(this.vy);

      // Check whether jumper triggered landing
      const isTelemarkInput = (inputState && inputState.telemark) || this.wantsTelemark;
      const isLandingInput = (inputState && inputState.landing) || this.wantsLanding || isTelemarkInput;

      // Crash conditions:
      // - Severe pitch misalignment (> 26 deg relative to slope)
      // - Unreasonable extreme body angle (pitch < -42 or pitch > 45)
      // - Heavy vertical impact without landing stance (> 12.5 m/s)
      // - Backflip or nose-dive
      const isSevereMismatch = pitchMismatch > 25.0;
      const isExtremeAngle = this.pitch < -42.0 || this.pitch > 45.0;
      const isExtremeImpact = impactVelocity > 14.5;
      const isHardFall = !isLandingInput && impactVelocity > 11.5;

      if (isSevereMismatch || isExtremeAngle || isExtremeImpact || isHardFall) {
        this.phase = 'CRASHED';
        this.landingType = 'crash';
        this.styleScore = Math.round((7.0 + Math.random() * 2.0) * 2) / 2; // minimal style score on fall
      } else if (isTelemarkInput && pitchMismatch <= 17.5 && impactVelocity <= 13.5) {
        // Crisp Telemark landing!
        this.phase = 'LANDED';
        this.landingType = 'telemark';
        // Base 18.0 - 20.0 style score based on alignment
        const alignmentBonus = Math.max(0, (17.5 - pitchMismatch) * 0.12);
        this.styleScore = Math.min(20.0, Math.round((18.5 + alignmentBonus) * 2) / 2);
      } else {
        // Two-footed landing (safe but deductions applied)
        this.phase = 'LANDED';
        this.landingType = 'two-foot';
        this.styleScore = Math.round((15.5 + Math.random() * 1.5) * 2) / 2;
      }

      // Convert momentum along landing slope
      const speed = Math.hypot(this.vx, this.vy);
      this.vx = speed * Math.cos(ground.angle) * 0.85;
      this.vy = speed * Math.sin(ground.angle) * 0.85;
    }

    /**
     * Sliding to a halt in the outrun
     */
    updateOutrun(dt, ground) {
      const friction = this.phase === 'CRASHED' ? 14.0 : 6.5;
      const speed = Math.hypot(this.vx, this.vy);

      if (speed <= 0.5) {
        this.vx = 0;
        this.vy = 0;
        this.phase = 'STOPPED';
        return;
      }

      const newSpeed = Math.max(0, speed - friction * dt);
      this.vx = newSpeed * Math.cos(ground.angle);
      this.vy = newSpeed * Math.sin(ground.angle);

      this.x += this.vx * dt;
      this.y = ground.y;

      if (this.phase === 'CRASHED') {
        this.pitch += 360 * dt;
      } else {
        this.pitch = (ground.angle * 180) / Math.PI;
      }
    }

    /**
     * Returns full jump state for HUD and Canvas rendering
     */
    getJumpState() {
      return {
        phase: this.phase,
        x: this.x,
        y: this.y,
        vx: this.vx,
        vy: this.vy,
        speed: this.speed,
        pitch: this.pitch,
        distance: this.jumpDistance,
        height: this.heightAboveGround,
        takeoffQuality: this.takeoffQuality,
        takeoffFeedback: this.takeoffFeedback,
        flightLiftRatio: this.flightLiftRatio,
        gate: this.currentGate,
        landingType: this.landingType,
        styleScore: this.styleScore,
        wind: this.wind,
        trail: this.trail,
        time: this.timeInPhase
      };
    }
  }

  // Export to global window
  const instance = new SkiJumpPhysics();
  window.SkiPhysics = {
    initJump: (hill, wind) => instance.initJump(hill, wind),
    startInrun: () => instance.startInrun(),
    setGate: (gateNumber) => instance.setGate(gateNumber),
    triggerTakeoff: () => instance.triggerTakeoff(),
    triggerLanding: (isTelemark) => instance.triggerLanding(isTelemark),
    update: (dt, inputState) => instance.update(dt, inputState),
    getJumpState: () => instance.getJumpState(),
    getInstance: () => instance
  };

})();
