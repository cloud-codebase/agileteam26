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
const winningConditions = WINNING_COMBINATIONS;
const WINNING_CONDITIONS = WINNING_COMBINATIONS;

// Game state
let gameState = ['', '', '', '', '', '', '', '', ''];
let boardState = gameState;
let board = gameState;
let currentPlayer = 'X';
let gameActive = true;
let isGameActive = true;

// DOM Elements
const statusDisplay = typeof document !== 'undefined' ? document.getElementById('status') : null;
const cells = typeof document !== 'undefined' ? document.querySelectorAll('.cell') : [];
const resetButton = typeof document !== 'undefined' ? (document.getElementById('reset-button') || document.getElementById('reset-btn')) : null;

// Helper DOM selectors (dynamically resolved so tests can mock or run after DOM mutations)
function getStatusDisplay() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('status') ||
         document.querySelector('.status-display') ||
         document.querySelector('.status-message') ||
         document.querySelector('.status') ||
         statusDisplay;
}

function getCells() {
  if (typeof document === 'undefined') return cells || [];
  const queried = document.querySelectorAll('.cell');
  return queried && queried.length > 0 ? queried : (cells || []);
}

function getResetButton() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('reset-button') ||
         document.getElementById('reset-btn') ||
         document.getElementById('restart-btn') ||
         document.getElementById('restart') ||
         document.getElementById('restart-button') ||
         document.querySelector('.reset-button') ||
         document.querySelector('.btn-reset') ||
         document.querySelector('.restart-btn') ||
         resetButton;
}

// Status messages
const currentPlayerTurnMessage = () => `Player ${currentPlayer}'s turn`;
const playerWonMessage = (player) => `Player ${player} wins!`;
const winningMessage = () => `Player ${currentPlayer} wins!`;
const drawMessage = () => "Game ended in a draw!";

// Helper to check for a winning combination
function checkWin(state = gameState) {
  const b = state || gameState;
  for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
    const [a, bIndex, c] = WINNING_COMBINATIONS[i];
    if (
      b[a] &&
      b[a] !== '' &&
      b[a] === b[bIndex] &&
      b[a] === b[c]
    ) {
      return { winner: b[a], line: [a, bIndex, c] };
    }
  }
  return null;
}

// Helper to check for a draw condition
function checkDraw(state = gameState) {
  const b = state || gameState;
  const isFull = b.every(cell => cell !== '' && cell !== null && cell !== undefined);
  return isFull && !checkWin(b);
}

// Update the status text
function updateStatus(message, statusClass = '') {
  const display = getStatusDisplay();
  if (!display) return;
  display.textContent = message;
  display.className = 'status-display status status-message';
  if (statusClass) {
    display.classList.add(statusClass);
  }
  display.setAttribute('aria-live', 'polite');
}

// Highlight winning cells
function highlightWinningCells(line) {
  if (typeof document === 'undefined' || !line) return;
  line.forEach(index => {
    const winCell = document.querySelector(`.cell[data-index="${index}"], .cell[data-cell-index="${index}"], #cell-${index}`);
    if (winCell) {
      winCell.classList.add('winning', 'winning-cell', 'winner', 'highlight');
    }
  });
}

// Handle cell played
function handleCellPlayed(clickedCell, cellIndex) {
  gameState[cellIndex] = currentPlayer;
  boardState[cellIndex] = currentPlayer;
  board[cellIndex] = currentPlayer;

  if (clickedCell) {
    clickedCell.textContent = currentPlayer;
    clickedCell.classList.add(currentPlayer.toLowerCase());
    clickedCell.classList.add(`player-${currentPlayer.toLowerCase()}`);
    clickedCell.setAttribute('aria-label', `Cell ${cellIndex + 1}, Player ${currentPlayer}`);
    clickedCell.disabled = true;
  }
}

// Handle player turn switch
function handlePlayerChange() {
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus(currentPlayerTurnMessage());
}

