/**
 * Comprehensive Automated Test Suite for Tic-Tac-Toe Game (SCRUM-45 Epic E2E)
 * Covers:
 * - SCRUM-46: Responsive Board UI data models and grid structure
 * - SCRUM-47: Turn management, turn alternation, and move validation
 * - SCRUM-48: Win detection across 8 combinations, draw evaluation, board locking, winning highlights
 * - SCRUM-49: Session score tracking (X wins, O wins, Draws), restart round, and reset scores
 */

const assert = require('assert');
const game = require('./app.js');

console.log('Running Tic-Tac-Toe Full Epic Verification Test Suite...\n');

// ========================================================
// Section 1: Board Structure & Winning Combinations Matrix
// ========================================================
console.log('--- Section 1: Board Structure & Winning Combinations Matrix ---');
assert.strictEqual(game.WINNING_COMBINATIONS.length, 8, 'Must have exactly 8 winning combinations');

const expectedCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];
assert.deepStrictEqual(game.WINNING_COMBINATIONS, expectedCombos, 'Combinations must match standard Tic-Tac-Toe rules');
console.log('✓ Winning combinations matrix verified.');

// ========================================================
// Section 2: Win Detection Across All 8 Combinations (SCRUM-48)
// ========================================================
console.log('\n--- Section 2: Win Detection Across All 8 Combinations ---');

// Test Row 1 win [0, 1, 2]
const row1Win = ['X', 'X', 'X', '', '', '', '', '', ''];
const win1 = game.checkWin(row1Win);
assert.ok(win1 !== null, 'Row 1 win should be detected');
assert.strictEqual(win1.winner, 'X');
assert.deepStrictEqual(win1.combination, [0, 1, 2]);

// Test Row 2 win [3, 4, 5]
const row2Win = ['', '', '', 'O', 'O', 'O', '', '', ''];
const win2 = game.checkWin(row2Win);
assert.ok(win2 !== null, 'Row 2 win should be detected');
assert.strictEqual(win2.winner, 'O');
assert.deepStrictEqual(win2.combination, [3, 4, 5]);

// Test Row 3 win [6, 7, 8]
const row3Win = ['', '', '', '', '', '', 'X', 'X', 'X'];
const win3 = game.checkWin(row3Win);
assert.ok(win3 !== null, 'Row 3 win should be detected');
assert.strictEqual(win3.winner, 'X');
assert.deepStrictEqual(win3.combination, [6, 7, 8]);

// Test Column 1 win [0, 3, 6]
const col1Win = ['O', '', '', 'O', '', '', 'O', '', ''];
const win4 = game.checkWin(col1Win);
assert.ok(win4 !== null, 'Column 1 win should be detected');
assert.strictEqual(win4.winner, 'O');
assert.deepStrictEqual(win4.combination, [0, 3, 6]);

// Test Column 2 win [1, 4, 7]
const col2Win = ['', 'X', '', '', 'X', '', '', 'X', ''];
const win5 = game.checkWin(col2Win);
assert.ok(win5 !== null, 'Column 2 win should be detected');
assert.strictEqual(win5.winner, 'X');
assert.deepStrictEqual(win5.combination, [1, 4, 7]);

// Test Column 3 win [2, 5, 8]
const col3Win = ['', '', 'O', '', '', 'O', '', '', 'O'];
const win6 = game.checkWin(col3Win);
assert.ok(win6 !== null, 'Column 3 win should be detected');
assert.strictEqual(win6.winner, 'O');
assert.deepStrictEqual(win6.combination, [2, 5, 8]);

// Test Diagonal 1 win [0, 4, 8]
const diag1Win = ['X', '', '', '', 'X', '', '', '', 'X'];
const win7 = game.checkWin(diag1Win);
assert.ok(win7 !== null, 'Diagonal 1 win should be detected');
assert.strictEqual(win7.winner, 'X');
assert.deepStrictEqual(win7.combination, [0, 4, 8]);

