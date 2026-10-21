/**
 * Tic-Tac-Toe Game Logic & UI Controller
 * Handles board state, player turns, move validation, win/draw detection, and score tracking.
 */

// Predefined constant array of 8 winning combinations:
// 3 horizontal rows, 3 vertical columns, and 2 diagonals
const WINNING_COMBINATIONS = [
  // Horizontal rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Vertical columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6]
];

// Game state variables
let board = Array(9).fill('');
let currentPlayer = 'X';
let gameActive = true;

// Scoreboard tracking
const scores = {
  X: 0,
  O: 0,
  draws: 0
};

/**
 * Evaluates whether there is a winning combination on the board.
 * @param {Array<string>} currentBoard - 9-element array of cell values.
 * @returns {{ winner: string, combination: number[] } | null}
 */
function checkWin(currentBoard = board) {
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    if (
      currentBoard[a] !== '' &&
      currentBoard[a] === currentBoard[b] &&
      currentBoard[a] === currentBoard[c]
    ) {
      return {
        winner: currentBoard[a],
        combination: combination
      };
    }
  }
  return null;
}

/**
 * Evaluates whether the game has resulted in a draw (all 9 cells filled and no winner).
 * @param {Array<string>} currentBoard - 9-element array of cell values.
 * @returns {boolean}
 */
function checkDraw(currentBoard = board) {
  const isAllFilled = currentBoard.every(cell => cell !== '');
  return isAllFilled && checkWin(currentBoard) === null;
}

/**
 * Handles cell click events.
 * Validates moves, checks win/draw condition, updates state, and manages turn transitions.
 * Supports being called with either a cell index (number) or a DOM Event.
 * @param {number|Event} targetOrIndex - Index of clicked cell (0-8) or click Event.
 */
function handleCellClick(targetOrIndex) {
  let index;
  if (typeof targetOrIndex === 'number') {
    index = targetOrIndex;
  } else if (targetOrIndex && targetOrIndex.currentTarget) {
    const elem = targetOrIndex.currentTarget;
    index = parseInt(elem.getAttribute('data-cell-index') || elem.getAttribute('data-index'), 10);
  } else if (targetOrIndex && targetOrIndex.target) {
    const elem = targetOrIndex.target;
    index = parseInt(elem.getAttribute('data-cell-index') || elem.getAttribute('data-index'), 10);
  }

  // Move validation: ignore clicks if game is inactive, invalid index, or cell already occupied
  if (!gameActive || index === undefined || isNaN(index) || index < 0 || index > 8 || board[index] !== '') {
    return;
  }

  // Execute valid move
  makeMove(index);
}

/**
 * Executes a valid move:
 * - Updates in-memory board state array
 * - Renders cell DOM with symbol and styling class
 * - Evaluates win or draw condition, or switches player turn
 * @param {number} index
 */
function makeMove(index) {
  board[index] = currentPlayer;
  renderCell(index, currentPlayer);

  // Evaluate win condition
  const winResult = checkWin(board);
  if (winResult) {
    handleWin(winResult);
    return;
  }

  // Evaluate draw condition
  if (checkDraw(board)) {
    handleDraw();
    return;
  }

  // Valid move completed and game continues: switch player turn alternately
  switchTurn();
}

/**
 * Switches current player turn and updates status indicator.
 */
function switchTurn() {
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateTurnIndicatorUI();
}

/**
 * Updates UI when a player wins:
 * Highlights winning cells, updates status banner, increments score, and locks board.
 * @param {{ winner: string, combination: number[] }} winResult
 */
function handleWin(winResult) {
  gameActive = false;
  scores[winResult.winner]++;
  updateScoreboardUI();

  // Highlight the 3 winning cells
  highlightWinningCells(winResult.combination);

  // Announce the winner clearly in status banner
  const statusBanner = document.getElementById('status-banner') || document.getElementById('status');
  if (statusBanner) {
    statusBanner.className = 'status-banner winner-banner';
    statusBanner.innerHTML = `🎉 Player <span class="player-indicator player-${winResult.winner.toLowerCase()}">${winResult.winner}</span> Wins!`;
  }

  // Lock board cells
  lockBoard();
}

/**
 * Updates UI when the game ends in a draw:
 * Updates status banner, increments draw score, and locks board.
 */
