/**
 * app.js - DOM Controller, UI Event Handlers, Game Controls, and Scoreboard
 * Strictly adheres to DESIGN.md specifications for Sprint 1.0.
 */

// Module / Global state
let game = null;
let scores = {
  X: 0,
  O: 0,
  draws: 0
};

/**
 * Resolves the TicTacToeGame class from current runtime environment.
 */
function getGameClass() {
  if (typeof TicTacToeGame !== 'undefined') {
    return TicTacToeGame;
  }
  if (typeof window !== 'undefined' && window.TicTacToeGame) {
    return window.TicTacToeGame;
  }
  if (typeof require !== 'undefined') {
    try {
      return require('./game');
    } catch (e) {
      // In case game.js is required differently
    }
  }
  return null;
}

/**
 * Handles cell click events at the given board index (0 - 8).
 * @param {number} index
 */
function handleCellClick(index) {
  if (!game || game.gameOver) {
    return;
  }

  const moveMade = game.makeMove(index);
  if (moveMade) {
    const state = game.getState();
    if (state.gameOver) {
      if (state.winner === 'X') {
        scores.X++;
      } else if (state.winner === 'O') {
        scores.O++;
      } else if (state.isDraw) {
        scores.draws++;
      }
    }
    render();
  }
}

/**
 * Resets the current board round without resetting session scores.
 */
function resetRound() {
  if (game) {
    game.reset();
  }
  render();
}

/**
 * Resets the scoreboard session state and resets the board.
 */
function resetScores() {
  scores = { X: 0, O: 0, draws: 0 };
  if (game) {
    game.reset();
  }
  render();
}

/**
 * Updates the DOM elements to reflect current game and scoreboard state.
 */
function render() {
  if (!game) {
    return;
  }

  const state = game.getState();

  // 1. Status Banner
  const statusBanner = document.getElementById('status-banner');
  if (statusBanner) {
    if (state.winner === 'X') {
      statusBanner.textContent = "Player X Wins!";
    } else if (state.winner === 'O') {
      statusBanner.textContent = "Player O Wins!";
    } else if (state.isDraw) {
      statusBanner.textContent = "It's a Draw!";
    } else {
      statusBanner.textContent = `Player ${state.currentPlayer}'s Turn`;
    }
  }

  // 2. Scoreboard
  const scoreXEl = document.getElementById('score-x');
  const scoreOEl = document.getElementById('score-o');
  const scoreDrawsEl = document.getElementById('score-draws');

  if (scoreXEl) scoreXEl.textContent = String(scores.X);
  if (scoreOEl) scoreOEl.textContent = String(scores.O);
  if (scoreDrawsEl) scoreDrawsEl.textContent = String(scores.draws);

  // 3. Grid Cells
  const cells = document.querySelectorAll('.cell');
  cells.forEach((cell, i) => {
    const rawIndex = cell.dataset.index !== undefined ? cell.dataset.index : cell.getAttribute('data-index');
    const idx = rawIndex !== null && rawIndex !== undefined ? parseInt(rawIndex, 10) : i;
    const value = state.board[idx];

    cell.textContent = value || '';

    let className = 'cell';
    if (value === 'X') {
      className += ' x';
    } else if (value === 'O') {
      className += ' o';
    }

    if (state.winningLine && state.winningLine.includes(idx)) {
      className += ' winning-cell';
    }

    cell.className = className;
  });
}

/**
 * Initializes the application: instantiates game, binds event listeners, and renders.
 */
function initApp() {
  const GameClass = getGameClass();
  if (GameClass) {
    game = new GameClass();
  }

  // Bind board container click delegation
  const board = document.getElementById('board');
  if (board) {
    board.addEventListener('click', (event) => {
      if (event._cellHandled) return;
      const cell = event.target.closest ? event.target.closest('.cell') : event.target;
      if (cell && (cell.dataset.index !== undefined || cell.getAttribute('data-index') !== null)) {
        const rawIndex = cell.dataset.index !== undefined ? cell.dataset.index : cell.getAttribute('data-index');
        const index = parseInt(rawIndex, 10);
        if (!isNaN(index)) {
          handleCellClick(index);
        }
      }
    });
  }

  // Also bind individual cell click listeners for direct click dispatches
  const cells = document.querySelectorAll('.cell');
  cells.forEach((cell, idx) => {
    cell.addEventListener('click', (event) => {
      event._cellHandled = true;
      const rawIndex = (event.target && event.target.dataset && event.target.dataset.index !== undefined)
        ? event.target.dataset.index
        : (cell.dataset.index !== undefined ? cell.dataset.index : cell.getAttribute('data-index'));
      const index = rawIndex !== null && rawIndex !== undefined ? parseInt(rawIndex, 10) : idx;
      if (!isNaN(index)) {
        handleCellClick(index);
      }
    });
  });

  // Reset round button
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetRound);
  }

  // Reset scores button
  const resetScoreBtn = document.getElementById('reset-score-btn');
  if (resetScoreBtn) {
    resetScoreBtn.addEventListener('click', resetScores);
  }

  // Initial render
  render();
}

// Auto-initialize when running in DOM environment
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

// Global window exposure for browser testing/interop
if (typeof window !== 'undefined') {
  window.app = {
    getGame: () => game,
    setGame: (g) => { game = g; },
    getScores: () => scores,
    setScores: (s) => { scores = s; },
    handleCellClick,
    resetRound,
    resetScores,
    render,
    initApp
  };
}

// Module export for Node.js test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getGame: () => game,
    setGame: (g) => { game = g; },
    getScores: () => scores,
    setScores: (s) => { scores = s; },
    handleCellClick,
    resetRound,
    resetScores,
    render,
    initApp
  };
}
