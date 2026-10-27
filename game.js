/**
 * TicTacToeGame
 * Core 2-Player Game State and Win/Draw Engine
 * Implements the contract specified in DESIGN.md
 */

class TicTacToeGame {
  constructor() {
    this.reset();
  }

  // Resets board state, currentPlayer to 'X', winner to null, etc.
  reset() {
    this.board = Array(9).fill(null); // 'X' | 'O' | null
    this.currentPlayer = 'X';
    this.winner = null;               // 'X' | 'O' | null
    this.winningLine = null;          // Array of 3 indices, e.g., [0, 1, 2] or null
    this.isDraw = false;              // boolean
    this.gameOver = false;            // boolean
  }

  // Attempts to place move at index (0-8)
  // Returns true if valid move was made, false if invalid or game already over
  makeMove(index) {
    const idx = typeof index === 'string' ? parseInt(index, 10) : index;
    if (this.gameOver || !Number.isInteger(idx) || idx < 0 || idx > 8 || this.board[idx] !== null) {
      return false;
    }
    this.board[idx] = this.currentPlayer;
    this._evaluateGame();
    if (!this.gameOver) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }
    return true;
  }

  _evaluateGame() {
    const winningCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (const combo of winningCombos) {
      const [a, b, c] = combo;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        this.winner = this.board[a];
        this.winningLine = combo;
        this.gameOver = true;
        return;
      }
    }
    if (this.board.every(cell => cell !== null)) {
      this.isDraw = true;
      this.gameOver = true;
    }
  }

  getState() {
    return {
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      winningLine: this.winningLine ? [...this.winningLine] : null,
      isDraw: this.isDraw,
      gameOver: this.gameOver
    };
  }
}

// Make accessible to both browser window and potential node environments
if (typeof window !== 'undefined') {
  window.TicTacToeGame = TicTacToeGame;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TicTacToeGame;
}
