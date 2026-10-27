/**
 * Retro Snake 20 - UI Controller & Audio Manager
 * Adheres strictly to DESIGN.md specification
 * Implemented for SCRUM-98
 */

(function (global) {
  'use strict';

  const HIGH_SCORE_STORAGE_KEY = 'snake_high_score';

  /**
   * Retro Synth Sound Effects via Web Audio API
   * Exposed as window.AudioManager
   */
  class AudioManager {
    constructor() {
      this.ctx = null;
      this.muted = false;
    }

    /**
     * Lazily initialize or resume AudioContext upon user gesture
     * @returns {AudioContext|null}
     */
    getContext() {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          try {
            this.ctx = new AudioContextClass();
          } catch (e) {
            console.warn('Web Audio API not supported or accessible:', e);
          }
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    /**
     * High-pitch ascending retro beep on food eaten
     */
    playEat() {
      try {
        const ctx = this.getContext();
        if (!ctx || this.muted) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.13);
      } catch (e) {
        // Fallback gracefully
      }
    }

    /**
     * Low-pitch descending crash noise on collision
     */
    playDie() {
      try {
        const ctx = this.getContext();
        if (!ctx || this.muted) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.38);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.39);
      } catch (e) {
        // Fallback gracefully
      }
    }

    /**
     * Subtle soft click on movement input
     */
    playMove() {
      try {
        const ctx = this.getContext();
        if (!ctx || this.muted) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.035);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
      } catch (e) {
        // Fallback gracefully
      }
    }
  }

  // Provide singleton delegates so AudioManager can be called either statically or instantiated
  AudioManager._instance = null;
  AudioManager.getInstance = function () {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  };
  AudioManager.playEat = function () {
    return AudioManager.getInstance().playEat();
  };
  AudioManager.playDie = function () {
    return AudioManager.getInstance().playDie();
  };
  AudioManager.playMove = function () {
    return AudioManager.getInstance().playMove();
  };

  /**
   * Main Retro Snake Application Controller
   */
  class RetroSnakeApp {
    constructor() {
      this.audioManager = AudioManager.getInstance();
      this.game = null;
      this.highScore = 0;

      // DOM Elements Cache
      this.canvas = null;
      this.canvasContainer = null;
      this.scoreDisplay = null;
      this.highScoreDisplay = null;
      this.startBtn = null;
      this.resetBtn = null;
      this.gameOverModal = null;
      this.finalScoreDisplay = null;
      this.modalRestartBtn = null;
      this.dpad = null;
    }

    /**
     * Safely reads high score from localStorage
     * @returns {number}
     */
    loadHighScore() {
      try {
        const stored = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      } catch (e) {
        console.warn('Could not read high score from localStorage:', e);
        return 0;
      }
    }

    /**
     * Safely saves high score to localStorage
     * @param {number} score
     */
    saveHighScore(score) {
      try {
        localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(score));
      } catch (e) {
        console.warn('Could not save high score to localStorage:', e);
      }
    }

    /**
     * Updates score and high score displays
     * @param {number} currentScore
     */
    updateScoreDisplays(currentScore) {
      if (this.scoreDisplay) {
        this.scoreDisplay.textContent = String(currentScore);
      }

      if (currentScore > this.highScore) {
        this.highScore = currentScore;
        this.saveHighScore(this.highScore);
      }

      if (this.highScoreDisplay) {
        this.highScoreDisplay.textContent = String(this.highScore);
      }
    }

    /**
     * Shows the Game Over modal overlay
     * @param {number} finalScore
     */
    showGameOver(finalScore) {
      if (this.finalScoreDisplay) {
        this.finalScoreDisplay.textContent = String(finalScore);
      }
      if (this.gameOverModal) {
        this.gameOverModal.classList.remove('hidden');
      }
      if (this.startBtn) {
        this.startBtn.textContent = 'START';
      }
    }

    /**
     * Hides the Game Over modal overlay
     */
    hideGameOver() {
      if (this.gameOverModal) {
        this.gameOverModal.classList.add('hidden');
      }
    }

    /**
     * Handles Start / Pause / Resume button clicks
     */
    toggleStartPause() {
      if (!this.game) return;

      const state = this.game.getState();
      if (state.isGameOver) {
        this.hideGameOver();
        this.game.reset();
        this.game.start();
        if (this.startBtn) this.startBtn.textContent = 'PAUSE';
      } else if (state.isRunning) {
        this.game.pause();
        if (this.startBtn) this.startBtn.textContent = 'RESUME';
      } else if (state.isPaused) {
        this.game.start();
        if (this.startBtn) this.startBtn.textContent = 'PAUSE';
      } else {
        // Initial idle or reset state
        this.game.start();
        if (this.startBtn) this.startBtn.textContent = 'PAUSE';
      }
    }

    /**
     * Resets the game to initial state
     */
    resetGame() {
      if (!this.game) return;
      this.hideGameOver();
      this.game.reset();
      if (this.startBtn) this.startBtn.textContent = 'START';
      if (this.scoreDisplay) this.scoreDisplay.textContent = '0';
    }

    /**
     * Applies directional movement input from keyboard, D-pad, or swipe
     * @param {string} dir - 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
     */
    handleDirectionInput(dir) {
      if (!this.game) return;

      const state = this.game.getState();
      if (state.isGameOver) return;

      // If game has not started yet, auto-start upon first directional press
      if (!state.isRunning && !state.isPaused) {
        this.game.start();
        if (this.startBtn) this.startBtn.textContent = 'PAUSE';
      }

      this.game.setDirection(dir);

      if (this.game.getState().isRunning) {
        this.audioManager.playMove();
      }
    }

    /**
     * Initializes DOM references and event listeners
     */
    init() {
      // 1. Query DOM Elements
      this.canvas = document.getElementById('game-canvas');
      this.canvasContainer = document.getElementById('canvas-container');
      this.scoreDisplay = document.getElementById('score-display');
      this.highScoreDisplay = document.getElementById('high-score-display');
      this.startBtn = document.getElementById('start-btn');
      this.resetBtn = document.getElementById('reset-btn');
      this.gameOverModal = document.getElementById('game-over-modal');
      this.finalScoreDisplay = document.getElementById('final-score');
      this.modalRestartBtn = document.getElementById('modal-restart-btn');
      this.dpad = document.getElementById('dpad');

      // 2. Load & Display High Score
      this.highScore = this.loadHighScore();
      if (this.highScoreDisplay) {
        this.highScoreDisplay.textContent = String(this.highScore);
      }
      if (this.scoreDisplay) {
        this.scoreDisplay.textContent = '0';
      }

      // 3. Initialize SnakeGame engine
      if (this.canvas && typeof window.SnakeGame === 'function') {
        this.game = new window.SnakeGame(this.canvas, {
          gridSize: 20,
          speed: 130,
          pointsPerFood: 10,
          onScore: (score) => {
            this.updateScoreDisplays(score);
          },
          onFoodEat: () => {
            this.audioManager.playEat();
          },
          onGameOver: (finalScore) => {
            this.audioManager.playDie();
            this.showGameOver(finalScore);
          }
        });
      }

      // 4. Bind Action Bar Buttons
      if (this.startBtn) {
        this.startBtn.addEventListener('click', () => {
          this.toggleStartPause();
        });
      }

      if (this.resetBtn) {
        this.resetBtn.addEventListener('click', () => {
          this.resetGame();
        });
      }

      // 5. Bind Modal Restart Button
      if (this.modalRestartBtn) {
        this.modalRestartBtn.addEventListener('click', () => {
          this.hideGameOver();
          if (this.game) {
            this.game.reset();
            this.game.start();
          }
          if (this.startBtn) {
            this.startBtn.textContent = 'PAUSE';
          }
        });
      }

      // 6. Bind Keyboard Controls (Arrows + WASD + Space)
      window.addEventListener('keydown', (e) => {
        const key = e.key;

        // Prevent window scrolling for navigation keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(key)) {
          e.preventDefault();
        }

        switch (key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            this.handleDirectionInput('UP');
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            this.handleDirectionInput('DOWN');
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            this.handleDirectionInput('LEFT');
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            this.handleDirectionInput('RIGHT');
            break;
          case ' ':
          case 'Spacebar':
            this.toggleStartPause();
            break;
          default:
            break;
        }
      });

      // 7. Bind Virtual D-Pad Touch and Click Controls
      const dpadMappings = [
        { id: 'dpad-up', dir: 'UP' },
        { id: 'dpad-down', dir: 'DOWN' },
        { id: 'dpad-left', dir: 'LEFT' },
        { id: 'dpad-right', dir: 'RIGHT' }
      ];

      dpadMappings.forEach(({ id, dir }) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleDirectionInput(dir);
          }, { passive: false });

          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDirectionInput(dir);
          });
        }
      });

      // 8. Bind Mobile Swipe Gestures on Canvas Container
      const touchSurface = this.canvasContainer || this.canvas;
      if (touchSurface) {
        let touchStartX = 0;
        let touchStartY = 0;

        touchSurface.addEventListener('touchstart', (e) => {
          if (e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        }, { passive: true });

        touchSurface.addEventListener('touchend', (e) => {
          if (e.changedTouches && e.changedTouches.length > 0) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            const minSwipeDist = 20;

            if (Math.max(absX, absY) > minSwipeDist) {
              if (absX > absY) {
                this.handleDirectionInput(dx > 0 ? 'RIGHT' : 'LEFT');
              } else {
                this.handleDirectionInput(dy > 0 ? 'DOWN' : 'UP');
              }
            }
          }
        }, { passive: true });
      }
    }
  }

  // Export classes and instance
  const appInstance = new RetroSnakeApp();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioManager, RetroSnakeApp, appInstance };
  }

  if (typeof global !== 'undefined') {
    global.AudioManager = AudioManager;
    global.RetroSnakeApp = RetroSnakeApp;
    global.snakeApp = appInstance;
  }

  // Auto-initialize when document is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => appInstance.init());
    } else {
      appInstance.init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