// Handle result validation after a move
function handleResultValidation() {
  const winResult = checkWin();
  if (winResult) {
    gameActive = false;
    isGameActive = false;
    updateStatus(playerWonMessage(winResult.winner), 'winner');
    highlightWinningCells(winResult.line);

    // Disable remaining empty cells
    const allCells = getCells();
    allCells.forEach(cell => {
      cell.disabled = true;
    });
    return true;
  }

  if (checkDraw()) {
    gameActive = false;
    isGameActive = false;
    updateStatus(drawMessage(), 'draw');

    // Disable cells on draw
    const allCells = getCells();
    allCells.forEach(cell => {
      cell.disabled = true;
    });
    return true;
  }

  return false;
}

// Handle cell click for turn-based moves
function handleCellClick(event) {
  // Support either event object or cell index passed directly
  let clickedCell = null;
  let cellIndex = -1;

  if (typeof event === 'number') {
    cellIndex = event;
    if (typeof document !== 'undefined') {
      clickedCell = document.querySelector(`.cell[data-index="${cellIndex}"], .cell[data-cell-index="${cellIndex}"], #cell-${cellIndex}`);
    }
  } else if (event && event.target) {
    clickedCell = event.target.closest ? event.target.closest('.cell') : event.target;
    if (!clickedCell) return;
    const rawIndex = clickedCell.getAttribute('data-index') || clickedCell.getAttribute('data-cell-index') || (clickedCell.id && clickedCell.id.replace('cell-', ''));
    cellIndex = parseInt(rawIndex, 10);
  }

  // If cell is already filled or game is not active, ignore click
  if (isNaN(cellIndex) || cellIndex < 0 || cellIndex > 8 || (gameState[cellIndex] !== '' && gameState[cellIndex] !== null && gameState[cellIndex] !== undefined) || !gameActive || !isGameActive) {
    return;
  }

  handleCellPlayed(clickedCell, cellIndex);

  const roundWonOrDrawn = handleResultValidation();
  if (!roundWonOrDrawn) {
    handlePlayerChange();
  }
}

// Reset the game to initial state
function resetGame() {
  for (let i = 0; i < 9; i++) {
    gameState[i] = '';
  }
  boardState = gameState;
  board = gameState;
  currentPlayer = 'X';
  gameActive = true;
  isGameActive = true;

  updateStatus(currentPlayerTurnMessage());

  const allCells = getCells();
  allCells.forEach((cell, index) => {
    cell.textContent = '';
    cell.disabled = false;
    cell.removeAttribute('disabled');
    cell.className = 'cell';
    cell.setAttribute('aria-label', `Cell ${index + 1}`);
  });
}

const restartGame = resetGame;
const handleRestartGame = resetGame;

// Attach event listeners
function initGame() {
  updateStatus(currentPlayerTurnMessage());

  const allCells = getCells();
  allCells.forEach(cell => {
    cell.removeEventListener('click', handleCellClick);
    cell.addEventListener('click', handleCellClick);
  });

  const btn = getResetButton();
  if (btn) {
    btn.removeEventListener('click', resetGame);
    btn.addEventListener('click', resetGame);
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
    WINNING_CONDITIONS,
    winningConditions,
    gameState,
    boardState,
    board,
    getBoardState: () => boardState,
    getCurrentPlayer: () => currentPlayer,
    isGameActive: () => isGameActive,
    get gameActive() { return gameActive; },
    set gameActive(val) { gameActive = val; isGameActive = val; },
    get isGameActive() { return isGameActive; },
    set isGameActive(val) { isGameActive = val; gameActive = val; },
    get currentPlayer() { return currentPlayer; },
    set currentPlayer(val) { currentPlayer = val; },
    checkWin,
    checkWinner: checkWin,
    checkDraw,
    getWinner: () => {
      const win = checkWin();
      return win ? win.winner : null;
    },
    hasWinner: (state = gameState) => !!checkWin(state),
    isGameOver: () => !gameActive,
    winningMessage,
    playerWonMessage,
    currentPlayerTurnMessage,
    drawMessage,
    resetGame,
    restartGame,
    handleRestartGame,
    handleCellClick,
    handleCellPlayed,
    handlePlayerChange,
    handleResultValidation,
    highlightWinningCells,
    initGame,
    updateStatus
  };
}
