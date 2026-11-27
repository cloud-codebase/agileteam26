/**
 * Retro Drift Race - Vehicle Handling, Slip Angle & Drift Physics Simulation
 * SCRUM-201: public/js/physics.js
 * Author: Porthos (Senior Full-Stack Developer)
 */

(function (window) {
  'use strict';

  // Constants & Physics Tuning Parameters
  const DEFAULTS = {
    // Initial position & orientation
    startX: 0,
    startY: 0,
    startAngle: 0, // radians, 0 = facing right along X axis

    // Vehicle dimensions (in world units/pixels)
    carLength: 48,
    carWidth: 24,

    // Kinematics & Limits
    maxSpeed: 680,           // Max forward speed in pixels/sec
    maxReverseSpeed: 200,    // Max reverse speed in pixels/sec
    acceleration: 460,       // Engine acceleration rate (px/s^2)
    reverseAcceleration: 240,// Reverse engine acceleration (px/s^2)
    brakingDecel: 700,       // Foot brake deceleration (px/s^2)
    naturalFriction: 140,    // Rolling resistance / drag (px/s^2)

    // Steering
    maxSteerAngle: 0.58,     // Maximum front wheel steer angle (~33 degrees)
    steerSpeed: 3.8,         // Speed at which wheels turn towards input (rad/s)
    steerReturnSpeed: 5.2,   // Speed at which wheels return to center (rad/s)
    turnRateFactor: 2.2,     // Angular velocity multiplier based on speed & steering

    // Drift & Slip Angle Physics
    driftThresholdAngle: 0.18, // Radian threshold (~10.3 deg) above which drift is registered
    minSpeedForDrift: 120,     // Minimum speed required to register an active drift
    lateralGripNormal: 9.5,    // Lateral grip coefficient when not sliding (high grip)
    lateralGripSlide: 2.6,     // Lateral grip coefficient during sustained drift
    handbrakeLateralGrip: 1.2, // Ultra low lateral grip with handbrake pulled
    driftInertia: 0.94,        // Velocity heading preservation factor when sliding

    // Off-track / collision penalties
    offroadDragFactor: 2.4,
    bounceRestitution: 0.45
  };

  class VehiclePhysics {
    constructor(config = {}) {
      this.config = Object.assign({}, DEFAULTS, config);

      // Vehicle State
      this.x = this.config.startX;
      this.y = this.config.startY;
      this.angle = this.config.startAngle; // Heading orientation in radians
      this.speed = 0;                     // Linear speed along velocity vector
      this.vx = 0;                        // World velocity X (px/s)
      this.vy = 0;                        // World velocity Y (px/s)
      this.steerAngle = 0;                // Current front wheel steer angle (radians)
      this.angularVelocity = 0;           // Turn rate (rad/s)

      // Drift State
      this.slipAngle = 0;                 // Signed slip angle in radians (-PI to PI)
      this.slipAngleDegrees = 0;          // Absolute slip angle in degrees for HUD
      this.isDrifting = false;            // Boolean drift state flag
      this.driftIntensity = 0;            // 0.0 to 1.0 intensity (slip * speed factor)
      this.driftDirection = 0;            // -1 (left), 1 (right), 0 (none)

      // Controls & Input State
      this.inputs = {
        throttle: false,
        brake: false,
        steerLeft: false,
        steerRight: false,
        handbrake: false
      };

      // Keyboard event bindings
      this._boundKeyDown = this._onKeyDown.bind(this);
      this._boundKeyUp = this._onKeyUp.bind(this);
      this._initialized = false;
    }

    /**
     * Initialize input listeners and reset vehicle state
     */
    init(options = {}) {
      if (options.startX !== undefined) this.config.startX = options.startX;
      if (options.startY !== undefined) this.config.startY = options.startY;
      if (options.startAngle !== undefined) this.config.startAngle = options.startAngle;

      this.reset(this.config.startX, this.config.startY, this.config.startAngle);

      if (!this._initialized && typeof window !== 'undefined') {
        window.addEventListener('keydown', this._boundKeyDown);
        window.addEventListener('keyup', this._boundKeyUp);
        this._initialized = true;
      }

      return this;
    }

    /**
     * Clean up event listeners if needed
     */
    destroy() {
      if (this._initialized && typeof window !== 'undefined') {
        window.removeEventListener('keydown', this._boundKeyDown);
        window.removeEventListener('keyup', this._boundKeyUp);
        this._initialized = false;
      }
    }

    /**
     * Reset vehicle to specific position, angle, and zero velocity
     */
    reset(x = this.config.startX, y = this.config.startY, angle = this.config.startAngle) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.speed = 0;
      this.vx = 0;
      this.vy = 0;
      this.steerAngle = 0;
      this.angularVelocity = 0;
      this.slipAngle = 0;
      this.slipAngleDegrees = 0;
      this.isDrifting = false;
      this.driftIntensity = 0;
      this.driftDirection = 0;
      this.inputs = {
        throttle: false,
        brake: false,
        steerLeft: false,
        steerRight: false,
        handbrake: false
      };
    }

    /**
     * Set input manually (supports touch, gamepads, or external bots)
     */
    setInputState(inputState = {}) {
      Object.assign(this.inputs, inputState);
    }

    /**
     * Keyboard handler for arrow keys, WASD, and Spacebar
     */
    _onKeyDown(e) {
      // Prevent default scrolling on game navigation keys
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'];
      if (keys.includes(e.code) || keys.includes(e.key)) {
        if (e.target === document.body || e.target === document.documentElement) {
          e.preventDefault();
        }
      }

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.inputs.throttle = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.inputs.brake = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.inputs.steerLeft = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.inputs.steerRight = true;
          break;
        case 'Space':
          this.inputs.handbrake = true;
          break;
      }
    }

    _onKeyUp(e) {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.inputs.throttle = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.inputs.brake = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.inputs.steerLeft = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.inputs.steerRight = false;
          break;
        case 'Space':
          this.inputs.handbrake = false;
          break;
      }
    }

    /**
     * Update vehicle kinematics, steering dynamics, slip angle, and integration
     * @param {number} dt Delta time in seconds (clamped to prevent tunnel spikes)
     * @param {Object} [overrideInputs] Optional manual input override
     */
    update(dt, overrideInputs = null) {
      if (dt <= 0) return this.getState();
      const delta = Math.min(dt, 0.1); // Clamp to max 100ms frame time

      const inp = overrideInputs || this.inputs;

      // 1. Steering dynamics (gradual steering rack response)
      let targetSteer = 0;
      if (inp.steerLeft && !inp.steerRight) {
        targetSteer = -this.config.maxSteerAngle;
      } else if (inp.steerRight && !inp.steerLeft) {
        targetSteer = this.config.maxSteerAngle;
      }

      if (targetSteer !== 0) {
        const steerDir = Math.sign(targetSteer - this.steerAngle);
        this.steerAngle += steerDir * this.config.steerSpeed * delta;
        if ((steerDir > 0 && this.steerAngle > targetSteer) || (steerDir < 0 && this.steerAngle < targetSteer)) {
          this.steerAngle = targetSteer;
        }
      } else {
        // Return to center
        const returnDir = -Math.sign(this.steerAngle);
        const returnAmount = this.config.steerReturnSpeed * delta;
        if (Math.abs(this.steerAngle) <= returnAmount) {
          this.steerAngle = 0;
        } else {
          this.steerAngle += returnDir * returnAmount;
        }
      }

      // 2. Unit vectors for car orientation
      // Forward heading vector (hX, hY)
      const hX = Math.cos(this.angle);
      const hY = Math.sin(this.angle);
      // Right normal vector (rX, rY)
      const rX = -hY;
      const rY = hX;

      // 3. Project world velocity onto car frame: longitudinal (forward) & lateral (sideways)
      let forwardVelocity = this.vx * hX + this.vy * hY;
      let lateralVelocity = this.vx * rX + this.vy * rY;

      // 4. Longitudinal acceleration / braking / friction
      if (inp.throttle) {
        if (forwardVelocity >= -20) {
          forwardVelocity += this.config.acceleration * delta;
          if (forwardVelocity > this.config.maxSpeed) {
            forwardVelocity = this.config.maxSpeed;
          }
        } else {
          // Braking while going backwards
          forwardVelocity += this.config.brakingDecel * delta;
        }
      } else if (inp.brake) {
        if (forwardVelocity > 20) {
          forwardVelocity -= this.config.brakingDecel * delta;
          if (forwardVelocity < 0) forwardVelocity = 0;
        } else {
          // Reverse
          forwardVelocity -= this.config.reverseAcceleration * delta;
          if (forwardVelocity < -this.config.maxReverseSpeed) {
            forwardVelocity = -this.config.maxReverseSpeed;
          }
        }
      } else {
        // Natural rolling resistance
        if (forwardVelocity > 0) {
          forwardVelocity -= this.config.naturalFriction * delta;
          if (forwardVelocity < 0) forwardVelocity = 0;
        } else if (forwardVelocity < 0) {
          forwardVelocity += this.config.naturalFriction * delta;
          if (forwardVelocity > 0) forwardVelocity = 0;
        }
      }

      // Handbrake effect on forward velocity
      if (inp.handbrake) {
        forwardVelocity *= Math.pow(0.85, delta * 60);
      }

      // 5. Lateral Grip & Slip Dynamics
      // Handbrake sharply drops lateral grip to break traction into a slide
      let gripCoeff = this.config.lateralGripNormal;
      if (inp.handbrake) {
        gripCoeff = this.config.handbrakeLateralGrip;
      } else if (Math.abs(lateralVelocity) > 70) {
        gripCoeff = this.config.lateralGripSlide;
      }

      // Lateral friction damping (tires resist sliding sideways)
      lateralVelocity *= Math.exp(-gripCoeff * delta);

      // 6. Angular rotation based on steering and forward movement
      // Turning is proportional to forward velocity with weight transfer boost during drifts
      const speedNorm = Math.min(Math.abs(forwardVelocity) / 300, 1.0);
      const driftTurnBonus = (inp.handbrake || this.isDrifting) ? 1.45 : 1.0;
      this.angularVelocity = this.steerAngle * this.config.turnRateFactor * speedNorm * driftTurnBonus;
      
      // Reverse steering inversion
      if (forwardVelocity < -10) {
        this.angularVelocity = -this.angularVelocity;
      }

      this.angle += this.angularVelocity * delta;

      // Keep angle normalized between -PI and PI
      while (this.angle > Math.PI) this.angle -= Math.PI * 2;
      while (this.angle < -Math.PI) this.angle += Math.PI * 2;

      // 7. Recompute world velocity from updated car coordinate frame
      const updatedHX = Math.cos(this.angle);
      const updatedHY = Math.sin(this.angle);
      const updatedRX = -updatedHY;
      const updatedRY = updatedHX;

      this.vx = updatedHX * forwardVelocity + updatedRX * lateralVelocity;
      this.vy = updatedHY * forwardVelocity + updatedRY * lateralVelocity;

      this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

      // 8. Integrate position
      this.x += this.vx * delta;
      this.y += this.vy * delta;

      // 9. Slip Angle Calculation & Drift State Detection
      // Slip angle is the difference between vehicle heading and the actual velocity vector
      if (this.speed > 15) {
        const velocityAngle = Math.atan2(this.vy, this.vx);
        let diff = velocityAngle - this.angle;

        // Normalize diff to [-PI, PI]
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        this.slipAngle = diff;
        this.slipAngleDegrees = Math.abs(diff) * (180 / Math.PI);
        this.driftDirection = diff > 0 ? 1 : (diff < 0 ? -1 : 0);
      } else {
        this.slipAngle = 0;
        this.slipAngleDegrees = 0;
        this.driftDirection = 0;
      }

      // Drift is active if slip angle exceeds threshold and vehicle has adequate speed
      const hasDriftAngle = Math.abs(this.slipAngle) >= this.config.driftThresholdAngle;
      const hasDriftSpeed = this.speed >= this.config.minSpeedForDrift;
      this.isDrifting = (hasDriftAngle && hasDriftSpeed) || (inp.handbrake && this.speed >= 80);

      // Drift intensity normalized 0 to 1
      if (this.isDrifting) {
        const angleFactor = Math.min(Math.abs(this.slipAngle) / (Math.PI / 2.5), 1.0);
        const speedFactor = Math.min(this.speed / this.config.maxSpeed, 1.0);
        this.driftIntensity = Math.min(angleFactor * 0.7 + speedFactor * 0.3, 1.0);
      } else {
        this.driftIntensity = Math.max(0, this.driftIntensity - delta * 3.0);
      }

      return this.getState();
    }

    /**
     * Apply an external impulse (e.g., wall collision, track barrier bounce)
     */
    applyImpulse(bounceX, bounceY, restitution = this.config.bounceRestitution) {
      this.vx = bounceX * restitution;
      this.vy = bounceY * restitution;
      this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    /**
     * Apply grass / offroad drag penalty
     */
    applyOffroadPenalty(delta) {
      const drag = Math.exp(-this.config.offroadDragFactor * delta);
      this.vx *= drag;
      this.vy *= drag;
      this.speed *= drag;
    }

    /**
     * Export full state snapshot strictly adhering to DESIGN.md
     */
    getState() {
      // Calculate gear based on speed ratio
      const speedRatio = Math.min(this.speed / this.config.maxSpeed, 1.0);
      let gear = 'N';
      if (this.speed < 5 && !this.inputs.throttle && !this.inputs.brake) {
        gear = 'N';
      } else if (this.inputs.brake && this.speed < 20) {
        gear = 'R';
      } else if (speedRatio < 0.22) {
        gear = '1';
      } else if (speedRatio < 0.45) {
        gear = '2';
      } else if (speedRatio < 0.70) {
        gear = '3';
      } else if (speedRatio < 0.90) {
        gear = '4';
      } else {
        gear = '5';
      }

      return {
        x: this.x,
        y: this.y,
        angle: this.angle,
        speed: this.speed,
        speedKph: Math.round((this.speed / this.config.maxSpeed) * 220),
        gear: gear,
        vx: this.vx,
        vy: this.vy,
        steerAngle: this.steerAngle,
        slipAngle: this.slipAngle,
        slipAngleDegrees: Math.round(this.slipAngleDegrees),
        isDrifting: this.isDrifting,
        driftIntensity: this.driftIntensity,
        driftDirection: this.driftDirection,
        handbrake: !!this.inputs.handbrake,
        throttle: !!this.inputs.throttle,
        brake: !!this.inputs.brake,
        carLength: this.config.carLength,
        carWidth: this.config.carWidth
      };
    }
  }

  // Expose singleton/factory interface on window.VehiclePhysics
  window.VehiclePhysics = {
    _instance: null,

    /**
     * Initialize vehicle physics instance
     */
    init: function (config) {
      if (!this._instance) {
        this._instance = new VehiclePhysics(config);
      }
      return this._instance.init(config);
    },

    /**
     * Update vehicle physics with time delta and optional manual inputs
     */
    update: function (dt, inputState) {
      if (!this._instance) {
        this.init();
      }
      return this._instance.update(dt, inputState);
    },

    /**
     * Get snapshot of current vehicle state
     */
    getState: function () {
      if (!this._instance) {
        this.init();
      }
      return this._instance.getState();
    },

    /**
     * Reset vehicle to initial or custom state
     */
    reset: function (x, y, angle) {
      if (!this._instance) {
        this.init();
      }
      this._instance.reset(x, y, angle);
      return this.getState();
    },

    /**
     * Set input state programmatically (useful for touch controls or AI)
     */
    setInputState: function (inputs) {
      if (!this._instance) {
        this.init();
      }
      this._instance.setInputState(inputs);
    },

    /**
     * Apply external impulse or collision response
     */
    applyImpulse: function (bx, by, restitution) {
      if (this._instance) {
        this._instance.applyImpulse(bx, by, restitution);
      }
    },

    /**
     * Apply off-road slowdown penalty
     */
    applyOffroadPenalty: function (dt) {
      if (this._instance) {
        this._instance.applyOffroadPenalty(dt);
      }
    },

    /**
     * Access underlying class constructor
     */
    VehiclePhysicsClass: VehiclePhysics
  };

})(typeof window !== 'undefined' ? window : globalThis);
