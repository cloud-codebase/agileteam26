/**
 * invaders.js - Alien Armada Grid, Marching Logic, Bomb Dropping & Mystery UFO Saucer
 * Space Invaders classic mechanics adhering to DESIGN.md.
 * Exposes window.InvaderManager
 */

(function () {
  'use strict';

  // Pixel bitmasks for 3 alien tiers: 2 animation frames each (8x8 or 11x8/12x8)
  // 1 = solid pixel, 0 = transparent pixel
  // Top Alien (Squid / 30 pts) - 8 columns x 8 rows
  const SPRITE_TOP = [
    // Frame 0 (tentacles out)
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,0,1,1,0,1,1],
      [1,1,1,1,1,1,1,1],
      [0,0,1,0,0,1,0,0],
      [0,1,0,1,1,0,1,0],
      [1,0,1,0,0,1,0,1]
    ],
    // Frame 1 (tentacles in)
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,0,1,1,0,1,1],
      [1,1,1,1,1,1,1,1],
      [0,1,0,1,1,0,1,0],
      [1,0,0,0,0,0,0,1],
      [0,1,0,0,0,0,1,0]
    ]
  ];

  // Middle Alien (Crab / 20 pts) - 11 columns x 8 rows
  const SPRITE_MID = [
    // Frame 0 (hands up)
    [
      [0,0,1,0,0,0,0,0,1,0,0],
      [0,0,0,1,0,0,0,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,1,1,0,1,1,1,0,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,1,1,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,1,0,1],
      [0,0,0,1,1,0,1,1,0,0,0]
    ],
    // Frame 1 (hands down)
    [
      [0,0,1,0,0,0,0,0,1,0,0],
      [1,0,0,1,0,0,0,1,0,0,1],
      [1,0,1,1,1,1,1,1,1,0,1],
      [1,1,1,0,1,1,1,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,0,1,0,0,0,0,0,1,0,0],
      [0,1,0,0,0,0,0,0,0,1,0]
    ]
  ];

  // Bottom Alien (Octopus / 10 pts) - 12 columns x 8 rows
  const SPRITE_BOT = [
    // Frame 0 (tentacles wide)
    [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,0,1,1,0,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [0,0,0,1,1,0,0,1,1,0,0,0],
      [0,0,1,1,0,1,1,0,1,1,0,0],
      [1,1,0,0,0,0,0,0,0,0,1,1]
    ],
    // Frame 1 (tentacles narrow)
    [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,0,1,1,0,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [0,0,1,1,1,0,0,1,1,1,0,0],
      [0,1,1,0,0,1,1,0,0,1,1,0],
      [0,0,1,1,0,0,0,0,1,1,0,0]
    ]
  ];

  // Red Mystery Saucer (UFO) - 16 columns x 7 rows
  const SPRITE_UFO = [
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,0,1,1,1,0,0,1,1,0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0]
  ];

  class InvaderManager {
    constructor() {
      this.canvasWidth = 800;
      this.canvasHeight = 600;
      this.waveNumber = 1;

      // Alien grid: 5 rows x 11 cols = 55 aliens
      this.rows = 5;
      this.cols = 11;
      this.aliens = [];

      // Grid position and movement
      this.gridX = 60;
      this.gridY = 80;
      this.alienWidth = 32;
      this.alienHeight = 22;
      this.spacingX = 16;
      this.spacingY = 16;
      this.stepX = 14; // pixels shifted horizontally per step
      this.dropY = 20; // pixels dropped when wall reached
      this.direction = 1; // 1 = right, -1 = left

      // March cadence & progressive tempo
      this.stepTimer = 0;
      this.baseStepInterval = 0.85; // initial interval in seconds
      this.currentStepInterval = 0.85;
      this.minStepInterval = 0.08; // lightning fast when 1 alien remains
      this.animationFrame = 0;
      this.marchBeatStep = 0;

      // Alien projectile drops
      this.bombs = [];
      this.bombTimer = 0;
      this.bombInterval = 1.3;
      this.bombSpeed = 220;

      // Mystery Saucer (UFO)
      this.saucer = null;
      this.saucerTimer = 0;
      this.saucerInterval = 25; // seconds between saucer passes
      this.saucerSpeed = 160;
      this.saucerWidth = 48;
      this.saucerHeight = 21;

      // Explosions / kill animation effects
      this.killEffects = [];
    }

    /**
     * Spawns 5x11 armada and initializes timers for the given wave
     */
    init(waveNumber = 1, canvasWidth = 800, canvasHeight = 600) {
      this.waveNumber = waveNumber;
      this.canvasWidth = canvasWidth;
      this.canvasHeight = canvasHeight;

      this.aliens = [];
      this.bombs = [];
      this.killEffects = [];
      if (this.saucer && window.AudioEngine && typeof window.AudioEngine.stopUfoSound === 'function') {
        window.AudioEngine.stopUfoSound();
      }
      this.saucer = null;
      this.saucerTimer = 15 + Math.random() * 10;

      this.direction = 1;
      this.animationFrame = 0;
      this.marchBeatStep = 0;

      // Wave scaling: Start lower down and march slightly faster on higher waves
      const startYOffset = Math.min((waveNumber - 1) * 12, 100);
      this.gridY = 70 + startYOffset;
      this.gridX = 60;

      // Speed scale with wave
      this.baseStepInterval = Math.max(0.4, 0.85 - (waveNumber - 1) * 0.07);
      this.currentStepInterval = this.baseStepInterval;
      this.stepTimer = this.currentStepInterval;

      // Bomb frequency scales with wave
      this.bombInterval = Math.max(0.6, 1.4 - (waveNumber - 1) * 0.12);
      this.bombTimer = this.bombInterval * 0.5;

      // Build 55 aliens:
      // Row 0: Top Squid (30 pts, Pink/Magenta)
      // Row 1,2: Mid Crab (20 pts, Cyan)
      // Row 3,4: Bot Octopus (10 pts, Green)
      for (let r = 0; r < this.rows; r++) {
        let type = 'bot';
        let points = 10;
        let color = '#39ff14'; // neon green

        if (r === 0) {
          type = 'top';
          points = 30;
          color = '#ff007f'; // neon pink
        } else if (r === 1 || r === 2) {
          type = 'mid';
          points = 20;
          color = '#00f0ff'; // neon cyan
        }

        for (let c = 0; c < this.cols; c++) {
          const x = this.gridX + c * (this.alienWidth + this.spacingX);
          const y = this.gridY + r * (this.alienHeight + this.spacingY);

          this.aliens.push({
            id: `alien_${r}_${c}`,
            row: r,
            col: c,
            type: type,
            points: points,
            color: color,
            x: x,
            y: y,
            w: this.alienWidth,
            h: this.alienHeight,
            alive: true
          });
        }
      }
    }

    /**
     * Returns true if all aliens have been destroyed
     */
    isWaveCleared() {
      return this.aliens.every((a) => !a.alive);
    }

    /**
     * Checks if any living alien has landed past bunker/defense line (triggers Game Over)
     */
    hasReachedBottom(cutoffY = 510) {
      return this.aliens.some((a) => a.alive && (a.y + a.h >= cutoffY));
    }

    getAliens() {
      return this.aliens.filter((a) => a.alive);
    }

    getBombs() {
      return this.bombs;
    }

    getSaucer() {
      return this.saucer;
    }

    /**
     * Kills an alien, plays sound, creates vaporized pixel puff
     */
    killAlien(alien) {
      if (!alien || !alien.alive) return;
      alien.alive = false;

      // Trigger audio
      if (window.AudioEngine && typeof window.AudioEngine.playInvaderKilled === 'function') {
        window.AudioEngine.playInvaderKilled();
      }

      // Add kill explosion particles
      const cx = alien.x + alien.w / 2;
      const cy = alien.y + alien.h / 2;
      this.killEffects.push({
        type: 'alien',
        x: cx,
        y: cy,
        color: alien.color,
        timer: 0.18,
        maxTimer: 0.18,
        points: alien.points
      });

      // Recalculate tempo based on remaining invaders count
      const remaining = this.getAliens().length;
      if (remaining > 0) {
        const ratio = remaining / 55;
        this.currentStepInterval = this.minStepInterval + (this.baseStepInterval - this.minStepInterval) * Math.pow(ratio, 1.4);
      }
    }

    /**
     * Kills the Mystery Saucer UFO, displays score popup
     */
    killSaucer() {
      if (!this.saucer) return 0;
      const points = this.saucer.points;
      const cx = this.saucer.x + this.saucer.w / 2;
      const cy = this.saucer.y + this.saucer.h / 2;

      if (window.AudioEngine) {
        if (typeof window.AudioEngine.stopUfoSound === 'function') {
          window.AudioEngine.stopUfoSound();
        }
        if (typeof window.AudioEngine.playInvaderKilled === 'function') {
          window.AudioEngine.playInvaderKilled();
        }
      }

      this.killEffects.push({
        type: 'saucer',
        x: cx,
        y: cy,
        color: '#ff3333',
        timer: 0.8,
        maxTimer: 0.8,
        points: points
      });

      this.saucer = null;
      this.saucerTimer = 20 + Math.random() * 15;
      return points;
    }

    /**
     * Updates armada marching, drop logic, bomb drops, and UFO
     */
    update(dt = 1 / 60, playerX = 400) {
      // 1. Update active kill effects
      for (let i = this.killEffects.length - 1; i >= 0; i--) {
        this.killEffects[i].timer -= dt;
        if (this.killEffects[i].timer <= 0) {
          this.killEffects.splice(i, 1);
        }
      }

      // 2. Update alien bombs
      for (let i = this.bombs.length - 1; i >= 0; i--) {
        const bomb = this.bombs[i];
        bomb.y += this.bombSpeed * dt;
        bomb.wiggle += dt * 15;
        if (bomb.y > this.canvasHeight + 10) {
          this.bombs.splice(i, 1);
        }
      }

      // 3. Update Armada March
      const living = this.getAliens();
      if (living.length > 0) {
        this.stepTimer -= dt;
        if (this.stepTimer <= 0) {
          this.stepTimer = this.currentStepInterval;
          this._marchArmada(living);
        }

        // Bomb dropping logic
        this.bombTimer -= dt;
        if (this.bombTimer <= 0) {
          this.bombTimer = this.bombInterval + (Math.random() * 0.6 - 0.3);
          this._dropBomb(living, playerX);
        }
      }

      // 4. Update Mystery Saucer (UFO)
      this._updateSaucer(dt);
    }

    /**
     * Executes one synchronized march step for the whole armada
     */
    _marchArmada(living) {
      // Alternate animation frame
      this.animationFrame = (this.animationFrame + 1) % 2;

      // Play 4-beat classic arcade marching bass tone
      if (window.AudioEngine && typeof window.AudioEngine.playMarchBeat === 'function') {
        window.AudioEngine.playMarchBeat(this.marchBeatStep);
        this.marchBeatStep = (this.marchBeatStep + 1) % 4;
      }

      // Check boundary conditions: has any alien hit edge?
      let hitEdge = false;
      const leftMargin = 20;
      const rightMargin = this.canvasWidth - 20;

      for (let i = 0; i < living.length; i++) {
        const a = living[i];
        if (this.direction === 1 && a.x + a.w + this.stepX >= rightMargin) {
          hitEdge = true;
          break;
        } else if (this.direction === -1 && a.x - this.stepX <= leftMargin) {
          hitEdge = true;
          break;
        }
      }

      if (hitEdge) {
        // Change direction and drop down
        this.direction *= -1;
        for (let i = 0; i < this.aliens.length; i++) {
          this.aliens[i].y += this.dropY;
        }
      } else {
        // Step horizontally
        const moveDx = this.stepX * this.direction;
        for (let i = 0; i < this.aliens.length; i++) {
          this.aliens[i].x += moveDx;
        }
      }
    }

    /**
     * Drops bomb from a random bottom-most alien (biased towards player's position)
     */
    _dropBomb(living, playerX) {
      // Find lowest living alien in each column
      const bottomByCol = {};
      for (let i = 0; i < living.length; i++) {
        const a = living[i];
        if (!bottomByCol[a.col] || bottomByCol[a.col].row < a.row) {
          bottomByCol[a.col] = a;
        }
      }

      const shooters = Object.values(bottomByCol);
      if (shooters.length === 0) return;

      // 40% chance to target the shooter closest to player X
      let chosen = null;
      if (Math.random() < 0.4 && typeof playerX === 'number') {
        let bestDist = Infinity;
        for (let i = 0; i < shooters.length; i++) {
          const dist = Math.abs(shooters[i].x - playerX);
          if (dist < bestDist) {
            bestDist = dist;
            chosen = shooters[i];
          }
        }
      }

      if (!chosen) {
        chosen = shooters[Math.floor(Math.random() * shooters.length)];
      }

      this.bombs.push({
        x: chosen.x + chosen.w / 2 - 2,
        y: chosen.y + chosen.h + 2,
        w: 4,
        h: 12,
        wiggle: 0,
        color: '#ff3344'
      });
    }

    /**
     * Saucer timer & traversal across the top screen
     */
    _updateSaucer(dt) {
      if (!this.saucer) {
        this.saucerTimer -= dt;
        if (this.saucerTimer <= 0) {
          // Spawn saucer from left or right
          const fromLeft = Math.random() > 0.5;
          const saucerY = 42;
          // Classic mystery points: 50, 100, 150, or 300
          const possibleScores = [50, 100, 150, 300];
          const pts = possibleScores[Math.floor(Math.random() * possibleScores.length)];

          this.saucer = {
            x: fromLeft ? -this.saucerWidth : this.canvasWidth,
            y: saucerY,
            w: this.saucerWidth,
            h: this.saucerHeight,
            dir: fromLeft ? 1 : -1,
            points: pts,
            color: '#ff0033'
          };

          if (window.AudioEngine && typeof window.AudioEngine.playUfoSound === 'function') {
            window.AudioEngine.playUfoSound();
          }
        }
      } else {
        // Move saucer
        this.saucer.x += this.saucer.dir * this.saucerSpeed * dt;

        // Check if sailed offscreen
        if (
          (this.saucer.dir === 1 && this.saucer.x > this.canvasWidth + 20) ||
          (this.saucer.dir === -1 && this.saucer.x < -this.saucerWidth - 20)
        ) {
          if (window.AudioEngine && typeof window.AudioEngine.stopUfoSound === 'function') {
            window.AudioEngine.stopUfoSound();
          }
          this.saucer = null;
          this.saucerTimer = 22 + Math.random() * 15;
        }
      }
    }

    /**
     * Render all armada invaders, UFO, bombs, and explosion flashes
     */
    render(ctx) {
      if (!ctx) return;

      // 1. Draw Living Aliens
      for (let i = 0; i < this.aliens.length; i++) {
        const a = this.aliens[i];
        if (!a.alive) continue;
        this._drawAlien(ctx, a);
      }

      // 2. Draw Mystery UFO Saucer
      if (this.saucer) {
        this._drawSaucer(ctx, this.saucer);
      }

      // 3. Draw Alien Bombs (zig-zag / rolling missile effect)
      for (let i = 0; i < this.bombs.length; i++) {
        const b = this.bombs[i];
        this._drawBomb(ctx, b);
      }

      // 4. Draw Kill Effects (vaporizing flash & score floating tags)
      for (let i = 0; i < this.killEffects.length; i++) {
        const effect = this.killEffects[i];
        this._drawKillEffect(ctx, effect);
      }
    }

    _drawAlien(ctx, alien) {
      let spriteData = null;
      let cols = 8;
      let rows = 8;

      if (alien.type === 'top') {
        spriteData = SPRITE_TOP[this.animationFrame];
        cols = 8;
        rows = 8;
      } else if (alien.type === 'mid') {
        spriteData = SPRITE_MID[this.animationFrame];
        cols = 11;
        rows = 8;
      } else {
        spriteData = SPRITE_BOT[this.animationFrame];
        cols = 12;
        rows = 8;
      }

      const pixelW = alien.w / cols;
      const pixelH = alien.h / rows;

      ctx.fillStyle = alien.color;
      ctx.shadowColor = alien.color;
      ctx.shadowBlur = 4;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (spriteData[r] && spriteData[r][c] === 1) {
            ctx.fillRect(
              Math.floor(alien.x + c * pixelW),
              Math.floor(alien.y + r * pixelH),
              Math.ceil(pixelW),
              Math.ceil(pixelH)
            );
          }
        }
      }

      ctx.shadowBlur = 0;
    }

    _drawSaucer(ctx, saucer) {
      const rows = 7;
      const cols = 16;
      const pixelW = saucer.w / cols;
      const pixelH = saucer.h / rows;

      ctx.fillStyle = saucer.color;
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 8;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (SPRITE_UFO[r] && SPRITE_UFO[r][c] === 1) {
            ctx.fillRect(
              Math.floor(saucer.x + c * pixelW),
              Math.floor(saucer.y + r * pixelH),
              Math.ceil(pixelW),
              Math.ceil(pixelH)
            );
          }
        }
      }

      ctx.shadowBlur = 0;
    }

    _drawBomb(ctx, bomb) {
      ctx.fillStyle = bomb.color || '#ff3344';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 6;

      // Authentic zig-zag alien bomb rendering
      const xOffset = Math.sin(bomb.wiggle) * 2;
      ctx.fillRect(bomb.x + xOffset, bomb.y, bomb.w, bomb.h);

      ctx.shadowBlur = 0;
    }

    _drawKillEffect(ctx, effect) {
      if (effect.type === 'alien') {
        // Classic invader vaporizing puff: 4 diagonal prongs
        ctx.fillStyle = effect.color;
        const progress = 1 - (effect.timer / effect.maxTimer);
        const radius = 6 + progress * 8;

        ctx.fillRect(effect.x - radius, effect.y - radius, 4, 4);
        ctx.fillRect(effect.x + radius, effect.y - radius, 4, 4);
        ctx.fillRect(effect.x - radius, effect.y + radius, 4, 4);
        ctx.fillRect(effect.x + radius, effect.y + radius, 4, 4);
        ctx.fillRect(effect.x - 2, effect.y - 2, 4, 4);
      } else if (effect.type === 'saucer') {
        // Score tag displaying point value for mystery saucer
        ctx.fillStyle = '#ff0055';
        ctx.font = '14px "Press Start 2P", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${effect.points}`, effect.x, effect.y);
      }
    }
  }

  window.InvaderManager = new InvaderManager();
})();
