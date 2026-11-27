const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory leaderboard seed data
let highScores = [
  { name: 'KAVINSKY', score: 125400, maxDrift: 4820, date: '2025-05-10' },
  { name: 'SYNTH_BOY', score: 98200, maxDrift: 3950, date: '2025-05-11' },
  { name: 'DRIFT_QUEEN', score: 84600, maxDrift: 3200, date: '2025-05-12' },
  { name: 'NEON_RIDER', score: 67300, maxDrift: 2890, date: '2025-05-13' },
  { name: 'TURBO_VIPER', score: 51200, maxDrift: 2100, date: '2025-05-14' }
];

// High scores REST API
app.get('/api/scores', (req, res) => {
  res.json(highScores);
});

app.post('/api/scores', (req, res) => {
  const { name, score, maxDrift } = req.body;
  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid score payload. Name and score are required.' });
  }

  const cleanName = String(name).slice(0, 12).trim().toUpperCase() || 'ANONYMOUS';
  const cleanScore = Math.floor(score);
  const cleanMaxDrift = Math.floor(maxDrift || 0);
  const date = new Date().toISOString().split('T')[0];

  highScores.push({ name: cleanName, score: cleanScore, maxDrift: cleanMaxDrift, date });
  highScores.sort((a, b) => b.score - a.score);
  if (highScores.length > 10) {
    highScores = highScores.slice(0, 10);
  }

  res.status(201).json(highScores);
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for subpaths / client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Retro Drift Race server listening on port ${PORT}`);
});
