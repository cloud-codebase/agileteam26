/**
 * physics.js - Retro 2D Ski Jumping Physics Engine (DSJ2 inspired)
 * Handles inrun slide acceleration, takeoff impulse timing, V-style aerodynamic lift & drag,
 * pitch balance, dynamic wind vectors, and precise landing / crash detection.
 */
(function() {
  'use strict';

  // Constants & Tuning
  const GRAVITY = 9.81; // m/s^2
  const AIR_DENSITY = 1.225; // kg/m^3
  const SKIER_MASS = 70.0; // kg with equipment

  // DSJ2 characteristic flight parameters
  const OPTIMAL_PITCH_DEG = 22.0; // Angle relative to flight trajectory
  const MAX_PITCH_CHANGE_RATE = 45.0; // deg / sec

  class SkiJumpPhysics {
    constructor() {
      this.hill = null;
      this.wind = { speed: 0, angle: 0, vx: 0, vy: 0 }; // angle in degrees: 0 = headwind, 180 = tailwind, 90 = updraft, 270 = downdraft
      this.reset();
    }

    reset() {
      this.phase = 'GATE'; // GATE, IN_RUN, TAKEOFF, FLIGHT, LANDED, CRASHED, STOPPED
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.speed = 0; // km/h
      this.pitch = 0; // jumper angle relative to horizontal (deg)
      this.inrunDistance = 0;
      this.takeoffQuality = 0; // 0 to 100%
      this.jumpDistance = 0; // measured along landing slope
      this.landingType = null; // 'telemark', 'two-foot', 'crash'
      this.styleScore = 0;
      this.heightAboveGround = 0;
      this.timeInPhase = 0;
      this.trail = []; // trajectory history for visual smoke/trail
    }

    /**
     * Initializes a new jump on the specified hill.
     * wind: { speed: meters/sec (0-5), angle: degrees (0=headwind, 180=tailwind) }
     */
    initJump(hill, wind) {
      this.reset();
      this.hill = hill || window.SkiHills.getHills()[0];
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

      // Start at top of inrun
      const topPt = this.hill.geometry.inrunPoints[0];
      this.x = topPt.x;
      this.y = topPt.y + 0.1;
      this.pitch = -this.hill.inrun.angle;
      this.phase = 'GATE';
    }

    startInrun() {
      if (this.phase === 'GATE') {
        this.phase = 'IN_RUN';
        this.vx = 2.0; // initial nudge from gate
        this.vy = 0;
        this.timeInPhase = 0;
      }
    }

    /**
     * Trigger takeoff impulse when jumper springs off the lip.
     * Evaluates timing relative to edge (x = 0).
     */
    triggerTakeoff() {
      if (this.phase !== 'IN_RUN') return;

      const distToLip = -this.x; // x is <= 0
      // Ideal takeoff is exactly at lip (-0.5m to 0.0m)
      let quality = 0;
      if (distToLip < 0) {
        // Late takeoff past lip
        quality = Math.max(0, 100 - Math.abs(distToLip) * 60);
      } else if (distToLip <= 1.2) {
        // Perfect window
        quality = 100 - (distToLip / 1.2) * 15;
      } else if (distToLip <= 6.0) {
        // Early jump
        quality = Math.max(20, 85 - (distToLip - 1.2) * 15);
      } else {
        // Much too early
        quality = 15;
      }

      this.takeoffQuality = Math.round(quality);
      this.phase = 'TAKEOFF';
      this.timeInPhase = 0;

      // Vertical impulse perpendicular to takeoff table
      const impulsePower = 2.4 * (this.takeoffQuality / 100);
      const tableRad = (this.hill.inrun.tableAngle * Math.PI) / 180;
      this.vx += Math.sin(tableRad) * impulsePower * 0.5;
      this.vy += Math.cos(tableRad) * impulsePower;
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

      const ground = window.SkiHills.getGroundAt(this.hill, this.x);
      this.heightAboveGround = Math.max(0, this.y - ground.y);

      switch (this.phase) {
        case 'GATE':
          // Awaiting release
          this.x = this.hill.geometry.inrunPoints[0].x;
          this.y = this.hill.geometry.inrunPoints[0].y + 0.1;
          break;

        case 'IN_RUN':
          this.updateInrun(dt, ground, inputState);
          break;

        case 'TAKEOFF':
          // Brief instant transitioning off the lip
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
        if (this.trail.length > 60) this.trail.shift();
        this.trail.push({ x: this.x, y: this.y });
      }
    }

    /**
     * In-run downhill acceleration along track curve
     */
    updateInrun(dt, ground, inputState) {
      // Slope angle
      const slopeAngle = ground.angle; // negative angle downhill
      // Gravity component along track
      const aParallel = -GRAVITY * Math.sin(slopeAngle);
      // Inrun friction
      const frictionCoeff = 0.025;
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

      // Auto-launch if reaching the lip without user jump input
      if (this.x >= 0) {
        if (this.phase === 'IN_RUN') {
          // Passive runoff (no pop impulse)
          this.takeoffQuality = 30;
          this.phase = 'FLIGHT';
        }
      }
    }

    /**
     * V-Style 2D Aerodynamic flight model
     * Lift and drag dynamically depend on jumper pitch relative to apparent wind.
     */
    updateFlight(dt, ground, inputState) {
      // Pitch control
      if (inputState && inputState.pitchUp) {
        this.pitch += MAX_PITCH_CHANGE_RATE * dt;
      } else if (inputState && inputState.pitchDown) {
        this.pitch -= MAX_PITCH_CHANGE_RATE * dt;
      }
      // Bound reasonable pitch angles (-35 to +50 deg)
      this.pitch = Math.max(-30, Math.min(48, this.pitch));

      // Apparent wind vector (velocity relative to surrounding air mass)
      const uAir = this.vx - this.wind.vx;
      const vAir = this.vy - this.wind.vy;
      const vRel = Math.hypot(uAir, vAir);

      // Trajectory angle relative to horizontal
      const trajAngle = Math.atan2(vAir, uAir); // typically negative during flight
      const trajAngleDeg = (trajAngle * 180) / Math.PI;

      // Angle of Attack (alpha) is difference between jumper body pitch and air stream
      const alpha = this.pitch - trajAngleDeg;

      // DSJ2 lift & drag curves (polar curve)
      // Near ~20-25 degrees alpha, lift peaks, drag is balanced
      const alphaRad = (alpha * Math.PI) / 180;
      let cl = Math.sin(2 * alphaRad) * 1.35; // Lift coefficient
      let cd = 0.25 + (1 - Math.cos(alphaRad)) * 1.5; // Drag coefficient

      // Stalling or over-rotation penalties
      if (alpha > 40) {
        cl *= 0.5; // stall
        cd *= 1.8;
      } else if (alpha < -5) {
        cl *= 0.2; // diving
      }

      // Aerodynamic forces
      const dynamicPressure = 0.5 * AIR_DENSITY * (vRel * vRel);
      const refArea = 0.95; // skier surface area in m^2

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

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Check ground collision / landing
      if (this.y <= ground.y) {
        this.resolveTouchdown(ground, inputState);
      }
    }

    /**
     * Landing resolution: Evaluates slope alignment, pitch angle, vertical velocity,
     * and user input timing (telemark vs two-foot vs crash).
     */
    resolveTouchdown(ground, inputState) {
      this.y = ground.y;
      this.jumpDistance = Math.round(ground.distance * 10) / 10;

      const groundAngleDeg = (ground.angle * 180) / Math.PI;
      // Angle mismatch between skis/body and landing slope
      const pitchMismatch = Math.abs(this.pitch - groundAngleDeg);
      const impactVelocity = Math.abs(this.vy);

      // Check whether jumper triggered landing
      const isTelemarkInput = (inputState && inputState.telemark) || this.wantsTelemark;
      const isLandingInput = (inputState && inputState.landing) || this.wantsLanding || isTelemarkInput;

      // Crash conditions:
      // - Severe pitch misalignment (> 30 deg)
      // - Excessive vertical impact speed (> 14 m/s without landing stance)
      // - No landing initiated or head-first diving
      const isExtremeAngle = pitchMismatch > 28 || this.pitch < -40 || this.pitch > 45;
      const isExtremeImpact = impactVelocity > 15.0;

      if (isExtremeAngle || (isExtremeImpact && !isLandingInput)) {
        this.phase = 'CRASHED';
        this.landingType = 'crash';
        this.styleScore = 6.0 + Math.random() * 2.0; // minimal style score on fall
      } else if (isTelemarkInput && pitchMismatch <= 18) {
        // Crisp Telemark landing!
        this.phase = 'LANDED';
        this.landingType = 'telemark';
        // Base 18.0 - 19.5 style score
        const bonus = Math.max(0, (18 - pitchMismatch) * 0.1);
        this.styleScore = Math.min(20.0, Math.round((18.5 + bonus) * 2) / 2);
      } else {
        // Two-footed landing (safe but style point deductions)
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
      // High snow friction in outrun
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
        // Tumbling effect
        this.pitch += 360 * dt;
      } else {
        // Aligned with ground
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
    triggerTakeoff: () => instance.triggerTakeoff(),
    triggerLanding: (isTelemark) => instance.triggerLanding(isTelemark),
    update: (dt, inputState) => instance.update(dt, inputState),
    getJumpState: () => instance.getJumpState(),
    getInstance: () => instance
  };

})();
