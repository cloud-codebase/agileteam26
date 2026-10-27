/**
 * game.js - Core Turn Management and Board State for Tic-Tac-Toe
 * Task: SCRUM-112 / SCRUM-107
 * Developer: Porthos
 */

(function () {
  'use strict';

  // Standard winning combinations for fallback validation
  const WINNING_COMBINATIONS = [
    [0, 1, 2], // Row 1
    [3, 4, 5], // Row 2
    [6, 7, 8], // Row 3
    [0, 3, 6], // Column 1
    [1, 4, 7], // Column 2
    [2, 5, 8], // Column 3
    [0, 4, 8], // Diagonal 1
    [2, 4, 6]  // Diagonal 2
  ];

  // Internal state
  let boardState = Array(9).fill('');
  let currentPlayer = 'X';
  let isGameOver = false;

  /**
   * Updates status text banner
   * @param {string} text
   */
  function updateStatus(text) {
    if (typeof document !== 'undefined') {
      const statusEl = document.getElementById('status');
      if (statusEl) {
        statusEl.textContent = text;
      }
    }
  }

  /**
   * Helper to evaluate winner via window.TicTacToeRules or fallback
   * @param {string[]} state
   * @returns {{ winner: string, combination: number[] } | null}
   */
  function checkWinner(state) {
    if (typeof window !== 'undefined' && window.TicTacToeRules && typeof window.TicTacToeRules.checkWinner === 'function') {
      return window.TicTacToeRules.checkWinner(state);
    }
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (state[a] && state[a] === state[b] && state[a] === state[c]) {
        return { winner: state[a], combination: combo };
      }
    }
    return null;
  }

  /**
   * Helper to evaluate draw via window.TicTacToeRules or fallback
   * @param {string[]} state
   * @returns {boolean}
   */
  function checkDraw(state) {
    if (typeof window !== 'undefined' && window.TicTacToeRules && typeof window.TicTacToeRules.checkDraw === 'function') {
      return window.TicTacToeRules.checkDraw(state);
    }
    const isFilled = state.every(cell => cell !== '');
    return isFilled && !checkWinner(state);
  }

  /**
   * Handles move at specified cell index
   * @param {number} index
   * @returns {boolean} true if move was placed
   */
  function handleMove(index) {
    if (isGameOver) {
      return false;
    }
    if (index < 0 || index > 8) {
      return false;
    }
    if (boardState[index] !== '') {
      return false;
    }

    // Place mark in board state
    boardState[index] = currentPlayer;

    // Update DOM cell if present
    if (typeof document !== 'undefined') {
      const cell = document.querySelector(`.cell[data-index="${index}"]`);
      if (cell) {
        cell.textContent = currentPlayer;
        cell.classList.add(currentPlayer.toLowerCase(), 'taken');
      }
    }

    // Check winner
    const winResult = checkWinner(boardState);
    if (winResult && winResult.winner) {
      isGameOver = true;
      if (typeof window !== 'undefined' && window.TicTacToeRules && typeof window.TicTacToeRules.highlightWinningCells === 'function') {
        window.TicTacToeRules.highlightWinningCells(winResult.combination);
      } else if (winResult.combination && typeof document !== 'undefined') {
        winResult.combination.forEach(idx => {
          const c = document.querySelector(`.cell[data-index="${idx}"]`);
          if (c) c.classList.add('winning');
        });
      }
      updateStatus(`Player ${winResult.winner} Wins!`);
      return true;
    }

    // Check draw
    const isDraw = checkDraw(boardState);
    if (isDraw) {
      isGameOver = true;
      updateStatus("It's a Draw!");
      return true;
    }

    // Next turn
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatus(`Player ${currentPlayer}'s Turn`);
    return true;
  }

  /**
   * Click event handler for grid cells
   * @param {Event} event
   */
  function handleCellClick(event) {
    const cell = event.currentTarget || event.target;
    if (!cell) return;
    const indexAttr = cell.getAttribute('data-index');
    if (indexAttr === null || indexAttr === undefined) return;
    const index = parseInt(indexAttr, 10);
    if (isNaN(index)) return;
    handleMove(index);
  }

  /**
   * Resets game state and UI
   */
  function restart() {
    boardState = Array(9).fill('');
    currentPlayer = 'X';
    isGameOver = false;

    updateStatus("Player X's Turn");

    if (typeof document !== 'undefined') {
      const cells = document.querySelectorAll('.cell');
      cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'taken', 'winning');
      });
    }

    if (typeof window !== 'undefined' && window.TicTacToeRules && typeof window.TicTacToeRules.resetGame === 'function') {
      window.TicTacToeRules.resetGame();
    }
  }

  /**
   * Initializes event listeners and status banner
   */
  function init() {
    if (typeof document === 'undefined') return;

    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.removeEventListener('click', handleCellClick);
      cell.addEventListener('click', handleCellClick);
    });

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.removeEventListener('click', restart);
      resetBtn.addEventListener('click', restart);
    }

    const statusEl = document.getElementById('status');
    if (statusEl && (!statusEl.textContent || statusEl.textContent.trim() === '')) {
      statusEl.textContent = `Player ${currentPlayer}'s Turn`;
    }
  }

  // Auto-init when DOM is ready
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // Public contract interface
  const TicTacToeGame = {
    getBoardState: () => [...boardState],
    getCurrentPlayer: () => currentPlayer,
    isGameActive: () => !isGameOver,
    restart,
    handleMove,
    handleCellClick,
    init
  };

  if (typeof window !== 'undefined') {
    window.TicTacToeGame = TicTacToeGame;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TicTacToeGame;
  }
})();
