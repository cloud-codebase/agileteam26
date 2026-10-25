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
const statusDisplay = document.getElementById('status');
const cells = document.querySelectorAll('.cell');
const resetButton = document.getElementById('reset-button');

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
  statusDisplay.textContent = message;
  statusDisplay.className = 'status-display';
  if (statusClass) {
    statusDisplay.classList.add(statusClass);
  }
}

// Handle cell click
function handleCellClick(event) {
  const clickedCell = event.target;
  const cellIndex = parseInt(clickedCell.getAttribute('data-index'), 10);

  // If cell is already filled or game is not active, ignore click
  if (boardState[cellIndex] !== '' || !isGameActive) {
    return;
  }

  // Record player move
  boardState[cellIndex] = currentPlayer;
  clickedCell.textContent = currentPlayer;
  clickedCell.classList.add(currentPlayer.toLowerCase());
  clickedCell.setAttribute('aria-label', `Cell ${cellIndex + 1}, Player ${currentPlayer}`);

  // Check for win condition
  const winResult = checkWin();
  if (winResult) {
    isGameActive = false;
    updateStatus(`Player ${winResult.winner} wins!`, 'winner');

    // Highlight winning cells
    winResult.line.forEach(index => {
      cells[index].classList.add('winning');
    });

    // Disable remaining empty cells
    cells.forEach(cell => {
      if (!cell.textContent) {
        cell.disabled = true;
      }
    });
    return;
  }

  // Check for draw condition
  if (checkDraw()) {
    isGameActive = false;
    updateStatus("Game ended in a draw!", 'draw');
    return;
  }

  // Alternate player turn
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus(`Player ${currentPlayer}'s turn`);
}

// Reset the game to initial state
function resetGame() {
  boardState = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  isGameActive = true;

  updateStatus("Player X's turn");

  cells.forEach((cell, index) => {
    cell.textContent = '';
    cell.disabled = false;
    cell.className = 'cell';
    cell.setAttribute('aria-label', `Cell ${index + 1}`);
  });
}

// Attach event listeners
cells.forEach(cell => {
  cell.addEventListener('click', handleCellClick);
});

if (resetButton) {
  resetButton.addEventListener('click', resetGame);
}

// Export for testing in Node / CommonJS environments if applicable
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WINNING_COMBINATIONS,
    boardState,
    checkWin,
    checkDraw,
    resetGame
  };
}
