const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory seeded Hills with Sprint 2.0 gate specifications
const hillsData = [
  {
    id: 'zakopane',
    name: 'Zakopane - Wielka Krokiew',
    country: 'POL',
    kPoint: 120,
    hsPoint: 134,
    record: { distance: 140.5, holder: 'Adam Małysz (POL)' },
    gates: { default: 12, min: 1, max: 20, pointsPerGate: 4.8 }
  },
  {
    id: 'wisla',
    name: 'Wisła - Malinka',
    country: 'POL',
    kPoint: 105,
    hsPoint: 120,
    record: { distance: 139.0, holder: 'Stefan Kraft (AUT)' },
    gates: { default: 10, min: 1, max: 20, pointsPerGate: 4.2 }
  },
  {
    id: 'planica',
    name: 'Planica - Letalnica bratov Gorišek',
    country: 'SLO',
    kPoint: 185,
    hsPoint: 215,
    record: { distance: 252.0, holder: 'Ryoyu Kobayashi (JPN)' },
    gates: { default: 8, min: 1, max: 20, pointsPerGate: 6.4 }
  },
  {
    id: 'oberstdorf',
    name: 'Oberstdorf - Schattenbergschanze',
    country: 'GER',
    kPoint: 115,
    hsPoint: 130,
    record: { distance: 143.5, holder: 'Sigurd Pettersen (NOR)' },
    gates: { default: 12, min: 1, max: 20, pointsPerGate: 4.5 }
  }
];

// In-memory seeded AI Competitors
const aiCompetitorsData = [
  { name: 'Adam Małysz', country: 'POL', skill: 98, consistency: 95 },
  { name: 'Martin Schmitt', country: 'GER', skill: 95, consistency: 90 },
  { name: 'Janne Ahonen', country: 'FIN', skill: 96, consistency: 94 },
  { name: 'Sven Hannawald', country: 'GER', skill: 94, consistency: 88 },
  { name: 'Simon Ammann', country: 'SUI', skill: 93, consistency: 89 },
  { name: 'Noriaki Kasai', country: 'JPN', skill: 91, consistency: 92 },
  { name: 'Matti Hautamäki', country: 'FIN', skill: 92, consistency: 87 },
  { name: 'Andreas Goldberger', country: 'AUT', skill: 90, consistency: 86 }
];

// In-memory seeded Leaderboard
let leaderboardData = [
  {
    id: 'lead-1',
    playerName: 'Adam Małysz',
    country: 'POL',
    hillId: 'zakopane',
    distance: 139.5,
    styleScore: 58.5,
    gate: 12,
    gateCompensation: 0.0,
    totalPoints: 153.6,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5
  },
  {
    id: 'lead-2',
    playerName: 'Martin Schmitt',
    country: 'GER',
    hillId: 'zakopane',
    distance: 135.0,
    styleScore: 57.0,
    gate: 12,
    gateCompensation: 0.0,
    totalPoints: 144.0,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 4
  },
  {
    id: 'lead-3',
    playerName: 'Janne Ahonen',
    country: 'FIN',
    hillId: 'zakopane',
    distance: 133.5,
    styleScore: 58.0,
    gate: 12,
    gateCompensation: 0.0,
    totalPoints: 142.3,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3
  },
  {
    id: 'lead-4',
    playerName: 'Adam Małysz',
    country: 'POL',
    hillId: 'wisla',
    distance: 136.0,
    styleScore: 58.0,
    gate: 10,
    gateCompensation: 0.0,
    totalPoints: 146.8,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 6
  },
  {
    id: 'lead-5',
    playerName: 'Sven Hannawald',
    country: 'GER',
    hillId: 'wisla',
    distance: 132.5,
    styleScore: 56.5,
    gate: 10,
    gateCompensation: 0.0,
    totalPoints: 139.0,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2
  },
  {
    id: 'lead-6',
    playerName: 'Matti Hautamäki',
    country: 'FIN',
    hillId: 'planica',
    distance: 231.0,
    styleScore: 57.5,
    gate: 8,
    gateCompensation: 0.0,
    totalPoints: 214.7,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7
  },
  {
    id: 'lead-7',
    playerName: 'Adam Małysz',
    country: 'POL',
    hillId: 'planica',
    distance: 225.0,
    styleScore: 58.0,
    gate: 8,
    gateCompensation: 0.0,
    totalPoints: 208.0,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'SkiJump2', uptime: process.uptime() });
});

// GET api/hills
app.get('/api/hills', (req, res) => {
  res.json(hillsData);
});

