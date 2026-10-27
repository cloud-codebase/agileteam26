/**
 * rules.js - Win & Draw Detection, Victory Highlighting, and Board Reset Mechanics
 *
 * Implements the Tic-Tac-Toe rules contract defined in DESIGN.md.
 * Module owned by: Aramis (SCRUM-113 / SCRUM-108)
 */

(function () {
  'use strict';

  /**
   * The 8 standard winning combinations for a 3x3 Tic-Tac-Toe grid:
   * 3 rows, 3 columns, 2 diagonals.
   */
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

  /**
   * Evaluates the board state for a win across all 8 combinations.
   *
   * @param {Array<string>} boardState - Array of 9 strings representing the board (e.g. ['X', '', 'O', ...])
   * @returns {{ winner: string, combination: Array<number> } | null} Winner and combination if won, else null
   */
  function checkWinner(boardState) {
    if (!boardState || !Array.isArray(boardState)) {
      return null;
    }

    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
      const combination = WINNING_COMBINATIONS[i];
      const [a, b, c] = combination;
      const markA = boardState[a];
      const markB = boardState[b];
      const markC = boardState[c];

      if (markA && markA === markB && markA === markC) {
        return {
          winner: markA,
          combination: [a, b, c]
        };
      }
    }

    return null;
  }

  /**
   * Checks if the game has ended in a draw (all 9 cells filled and no winner).
   *
   * @param {Array<string>} boardState - Array of 9 strings representing the board
   * @returns {boolean} True if all cells are filled and there is no winner, otherwise false
   */
  function checkDraw(boardState) {
    if (!boardState || !Array.isArray(boardState)) {
      return false;
    }

    const isFull =
      boardState.length >= 9 &&
      boardState.every(
        (cell) => cell !== '' && cell !== null && cell !== undefined
      );

    if (!isFull) {
      return false;
    }

    return checkWinner(boardState) === null;
  }

  /**
   * Applies the `.winning` CSS class to the winning combination cells.
   *
   * @param {Array<number>} combination - Array of 3 cell indices to highlight
   */
  function highlightWinningCells(combination) {
    if (!combination || !Array.isArray(combination)) {
      return;
    }

    combination.forEach((index) => {
      let cell = document.querySelector(`.cell[data-index="${index}"]`);
      if (!cell) {
        const cells = document.querySelectorAll('.cell');
        if (cells && cells[index]) {
          cell = cells[index];
        }
      }
      if (cell) {
        cell.classList.add('winning');
      }
    });
  }

  /**
   * Updates the game status banner text dynamically.
   *
   * @param {string} message - Status banner message to display
   */
  function updateStatus(message) {
    const statusElement =
      document.getElementById('status') ||
      document.querySelector('.status-banner');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  /**
   * Resets the visual board state and cell classes.
   * Clears cell text, removes .x, .o, .taken, .winning classes, and resets status banner.
   */
  function resetGame() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell) => {
      cell.textContent = '';
      cell.classList.remove('x', 'o', 'taken', 'winning');
    });

    updateStatus("Player X's Turn");
  }

  const TicTacToeRules = {
    WINNING_COMBINATIONS,
    checkWinner,
    checkDraw,
    highlightWinningCells,
    updateStatus,
    resetGame
  };

  // Expose to window for browser integration
  if (typeof window !== 'undefined') {
    window.TicTacToeRules = TicTacToeRules;
  }

  // Support CommonJS export for testing environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TicTacToeRules;
  }
})();
