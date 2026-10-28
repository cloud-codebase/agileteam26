/**
 * Tic-Tac-Toe UI Controller & Event Binding (SCRUM-121)
 * Integrates TicTacToeGame engine with DOM elements defined in DESIGN.md.
 */

// Session score state across rounds
const scores = {
  X: 0,
  O: 0,
  ties: 0
};

let game = null;

function initApp(customGame = null) {
  if (customGame) {
    game = customGame;
  } else if (typeof TicTacToeGame !== 'undefined') {
    game = new TicTacToeGame();
  } else if (typeof window !== 'undefined' && window.TicTacToeGame) {
    game = new window.TicTacToeGame();
  }

  const statusEl = document.getElementById('status');
  const scoreXEl = document.getElementById('score-x');
  const scoreOEl = document.getElementById('score-o');
  const scoreTiesEl = document.getElementById('score-ties');
  const cells = document.querySelectorAll('.cell');
  const resetBtn = document.getElementById('reset-btn');
  const resetScoreBtn = document.getElementById('reset-score-btn');

  function updateStatus(text) {
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  function updateScoreboard() {
    if (scoreXEl) scoreXEl.textContent = String(scores.X);
    if (scoreOEl) scoreOEl.textContent = String(scores.O);
    if (scoreTiesEl) scoreTiesEl.textContent = String(scores.ties);
  }

  function handleCellClick(e) {
    if (!game) return;

    const cell = e.currentTarget;
    const indexAttr = cell.getAttribute('data-index');
    if (indexAttr === null) return;

    const index = parseInt(indexAttr, 10);
    const result = game.makeMove(index);

    if (!result || !result.valid) {
      return;
    }

    // Update cell text and player styling class
    cell.textContent = result.player;
    cell.classList.add(result.player.toLowerCase());

    if (result.winner === 'X' || result.winner === 'O') {
      // Highlight winning cells
      if (Array.isArray(result.winningLine)) {
        result.winningLine.forEach(winIdx => {
          const winCell = document.querySelector(`.cell[data-index="${winIdx}"]`) || document.getElementById(`cell-${winIdx}`);
          if (winCell) {
            winCell.classList.add('winner');
          }
        });
      }

      updateStatus(`Player ${result.winner} Wins!`);

      // Disable further board cell clicks
      cells.forEach(c => {
        c.disabled = true;
      });

      // Update score state & UI
      scores[result.winner]++;
      updateScoreboard();
    } else if (result.winner === 'draw') {
      updateStatus("It's a Draw!");

      // Disable further board cell clicks
      cells.forEach(c => {
        c.disabled = true;
      });

      scores.ties++;
      updateScoreboard();
    } else {
      updateStatus(`Player ${result.currentPlayer}'s Turn`);
    }
  }

  function resetRound() {
    if (game) {
      game.reset();
    }

    cells.forEach(cell => {
      cell.textContent = '';
      cell.classList.remove('x', 'o', 'winner');
      cell.disabled = false;
    });

    updateStatus("Player X's Turn");
  }

  function resetScores() {
    scores.X = 0;
    scores.O = 0;
    scores.ties = 0;
    updateScoreboard();
  }

  // Bind cell event listeners
  cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });

  // Bind control button listeners
  if (resetBtn) {
    resetBtn.addEventListener('click', resetRound);
  }

  if (resetScoreBtn) {
    resetScoreBtn.addEventListener('click', resetScores);
  }

  // Initial state rendering
  updateStatus("Player X's Turn");
  updateScoreboard();

  return {
    getGame: () => game,
    getScores: () => ({ ...scores }),
    handleCellClick,
    resetRound,
    resetScores
  };
}

// Auto-initialize when DOM is ready in browser environment
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initApp();
    });
  } else {
    initApp();
  }
}

// Global and module exports
if (typeof window !== 'undefined') {
  window.initApp = initApp;
  window.scores = scores;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initApp,
    scores
  };
}
