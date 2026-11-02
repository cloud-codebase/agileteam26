/**
 * player.js - Player Ship, Controls, Missiles & Destructible Pixel Bunkers
 * Exposes window.PlayerManager
 */

(function () {
  'use strict';

  class PlayerManager {
    constructor() {
      this.canvasWidth = 800;
      this.canvasHeight = 600;

      // Player ship properties
      this.width = 44;
      this.height = 24;
      this.x = 378;
      this.y = 530;
      this.speed = 320; // pixels per second
      this.color = '#00ff66';

      // State
      this.isAlive = true;
      this.isRespawning = false;
      this.respawnTimer = 0;
      this.explosionParticles = [];

      // Weapons
      this.bullets = [];
      this.maxBullets = 1; // Classic arcade allows 1 active missile at a time (or max 2 with power)
      this.bulletSpeed = 500;
      this.fireCooldown = 0;
      this.minFireInterval = 0.25;

      // Bunkers (4 destructible bunkers)
      this.bunkers = [];

      // Touch / controls state
      this.inputState = {
        left: false,
        right: false,
        fire: false
      };

      this._initInputListeners();
    }

    _initInputListeners() {
      if (this._listenersAttached) return;
      this._listenersAttached = true;

      window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.inputState.left = true;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.inputState.right = true;
        } else if (e.code === 'Space') {
          this.inputState.fire = true;
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.inputState.left = false;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.inputState.right = false;
        } else if (e.code === 'Space') {
          this.inputState.fire = false;
        }
      });

      // Hook touch controls defensively once DOM is ready or immediately if already loaded
      const attachTouch = () => {
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnFire = document.getElementById('btn-fire');

        if (btnLeft) {
          const startLeft = (e) => { e.preventDefault(); this.inputState.left = true; };
          const endLeft = (e) => { e.preventDefault(); this.inputState.left = false; };
          btnLeft.addEventListener('touchstart', startLeft, { passive: false });
          btnLeft.addEventListener('touchend', endLeft, { passive: false });
          btnLeft.addEventListener('mousedown', startLeft);
          btnLeft.addEventListener('mouseup', endLeft);
          btnLeft.addEventListener('mouseleave', endLeft);
        }

        if (btnRight) {
          const startRight = (e) => { e.preventDefault(); this.inputState.right = true; };
          const endRight = (e) => { e.preventDefault(); this.inputState.right = false; };
          btnRight.addEventListener('touchstart', startRight, { passive: false });
          btnRight.addEventListener('touchend', endRight, { passive: false });
          btnRight.addEventListener('mousedown', startRight);
          btnRight.addEventListener('mouseup', endRight);
          btnRight.addEventListener('mouseleave', endRight);
        }

        if (btnFire) {
          const startFire = (e) => { e.preventDefault(); this.inputState.fire = true; };
          const endFire = (e) => { e.preventDefault(); this.inputState.fire = false; };
          btnFire.addEventListener('touchstart', startFire, { passive: false });
          btnFire.addEventListener('touchend', endFire, { passive: false });
          btnFire.addEventListener('mousedown', startFire);
          btnFire.addEventListener('mouseup', endFire);
          btnFire.addEventListener('mouseleave', endFire);
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachTouch);
      } else {
        attachTouch();
      }
    }

    /**
     * Resets player state and rebuilds the 4 classic pixel bunkers
     */
    init(canvasWidth = 800, canvasHeight = 600) {
      this.canvasWidth = canvasWidth;
      this.canvasHeight = canvasHeight;
      this.x = (canvasWidth - this.width) / 2;
      this.y = canvasHeight - 70;
      this.isAlive = true;
      this.isRespawning = false;
      this.respawnTimer = 0;
      this.bullets = [];
      this.fireCooldown = 0;
      this.explosionParticles = [];

      this._createBunkers();
    }

    resetPosition() {
      this.x = (this.canvasWidth - this.width) / 2;
      this.y = this.canvasHeight - 70;
      this.isAlive = true;
      this.isRespawning = false;
      this.respawnTimer = 0;
      this.bullets = [];
    }

    /**
     * Builds 4 defensive pixel bunkers with arch cutouts
     */
    _createBunkers() {
      this.bunkers = [];
      const bunkerCount = 4;
      const bunkerWidth = 72;
      const bunkerHeight = 54;
      const blockSize = 6; // 12 columns x 9 rows per bunker
      const cols = Math.floor(bunkerWidth / blockSize); // 12
      const rows = Math.floor(bunkerHeight / blockSize); // 9

      const spacing = this.canvasWidth / (bunkerCount + 1);
      const startY = this.canvasHeight - 160;

      // Mask of classic bunker shape:
      // 1: solid, 0: empty cutout
      const shape = [
        [0,0,1,1,1,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,0,0,0,0,1,1,1,1],
        [1,1,1,0,0,0,0,0,0,1,1,1],
        [1,1,1,0,0,0,0,0,0,1,1,1],
      ];

      for (let b = 0; b < bunkerCount; b++) {
        const bunkerX = Math.floor(spacing * (b + 1) - bunkerWidth / 2);
        const blocks = [];

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (shape[r] && shape[r][c] === 1) {
              blocks.push({
                x: bunkerX + c * blockSize,
                y: startY + r * blockSize,
                w: blockSize,
                h: blockSize,
                hp: 1, // 1 hit breaks a single block
                color: '#26d07c'
              });
            }
          }
        }

        this.bunkers.push({
          index: b,
          x: bunkerX,
          y: startY,
          w: bunkerWidth,
          h: bunkerHeight,
          blocks: blocks
        });
      }
    }

    /**
     * Update player movements, bullets, and particles
     */
    update(externalInputState, dt = 1 / 60) {
      // Merge keyboard/touch with any passed-in input state
      const input = externalInputState || this.inputState;

      // Handle respawn delay if hit
      if (!this.isAlive && this.isRespawning) {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
          this.isRespawning = false;
          this.isAlive = true;
          this.x = (this.canvasWidth - this.width) / 2;
        }
      }

      // Movement
      if (this.isAlive) {
        let dx = 0;
        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        this.x += dx * this.speed * dt;

        // Boundaries
        const minX = 20;
        const maxX = this.canvasWidth - this.width - 20;
        if (this.x < minX) this.x = minX;
        if (this.x > maxX) this.x = maxX;

        // Firing logic
        this.fireCooldown -= dt;
        if (input.fire && this.fireCooldown <= 0 && this.bullets.length < this.maxBullets) {
          this._fireBullet();
          this.fireCooldown = this.minFireInterval;
        }
      }

      // Update player bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.y -= this.bulletSpeed * dt;
        if (b.y < -10) {
          this.bullets.splice(i, 1);
        }
      }

      // Update particles
      for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
        const p = this.explosionParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          this.explosionParticles.splice(i, 1);
        }
      }
    }

    _fireBullet() {
      const bulletX = this.x + this.width / 2 - 2;
      const bulletY = this.y - 8;
      this.bullets.push({
        x: bulletX,
        y: bulletY,
        w: 4,
        h: 12,
        active: true,
        color: '#ffffff'
      });

      if (window.AudioEngine && typeof window.AudioEngine.playShoot === 'function') {
        window.AudioEngine.playShoot();
      }
    }

    takeDamage() {
      if (!this.isAlive) return false;

      this.isAlive = false;
      this.isRespawning = true;
      this.respawnTimer = 1.2;

      // Spawn explosion particles
      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 180;
        this.explosionParticles.push({
          x: this.x + this.width / 2,
          y: this.y + this.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          size: 2 + Math.random() * 3,
          color: Math.random() > 0.5 ? '#ff3344' : '#00ff66'
        });
      }

      if (window.AudioEngine && typeof window.AudioEngine.playPlayerExplosion === 'function') {
        window.AudioEngine.playPlayerExplosion();
      }

      return true;
    }

    getBullets() {
      return this.bullets;
    }

    getBunkers() {
      return this.bunkers;
    }

    getHitbox() {
      return {
        x: this.x,
        y: this.y,
        w: this.width,
        h: this.height
      };
    }

    /**
     * Checks if a bullet/bomb intersects with any bunker block and erodes nearby blocks on impact
     */
    checkBunkerHit(projectile) {
      if (!projectile) return false;

      const px = projectile.x;
      const py = projectile.y;
      const pw = projectile.w || 4;
      const ph = projectile.h || 10;

      for (let b = 0; b < this.bunkers.length; b++) {
        const bunker = this.bunkers[b];

        // Quick AABB against bunker bounds
        if (
          px + pw < bunker.x ||
          px > bunker.x + bunker.w ||
          py + ph < bunker.y ||
          py > bunker.y + bunker.h
        ) {
          continue;
        }

        // Check individual blocks
        for (let i = 0; i < bunker.blocks.length; i++) {
          const block = bunker.blocks[i];
          if (
            px < block.x + block.w &&
            px + pw > block.x &&
            py < block.y + block.h &&
            py + ph > block.y
          ) {
            // Hit! Erode impacted block and create small crater blast around it
            const hitCenterX = block.x + block.w / 2;
            const hitCenterY = block.y + block.h / 2;
            const craterRadius = 10;

            bunker.blocks = bunker.blocks.filter((blk) => {
              const dx = blk.x + blk.w / 2 - hitCenterX;
              const dy = blk.y + blk.h / 2 - hitCenterY;
              return Math.hypot(dx, dy) > craterRadius;
            });

            return true;
          }
        }
      }

      return false;
    }

    /**
     * Renders the player ship, missiles, bunkers, and particles onto the canvas
     */
    render(ctx) {
      if (!ctx) return;

      // Draw bunkers
      for (let b = 0; b < this.bunkers.length; b++) {
        const bunker = this.bunkers[b];
        for (let i = 0; i < bunker.blocks.length; i++) {
          const block = bunker.blocks[i];
          ctx.fillStyle = block.color;
          ctx.fillRect(block.x, block.y, block.w, block.h);
        }
      }

      // Draw active player bullets
      for (let i = 0; i < this.bullets.length; i++) {
        const bullet = this.bullets[i];
        ctx.fillStyle = bullet.color || '#ffffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
        ctx.shadowBlur = 0;
      }

      // Draw particles
      for (let i = 0; i < this.explosionParticles.length; i++) {
        const p = this.explosionParticles[i];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      // Draw player ship if alive
      if (this.isAlive) {
        this._drawShip(ctx, this.x, this.y);
      } else if (this.isRespawning) {
        // Flicker effect during respawn recovery
        if (Math.floor(Date.now() / 100) % 2 === 0) {
          ctx.globalAlpha = 0.5;
          this._drawShip(ctx, this.x, this.y);
          ctx.globalAlpha = 1.0;
        }
      }
    }

    /**
     * High-fidelity classic Space Invaders cannon pixel silhouette
     */
    _drawShip(ctx, x, y) {
      ctx.fillStyle = this.color;
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 8;

      // Base: 44w x 12h
      ctx.fillRect(x, y + 12, this.width, 12);
      // Mid turret: 28w x 8h
      ctx.fillRect(x + 8, y + 6, 28, 8);
      // Top cannon tip: 6w x 8h
      ctx.fillRect(x + 19, y, 6, 8);

      ctx.shadowBlur = 0;
    }
  }

  window.PlayerManager = new PlayerManager();
})();
