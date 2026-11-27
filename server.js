const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Request body JSON parsing
app.use(express.json());

// In-memory match statistics seed
const matchStats = {
  boutsPlayed: 0,
  p1Wins: 0,
  p2Wins: 0,
  recentEvents: []
};

const serverStartTime = Date.now();

// Static asset delivery from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Health check endpoint per DESIGN.md
 * GET /api/health or relative api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'Fencing Duel',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000)
  });
});

/**
 * Match stats retrieval endpoint per DESIGN.md
 * GET /api/match-stats or relative api/match-stats
 */
app.get('/api/match-stats', (req, res) => {
  res.json({
    boutsPlayed: matchStats.boutsPlayed,
    p1Wins: matchStats.p1Wins,
    p2Wins: matchStats.p2Wins
  });
});

/**
 * Match result reporting endpoint per DESIGN.md
 * POST /api/match-stats { winner: 1 | 2 }
 */
app.post('/api/match-stats', (req, res) => {
  const { winner } = req.body || {};

  matchStats.boutsPlayed += 1;
  if (winner === 1 || winner === '1') {
    matchStats.p1Wins += 1;
  } else if (winner === 2 || winner === '2') {
    matchStats.p2Wins += 1;
  }

  matchStats.recentEvents.push({
    timestamp: new Date().toISOString(),
    winner: winner || 'draw'
  });

  if (matchStats.recentEvents.length > 50) {
    matchStats.recentEvents.shift();
  }

  res.status(201).json({
    success: true,
    boutsPlayed: matchStats.boutsPlayed,
    p1Wins: matchStats.p1Wins,
    p2Wins: matchStats.p2Wins
  });
});

// Single-container fallback to index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening on process.env.PORT || 8080
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤺 Cyber Fencing Duel server listening on port ${PORT}`);
  });
}

module.exports = app;
