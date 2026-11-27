/**
 * Fencer Class & Two-Player Input Controller
 * Implements fencer kinematics, state machine, guard stances (Zasłona wysoka & niska),
 * thrust mechanics, blade segment geometry, and rendering.
 *
 * Conforms strictly to DESIGN.md interface contracts:
 * - Constructor: new Fencer({ id: 1|2, x, color, facing: 1|-1 })
 * - Methods: update(keys, bounds), draw(ctx), thrust(), setGuard(type), getBladeSegment(), getBodyHitbox()
 * - Stances: 'neutral', 'zaslona_high', 'zaslona_low'
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Fencer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // State constants
  const STATES = {
    IDLE: 'idle',
    ADVANCE: 'advance',
    RETREAT: 'retreat',
    THRUSTING: 'thrusting',
    RECOVERY: 'recovery',
    PARRIED: 'parried',
    HIT: 'hit'
  };

  const GUARDS = {
    NEUTRAL: 'neutral',
    ZASLONA_HIGH: 'zaslona_high',
    ZASLONA_LOW: 'zaslona_low'
  };

  // Dimensions & physics constants on 960x400 canvas
  const FLOOR_Y = 320;
  const FENCER_HEIGHT = 110;
  const FENCER_WIDTH = 36;
  const WALK_SPEED = 210; // pixels per second
  const LUNGE_SPEED = 340; // forward burst during thrust
  const BLADE_LENGTH_REST = 62;
  const BLADE_LENGTH_THRUST = 88;

  class Fencer {
    /**
     * @param {Object} options
     * @param {number} options.id - 1 or 2
     * @param {number} options.x - starting horizontal position
     * @param {string} [options.color] - theme color (e.g. '#2563eb' for P1, '#dc2626' for P2)
     * @param {number} [options.facing] - 1 (facing right) or -1 (facing left)
     */
    constructor(options = {}) {
      this.id = options.id || 1;
      this.x = options.x !== undefined ? options.x : (this.id === 1 ? 220 : 740);
      this.y = FLOOR_Y;
      this.color = options.color || (this.id === 1 ? '#3b82f6' : '#ef4444');
      this.facing = options.facing !== undefined ? options.facing : (this.id === 1 ? 1 : -1);

      // State machine
      this.state = STATES.IDLE;
      this.guard = GUARDS.NEUTRAL;

      // Kinematics
      this.vx = 0;
      this.width = FENCER_WIDTH;
      this.height = FENCER_HEIGHT;

      // Timers & animations
      this.stateTimer = 0;
      this.thrustDuration = 0.28; // seconds
      this.recoveryDuration = 0.22;
      this.parriedDuration = 0.45;
      this.hitDuration = 0.6;
      this.animTick = 0;

      // Blade properties
      this.bladeProgress = 0; // 0 (rest) to 1 (full extension)
      this.bladeAngle = 0; // radians relative to horizontal

      // Stats & feedback
      this.score = 0;
      this.isHitStunned = false;
      this.touchFeedback = 0; // visual touch indicator timer
    }

    /**
     * Reset fencer to on-guard line
     * @param {number} startX
     */
    resetPosition(startX) {
      this.x = startX !== undefined ? startX : (this.id === 1 ? 220 : 740);
      this.y = FLOOR_Y;
      this.vx = 0;
      this.state = STATES.IDLE;
      this.guard = GUARDS.NEUTRAL;
      this.stateTimer = 0;
      this.bladeProgress = 0;
      this.isHitStunned = false;
      this.touchFeedback = 0;
    }

    /**
     * Trigger a thrust (KeyE for P1, Space for P2)
     */
    thrust() {
      // Cannot thrust while already thrusting, in recovery, stunned, or hit
      if (
        this.state === STATES.THRUSTING ||
        this.state === STATES.RECOVERY ||
        this.state === STATES.PARRIED ||
        this.state === STATES.HIT
      ) {
        return false;
      }

      this.state = STATES.THRUSTING;
      this.stateTimer = 0;
      this.bladeProgress = 0.1;
      return true;
    }

    /**
     * Set guard stance ('high', 'low', 'neutral' or constants)
     * @param {string} type
     */
    setGuard(type) {
      if (this.state === STATES.PARRIED || this.state === STATES.HIT) {
        return;
      }
      if (type === 'high' || type === GUARDS.ZASLONA_HIGH) {
        this.guard = GUARDS.ZASLONA_HIGH;
      } else if (type === 'low' || type === GUARDS.ZASLONA_LOW) {
        this.guard = GUARDS.ZASLONA_LOW;
      } else {
        this.guard = GUARDS.NEUTRAL;
      }
    }

    /**
     * Put fencer in parried stagger when their attack is blocked by a guard
     */
    onParried() {
      this.state = STATES.PARRIED;
      this.stateTimer = 0;
      this.bladeProgress = 0;
      this.vx = -this.facing * 120; // slight recoil
    }

    /**
     * Put fencer in hit state when struck by opponent's blade
     */
    onHit() {
      this.state = STATES.HIT;
      this.stateTimer = 0;
      this.isHitStunned = true;
      this.touchFeedback = 0.8;
      this.vx = -this.facing * 80;
    }

    /**
     * Evaluates key map for this player
     * Player 1: KeyA (retreat/left), KeyD (advance/right), KeyW (high guard), KeyS (low guard), KeyE (thrust)
     * Player 2: ArrowLeft (advance), ArrowRight (retreat), ArrowUp (high guard), ArrowDown (low guard), Space (thrust)
     * @param {Object<string, boolean>} keys
     * @returns {{ moveLeft: boolean, moveRight: boolean, guardUp: boolean, guardDown: boolean, thrust: boolean }}
     */
    readPlayerInputs(keys) {
      if (!keys) {
        return { moveLeft: false, moveRight: false, guardUp: false, guardDown: false, thrust: false };
      }

      if (this.id === 1) {
        return {
          moveLeft: !!(keys['KeyA'] || keys['keya'] || keys['a'] || keys['A']),
          moveRight: !!(keys['KeyD'] || keys['keyd'] || keys['d'] || keys['D']),
          guardUp: !!(keys['KeyW'] || keys['keyw'] || keys['w'] || keys['W']),
          guardDown: !!(keys['KeyS'] || keys['keys'] || keys['s'] || keys['S']),
          thrust: !!(keys['KeyE'] || keys['keye'] || keys['e'] || keys['E'])
        };
      } else {
        return {
          moveLeft: !!(keys['ArrowLeft'] || keys['Left']),
          moveRight: !!(keys['ArrowRight'] || keys['Right']),
          guardUp: !!(keys['ArrowUp'] || keys['Up']),
          guardDown: !!(keys['ArrowDown'] || keys['Down']),
          thrust: !!(keys['Space'] || keys[' '] || keys['Spacebar'])
        };
      }
    }

    /**
     * Update fencer position, stance, and physics per frame
     * @param {Object<string, boolean>} keys - map of pressed keys
     * @param {Object} [bounds] - piste horizontal boundaries { minX, maxX }
     * @param {number} [dt=0.016] - delta time in seconds
     */
    update(keys = {}, bounds = { minX: 60, maxX: 900 }, dt = 0.016) {
      // Clamp reasonable delta time to avoid large physics steps
      const delta = Math.min(Math.max(dt, 0.001), 0.1);
      this.animTick += delta;

      if (this.touchFeedback > 0) {
        this.touchFeedback -= delta;
      }

      const input = this.readPlayerInputs(keys);

      // Handle Guard Input (only if not thrusting, parried, or hit)
      if (
        this.state !== STATES.THRUSTING &&
        this.state !== STATES.PARRIED &&
        this.state !== STATES.HIT
      ) {
        if (input.guardUp) {
          this.setGuard('high');
        } else if (input.guardDown) {
          this.setGuard('low');
        } else {
          this.setGuard('neutral');
        }

        // Thrust trigger
        if (input.thrust) {
          this.thrust();
        }
      }

      // State machine transitions
      switch (this.state) {
        case STATES.IDLE:
        case STATES.ADVANCE:
        case STATES.RETREAT: {
          let moveIntent = 0;
          if (input.moveLeft) moveIntent -= 1;
          if (input.moveRight) moveIntent += 1;

          this.vx = moveIntent * WALK_SPEED;

          if (moveIntent === 0) {
            this.state = STATES.IDLE;
          } else if (moveIntent === this.facing) {
            this.state = STATES.ADVANCE;
          } else {
            this.state = STATES.RETREAT;
          }

          // Blade rest progress
          this.bladeProgress = 0;
          break;
        }

        case STATES.THRUSTING: {
          this.stateTimer += delta;
          const thrustPhase = this.stateTimer / this.thrustDuration;

          // Quick explosive extension with forward lunge momentum
          if (thrustPhase < 0.6) {
            this.bladeProgress = Math.min(1.0, thrustPhase / 0.4);
            this.vx = this.facing * LUNGE_SPEED * (1 - thrustPhase);
          } else {
            this.bladeProgress = 1.0;
            this.vx = 0;
          }

          if (this.stateTimer >= this.thrustDuration) {
            this.state = STATES.RECOVERY;
            this.stateTimer = 0;
          }
          break;
        }

        case STATES.RECOVERY: {
          this.stateTimer += delta;
          const recPhase = this.stateTimer / this.recoveryDuration;
          this.bladeProgress = Math.max(0, 1.0 - recPhase);
          this.vx = -this.facing * 40 * (1 - recPhase); // settle backward into stance

          if (this.stateTimer >= this.recoveryDuration) {
            this.state = STATES.IDLE;
            this.stateTimer = 0;
            this.bladeProgress = 0;
          }
          break;
        }

        case STATES.PARRIED: {
          this.stateTimer += delta;
          this.bladeProgress = 0;
          this.vx *= 0.9; // friction deceleration

          if (this.stateTimer >= this.parriedDuration) {
            this.state = STATES.IDLE;
            this.stateTimer = 0;
            this.vx = 0;
          }
          break;
        }

        case STATES.HIT: {
          this.stateTimer += delta;
          this.bladeProgress = 0;
          this.vx *= 0.88;

          if (this.stateTimer >= this.hitDuration) {
            this.state = STATES.IDLE;
            this.stateTimer = 0;
            this.isHitStunned = false;
            this.vx = 0;
          }
          break;
        }
      }

      // Integrate kinematics
      this.x += this.vx * delta;

      // Piste boundary clamping
      const minX = bounds && bounds.minX !== undefined ? bounds.minX : 60;
      const maxX = bounds && bounds.maxX !== undefined ? bounds.maxX : 900;
      if (this.x - this.width / 2 < minX) {
        this.x = minX + this.width / 2;
        this.vx = 0;
      }
      if (this.x + this.width / 2 > maxX) {
        this.x = maxX - this.width / 2;
        this.vx = 0;
      }

      // Compute current blade angle based on guard stance
      this.computeBladeAngle();
    }

    /**
     * Determines the blade target angle depending on guard
     * High Zasłona: Blade pointed up diagonally to deflect high thrusts (+35° ~ +50°)
     * Low Zasłona: Blade pointed down diagonally to deflect low thrusts (-35° ~ -50°)
     * Neutral: Blade pointed horizontal (+2° ~ +6°)
     */
    computeBladeAngle() {
      let targetDeg = 0;
      if (this.guard === GUARDS.ZASLONA_HIGH) {
        targetDeg = -38; // pointing upwards in canvas coords
      } else if (this.guard === GUARDS.ZASLONA_LOW) {
        targetDeg = 36; // pointing downwards in canvas coords
      } else {
        targetDeg = -4; // nearly horizontal, slightly elevated
      }

      if (this.state === STATES.THRUSTING) {
        // Thrust flattens blade toward opponent's torso
        if (this.guard === GUARDS.ZASLONA_HIGH) {
          targetDeg = -14;
        } else if (this.guard === GUARDS.ZASLONA_LOW) {
          targetDeg = 14;
        } else {
          targetDeg = -2;
        }
      } else if (this.state === STATES.PARRIED) {
        // Blade knocked backward upwards
        targetDeg = -65;
      }

      // Target angle in radians relative to facing direction
      const targetRad = (targetDeg * Math.PI) / 180;
      this.bladeAngle = targetRad;
    }

    /**
     * Shoulder / hand grip anchor point for the sword
     * @returns {{ x: number, y: number }}
     */
    getGripPosition() {
      const shoulderX = this.x + this.facing * 14;
      const shoulderY = this.y - 62;
      return { x: shoulderX, y: shoulderY };
    }

    /**
     * Blade line segment for combat raycasts and parry tests
     * Returns start (guard/hilt) and tip (point d'arrêt) coordinates.
     * @returns {{ x1: number, y1: number, x2: number, y2: number, length: number, isThrusting: boolean, guard: string }}
     */
    getBladeSegment() {
      const grip = this.getGripPosition();
      const currentLength =
        BLADE_LENGTH_REST + (BLADE_LENGTH_THRUST - BLADE_LENGTH_REST) * this.bladeProgress;

      // In canvas coordinates, facing right = +x, facing left = -x
      const cosA = Math.cos(this.bladeAngle);
      const sinA = Math.sin(this.bladeAngle);

      const tipX = grip.x + this.facing * cosA * currentLength;
      const tipY = grip.y + sinA * currentLength;

      return {
        x1: grip.x,
        y1: grip.y,
        x2: tipX,
        y2: tipY,
        length: currentLength,
        isThrusting: this.state === STATES.THRUSTING,
        guard: this.guard
      };
    }

    /**
     * Torso & target area bounding box for touché detection
     * In foil/épée, valid target includes torso/chest/flank.
     * @returns {{ x: number, y: number, width: number, height: number, left: number, right: number, top: number, bottom: number }}
     */
    getBodyHitbox() {
      const width = this.width;
      const height = this.height * 0.72; // head + torso
      const x = this.x - width / 2;
      const y = this.y - this.height;

      return {
        x,
        y,
        width,
        height,
        left: x,
        right: x + width,
        top: y,
        bottom: y + height
      };
    }

    /**
     * Render the fencer, mask, jacket, legs, guard stance indicator, and sword
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
      if (!ctx) return;

      ctx.save();

      const isP1 = this.id === 1;
      const primaryColor = this.color;
      const fencerAlpha = this.state === STATES.HIT ? 0.75 : 1.0;
      ctx.globalAlpha = fencerAlpha;

      // 1. Shadow beneath fencer
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 4, 28, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hit effect halo
      if (this.touchFeedback > 0) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 50, 48, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Parried spark ring
      if (this.state === STATES.PARRIED) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 60, 36, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. Legs & en-garde stance
      const lungeOffset = this.bladeProgress * 16 * this.facing;
      const legBob = Math.sin(this.animTick * 12) * (this.state === STATES.ADVANCE || this.state === STATES.RETREAT ? 3 : 0);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Back leg (bent in en garde)
      ctx.beginPath();
      ctx.moveTo(this.x - this.facing * 6, this.y - 45);
      ctx.lineTo(this.x - this.facing * 20, this.y - 22 + legBob);
      ctx.lineTo(this.x - this.facing * 26, this.y);
      ctx.stroke();

      // Front leg (extends forward in lunge)
      ctx.beginPath();
      ctx.moveTo(this.x + this.facing * 4, this.y - 45);
      ctx.lineTo(this.x + this.facing * 16 + lungeOffset * 0.5, this.y - 20 - legBob);
      ctx.lineTo(this.x + this.facing * 22 + lungeOffset, this.y);
      ctx.stroke();

      // 3. Torso (Fencing plastron / jacket)
      const torsoY = this.y - 82;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(this.x - 14, torsoY, 28, 42, 6);
      ctx.fill();
      ctx.stroke();

      // Team / player color accent sash
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(this.x - 13, torsoY + 28, 26, 8, 2);
      ctx.fill();

      // Fencing mask (head)
      const headY = this.y - 98;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(this.x, headY, 13, 0, Math.PI * 2);
      ctx.fill();

      // Mask mesh visor facing opponent
      ctx.strokeStyle = isP1 ? '#60a5fa' : '#f87171';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        this.x + this.facing * 5,
        headY,
        10,
        this.facing > 0 ? -Math.PI / 3 : (2 * Math.PI) / 3,
        this.facing > 0 ? Math.PI / 3 : (4 * Math.PI) / 3
      );
      ctx.stroke();

      // Non-dominant arm (held high behind for balance)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(this.x - this.facing * 10, torsoY + 8);
      ctx.lineTo(this.x - this.facing * 22, torsoY - 6);
      ctx.lineTo(this.x - this.facing * 18, torsoY - 22);
      ctx.stroke();

      // 4. Dominant Arm & Sword Assembly
      const grip = this.getGripPosition();
      const blade = this.getBladeSegment();

      // Arm leading to sword grip
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(this.x + this.facing * 6, torsoY + 10);
      ctx.lineTo(grip.x, grip.y);
      ctx.stroke();

      // Coquille (Bell guard of weapon)
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(grip.x, grip.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blade (steel foil / épée)
      ctx.strokeStyle = this.state === STATES.THRUSTING ? '#ffffff' : '#cbd5e1';
      ctx.lineWidth = this.state === STATES.THRUSTING ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(blade.x1, blade.y1);
      ctx.lineTo(blade.x2, blade.y2);
      ctx.stroke();

      // Point d'arrêt (blade tip button)
      ctx.fillStyle = this.state === STATES.THRUSTING ? '#facc15' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(blade.x2, blade.y2, this.state === STATES.THRUSTING ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. Zasłona / Guard Stance Indicator UI above fencer
      this.drawGuardAura(ctx);

      ctx.restore();
    }

    /**
     * Draws tactical guard stance badge / arc above fencer's head
     * @param {CanvasRenderingContext2D} ctx
     */
    drawGuardAura(ctx) {
      const badgeY = this.y - 120;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';

      if (this.guard === GUARDS.ZASLONA_HIGH) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.fillText('▲ ZASŁONA W.', this.x, badgeY);

        // Guard arc deflection shield preview
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(this.x + this.facing * 18, this.y - 74, 26, -Math.PI / 2, 0);
        ctx.stroke();
      } else if (this.guard === GUARDS.ZASLONA_LOW) {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.9)';
        ctx.fillText('▼ ZASŁONA N.', this.x, badgeY);

        // Low guard deflection arc
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(this.x + this.facing * 18, this.y - 40, 26, 0, Math.PI / 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.fillText(`P${this.id}`, this.x, badgeY);
      }

      ctx.restore();
    }
  }

  // Expose Enums as static properties
  Fencer.STATES = STATES;
  Fencer.GUARDS = GUARDS;

  return Fencer;
});
