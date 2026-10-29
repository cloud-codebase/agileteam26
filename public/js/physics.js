/**
 * SkiPhysics - Deluxe Ski Jump (DSJ) style 2D Ski Jumping Physics Engine
 * Complies with DESIGN.md contract: window.SkiPhysics
 */
(function(window) {
  'use strict';

  // Constants
  const GRAVITY = 9.81; // m/s^2
  const PI = Math.PI;

  // Hill Profile Geometry Helper
  // Profile consists of:
  // 1. In-run: from gate top (x_gate, y_gate) down to takeoff edge (0, 0)
  // 2. Takeoff table: x in [-4, 0], angle ~ 10-11 degrees
  // 3. Landing slope: starts at (0, 0) with knoll, steep hill down to K-point and HS, then outrun transition and flat outrun.
  function createHillProfile(hillConfig) {
    const kPoint = (hillConfig && hillConfig.kPoint) ? hillConfig.kPoint : 120;
    const hs = (hillConfig && hillConfig.hs) ? hillConfig.hs : Math.round(kPoint * 1.12);
    const inrunLength = (hillConfig && hillConfig.inrunLength) ? hillConfig.inrunLength : Math.round(kPoint * 0.85);
    const inrunAngleDeg = (hillConfig && hillConfig.inrunAngle) ? hillConfig.inrunAngle : 35;
    const inrunAngleRad = (inrunAngleDeg * PI) / 180;
    const takeoffAngleDeg = (hillConfig && hillConfig.takeoffAngle) ? hillConfig.takeoffAngle : 10.5;
    const takeoffAngleRad = (takeoffAngleDeg * PI) / 180;

    // In-run geometry:
    // Takeoff edge is at (0, 0).
    // Gate starts at negative x, positive y (higher up).
    // We model inrun smoothly with a straight section and a transition curve to takeoff angle.
    const inrunStartX = -inrunLength * Math.cos(inrunAngleRad);
    const inrunStartY = -inrunLength * Math.sin(inrunAngleRad); // negative y in game coordinates (upwards is negative y or positive y? Let's clarify coordinate system!)

    // Coordinate system:
    // Takeoff edge is at x = 0, y = 0.
    // Downwards is +y (standard Canvas 2D), rightwards is +x.
    // In-run is at x < 0, y < 0 (above takeoff edge).
    // Landing slope is at x > 0, y > 0 (below takeoff edge).
    return {
      kPoint,
      hs,
      inrunLength,
      inrunAngleDeg,
      inrunAngleRad,
      takeoffAngleDeg,
      takeoffAngleRad,
      // Ground elevation y(x) at any horizontal position x
      getGroundY: function(x) {
        if (x < 0) {
          // In-run track: from inrunStartX to 0
          // Curved transition into takeoff angle near x=0
          if (x < -20) {
            const t = (x - inrunStartX) / (-20 - inrunStartX);
            const yStart = -inrunLength * Math.sin(inrunAngleRad);
            const yMid = -20 * Math.tan(inrunAngleRad);
            return yStart + (yMid - yStart) * Math.max(0, Math.min(1, t));
          } else {
            // Cubic hermite curve to exit at -takeoffAngleRad slope at x = 0
            const yMid = -20 * Math.tan(inrunAngleRad);
            const t = (x + 20) / 20; // 0 at -20, 1 at 0
            const y0 = yMid;
            const y1 = 0;
            const m0 = Math.tan(inrunAngleRad);
            const m1 = Math.tan(takeoffAngleRad);
            // standard cubic spline
            const h00 = (1 + 2*t) * Math.pow(1 - t, 2);
            const h10 = t * Math.pow(1 - t, 2);
            const h01 = Math.pow(t, 2) * (3 - 2*t);
            const h11 = Math.pow(t, 2) * (t - 1);
            return h00 * y0 + h10 * 20 * m0 + h01 * y1 + h11 * 20 * m1;
          }
        }

        // Landing Hill (x >= 0):
        // DSJ style FIS profile approximation:
        // Knoll: x in [0, 0.25*K], slope increases from ~15 deg to ~35 deg.
        // Landing zone: x around K-point (slope ~ 35 - 38 deg).
        // Outrun transition: x in [1.15*K, 1.45*K], slope flattens to 0.
        // Outrun flat: x > 1.45*K, slope = 0.
        const kScale = kPoint;
        const knollX = kScale * 0.28;
        const hsX = hs * 0.88;
        const outrunStartX = hsX + 25;
        const outrunEndX = outrunStartX + 45;

        if (x <= knollX) {
          // Circular knoll curve drop
          const t = x / knollX;
          // slope starts around 0.18, grows to 0.65
          return 0.15 * x + 0.5 * (x * x) / knollX;
        } else if (x <= outrunStartX) {
          // Steep landing slope zone
          const yKnoll = 0.15 * knollX + 0.5 * knollX;
          const dx = x - knollX;
          // slight concave circular arc typical of FIS landing profiles
          const slope = 0.68; // ~34.2 degrees
          return yKnoll + dx * slope + 0.0007 * dx * dx;
        } else if (x <= outrunEndX) {
          // Decelerating circular transition to flat outrun
          const yKnoll = 0.15 * knollX + 0.5 * knollX;
          const dxHS = outrunStartX - knollX;
          const yAtOutrunStart = yKnoll + dxHS * 0.68 + 0.0007 * dxHS * dxHS;
          const slopeAtStart = 0.68 + 2 * 0.0007 * dxHS;

          const t = (x - outrunStartX) / (outrunEndX - outrunStartX);
          // Ease-out transition to flat (slope -> 0)
          const drop = slopeAtStart * (outrunEndX - outrunStartX) * 0.5;
          return yAtOutrunStart + drop * (1 - Math.pow(1 - t, 2));
        } else {
          // Flat outrun
          const yKnoll = 0.15 * knollX + 0.5 * knollX;
          const dxHS = outrunStartX - knollX;
          const yAtOutrunStart = yKnoll + dxHS * 0.68 + 0.0007 * dxHS * dxHS;
          const slopeAtStart = 0.68 + 2 * 0.0007 * dxHS;
          const totalDrop = slopeAtStart * (outrunEndX - outrunStartX) * 0.5;
          return yAtOutrunStart + totalDrop;
        }
      },

      // Ground normal and slope angle at x
      getGroundSlopeAngle: function(x) {
        const delta = 0.2;
        const y1 = this.getGroundY(x - delta);
        const y2 = this.getGroundY(x + delta);
        return Math.atan2(y2 - y1, 2 * delta);
      }
    };
  }

  // Physics Engine Object
  const SkiPhysics = {
    // Current state variables
    state: 'GATE', // 'GATE' | 'INRUN' | 'TAKEOFF' | 'FLIGHT' | 'LANDING' | 'FALL' | 'STOPPED'
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0, // body/ski pitch angle in radians (relative to horizontal)
    angularVelocity: 0,
    takeoffPrecision: 0, // 0 to 1 precision score
    distanceMeters: 0,
    isCrashed: false,
    telemarkSuccess: false,
    styleJudges: [18.0, 18.0, 18.0, 18.0, 18.0],
    stylePoints: 54.0,
    totalPoints: 0,
    timeInFlight: 0,
    maxHeight: 0,
    inrunSpeedKmH: 0,
    hill: null,
    jumperConfig: null,

    // Initialise a new jump
    initJump: function(hillConfig, jumperConfig) {
      this.hill = createHillProfile(hillConfig || {});
      this.jumperConfig = jumperConfig || { skill: 95, name: 'Adam Małysz' };

      this.state = 'GATE';
      const inrunLen = this.hill.inrunLength;
      const angleRad = this.hill.inrunAngleRad;

      // Position jumper at top gate
      this.x = -inrunLen * Math.cos(angleRad);
      this.y = this.hill.getGroundY(this.x) - 1.2; // 1.2m skier height center
      this.vx = 0;
      this.vy = 0;
      this.angle = angleRad; // aligned with in-run slope
      this.angularVelocity = 0;
      this.takeoffPrecision = 0;
      this.distanceMeters = 0;
      this.isCrashed = false;
      this.telemarkSuccess = false;
      this.styleJudges = [18.0, 18.0, 18.0, 18.0, 18.0];
      this.stylePoints = 54.0;
      this.totalPoints = 0;
      this.timeInFlight = 0;
      this.maxHeight = 0;
      this.inrunSpeedKmH = 0;

      return this.getState();
    },

    // Start descent from gate down in-run
    startInrun: function() {
      if (this.state === 'GATE') {
        this.state = 'INRUN';
        this.vx = 1.0; // initial nudge
        this.vy = 0.5;
      }
    },

    // Takeoff trigger (called by player button / spacebar / click)
    triggerTakeoff: function() {
      if (this.state !== 'INRUN') return null;

      // Takeoff window is near x = 0 (takeoff edge)
      // Ideal takeoff is exactly at x in [-2.0, 0.0]
      const distToEdge = -this.x; // positive meters before edge
      let precision = 0;

      if (distToEdge <= 0) {
        // Late takeoff (after edge!) - penalty
        precision = Math.max(0.1, 1.0 - Math.abs(distToEdge) * 0.4);
      } else if (distToEdge <= 2.2) {
        // Sweet spot (0 to 2.2 meters before edge)
        precision = 1.0 - (distToEdge / 2.2) * 0.25;
      } else if (distToEdge <= 8.0) {
        // Early takeoff
        precision = Math.max(0.2, 1.0 - (distToEdge / 8.0) * 0.7);
      } else {
        // Very early
        precision = 0.2;
      }

      // Factor jumper skill slightly into impulse (skill 80-100)
      const skillMod = ((this.jumperConfig.skill || 90) / 100);
      this.takeoffPrecision = Math.min(1.0, precision * (0.85 + 0.15 * skillMod));

      // Vertical impulse perpendicular to takeoff table
      const takeoffAngle = this.hill.takeoffAngleRad;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const impulseMag = (2.2 + 1.2 * this.takeoffPrecision); // m/s vertical boost

      // Jump direction: along table plus upwards impulse
      this.vx = speed * Math.cos(takeoffAngle);
      this.vy = speed * Math.sin(takeoffAngle) - impulseMag; // minus y is upwards!

      // Initial ski flight angle (~22-26 degrees for good V-style lift)
      this.angle = 0.38;
      this.state = 'FLIGHT';

      return {
        precision: this.takeoffPrecision,
        speedKmH: speed * 3.6,
        distanceToEdge: distToEdge
      };
    },

    // Landing trigger (called by player pressing land button)
    triggerLanding: function(telemarkRequested) {
      if (this.state !== 'FLIGHT') return null;

      const groundY = this.hill.getGroundY(this.x);
      const heightAboveGround = groundY - this.y;
      const slopeAngle = this.hill.getGroundSlopeAngle(this.x);

      // Skier pitch relative to slope
      const angleDiff = Math.abs(this.angle - slopeAngle);

      // Check height timing: ideal landing is initiated within 0.3m - 2.5m above ground
      const isGoodHeight = (heightAboveGround >= -0.2 && heightAboveGround <= 3.5);
      const isGoodPitch = (angleDiff < 0.28); // pitch aligned within ~16 deg of slope

      if (isGoodHeight && isGoodPitch) {
        if (telemarkRequested) {
          // Successful Telemark landing!
          this.telemarkSuccess = true;
          this.state = 'LANDING';
        } else {
          // Two-feet landing (safe, but lower style points)
          this.telemarkSuccess = false;
          this.state = 'LANDING';
        }
      } else if (heightAboveGround > 3.5) {
        // Initiated landing too early while high in the air
        // Skier stalls and drops awkwardly
        this.angle += 0.2;
        this.state = 'LANDING';
        this.telemarkSuccess = false;
      } else {
        // Crash landing!
        this.isCrashed = true;
        this.state = 'FALL';
      }

      this._calculatePoints();
      return {
        telemark: this.telemarkSuccess,
        crashed: this.isCrashed,
        stylePoints: this.stylePoints
      };
    },

    // Main update step (called at 60 FPS or with variable dt)
    update: function(dt, inputState, wind) {
      if (!this.hill) return this.getState();

      // Clamp dt to avoid physics explosions
      const step = Math.min(dt || 1 / 60, 0.05);

      const windX = (wind && typeof wind.x === 'number') ? wind.x : 0;
      const windY = (wind && typeof wind.y === 'number') ? wind.y : 0;
      const input = inputState || { pitchUp: false, pitchDown: false, leanForward: false, leanBack: false };

      switch (this.state) {
        case 'GATE':
          // Awaiting start signal
          this.vx = 0;
          this.vy = 0;
          break;

        case 'INRUN':
          this._updateInrun(step);
          break;

        case 'FLIGHT':
          this._updateFlight(step, input, windX, windY);
          break;

        case 'LANDING':
          this._updateLanding(step);
          break;

        case 'FALL':
          this._updateFall(step);
          break;

        case 'STOPPED':
          // Terminal resting state on outrun
          this.vx = 0;
          this.vy = 0;
          break;
      }

      return this.getState();
    },

    // Internal In-Run acceleration
    _updateInrun: function(dt) {
      const slopeAngle = this.hill.inrunAngleRad;
      const friction = 0.025; // low snow/ice track friction

      // Acceleration along slope = g * (sin(theta) - friction * cos(theta))
      const accel = GRAVITY * (Math.sin(slopeAngle) - friction * Math.cos(slopeAngle));
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) + accel * dt;

      // Update position along hill track
      this.x += speed * Math.cos(slopeAngle) * dt;
      this.y = this.hill.getGroundY(this.x) - 0.8; // Skier crouched on in-run track

      this.vx = speed * Math.cos(slopeAngle);
      this.vy = speed * Math.sin(slopeAngle);
      this.angle = this.hill.getGroundSlopeAngle(this.x);
      this.inrunSpeedKmH = speed * 3.6;

      // Automatic takeoff if skier reaches end of table without jumping (late falloff)
      if (this.x >= 0.1) {
        this.triggerTakeoff(); // auto trigger with penalty
      }
    },

    // Internal Flight Aerodynamics (DSJ V-Style Physics)
    _updateFlight: function(dt, input, windX, windY) {
      this.timeInFlight += dt;

      // Aerodynamic pitch controls (Space / Arrow keys / Touch lean)
      if (input.pitchUp || input.leanBack) {
        this.angularVelocity -= 1.6 * dt;
      } else if (input.pitchDown || input.leanForward) {
        this.angularVelocity += 1.6 * dt;
      } else {
        // Natural aerodynamic stabilization toward optimal flight angle (~0.4 rad / 23 deg)
        const targetAngle = 0.40;
        this.angularVelocity += (targetAngle - this.angle) * 1.8 * dt;
        this.angularVelocity *= 0.94; // damping
      }

      // Clamp angular velocity & angle
      this.angularVelocity = Math.max(-2.5, Math.min(2.5, this.angularVelocity));
      this.angle += this.angularVelocity * dt;
      this.angle = Math.max(-0.2, Math.min(1.2, this.angle)); // limit somersaults

      // Relative airspeed accounting for wind
      const relVx = this.vx - windX;
      const relVy = this.vy - windY;
      const airspeed = Math.sqrt(relVx * relVx + relVy * relVy);
      const flightPathAngle = Math.atan2(relVy, relVx);

      // Angle of Attack (alpha) = pitch angle - velocity angle
      const alpha = this.angle - flightPathAngle;

      // DSJ Lift and Drag Coefficients based on Alpha
      // Optimal alpha is around 18-24 degrees (0.31 - 0.42 rad) for maximum Lift/Drag ratio
      let liftCoeff = 0;
      let dragCoeff = 0.35; // base form drag

      if (alpha > 0 && alpha < 0.7) {
        liftCoeff = Math.sin(2 * alpha) * 1.45;
        dragCoeff = 0.28 + 0.9 * Math.pow(Math.sin(alpha), 2);
      } else if (alpha >= 0.7) {
        // Aerodynamic stall
        liftCoeff = 0.3;
        dragCoeff = 1.3;
      } else {
        // Diving down negative alpha
        liftCoeff = -0.2;
        dragCoeff = 0.4;
      }

      // Ground Effect: Lift increases when flying close (< 3.0 meters) to the hill profile
      const groundY = this.hill.getGroundY(this.x);
      const height = Math.max(0.1, groundY - this.y);
      if (height < 4.0) {
        const groundEffectFactor = 1.0 + (1.2 * (4.0 - height) / 4.0);
        liftCoeff *= groundEffectFactor;
      }

      // Aerodynamic forces
      const airDensity = 1.225; // kg/m^3
      const wingArea = 0.82; // skier + skis cross-sectional area
      const dynamicPressure = 0.5 * airDensity * (airspeed * airspeed);

      const liftForce = liftCoeff * dynamicPressure * wingArea;
      const dragForce = dragCoeff * dynamicPressure * wingArea;
      const skierMass = 64; // kg

      // Acceleration vectors (drag opposes airspeed vector, lift is perpendicular upward)
      const cosTheta = Math.cos(flightPathAngle);
      const sinTheta = Math.sin(flightPathAngle);

      const axDrag = -(dragForce / skierMass) * cosTheta;
      const ayDrag = -(dragForce / skierMass) * sinTheta;

      const axLift = -(liftForce / skierMass) * sinTheta;
      const ayLift = -(liftForce / skierMass) * cosTheta; // note: negative y is upward

      const ax = axDrag + axLift;
      const ay = ayDrag + ayLift + GRAVITY;

      // Integrate velocities
      this.vx += ax * dt;
      this.vy += ay * dt;

      // Integrate positions
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Compute current distance along hill
      // DSJ distance: distance from takeoff edge along the hill curve
      this.distanceMeters = Math.max(0, Math.round((this.x * 1.14) * 10) / 10);

      // Check ground collision / touch down
      if (this.y >= groundY) {
        this.y = groundY;
        // Jumper touched ground!
        this._handleTouchdown();
      }
    },

    // Touchdown resolution
    _handleTouchdown: function() {
      const slopeAngle = this.hill.getGroundSlopeAngle(this.x);
      const landingVelocityY = this.vy;
      const pitchDiff = Math.abs(this.angle - slopeAngle);

      // Severe crash conditions:
      // High downward impact or severe pitch mismatch or already crashed
      if (this.isCrashed || landingVelocityY > 8.5 || pitchDiff > 0.45) {
        this.isCrashed = true;
        this.state = 'FALL';
      } else {
        // Survived landing!
        if (this.state !== 'LANDING') {
          // Skier landed without pressing land key (two-feet landing)
          this.state = 'LANDING';
          this.telemarkSuccess = false;
        }
      }

      this._calculatePoints();
    },

    // Skier rolling out after landing
    _updateLanding: function(dt) {
      const slopeAngle = this.hill.getGroundSlopeAngle(this.x);
      const friction = 0.12; // decelerating on landing slope / outrun

      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const newSpeed = Math.max(0, speed - (GRAVITY * friction + 0.5 * speed) * dt);

      this.x += newSpeed * Math.cos(slopeAngle) * dt;
      this.y = this.hill.getGroundY(this.x);
      this.vx = newSpeed * Math.cos(slopeAngle);
      this.vy = newSpeed * Math.sin(slopeAngle);
      this.angle = slopeAngle;

      if (newSpeed < 0.5) {
        this.state = 'STOPPED';
      }
    },

    // Skier tumbling down hill after a crash
    _updateFall: function(dt) {
      const slopeAngle = this.hill.getGroundSlopeAngle(this.x);
      const friction = 0.28; // rolling tumble friction

      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const newSpeed = Math.max(0, speed - (GRAVITY * friction + 0.8 * speed) * dt);

      this.x += newSpeed * Math.cos(slopeAngle) * dt;
      this.y = this.hill.getGroundY(this.x);
      this.vx = newSpeed * Math.cos(slopeAngle);
      this.vy = newSpeed * Math.sin(slopeAngle);
      this.angle += 7.0 * dt; // tumbling rotation

      if (newSpeed < 0.3) {
        this.state = 'STOPPED';
      }
    },

    // FIS Official Style and Distance Points Calculation
    _calculatePoints: function() {
      const kPoint = this.hill.kPoint;
      const dist = this.distanceMeters;

      // Distance points: 60 points for K-point, +/- 1.8 (large hill) or 2.0 (normal hill) pts per meter
      const meterValue = kPoint >= 110 ? 1.8 : 2.0;
      const distancePts = Math.round((60.0 + (dist - kPoint) * meterValue) * 10) / 10;

      // Style points: 5 judges give 10.0 - 20.0
      // Drop lowest and highest, sum the middle 3
      let baseStyle = 18.0;
      if (this.isCrashed) {
        baseStyle = 10.5; // heavy fall penalty
      } else if (this.telemarkSuccess) {
        baseStyle = 19.0 + (this.takeoffPrecision > 0.85 ? 0.5 : 0.0);
      } else {
        baseStyle = 16.5; // two-feet landing
      }

      // Individual judge variations (-0.5 to +0.5)
      this.styleJudges = [
        Math.min(20, Math.max(10, Math.round((baseStyle + (Math.random() * 1.0 - 0.5)) * 2) / 2)),
        Math.min(20, Math.max(10, Math.round((baseStyle + (Math.random() * 1.0 - 0.5)) * 2) / 2)),
        Math.min(20, Math.max(10, Math.round((baseStyle + (Math.random() * 1.0 - 0.5)) * 2) / 2)),
        Math.min(20, Math.max(10, Math.round((baseStyle + (Math.random() * 1.0 - 0.5)) * 2) / 2)),
        Math.min(20, Math.max(10, Math.round((baseStyle + (Math.random() * 1.0 - 0.5)) * 2) / 2))
      ];

      // Sort and drop min & max
      const sorted = [...this.styleJudges].sort((a, b) => a - b);
      this.stylePoints = Math.round((sorted[1] + sorted[2] + sorted[3]) * 10) / 10;

      // Total points
      this.totalPoints = Math.max(0, Math.round((distancePts + this.stylePoints) * 10) / 10);
    },

    // Return complete snapshot of physics state
    getState: function() {
      const groundY = this.hill ? this.hill.getGroundY(this.x) : 0;
      return {
        state: this.state,
        phase: this.state, // backward compatibility with DESIGN.md
        x: this.x,
        y: this.y,
        vx: this.vx,
        vy: this.vy,
        angle: this.angle,
        distanceMeters: this.distanceMeters,
        heightAboveGround: groundY - this.y,
        isCrashed: this.isCrashed,
        telemarkSuccess: this.telemarkSuccess,
        takeoffPrecision: this.takeoffPrecision,
        speedKmH: Math.round(Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 3.6 * 10) / 10,
        inrunSpeedKmH: Math.round(this.inrunSpeedKmH * 10) / 10,
        styleJudges: this.styleJudges,
        stylePoints: this.stylePoints,
        totalPoints: this.totalPoints,
        points: this.totalPoints // DESIGN.md compatibility
      };
    }
  };

  // Export to global scope
  window.SkiPhysics = SkiPhysics;

})(typeof window !== 'undefined' ? window : this);
