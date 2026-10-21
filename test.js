/**
 * Automated test suite for Tic-Tac-Toe Win and Draw Detection Logic (SCRUM-48)
 * and Game Reset & Score Tracking Functionality (SCRUM-49)
 */
const assert = require('assert');
const game = require('./app.js');

console.log('Running Tic-Tac-Toe test suite...\n');

// --- Section 1: Win / Draw Detection Tests (SCRUM-48) ---
console.log('1. Testing Win and Draw Detection...');

// Test 1: Check winning combinations count
assert.strictEqual(game.WINNING_COMBINATIONS.length, 8, 'There should be exactly 8 winning combinations');

// Test 2: Row 1 win [0, 1, 2]
const row1Win = ['X', 'X', 'X', '', '', '', '', '', ''];
const win1 = game.checkWin(row1Win);
assert.ok(win1 !== null, 'Row 1 win should be detected');
assert.strictEqual(win1.winner, 'X');
assert.deepStrictEqual(win1.combination, [0, 1, 2]);

// Test 3: Row 2 win [3, 4, 5]
const row2Win = ['', '', '', 'O', 'O', 'O', '', '', ''];
const win2 = game.checkWin(row2Win);
assert.ok(win2 !== null, 'Row 2 win should be detected');
assert.strictEqual(win2.winner, 'O');
assert.deepStrictEqual(win2.combination, [3, 4, 5]);

// Test 4: Row 3 win [6, 7, 8]
const row3Win = ['', '', '', '', '', '', 'X', 'X', 'X'];
const win3 = game.checkWin(row3Win);
assert.ok(win3 !== null, 'Row 3 win should be detected');
assert.strictEqual(win3.winner, 'X');
assert.deepStrictEqual(win3.combination, [6, 7, 8]);

// Test 5: Column 1 win [0, 3, 6]
const col1Win = ['O', '', '', 'O', '', '', 'O', '', ''];
const win4 = game.checkWin(col1Win);
assert.ok(win4 !== null, 'Column 1 win should be detected');
assert.strictEqual(win4.winner, 'O');
assert.deepStrictEqual(win4.combination, [0, 3, 6]);

// Test 6: Column 2 win [1, 4, 7]
const col2Win = ['', 'X', '', '', 'X', '', '', 'X', ''];
const win5 = game.checkWin(col2Win);
assert.ok(win5 !== null, 'Column 2 win should be detected');
assert.strictEqual(win5.winner, 'X');
assert.deepStrictEqual(win5.combination, [1, 4, 7]);

// Test 7: Column 3 win [2, 5, 8]
const col3Win = ['', '', 'O', '', '', 'O', '', '', 'O'];
const win6 = game.checkWin(col3Win);
assert.ok(win6 !== null, 'Column 3 win should be detected');
assert.strictEqual(win6.winner, 'O');
assert.deepStrictEqual(win6.combination, [2, 5, 8]);

// Test 8: Diagonal 1 win [0, 4, 8]
const diag1Win = ['X', '', '', '', 'X', '', '', '', 'X'];
const win7 = game.checkWin(diag1Win);
assert.ok(win7 !== null, 'Diagonal 1 win should be detected');
assert.strictEqual(win7.winner, 'X');
assert.deepStrictEqual(win7.combination, [0, 4, 8]);

// Test 9: Diagonal 2 win [2, 4, 6]
const diag2Win = ['', '', 'O', '', 'O', '', 'O', '', ''];
const win8 = game.checkWin(diag2Win);
assert.ok(win8 !== null, 'Diagonal 2 win should be detected');
assert.strictEqual(win8.winner, 'O');
assert.deepStrictEqual(win8.combination, [2, 4, 6]);

// Test 10: Incomplete game with no winner
const inProgress = ['X', 'O', 'X', 'X', 'O', '', '', '', ''];
assert.strictEqual(game.checkWin(inProgress), null, 'In-progress game should have no winner');
assert.strictEqual(game.checkDraw(inProgress), false, 'In-progress game should not be a draw');

// Test 11: Draw condition (all 9 filled, no winner)
const drawBoard = [
  'X', 'O', 'X',
  'X', 'O', 'O',
  'O', 'X', 'X'
];
assert.strictEqual(game.checkWin(drawBoard), null, 'Draw board has no winner');
assert.strictEqual(game.checkDraw(drawBoard), true, 'Draw board should be detected as draw');

