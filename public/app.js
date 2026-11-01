/**
 * ChessMaster1 - Game Interaction Controller
 * Connects ChessEngine, ChessAI, and responsive DOM UI.
 * Handles drag-and-drop & click-to-move, pawn promotion dialog, timers,
 * captured pieces display, move history, sounds/audio effects via Web Audio API,
 * undo, restart, and AI opponent trigger.
 */

(function () {
  'use strict';

  // Game State Variables
  let engine = null;
  let selectedSquare = null; // { r, c }
  let validMovesForSelected = []; // array of valid move objects
  let playerColor = 'white'; // 'white' | 'black'
  let aiDifficulty = 'medium'; // 'easy' | 'medium' | 'hard'
  let isGameOver = false;
  let isAiThinking = false;
  let pendingPromotionMove = null; // saved move waiting for modal selection

  // Timers: 10 minutes (600 seconds) each
  const INITIAL_TIME_SECONDS = 600;
  let whiteTimeRemaining = INITIAL_TIME_SECONDS;
  let blackTimeRemaining = INITIAL_TIME_SECONDS;
  let timerInterval = null;

  // Web Audio Context for synthesized sound effects
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'move') {
        // Crisp wooden tap sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'capture') {
        // Heavier capture strike
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'check') {
        // High alert ping
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.setValueAtTime(740, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'gameover') {
        // Resolving minor chord arpeggio
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(250, now + 0.15);
        osc.frequency.setValueAtTime(200, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      // Audio playback fails silently if browser blocks autoplay
    }
  }

  // DOM Elements cache
  let dom = {};

  function cacheDom() {
    dom = {
      chessboard: document.getElementById('chessboard'),
      difficultySelect: document.getElementById('difficulty-select'),
      playerColorSelect: document.getElementById('player-color-select'),
      btnNewGame: document.getElementById('btn-new-game'),
      btnRestart: document.getElementById('btn-restart'),
      btnUndo: document.getElementById('btn-undo'),
      turnIndicator: document.getElementById('turn-indicator'),
      gameStatus: document.getElementById('game-status'),
      whiteTimer: document.getElementById('white-timer'),
      blackTimer: document.getElementById('black-timer'),
      moveHistoryList: document.getElementById('move-history-list'),
      moveCount: document.getElementById('move-count'),
      capturedWhite: document.getElementById('captured-white'),
      capturedBlack: document.getElementById('captured-black'),
      promotionModal: document.getElementById('promotion-modal'),
      promotionChoices: document.getElementById('promotion-choices'),
      userName: document.getElementById('user-name'),
      userBadge: document.getElementById('user-badge'),
      userAvatar: document.getElementById('user-avatar'),
      opponentName: document.getElementById('opponent-name'),
      opponentBadge: document.getElementById('opponent-badge'),
      opponentAvatar: document.getElementById('opponent-avatar')
    };
  }

  // Formatter for MM:SS timer
  function formatTime(totalSeconds) {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.floor(Math.max(0, totalSeconds) % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      if (isGameOver) {
        stopTimer();
        return;
      }

      const activeTurn = engine.getTurn(); // 'w' or 'b'
      if (activeTurn === 'w') {
        whiteTimeRemaining--;
        if (dom.whiteTimer) dom.whiteTimer.textContent = formatTime(whiteTimeRemaining);
        if (whiteTimeRemaining <= 0) {
          handleTimeOut('w');
        }
      } else {
        blackTimeRemaining--;
        if (dom.blackTimer) dom.blackTimer.textContent = formatTime(blackTimeRemaining);
        if (blackTimeRemaining <= 0) {
          handleTimeOut('b');
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetTimers() {
    stopTimer();
    whiteTimeRemaining = INITIAL_TIME_SECONDS;
    blackTimeRemaining = INITIAL_TIME_SECONDS;
    if (dom.whiteTimer) dom.whiteTimer.textContent = formatTime(whiteTimeRemaining);
    if (dom.blackTimer) dom.blackTimer.textContent = formatTime(blackTimeRemaining);
  }

  function handleTimeOut(color) {
    isGameOver = true;
    stopTimer();
    const loser = color === 'w' ? 'White' : 'Black';
    const winner = color === 'w' ? 'Black' : 'White';
    updateStatusBanner(`${loser} ran out of time! ${winner} wins.`, 'alert-win');
    playSound('gameover');
  }

  function updateStatusBanner(text, alertClass = null) {
    if (!dom.gameStatus) return;
    dom.gameStatus.textContent = text;
    dom.gameStatus.className = 'status-banner';
    if (alertClass) {
      dom.gameStatus.classList.add(alertClass);
    }
  }

  function updatePlayerCards() {
    const isPlayerWhite = playerColor === 'white';
    if (dom.userName) dom.userName.textContent = 'Player';
    if (dom.userBadge) dom.userBadge.textContent = isPlayerWhite ? 'White' : 'Black';
    if (dom.userAvatar) dom.userAvatar.textContent = isPlayerWhite ? '♔' : '♚';

    const diffLabel = aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1);
    if (dom.opponentName) dom.opponentName.textContent = `AI Bot (${diffLabel})`;
    if (dom.opponentBadge) dom.opponentBadge.textContent = isPlayerWhite ? 'Black' : 'White';
    if (dom.opponentAvatar) dom.opponentAvatar.textContent = '🤖';
  }

  function updateTurnUI() {
    const turn = engine.getTurn(); // 'w' or 'b'
    const isPlayerTurn = (turn === 'w' && playerColor === 'white') || (turn === 'b' && playerColor === 'black');

    if (dom.turnIndicator) {
      if (turn === 'w') {
        dom.turnIndicator.textContent = isPlayerTurn ? "Your Turn (White)" : "AI's Turn (White)";
        dom.turnIndicator.className = 'turn-badge turn-white';
      } else {
        dom.turnIndicator.textContent = isPlayerTurn ? "Your Turn (Black)" : "AI's Turn (Black)";
        dom.turnIndicator.className = 'turn-badge turn-black';
      }
    }

    if (dom.whiteTimer) {
      dom.whiteTimer.classList.toggle('timer-active', turn === 'w' && !isGameOver);
    }
    if (dom.blackTimer) {
      dom.blackTimer.classList.toggle('timer-active', turn === 'b' && !isGameOver);
    }

    // Status Banner Updates
    if (isGameOver) return;

    if (engine.isCheck(turn)) {
      const side = turn === 'w' ? 'White' : 'Black';
      updateStatusBanner(`Check! ${side} King is under attack!`, 'alert-check');
      playSound('check');
    } else if (isAiThinking) {
      updateStatusBanner('AI is contemplating move...');
    } else {
      updateStatusBanner(isPlayerTurn ? 'Your turn to move' : 'Waiting for AI...');
    }
  }

  function updateCapturedPieces() {
    if (!dom.capturedWhite || !dom.capturedBlack) return;

    // Standard starting pieces count
    const startingCounts = {
      p: 8, r: 2, n: 2, b: 2, q: 1
    };

    const currentCounts = {
      w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
      b: { p: 0, r: 0, n: 0, b: 0, q: 0 }
    };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = engine.getPiece(r, c);
        if (piece && piece.type !== 'k') {
          if (currentCounts[piece.color] && currentCounts[piece.color][piece.type] !== undefined) {
            currentCounts[piece.color][piece.type]++;
          }
        }
      }
    }

    // Captured white pieces = starting white minus current white
    let capturedWhiteHtml = '';
    for (const [type, startCount] of Object.entries(startingCounts)) {
      const lost = Math.max(0, startCount - currentCounts.w[type]);
      for (let i = 0; i < lost; i++) {
        capturedWhiteHtml += `<span class="captured-glyph piece-white">${engine.getPieceGlyph(type, 'w')}</span>`;
      }
    }

    // Captured black pieces = starting black minus current black
    let capturedBlackHtml = '';
    for (const [type, startCount] of Object.entries(startingCounts)) {
      const lost = Math.max(0, startCount - currentCounts.b[type]);
      for (let i = 0; i < lost; i++) {
        capturedBlackHtml += `<span class="captured-glyph piece-black">${engine.getPieceGlyph(type, 'b')}</span>`;
      }
    }

    // Display under respective player bars
    dom.capturedWhite.innerHTML = capturedWhiteHtml;
    dom.capturedBlack.innerHTML = capturedBlackHtml;
  }

  function updateMoveHistory() {
    if (!dom.moveHistoryList) return;
    const history = engine.getHistory(); // array of moves with san
    dom.moveHistoryList.innerHTML = '';

    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = history[i] ? history[i].san : '';
      const blackMove = history[i + 1] ? history[i + 1].san : '';

      const row = document.createElement('li');
      row.className = 'move-history-row';
      row.innerHTML = `
        <span class="move-num">${moveNum}.</span>
        <span class="move-white">${whiteMove}</span>
        <span class="move-black">${blackMove}</span>
      `;
      dom.moveHistoryList.appendChild(row);
    }

    if (dom.moveCount) {
      dom.moveCount.textContent = `${history.length} half-moves`;
    }

    // Scroll to latest move
    const container = dom.moveHistoryList.parentElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function renderBoard() {
    if (!dom.chessboard) return;
    dom.chessboard.innerHTML = '';

    const isFlipped = playerColor === 'black';
    const lastMove = engine.getLastMove();
    const activeTurn = engine.getTurn();
    const isKingInCheck = engine.isCheck(activeTurn);
    const checkedKingPos = isKingInCheck ? engine.findKing(activeTurn) : null;

    for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
      for (let colIdx = 0; colIdx < 8; colIdx++) {
        const r = isFlipped ? 7 - rowIdx : rowIdx;
        const c = isFlipped ? 7 - colIdx : colIdx;

        const isLight = (r + c) % 2 === 0;
        const squareEl = document.createElement('div');
        squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
        squareEl.dataset.row = r;
        squareEl.dataset.col = c;
        squareEl.id = `sq-${r}-${c}`;

        // Last move highlight
        if (lastMove) {
          if ((lastMove.from.r === r && lastMove.from.c === c) ||
              (lastMove.to.r === r && lastMove.to.c === c)) {
            squareEl.classList.add('last-move');
          }
        }

        // Selected square highlight
        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
          squareEl.classList.add('selected');
        }

        // Valid move highlight
        if (validMovesForSelected.length > 0) {
          const isValidTarget = validMovesForSelected.some(m => m.to.r === r && m.to.c === c);
          if (isValidTarget) {
            squareEl.classList.add('valid-move');
            if (engine.getPiece(r, c)) {
              squareEl.classList.add('has-piece');
            }
          }
        }

        // King in check highlight
        if (checkedKingPos && checkedKingPos.r === r && checkedKingPos.c === c) {
          squareEl.classList.add('in-check');
        }

        // Piece rendering & Drag-and-Drop
        const piece = engine.getPiece(r, c);
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.className = `piece piece-${piece.color === 'w' ? 'white' : 'black'}`;
          pieceEl.textContent = engine.getPieceGlyph(piece.type, piece.color);
          pieceEl.setAttribute('role', 'img');
          pieceEl.setAttribute('aria-label', `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`);

          // Enable dragging if piece belongs to current player on their turn
          const isPlayerPiece = (piece.color === 'w' && playerColor === 'white') ||
                                (piece.color === 'b' && playerColor === 'black');
          if (isPlayerPiece && piece.color === activeTurn && !isGameOver && !isAiThinking) {
            pieceEl.draggable = true;
            pieceEl.addEventListener('dragstart', (e) => onDragStart(e, r, c));
          }

          squareEl.appendChild(pieceEl);
        }

        // Square drop targets
        squareEl.addEventListener('dragover', onDragOver);
        squareEl.addEventListener('drop', (e) => onDrop(e, r, c));
        squareEl.addEventListener('click', () => onSquareClick(r, c));

        dom.chessboard.appendChild(squareEl);
      }
    }
  }

  // Drag and Drop handlers
  function onDragStart(e, r, c) {
    if (isGameOver || isAiThinking) return;
    initAudio();
    selectedSquare = { r, c };
    validMovesForSelected = engine.getValidMoves(r, c);
    e.dataTransfer.setData('text/plain', JSON.stringify({ r, c }));
    e.dataTransfer.effectAllowed = 'move';
    renderBoard();
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e, targetR, targetC) {
    e.preventDefault();
    if (isGameOver || isAiThinking) return;

    let source = selectedSquare;
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        source = JSON.parse(dataStr);
      }
    } catch (err) {
      // fallback to selectedSquare
    }

    if (!source) return;
    attemptMove(source.r, source.c, targetR, targetC);
  }

  // Click-to-move handler
  function onSquareClick(r, c) {
    if (isGameOver || isAiThinking) return;
    initAudio();

    const clickedPiece = engine.getPiece(r, c);
    const activeTurn = engine.getTurn();
    const isPlayerTurn = (activeTurn === 'w' && playerColor === 'white') || (activeTurn === 'b' && playerColor === 'black');

    if (!isPlayerTurn) return;

    // If square is already selected, clicking it again unselects
    if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
      selectedSquare = null;
      validMovesForSelected = [];
      renderBoard();
      return;
    }

    // If we have an active selection and click on a valid target square
    if (selectedSquare) {
      const moveFound = validMovesForSelected.find(m => m.to.r === r && m.to.c === c);
      if (moveFound) {
        attemptMove(selectedSquare.r, selectedSquare.c, r, c);
        return;
      }
    }

    // Otherwise, select piece if it belongs to current player
    if (clickedPiece && clickedPiece.color === activeTurn) {
      selectedSquare = { r, c };
      validMovesForSelected = engine.getValidMoves(r, c);
      renderBoard();
    } else {
      selectedSquare = null;
      validMovesForSelected = [];
      renderBoard();
    }
  }

  function attemptMove(fromR, fromC, toR, toC) {
    const validMoves = engine.getValidMoves(fromR, fromC);
    const candidateMoves = validMoves.filter(m => m.to.r === toR && m.to.c === toC);

    if (candidateMoves.length === 0) {
      // Invalid move
      selectedSquare = null;
      validMovesForSelected = [];
      renderBoard();
      return;
    }

    // Check if move requires pawn promotion modal
    const promoMove = candidateMoves.find(m => m.promotion || m.flag === 'promotion' || m.flag === 'promotion-capture');
    if (promoMove) {
      pendingPromotionMove = { fromR, fromC, toR, toC, candidateMoves };
      showPromotionModal();
      return;
    }

    executeMove(candidateMoves[0]);
  }

  function showPromotionModal() {
    if (!dom.promotionModal) return;
    const pieceColor = engine.getTurn() === 'w' ? 'white' : 'black';
    const glyphs = pieceColor === 'white' ? { queen: '♕', rook: '♖', bishop: '♗', knight: '♘' } : { queen: '♛', rook: '♜', bishop: '♝', knight: '♞' };

    document.querySelectorAll('.promo-glyph').forEach(glyphEl => {
      const p = glyphEl.dataset.pieceGlyph;
      if (glyphs[p]) glyphEl.textContent = glyphs[p];
    });

    dom.promotionModal.classList.remove('hidden');
  }

  function hidePromotionModal() {
    if (dom.promotionModal) {
      dom.promotionModal.classList.add('hidden');
    }
    pendingPromotionMove = null;
  }

  function handlePromotionChoice(pieceChoice) {
    if (!pendingPromotionMove) return;
    const { fromR, fromC, toR, toC, candidateMoves } = pendingPromotionMove;

    const chosenMove = candidateMoves.find(m => (m.promotion || '').toLowerCase() === pieceChoice.toLowerCase()) || {
      from: { r: fromR, c: fromC },
      to: { r: toR, c: toC },
      promotion: pieceChoice.toLowerCase(),
      flag: 'promotion'
    };

    hidePromotionModal();
    executeMove(chosenMove);
  }

  function executeMove(move) {
    const isCapture = move.flag === 'capture' || move.flag === 'promotion-capture' || move.flag === 'en-passant' || !!engine.getPiece(move.to.r, move.to.c);

    const success = engine.makeMove(move);
    if (!success) {
      selectedSquare = null;
      validMovesForSelected = [];
      renderBoard();
      return;
    }

    // Play appropriate sound
    if (isCapture) {
      playSound('capture');
    } else {
      playSound('move');
    }

    selectedSquare = null;
    validMovesForSelected = [];

    // Check game termination states
    const activeTurn = engine.getTurn();
    if (engine.isCheckmate(activeTurn)) {
      isGameOver = true;
      stopTimer();
      const winner = activeTurn === 'w' ? 'Black' : 'White';
      updateStatusBanner(`Checkmate! ${winner} wins!`, 'alert-win');
      playSound('gameover');
    } else if (engine.isStalemate(activeTurn)) {
      isGameOver = true;
      stopTimer();
      updateStatusBanner('Stalemate! Game is a draw.');
      playSound('gameover');
    } else if (engine.isDraw()) {
      isGameOver = true;
      stopTimer();
      updateStatusBanner('Draw declared (50-move rule or insufficient material).');
      playSound('gameover');
    }

    updateCapturedPieces();
    updateMoveHistory();
    updateTurnUI();
    renderBoard();

    // Trigger AI move if it's AI's turn
    triggerAiIfNeeded();
  }

  function triggerAiIfNeeded() {
    if (isGameOver) return;

    const activeTurn = engine.getTurn();
    const isPlayerTurn = (activeTurn === 'w' && playerColor === 'white') || (activeTurn === 'b' && playerColor === 'black');

    if (!isPlayerTurn) {
      isAiThinking = true;
      updateTurnUI();

      // Slight natural thinking delay
      const thinkDelay = aiDifficulty === 'easy' ? 400 : (aiDifficulty === 'medium' ? 500 : 650);

      window.setTimeout(() => {
        if (isGameOver) {
          isAiThinking = false;
          return;
        }

        let bestMove = null;
        if (window.ChessAI && typeof window.ChessAI.getBestMove === 'function') {
          bestMove = window.ChessAI.getBestMove(engine, aiDifficulty);
        } else {
          // Fallback random legal move
          const legalMoves = engine.getAllValidMoves(activeTurn);
          if (legalMoves.length > 0) {
            bestMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          }
        }

        isAiThinking = false;

        if (bestMove) {
          executeMove(bestMove);
        } else {
          // No legal moves: verify checkmate / stalemate
          if (engine.isCheck(activeTurn)) {
            isGameOver = true;
            stopTimer();
            updateStatusBanner('Checkmate! AI resigns.', 'alert-win');
          } else {
            isGameOver = true;
            stopTimer();
            updateStatusBanner('Stalemate! Game is a draw.');
          }
          updateTurnUI();
          renderBoard();
        }
      }, thinkDelay);
    }
  }

  function undoMove() {
    if (isAiThinking) return;

    // In a human vs AI game, undo two moves (player and AI) to return to player's turn
    const activeTurn = engine.getTurn();
    const isPlayerTurn = (activeTurn === 'w' && playerColor === 'white') || (activeTurn === 'b' && playerColor === 'black');

    const movesToUndo = isPlayerTurn ? 2 : 1;
    let undoneCount = 0;

    for (let i = 0; i < movesToUndo; i++) {
      if (engine.getHistory().length > 0) {
        engine.undoMove();
        undoneCount++;
      }
    }

    if (undoneCount > 0) {
      isGameOver = false;
      selectedSquare = null;
      validMovesForSelected = [];
      updateCapturedPieces();
      updateMoveHistory();
      updateTurnUI();
      renderBoard();
      startTimer();
      playSound('move');
    }
  }

  function startNewGame() {
    stopTimer();
    resetTimers();
    isGameOver = false;
    isAiThinking = false;
    selectedSquare = null;
    validMovesForSelected = [];
    pendingPromotionMove = null;
    hidePromotionModal();

    if (dom.difficultySelect) {
      aiDifficulty = dom.difficultySelect.value || 'medium';
    }
    if (dom.playerColorSelect) {
      playerColor = dom.playerColorSelect.value || 'white';
    }

    engine.reset();
    updatePlayerCards();
    updateCapturedPieces();
    updateMoveHistory();
    updateTurnUI();
    renderBoard();
    startTimer();

    // If player chose Black, AI moves first as White
    if (playerColor === 'black') {
      triggerAiIfNeeded();
    }
  }

  function restartGame() {
    startNewGame();
  }

  // Health ping to backend on load (using subpath safe relative fetch 'api/health')
  function checkBackendHealth() {
    fetch('api/health')
      .then(res => res.json())
      .then(data => {
        console.log('[ChessMaster1] Backend connected:', data.status);
      })
      .catch(err => {
        console.warn('[ChessMaster1] Backend health check bypassed or offline:', err);
      });
  }

  // Initialization
  function init() {
    cacheDom();

    if (typeof window.ChessEngine !== 'function') {
      console.error('ChessEngine is not loaded.');
      return;
    }

    engine = new window.ChessEngine();

    // Event listeners
    if (dom.btnNewGame) dom.btnNewGame.addEventListener('click', startNewGame);
    if (dom.btnRestart) dom.btnRestart.addEventListener('click', restartGame);
    if (dom.btnUndo) dom.btnUndo.addEventListener('click', undoMove);

    if (dom.difficultySelect) {
      dom.difficultySelect.addEventListener('change', (e) => {
        aiDifficulty = e.target.value;
        updatePlayerCards();
      });
    }

    if (dom.playerColorSelect) {
      dom.playerColorSelect.addEventListener('change', (e) => {
        playerColor = e.target.value;
        startNewGame();
      });
    }

    // Promotion modal buttons
    if (dom.promotionChoices) {
      dom.promotionChoices.addEventListener('click', (e) => {
        const btn = e.target.closest('.promo-choice-btn');
        if (btn && btn.dataset.piece) {
          handlePromotionChoice(btn.dataset.piece);
        }
      });
    }

    // Keyboard shortcuts (Escape closes promo, U undos)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && pendingPromotionMove) {
        hidePromotionModal();
      } else if ((e.key === 'u' || e.key === 'U') && !pendingPromotionMove) {
        undoMove();
      }
    });

    startNewGame();
    checkBackendHealth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
