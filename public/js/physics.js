/**
 * physics.js - Retro 2D Ski Jumping Physics Engine (DSJ2 inspired)
 * Sprint 2.0: Steeper slope support, upgraded aerodynamic lift-to-drag polar curve for high glide,
 * sub-pixel takeoff edge evaluation & timing feedback, and starting gate energy scaling.
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
      this.vx = 0;
      this.vy = 0;
      this.speed = 0; // km/h
      this.pitch = 0; // jumper angle relative to horizontal (deg)
      this.inrunDistance = 0;
      this.takeoffQuality = 0; // 0 to 100%
      this.takeoffFeedback = null; // { rating: 'PERFECT'|'EARLY'|'LATE', text: string, delta: number }
      this.jumpDistance = 0; // measured along landing slope
      this.landingType = null; // 'telemark', 'two-foot', 'crash'
      this.styleScore = 0;
      this.heightAboveGround = 0;
      this.timeInPhase = 0;
      this.flightLiftRatio = 1.0;
      this.trail = []; // trajectory history for visual smoke/trail
    }

    /**
     * Sets starting gate (1-20). Alters starting position and inrun potential energy.
     */
    setGate(gateNumber) {
      this.currentGate = Math.max(1, Math.min(20, Math.round(gateNumber)));
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
      this.pitch = (Math.atan2(pts[Math.min(pts.length - 1, targetIndex + 1)].y - gatePt.y,
                               pts[Math.min(pts.length - 1, targetIndex + 1)].x - gatePt.x) * 180) / Math.PI;
    }

    /**
     * Initializes a new jump on the specified hill.
     * wind: { speed: meters/sec (0-5), angle: degrees (0=headwind, 180=tailwind) }
     */
    initJump(hill, wind) {
      this.reset();
      this.hill = hill || window.SkiHills.getHills()[0];
      if (this.hill.gates && typeof this.hill.gates.default === 'number') {
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
     * Evaluates sub-pixel timing relative to edge (x = 0).
     * Returns { quality, timingDeltaMeters, rating: 'PERFECT'|'EARLY'|'LATE' }
     */
    triggerTakeoff() {
      if (this.phase !== 'IN_RUN') return this.takeoffFeedback;

      const distToLip = -this.x; // x is <= 0 approaching edge at 0
      let quality = 0;
      let rating = 'PERFECT';
      let text = 'IDEALNIE! (+100%)';

      if (distToLip < -0.05) {
        // Late takeoff past the lip
        const lateDist = Math.abs(distToLip);
        quality = Math.max(10, 100 - lateDist * 65);
        rating = 'LATE';
        text = `SPÓŹNIONE! (+${lateDist.toFixed(2)}m)`;
      } else if (distToLip <= 0.65) {
        // Sub-pixel Perfect window right on the lip
        quality = 100 - (distToLip / 0.65) * 8;
        rating = 'PERFECT';
        text = 'PERFECT! (+100%)';
      } else if (distToLip <= 2.2) {
        // Good / slightly early
        quality = Math.max(60, 92 - (distToLip - 0.65) * 20);
        rating = 'EARLY';
        text = `DOBRZE (-${distToLip.toFixed(2)}m)`;
      } else if (distToLip <= 6.5) {
        // Noticeably early
        quality = Math.max(30, 60 - (distToLip - 2.2) * 10);
        rating = 'EARLY';
        text = `ZA WCZEŚNIE! (-${distToLip.toFixed(2)}m)`;
      } else {
        // Much too early
        quality = 20;
        rating = 'EARLY';
        text = `BARDZO ZA WCZEŚNIE! (-${distToLip.toFixed(1)}m)`;
      }

      this.takeoffQuality = Math.round(quality);
      this.takeoffFeedback = {
        rating,
        text,
        delta: Math.round(distToLip * 100) / 100,
        quality: this.takeoffQuality
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

      // Auto-launch if reaching the lip without user jump input
      if (this.x >= 0) {
        if (this.phase === 'IN_RUN') {
          // Passive runoff (no pop impulse)
          this.takeoffQuality = 30;
          this.takeoffFeedback = {
            rating: 'LATE',
            text: 'BRAK WYBICIA (SPÓŹNIONY)',
            delta: 0,
            quality: 30
          };
          this.phase = 'FLIGHT';
        }
      }
    }

    /**
     * Upgraded V-Style 2D Aerodynamic flight model (Sprint 2.0 DESIGN.md)
     * Lift coefficient C_L boosted from 1.35 to 1.75 with optimal pitch 22 deg,
     * providing genuine altitude clearance over the steeper knoll and sustained glide float.
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
      const pitchMismatch = Math.abs(this.pitch - groundAngleDeg);
      const impactVelocity = Math.abs(this.vy);

      // Check whether jumper triggered landing
      const isTelemarkInput = (inputState && inputState.telemark) || this.wantsTelemark;
      const isLandingInput = (inputState && inputState.landing) || this.wantsLanding || isTelemarkInput;

      // Crash conditions
      const isExtremeAngle = pitchMismatch > 28 || this.pitch < -40 || this.pitch > 45;
      const isExtremeImpact = impactVelocity > 15.5;

      if (isExtremeAngle || (isExtremeImpact && !isLandingInput)) {
        this.phase = 'CRASHED';
        this.landingType = 'crash';
        this.styleScore = 6.0 + Math.random() * 2.0;
      } else if (isTelemarkInput && pitchMismatch <= 18) {
        // Crisp Telemark landing!
        this.phase = 'LANDED';
        this.landingType = 'telemark';
        const bonus = Math.max(0, (18 - pitchMismatch) * 0.1);
        this.styleScore = Math.min(20.0, Math.round((18.5 + bonus) * 2) / 2);
      } else {
        // Two-footed landing
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
        landingType: this.landingType,
        styleScore: this.styleScore,
        gate: this.currentGate,
        flightLiftRatio: this.flightLiftRatio,
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
