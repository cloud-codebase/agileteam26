/**
 * chess-engine.js - Pure Chess Rules Engine
 * Exposes window.ChessEngine conforming to DESIGN.md specifications.
 */
(function() {
  'use strict';

  // Piece representation:
  // Each square on an 8x8 board is null or { type: 'p'|'r'|'n'|'b'|'q'|'k', color: 'w'|'b', hasMoved: boolean }
  // Rows: 0 = 8th rank (black pieces), 1 = 7th rank (black pawns), ..., 6 = 2nd rank (white pawns), 7 = 1st rank (white pieces)
  // Cols: 0 = a, 1 = b, 2 = c, 3 = d, 4 = e, 5 = f, 6 = g, 7 = h

  const PIECE_SYMBOLS = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  /**
   * Deep copy of an 8x8 board matrix.
   */
  function cloneBoard(board) {
    if (!board) return null;
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  /**
   * Initializes standard starting 8x8 chess board.
   */
  function initBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));

    // Black major pieces (row 0)
    const backRankPieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: backRankPieces[c], color: 'b', hasMoved: false };
      board[1][c] = { type: 'p', color: 'b', hasMoved: false };
    }

    // White pawns (row 6) and major pieces (row 7)
    for (let c = 0; c < 8; c++) {
      board[6][c] = { type: 'p', color: 'w', hasMoved: false };
      board[7][c] = { type: backRankPieces[c], color: 'w', hasMoved: false };
    }

    return board;
  }

  function isInside(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  /**
   * Find king position for given color ('w'|'white' or 'b'|'black').
   */
  function findKing(board, color) {
    const colCode = normalizeColor(color);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === colCode) {
          return { r, c };
        }
      }
    }
    return null;
  }

  function normalizeColor(color) {
    if (!color) return 'w';
    if (color === 'white' || color === 'w') return 'w';
    if (color === 'black' || color === 'b') return 'b';
    return color;
  }

  function getOppositeColor(color) {
    return normalizeColor(color) === 'w' ? 'b' : 'w';
  }

  /**
   * Generates pseudo-legal moves for a piece at (r, c) ignoring king check.
   */
  function getPseudoMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const { type, color } = piece;
    const enemyColor = getOppositeColor(color);

    if (type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      const promoRow = color === 'w' ? 0 : 7;

      // Single step forward
      const fwdR = r + dir;
      if (isInside(fwdR, c) && !board[fwdR][c]) {
        moves.push({
          toRow: fwdR,
          toCol: c,
          isCapture: false,
          isPromotion: fwdR === promoRow
        });

        // Double step forward from initial rank
        const dblR = r + 2 * dir;
        if (r === startRow && isInside(dblR, c) && !board[dblR][c]) {
          moves.push({
            toRow: dblR,
            toCol: c,
            isCapture: false,
            isPromotion: false
          });
        }
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const capR = r + dir;
        const capC = c + dc;
        if (isInside(capR, capC)) {
          const target = board[capR][capC];
          if (target && target.color === enemyColor) {
            moves.push({
              toRow: capR,
              toCol: capC,
              isCapture: true,
              isPromotion: capR === promoRow
            });
          }
        }
      }
    } else if (type === 'n') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (isInside(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            moves.push({ toRow: nr, toCol: nc, isCapture: false, isPromotion: false });
          } else if (target.color === enemyColor) {
            moves.push({ toRow: nr, toCol: nc, isCapture: true, isPromotion: false });
          }
        }
      }
    } else if (type === 'b' || type === 'r' || type === 'q') {
      const directions = [];
      if (type === 'b' || type === 'q') {
        directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (type === 'r' || type === 'q') {
        directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }

      for (const [dr, dc] of directions) {
        let nr = r + dr;
        let nc = c + dc;
        while (isInside(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            moves.push({ toRow: nr, toCol: nc, isCapture: false, isPromotion: false });
          } else {
            if (target.color === enemyColor) {
              moves.push({ toRow: nr, toCol: nc, isCapture: true, isPromotion: false });
            }
            break; // path blocked
          }
          nr += dr;
          nc += dc;
        }
      }
    } else if (type === 'k') {
      const kingOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      for (const [dr, dc] of kingOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (isInside(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            moves.push({ toRow: nr, toCol: nc, isCapture: false, isPromotion: false });
          } else if (target.color === enemyColor) {
            moves.push({ toRow: nr, toCol: nc, isCapture: true, isPromotion: false });
          }
        }
      }
    }

    return moves;
  }

  /**
   * Checks whether the king of the specified color is currently under attack.
   * @param {Array} board 8x8 board representation
   * @param {string} color 'w'|'white' or 'b'|'black'
   * @returns {boolean}
   */
  function isKingInCheck(board, color) {
    const colCode = normalizeColor(color);
    const kingPos = findKing(board, colCode);
    if (!kingPos) return false;

    const enemyColor = getOppositeColor(colCode);

    // Scan all enemy pieces and see if any can capture the king
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === enemyColor) {
          const pseudoMoves = getPseudoMoves(board, r, c);
          for (const m of pseudoMoves) {
            if (m.toRow === kingPos.r && m.toCol === kingPos.c) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Simulates a move and verifies if it leaves the moving player's king in check.
   */
  function isMoveSafeForKing(board, fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    const testBoard = cloneBoard(board);
    testBoard[toRow][toCol] = { ...piece, hasMoved: true };
    testBoard[fromRow][fromCol] = null;

    // Handle pawn auto-promotion in simulation if needed
    if (piece.type === 'p' && (toRow === 0 || toRow === 7)) {
      testBoard[toRow][toCol].type = 'q';
    }

    return !isKingInCheck(testBoard, piece.color);
  }

  /**
   * Returns array of strictly legal moves for piece at (row, col).
   * @param {Array} board
   * @param {number} row
   * @param {number} col
   * @param {string} [activeTurn] Optional check to ensure it's this piece's turn
   * @returns {Array<{toRow: number, toCol: number, isCapture: boolean, isEnPassant?: boolean, isPromotion?: boolean}>}
   */
  function getLegalMoves(board, row, col, activeTurn) {
    if (!isInside(row, col)) return [];
    const piece = board[row][col];
    if (!piece) return [];

    if (activeTurn) {
      const turnCode = normalizeColor(activeTurn);
      if (piece.color !== turnCode) return [];
    }

    const pseudoMoves = getPseudoMoves(board, row, col);
    const legalMoves = [];

    for (const m of pseudoMoves) {
      if (isMoveSafeForKing(board, row, col, m.toRow, m.toCol)) {
        legalMoves.push({
          toRow: m.toRow,
          toCol: m.toCol,
          isCapture: m.isCapture,
          isPromotion: m.isPromotion || false,
          isEnPassant: false
        });
      }
    }

    return legalMoves;
  }

  /**
   * Returns array of all legal moves for `color`.
   * @param {Array} board
   * @param {string} color 'w'|'white' or 'b'|'black'
   * @returns {Array<{fromRow: number, fromCol: number, toRow: number, toCol: number, isCapture: boolean, isPromotion: boolean}>}
   */
  function getAllLegalMoves(board, color) {
    const colCode = normalizeColor(color);
    const allMoves = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === colCode) {
          const moves = getLegalMoves(board, r, c, colCode);
          for (const m of moves) {
            allMoves.push({
              fromRow: r,
              fromCol: c,
              toRow: m.toRow,
              toCol: m.toCol,
              isCapture: m.isCapture,
              isPromotion: m.isPromotion
            });
          }
        }
      }
    }

    return allMoves;
  }

  /**
   * Evaluates if game is over for `color` whose turn it is.
   * @param {Array} board
   * @param {string} color 'w'|'white' or 'b'|'black'
   * @returns {{ isOver: boolean, result: 'checkmate'|'stalemate'|null, winner: 'white'|'black'|'draw'|null }}
   */
  function isGameOver(board, color) {
    const colCode = normalizeColor(color);
    const legalMoves = getAllLegalMoves(board, colCode);
    const inCheck = isKingInCheck(board, colCode);

    if (legalMoves.length === 0) {
      if (inCheck) {
        return {
          isOver: true,
          result: 'checkmate',
          winner: colCode === 'w' ? 'black' : 'white'
        };
      } else {
        return {
          isOver: true,
          result: 'stalemate',
          winner: 'draw'
        };
      }
    }

    // Insufficient material check (King vs King)
    let pieceCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) pieceCount++;
      }
    }
    if (pieceCount === 2) {
      return {
        isOver: true,
        result: 'stalemate',
        winner: 'draw'
      };
    }

    return {
      isOver: false,
      result: null,
      winner: null
    };
  }

  /**
   * Makes a move on board (or clone), returns updated state.
   * @param {Array} board
   * @param {number} fromRow
   * @param {number} fromCol
   * @param {number} toRow
   * @param {number} toCol
   * @param {string} [promotionPiece='q'] piece type if pawn promotes
   * @returns {{ newBoard: Array, capturedPiece: Object|null, isCheck: boolean, isCheckmate: boolean, isStalemate: boolean }}
   */
  function makeMove(board, fromRow, fromCol, toRow, toCol, promotionPiece) {
    const newBoard = cloneBoard(board);
    const movingPiece = newBoard[fromRow][fromCol];
    if (!movingPiece) {
      throw new Error(`No piece at (${fromRow}, ${fromCol})`);
    }

    const capturedPiece = newBoard[toRow][toCol] ? { ...newBoard[toRow][toCol] } : null;

    // Move piece
    newBoard[toRow][toCol] = {
      ...movingPiece,
      hasMoved: true
    };
    newBoard[fromRow][fromCol] = null;

    // Promotion check
    if (movingPiece.type === 'p' && (toRow === 0 || toRow === 7)) {
      newBoard[toRow][toCol].type = promotionPiece || 'q';
    }

    // Next turn is opponent's turn
    const nextColor = getOppositeColor(movingPiece.color);
    const nextCheck = isKingInCheck(newBoard, nextColor);
    const gameOverStatus = isGameOver(newBoard, nextColor);

    return {
      newBoard,
      capturedPiece,
      isCheck: nextCheck,
      isCheckmate: gameOverStatus.result === 'checkmate',
      isStalemate: gameOverStatus.result === 'stalemate'
    };
  }

  // Public ChessEngine API
  const ChessEngine = {
    initBoard,
    getLegalMoves,
    makeMove,
    isKingInCheck,
    getAllLegalMoves,
    isGameOver,
    cloneBoard,
    PIECE_SYMBOLS,
    normalizeColor,
    getOppositeColor
  };

  // Expose on global window object
  if (typeof window !== 'undefined') {
    window.ChessEngine = ChessEngine;
  }

  // Also support CommonJS/Node environments if tested externally
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessEngine;
  }
})();
