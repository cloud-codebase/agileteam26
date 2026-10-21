/**
 * Automated test suite for Tic-Tac-Toe Win and Draw Detection Logic (SCRUM-48)
 */
const assert = require('assert');
const game = require('./app.js');

console.log('Running Tic-Tac-Toe Win/Draw logic tests...\n');

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

console.log('All 12 test cases passed successfully!');
