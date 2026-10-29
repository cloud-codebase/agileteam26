/**
 * TicTacToe4k - Interactive UI Controller, Audio Effects, and Celebrations
 * Conforms strictly to DESIGN.md blueprint and contracts:
 * - SoundEffects: window.AudioContext synthesis (playMove, playWin, playTie, playClick)
 * - ConfettiCelebration: Particle animation on #confetti-canvas
 * - StorageManager: Persists scores and sound preference in localStorage
 * - DOM Integration: Seamlessly coordinates window.TicTacToeGame with UI elements
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ==========================================================================
     1. STORAGE MANAGER
     ========================================================================== */
  const STORAGE_KEY_SCORES = 'tictactoe4k_scores';
  const STORAGE_KEY_SOUND = 'tictactoe4k_sound_enabled';

  const StorageManager = {
    getScores() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SCORES);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            x: Number.isInteger(parsed.x) ? parsed.x : 0,
            o: Number.isInteger(parsed.o) ? parsed.o : 0,
            ties: Number.isInteger(parsed.ties) ? parsed.ties : 0
          };
        }
      } catch (e) {
        console.warn('Unable to load scores from localStorage:', e);
      }
      return { x: 0, o: 0, ties: 0 };
    },

    saveScores(scores) {
      try {
        localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(scores));
      } catch (e) {
        console.warn('Unable to persist scores to localStorage:', e);
      }
    },

    getSoundEnabled() {
      try {
        const val = localStorage.getItem(STORAGE_KEY_SOUND);
        if (val !== null) {
          return val === 'true';
        }
      } catch (e) {
        console.warn('Unable to read sound preference:', e);
      }
      return true; // sound enabled by default for vibrant kids UX
    },

    saveSoundEnabled(enabled) {
      try {
        localStorage.setItem(STORAGE_KEY_SOUND, String(enabled));
      } catch (e) {
        console.warn('Unable to save sound preference:', e);
      }
    }
  };

  /* ==========================================================================
     2. SYNTHESIZED WEB AUDIO EFFECTS (SoundEffects)
     ========================================================================== */
  const SoundEffects = {
    audioCtx: null,
    enabled: StorageManager.getSoundEnabled(),

    initContext() {
      if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    },

    toggleSound() {
      this.enabled = !this.enabled;
      StorageManager.saveSoundEnabled(this.enabled);
      if (this.enabled) {
        this.initContext();
        this.playTone(523.25, 0.08, 'sine'); // Gentle cheerful chirp
      }
      return this.enabled;
    },

    playTone(freq, duration, type = 'sine', gainVal = 0.18, rampDown = true) {
      if (!this.enabled) return;
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
        if (rampDown) {
          gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
        }

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (err) {
        console.warn('Audio synthesis error:', err);
      }
    },

    playMove(marker) {
      if (!this.enabled) return;
      // High friendly chime for X, warmer bell chime for O
      if (marker === 'X') {
        this.playTone(587.33, 0.12, 'sine', 0.22); // D5
        setTimeout(() => this.playTone(880.00, 0.15, 'triangle', 0.18), 60); // A5
      } else {
        this.playTone(440.00, 0.12, 'sine', 0.22); // A4
        setTimeout(() => this.playTone(659.25, 0.15, 'triangle', 0.18), 60); // E5
      }
    },

    playWin() {
      if (!this.enabled) return;
      // Joyful 4-note victory fanfare: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.25, 'triangle', 0.25);
        }, i * 110);
      });
    },

    playTie() {
      if (!this.enabled) return;
      // Friendly boing / playful tie jingle
      const notes = [440, 392, 349.23];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.18, 'sine', 0.2);
        }, i * 130);
      });
    },

    playClick() {
      if (!this.enabled) return;
      this.playTone(700, 0.05, 'sine', 0.08);
    }
  };

  /* ==========================================================================
     3. FULLSCREEN CONFETTI CELEBRATION (ConfettiCelebration)
     ========================================================================== */
  const ConfettiCelebration = {
    canvas: document.getElementById('confetti-canvas'),
    ctx: null,
    particles: [],
    animationId: null,
    colors: ['#ff4757', '#2ed573', '#ffa502', '#1e90ff', '#e056fd', '#ff6b81', '#7bed9f'],

    init() {
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    fire(duration = 2600) {
      if (!this.canvas || !this.ctx) return;
      this.resize();

      const particleCount = 110;
      this.particles = [];

      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: this.canvas.width * (0.2 + Math.random() * 0.6),
          y: this.canvas.height * 0.35 + (Math.random() * 50 - 25),
          vx: (Math.random() - 0.5) * 16,
          vy: Math.random() * -14 - 6,
          size: Math.random() * 10 + 6,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 14,
          opacity: 1,
          gravity: 0.35 + Math.random() * 0.2,
          shape: Math.random() > 0.3 ? 'rect' : 'circle'
        });
      }

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      const startTime = performance.now();

      const render = (currentTime) => {
        const elapsed = currentTime - startTime;
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let activeCount = 0;
        for (let i = 0; i < this.particles.length; i++) {
          const p = this.particles[i];

          p.x += p.vx;
          p.vy += p.gravity;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;
          p.vx *= 0.98;

          if (elapsed > duration - 800) {
            p.opacity = Math.max(0, p.opacity - 0.025);
          }

          if (p.opacity > 0 && p.y < this.canvas.height + 20) {
            activeCount++;
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.globalAlpha = p.opacity;
            this.ctx.fillStyle = p.color;

            if (p.shape === 'circle') {
              this.ctx.beginPath();
              this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
              this.ctx.fill();
            } else {
              this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
            }
            this.ctx.restore();
          }
        }

        if (activeCount > 0 && elapsed < duration) {
          this.animationId = requestAnimationFrame(render);
        } else {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.animationId = null;
        }
      };

      this.animationId = requestAnimationFrame(render);
    }
  };

  /* ==========================================================================
     4. GAME CONTROLLER & DOM ORCHESTRATION
     ========================================================================== */
  const UI = {
    playerTurn: document.getElementById('player-turn'),
    scoreX: document.getElementById('score-x'),
    scoreO: document.getElementById('score-o'),
    scoreTies: document.getElementById('score-ties'),
    scoreOIcon: document.getElementById('score-o-icon'),
    scoreOLabel: document.getElementById('score-o-label'),
    gameBoard: document.getElementById('game-board'),
    cells: Array.from(document.querySelectorAll('.cell')),
    modeSelect: document.getElementById('mode-select'),
    btnResetRound: document.getElementById('btn-reset-round'),
    btnResetScore: document.getElementById('btn-reset-score'),
    btnSoundToggle: document.getElementById('btn-sound-toggle'),
    soundIcon: document.getElementById('sound-icon')
  };

  // Ensure game engine from game.js is loaded
  const GameEngine = window.TicTacToeGame;
  if (!GameEngine) {
    console.error('Fatal: TicTacToeGame engine not found on window. Ensure game.js is loaded first.');
    return;
  }

  // State
  let scores = StorageManager.getScores();
  let currentMode = UI.modeSelect ? UI.modeSelect.value : 'pve';
  let gameState = GameEngine.createGame(currentMode);
  let isAiThinking = false;

  // Initialize helper sub-modules
  ConfettiCelebration.init();
  updateSoundButtonUI();
  updateScoreboardUI();
  syncOpponentLabels();
  renderBoard();
  updateTurnBanner();

  /* ==========================================================================
     5. EVENT HANDLERS & INTERACTIONS
     ========================================================================== */

  // Board click handler (delegated or cell-specific)
  if (UI.gameBoard) {
    UI.gameBoard.addEventListener('click', (e) => {
      const cellBtn = e.target.closest('.cell');
      if (!cellBtn) return;
      const index = parseInt(cellBtn.getAttribute('data-index'), 10);
      handleCellClick(index);
    });
  }

  // Mode Selection Changed
  if (UI.modeSelect) {
    UI.modeSelect.addEventListener('change', (e) => {
      currentMode = e.target.value;
      SoundEffects.playClick();
      syncOpponentLabels();
      resetRoundUI();
    });
  }

  // Reset Round Button
  if (UI.btnResetRound) {
    UI.btnResetRound.addEventListener('click', () => {
      SoundEffects.playClick();
      resetRoundUI();
    });
  }

  // Reset Scoreboard Button
  if (UI.btnResetScore) {
    UI.btnResetScore.addEventListener('click', () => {
      SoundEffects.playClick();
      scores = { x: 0, o: 0, ties: 0 };
      StorageManager.saveScores(scores);
      updateScoreboardUI();
      resetRoundUI();
    });
  }

  // Sound Toggle Button
  if (UI.btnSoundToggle) {
    UI.btnSoundToggle.addEventListener('click', () => {
      SoundEffects.toggleSound();
      updateSoundButtonUI();
    });
  }

  /* ==========================================================================
     6. GAME FLOW LOGIC
     ========================================================================== */

  function handleCellClick(index) {
    if (isAiThinking || gameState.status !== 'playing') return;
    if (index < 0 || index > 8 || gameState.board[index] !== null) return;

    const currentTurn = gameState.turn;
    const result = GameEngine.makeMove(gameState, index);

    if (!result.success) return;

    // Play move sound & re-render board
    SoundEffects.playMove(currentTurn);
    renderBoard();

    if (result.isWin) {
      handleGameWin(result.game.winner, result.winningLine);
      return;
    }

    if (result.isTie) {
      handleGameTie();
      return;
    }

    updateTurnBanner();

    // Trigger AI move if in PVE mode and turn passed to O
    if (gameState.mode === 'pve' && gameState.turn === 'O') {
      triggerAiTurn();
    }
  }

  function triggerAiTurn() {
    isAiThinking = true;
    updateTurnBanner();

    // Playful kid-friendly timing delay (450ms - 650ms) to feel natural
    const delay = 480 + Math.random() * 180;

    setTimeout(() => {
      if (gameState.status !== 'playing' || gameState.turn !== 'O') {
        isAiThinking = false;
        return;
      }

      const aiMoveIndex = GameEngine.getBestMove(gameState, 'friendly');
      if (aiMoveIndex !== -1) {
        const result = GameEngine.makeMove(gameState, aiMoveIndex);
        if (result.success) {
          SoundEffects.playMove('O');
          renderBoard();

          if (result.isWin) {
            isAiThinking = false;
            handleGameWin(result.game.winner, result.winningLine);
            return;
          }

          if (result.isTie) {
            isAiThinking = false;
            handleGameTie();
            return;
          }
        }
      }

      isAiThinking = false;
      updateTurnBanner();
    }, delay);
  }

  function handleGameWin(winner, winningLine) {
    if (winner === 'X') {
      scores.x += 1;
    } else if (winner === 'O') {
      scores.o += 1;
    }
    StorageManager.saveScores(scores);
    updateScoreboardUI();

    // Visual highlights on the winning 3 cells
    if (Array.isArray(winningLine)) {
      winningLine.forEach((idx) => {
        if (UI.cells[idx]) {
          UI.cells[idx].classList.add('winning-cell');
        }
      });
    }

    // Celebration & Audio
    SoundEffects.playWin();
    ConfettiCelebration.fire();

    // Turn banner announcement
    if (UI.playerTurn) {
      UI.playerTurn.classList.remove('tie-banner');
      UI.playerTurn.classList.add('win-banner');
      if (winner === 'X') {
        UI.playerTurn.textContent = '🎉 Puppy (X) Wins the Match! 🐶 🏆';
      } else {
        const opponentName = gameState.mode === 'pve' ? 'Bot (O)' : 'Kitten (O)';
        const opponentIcon = gameState.mode === 'pve' ? '🤖' : '🐱';
        UI.playerTurn.textContent = `🎉 ${opponentName} Wins the Match! ${opponentIcon} 🏆`;
      }
    }
  }

  function handleGameTie() {
    scores.ties += 1;
    StorageManager.saveScores(scores);
    updateScoreboardUI();

    SoundEffects.playTie();

    if (UI.playerTurn) {
      UI.playerTurn.classList.remove('win-banner');
      UI.playerTurn.classList.add('tie-banner');
      UI.playerTurn.textContent = '🤝 It\'s a Friendly Cat\'s Game (Tie)! Play Again!';
    }
  }

  function resetRoundUI() {
    isAiThinking = false;
    gameState = GameEngine.resetRound(gameState);
    gameState.mode = currentMode;

    renderBoard();
    updateTurnBanner();
  }

  /* ==========================================================================
     7. UI RENDERING HELPERS
     ========================================================================== */

  function renderBoard() {
    UI.cells.forEach((cell, idx) => {
      const marker = gameState.board[idx];
      cell.classList.remove('cell-x', 'cell-o', 'taken', 'winning-cell');

      if (marker === 'X') {
        cell.textContent = '🐶';
        cell.classList.add('cell-x', 'taken');
        cell.setAttribute('aria-label', `Cell ${idx + 1}, Puppy X`);
      } else if (marker === 'O') {
        cell.textContent = gameState.mode === 'pve' ? '🤖' : '🐱';
        cell.classList.add('cell-o', 'taken');
        const role = gameState.mode === 'pve' ? 'Robot O' : 'Kitten O';
        cell.setAttribute('aria-label', `Cell ${idx + 1}, ${role}`);
      } else {
        cell.textContent = '';
        cell.setAttribute('aria-label', `Cell ${idx + 1}, empty`);
      }
    });
  }

  function updateTurnBanner() {
    if (!UI.playerTurn) return;

    UI.playerTurn.classList.remove('win-banner', 'tie-banner');

    if (gameState.status === 'playing') {
      if (gameState.turn === 'X') {
        UI.playerTurn.textContent = '🐶 Puppy\'s Turn (X)';
      } else {
        if (gameState.mode === 'pve') {
          UI.playerTurn.textContent = isAiThinking
            ? '🤖 Friendly Robot is thinking...'
            : '🤖 Friendly Robot\'s Turn (O)';
        } else {
          UI.playerTurn.textContent = '🐱 Kitten\'s Turn (O)';
        }
      }
    }
  }

  function updateScoreboardUI() {
    if (UI.scoreX) UI.scoreX.textContent = scores.x;
    if (UI.scoreO) UI.scoreO.textContent = scores.o;
    if (UI.scoreTies) UI.scoreTies.textContent = scores.ties;
  }

  function syncOpponentLabels() {
    const isPve = currentMode === 'pve';
    if (UI.scoreOIcon) {
      UI.scoreOIcon.textContent = isPve ? '🤖' : '🐱';
    }
    if (UI.scoreOLabel) {
      UI.scoreOLabel.textContent = isPve ? 'Bot (O)' : 'Kitten (O)';
    }
  }

  function updateSoundButtonUI() {
    if (!UI.soundIcon) return;
    if (SoundEffects.enabled) {
      UI.soundIcon.textContent = '🔊';
      if (UI.btnSoundToggle) UI.btnSoundToggle.title = 'Mute Audio Effects';
    } else {
      UI.soundIcon.textContent = '🔇';
      if (UI.btnSoundToggle) UI.btnSoundToggle.title = 'Unmute Audio Effects';
    }
  }

  // Expose for debugging or testing if needed
  window.__TicTacToeApp = {
    SoundEffects,
    ConfettiCelebration,
    StorageManager,
    resetRoundUI
  };
});
