/**
 * Tic-Tac-Toe Core Game Logic & Audio/Visual Engine
 * Implements state tracking, turn alternation, win/tie evaluation,
 * synthesized Web Audio sound effects, and canvas confetti celebration.
 * Complies with DESIGN.md specifications.
 */

(function () {
  'use strict';

  // --- Game State Contract ---
  const GameState = {
    board: Array(9).fill(''),
    currentPlayer: 'X',
    scores: {
      X: 0,
      O: 0,
      ties: 0
    },
    isGameOver: false
  };

  // Winning combinations (rows, columns, diagonals)
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  // Cached DOM references
  let statusBanner = null;
  let scoreXEl = null;
  let scoreOEl = null;
  let scoreTiesEl = null;
  let gameBoard = null;
  let cellElements = [];
  let btnReset = null;
  let btnResetScores = null;
  let confettiCanvas = null;
  let confettiCtx = null;

  // Web Audio Context (lazy-loaded on first user gesture)
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Synthesize playful sound effects using Web Audio API oscillators and gain envelopes.
   * Types: 'pop' (move), 'win' (cheery fanfare), 'tie' (boing/descending chime), 'reset' (click)
   */
  function playTone(type) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Kid-friendly bouncy bubble pop
        const startFreq = GameState.currentPlayer === 'X' ? 440 : 587.33; // A4 for X, D5 for O
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'win') {
        // Melodic celebratory arpeggio: C5 -> E5 -> G5 -> C6
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.1;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.28, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + 0.28);
        });
      } else if (type === 'tie') {
        // Bouncy neutral tie sound: dual descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.3);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'reset') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
      }
    } catch (e) {
      // Audio autoplay policy or unsupported environment fallback
      console.warn('Audio synthesis note:', e);
    }
  }

  // --- Confetti Particle Engine ---
  let confettiAnimationId = null;
  let confettiParticles = [];

  function initConfettiCanvas() {
    if (!confettiCanvas) {
      confettiCanvas = document.getElementById('confetti-canvas');
    }
    if (confettiCanvas) {
      confettiCtx = confettiCanvas.getContext('2d');
      resizeConfettiCanvas();
      window.addEventListener('resize', resizeConfettiCanvas);
    }
  }

  function resizeConfettiCanvas() {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  }

  function triggerConfetti() {
    if (!confettiCanvas || !confettiCtx) {
      initConfettiCanvas();
    }
    if (!confettiCanvas || !confettiCtx) return;

    cancelAnimationFrame(confettiAnimationId);
    confettiParticles = [];

    const colors = ['#FF6B6B', '#4D96FF', '#FFD93D', '#6BCB77', '#FF78C4', '#A66CFF'];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      confettiParticles.push({
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 180,
        y: confettiCanvas.height / 3 + (Math.random() - 0.5) * 100,
        w: Math.random() * 10 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * -10 - 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.32,
        drag: 0.98,
        opacity: 1
      });
    }

    animateConfetti();
  }

  function animateConfetti() {
    if (!confettiCtx || !confettiCanvas) return;

    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    let activeParticles = 0;

    confettiParticles.forEach((p) => {
      p.vx *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      // Start fade out after crossing middle of screen
      if (p.y > confettiCanvas.height * 0.4) {
        p.opacity = Math.max(0, p.opacity - 0.015);
      }

      if (p.opacity > 0 && p.y < confettiCanvas.height + 50) {
        activeParticles++;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.globalAlpha = p.opacity;
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      }
    });

    if (activeParticles > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // --- Core Game Logic ---

  /**
   * Evaluates all 8 winning combinations.
   * Returns winning combo array [a, b, c] or null.
   */
  function checkWinner() {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
      const [a, b, c] = WINNING_COMBINATIONS[i];
      if (
        GameState.board[a] &&
        GameState.board[a] === GameState.board[b] &&
        GameState.board[a] === GameState.board[c]
      ) {
        return WINNING_COMBINATIONS[i];
      }
    }
    return null;
  }

  /**
   * Checks if board is full without a winner.
   */
  function isTie() {
    return GameState.board.every((cell) => cell !== '');
  }

  /**
   * Highlights winning cells with visual flair.
   */
  function highlightWinningCells(combo) {
    if (!combo) return;
    combo.forEach((idx) => {
      const cell = cellElements.find((el) => Number(el.getAttribute('data-index')) === idx);
      if (cell) {
        cell.classList.add('win-cell');
      }
    });
  }

  /**
   * Updates scoreboard UI elements.
   */
  function updateScoreboard() {
    if (scoreXEl) scoreXEl.textContent = GameState.scores.X;
    if (scoreOEl) scoreOEl.textContent = GameState.scores.O;
    if (scoreTiesEl) scoreTiesEl.textContent = GameState.scores.ties;
  }

  /**
   * Updates dynamic status banner.
   */
  function updateStatusBanner(message, stateClass) {
    if (!statusBanner) return;
    statusBanner.textContent = message;
    statusBanner.className = 'status-banner';
    if (stateClass) {
      statusBanner.classList.add(stateClass);
    }
  }

  /**
   * Handles user click on a cell index.
   */
  function handleCellClick(index) {
    if (GameState.isGameOver || GameState.board[index] !== '') {
      return;
    }

    const player = GameState.currentPlayer;
    GameState.board[index] = player;

    // Update cell DOM
    const cell = cellElements.find((el) => Number(el.getAttribute('data-index')) === index);
    if (cell) {
      cell.textContent = player;
      cell.classList.add(player.toLowerCase());
      cell.setAttribute('aria-label', `Cell ${index + 1}, Player ${player}`);
      cell.disabled = true;
    }

    playTone('pop');

    // Win check
    const winningCombo = checkWinner();
    if (winningCombo) {
      GameState.isGameOver = true;
      GameState.scores[player] += 1;
      updateScoreboard();
      highlightWinningCells(winningCombo);
      updateStatusBanner(`🎉 Player ${player} Wins! Super Star! ⭐`, 'winner');
      playTone('win');
      triggerConfetti();
      return;
    }

    // Tie check
    if (isTie()) {
      GameState.isGameOver = true;
      GameState.scores.ties += 1;
      updateScoreboard();
      updateStatusBanner("🤝 It's a Tie! Great Game Both! 🎈", 'tie');
      playTone('tie');
      return;
    }

    // Switch turns
    GameState.currentPlayer = player === 'X' ? 'O' : 'X';
    updateStatusBanner(`Player ${GameState.currentPlayer}'s Turn! ${GameState.currentPlayer === 'X' ? '❌' : '⭕'}`, `turn-${GameState.currentPlayer.toLowerCase()}`);
  }

  /**
   * Resets the board for another round while preserving scores.
   */
  function resetBoard() {
    GameState.board = Array(9).fill('');
    GameState.isGameOver = false;
    GameState.currentPlayer = 'X';

    cellElements.forEach((cell, idx) => {
      cell.textContent = '';
      cell.className = 'cell';
      cell.disabled = false;
      cell.setAttribute('aria-label', `Empty cell ${idx + 1}`);
    });

    if (confettiCtx && confettiCanvas) {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      cancelAnimationFrame(confettiAnimationId);
    }

    updateStatusBanner("Player X's Turn! ❌ Ready, set, go!", 'turn-x');
    playTone('reset');
  }

  /**
   * Resets all player scores and ties.
   */
  function resetScores() {
    GameState.scores.X = 0;
    GameState.scores.O = 0;
    GameState.scores.ties = 0;
    updateScoreboard();
    playTone('reset');
  }

  /**
   * Defensive DOM initialization
   */
  function initGame() {
    statusBanner = document.getElementById('status-banner');
    scoreXEl = document.getElementById('score-x');
    scoreOEl = document.getElementById('score-o');
    scoreTiesEl = document.getElementById('score-ties');
    gameBoard = document.getElementById('game-board');
    btnReset = document.getElementById('btn-reset');
    btnResetScores = document.getElementById('btn-reset-scores');
    confettiCanvas = document.getElementById('confetti-canvas');

    initConfettiCanvas();

    // Query all interactive cell buttons
    const queriedCells = document.querySelectorAll('.cell');
    cellElements = Array.from(queriedCells);

    cellElements.forEach((cell) => {
      const idx = Number(cell.getAttribute('data-index'));
      cell.addEventListener('click', () => handleCellClick(idx));
    });

    if (btnReset) {
      btnReset.addEventListener('click', resetBoard);
    }

    if (btnResetScores) {
      btnResetScores.addEventListener('click', resetScores);
    }

    // Set initial display
    updateScoreboard();
    updateStatusBanner("Player X's Turn! ❌ Ready, set, go!", 'turn-x');
  }

  // Safe startup wrapper
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }

  // Expose clean namespace for testing and integration
  window.TicTacToe = {
    GameState,
    WINNING_COMBINATIONS,
    handleCellClick,
    checkWinner,
    isTie,
    resetBoard,
    resetScores,
    playTone,
    triggerConfetti
  };
})();
