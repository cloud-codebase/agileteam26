/**
 * Core test suite for ChessEngine and ChessAI
 */

const assert = require('assert');
const ChessEngine = require('../public/chess-engine.js');
const ChessAI = require('../public/ai-player.js');

console.log('--- Running ChessMaster1 Automated Tests ---');

// 1. Initial State
const engine = new ChessEngine();
assert.strictEqual(engine.getTurn(), 'w', 'Turn should start with White');
assert.strictEqual(engine.getPiece(7, 4).type, 'k', 'White King should be at e1 (row 7, col 4)');
assert.strictEqual(engine.getPiece(0, 4).type, 'k', 'Black King should be at e8 (row 0, col 4)');
console.log('✓ Initial board setup verified');

// 2. Legal Moves Generation
const whiteMoves = engine.getAllValidMoves('w');
assert.strictEqual(whiteMoves.length, 20, 'White should have 20 initial legal moves (16 pawn, 4 knight)');
console.log('✓ Initial legal moves count verified (20 moves)');

// 3. Move Execution & SAN
const e4Move = whiteMoves.find(m => m.from.r === 6 && m.from.c === 4 && m.to.r === 4 && m.to.c === 4);
assert.ok(e4Move, 'e4 move must be present');
engine.makeMove(e4Move);
assert.strictEqual(engine.getTurn(), 'b', 'Turn should now be Black');
assert.strictEqual(engine.getHistory().length, 1, 'History length should be 1');
assert.strictEqual(engine.getLastMove().san, 'e4', 'Move SAN should be e4');
console.log('✓ 1. e4 executed and annotated correctly');

// 4. AI Move Generation
const aiMove = ChessAI.getBestMove(engine, 'easy');
assert.ok(aiMove && aiMove.from && aiMove.to, 'AI should return a valid move');
engine.makeMove(aiMove);
assert.strictEqual(engine.getTurn(), 'w', 'Turn should revert to White after AI move');
console.log('✓ AI move generation and response verified');

// 5. Undo Move
engine.undoMove();
assert.strictEqual(engine.getTurn(), 'b', 'Turn after undo should be Black');
engine.undoMove();
assert.strictEqual(engine.getTurn(), 'w', 'Turn after 2nd undo should be White');
assert.strictEqual(engine.getPiece(6, 4).type, 'p', 'Pawn returned to e2');
console.log('✓ Undo functionality restored board perfectly');

// 6. Checkmate Detection (Fool's Mate)
// 1. f3 e5 2. g4 Qh4#
engine.reset();
const movesSeq = [
  { from: { r: 6, c: 5 }, to: { r: 5, c: 5 } }, // 1. f3
  { from: { r: 1, c: 4 }, to: { r: 3, c: 4 } }, // 1... e5
  { from: { r: 6, c: 6 }, to: { r: 4, c: 6 } }, // 2. g4
  { from: { r: 0, c: 3 }, to: { r: 4, c: 7 } }  // 2... Qh4#
];

for (const m of movesSeq) {
  const success = engine.makeMove(m);
  assert.ok(success, `Move from (${m.from.r},${m.from.c}) to (${m.to.r},${m.to.c}) should succeed`);
}

assert.strictEqual(engine.isCheck('w'), true, 'White must be in check');
assert.strictEqual(engine.isCheckmate('w'), true, 'White must be in checkmate');
assert.strictEqual(engine.getLastMove().san, 'Qh4#', 'SAN should denote checkmate (#)');
console.log("✓ Fool's Mate correctly identified checkmate & SAN notation");

console.log('All tests passed successfully!');
