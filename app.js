/**
 * Tic-Tac-Toe Interactive DOM Controller
 * Connects DOM elements and event handlers to TicTacToeGame engine
 * Follows DESIGN.md specifications
 */

(function () {
  'use strict';

  // Helper to obtain Game class from window or scope
  function getGameClass() {
    if (typeof window !== 'undefined' && window.TicTacToeGame) {
      return window.TicTacToeGame;
    }
    if (typeof TicTacToeGame !== 'undefined') {
      return TicTacToeGame;
    }
    return null;
  }

  let game = null;

  function initGameInstance() {
    if (!game) {
      const GameClass = getGameClass();
      if (GameClass) {
        game = new GameClass();
      }
    }
    return game;
  }

  // Pre-initialize game instance
  initGameInstance();

  // DOM element references
  let scoreXEl = null;
  let scoreOEl = null;
  let scoreTiesEl = null;
  let statusMessageEl = null;
  let boardEl = null;
  let cellEls = null;
  let resetBtn = null;
  let resetAllBtn = null;
  let listenersAttached = false;

  function initDOM() {
    initGameInstance();

    scoreXEl = document.getElementById('score-x');
    scoreOEl = document.getElementById('score-o');
    scoreTiesEl = document.getElementById('score-ties');
    statusMessageEl = document.getElementById('status-message');
    boardEl = document.getElementById('board');
    cellEls = document.querySelectorAll('.cell');
    resetBtn = document.getElementById('reset-btn');
    resetAllBtn = document.getElementById('reset-all-btn');

    if (!listenersAttached) {
      if (boardEl) {
        boardEl.addEventListener('click', handleBoardClick);
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', handleResetRound);
      }
      if (resetAllBtn) {
        resetAllBtn.addEventListener('click', handleResetAll);
      }
      listenersAttached = true;
    }

    render();
  }

  function handleBoardClick(event) {
    const activeGame = initGameInstance();
    if (!activeGame) return;

    const target = event.target.closest('.cell');
    if (!target) return;

    const index = parseInt(target.getAttribute('data-index'), 10);
    if (isNaN(index)) return;

    const moveResult = activeGame.makeMove(index);
    if (moveResult && moveResult.success) {
      render();
    }
  }

  function handleResetRound() {
    const activeGame = initGameInstance();
    if (activeGame) {
      activeGame.resetRound();
      render();
    }
  }

  function handleResetAll() {
    const activeGame = initGameInstance();
    if (activeGame) {
      activeGame.resetGame();
      render();
    }
  }

  function render() {
    const activeGame = initGameInstance();
    if (!activeGame) return;

    const state = activeGame.getState();

    // 1. Update Scoreboard
    if (scoreXEl) scoreXEl.textContent = state.scores.X;
    if (scoreOEl) scoreOEl.textContent = state.scores.O;
    if (scoreTiesEl) scoreTiesEl.textContent = state.scores.ties;

    // 2. Update Status Message
    if (statusMessageEl) {
      if (state.winner) {
        statusMessageEl.textContent = `Player ${state.winner} Wins!`;
      } else if (state.isDraw) {
        statusMessageEl.textContent = "It's a Draw!";
      } else {
        statusMessageEl.textContent = `Player ${state.currentPlayer}'s Turn`;
      }
    }

    // 3. Update Cells
    const isGameOver = Boolean(state.winner || state.isDraw);
    const winningSet = new Set(state.winningLine || []);

    if (cellEls) {
      cellEls.forEach((cell) => {
        const index = parseInt(cell.getAttribute('data-index'), 10);
        const mark = state.board[index];
        const row = Math.floor(index / 3) + 1;
        const col = (index % 3) + 1;

        // Mark display
        cell.textContent = mark || '';

        // Class styling
        cell.classList.remove('x', 'o', 'winning');
        if (mark === 'X') {
          cell.classList.add('x');
        } else if (mark === 'O') {
          cell.classList.add('o');
        }

        if (winningSet.has(index)) {
          cell.classList.add('winning');
        }

        // Disabled status and accessibility labels
        cell.disabled = isGameOver || mark !== null;
        if (mark) {
          cell.setAttribute('aria-label', `Row ${row}, Column ${col}, ${mark}`);
        } else {
          cell.setAttribute('aria-label', `Row ${row}, Column ${col}`);
        }
      });
    }
  }

  // Auto-initialize when DOM is ready in browser environment
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDOM);
    } else {
      initDOM();
    }
  }

  // Public interface for testability and external controllers
  const controllerApi = {
    get game() {
      return initGameInstance();
    },
    set game(instance) {
      game = instance;
    },
    initDOM,
    init: initDOM,
    render,
    handleBoardClick,
    handleResetRound,
    handleResetAll
  };

  if (typeof window !== 'undefined') {
    window.app = controllerApi;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controllerApi;
  }
})();
