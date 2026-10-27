/**
 * Tic-Tac-Toe Interactive DOM Controller
 * Connects DOM elements and event handlers to TicTacToeGame engine
 * Follows DESIGN.md specifications
 */

(function () {
  'use strict';

  // Obtain Game class (window or required module)
  const GameClass = typeof window !== 'undefined' && window.TicTacToeGame 
    ? window.TicTacToeGame 
    : (typeof TicTacToeGame !== 'undefined' ? TicTacToeGame : null);

  if (!GameClass) {
    console.error('TicTacToeGame class not found. Ensure game.js is loaded before app.js.');
    return;
  }

  const game = new GameClass();

  // DOM element references
  let scoreXEl;
  let scoreOEl;
  let scoreTiesEl;
  let statusMessageEl;
  let boardEl;
  let cellEls;
  let resetBtn;
  let resetAllBtn;

  function initDOM() {
    scoreXEl = document.getElementById('score-x');
    scoreOEl = document.getElementById('score-o');
    scoreTiesEl = document.getElementById('score-ties');
    statusMessageEl = document.getElementById('status-message');
    boardEl = document.getElementById('board');
    cellEls = document.querySelectorAll('.cell');
    resetBtn = document.getElementById('reset-btn');
    resetAllBtn = document.getElementById('reset-all-btn');

    if (boardEl) {
      boardEl.addEventListener('click', handleBoardClick);
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', handleResetRound);
    }

    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', handleResetAll);
    }

    render();
  }

  function handleBoardClick(event) {
    const target = event.target.closest('.cell');
    if (!target) return;

    const index = parseInt(target.getAttribute('data-index'), 10);
    if (isNaN(index)) return;

    const moveResult = game.makeMove(index);
    if (moveResult && moveResult.success) {
      render();
    }
  }

  function handleResetRound() {
    game.resetRound();
    render();
  }

  function handleResetAll() {
    game.resetGame();
    render();
  }

  function render() {
    const state = game.getState();

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

        // Disabled status
        cell.disabled = isGameOver || mark !== null;
      });
    }
  }

  // Initialize when DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDOM);
    } else {
      initDOM();
    }
  }

  // Expose controller for testability and inspection
  if (typeof window !== 'undefined') {
    window.app = {
      game,
      render,
      handleBoardClick,
      handleResetRound,
      handleResetAll
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      game,
      render,
      handleResetRound,
      handleResetAll
    };
  }
})();