// Test 12: Board filled but with a win (should NOT be a draw)
const filledWinBoard = [
  'X', 'X', 'X',
  'O', 'O', 'X',
  'O', 'X', 'O'
];
assert.ok(game.checkWin(filledWinBoard) !== null, 'Filled board with row 1 matching is a win');
assert.strictEqual(game.checkDraw(filledWinBoard), false, 'Winning filled board must not be classified as draw');

console.log('All 12 Win/Draw tests passed successfully!\n');

// --- Section 2: Reset & Score Tracking Tests (SCRUM-49) ---
console.log('2. Testing Game Reset and Score Tracking (SCRUM-49)...');

// Test 13: Initial score state is 0 for X, O, and draws
game.resetScore();
let initialScores = game.getScores();
assert.strictEqual(initialScores.X, 0, 'Initial score for Player X should be 0');
assert.strictEqual(initialScores.O, 0, 'Initial score for Player O should be 0');
assert.strictEqual(initialScores.draws, 0, 'Initial score for Draws should be 0');

// Test 14: Play a winning game for Player X and verify score increments
// Moves: X at 0, O at 3, X at 1, O at 4, X at 2 (Row 1 win for X)
game.handleCellClick(0); // X
game.handleCellClick(3); // O
game.handleCellClick(1); // X
game.handleCellClick(4); // O
game.handleCellClick(2); // X - wins

let afterWinScores = game.getScores();
assert.strictEqual(afterWinScores.X, 1, 'Player X score should increment to 1 after winning');
assert.strictEqual(afterWinScores.O, 0, 'Player O score should remain 0');
assert.strictEqual(afterWinScores.draws, 0, 'Draws score should remain 0');
assert.strictEqual(game.isGameActive(), false, 'Game should become inactive after a win');

// Test 15: Restart game resets board and gameActive but preserves current scores
game.restartGame();
assert.strictEqual(game.isGameActive(), true, 'Game should be active after restart');
assert.strictEqual(game.getCurrentPlayer(), 'X', 'Current player should reset to X after restart');
assert.deepStrictEqual(game.getBoard(), Array(9).fill(''), 'Board should be cleared after restart');

let scoresAfterRestart = game.getScores();
assert.strictEqual(scoresAfterRestart.X, 1, 'Scores must be preserved after round restart (X = 1)');
assert.strictEqual(scoresAfterRestart.O, 0, 'Scores must be preserved after round restart (O = 0)');
assert.strictEqual(scoresAfterRestart.draws, 0, 'Scores must be preserved after round restart (draws = 0)');

// Test 16: Play a winning game for Player O and verify score increments
// Moves: X at 0, O at 3, X at 1, O at 4, X at 8, O at 5 (Row 2 win for O)
game.handleCellClick(0); // X
game.handleCellClick(3); // O
game.handleCellClick(1); // X
game.handleCellClick(4); // O
game.handleCellClick(8); // X
game.handleCellClick(5); // O - wins

let scoresAfterOWin = game.getScores();
assert.strictEqual(scoresAfterOWin.X, 1, 'Player X score remains 1');
assert.strictEqual(scoresAfterOWin.O, 1, 'Player O score should increment to 1');
assert.strictEqual(game.isGameActive(), false, 'Game should be inactive after O win');

// Test 17: Restart and play to a draw game
game.restartGame();
// Draw moves:
// X at 0, O at 1, X at 2
// O at 4, X at 3, O at 5
// X at 7, O at 6, X at 8
// Result board:
// X O X
// X O O
// O X X
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

// Test 18: Reset Score resets all counters to 0 and clears board
game.resetScore();
let scoresAfterReset = game.getScores();
assert.strictEqual(scoresAfterReset.X, 0, 'Player X score must reset to 0');
assert.strictEqual(scoresAfterReset.O, 0, 'Player O score must reset to 0');
assert.strictEqual(scoresAfterReset.draws, 0, 'Draw score must reset to 0');
assert.strictEqual(game.isGameActive(), true, 'Game should be active after score reset');
assert.strictEqual(game.getCurrentPlayer(), 'X', 'Current player should be X after score reset');
assert.deepStrictEqual(game.getBoard(), Array(9).fill(''), 'Board should be cleared after score reset');

console.log('All 18 tests passed successfully! Everything works as expected.');
