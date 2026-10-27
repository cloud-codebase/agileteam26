/**
 * Pure Tic-Tac-Toe Game Logic Engine
 * Implements window.TicTacToeGame as specified in DESIGN.md
 */

class TicTacToeGame {
    static WINNING_COMBINATIONS = [
        [0, 1, 2], // Row 0
        [3, 4, 5], // Row 1
        [6, 7, 8], // Row 2
        [0, 3, 6], // Column 0
        [1, 4, 7], // Column 1
        [2, 5, 8], // Column 2
        [0, 4, 8], // Diagonal top-left to bottom-right
        [2, 4, 6]  // Diagonal top-right to bottom-left
    ];

    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.winner = null;
        this.isDraw = false;
        this.winningLine = null;
        this.scores = {
            X: 0,
            O: 0,
            ties: 0
        };
    }

    /**
     * Attempts to place the current player's mark on the board.
     * @param {number|string} index - Board cell index (0-8)
     * @returns {Object} Result object { success, winner, isDraw, winningLine, currentPlayer }
     */
    makeMove(index) {
        const cellIndex = Number(index);

        // Validation: must be valid integer index between 0 and 8
        if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) {
            return {
                success: false,
                winner: this.winner,
                isDraw: this.isDraw,
                winningLine: this.winningLine ? [...this.winningLine] : null,
                currentPlayer: this.currentPlayer
            };
        }

        // Move invalid if game is already over or cell is occupied
        if (this.winner !== null || this.isDraw || this.board[cellIndex] !== null) {
            return {
                success: false,
                winner: this.winner,
                isDraw: this.isDraw,
                winningLine: this.winningLine ? [...this.winningLine] : null,
                currentPlayer: this.currentPlayer
            };
        }

        // Place symbol
        this.board[cellIndex] = this.currentPlayer;

        // Check for win
        const winningCombo = this._checkWinner();
        if (winningCombo) {
            this.winner = this.currentPlayer;
            this.winningLine = [...winningCombo];
            this.scores[this.winner] += 1;
        } else if (this._checkDraw()) {
            this.isDraw = true;
            this.scores.ties += 1;
        } else {
            // Toggle turn if game is still active
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        }

        return {
            success: true,
            winner: this.winner,
            isDraw: this.isDraw,
            winningLine: this.winningLine ? [...this.winningLine] : null,
            currentPlayer: this.currentPlayer
        };
    }

    /**
     * Checks if any winning combination is met.
     * @returns {number[]|null} The winning combo array if found, null otherwise
     * @private
     */
    _checkWinner() {
        for (const combo of TicTacToeGame.WINNING_COMBINATIONS) {
            const [a, b, c] = combo;
            if (
                this.board[a] !== null &&
                this.board[a] === this.board[b] &&
                this.board[a] === this.board[c]
            ) {
                return combo;
            }
        }
        return null;
    }

    /**
     * Checks if the board is full without a winner.
     * @returns {boolean}
     * @private
     */
    _checkDraw() {
        return this.board.every(cell => cell !== null);
    }

    /**
     * Resets the current round's board and status, preserving scores.
     */
    resetRound() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.winner = null;
        this.isDraw = false;
        this.winningLine = null;
    }

    /**
     * Resets the current round and clears all accumulated scores.
     */
    resetGame() {
        this.resetRound();
        this.scores = {
            X: 0,
            O: 0,
            ties: 0
        };
    }

    /**
     * Returns a deep copy of the current game state.
     * @returns {Object}
     */
    getState() {
        return {
            board: [...this.board],
            currentPlayer: this.currentPlayer,
            winner: this.winner,
            isDraw: this.isDraw,
            winningLine: this.winningLine ? [...this.winningLine] : null,
            scores: { ...this.scores }
        };
    }
}

// Global browser window attachment
if (typeof window !== 'undefined') {
    window.TicTacToeGame = TicTacToeGame;
}

// CommonJS export support for testing environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TicTacToeGame;
}
