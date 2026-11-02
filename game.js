/**
 * game.js - Main Game Engine, Game Loop, State Transitions, Collision Detector & HUD
 * Exposes window.GameEngine
 */

(function () {
  'use strict';

  class GameEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 800;
      this.height = 600;

      // State Machine: 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'WAVECLEAR'
      this.state = 'START';

      // Gameplay metrics
      this.score = 0;
      this.highScore = 0;
      this.lives = 3;
      this.maxLives = 3;
      this.wave = 1;
      this.waveClearTimer = 0;

      // Timing
      this.lastTimestamp = 0;
      this.animationFrameId = null;

      // DOM Elements Cache
      this.scoreDisplay = null;
      this.highScoreDisplay = null;
      this.waveDisplay = null;
      this.livesDisplay = null;
      this.startModal = null;
      this.pauseModal = null;
      this.gameOverModal = null;
      this.finalScoreVal = null;
      this.newHighScoreMsg = null;
      this.startBtn = null;
      this.resumeBtn = null;
      this.restartBtn = null;
      this.audioMuteBtn = null;
      this.audioIcon = null;

      // Starfield background
      this.stars = [];
    }

    /**
     * Initializes engine, hooks DOM, loads high score, and kicks off loop
     */
    init() {
      this.canvas = document.getElementById('game-canvas');
      if (!this.canvas) {
        console.error('Game canvas element not found');
        return;
      }

      this.ctx = this.canvas.getContext('2d');
      this.width = this.canvas.width || 800;
      this.height = this.canvas.height || 600;

      this._cacheDOMElements();
      this._loadHighScore();
      this._initStarfield();
      this._bindEvents();

      // Initialize sub-managers
      if (window.PlayerManager && typeof window.PlayerManager.init === 'function') {
        window.PlayerManager.init(this.width, this.height);
      }
      if (window.InvaderManager && typeof window.InvaderManager.init === 'function') {
        window.InvaderManager.init(this.wave, this.width, this.height);
      }

      this.updateHUD();
      this.setState('START');

      // Start RAF loop
      this.lastTimestamp = performance.now();
      this.animationFrameId = requestAnimationFrame((ts) => this._loop(ts));
    }

    _cacheDOMElements() {
      this.scoreDisplay = document.getElementById('score-display');
      this.highScoreDisplay = document.getElementById('high-score-display');
      this.waveDisplay = document.getElementById('wave-display');
      this.livesDisplay = document.getElementById('lives-display');
      this.startModal = document.getElementById('start-modal');
      this.pauseModal = document.getElementById('pause-modal');
      this.gameOverModal = document.getElementById('game-over-modal');
      this.finalScoreVal = document.getElementById('final-score-val');
      this.newHighScoreMsg = document.getElementById('new-high-score-msg');
      this.startBtn = document.getElementById('start-btn');
      this.resumeBtn = document.getElementById('resume-btn');
      this.restartBtn = document.getElementById('restart-btn');
      this.audioMuteBtn = document.getElementById('audio-mute-btn');
      this.audioIcon = document.getElementById('audio-icon');
    }

    _loadHighScore() {
      try {
        const stored = localStorage.getItem('invaders_high_score');
        if (stored) {
          this.highScore = parseInt(stored, 10) || 0;
        }
      } catch (err) {
        console.warn('LocalStorage unavailable for high score', err);
        this.highScore = 0;
      }
    }

    _saveHighScore() {
      try {
        localStorage.setItem('invaders_high_score', this.highScore.toString());
      } catch (err) {
        console.warn('Could not save high score to LocalStorage', err);
      }
    }

    _initStarfield() {
      this.stars = [];
      const starCount = 60;
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          speed: 10 + Math.random() * 25,
          size: Math.random() > 0.8 ? 2 : 1,
          brightness: 0.3 + Math.random() * 0.7
        });
      }
    }

    _updateStarfield(dt) {
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        s.y += s.speed * dt;
        if (s.y > this.height) {
          s.y = 0;
          s.x = Math.random() * this.width;
        }
      }
    }

    _renderStarfield(ctx) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        ctx.globalAlpha = s.brightness;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.globalAlpha = 1.0;
    }

    _bindEvents() {
      // Buttons
      if (this.startBtn) {
        this.startBtn.addEventListener('click', () => this.startGame());
      }
      if (this.resumeBtn) {
        this.resumeBtn.addEventListener('click', () => this.resumeGame());
      }
      if (this.restartBtn) {
        this.restartBtn.addEventListener('click', () => this.restartGame());
      }
      if (this.audioMuteBtn) {
        this.audioMuteBtn.addEventListener('click', () => {
          if (window.AudioEngine && typeof window.AudioEngine.toggleMute === 'function') {
            const isMuted = window.AudioEngine.toggleMute();
            if (this.audioIcon) {
              this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
            }
          }
        });
      }

      // Keyboard Controls for Pause / Restart / Start
      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyP') {
          if (this.state === 'PLAYING') {
            this.pauseGame();
          } else if (this.state === 'PAUSED') {
            this.resumeGame();
          }
        } else if (e.code === 'Enter' || e.code === 'Space') {
          if (this.state === 'START') {
            this.startGame();
          } else if (this.state === 'GAMEOVER') {
            this.restartGame();
          }
        }
      });
    }

    setState(newState) {
      this.state = newState;

      // Update Modal Overlays
      if (this.startModal) this.startModal.classList.remove('active');
      if (this.pauseModal) this.pauseModal.classList.remove('active');
      if (this.gameOverModal) this.gameOverModal.classList.remove('active');

      if (newState === 'START' && this.startModal) {
        this.startModal.classList.add('active');
      } else if (newState === 'PAUSED' && this.pauseModal) {
        this.pauseModal.classList.add('active');
      } else if (newState === 'GAMEOVER' && this.gameOverModal) {
        this.gameOverModal.classList.add('active');
        if (this.finalScoreVal) {
          this.finalScoreVal.textContent = this.formatScore(this.score);
        }
        if (this.newHighScoreMsg) {
          this.newHighScoreMsg.style.display = (this.score >= this.highScore && this.score > 0) ? 'block' : 'none';
        }
      }
    }

    startGame() {
      this.score = 0;
      this.lives = this.maxLives;
      this.wave = 1;

      if (window.PlayerManager) {
        window.PlayerManager.init(this.width, this.height);
      }
      if (window.InvaderManager) {
        window.InvaderManager.init(this.wave, this.width, this.height);
      }

      this.updateHUD();
      this.setState('PLAYING');
    }

    pauseGame() {
      if (this.state !== 'PLAYING') return;
      if (window.AudioEngine && typeof window.AudioEngine.stopUfoSound === 'function') {
        window.AudioEngine.stopUfoSound();
      }
      this.setState('PAUSED');
    }

    resumeGame() {
      if (this.state !== 'PAUSED') return;
      this.setState('PLAYING');
    }

    restartGame() {
      this.startGame();
    }

    addScore(points) {
      this.score += points;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this._saveHighScore();
      }
      this.updateHUD();
    }

    formatScore(num) {
      return num.toString().padStart(4, '0');
    }

    updateHUD() {
      if (this.scoreDisplay) {
        this.scoreDisplay.textContent = this.formatScore(this.score);
      }
      if (this.highScoreDisplay) {
        this.highScoreDisplay.textContent = this.formatScore(this.highScore);
      }
      if (this.waveDisplay) {
        this.waveDisplay.textContent = this.wave.toString().padStart(2, '0');
      }
      if (this.livesDisplay) {
        this.livesDisplay.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
          const span = document.createElement('span');
          span.className = 'life-icon';
          span.textContent = '▲';
          this.livesDisplay.appendChild(span);
        }
      }
    }

    /**
     * Bounding box intersection check (AABB)
     */
    checkIntersect(rect1, rect2) {
      return (
        rect1.x < rect2.x + rect2.w &&
        rect1.x + rect1.w > rect2.x &&
        rect1.y < rect2.y + rect2.h &&
        rect1.y + rect1.h > rect2.y
      );
    }

    /**
     * Centralized Collision Detector:
     * 1. Player missiles vs Mystery UFO Saucer
     * 2. Player missiles vs Alien Armada
     * 3. Player missiles vs Destructible Bunkers
     * 4. Alien bombs vs Destructible Bunkers
     * 5. Alien bombs vs Player ship
     * 6. Alien armada landing / invading past defense line
     */
    _checkCollisions() {
      if (!window.PlayerManager || !window.InvaderManager) return;

      const playerBullets = window.PlayerManager.getBullets();
      const alienBombs = window.InvaderManager.getBombs();
      const livingAliens = window.InvaderManager.getAliens();
      const saucer = window.InvaderManager.getSaucer();

      // 1. Player missiles collisions
      for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
        const bullet = playerBullets[bi];
        let bulletConsumed = false;

        // A. Check vs Mystery UFO Saucer
        if (saucer && this.checkIntersect(bullet, saucer)) {
          const pts = window.InvaderManager.killSaucer();
          this.addScore(pts);
          playerBullets.splice(bi, 1);
          continue;
        }

        // B. Check vs Living Aliens
        for (let ai = 0; ai < livingAliens.length; ai++) {
          const alien = livingAliens[ai];
          if (alien.alive && this.checkIntersect(bullet, alien)) {
            window.InvaderManager.killAlien(alien);
            this.addScore(alien.points);
            playerBullets.splice(bi, 1);
            bulletConsumed = true;
            break;
          }
        }
        if (bulletConsumed) continue;

        // C. Check vs Destructible Bunkers (eats bunker blocks and consumes missile)
        if (window.PlayerManager.checkBunkerHit(bullet)) {
          playerBullets.splice(bi, 1);
          continue;
        }
      }

      // 2. Alien Bombs collisions
      for (let bi = alienBombs.length - 1; bi >= 0; bi--) {
        const bomb = alienBombs[bi];

        // A. Bomb vs Player ship
        if (window.PlayerManager.isAlive) {
          const playerBox = window.PlayerManager.getHitbox();
          if (this.checkIntersect(bomb, playerBox)) {
            alienBombs.splice(bi, 1);
            this._handlePlayerHit();
            continue;
          }
        }

        // B. Bomb vs Destructible Bunkers
        if (window.PlayerManager.checkBunkerHit(bomb)) {
          alienBombs.splice(bi, 1);
          continue;
        }

        // C. Bomb vs Player Missile (mid-air missile collision cancellation)
        for (let pi = playerBullets.length - 1; pi >= 0; pi--) {
          const pBullet = playerBullets[pi];
          if (this.checkIntersect(bomb, pBullet)) {
            alienBombs.splice(bi, 1);
            playerBullets.splice(pi, 1);
            break;
          }
        }
      }

      // 3. Aliens reaching ground / Bunker destruction by armada
      if (window.InvaderManager.hasReachedBottom(this.height - 90)) {
        this._handleArmadaLanded();
      }
    }

    _handlePlayerHit() {
      if (!window.PlayerManager) return;
      window.PlayerManager.takeDamage();
      this.lives--;
      this.updateHUD();

      if (this.lives <= 0) {
        // Player eliminated
        setTimeout(() => {
          this.setState('GAMEOVER');
        }, 1000);
      }
    }

    _handleArmadaLanded() {
      // Invasion successful -> Immediate Game Over
      if (window.PlayerManager && window.PlayerManager.isAlive) {
        window.PlayerManager.takeDamage();
      }
      this.lives = 0;
      this.updateHUD();
      this.setState('GAMEOVER');
    }

    _nextWave() {
      this.wave++;
      this.updateHUD();

      // Clear player missiles, preserve remaining bunkers, reset position
      if (window.PlayerManager) {
        window.PlayerManager.resetPosition();
      }

      // Initialize next armada
      if (window.InvaderManager) {
        window.InvaderManager.init(this.wave, this.width, this.height);
      }

      this.setState('PLAYING');
    }

    /**
     * Main loop ticked every frame via requestAnimationFrame
     */
    _loop(timestamp) {
      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;

      this._update(dt);
      this._render();

      this.animationFrameId = requestAnimationFrame((ts) => this._loop(ts));
    }

    _update(dt) {
      this._updateStarfield(dt);

      if (this.state === 'PLAYING') {
        const playerX = window.PlayerManager ? window.PlayerManager.x : 400;

        if (window.PlayerManager) {
          window.PlayerManager.update(null, dt);
        }

        if (window.InvaderManager) {
          window.InvaderManager.update(dt, playerX);

          // Check for wave clear condition
          if (window.InvaderManager.isWaveCleared()) {
            this.setState('WAVECLEAR');
            this.waveClearTimer = 1.8;
          }
        }

        this._checkCollisions();
      } else if (this.state === 'WAVECLEAR') {
        // Pause briefly to celebrate wave clear before advancing
        if (window.PlayerManager) {
          window.PlayerManager.update(null, dt);
        }
        this.waveClearTimer -= dt;
        if (this.waveClearTimer <= 0) {
          this._nextWave();
        }
      }
    }

    _render() {
      if (!this.ctx) return;
      const ctx = this.ctx;

      // Clear canvas with deep space black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.width, this.height);

      // Render background starfield
      this._renderStarfield(ctx);

      // Ground defense line
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this.height - 30);
      ctx.lineTo(this.width, this.height - 30);
      ctx.stroke();

      // Render Player and Bunkers
      if (window.PlayerManager) {
        window.PlayerManager.render(ctx);
      }

      // Render Invaders, UFO, Bombs, and Explosions
      if (window.InvaderManager) {
        window.InvaderManager.render(ctx);
      }

      // Render Wave Clear Announcement
      if (this.state === 'WAVECLEAR') {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 10;
        ctx.font = '24px "Press Start 2P", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`WAVE ${this.wave} CLEARED!`, this.width / 2, this.height / 2);
        ctx.shadowBlur = 0;
      }
    }
  }

  // Instantiate and bind to DOM lifecycle
  window.GameEngine = new GameEngine();

  const startEngine = () => {
    window.GameEngine.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startEngine);
  } else {
    startEngine();
  }
})();
