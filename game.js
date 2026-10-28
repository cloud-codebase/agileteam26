/**
 * TicTacToeGame - Core game logic engine and state management
 * Architecture specification: DESIGN.md
 */
class TicTacToeGame {
  constructor() {
    this.WINNING_COMBINATIONS = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    this.reset();
  }

  /**
   * Resets the game state to initial values.
   */
  reset() {
    this.board = Array(9).fill('');
    this.currentPlayer = 'X';
    this.isGameOver = false;
    this.winner = null;        // 'X' | 'O' | 'draw' | null
    this.winningLine = null;   // [number, number, number] | null
  }

  /**
   * Executes a move on the board for the current player.
   * @param {number|string} index - Board cell index (0-8)
   * @returns {Object} Move result details
   */
  makeMove(index) {
    const cellIndex = Number(index);
    if (this.isGameOver || isNaN(cellIndex) || cellIndex < 0 || cellIndex > 8 || this.board[cellIndex] !== '') {
      return { valid: false, reason: 'Invalid move' };
    }

    this.board[cellIndex] = this.currentPlayer;
    const winCombo = this.checkWin(this.currentPlayer);

    if (winCombo) {
      this.isGameOver = true;
      this.winner = this.currentPlayer;
      this.winningLine = winCombo;
    } else if (this.isBoardFull()) {
      this.isGameOver = true;
      this.winner = 'draw';
      this.winningLine = null;
    } else {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return {
      valid: true,
      index: cellIndex,
      player: this.board[cellIndex],
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      winningLine: this.winningLine,
      isGameOver: this.isGameOver,
      board: [...this.board]
    };
  }

  /**
   * Checks if the given player has won.
   * @param {string} player - 'X' or 'O'
   * @returns {Array<number>|null} Winning combination indices or null
   */
  checkWin(player) {
    for (const combo of this.WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (this.board[a] === player && this.board[b] === player && this.board[c] === player) {
        return combo;
      }
    }
    return null;
  }

  /**
   * Checks whether all board cells are occupied.
   * @returns {boolean}
   */
  isBoardFull() {
    return this.board.every(cell => cell !== '');
  }

  /**
   * Returns a copy of the current board state.
   * @returns {Array<string>}
   */
  getBoard() {
    return [...this.board];
  }

  /**
   * Returns the player whose turn it currently is.
   * @returns {string} 'X' or 'O'
   */
  getCurrentPlayer() {
    return this.currentPlayer;
  }

  /**
   * Returns the winner if the game has ended, or null.
   * @returns {string|null} 'X', 'O', 'draw', or null
   */
  getWinner() {
    return this.winner;
  }

  /**
   * Returns the winning line indices if any, or null.
   * @returns {Array<number>|null}
   */
  getWinningLine() {
    return this.winningLine;
  }

  /**
   * Checks if the game is over.
   * @returns {boolean}
   */
  checkGameOver() {
    return this.isGameOver;
  }
}

if (typeof window !== 'undefined') {
  window.TicTacToeGame = TicTacToeGame;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TicTacToeGame };
}
