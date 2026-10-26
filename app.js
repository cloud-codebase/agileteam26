// TicTacToe Game Logic

// Winning line combinations: 3 horizontal, 3 vertical, 2 diagonal
const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Column 1
  [1, 4, 7], // Column 2
  [2, 5, 8], // Column 3
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6]  // Diagonal top-right to bottom-left
];

// Game state
let boardState = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let isGameActive = true;

// DOM Elements
const statusDisplay = typeof document !== 'undefined' ? document.getElementById('status') : null;
const cells = typeof document !== 'undefined' ? document.querySelectorAll('.cell') : [];
const resetButton = typeof document !== 'undefined' ? (document.getElementById('reset-button') || document.getElementById('reset-btn')) : null;

// Status messages
const currentPlayerTurnMessage = () => `Player ${currentPlayer}'s turn`;
const playerWonMessage = (player) => `Player ${player} wins!`;
const drawMessage = () => "Game ended in a draw!";

// Helper to check for a winning combination
function checkWin() {
  for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
    const [a, b, c] = WINNING_COMBINATIONS[i];
    if (
      boardState[a] !== '' &&
      boardState[a] === boardState[b] &&
      boardState[a] === boardState[c]
    ) {
      return { winner: boardState[a], line: [a, b, c] };
    }
  }
  return null;
}

// Helper to check for a draw condition
function checkDraw() {
  return boardState.every(cell => cell !== '');
}

// Update the status text
function updateStatus(message, statusClass = '') {
  if (!statusDisplay) return;
  statusDisplay.textContent = message;
  statusDisplay.className = 'status-display';
  if (statusClass) {
    statusDisplay.classList.add(statusClass);
  }
}

// Handle cell click for turn-based moves
function handleCellClick(event) {
  const clickedCell = event.target ? event.target.closest('.cell') : null;
  if (!clickedCell) return;

  const rawIndex = clickedCell.getAttribute('data-index') || clickedCell.getAttribute('data-cell-index');
  const cellIndex = parseInt(rawIndex, 10);

  // If cell is already filled or game is not active, ignore click
  if (isNaN(cellIndex) || boardState[cellIndex] !== '' || !isGameActive) {
    return;
  }

  // Record player move in state and DOM
  boardState[cellIndex] = currentPlayer;
  clickedCell.textContent = currentPlayer;
  clickedCell.classList.add(currentPlayer.toLowerCase());
  clickedCell.setAttribute('aria-label', `Cell ${cellIndex + 1}, Player ${currentPlayer}`);
  clickedCell.disabled = true;

  // Check for win condition
  const winResult = checkWin();
  if (winResult) {
    isGameActive = false;
    updateStatus(playerWonMessage(winResult.winner), 'winner');

    // Highlight winning cells
    winResult.line.forEach(index => {
      const winCell = document.querySelector(`.cell[data-index="${index}"], .cell[data-cell-index="${index}"]`);
      if (winCell) {
        winCell.classList.add('winning', 'winning-cell');
      }
    });

    // Disable remaining empty cells
    cells.forEach(cell => {
      cell.disabled = true;
    });
    return;
  }

  // Check for draw condition
  if (checkDraw()) {
    isGameActive = false;
    updateStatus(drawMessage(), 'draw');
    return;
  }

  // Alternate player turn
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus(currentPlayerTurnMessage());
}

// Reset the game to initial state
function resetGame() {
  boardState = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  isGameActive = true;

  updateStatus(currentPlayerTurnMessage());

  cells.forEach((cell, index) => {
    cell.textContent = '';
    cell.disabled = false;
    cell.className = 'cell';
    cell.setAttribute('aria-label', `Cell ${index + 1}`);
  });
}

// Attach event listeners
function initGame() {
  updateStatus(currentPlayerTurnMessage());

  cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });

  if (resetButton) {
    resetButton.addEventListener('click', resetGame);
  }
}

// Run initialization once DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
}

// Export for testing in Node / CommonJS environments if applicable
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WINNING_COMBINATIONS,
    boardState,
    getBoardState: () => boardState,
    getCurrentPlayer: () => currentPlayer,
    isGameActive: () => isGameActive,
    checkWin,
    checkDraw,
    resetGame,
    handleCellClick,
    initGame,
    updateStatus
  };
}
