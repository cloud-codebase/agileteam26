/**
 * Tic-Tac-Toe Core Game Logic & Audio/Visual Engine
 * Animal Faces & AI Opponent Mode (Sprint 2.0)
 *
 * Implements:
 * - Animal Token Mapping (🐶 Puppy for P1 / Human, 🐱 Kitten for P2 / Computer)
 * - Game Mode Switching ('ai' vs 'pvp')
 * - Heuristic Computer AI (Win -> Block -> Center -> Random) with 500ms delay & click guard
 * - Synthesized Web Audio Sound FX & Canvas Confetti
 * - Complies strictly with DESIGN.md specifications
 */

(function () {
  'use strict';

  // --- Animal Token System Contracts ---
  const PLAYER_1 = {
    symbol: 'X',
    emoji: '🐶',
    name: 'Puppy',
    cssClass: 'token-puppy'
  };

  const PLAYER_2 = {
    symbol: 'O',
    emoji: '🐱',
    name: 'Kitten',
    aiName: 'Computer 🤖',
    cssClass: 'token-kitten'
  };

  // --- Game State Contract ---
  const GameState = {
    board: Array(9).fill(''),
    currentPlayer: 'X', // 'X' or 'O'
    gameMode: 'ai', // 'ai' (default) or 'pvp'
    scores: {
      X: 0,
      O: 0,
      ties: 0
    },
    isGameOver: false,
    isThinking: false
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
  let labelP1El = null;
  let labelP2El = null;
  let btnModeAi = null;
  let btnModePvp = null;
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
        const startFreq = GameState.currentPlayer === 'X' ? 440 : 587.33; // A4 for Puppy, D5 for Kitten
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
      window.removeEventListener('resize', resizeConfettiCanvas);
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

  // --- Helper Getters for Player Metadata ---

  function getPlayerData(symbol) {
    return symbol === 'X' ? PLAYER_1 : PLAYER_2;
  }

  function getPlayerDisplayName(symbol) {
    if (symbol === 'X') {
      return `${PLAYER_1.name} ${PLAYER_1.emoji}`;
    }
    if (GameState.gameMode === 'ai') {
      return PLAYER_2.aiName;
    }
    return `${PLAYER_2.name} ${PLAYER_2.emoji}`;
  }

  // --- Core Game Logic ---

  /**
   * Evaluates all 8 winning combinations.
   * Returns winning combo array [a, b, c] or null.
   */
  function checkWinner(board = GameState.board) {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
      const [a, b, c] = WINNING_COMBINATIONS[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return WINNING_COMBINATIONS[i];
      }
    }
    return null;
  }

  /**
   * Checks if board is full without a winner.
   */
  function isTie(board = GameState.board) {
    return board.every((cell) => cell !== '');
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
   * Updates scoreboard UI elements & player labels.
   */
  function updateScoreboard() {
    if (scoreXEl) scoreXEl.textContent = GameState.scores.X;
    if (scoreOEl) scoreOEl.textContent = GameState.scores.O;
    if (scoreTiesEl) scoreTiesEl.textContent = GameState.scores.ties;

    if (labelP1El) {
      labelP1El.textContent = `${PLAYER_1.name} ${PLAYER_1.emoji}`;
    }
    if (labelP2El) {
      labelP2El.textContent = GameState.gameMode === 'ai' ? 'Computer 🤖' : `${PLAYER_2.name} ${PLAYER_2.emoji}`;
    }
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
   * Updates mode toggle pill buttons active state.
   */
  function updateModeButtons() {
    if (btnModeAi) {
      if (GameState.gameMode === 'ai') {
        btnModeAi.classList.add('active');
        btnModeAi.setAttribute('aria-pressed', 'true');
      } else {
        btnModeAi.classList.remove('active');
        btnModeAi.setAttribute('aria-pressed', 'false');
      }
    }
    if (btnModePvp) {
      if (GameState.gameMode === 'pvp') {
        btnModePvp.classList.add('active');
        btnModePvp.setAttribute('aria-pressed', 'true');
      } else {
        btnModePvp.classList.remove('active');
        btnModePvp.setAttribute('aria-pressed', 'false');
      }
    }
  }

  /**
   * Switches game mode ('ai' or 'pvp')
   */
  function setGameMode(mode) {
    if (mode !== 'ai' && mode !== 'pvp') return;
    GameState.gameMode = mode;
    updateModeButtons();
    updateScoreboard();
    resetBoard();
  }

  /**
   * Heuristic Computer AI (Win -> Block -> Center -> Random)
   * Returns chosen cell index (0..8) or -1.
   */
  function calculateBestMove() {
    const board = GameState.board;
    const emptyIndices = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') emptyIndices.push(i);
    }
    if (emptyIndices.length === 0) return -1;

    // 1. Check if Computer ('O') can win in 1 move
    for (const idx of emptyIndices) {
      board[idx] = 'O';
      const win = checkWinner(board);
      board[idx] = '';
      if (win) return idx;
    }

    // 2. Check if Human ('X') could win on their next turn and block them!
    for (const idx of emptyIndices) {
      board[idx] = 'X';
      const block = checkWinner(board);
      board[idx] = '';
      if (block) return idx;
    }

    // 3. Take center cell (index 4) if available
    if (board[4] === '') {
      return 4;
    }

    // 4. Take random open cell
    const randomIndex = Math.floor(Math.random() * emptyIndices.length);
    return emptyIndices[randomIndex];
  }

  /**
   * Executes a move on the board for the specified player symbol ('X' or 'O').
   * Returns true if game concluded (win or tie).
   */
  function executeMove(index, player) {
    const playerData = getPlayerData(player);
    GameState.board[index] = player;

    // Update cell DOM
    const cell = cellElements.find((el) => Number(el.getAttribute('data-index')) === index);
    if (cell) {
      cell.textContent = playerData.emoji;
      cell.classList.add(playerData.cssClass);
      // Legacy classes for compatibility
      cell.classList.add(player.toLowerCase());
      cell.setAttribute('aria-label', `Cell ${index + 1}, ${playerData.name} ${playerData.emoji}`);
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

      const winnerDisplayName = getPlayerDisplayName(player);
      updateStatusBanner(`🎉 ${winnerDisplayName} Wins! Super Star! ⭐`, 'winner');
      playTone('win');
      triggerConfetti();
      return true;
    }

    // Tie check
    if (isTie()) {
      GameState.isGameOver = true;
      GameState.scores.ties += 1;
      updateScoreboard();
      updateStatusBanner("🤝 It's a Tie! Great Game Both! 🎈", 'tie');
      playTone('tie');
      return true;
    }

    return false;
  }

  /**
   * Computer move trigger with natural thinking delay (400-600ms) and UI indicator.
   */
  function makeComputerMove() {
    if (GameState.isGameOver || GameState.currentPlayer !== 'O' || GameState.isThinking) {
      return;
    }

    GameState.isThinking = true;
    updateStatusBanner('Computer is thinking... 💭', 'thinking');

    // Natural child-friendly delay between 450ms and 550ms
    const delay = Math.floor(Math.random() * 150) + 450;

    setTimeout(() => {
      // Guard against reset during delay
      if (GameState.isGameOver || GameState.currentPlayer !== 'O') {
        GameState.isThinking = false;
        return;
      }

      const bestMove = calculateBestMove();
      if (bestMove !== -1) {
        const gameEnded = executeMove(bestMove, 'O');
        GameState.isThinking = false;

        if (!gameEnded) {
          GameState.currentPlayer = 'X';
          updateStatusBanner("Puppy's Turn 🐶 Ready, set, go!", 'turn-x');
        }
      } else {
        GameState.isThinking = false;
      }
    }, delay);
  }

  /**
   * Handles user click on a cell index.
   */
  function handleCellClick(index) {
    // Click guard: prevent action if game over, cell filled, or computer is thinking
    if (GameState.isGameOver || GameState.isThinking || GameState.board[index] !== '') {
      return;
    }

    // In AI mode, human plays 'X'
    if (GameState.gameMode === 'ai' && GameState.currentPlayer !== 'X') {
      return;
    }

    const current = GameState.currentPlayer;
    const gameEnded = executeMove(index, current);

    if (gameEnded) {
      return;
    }

    if (GameState.gameMode === 'ai') {
      // Switch turn to AI opponent
      GameState.currentPlayer = 'O';
      makeComputerMove();
    } else {
      // Switch turns in 2-Player mode
      GameState.currentPlayer = current === 'X' ? 'O' : 'X';
      const nextPlayerName = getPlayerDisplayName(GameState.currentPlayer);
      updateStatusBanner(`${nextPlayerName}'s Turn! Ready!`, `turn-${GameState.currentPlayer.toLowerCase()}`);
    }
  }

  /**
   * Resets the board for another round while preserving scores.
   */
  function resetBoard() {
    GameState.board = Array(9).fill('');
    GameState.isGameOver = false;
    GameState.isThinking = false;
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

    updateStatusBanner("Puppy's Turn 🐶 Ready, set, go!", 'turn-x');
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
    labelP1El = document.getElementById('label-p1') || document.querySelector('.score-card-x .player-label');
    labelP2El = document.getElementById('label-p2') || document.querySelector('.score-card-o .player-label');
    btnModeAi = document.getElementById('btn-mode-ai');
    btnModePvp = document.getElementById('btn-mode-pvp');
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

    // Hook mode buttons defensively if present or dynamically added
    if (btnModeAi) {
      btnModeAi.addEventListener('click', () => setGameMode('ai'));
    }
    if (btnModePvp) {
      btnModePvp.addEventListener('click', () => setGameMode('pvp'));
    }

    // Set initial display
    updateModeButtons();
    updateScoreboard();
    updateStatusBanner("Puppy's Turn 🐶 Ready, set, go!", 'turn-x');
  }

  // Safe startup wrapper
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }

  // Expose clean namespace for testing and integration
  window.TicTacToe = {
    PLAYER_1,
    PLAYER_2,
    GameState,
    WINNING_COMBINATIONS,
    setGameMode,
    calculateBestMove,
    makeComputerMove,
    handleCellClick,
    checkWinner,
    isTie,
    resetBoard,
    resetScores,
    playTone,
    triggerConfetti
  };
})();