// Test Diagonal 2 win [2, 4, 6]
const diag2Win = ['', '', 'O', '', 'O', '', 'O', '', ''];
const win8 = game.checkWin(diag2Win);
assert.ok(win8 !== null, 'Diagonal 2 win should be detected');
assert.strictEqual(win8.winner, 'O');
assert.deepStrictEqual(win8.combination, [2, 4, 6]);

console.log('✓ All 8 individual winning lines validated successfully.');

// ========================================================
// Section 3: Draw Condition Evaluation & Edge Cases
// ========================================================
console.log('\n--- Section 3: Draw Condition Evaluation & Edge Cases ---');

// Incomplete game with no winner
const inProgress = ['X', 'O', 'X', 'X', 'O', '', '', '', ''];
assert.strictEqual(game.checkWin(inProgress), null, 'In-progress game should have no winner');
assert.strictEqual(game.checkDraw(inProgress), false, 'In-progress game should not be a draw');

// Draw board (all 9 filled, no winner)
const drawBoard = [
  'X', 'O', 'X',
  'X', 'O', 'O',
  'O', 'X', 'X'
];
assert.strictEqual(game.checkWin(drawBoard), null, 'Draw board has no winner');
assert.strictEqual(game.checkDraw(drawBoard), true, 'Draw board should be detected as draw');

// Full board with a win (must NOT be evaluated as draw)
const filledWinBoard = [
  'X', 'X', 'X',
  'O', 'O', 'X',
  'O', 'X', 'O'
];
assert.ok(game.checkWin(filledWinBoard) !== null, 'Filled board with row 1 matching is a win');
assert.strictEqual(game.checkDraw(filledWinBoard), false, 'Winning filled board must not be classified as draw');
console.log('✓ Draw conditions and edge cases verified.');

// ========================================================
// Section 4: Move Handling, Turn Alternation & Validation (SCRUM-47)
// ========================================================
console.log('\n--- Section 4: Move Handling & Move Validation (SCRUM-47) ---');
game.restartGame();
game.resetScore();

assert.strictEqual(game.getCurrentPlayer(), 'X', 'Initial player must be X');
assert.strictEqual(game.isGameActive(), true, 'Game must start active');

// Player X moves to cell 0
game.handleCellClick(0);
assert.strictEqual(game.getBoard()[0], 'X', 'Cell 0 should be occupied by X');
assert.strictEqual(game.getCurrentPlayer(), 'O', 'Turn should switch to O');

// Move validation: Player O attempts to click already occupied cell 0
game.handleCellClick(0);
assert.strictEqual(game.getBoard()[0], 'X', 'Cell 0 must not be overwritten');
assert.strictEqual(game.getCurrentPlayer(), 'O', 'Turn must remain O after invalid move attempt');

// Player O moves to cell 3
game.handleCellClick(3);
assert.strictEqual(game.getBoard()[3], 'O', 'Cell 3 should be occupied by O');
assert.strictEqual(game.getCurrentPlayer(), 'X', 'Turn should switch back to X');
console.log('✓ Move execution, turn switching, and move validation verified.');

// ========================================================
// Section 5: Game Completion, Board Locking & Scores (SCRUM-48 & 49)
// ========================================================
console.log('\n--- Section 5: Game Completion, Board Locking & Score Tracking ---');

// Continue game to Player X win: X at 1, O at 4, X at 2 (Row 1 win)
game.handleCellClick(1); // X
game.handleCellClick(4); // O
game.handleCellClick(2); // X - wins row [0, 1, 2]

assert.strictEqual(game.isGameActive(), false, 'Game should become inactive after a win');
let scoresAfterXWin = game.getScores();
assert.strictEqual(scoresAfterXWin.X, 1, 'Player X score should increment to 1');
assert.strictEqual(scoresAfterXWin.O, 0, 'Player O score should remain 0');
assert.strictEqual(scoresAfterXWin.draws, 0, 'Draw score should remain 0');