// GET api/ai-competitors
app.get('/api/ai-competitors', (req, res) => {
  res.json(aiCompetitorsData);
});

// POST api/calculate-score (Sprint 2.0 FIS Points Calculation with Gate Compensation)
app.post('/api/calculate-score', (req, res) => {
  try {
    const {
      distance,
      kPoint = 120,
      styleScores = [],
      currentGate,
      baseGate,
      gateDelta,
      pointsPerGate = 4.8,
      windSpeed = 0,
      windFactor = 1.5
    } = req.body;

    const distNum = Number(distance) || 0;
    const kNum = Number(kPoint) || 120;
    const isFlying = kNum >= 170;
    const baseDistancePts = isFlying ? 120 : 60;
    const meterVal = isFlying ? 1.2 : (kNum >= 100 ? 1.8 : 2.0);

    const distancePoints = Number((baseDistancePts + (distNum - kNum) * meterVal).toFixed(1));

    // Calculate FIS style points (discard highest and lowest of 5 scores, or use direct sum)
    let stylePoints = 0;
    if (Array.isArray(styleScores) && styleScores.length === 5) {
      const sorted = [...styleScores].sort((a, b) => a - b);
      stylePoints = sorted[1] + sorted[2] + sorted[3];
    } else if (typeof req.body.stylePoints === 'number') {
      stylePoints = req.body.stylePoints;
    } else {
      stylePoints = 54.0;
    }
    stylePoints = Number(stylePoints.toFixed(1));

    // FIS Gate Compensation:
    // When gate is lowered (currentGate < baseGate), jumper receives positive compensation points (+).
    // When gate is raised (currentGate > baseGate), jumper receives negative compensation points (-).
    let effectiveGateDelta = 0;
    if (typeof gateDelta === 'number') {
      effectiveGateDelta = gateDelta;
    } else if (typeof currentGate === 'number' && typeof baseGate === 'number') {
      effectiveGateDelta = baseGate - currentGate; // positive if lowered
    }
    const gateCompensation = Number((effectiveGateDelta * Number(pointsPerGate || 4.8)).toFixed(1));

    // Wind Compensation
    const windCompensation = Number((-Number(windSpeed || 0) * Number(windFactor || 1.5)).toFixed(1));

    const totalPoints = Number(Math.max(0, distancePoints + stylePoints + gateCompensation + windCompensation).toFixed(1));

    res.json({
      distance: distNum,
      kPoint: kNum,
      distancePoints,
      stylePoints,
      gateDelta: effectiveGateDelta,
      gateCompensation,
      windCompensation,
      totalPoints
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to calculate FIS score', details: err.message });
  }
});

// GET api/leaderboard?hillId=:id
app.get('/api/leaderboard', (req, res) => {
  const { hillId } = req.query;
  let results = [...leaderboardData];
  if (hillId) {
    results = results.filter(item => item.hillId === hillId);
  }
  // Sort descending by totalPoints
  results.sort((a, b) => b.totalPoints - a.totalPoints);
  res.json(results.slice(0, 20));
});

// POST api/leaderboard
app.post('/api/leaderboard', (req, res) => {
  try {
    const { playerName, country, hillId, distance, styleScore, gate, gateCompensation, totalPoints } = req.body;
    if (!playerName || !hillId || distance === undefined || totalPoints === undefined) {
      return res.status(400).json({ error: 'Missing required fields: playerName, hillId, distance, totalPoints' });
    }

    const newEntry = {
      id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      playerName: String(playerName).trim().slice(0, 30),
      country: (country || 'POL').slice(0, 3).toUpperCase(),
      hillId: String(hillId).trim(),
      distance: Number(Number(distance).toFixed(1)),
      styleScore: Number(Number(styleScore || 0).toFixed(1)),
      gate: gate !== undefined ? Number(gate) : 12,
      gateCompensation: gateCompensation !== undefined ? Number(Number(gateCompensation).toFixed(1)) : 0.0,
      totalPoints: Number(Number(totalPoints).toFixed(1)),
      timestamp: Date.now()
    };

    leaderboardData.push(newEntry);

    // Keep sorted top 100 entries
    leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
    if (leaderboardData.length > 100) {
      leaderboardData = leaderboardData.slice(0, 100);
    }

    res.status(201).json({ success: true, entry: newEntry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record score', details: err.message });
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for single-page client routing if needed
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
    if (err) next();
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SkiJump2 Server running on http://0.0.0.0:${PORT}`);
});