function handleDraw() {
  gameActive = false;
  scores.draws++;
  updateScoreboardUI();

  // Announce draw in status banner
  const statusBanner = document.getElementById('status-banner') || document.getElementById('status');
  if (statusBanner) {
    statusBanner.className = 'status-banner draw-banner';
    statusBanner.textContent = `🤝 Game Ended in a Draw!`;
  }

  // Lock board cells
  lockBoard();
}

/**
 * Highlights winning combination cells with CSS classes.
 * @param {number[]} combination
 */
function highlightWinningCells(combination) {
  if (typeof document === 'undefined') return;
  const cells = document.querySelectorAll('.cell');
  combination.forEach(idx => {
    if (cells[idx]) {
      cells[idx].classList.add('winner', 'winning-cell');
    }
  });
}

/**
 * Locks the board to prevent further moves after game completion.
 */
function lockBoard() {
  if (typeof document === 'undefined') return;
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.setAttribute('disabled', 'true');
  });
}

/**
 * Renders symbol on specified cell DOM element.
 * @param {number} index
 * @param {string} player
 */
function renderCell(index, player) {
  if (typeof document === 'undefined') return;
  const cells = document.querySelectorAll('.cell');
  const cell = cells[index];
  if (cell) {
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
    cell.setAttribute('disabled', 'true');
    cell.setAttribute('aria-label', `Cell ${index + 1}, ${player}`);
  }
}

/**
 * Updates current turn display banner.
 */
function updateTurnIndicatorUI() {
  const statusBanner = document.getElementById('status-banner') || document.getElementById('status');
  if (statusBanner) {
    statusBanner.className = 'status-banner';
    statusBanner.innerHTML = `Current Turn: <span id="current-player" class="player-indicator player-${currentPlayer.toLowerCase()}">${currentPlayer}</span>`;
  }
}

/**
 * Updates scoreboard UI numbers.
 */
function updateScoreboardUI() {
  if (typeof document === 'undefined') return;
  const scoreXElem = document.getElementById('score-x');
  const scoreOElem = document.getElementById('score-o');
  const scoreDrawsElem = document.getElementById('score-draws') || document.getElementById('score-ties');

  if (scoreXElem) scoreXElem.textContent = scores.X;
  if (scoreOElem) scoreOElem.textContent = scores.O;
  if (scoreDrawsElem) scoreDrawsElem.textContent = scores.draws;
}

/**
 * Restarts the round without resetting scores.
 */
function restartGame() {
  board = Array(9).fill('');
  currentPlayer = 'X';
  gameActive = true;

  if (typeof document !== 'undefined') {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, idx) => {
      cell.textContent = '';
      cell.className = 'cell';
      cell.removeAttribute('disabled');
      cell.setAttribute('aria-label', `Cell ${idx + 1}`);
    });
    updateTurnIndicatorUI();
  }
}

/**
 * Resets score tracking and restarts game.
 */
function resetScore() {
  scores.X = 0;
  scores.O = 0;
  scores.draws = 0;
  updateScoreboardUI();
  restartGame();
}

/**
 * Initializes DOM Event Listeners when the document is ready.
 */
function initApp() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
  }

  const resetScoreBtn = document.getElementById('reset-score-btn');
  if (resetScoreBtn) {
    resetScoreBtn.addEventListener('click', resetScore);
  }

  updateTurnIndicatorUI();
  updateScoreboardUI();
}

// Attach DOM Event Listeners if running in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Global window exposure for testability / external consumers
  window.TicTacToe = {
    WINNING_COMBINATIONS,
    getBoard: () => [...board],
    getCurrentPlayer: () => currentPlayer,
    isGameActive: () => gameActive,
    getScores: () => ({ ...scores }),
    handleCellClick,
    makeMove,
    restartGame,
    resetScore,
    resetScores: resetScore
  };
}

// Export for unit tests (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WINNING_COMBINATIONS,
    checkWin,
    checkDraw,
    handleCellClick,
    makeMove,
    switchTurn,
    restartGame,
    resetScore,
    getBoard: () => board,
    setBoard: (newBoard) => { board = [...newBoard]; },
    getCurrentPlayer: () => currentPlayer,
    setCurrentPlayer: (p) => { currentPlayer = p; },
    isGameActive: () => gameActive,
    setGameActive: (state) => { gameActive = state; },
    getScores: () => ({ ...scores })
  };
}
