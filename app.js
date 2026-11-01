/**
 * app.js - Single-Player Chess Game Coordinator & AI Opponent
 * Exposes window.ChessApp conforming to DESIGN.md specifications.
 */
(function() {
  'use strict';

  // Piece evaluation values for greedy/tactical AI evaluation
  const PIECE_VALUES = {
    p: 10,
    n: 30,
    b: 35,
    r: 50,
    q: 90,
    k: 1000
  };

  // State management
  let board = null;
  let currentTurn = 'white'; // 'white' | 'black'
  let playerColor = 'white'; // human plays white
  let aiColor = 'black';     // AI plays black
  let selectedSquare = null; // { row, col } or null
  let legalMovesForSelected = []; // Array of move targets { toRow, toCol, isCapture, ... }
  let lastMove = null;       // { fromRow, fromCol, toRow, toCol } or null
  let isAiThinking = false;
  let isGameActive = true;
  let capturedWhitePieces = []; // White pieces captured by Black
  let capturedBlackPieces = []; // Black pieces captured by White

  // DOM Elements cache
  let domElements = {};

  /**
   * Caches DOM references safely.
   */
  function cacheDomElements() {
    domElements = {
      chessboard: document.getElementById('chessboard'),
      currentTurn: document.getElementById('current-turn'),
      gameStatus: document.getElementById('game-status'),
      capturedWhite: document.getElementById('captured-white'),
      capturedBlack: document.getElementById('captured-black'),
      resetBtn: document.getElementById('reset-btn'),
      difficultySelect: document.getElementById('difficulty-select')
    };
  }

  /**
   * Helper to get square DOM element by row and column coordinates.
   */
  function getSquareEl(row, col) {
    if (!domElements.chessboard) return null;
    return domElements.chessboard.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
  }

  /**
   * Renders the board state, piece glyphs, selected highlights,
   * legal targets, last move highlights, and king in-check pulse.
   */
  function renderBoard() {
    if (!domElements.chessboard || !board) return;

    const squares = domElements.chessboard.querySelectorAll('.square');
    squares.forEach(sq => {
      const row = parseInt(sq.dataset.row, 10);
      const col = parseInt(sq.dataset.col, 10);
      const piece = board[row][col];

      // Reset dynamic styling classes while preserving base light/dark classes
      sq.classList.remove('selected', 'legal-target', 'has-piece', 'last-move', 'in-check');
      sq.innerHTML = '';

      // Render piece if present
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece';
        span.dataset.color = piece.color;
        span.dataset.type = piece.type;
        const symbol = (window.ChessEngine && window.ChessEngine.PIECE_SYMBOLS)
          ? window.ChessEngine.PIECE_SYMBOLS[piece.color][piece.type]
          : piece.type;
        span.textContent = symbol;
        sq.appendChild(span);
      }

      // Selected square highlight
      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        sq.classList.add('selected');
      }

      // Last move highlight
      if (lastMove && (
        (lastMove.fromRow === row && lastMove.fromCol === col) ||
        (lastMove.toRow === row && lastMove.toCol === col)
      )) {
        sq.classList.add('last-move');
      }
    });

    // Render legal move indicator overlays
    if (selectedSquare && legalMovesForSelected && legalMovesForSelected.length > 0) {
      legalMovesForSelected.forEach(m => {
        const targetSq = getSquareEl(m.toRow, m.toCol);
        if (targetSq) {
          targetSq.classList.add('legal-target');
          if (m.isCapture || (board[m.toRow][m.toCol] !== null)) {
            targetSq.classList.add('has-piece');
          }
        }
      });
    }

    // Check indicator highlight on the active king if under attack
    if (window.ChessEngine && window.ChessEngine.isKingInCheck(board, currentTurn)) {
      const kingColorCode = currentTurn === 'white' ? 'w' : 'b';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === kingColorCode) {
            const kingSq = getSquareEl(r, c);
            if (kingSq) {
              kingSq.classList.add('in-check');
            }
          }
        }
      }
    }
  }

  /**
   * Updates captured piece trays for White and Black.
   */
  function renderCapturedPieces() {
    if (domElements.capturedWhite) {
      domElements.capturedWhite.innerHTML = '';
      capturedWhitePieces.forEach(p => {
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.dataset.color = 'w';
        span.dataset.type = p.type;
        span.textContent = (window.ChessEngine && window.ChessEngine.PIECE_SYMBOLS)
          ? window.ChessEngine.PIECE_SYMBOLS.w[p.type]
          : p.type;
        domElements.capturedWhite.appendChild(span);
      });
    }

    if (domElements.capturedBlack) {
      domElements.capturedBlack.innerHTML = '';
      capturedBlackPieces.forEach(p => {
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.dataset.color = 'b';
        span.dataset.type = p.type;
        span.textContent = (window.ChessEngine && window.ChessEngine.PIECE_SYMBOLS)
          ? window.ChessEngine.PIECE_SYMBOLS.b[p.type]
          : p.type;
        domElements.capturedBlack.appendChild(span);
      });
    }
  }

  /**
   * Updates turn indicator and status banner text & classes.
   */
  function updateStatus(customBannerText, statusClass) {
    if (domElements.currentTurn) {
      domElements.currentTurn.textContent = currentTurn === 'white' ? 'White' : 'Black';
    }

    if (domElements.gameStatus) {
      domElements.gameStatus.className = 'status-banner';
      if (statusClass) {
        domElements.gameStatus.classList.add(statusClass);
      }

      if (customBannerText) {
        domElements.gameStatus.textContent = customBannerText;
      } else if (!isGameActive) {
        // Leave game-over message as is
      } else if (isAiThinking) {
        domElements.gameStatus.textContent = 'Black (AI) is thinking...';
      } else {
        const inCheck = window.ChessEngine && window.ChessEngine.isKingInCheck(board, currentTurn);
        if (inCheck) {
          domElements.gameStatus.textContent = `${currentTurn === 'white' ? 'White' : 'Black'} is in Check!`;
          domElements.gameStatus.classList.add('alert-check');
        } else {
          domElements.gameStatus.textContent = `${currentTurn === 'white' ? 'White' : 'Black'} to move`;
        }
      }
    }
  }

  /**
   * Handles user clicking on a board square.
   */
  function handleSquareClick(event) {
    if (!isGameActive || isAiThinking) return;
    if (currentTurn !== playerColor) return;

    const squareEl = event.target.closest('.square');
    if (!squareEl) return;

    const row = parseInt(squareEl.dataset.row, 10);
    const col = parseInt(squareEl.dataset.col, 10);
    const clickedPiece = board[row][col];

    // Case 1: Square is one of the legal move targets for the currently selected piece
    if (selectedSquare) {
      const matchingMove = legalMovesForSelected.find(m => m.toRow === row && m.toCol === col);
      if (matchingMove) {
        // Execute player's move
        executeMove(selectedSquare.row, selectedSquare.col, row, col);
        return;
      }
    }

    // Case 2: Clicked on own piece -> select it and compute legal moves
    if (clickedPiece && clickedPiece.color === 'w') {
      selectedSquare = { row, col };
      legalMovesForSelected = window.ChessEngine
        ? window.ChessEngine.getLegalMoves(board, row, col, 'white')
        : [];
      renderBoard();
      return;
    }

    // Case 3: Clicked empty square or opponent piece when not legal target -> deselect
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
  }

  /**
   * Executes a move on the board, updating turn, checking game over, and scheduling AI.
   */
  function executeMove(fromRow, fromCol, toRow, toCol) {
    if (!window.ChessEngine) return;

    const moveResult = window.ChessEngine.makeMove(board, fromRow, fromCol, toRow, toCol);
    board = moveResult.newBoard;
    lastMove = { fromRow, fromCol, toRow, toCol };
    selectedSquare = null;
    legalMovesForSelected = [];

    // Track captured piece
    if (moveResult.capturedPiece) {
      if (moveResult.capturedPiece.color === 'w') {
        capturedWhitePieces.push(moveResult.capturedPiece);
      } else {
        capturedBlackPieces.push(moveResult.capturedPiece);
      }
      renderCapturedPieces();
    }

    // Switch turn
    currentTurn = currentTurn === 'white' ? 'black' : 'white';

    // Check game over for the new active player
    const gameOverStatus = window.ChessEngine.isGameOver(board, currentTurn);
    if (gameOverStatus.isOver) {
      isGameActive = false;
      renderBoard();
      if (gameOverStatus.result === 'checkmate') {
        const winnerName = gameOverStatus.winner === 'white' ? 'White' : 'Black';
        updateStatus(`Checkmate! ${winnerName} wins!`, 'alert-mate');
      } else {
        updateStatus('Draw by Stalemate!', 'alert-mate');
      }
      return;
    }

    renderBoard();
    updateStatus();

    // Trigger AI move if it is AI's turn
    if (currentTurn === aiColor && isGameActive) {
      isAiThinking = true;
      updateStatus();
      setTimeout(makeAiMove, 300);
    }
  }

  /**
   * Evaluates and picks the best move for Black (AI).
   */
  function makeAiMove() {
    if (!isGameActive || currentTurn !== aiColor) {
      isAiThinking = false;
      return;
    }

    const legalMoves = window.ChessEngine
      ? window.ChessEngine.getAllLegalMoves(board, 'black')
      : [];

    if (legalMoves.length === 0) {
      isAiThinking = false;
      const gameOverStatus = window.ChessEngine.isGameOver(board, 'black');
      if (gameOverStatus.isOver) {
        isGameActive = false;
        if (gameOverStatus.result === 'checkmate') {
          updateStatus('Checkmate! White wins!', 'alert-mate');
        } else {
          updateStatus('Draw by Stalemate!', 'alert-mate');
        }
      }
      return;
    }

    const difficulty = domElements.difficultySelect
      ? domElements.difficultySelect.value
      : 'greedy';

    let chosenMove = null;

    if (difficulty === 'random') {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      chosenMove = legalMoves[randomIndex];
    } else {
      // Tactical / Greedy evaluation
      // Prioritizes captures (highest target value - lowest attacker value) and checks
      let bestScore = -Infinity;
      let topMoves = [];

      legalMoves.forEach(m => {
        let score = 0;
        const targetPiece = board[m.toRow][m.toCol];
        const movingPiece = board[m.fromRow][m.fromCol];

        if (targetPiece) {
          const victimVal = PIECE_VALUES[targetPiece.type] || 0;
          const attackerVal = PIECE_VALUES[movingPiece.type] || 0;
          score += (victimVal * 10) - (attackerVal * 0.1);
        }

        // Slight bonus for advancing towards the center
        const centerDistance = Math.abs(3.5 - m.toRow) + Math.abs(3.5 - m.toCol);
        score += (7 - centerDistance);

        // Simulation check: bonus if move delivers check
        try {
          const sim = window.ChessEngine.makeMove(board, m.fromRow, m.fromCol, m.toRow, m.toCol);
          if (sim.isCheckmate) score += 10000;
          else if (sim.isCheck) score += 25;
        } catch (e) {
          // Pass simulation errors
        }

        if (score > bestScore) {
          bestScore = score;
          topMoves = [m];
        } else if (score === bestScore) {
          topMoves.push(m);
        }
      });

      const chosenIndex = Math.floor(Math.random() * topMoves.length);
      chosenMove = topMoves[chosenIndex] || legalMoves[0];
    }

    isAiThinking = false;
    if (chosenMove) {
      executeMove(chosenMove.fromRow, chosenMove.fromCol, chosenMove.toRow, chosenMove.toCol);
    }
  }

  /**
   * Resets the game to initial starting layout.
   */
  function resetGame() {
    if (!window.ChessEngine) return;

    board = window.ChessEngine.initBoard();
    currentTurn = 'white';
    selectedSquare = null;
    legalMovesForSelected = [];
    lastMove = null;
    isAiThinking = false;
    isGameActive = true;
    capturedWhitePieces = [];
    capturedBlackPieces = [];

    renderBoard();
    renderCapturedPieces();
    updateStatus('White to move');
  }

  /**
   * Public initialization method called on DOMContentLoaded.
   */
  function init() {
    cacheDomElements();

    if (domElements.chessboard) {
      domElements.chessboard.addEventListener('click', handleSquareClick);
    }

    if (domElements.resetBtn) {
      domElements.resetBtn.addEventListener('click', resetGame);
    }

    resetGame();
  }

  // Public ChessApp API
  const ChessApp = {
    init,
    resetGame,
    handleSquareClick,
    executeMove,
    makeAiMove,
    renderBoard,
    renderCapturedPieces,
    updateStatus,
    getBoard: () => board,
    getCurrentTurn: () => currentTurn,
    isGameActive: () => isGameActive,
    getSelectedSquare: () => selectedSquare,
    getLastMove: () => lastMove
  };

  // Expose on global window object
  if (typeof window !== 'undefined') {
    window.ChessApp = ChessApp;
    document.addEventListener('DOMContentLoaded', init);
  }

  // Support CommonJS/Node environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessApp;
  }
})();
