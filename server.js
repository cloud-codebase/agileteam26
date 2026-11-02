const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory hill definitions with K-points, HS points, steep profile data and hill records
const HILLS = [
  {
    id: 'zakopane',
    name: 'Zakopane (Wielka Krokiew)',
    country: 'POL',
    kPoint: 120,
    hsPoint: 140,
    inrunAngle: 35.0,
    tableAngle: 10.5,
    tableHeight: 3.2,
    knollDrop: 3.5,
    betaK: 35.5,
    betaP: 38.0,
    inrunLength: 98.7,
    record: 147.0,
    recordHolder: 'Yukiya Sato',
    difficulty: 'Normal / Classic Large Hill',
    gateRange: [1, 20],
    defaultGate: 12
  },
  {
    id: 'planica',
    name: 'Planica (Letalnica bratov Gorišek)',
    country: 'SLO',
    kPoint: 185,
    hsPoint: 240,
    inrunAngle: 35.1,
    tableAngle: 11.2,
    tableHeight: 3.8,
    knollDrop: 3.8,
    betaK: 34.0,
    betaP: 36.5,
    inrunLength: 133.8,
    record: 252.0,
    recordHolder: 'Ryoyu Kobayashi',
    difficulty: 'Ski Flying Monster',
    gateRange: [1, 15],
    defaultGate: 8
  },
  {
    id: 'wisla',
    name: 'Wisła (Malinka)',
    country: 'POL',
    kPoint: 120,
    hsPoint: 134,
    inrunAngle: 35.0,
    tableAngle: 10.5,
    tableHeight: 3.0,
    knollDrop: 3.2,
    betaK: 34.8,
    betaP: 37.5,
    inrunLength: 88.2,
    record: 139.0,
    recordHolder: 'Stefan Kraft',
    difficulty: 'Technical Wind Tunnel',
    gateRange: [1, 18],
    defaultGate: 10
  },
  {
    id: 'oberstdorf',
    name: 'Oberstdorf (Schattenbergschanze)',
    country: 'GER',
    kPoint: 120,
    hsPoint: 137,
    inrunAngle: 35.5,
    tableAngle: 11.0,
    tableHeight: 3.4,
    knollDrop: 3.5,
    betaK: 35.0,
    betaP: 37.0,
    inrunLength: 95.5,
    record: 143.5,
    recordHolder: 'Sigurd Pettersen',
    difficulty: 'Four Hills Tournament Opener',
    gateRange: [1, 18],
    defaultGate: 11
  }
];

// Seeded leaderboard entries
let leaderboard = [
  {
    id: 'lead-1',
    playerName: 'Adam M.',
    hillId: 'zakopane',
    hillName: 'Zakopane (Wielka Krokiew)',
    distance: 140.5,
    judgeTotal: 58.5,
    windComp: 1.2,
    totalPoints: 156.6,
    date: '1998-01-17'
  },
  {
    id: 'lead-2',
    playerName: 'Janne A.',
    hillId: 'planica',
    hillName: 'Planica (Letalnica)',
    distance: 238.5,
    judgeTotal: 57.0,
    windComp: -0.8,
    totalPoints: 228.4,
    date: '2005-03-20'
  },
  {
    id: 'lead-3',
    playerName: 'Sven H.',
    hillId: 'oberstdorf',
    hillName: 'Oberstdorf (Schattenbergschanze)',
    distance: 139.0,
    judgeTotal: 59.0,
    windComp: 2.1,
    totalPoints: 155.3,
    date: '2001-12-30'
  },
  {
    id: 'lead-4',
    playerName: 'Kamil S.',
    hillId: 'zakopane',
    hillName: 'Zakopane (Wielka Krokiew)',
    distance: 138.0,
    judgeTotal: 58.0,
    windComp: 0.5,
    totalPoints: 150.9,
    date: '2018-01-27'
  },
  {
    id: 'lead-5',
    playerName: 'Noriaki K.',
    hillId: 'planica',
    hillName: 'Planica (Letalnica)',
    distance: 231.0,
    judgeTotal: 56.5,
    windComp: 1.0,
    totalPoints: 217.7,
    date: '2014-03-23'
  },
  {
    id: 'lead-6',
    playerName: 'Peter P.',
    hillId: 'planica',
    hillName: 'Planica (Letalnica)',
    distance: 228.0,
    judgeTotal: 55.5,
    windComp: -1.2,
    totalPoints: 212.9,
    date: '2016-03-18'
  },
  {
    id: 'lead-7',
    playerName: 'Piotr Ż.',
    hillId: 'wisla',
    hillName: 'Wisła (Malinka)',
    distance: 132.5,
    judgeTotal: 57.0,
    windComp: 0.8,
    totalPoints: 140.3,
    date: '2020-11-22'
  }
];

// Serve static frontend assets from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/hills', (req, res) => {
  res.json(HILLS);
});

app.get('/api/hills/:id', (req, res) => {
  const hill = HILLS.find(h => h.id === req.params.id);
  if (!hill) {
    return res.status(404).json({ error: 'Hill not found' });
  }
  res.json(hill);
});

app.get('/api/leaderboard', (req, res) => {
  const hillFilter = req.query.hillId;
  let results = leaderboard;
  if (hillFilter) {
    results = results.filter(entry => entry.hillId === hillFilter);
  }
  // Sort descending by totalPoints
  const sorted = [...results].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  res.json(sorted.slice(0, 15));
});

app.post('/api/leaderboard', (req, res) => {
  const { playerName, hillId, distance, totalPoints, judgeTotal, windComp } = req.body;
  if (!playerName || !hillId || distance === undefined || totalPoints === undefined) {
    return res.status(400).json({ error: 'Missing required leaderboard fields' });
  }

  const hill = HILLS.find(h => h.id === hillId);
  const newEntry = {
    id: 'lead-' + Date.now(),
    playerName: String(playerName).trim().slice(0, 20) || 'Unknown Skier',
    hillId,
    hillName: hill ? hill.name : hillId,
    distance: Number(Number(distance).toFixed(1)),
    judgeTotal: judgeTotal !== undefined ? Number(Number(judgeTotal).toFixed(1)) : 54.0,
    windComp: windComp !== undefined ? Number(Number(windComp).toFixed(1)) : 0.0,
    totalPoints: Number(Number(totalPoints).toFixed(1)),
    date: new Date().toISOString().split('T')[0]
  };

  leaderboard.push(newEntry);
  // Keep memory bounded to 100 entries
  if (leaderboard.length > 100) {
    leaderboard = leaderboard.slice(-100);
  }

  // Return sorted leaderboard for the hill
  const sorted = leaderboard
    .filter(e => e.hillId === hillId)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 15);

  res.status(201).json({ success: true, entry: newEntry, leaderboard: sorted });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Fallback to index.html for single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SkiJumps] Retro Ski Jump server listening on port ${PORT}`);
});
