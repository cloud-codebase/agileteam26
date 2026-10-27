/**
 * Retro Snake Game - Core Game Engine
 * Adheres to DESIGN.md specification
 * Exposed as window.SnakeGame
 */

(function (global) {
  'use strict';

  class SnakeGame {
    /**
     * @param {HTMLCanvasElement|string} canvasElement - Canvas element or query selector
     * @param {Object} [options]
     * @param {number} [options.gridSize=20] - Size of grid cells in pixels
     * @param {function(number): void} [options.onScore] - Callback when score changes
     * @param {function(number): void} [options.onGameOver] - Callback when game is over
     * @param {function(): void} [options.onFoodEat] - Callback when food is eaten
     * @param {number} [options.speed=130] - Base tick speed in milliseconds
     * @param {number} [options.pointsPerFood=10] - Points awarded per food item
     */
    constructor(canvasElement, options = {}) {
      if (typeof canvasElement === 'string') {
        this.canvas = document.querySelector(canvasElement);
      } else {
        this.canvas = canvasElement;
      }

      this.ctx = this.canvas && typeof this.canvas.getContext === 'function'
        ? this.canvas.getContext('2d')
        : null;

      // Configuration options
      this.gridSize = Number(options.gridSize) || 20;
      this.onScore = typeof options.onScore === 'function' ? options.onScore : () => {};
      this.onGameOver = typeof options.onGameOver === 'function' ? options.onGameOver : () => {};
      this.onFoodEat = typeof options.onFoodEat === 'function' ? options.onFoodEat : () => {};
      this.pointsPerFood = Number(options.pointsPerFood) || 10;
      this.initialSpeed = Number(options.speed) || 130;

      // State variables
      this.score = 0;
      this.speed = this.initialSpeed;
      this.isRunning = false;
      this.isPaused = false;
      this.isGameOver = false;

      this.direction = 'RIGHT';
      this.directionQueue = [];
      this.snake = [];
      this.food = { x: 0, y: 0 };

      this.timerId = null;

      // Initialize game state and render canvas
      this.reset();
    }

    /**
     * Number of columns on the grid
     * @returns {number}
     */
    _getCols() {
      if (!this.canvas || !this.canvas.width) return 20;
      return Math.max(1, Math.floor(this.canvas.width / this.gridSize));
    }

    /**
     * Number of rows on the grid
     * @returns {number}
     */
    _getRows() {
      if (!this.canvas || !this.canvas.height) return 20;
      return Math.max(1, Math.floor(this.canvas.height / this.gridSize));
    }

    /**
     * Resets snake to center, score to 0, and regenerates food.
     */
    reset() {
      this._stopTimer();

      this.score = 0;
      this.speed = this.initialSpeed;
      this.direction = 'RIGHT';
      this.directionQueue = [];
      this.isRunning = false;
      this.isPaused = false;
      this.isGameOver = false;

      const cols = this._getCols();
      const rows = this._getRows();
      const midX = Math.floor(cols / 2);
      const midY = Math.floor(rows / 2);

      // Starting snake: 3 segments facing RIGHT
      this.snake = [
        { x: midX, y: midY },
        { x: midX - 1, y: midY },
        { x: midX - 2, y: midY }
      ];

      this._spawnFood();

      try {
        this.onScore(this.score);
      } catch (e) {
        console.error('Error in onScore callback during reset:', e);
      }

      this.render();
    }

    /**
     * Starts or resumes game loop.
     */
    start() {
      if (this.isGameOver) {
        this.reset();
      }

      if (this.isRunning && !this.isPaused) {
        return; // Already actively running
      }

      this.isRunning = true;
      this.isPaused = false;

      this._scheduleNextTick();
      this.render();
    }

    /**
     * Halts game loop ticks.
     */
    pause() {
      if (!this.isRunning || this.isPaused || this.isGameOver) {
        return;
      }

      this.isPaused = true;
      this.isRunning = false;
      this._stopTimer();
      this.render();
    }

    /**
     * Accepts 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'. Ignores reverse direction.
     * Buffers input via queue to prevent 180-degree self-collision bugs.
     * @param {string} dir
     */
    setDirection(dir) {
      if (!dir || typeof dir !== 'string') return;
      const upper = dir.trim().toUpperCase();

      const opposites = {
        UP: 'DOWN',
        DOWN: 'UP',
        LEFT: 'RIGHT',
        RIGHT: 'LEFT'
      };

      if (!opposites[upper]) return; // Invalid direction

      // Check against the last queued direction or the current active direction
      const lastDir = this.directionQueue.length > 0
        ? this.directionQueue[this.directionQueue.length - 1]
        : this.direction;

      // Prevent exact same direction or exact opposite direction
      if (upper !== lastDir && upper !== opposites[lastDir]) {
        // Limit queue length to 2 moves to prevent control lag
        if (this.directionQueue.length < 2) {
          this.directionQueue.push(upper);
        }
      }
    }

    /**
     * Returns current game state.
     * @returns {{ score: number, isRunning: boolean, isPaused: boolean, isGameOver: boolean, speed: number }}
     */
    getState() {
      return {
        score: this.score,
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        isGameOver: this.isGameOver,
        speed: this.speed
      };
    }

    /**
     * Schedules the next tick using setTimeout
     */
    _scheduleNextTick() {
      this._stopTimer();
      if (!this.isRunning || this.isPaused || this.isGameOver) {
        return;
      }

      this.timerId = setTimeout(() => {
        this.tick();
        if (this.isRunning && !this.isPaused && !this.isGameOver) {
          this._scheduleNextTick();
        }
      }, this.speed);
    }

    /**
     * Clears active timer
     */
    _stopTimer() {
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
    }

    /**
     * Spawns food at random unoccupied grid coordinate.
     */
    _spawnFood() {
      const cols = this._getCols();
      const rows = this._getRows();
      const emptyCells = [];

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const isSnakeCell = this.snake.some(segment => segment.x === x && segment.y === y);
          if (!isSnakeCell) {
            emptyCells.push({ x, y });
          }
        }
      }

      if (emptyCells.length === 0) {
        // Grid is completely filled (game won)
        return;
      }

      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      this.food = emptyCells[randomIndex];
    }

    /**
     * Advances game mechanics by one tick.
     * Publicly callable for deterministic step-by-step testing.
     */
    tick() {
      if (this.isGameOver || this.isPaused) {
        return;
      }

      // Dequeue next valid direction if available
      if (this.directionQueue.length > 0) {
        this.direction = this.directionQueue.shift();
      }

      // Compute new head coordinates
      const head = { ...this.snake[0] };
      switch (this.direction) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      const cols = this._getCols();
      const rows = this._getRows();

      // Check wall collision
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        this._handleGameOver();
        return;
      }

      // Check self collision
      const isEating = (head.x === this.food.x && head.y === this.food.y);
      // If not eating, tail will move out of the way this tick
      const segmentsToCheck = isEating ? this.snake : this.snake.slice(0, -1);
      const hasSelfCollision = segmentsToCheck.some(seg => seg.x === head.x && seg.y === head.y);

      if (hasSelfCollision) {
        this._handleGameOver();
        return;
      }

      // Move snake: add new head to front
      this.snake.unshift(head);

      if (isEating) {
        this.score += this.pointsPerFood;
        // Dynamically accelerate speed with a floor of 50ms
        this.speed = Math.max(50, this.initialSpeed - Math.floor(this.score / this.pointsPerFood) * 2);

        try {
          this.onFoodEat();
        } catch (e) {
          console.error('Error in onFoodEat callback:', e);
        }

        try {
          this.onScore(this.score);
        } catch (e) {
          console.error('Error in onScore callback:', e);
        }

        this._spawnFood();
      } else {
        // Remove tail
        this.snake.pop();
      }

      this.render();
    }

    /**
     * Handles game over state transition and triggers callback.
     */
    _handleGameOver() {
      this.isGameOver = true;
      this.isRunning = false;
      this.isPaused = false;
      this._stopTimer();

      this.render();

      try {
        this.onGameOver(this.score);
      } catch (e) {
        console.error('Error in onGameOver callback:', e);
      }
    }

    /**
     * Renders the retro arcade grid, snake, food, and overlay states on canvas.
     */
    render() {
      if (!this.canvas || !this.ctx) return;

      const ctx = this.ctx;
      const width = this.canvas.width || 400;
      const height = this.canvas.height || 400;
      const cols = this._getCols();
      const rows = this._getRows();
      const cellW = width / cols;
      const cellH = height / rows;

      // 1. Dark Arcade Background
      ctx.fillStyle = '#0a0d18';
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Grid Lines
      ctx.strokeStyle = 'rgba(26, 38, 74, 0.35)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= cols; c++) {
        const x = Math.floor(c * cellW) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const y = Math.floor(r * cellH) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Render Food (Neon Pulsing Cherry / Gem with Glow)
      if (this.food) {
        const fx = this.food.x * cellW + cellW / 2;
        const fy = this.food.y * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) * 0.38;

        ctx.save();
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;

        // Food core
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(fx, fy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Food center highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff88aa';
        ctx.beginPath();
        ctx.arc(fx - radius * 0.3, fy - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Render Snake Body & Head
      const snakeLen = this.snake.length;
      for (let i = snakeLen - 1; i >= 0; i--) {
        const seg = this.snake[i];
        const x = seg.x * cellW + 1.5;
        const y = seg.y * cellH + 1.5;
        const w = cellW - 3;
        const h = cellH - 3;
        const isHead = (i === 0);

        ctx.save();
        if (this.isGameOver) {
          // Dim / Reddish tone on game over
          ctx.fillStyle = isHead ? '#ff3366' : '#882244';
          ctx.shadowColor = '#ff3366';
          ctx.shadowBlur = isHead ? 8 : 0;
        } else if (isHead) {
          // Bright Neon Green/Cyan Head with High Glow
          ctx.fillStyle = '#00ff88';
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 12;
        } else {
          // Neon Gradient-like Body Segments
          const ratio = i / snakeLen;
          ctx.fillStyle = ratio > 0.6 ? '#00b862' : '#00e676';
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 4;
        }

        // Draw rounded rectangle for segment
        this._drawRoundedRect(ctx, x, y, w, h, 3);
        ctx.fill();

        // Draw Eyes on Head
        if (isHead) {
          ctx.shadowBlur = 0;
          this._drawSnakeEyes(ctx, seg.x * cellW, seg.y * cellH, cellW, cellH, this.direction);
        }

        ctx.restore();
      }

      // 5. Overlays (Paused state visual)
      if (this.isPaused) {
        ctx.save();
        ctx.fillStyle = 'rgba(10, 13, 24, 0.75)';
        ctx.fillRect(0, 0, width, height);

        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', width / 2, height / 2);
        ctx.restore();
      }
    }

    /**
     * Helper to draw rounded rectangle paths
     */
    _drawRoundedRect(ctx, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.arcTo(x + width, y, x + width, y + r, r);
      ctx.lineTo(x + width, y + height - r);
      ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
      ctx.lineTo(x + r, y + height);
      ctx.arcTo(x, y + height, x, y + height - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }

    /**
     * Helper to render snake eyes directed towards movement direction
     */
    _drawSnakeEyes(ctx, cellX, cellY, cellW, cellH, direction) {
      const eyeColor = '#05120b';
      const eyeGlint = '#ffffff';
      const eyeRadius = Math.max(1.5, Math.min(cellW, cellH) * 0.1);

      let e1x, e1y, e2x, e2y;

      switch (direction) {
        case 'UP':
          e1x = cellX + cellW * 0.3;
          e1y = cellY + cellH * 0.28;
          e2x = cellX + cellW * 0.7;
          e2y = cellY + cellH * 0.28;
          break;
        case 'DOWN':
          e1x = cellX + cellW * 0.3;
          e1y = cellY + cellH * 0.72;
          e2x = cellX + cellW * 0.7;
          e2y = cellY + cellH * 0.72;
          break;
        case 'LEFT':
          e1x = cellX + cellW * 0.28;
          e1y = cellY + cellH * 0.3;
          e2x = cellX + cellW * 0.28;
          e2y = cellY + cellH * 0.7;
          break;
        case 'RIGHT':
        default:
          e1x = cellX + cellW * 0.72;
          e1y = cellY + cellH * 0.3;
          e2x = cellX + cellW * 0.72;
          e2y = cellY + cellH * 0.7;
          break;
      }

      // Draw pupils
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(e1x, e1y, eyeRadius, 0, Math.PI * 2);
      ctx.arc(e2x, e2y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Tiny glint
      ctx.fillStyle = eyeGlint;
      ctx.beginPath();
      ctx.arc(e1x - 0.5, e1y - 0.5, eyeRadius * 0.4, 0, Math.PI * 2);
      ctx.arc(e2x - 0.5, e2y - 0.5, eyeRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Export to window and CommonJS / Node environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SnakeGame;
  }
  if (typeof global !== 'undefined') {
    global.SnakeGame = SnakeGame;
  }
})(typeof window !== 'undefined' ? window : globalThis);
