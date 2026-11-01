/**
 * ChessMaster1 - Core Chess Rules Engine
 * Implements full rules: board state, legal move generation,
 * check/checkmate/stalemate/draw detection, special moves (castling, en passant, promotion),
 * move history, FEN parsing/generation, and makeMove/undoMove.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChessEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var PIECE_SYMBOLS = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  function cloneBoard(b) {
    var copy = [];
    for (var r = 0; r < 8; r++) {
      var row = [];
      for (var c = 0; c < 8; c++) {
        var p = b[r][c];
        row.push(p ? { type: p.type, color: p.color } : null);
      }
      copy.push(row);
    }
    return copy;
  }

  function cloneCastling(c) {
    return {
      w: { k: c.w.k, q: c.w.q },
      b: { k: c.b.k, q: c.b.q }
    };
  }

  function squareToCoord(sq) {
    if (!sq || sq === '-') return null;
    var file = sq.charCodeAt(0) - 97; // 'a' -> 0
    var rank = 8 - parseInt(sq[1], 10);
    return { r: rank, c: file };
  }

  function coordToSquare(r, c) {
    var file = String.fromCharCode(97 + c);
    var rank = 8 - r;
    return file + rank;
  }

  function ChessEngine() {
    this.board = [];
    this.turn = 'w';
    this.castling = { w: { k: true, q: true }, b: { k: true, q: true } };
    this.enPassant = null; // { r, c } or null
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.history = []; // stack of executed moves & previous states for undo
    this.initBoard();
  }

  ChessEngine.prototype.initBoard = function (fen) {
    this.loadFen(fen || DEFAULT_FEN);
    return this.board;
  };

  ChessEngine.prototype.reset = function () {
    this.history = [];
    this.initBoard(DEFAULT_FEN);
  };

  ChessEngine.prototype.loadFen = function (fen) {
    var parts = (fen || DEFAULT_FEN).trim().split(/\s+/);
    var boardLayout = parts[0];
    var activeTurn = parts[1] || 'w';
    var castlingRights = parts[2] || '-';
    var epSquare = parts[3] || '-';
    var halfMoveClock = parts[4] ? parseInt(parts[4], 10) : 0;
    var fullMoveNumber = parts[5] ? parseInt(parts[5], 10) : 1;

    var b = [];
    var rows = boardLayout.split('/');
    for (var r = 0; r < 8; r++) {
      var row = [];
      var rowStr = rows[r] || '8';
      var c = 0;
      for (var i = 0; i < rowStr.length && c < 8; i++) {
        var ch = rowStr[i];
        if (ch >= '1' && ch <= '8') {
          var emptyCount = parseInt(ch, 10);
          for (var e = 0; e < emptyCount && c < 8; e++) {
            row.push(null);
            c++;
          }
        } else {
          var color = ch === ch.toUpperCase() ? 'w' : 'b';
          var type = ch.toLowerCase();
          row.push({ type: type, color: color });
          c++;
        }
      }
      while (row.length < 8) row.push(null);
      b.push(row);
    }

    this.board = b;
    this.turn = activeTurn === 'b' ? 'b' : 'w';
    this.castling = {
      w: { k: castlingRights.indexOf('K') !== -1, q: castlingRights.indexOf('Q') !== -1 },
      b: { k: castlingRights.indexOf('k') !== -1, q: castlingRights.indexOf('q') !== -1 }
    };
    this.enPassant = squareToCoord(epSquare);
    this.halfMoves = halfMoveClock;
    this.fullMoves = fullMoveNumber;
  };

  ChessEngine.prototype.generateFen = function () {
    var fenRows = [];
    for (var r = 0; r < 8; r++) {
      var rowStr = '';
      var emptyCount = 0;
      for (var c = 0; c < 8; c++) {
        var p = this.board[r][c];
        if (!p) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount;
            emptyCount = 0;
          }
          var ch = p.type;
          rowStr += p.color === 'w' ? ch.toUpperCase() : ch.toLowerCase();
        }
      }
      if (emptyCount > 0) rowStr += emptyCount;
      fenRows.push(rowStr);
    }
    var fen = fenRows.join('/') + ' ' + this.turn + ' ';

    var cRights = '';
    if (this.castling.w.k) cRights += 'K';
    if (this.castling.w.q) cRights += 'Q';
    if (this.castling.b.k) cRights += 'k';
    if (this.castling.b.q) cRights += 'q';
    fen += (cRights || '-') + ' ';

    fen += (this.enPassant ? coordToSquare(this.enPassant.r, this.enPassant.c) : '-') + ' ';
    fen += this.halfMoves + ' ' + this.fullMoves;
    return fen;
  };

  ChessEngine.prototype.getPiece = function (row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col] || null;
  };

  ChessEngine.prototype.getPieceGlyph = function (type, color) {
    if (!type || !color || !PIECE_SYMBOLS[color]) return '';
    return PIECE_SYMBOLS[color][type.toLowerCase()] || '';
  };

  ChessEngine.prototype.getTurn = function () {
    return this.turn;
  };

  ChessEngine.prototype.getBoard = function () {
    return this.board;
  };

  ChessEngine.prototype.findKing = function (color, boardOverride) {
    var b = boardOverride || this.board;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = b[r][c];
        if (p && p.type === 'k' && p.color === color) {
          return { r: r, c: c };
        }
      }
    }
    return null;
  };

  /**
   * Checks if target square (r, c) is attacked by enemy color
   */
  ChessEngine.prototype.isSquareAttacked = function (targetR, targetC, attackerColor, boardOverride) {
    var b = boardOverride || this.board;

    // 1. Pawn attacks
    var pawnDir = attackerColor === 'w' ? 1 : -1; // attackers move forward, so reverse to look from pawn
    var pr = targetR + pawnDir;
    if (pr >= 0 && pr <= 7) {
      if (targetC - 1 >= 0) {
        var pLeft = b[pr][targetC - 1];
        if (pLeft && pLeft.color === attackerColor && pLeft.type === 'p') return true;
      }
      if (targetC + 1 <= 7) {
        var pRight = b[pr][targetC + 1];
        if (pRight && pRight.color === attackerColor && pRight.type === 'p') return true;
      }
    }

    // 2. Knight attacks
    var knightDeltas = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (var ki = 0; ki < knightDeltas.length; ki++) {
      var kr = targetR + knightDeltas[ki][0];
      var kc = targetC + knightDeltas[ki][1];
      if (kr >= 0 && kr <= 7 && kc >= 0 && kc <= 7) {
        var kp = b[kr][kc];
        if (kp && kp.color === attackerColor && kp.type === 'n') return true;
      }
    }

    // 3. Bishop / Queen diagonal rays
    var diagDeltas = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (var di = 0; di < diagDeltas.length; di++) {
      var dr = diagDeltas[di][0];
      var dc = diagDeltas[di][1];
      var cr = targetR + dr;
      var cc = targetC + dc;
      while (cr >= 0 && cr <= 7 && cc >= 0 && cc <= 7) {
        var dp = b[cr][cc];
        if (dp) {
          if (dp.color === attackerColor && (dp.type === 'b' || dp.type === 'q')) return true;
          break;
        }
        cr += dr;
        cc += dc;
      }
    }

    // 4. Rook / Queen straight rays
    var straightDeltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var si = 0; si < straightDeltas.length; si++) {
      var sr = straightDeltas[si][0];
      var sc = straightDeltas[si][1];
      var rr = targetR + sr;
      var rc = targetC + sc;
      while (rr >= 0 && rr <= 7 && rc >= 0 && rc <= 7) {
        var sp = b[rr][rc];
        if (sp) {
          if (sp.color === attackerColor && (sp.type === 'r' || sp.type === 'q')) return true;
          break;
        }
        rr += sr;
        rc += sc;
      }
    }

    // 5. King adjacent
    var kingDeltas = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    for (var kgi = 0; kgi < kingDeltas.length; kgi++) {
      var kgr = targetR + kingDeltas[kgi][0];
      var kgc = targetC + kingDeltas[kgi][1];
      if (kgr >= 0 && kgr <= 7 && kgc >= 0 && kgc <= 7) {
        var kgp = b[kgr][kgc];
        if (kgp && kgp.color === attackerColor && kgp.type === 'k') return true;
      }
    }

    return false;
  };

  /**
   * Generates pseudo-legal moves for a specific piece without check verification
   */
  ChessEngine.prototype.getPseudoMoves = function (r, c) {
    var p = this.board[r][c];
    if (!p) return [];

    var moves = [];
    var color = p.color;
    var oppColor = color === 'w' ? 'b' : 'w';

    if (p.type === 'p') {
      var forward = color === 'w' ? -1 : 1;
      var startRow = color === 'w' ? 6 : 1;
      var promoRow = color === 'w' ? 0 : 7;

      // 1-step forward
      var f1 = r + forward;
      if (f1 >= 0 && f1 <= 7 && !this.board[f1][c]) {
        if (f1 === promoRow) {
          var promoTypes = ['q', 'r', 'b', 'n'];
          for (var pi = 0; pi < promoTypes.length; pi++) {
            moves.push({ from: { r: r, c: c }, to: { r: f1, c: c }, promotion: promoTypes[pi], flag: 'promotion' });
          }
        } else {
          moves.push({ from: { r: r, c: c }, to: { r: f1, c: c } });
        }

        // 2-step forward from starting rank
        var f2 = r + (forward * 2);
        if (r === startRow && !this.board[f2][c]) {
          moves.push({ from: { r: r, c: c }, to: { r: f2, c: c }, flag: 'double-pawn' });
        }
      }

      // Diagonal captures & En Passant
      var capCols = [c - 1, c + 1];
      for (var ci = 0; ci < capCols.length; ci++) {
        var cc = capCols[ci];
        if (cc >= 0 && cc <= 7) {
          var targetPiece = this.board[f1][cc];
          if (targetPiece && targetPiece.color === oppColor) {
            if (f1 === promoRow) {
              var pTypes = ['q', 'r', 'b', 'n'];
              for (var pti = 0; pti < pTypes.length; pti++) {
                moves.push({ from: { r: r, c: c }, to: { r: f1, c: cc }, promotion: pTypes[pti], flag: 'promotion-capture', captured: targetPiece });
              }
            } else {
              moves.push({ from: { r: r, c: c }, to: { r: f1, c: cc }, flag: 'capture', captured: targetPiece });
            }
          } else if (!targetPiece && this.enPassant && this.enPassant.r === f1 && this.enPassant.c === cc) {
            // En Passant capture
            var epCapturedPawn = this.board[r][cc];
            moves.push({ from: { r: r, c: c }, to: { r: f1, c: cc }, flag: 'en-passant', captured: epCapturedPawn });
          }
        }
      }
    } else if (p.type === 'n') {
      var nDeltas = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (var ni = 0; ni < nDeltas.length; ni++) {
        var nr = r + nDeltas[ni][0];
        var nc = c + nDeltas[ni][1];
        if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
          var np = this.board[nr][nc];
          if (!np) {
            moves.push({ from: { r: r, c: c }, to: { r: nr, c: nc } });
          } else if (np.color === oppColor) {
            moves.push({ from: { r: r, c: c }, to: { r: nr, c: nc }, flag: 'capture', captured: np });
          }
        }
      }
    } else if (p.type === 'b' || p.type === 'r' || p.type === 'q') {
      var rays = [];
      if (p.type === 'b' || p.type === 'q') {
        rays.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (p.type === 'r' || p.type === 'q') {
        rays.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }
      for (var ri = 0; ri < rays.length; ri++) {
        var dr = rays[ri][0];
        var dc = rays[ri][1];
        var stepR = r + dr;
        var stepC = c + dc;
        while (stepR >= 0 && stepR <= 7 && stepC >= 0 && stepC <= 7) {
          var destP = this.board[stepR][stepC];
          if (!destP) {
            moves.push({ from: { r: r, c: c }, to: { r: stepR, c: stepC } });
          } else {
            if (destP.color === oppColor) {
              moves.push({ from: { r: r, c: c }, to: { r: stepR, c: stepC }, flag: 'capture', captured: destP });
            }
            break;
          }
          stepR += dr;
          stepC += dc;
        }
      }
    } else if (p.type === 'k') {
      var kDeltas = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      for (var ki = 0; ki < kDeltas.length; ki++) {
        var kr = r + kDeltas[ki][0];
        var kc = c + kDeltas[ki][1];
        if (kr >= 0 && kr <= 7 && kc >= 0 && kc <= 7) {
          var kp = this.board[kr][kc];
          if (!kp) {
            moves.push({ from: { r: r, c: c }, to: { r: kr, c: kc } });
          } else if (kp.color === oppColor) {
            moves.push({ from: { r: r, c: c }, to: { r: kr, c: kc }, flag: 'capture', captured: kp });
          }
        }
      }

      // Castling
      var homeRow = color === 'w' ? 7 : 0;
      if (r === homeRow && c === 4) {
        var cRights = this.castling[color];
        var inCheck = this.isSquareAttacked(homeRow, 4, oppColor);
        if (!inCheck) {
          // Kingside (O-O): squares (homeRow, 5) and (homeRow, 6) empty and unattacked
          if (cRights.k && !this.board[homeRow][5] && !this.board[homeRow][6]) {
            var rookP = this.board[homeRow][7];
            if (rookP && rookP.type === 'r' && rookP.color === color) {
              if (!this.isSquareAttacked(homeRow, 5, oppColor) && !this.isSquareAttacked(homeRow, 6, oppColor)) {
                moves.push({ from: { r: r, c: c }, to: { r: homeRow, c: 6 }, flag: 'kingside-castling' });
              }
            }
          }

          // Queenside (O-O-O): squares (homeRow, 3), (homeRow, 2), and (homeRow, 1) empty; (homeRow, 3) & (homeRow, 2) unattacked
          if (cRights.q && !this.board[homeRow][3] && !this.board[homeRow][2] && !this.board[homeRow][1]) {
            var rookQ = this.board[homeRow][0];
            if (rookQ && rookQ.type === 'r' && rookQ.color === color) {
              if (!this.isSquareAttacked(homeRow, 3, oppColor) && !this.isSquareAttacked(homeRow, 2, oppColor)) {
                moves.push({ from: { r: r, c: c }, to: { r: homeRow, c: 2 }, flag: 'queenside-castling' });
              }
            }
          }
        }
      }
    }

    return moves;
  };

  /**
   * Applies move on a cloned board to test if king remains safe
   */
  ChessEngine.prototype.wouldCauseCheck = function (move, color) {
    var p = this.board[move.from.r][move.from.c];
    if (!p) return true;

    // Simulate board
    var tempBoard = cloneBoard(this.board);
    var movingPiece = tempBoard[move.from.r][move.from.c];

    // Handle en passant simulation
    if (move.flag === 'en-passant') {
      var forward = color === 'w' ? -1 : 1;
      tempBoard[move.to.r - forward][move.to.c] = null;
    }

    // Handle promotion simulation
    if (move.promotion) {
      movingPiece = { type: move.promotion.toLowerCase(), color: color };
    }

    // Move piece
    tempBoard[move.to.r][move.to.c] = movingPiece;
    tempBoard[move.from.r][move.from.c] = null;

    // Find king square on temp board
    var kingPos = this.findKing(color, tempBoard);
    if (!kingPos) return true; // king vanished

    var oppColor = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(kingPos.r, kingPos.c, oppColor, tempBoard);
  };

  /**
   * Returns valid legal moves for a piece at (row, col)
   */
  ChessEngine.prototype.getValidMoves = function (row, col) {
    var p = this.board[row][col];
    if (!p || p.color !== this.turn) return [];

    var pseudo = this.getPseudoMoves(row, col);
    var legal = [];
    for (var i = 0; i < pseudo.length; i++) {
      if (!this.wouldCauseCheck(pseudo[i], p.color)) {
        legal.push(pseudo[i]);
      }
    }
    return legal;
  };

  /**
   * Returns all valid moves for active turn
   */
  ChessEngine.prototype.getAllValidMoves = function (color) {
    var activeColor = color || this.turn;
    var allMoves = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = this.board[r][c];
        if (p && p.color === activeColor) {
          var moves = this.getValidMoves(r, c);
          for (var m = 0; m < moves.length; m++) {
            allMoves.push(moves[m]);
          }
        }
      }
    }
    return allMoves;
  };

  ChessEngine.prototype.isCheck = function (color) {
    var checkColor = color || this.turn;
    var oppColor = checkColor === 'w' ? 'b' : 'w';
    var kingPos = this.findKing(checkColor);
    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos.r, kingPos.c, oppColor);
  };

  ChessEngine.prototype.isCheckmate = function (color) {
    var checkColor = color || this.turn;
    if (!this.isCheck(checkColor)) return false;
    var moves = this.getAllValidMoves(checkColor);
    return moves.length === 0;
  };

  ChessEngine.prototype.isStalemate = function (color) {
    var checkColor = color || this.turn;
    if (this.isCheck(checkColor)) return false;
    var moves = this.getAllValidMoves(checkColor);
    return moves.length === 0;
  };

  ChessEngine.prototype.isDraw = function () {
    // 50-move rule
    if (this.halfMoves >= 100) return true;

    // Stalemate
    if (this.isStalemate(this.turn)) return true;

    // Insufficient material check
    var pieces = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = this.board[r][c];
        if (p) pieces.push(p);
      }
    }
    if (pieces.length === 2) return true; // K vs K
    if (pieces.length === 3) {
      // K+B vs K or K+N vs K
      for (var i = 0; i < pieces.length; i++) {
        if (pieces[i].type === 'b' || pieces[i].type === 'n') return true;
      }
    }

    return false;
  };

  /**
   * Converts a move to Standard Algebraic Notation (SAN)
   */
  ChessEngine.prototype.moveToSan = function (move) {
    var p = this.board[move.from.r][move.from.c];
    if (!p) return '';

    if (move.flag === 'kingside-castling') return 'O-O';
    if (move.flag === 'queenside-castling') return 'O-O-O';

    var san = '';
    if (p.type !== 'p') {
      san += p.type.toUpperCase();
    } else if (move.flag === 'capture' || move.flag === 'promotion-capture' || move.flag === 'en-passant') {
      san += String.fromCharCode(97 + move.from.c);
    }

    if (move.flag === 'capture' || move.flag === 'promotion-capture' || move.flag === 'en-passant') {
      san += 'x';
    }

    san += coordToSquare(move.to.r, move.to.c);

    if (move.promotion) {
      san += '=' + move.promotion.toUpperCase();
    }

    return san;
  };

  /**
   * Executes a move, updating the board, castling rights, en passant, clocks, and history
   */
  ChessEngine.prototype.makeMove = function (move) {
    var from = move.from;
    var to = move.to;
    var p = this.board[from.r][from.c];
    if (!p) return false;

    // Store state in history for undo
    var prevState = {
      board: cloneBoard(this.board),
      turn: this.turn,
      castling: cloneCastling(this.castling),
      enPassant: this.enPassant ? { r: this.enPassant.r, c: this.enPassant.c } : null,
      halfMoves: this.halfMoves,
      fullMoves: this.fullMoves,
      move: {
        from: { r: from.r, c: from.c },
        to: { r: to.r, c: to.c },
        piece: { type: p.type, color: p.color },
        promotion: move.promotion || null,
        flag: move.flag || null,
        captured: move.captured || (this.board[to.r][to.c] ? { type: this.board[to.r][to.c].type, color: this.board[to.r][to.c].color } : null),
        san: ''
      }
    };

    var sanBase = this.moveToSan(move);

    // Track capture / pawn move for 50-move clock
    var isPawnMove = p.type === 'p';
    var isCapture = !!this.board[to.r][to.c] || move.flag === 'en-passant';

    // Move piece on board
    this.board[from.r][from.c] = null;

    if (move.flag === 'en-passant') {
      var forward = p.color === 'w' ? -1 : 1;
      this.board[to.r - forward][to.c] = null;
    } else if (move.flag === 'kingside-castling') {
      // Move rook from col 7 to col 5
      var rookK = this.board[from.r][7];
      this.board[from.r][7] = null;
      this.board[from.r][5] = rookK;
    } else if (move.flag === 'queenside-castling') {
      // Move rook from col 0 to col 3
      var rookQ = this.board[from.r][0];
      this.board[from.r][0] = null;
      this.board[from.r][3] = rookQ;
    }

    if (move.promotion) {
      this.board[to.r][to.c] = { type: move.promotion.toLowerCase(), color: p.color };
    } else {
      this.board[to.r][to.c] = p;
    }

    // Update castling rights if king or rook moved or was captured
    if (p.type === 'k') {
      this.castling[p.color].k = false;
      this.castling[p.color].q = false;
    } else if (p.type === 'r') {
      if (from.r === 7 && from.c === 7) this.castling.w.k = false;
      if (from.r === 7 && from.c === 0) this.castling.w.q = false;
      if (from.r === 0 && from.c === 7) this.castling.b.k = false;
      if (from.r === 0 && from.c === 0) this.castling.b.q = false;
    }

    // If opponent rook captured on original square
    if (to.r === 7 && to.c === 7) this.castling.w.k = false;
    if (to.r === 7 && to.c === 0) this.castling.w.q = false;
    if (to.r === 0 && to.c === 7) this.castling.b.k = false;
    if (to.r === 0 && to.c === 0) this.castling.b.q = false;

    // Update En Passant square
    if (move.flag === 'double-pawn' || (p.type === 'p' && Math.abs(to.r - from.r) === 2)) {
      this.enPassant = { r: (from.r + to.r) / 2, c: from.c };
    } else {
      this.enPassant = null;
    }

    // Update half-moves
    if (isPawnMove || isCapture) {
      this.halfMoves = 0;
    } else {
      this.halfMoves++;
    }

    // Full move counter
    if (this.turn === 'b') {
      this.fullMoves++;
    }

    // Switch turn
    this.turn = this.turn === 'w' ? 'b' : 'w';

    // Check / Checkmate annotation on SAN
    var isCm = this.isCheckmate(this.turn);
    var isChk = this.isCheck(this.turn);
    if (isCm) {
      sanBase += '#';
    } else if (isChk) {
      sanBase += '+';
    }
    prevState.move.san = sanBase;

    this.history.push(prevState);
    return true;
  };

  /**
   * Undoes the last move
   */
  ChessEngine.prototype.undoMove = function () {
    if (this.history.length === 0) return null;
    var lastState = this.history.pop();
    this.board = lastState.board;
    this.turn = lastState.turn;
    this.castling = lastState.castling;
    this.enPassant = lastState.enPassant;
    this.halfMoves = lastState.halfMoves;
    this.fullMoves = lastState.fullMoves;
    return lastState.move;
  };

  ChessEngine.prototype.getHistory = function () {
    var list = [];
    for (var i = 0; i < this.history.length; i++) {
      list.push(this.history[i].move);
    }
    return list;
  };

  ChessEngine.prototype.getLastMove = function () {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1].move;
  };

  return ChessEngine;
});
