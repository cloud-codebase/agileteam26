/**
 * RetoSnake4k - game.js
 * Core Snake Game Engine, Grid Physics, Neon Glow Canvas Rendering,
 * Input Handling & Lifecycle State Machine.
 * Adheres to DESIGN.md and integrates with window.CyberAudio,
 * window.PowerUpManager, and window.LeaderboardManager.
 */

(function () {
  'use strict';

  // Game States
  const STATES = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
  };

  // Grid Configuration
  const GRID_COLS = 40;
  const GRID_ROWS = 30;
  const TILE_SIZE = 20; // 40 * 20 = 800 width, 30 * 20 = 600 height

  // Speed Parameters (ms per grid tick)
  const BASE_TICK_RATE = 110; // ~9 moves/sec at 1.0x
  const MIN_TICK_RATE = 45;   // Maximum speed cap

  // Direction Vectors
  const DIR = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
  };

  class CyberSnakeEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;

      // State machine
      this.state = STATES.START;

      // Score and progression
      this.score = 0;
      this.highScore = 0;
      this.wave = 1;
      this.multiplier = 1.0;
      this.foodEaten = 0;

      // Power-up modifiable properties
      this.ghostMode = false;
      this.speedMultiplier = 1.0;
      this.scoreMultiplier = 1.0;

      // Physics & grid entities
      this.snake = [];
      this.direction = DIR.RIGHT;
      this.nextDirection = DIR.RIGHT;
      this.food = { x: 10, y: 10 };
      this.particles = [];

      // Timing / Loop
      this.lastTickTime = 0;
      this.lastFrameTime = 0;
      this.animationFrameId = null;

      // Cached DOM Elements
      this.dom = {};
    }

    /**
     * Initializes engine once DOM is loaded
     */
    init() {
      this.canvas = document.getElementById('game-canvas');
      if (!this.canvas) {
        console.error('CyberSnakeEngine: #game-canvas not found!');
        return;
      }

      this.ctx = this.canvas.getContext('2d');
      // Ensure native resolution
      this.canvas.width = GRID_COLS * TILE_SIZE; // 800
      this.canvas.height = GRID_ROWS * TILE_SIZE; // 600

      // Cache DOM elements defensively
      this.dom = {
        score: document.getElementById('score-display'),
        highScore: document.getElementById('high-score-display'),
        multiplier: document.getElementById('multiplier-display'),
        startOverlay: document.getElementById('start-overlay'),
        pauseOverlay: document.getElementById('pause-overlay'),
        gameOverModal: document.getElementById('game-over-modal'),
        finalScore: document.getElementById('final-score'),
        recordBreakStatus: document.getElementById('record-break-status'),
        playerNameInput: document.getElementById('player-name-input'),
        saveScoreBtn: document.getElementById('save-score-btn'),
        btnStart: document.getElementById('btn-start'),
        btnPause: document.getElementById('btn-pause'),
        btnRestart: document.getElementById('btn-restart'),
        // Dpad
        dpadUp: document.getElementById('dpad-up'),
        dpadDown: document.getElementById('dpad-down'),
        dpadLeft: document.getElementById('dpad-left'),
        dpadRight: document.getElementById('dpad-right'),
        dpadCenter: document.getElementById('dpad-center')
      };

      // Load persistent high score
      this.loadHighScore();

      // Bind input listeners
      this.bindControls();

      // Setup initial visual stage
      this.resetGame();
      this.state = STATES.START;
      this.updateOverlays();

      // Start rendering loop (draws grid/background in START state)
      this.lastFrameTime = performance.now();
      this.lastTickTime = performance.now();
      this.loop = this.loop.bind(this);
      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * Loads high score from LeaderboardManager or localStorage
     */
    loadHighScore() {
      if (window.LeaderboardManager && typeof window.LeaderboardManager.getScores === 'function') {
        const scores = window.LeaderboardManager.getScores();
        if (scores && scores.length > 0) {
          this.highScore = Math.max(...scores.map(s => s.score || 0));
        }
      } else {
        try {
          const raw = localStorage.getItem('retosnake4k_scores');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.highScore = Math.max(...parsed.map(s => s.score || 0));
            }
          }
        } catch (e) {
          this.highScore = 5000;
        }
      }
      this.updateHud();
    }

    /**
     * Resets game variables for a fresh run
     */
    resetGame() {
      const midX = Math.floor(GRID_COLS / 2);
      const midY = Math.floor(GRID_ROWS / 2);

      this.snake = [
        { x: midX, y: midY },
        { x: midX - 1, y: midY },
        { x: midX - 2, y: midY },
        { x: midX - 3, y: midY }
      ];

      this.direction = DIR.RIGHT;
      this.nextDirection = DIR.RIGHT;
      this.score = 0;
      this.wave = 1;
      this.foodEaten = 0;
      this.ghostMode = false;
      this.speedMultiplier = 1.0;
      this.scoreMultiplier = 1.0;
      this.particles = [];

      if (window.PowerUpManager && typeof window.PowerUpManager.reset === 'function') {
        window.PowerUpManager.reset();
      }

      this.spawnFood();
      this.updateHud();
    }

    /**
     * Spawns food at a random unoccupied cell
     */
    spawnFood() {
      let valid = false;
      let attempts = 0;
      let newX = 5;
      let newY = 5;

      while (!valid && attempts < 100) {
        attempts++;
        newX = Math.floor(Math.random() * (GRID_COLS - 2)) + 1;
        newY = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;

        const onSnake = this.snake.some(segment => segment.x === newX && segment.y === newY);
        const powerup = window.PowerUpManager && typeof window.PowerUpManager.getCurrentGridItem === 'function'
          ? window.PowerUpManager.getCurrentGridItem()
          : null;
        const onPowerup = powerup && powerup.x === newX && powerup.y === newY;

        if (!onSnake && !onPowerup) {
          valid = true;
        }
      }

      this.food = { x: newX, y: newY, spawnTime: performance.now() };

      // Power-up spawn attempt on food creation
      if (window.PowerUpManager && typeof window.PowerUpManager.spawn === 'function') {
        window.PowerUpManager.spawn(GRID_COLS, GRID_ROWS, this.snake, this.food);
      }
    }

    /**
     * Starts or restarts the active run
     */
    startGame() {
      if (window.CyberAudio) {
        window.CyberAudio.init();
        window.CyberAudio.startArp();
        window.CyberAudio.playTone('click');
      }

      this.resetGame();
      this.state = STATES.PLAYING;
      this.lastTickTime = performance.now();
      this.updateOverlays();
    }

    /**
     * Toggles between PLAYING and PAUSED
     */
    togglePause() {
      if (this.state === STATES.PLAYING) {
        this.state = STATES.PAUSED;
        if (window.CyberAudio) {
          window.CyberAudio.stopArp();
          window.CyberAudio.playTone('click');
        }
      } else if (this.state === STATES.PAUSED) {
        this.state = STATES.PLAYING;
        this.lastTickTime = performance.now();
        if (window.CyberAudio) {
          window.CyberAudio.startArp();
          window.CyberAudio.playTone('click');
        }
      }
      this.updateOverlays();
    }

    /**
     * Ends game on collision flatline
     */
    gameOver() {
      this.state = STATES.GAME_OVER;

      if (window.CyberAudio) {
        window.CyberAudio.stopArp();
        window.CyberAudio.playTone('death');
        setTimeout(() => {
          if (window.CyberAudio) window.CyberAudio.playTone('glitch');
        }, 300);
      }

      // Spawn collision burst explosion
      if (this.snake.length > 0) {
        this.createExplosion(this.snake[0].x * TILE_SIZE + TILE_SIZE / 2, this.snake[0].y * TILE_SIZE + TILE_SIZE / 2, '#ff0055', 40);
      }

      // Check record break
      const isRecordBreak = this.score > this.highScore;
      if (isRecordBreak) {
        this.highScore = this.score;
      }

      if (this.dom.finalScore) {
        this.dom.finalScore.textContent = this.score.toLocaleString();
      }
      if (this.dom.recordBreakStatus) {
        this.dom.recordBreakStatus.textContent = isRecordBreak ? 'NEW RECORD!' : 'NO';
        this.dom.recordBreakStatus.style.color = isRecordBreak ? '#ffe600' : '#727b9c';
      }

      this.updateOverlays();
      this.updateHud();
    }

    /**
     * Updates visibility of start, pause, and game over overlays
     */
    updateOverlays() {
      if (this.dom.startOverlay) {
        if (this.state === STATES.START) {
          this.dom.startOverlay.classList.remove('hidden');
        } else {
          this.dom.startOverlay.classList.add('hidden');
        }
      }

      if (this.dom.pauseOverlay) {
        if (this.state === STATES.PAUSED) {
          this.dom.pauseOverlay.classList.remove('hidden');
        } else {
          this.dom.pauseOverlay.classList.add('hidden');
        }
      }

      if (this.dom.gameOverModal) {
        if (this.state === STATES.GAME_OVER) {
          this.dom.gameOverModal.classList.remove('hidden');
        } else {
          this.dom.gameOverModal.classList.add('hidden');
        }
      }
    }

    /**
     * Updates HUD numbers and statuses
     */
    updateHud() {
      if (this.dom.score) {
        this.dom.score.textContent = String(this.score).padStart(5, '0');
      }
      if (this.dom.highScore) {
        this.dom.highScore.textContent = String(this.highScore).padStart(5, '0');
      }
      if (this.dom.multiplier) {
        const mult = this.scoreMultiplier || 1.0;
        this.dom.multiplier.textContent = `x${mult.toFixed(1)}`;
      }
    }

    /**
     * Direction change with 180° turn prevention
     */
    setDirection(newDir) {
      if (this.state !== STATES.PLAYING) return;

      // Prevent reversing directly onto opposite direction
      const isOpposite = (this.direction.x + newDir.x === 0) && (this.direction.y + newDir.y === 0);
      if (!isOpposite) {
        this.nextDirection = newDir;
      }
    }

    /**
     * Binds keyboard, touch dpad, and UI buttons
     */
    bindControls() {
      // Keyboard input
      window.addEventListener('keydown', (e) => {
        // Prevent default scrolling for game keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }

        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            this.setDirection(DIR.UP);
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            this.setDirection(DIR.DOWN);
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            this.setDirection(DIR.LEFT);
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            this.setDirection(DIR.RIGHT);
            break;
          case ' ':
          case 'p':
          case 'P':
            if (this.state === STATES.PLAYING || this.state === STATES.PAUSED) {
              this.togglePause();
            } else if (this.state === STATES.START) {
              this.startGame();
            }
            break;
          case 'm':
          case 'M':
            if (window.CyberAudio && typeof window.CyberAudio.toggleMute === 'function') {
              const muted = window.CyberAudio.toggleMute();
              const audioStatus = document.getElementById('audio-status');
              const audioIcon = document.getElementById('audio-icon');
              if (audioStatus) audioStatus.textContent = muted ? 'OFF' : 'ON';
              if (audioIcon) audioIcon.textContent = muted ? '🔇' : '🔊';
            }
            break;
          default:
            break;
        }
      });

      // UI Overlay Buttons
      if (this.dom.btnStart) {
        this.dom.btnStart.addEventListener('click', () => this.startGame());
      }
      if (this.dom.btnPause) {
        this.dom.btnPause.addEventListener('click', () => this.togglePause());
      }
      if (this.dom.btnRestart) {
        this.dom.btnRestart.addEventListener('click', () => this.startGame());
      }

      // Virtual D-Pad buttons
      if (this.dom.dpadUp) {
        this.dom.dpadUp.addEventListener('click', () => this.setDirection(DIR.UP));
      }
      if (this.dom.dpadDown) {
        this.dom.dpadDown.addEventListener('click', () => this.setDirection(DIR.DOWN));
      }
      if (this.dom.dpadLeft) {
        this.dom.dpadLeft.addEventListener('click', () => this.setDirection(DIR.LEFT));
      }
      if (this.dom.dpadRight) {
        this.dom.dpadRight.addEventListener('click', () => this.setDirection(DIR.RIGHT));
      }
      if (this.dom.dpadCenter) {
        this.dom.dpadCenter.addEventListener('click', () => this.togglePause());
      }

      // Score save button
      if (this.dom.saveScoreBtn) {
        this.dom.saveScoreBtn.addEventListener('click', () => {
          const handle = (this.dom.playerNameInput && this.dom.playerNameInput.value)
            ? this.dom.playerNameInput.value.trim()
            : 'CYBER_GHOST';

          if (window.LeaderboardManager && typeof window.LeaderboardManager.saveScore === 'function') {
            window.LeaderboardManager.saveScore(handle, this.score, this.wave);
          }

          if (this.dom.saveScoreBtn) {
            this.dom.saveScoreBtn.textContent = 'SAVED!';
            this.dom.saveScoreBtn.disabled = true;
          }
        });
      }
    }

    /**
     * Calculates tick interval based on wave progression and speed multiplier
     */
    getCurrentTickRate() {
      // Base tick speeds up by 3ms per wave level
      const waveSpeedBoost = Math.min(50, (this.wave - 1) * 3);
      const effectiveBase = Math.max(MIN_TICK_RATE, BASE_TICK_RATE - waveSpeedBoost);
      const speedMult = this.speedMultiplier || 1.0;
      return Math.max(MIN_TICK_RATE, effectiveBase / speedMult);
    }

    /**
     * Single grid physics step
     */
    tick() {
      this.direction = this.nextDirection;

      const head = this.snake[0];
      let newX = head.x + this.direction.x;
      let newY = head.y + this.direction.y;

      // Wall collision or Ghost Phase wrapping
      if (newX < 0 || newX >= GRID_COLS || newY < 0 || newY >= GRID_ROWS) {
        if (this.ghostMode) {
          // Wrap around grid borders
          if (newX < 0) newX = GRID_COLS - 1;
          else if (newX >= GRID_COLS) newX = 0;
          if (newY < 0) newY = GRID_ROWS - 1;
          else if (newY >= GRID_ROWS) newY = 0;
        } else {
          this.gameOver();
          return;
        }
      }

      // Self-collision check
      const collidedWithSelf = this.snake.some((seg, idx) => {
        // Skip tail tip if moving without food (tail will move away)
        if (idx === this.snake.length - 1) return false;
        return seg.x === newX && seg.y === newY;
      });

      if (collidedWithSelf) {
        if (!this.ghostMode) {
          this.gameOver();
          return;
        }
      }

      // Move head forward
      const newHead = { x: newX, y: newY };
      this.snake.unshift(newHead);

      // Check power-up collection
      if (window.PowerUpManager && typeof window.PowerUpManager.checkCollection === 'function') {
        window.PowerUpManager.checkCollection(newHead, this);
      }

      // Check food consumption
      if (newX === this.food.x && newY === this.food.y) {
        this.foodEaten++;
        const pointsBase = 100 * this.wave;
        const totalPoints = Math.round(pointsBase * (this.scoreMultiplier || 1.0));
        this.score += totalPoints;

        if (this.score > this.highScore) {
          this.highScore = this.score;
        }

        // Progress waves every 5 foods
        this.wave = Math.floor(this.foodEaten / 5) + 1;

        if (window.CyberAudio) {
          window.CyberAudio.playTone('eat');
        }

        // Particle effect at food site
        this.createExplosion(
          this.food.x * TILE_SIZE + TILE_SIZE / 2,
          this.food.y * TILE_SIZE + TILE_SIZE / 2,
          '#00ffcc',
          16
        );

        this.spawnFood();
        this.updateHud();
      } else {
        // Remove tail segment if no food eaten
        this.snake.pop();
      }
    }

    /**
     * Spawns canvas neon particle burst
     */
    createExplosion(x, y, color, count = 12) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
        const speed = Math.random() * 3 + 1.5;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: color,
          size: Math.random() * 3 + 1.5,
          alpha: 1.0,
          decay: Math.random() * 0.03 + 0.02
        });
      }
    }

    /**
     * Updates particles
     */
    updateParticles(deltaTime) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    /**
     * Main animation loop
     */
    loop(currentTime) {
      const deltaMs = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;
      const deltaSec = Math.min(0.1, deltaMs / 1000);

      // Update PowerUps manager duration timers
      if (this.state === STATES.PLAYING) {
        if (window.PowerUpManager && typeof window.PowerUpManager.update === 'function') {
          window.PowerUpManager.update(deltaSec, this);
        }

        // Grid physics step
        const tickInterval = this.getCurrentTickRate();
        if (currentTime - this.lastTickTime >= tickInterval) {
          this.tick();
          this.lastTickTime = currentTime;
        }
      }

      this.updateParticles(deltaSec);
      this.render();

      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * Canvas neon rendering pipeline
     */
    render() {
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;

      // 1. Clear background with subtle cyberpunk depth
      ctx.fillStyle = '#050612';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw cyber grid lines
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Render Power-Up item on grid if active
      if (window.PowerUpManager && typeof window.PowerUpManager.render === 'function') {
        window.PowerUpManager.render(ctx, TILE_SIZE);
      }

      // 4. Render Neon Food Node (Memory Core)
      this.renderFood(ctx);

      // 5. Render Neon Snake Body & Head
      this.renderSnake(ctx);

      // 6. Render Explosive Particles
      this.renderParticles(ctx);
    }

    /**
     * Draws neon pulsing food node
     */
    renderFood(ctx) {
      const px = this.food.x * TILE_SIZE;
      const py = this.food.y * TILE_SIZE;
      const center = TILE_SIZE / 2;

      const pulse = Math.sin(performance.now() / 180) * 0.25 + 0.85;
      const radius = (TILE_SIZE / 2.6) * pulse;

      ctx.save();
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 18;

      // Outer diamond / circle
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.arc(px + center, py + center, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white data core
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px + center, py + center, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    /**
     * Draws neon snake with gradient and head HUD visor
     */
    renderSnake(ctx) {
      if (this.snake.length === 0) return;

      ctx.save();

      const isGhost = this.ghostMode;
      const primaryColor = isGhost ? '#bc13fe' : '#39ff14';
      const glowColor = isGhost ? 'rgba(188, 19, 254, 0.85)' : 'rgba(57, 255, 20, 0.85)';

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;

      // Draw body segments
      for (let i = this.snake.length - 1; i >= 1; i--) {
        const seg = this.snake[i];
        const segPx = seg.x * TILE_SIZE;
        const segPy = seg.y * TILE_SIZE;

        const factor = 1 - (i / this.snake.length) * 0.55;
        ctx.fillStyle = isGhost ? `rgba(188, 19, 254, ${factor})` : `rgba(57, 255, 20, ${factor})`;

        const pad = 2;
        ctx.fillRect(segPx + pad, segPy + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);
      }

      // Draw Snake Head
      const head = this.snake[0];
      const hx = head.x * TILE_SIZE;
      const hy = head.y * TILE_SIZE;

      ctx.shadowBlur = 20;
      ctx.fillStyle = primaryColor;
      ctx.fillRect(hx + 1, hy + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Head visor eye indicator
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      const eyeOffset = 4;
      const eyeSize = 3;

      let eyeX1 = hx + eyeOffset;
      let eyeY1 = hy + eyeOffset;
      let eyeX2 = hx + TILE_SIZE - eyeOffset - eyeSize;
      let eyeY2 = hy + eyeOffset;

      if (this.direction === DIR.DOWN) {
        eyeY1 = hy + TILE_SIZE - eyeOffset - eyeSize;
        eyeY2 = hy + TILE_SIZE - eyeOffset - eyeSize;
      } else if (this.direction === DIR.LEFT) {
        eyeX1 = hx + eyeOffset;
        eyeX2 = hx + eyeOffset;
        eyeY1 = hy + eyeOffset;
        eyeY2 = hy + TILE_SIZE - eyeOffset - eyeSize;
      } else if (this.direction === DIR.RIGHT) {
        eyeX1 = hx + TILE_SIZE - eyeOffset - eyeSize;
        eyeX2 = hx + TILE_SIZE - eyeOffset - eyeSize;
        eyeY1 = hy + eyeOffset;
        eyeY2 = hy + TILE_SIZE - eyeOffset - eyeSize;
      }

      ctx.fillRect(eyeX1, eyeY1, eyeSize, eyeSize);
      ctx.fillRect(eyeX2, eyeY2, eyeSize, eyeSize);

      ctx.restore();
    }

    /**
     * Renders explosive particles
     */
    renderParticles(ctx) {
      if (this.particles.length === 0) return;

      ctx.save();
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Instantiate and expose globally
  const engine = new CyberSnakeEngine();
  window.CyberSnake = engine;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.init());
  } else {
    engine.init();
  }
})();