// Board locking: attempt move when game is inactive
game.handleCellClick(5);
assert.strictEqual(game.getBoard()[5], '', 'Cell 5 must remain empty because board is locked');
console.log('✓ Player X win, score increment, and board locking verified.');

// ========================================================
// Section 6: Round Restart and Score Persistence (SCRUM-49)
// ========================================================
console.log('\n--- Section 6: Round Restart and Score Persistence (SCRUM-49) ---');
game.restartGame();
assert.strictEqual(game.isGameActive(), true, 'Game should be active after restart');
assert.strictEqual(game.getCurrentPlayer(), 'X', 'Current player should reset to X after restart');
assert.deepStrictEqual(game.getBoard(), Array(9).fill(''), 'Board should be cleared after restart');

let scoresAfterRestart = game.getScores();
assert.strictEqual(scoresAfterRestart.X, 1, 'Player X score must be preserved after round restart');
assert.strictEqual(scoresAfterRestart.O, 0, 'Player O score must be preserved');
assert.strictEqual(scoresAfterRestart.draws, 0, 'Draws score must be preserved');

// Play round 2: Player O wins
// Moves: X at 0, O at 3, X at 1, O at 4, X at 8, O at 5 (Row 2 win for O: [3, 4, 5])
game.handleCellClick(0); // X
game.handleCellClick(3); // O
game.handleCellClick(1); // X
game.handleCellClick(4); // O
game.handleCellClick(8); // X
game.handleCellClick(5); // O - wins row [3, 4, 5]

let scoresAfterOWin = game.getScores();
assert.strictEqual(scoresAfterOWin.X, 1, 'Player X score remains 1');
assert.strictEqual(scoresAfterOWin.O, 1, 'Player O score should increment to 1');
assert.strictEqual(game.isGameActive(), false, 'Game should be inactive after Player O win');

// Play round 3: Draw game
game.restartGame();
// Moves for a draw:
// X: 0, 2, 3, 7, 8
// O: 1, 4, 5, 6
game.handleCellClick(0); // X
game.handleCellClick(1); // O
game.handleCellClick(2); // X
game.handleCellClick(4); // O
game.handleCellClick(3); // X
game.handleCellClick(5); // O
game.handleCellClick(7); // X
game.handleCellClick(6); // O
game.handleCellClick(8); // X - draw

let scoresAfterDraw = game.getScores();
assert.strictEqual(scoresAfterDraw.X, 1, 'Player X score remains 1');
assert.strictEqual(scoresAfterDraw.O, 1, 'Player O score remains 1');
assert.strictEqual(scoresAfterDraw.draws, 1, 'Draws score should increment to 1');
assert.strictEqual(game.isGameActive(), false, 'Game should be inactive after draw');
console.log('✓ Multiple rounds, score accumulation, and draws verified.');

// ========================================================
// Section 7: Score Reset (SCRUM-49)
// ========================================================
console.log('\n--- Section 7: Score Reset Functionality ---');
game.resetScore();
let scoresAfterReset = game.getScores();
assert.strictEqual(scoresAfterReset.X, 0, 'Player X score must reset to 0');
assert.strictEqual(scoresAfterReset.O, 0, 'Player O score must reset to 0');
assert.strictEqual(scoresAfterReset.draws, 0, 'Draw score must reset to 0');
assert.strictEqual(game.isGameActive(), true, 'Game should be active after score reset');
assert.strictEqual(game.getCurrentPlayer(), 'X', 'Current player should be X after score reset');
assert.deepStrictEqual(game.getBoard(), Array(9).fill(''), 'Board should be cleared after score reset');
console.log('✓ Reset Score completely resets scores and state.');

console.log('\n======================================================');
console.log('All end-to-end Epic tests passed successfully! 🎉');
console.log('======================================================\n');
