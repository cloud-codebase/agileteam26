/**
 * ai-player.js - ChessMaster1 AI Opponent & Evaluation Engine
 * Exposes window.ChessAI with getBestMove(engine, difficulty)
 * Supports 'easy', 'medium', and 'hard' levels.
 */

(function () {
  'use strict';

  // Standard Piece Material Values
  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  // Piece-Square Tables (White perspective, rank 0 to 7 -> row 0 to 7 from White's top/black side to white's bottom)
  // Note: Standard 8x8 arrays where row 0 is rank 8 (Black side), row 7 is rank 1 (White side).
  // For White: row 7 is back rank, row 0 is opponent's back rank.
  // For Black: we mirror the rows (7 - row).

  const PST_PAWN = [
    [  0,  0,  0,  0,  0,  0,  0,  0 ],
    [ 50, 50, 50, 50, 50, 50, 50, 50 ],
    [ 10, 10, 20, 30, 30, 20, 10, 10 ],
    [  5,  5, 10, 25, 25, 10,  5,  5 ],
    [  0,  0,  0, 20, 20,  0,  0,  0 ],
    [  5, -5,-10,  0,  0,-10, -5,  5 ],
    [  5, 10, 10,-20,-20, 10, 10,  5 ],
    [  0,  0,  0,  0,  0,  0,  0,  0 ]
  ];

  const PST_KNIGHT = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ];

  const PST_BISHOP = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ];

  const PST_ROOK = [
    [  0,  0,  0,  0,  0,  0,  0,  0],
    [  5, 10, 10, 10, 10, 10, 10,  5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [  0,  0,  0,  5,  5,  0,  0,  0]
  ];

  const PST_QUEEN = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ];

  const PST_KING_MIDDLE = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ];

  const PST_MAP = {
    p: PST_PAWN,
    n: PST_KNIGHT,
    b: PST_BISHOP,
    r: PST_ROOK,
    q: PST_QUEEN,
    k: PST_KING_MIDDLE
  };

  /**
   * Helper: extract current active turn color from engine.
   * Tolerates engine.currentTurn, engine.turn, or infers from board if needed.
   */
  function getCurrentTurn(engine) {
    if (typeof engine.getTurn === 'function') {
      return engine.getTurn();
    }
    if (engine.currentTurn) return engine.currentTurn;
    if (engine.turn) return engine.turn;
    return 'b'; // default AI color if unspecified
  }

  /**
   * Helper: collect all legal moves for a given color.
   */
  function getAllLegalMoves(engine, color) {
    if (typeof engine.getAllValidMoves === 'function') {
      return engine.getAllValidMoves(color);
    }

    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = engine.getPiece(r, c);
        if (piece && piece.color === color) {
          const valid = engine.getValidMoves(r, c);
          if (Array.isArray(valid)) {
            for (const m of valid) {
              // Ensure from/to structure
              const moveObj = {
                from: m.from || { r, c },
                to: m.to || { r: m.r, c: m.c }
              };
              if (m.flag) moveObj.flag = m.flag;
              if (m.promotion) moveObj.promotion = m.promotion;
              moves.push(moveObj);
            }
          }
        }
      }
    }
    return moves;
  }

  /**
   * Static board evaluation from White's perspective (positive = White winning, negative = Black winning).
   * @param {object} engine - Game engine instance
   * @param {boolean} usePst - Whether to factor in piece-square tables
   */
  function evaluateBoard(engine, usePst = false) {
    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = engine.getPiece(r, c);
        if (!piece) continue;

        const type = piece.type.toLowerCase();
        const baseVal = PIECE_VALUES[type] || 0;
        let positionalVal = 0;

        if (usePst && PST_MAP[type]) {
          const table = PST_MAP[type];
          if (piece.color === 'w') {
            positionalVal = table[r][c];
          } else {
            // Mirror rows for Black
            positionalVal = table[7 - r][c];
          }
        }

        const totalVal = baseVal + positionalVal;
        if (piece.color === 'w') {
          score += totalVal;
        } else {
          score -= totalVal;
        }
      }
    }

    return score;
  }

  /**
   * Minimax algorithm for Medium level (Depth 2, Material-only)
   */
  function minimax(engine, depth, isMaximizing) {
    if (depth === 0) {
      return evaluateBoard(engine, false);
    }

    const color = isMaximizing ? 'w' : 'b';

    if (typeof engine.isCheckmate === 'function' && engine.isCheckmate(color)) {
      return isMaximizing ? -100000 : 100000;
    }
    if (typeof engine.isStalemate === 'function' && engine.isStalemate(color)) {
      return 0;
    }

    const moves = getAllLegalMoves(engine, color);
    if (moves.length === 0) {
      return 0;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        engine.makeMove(move);
        const evaluation = minimax(engine, depth - 1, false);
        engine.undoMove();
        if (evaluation > maxEval) {
          maxEval = evaluation;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        engine.makeMove(move);
        const evaluation = minimax(engine, depth - 1, true);
        engine.undoMove();
        if (evaluation < minEval) {
          minEval = evaluation;
        }
      }
      return minEval;
    }
  }

  /**
   * Minimax with Alpha-Beta Pruning for Hard level (Depth 3, Material + PST)
   */
  function alphaBeta(engine, depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
      return evaluateBoard(engine, true);
    }

    const color = isMaximizing ? 'w' : 'b';

    if (typeof engine.isCheckmate === 'function' && engine.isCheckmate(color)) {
      return isMaximizing ? -100000 + (3 - depth) : 100000 - (3 - depth);
    }
    if (typeof engine.isStalemate === 'function' && engine.isStalemate(color)) {
      return 0;
    }

    const moves = getAllLegalMoves(engine, color);
    if (moves.length === 0) {
      return 0;
    }

    // Move ordering heuristic: capture moves first for tighter alpha-beta cuts
    moves.sort((a, b) => {
      const targetA = engine.getPiece(a.to.r, a.to.c);
      const targetB = engine.getPiece(b.to.r, b.to.c);
      const valA = targetA ? (PIECE_VALUES[targetA.type.toLowerCase()] || 0) : 0;
      const valB = targetB ? (PIECE_VALUES[targetB.type.toLowerCase()] || 0) : 0;
      return valB - valA;
    });

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        engine.makeMove(move);
        const evaluation = alphaBeta(engine, depth - 1, alpha, beta, false);
        engine.undoMove();
        if (evaluation > maxEval) {
          maxEval = evaluation;
        }
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) {
          break; // Beta cutoff
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        engine.makeMove(move);
        const evaluation = alphaBeta(engine, depth - 1, alpha, beta, true);
        engine.undoMove();
        if (evaluation < minEval) {
          minEval = evaluation;
        }
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) {
          break; // Alpha cutoff
        }
      }
      return minEval;
    }
  }

  /**
   * Easy move selection:
   * Mostly greedy captures or sensible random selection.
   */
  function getEasyMove(engine, color, moves) {
    const captures = [];
    const nonCaptures = [];

    for (const move of moves) {
      const target = engine.getPiece(move.to.r, move.to.c);
      if (target && target.color !== color) {
        captures.push({ move, value: PIECE_VALUES[target.type.toLowerCase()] || 0 });
      } else {
        nonCaptures.push(move);
      }
    }

    // 60% chance to prioritize captures if available
    if (captures.length > 0 && Math.random() < 0.65) {
      captures.sort((a, b) => b.value - a.value);
      return captures[0].move;
    }

    // Otherwise random move from pool
    const pool = moves;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }

  /**
   * Medium move selection:
   * Minimax search depth 2 using material evaluation.
   */
  function getMediumMove(engine, color, moves) {
    const isMaximizing = color === 'w';
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestMoves = [];

    for (const move of moves) {
      engine.makeMove(move);
      // After our move, it's the other player's turn to maximize/minimize
      const score = minimax(engine, 1, !isMaximizing);
      engine.undoMove();

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      }
    }

    if (bestMoves.length === 0) return moves[0];
    const randomIndex = Math.floor(Math.random() * bestMoves.length);
    return bestMoves[randomIndex];
  }

  /**
   * Hard move selection:
   * Minimax with Alpha-Beta pruning depth 3 using material + piece-square tables.
   */
  function getHardMove(engine, color, moves) {
    const isMaximizing = color === 'w';
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestMoves = [];
    let alpha = -Infinity;
    let beta = Infinity;

    // Sort moves for better root alpha-beta search
    moves.sort((a, b) => {
      const targetA = engine.getPiece(a.to.r, a.to.c);
      const targetB = engine.getPiece(b.to.r, b.to.c);
      const valA = targetA ? (PIECE_VALUES[targetA.type.toLowerCase()] || 0) : 0;
      const valB = targetB ? (PIECE_VALUES[targetB.type.toLowerCase()] || 0) : 0;
      return valB - valA;
    });

    for (const move of moves) {
      engine.makeMove(move);
      const score = alphaBeta(engine, 2, alpha, beta, !isMaximizing);
      engine.undoMove();

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
        alpha = Math.max(alpha, score);
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
        beta = Math.min(beta, score);
      }
    }

    if (bestMoves.length === 0) return moves[0];
    const randomIndex = Math.floor(Math.random() * bestMoves.length);
    return bestMoves[randomIndex];
  }

  /**
   * Main ChessAI Contract
   */
  const ChessAI = {
    /**
     * Calculates the best move for the active side.
     * @param {object} engine - Instance of ChessEngine
     * @param {string} difficulty - 'easy', 'medium', or 'hard'
     * @returns {object|null} - Move object { from: {r, c}, to: {r, c}, promotion?: string } or null
     */
    getBestMove(engine, difficulty = 'medium') {
      if (!engine) {
        console.error('ChessAI.getBestMove: Engine instance is required.');
        return null;
      }

      const activeColor = getCurrentTurn(engine);
      const moves = getAllLegalMoves(engine, activeColor);

      if (!moves || moves.length === 0) {
        return null;
      }

      const level = (difficulty || 'medium').toLowerCase();
      let selectedMove = null;

      switch (level) {
        case 'easy':
          selectedMove = getEasyMove(engine, activeColor, moves);
          break;
        case 'hard':
          selectedMove = getHardMove(engine, activeColor, moves);
          break;
        case 'medium':
        default:
          selectedMove = getMediumMove(engine, activeColor, moves);
          break;
      }

      if (!selectedMove) {
        selectedMove = moves[0];
      }

      // Check if this move constitutes a pawn promotion
      const piece = engine.getPiece(selectedMove.from.r, selectedMove.from.c);
      if (piece && piece.type.toLowerCase() === 'p') {
        const promoRank = piece.color === 'w' ? 0 : 7;
        if (selectedMove.to.r === promoRank && !selectedMove.promotion) {
          selectedMove.promotion = 'q'; // Default to Queen promotion
        }
      }

      return selectedMove;
    },

    /**
     * Async variant yielding to browser event loop before computation
     * to keep UI animations and sounds unblocked.
     */
    getBestMoveAsync(engine, difficulty = 'medium', delayMs = 150) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const move = ChessAI.getBestMove(engine, difficulty);
          resolve(move);
        }, delayMs);
      });
    },

    /**
     * Helper to evaluate current board score (White's perspective)
     */
    evaluate(engine, usePst = true) {
      return evaluateBoard(engine, usePst);
    }
  };

  // Attach to window object
  if (typeof window !== 'undefined') {
    window.ChessAI = ChessAI;
  }

  // Also support CommonJS/Node environments for testing if required
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessAI;
  }
})();
