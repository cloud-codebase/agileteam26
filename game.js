/**
 * TicTacToe4k - Game Engine and Friendly AI
 * Implements pure game state, move validation, win/tie evaluation,
 * and kid-friendly AI heuristics.
 * Exposed on window.TicTacToeGame.
 */
(function (root) {
  'use strict';

  // Winning combinations for a standard 3x3 grid
  const WINNING_COMBINATIONS = [
    [0, 1, 2], // row 0
    [3, 4, 5], // row 1
    [6, 7, 8], // row 2
    [0, 3, 6], // col 0
    [1, 4, 7], // col 1
    [2, 5, 8], // col 2
    [0, 4, 8], // diagonal top-left to bottom-right
    [2, 4, 6]  // diagonal top-right to bottom-left
  ];

  /**
   * Initializes a new game state.
   * @param {string} mode - 'pvp' (2 players) or 'pve' (Player vs Friendly Robot)
   * @returns {Object} Fresh game state
   */
  function createGame(mode = 'pve') {
    return {
      board: Array(9).fill(null),
      turn: 'X',
      mode: mode === 'pvp' ? 'pvp' : 'pve',
      status: 'playing', // 'playing' | 'won' | 'tied'
      winner: null,      // 'X' | 'O' | null
      winningLine: null  // number[] | null
    };
  }

  /**
   * Evaluates the board for a win or tie.
   * @param {Array<string|null>} board - 9-element array
   * @returns {Object} { winner, isTie, line }
   */
  function checkWinner(board) {
    if (!Array.isArray(board) || board.length !== 9) {
      return { winner: null, isTie: false, line: null };
    }

    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
      const [a, b, c] = WINNING_COMBINATIONS[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return {
          winner: board[a],
          isTie: false,
          line: [a, b, c]
        };
      }
    }

    const isFull = board.every(cell => cell !== null);
    return {
      winner: null,
      isTie: isFull,
      line: null
    };
  }

  /**
   * Makes a move on the game board at the specified index.
   * Purely updates or validates the game object.
   * @param {Object} game - Game state
   * @param {number} index - Board cell index (0-8)
   * @returns {Object} { success, game, isWin, isTie, winningLine }
   */
  function makeMove(game, index) {
    if (!game || !Array.isArray(game.board)) {
      return { success: false, game, isWin: false, isTie: false, winningLine: null };
    }

    if (index < 0 || index > 8 || game.board[index] !== null || game.status !== 'playing') {
      return { success: false, game, isWin: false, isTie: false, winningLine: null };
    }

    // Apply move
    const currentMarker = game.turn;
    game.board[index] = currentMarker;

    const outcome = checkWinner(game.board);

    if (outcome.winner) {
      game.status = 'won';
      game.winner = outcome.winner;
      game.winningLine = outcome.line;
      return {
        success: true,
        game,
        isWin: true,
        isTie: false,
        winningLine: outcome.line
      };
    }

    if (outcome.isTie) {
      game.status = 'tied';
      game.winner = null;
      game.winningLine = null;
      return {
        success: true,
        game,
        isWin: false,
        isTie: true,
        winningLine: null
      };
    }

    // Switch turn
    game.turn = game.turn === 'X' ? 'O' : 'X';

    return {
      success: true,
      game,
      isWin: false,
      isTie: false,
      winningLine: null
    };
  }

  /**
   * Resets the round while keeping active game mode.
   * @param {Object} game - Existing game state
   * @returns {Object} Reset game state
   */
  function resetRound(game) {
    const currentMode = game && game.mode ? game.mode : 'pve';
    return createGame(currentMode);
  }

  /**
   * Evaluates available cell indices.
   * @param {Array<string|null>} board
   * @returns {number[]} Array of available indices
   */
  function getAvailableMoves(board) {
    const available = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        available.push(i);
      }
    }
    return available;
  }

  /**
   * Kid-friendly AI move generator.
   * Friendly robot balance:
   * 1. If AI can win this turn, take the win (80% friendly consistency).
   * 2. If opponent is about to win, block them (65% friendly consistency).
   * 3. Center preference or random fun playful move, giving kids a joyful chance to win!
   * @param {Object} game - Game state
   * @param {string} [difficulty='friendly'] - 'friendly' | 'easy' | 'smart'
   * @returns {number} Cell index (0-8) or -1 if no moves available
   */
  function getBestMove(game, difficulty = 'friendly') {
    if (!game || !Array.isArray(game.board)) return -1;
    const board = game.board;
    const available = getAvailableMoves(board);
    if (available.length === 0) return -1;

    const aiMarker = game.turn || 'O';
    const playerMarker = aiMarker === 'O' ? 'X' : 'O';

    // Helper: Check if placing marker at idx results in a win
    function findWinningMove(marker) {
      for (let i = 0; i < available.length; i++) {
        const idx = available[i];
        board[idx] = marker;
        const result = checkWinner(board);
        board[idx] = null; // revert
        if (result.winner === marker) {
          return idx;
        }
      }
      return -1;
    }

    // Easy mode: purely playful random
    if (difficulty === 'easy') {
      const randomIndex = Math.floor(Math.random() * available.length);
      return available[randomIndex];
    }

    // Friendly mode (default kid-friendly robot)
    // 1. Can AI win immediately?
    const winMove = findWinningMove(aiMarker);
    if (winMove !== -1) {
      // 85% chance to take winning move in friendly mode
      if (Math.random() < 0.85) {
        return winMove;
      }
    }

    // 2. Can player win next turn? Block them
    const blockMove = findWinningMove(playerMarker);
    if (blockMove !== -1) {
      // 70% chance to block in friendly mode (leaves fun openings for children)
      if (Math.random() < 0.70) {
        return blockMove;
      }
    }

    // 3. Take center if open (50% chance for tactical balance)
    if (available.includes(4) && Math.random() < 0.5) {
      return 4;
    }

    // 4. Take corners or random remaining playful move
    const corners = [0, 2, 6, 8].filter(c => available.includes(c));
    if (corners.length > 0 && Math.random() < 0.5) {
      const randomCorner = corners[Math.floor(Math.random() * corners.length)];
      return randomCorner;
    }

    // Fallback: pick any available move
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  }

  // Export contract to global window
  const TicTacToeGame = {
    WINNING_COMBINATIONS,
    createGame,
    makeMove,
    getBestMove,
    resetRound,
    checkWinner,
    getAvailableMoves
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TicTacToeGame;
  } else {
    root.TicTacToeGame = TicTacToeGame;
  }
})(typeof window !== 'undefined' ? window : this);
