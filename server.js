const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory seed data matching DESIGN.md contracts
const hills = [
  {
    id: "zakopane",
    name: "Zakopane - Wielka Krokiew",
    country: "POL",
    kPoint: 120,
    hs: 134,
    inrunAngle: 35,
    record: 140.5,
    recordHolder: "Adam Małysz",
    gateCount: 20
  },
  {
    id: "oberstdorf",
    name: "Oberstdorf - Schattenbergschanze",
    country: "GER",
    kPoint: 120,
    hs: 137,
    inrunAngle: 35.5,
    record: 143.5,
    recordHolder: "Sigurd Pettersen",
    gateCount: 22
  },
  {
    id: "kulm",
    name: "Bad Mitterndorf - Kulm (Flying)",
    country: "AUT",
    kPoint: 200,
    hs: 235,
    inrunAngle: 36,
    record: 244.0,
    recordHolder: "Peter Prevc",
    gateCount: 25
  },
  {
    id: "planica",
    name: "Planica - Letalnica bratov Gorišek",
    country: "SLO",
    kPoint: 200,
    hs: 240,
    inrunAngle: 35.1,
    record: 252.0,
    recordHolder: "Ryoyu Kobayashi",
    gateCount: 26
  },
  {
    id: "sapporo",
    name: "Sapporo - Okurayama",
    country: "JPN",
    kPoint: 123,
    hs: 137,
    inrunAngle: 35,
    record: 148.5,
    recordHolder: "Kamil Stoch",
    gateCount: 20
  }
];

const jumpers = [
  {
    id: "malysz",
    name: "Adam Małysz",
    country: "POL",
    skill: 98,
    mustache: true,
    color: "#d92027",
    suitColor: "#ffffff"
  },
  {
    id: "hannawald",
    name: "Sven Hannawald",
    country: "GER",
    skill: 96,
    mustache: false,
    color: "#1e2a38",
    suitColor: "#f39c12"
  },
  {
    id: "ahonen",
    name: "Janne Ahonen",
    country: "FIN",
    skill: 97,
    mustache: false,
    color: "#2980b9",
    suitColor: "#2c3e50"
  },
  {
    id: "amman",
    name: "Simon Ammann",
    country: "SUI",
    skill: 95,
    mustache: false,
    color: "#c0392b",
    suitColor: "#ecf0f1"
  },
  {
    id: "schmitt",
    name: "Martin Schmitt",
    country: "GER",
    skill: 94,
    mustache: false,
    color: "#d35400",
    suitColor: "#8e44ad"
  },
  {
    id: "kasai",
    name: "Noriaki Kasai",
    country: "JPN",
    skill: 93,
    mustache: false,
    color: "#e74c3c",
    suitColor: "#bdc3c7"
  }
];

let leaderboard = [
  {
    id: "lb-1",
    jumperName: "Adam Małysz",
    hillId: "zakopane",
    distance: 138.5,
    stylePoints: 58.5,
    totalPoints: 151.8,
    timestamp: Date.now() - 3600000
  },
  {
    id: "lb-2",
    jumperName: "Sven Hannawald",
    hillId: "zakopane",
    distance: 134.0,
    stylePoints: 57.0,
    totalPoints: 142.2,
    timestamp: Date.now() - 3200000
  },
  {
    id: "lb-3",
    jumperName: "Janne Ahonen",
    hillId: "zakopane",
    distance: 132.5,
    stylePoints: 56.5,
    totalPoints: 139.0,
    timestamp: Date.now() - 2500000
  },
  {
    id: "lb-4",
    jumperName: "Adam Małysz",
    hillId: "kulm",
    distance: 228.0,
    stylePoints: 58.0,
    totalPoints: 211.6,
    timestamp: Date.now() - 1800000
  },
  {
    id: "lb-5",
    jumperName: "Simon Ammann",
    hillId: "kulm",
    distance: 219.5,
    stylePoints: 55.5,
    totalPoints: 198.9,
    timestamp: Date.now() - 900000
  }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Hill configurations
app.get('/api/hills', (req, res) => {
  res.json(hills);
});

// Jumpers roster
app.get('/api/jumpers', (req, res) => {
  res.json(jumpers);
});

// Leaderboard get
app.get('/api/leaderboard', (req, res) => {
  const { hillId } = req.query;
  let results = [...leaderboard];
  if (hillId) {
    results = results.filter(entry => entry.hillId === hillId);
  }
  // Sort descending by totalPoints
  results.sort((a, b) => b.totalPoints - a.totalPoints);
  res.json(results.slice(0, 50));
});

// Submit jump to leaderboard
app.post('/api/leaderboard', (req, res) => {
  const { jumperName, hillId, distance, stylePoints, totalPoints } = req.body;

  if (!jumperName || !hillId || distance === undefined || totalPoints === undefined) {
    return res.status(400).json({ error: 'Missing required fields for leaderboard submission.' });
  }

  const newEntry = {
    id: 'lb-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    jumperName: String(jumperName).trim(),
    hillId: String(hillId),
    distance: Number(distance) || 0,
    stylePoints: Number(stylePoints) || 0,
    totalPoints: Number(totalPoints) || 0,
    timestamp: Date.now()
  };

  leaderboard.push(newEntry);
  res.status(201).json(newEntry);
});

// Serve static frontend assets from public/
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Fallback to index.html for SPA / client-side navigation if file not found
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'), err => {
    if (err) {
      // If public/index.html is not yet created by teammates, return a temporary landing
      res.status(200).send('<h1>SkiJumps2 Server Ready</h1><p>Frontend assets are being assembled.</p>');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SkiJumps2] Server listening on port ${PORT}`);
});
