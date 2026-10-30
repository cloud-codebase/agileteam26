const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve static frontend files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Hill Profiles Seed Data adhering strictly to DESIGN.md Section 4
const hills = [
  {
    id: "zakopane",
    name: "Wielka Krokiew (Zakopane)",
    country: "POL",
    kPoint: 120,
    hsPoint: 134,
    record: { distance: 140.5, holder: "Adam Małysz", year: 2002 },
    inRunLength: 91,
    inRunAngle: 35.0,
    tableAngle: 10.5
  },
  {
    id: "planica",
    name: "Letalnica bratov Gorišek (Planica)",
    country: "SLO",
    kPoint: 200,
    hsPoint: 240,
    record: { distance: 252.0, holder: "Ryoyu Kobayashi", year: 2019 },
    inRunLength: 133,
    inRunAngle: 35.1,
    tableAngle: 11.5
  },
  {
    id: "lahti",
    name: "Salpausselkä (Lahti)",
    country: "FIN",
    kPoint: 116,
    hsPoint: 130,
    record: { distance: 138.0, holder: "Andreas Widhölzl", year: 2006 },
    inRunLength: 88,
    inRunAngle: 34.5,
    tableAngle: 10.5
  },
  {
    id: "oberstdorf",
    name: "Heini-Klopfer-Skiflugschanze (Oberstdorf)",
    country: "GER",
    kPoint: 200,
    hsPoint: 235,
    record: { distance: 238.0, holder: "Domen Prevc", year: 2017 },
    inRunLength: 125,
    inRunAngle: 35.5,
    tableAngle: 11.0
  }
];

// Seeded Leaderboard with legendary ski jumpers
let leaderboard = [
  { rank: 1, name: "Adam Małysz", country: "POL", hill: "Wielka Krokiew (Zakopane)", distance1: 138.5, distance2: 139.0, totalPoints: 285.5 },
  { rank: 2, name: "Janne Ahonen", country: "FIN", hill: "Salpausselkä (Lahti)", distance1: 136.0, distance2: 137.5, totalPoints: 280.2 },
  { rank: 3, name: "Ryoyu Kobayashi", country: "JPN", hill: "Letalnica bratov Gorišek (Planica)", distance1: 242.0, distance2: 245.5, totalPoints: 279.4 },
  { rank: 4, name: "Martin Schmitt", country: "GER", hill: "Wielka Krokiew (Zakopane)", distance1: 134.5, distance2: 136.0, totalPoints: 274.6 },
  { rank: 5, name: "Sven Hannawald", country: "GER", hill: "Wielka Krokiew (Zakopane)", distance1: 133.0, distance2: 135.5, totalPoints: 271.8 },
  { rank: 6, name: "Noriaki Kasai", country: "JPN", hill: "Letalnica bratov Gorišek (Planica)", distance1: 235.0, distance2: 238.5, totalPoints: 268.2 },
  { rank: 7, name: "Andreas Widhölzl", country: "AUT", hill: "Salpausselkä (Lahti)", distance1: 132.0, distance2: 134.5, totalPoints: 265.1 },
  { rank: 8, name: "Simon Ammann", country: "SUI", hill: "Wielka Krokiew (Zakopane)", distance1: 129.5, distance2: 131.0, totalPoints: 256.3 }
];

// Helper to sort and assign ranks
function updateRanks() {
  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  leaderboard.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });
}

// Initial rank setup
updateRanks();

// GET /api/hills
app.get('/api/hills', (req, res) => {
  res.json(hills);
});

// GET /api/leaderboard
app.get('/api/leaderboard', (req, res) => {
  res.json(leaderboard);
});

// POST /api/leaderboard
app.post('/api/leaderboard', (req, res) => {
  const { name, country, hill, distance1, distance2, totalPoints } = req.body;
  
  if (!name || totalPoints === undefined) {
    return res.status(400).json({ error: "Missing required fields (name, totalPoints)" });
  }

  const newEntry = {
    name: String(name).trim().slice(0, 30),
    country: (country || "POL").toUpperCase().slice(0, 3),
    hill: hill || "Wielka Krokiew (Zakopane)",
    distance1: Number(distance1) || 0,
    distance2: Number(distance2) || 0,
    totalPoints: Number(Number(totalPoints).toFixed(1))
  };

  leaderboard.push(newEntry);
  updateRanks();

  // Keep top 20 scores
  if (leaderboard.length > 20) {
    leaderboard = leaderboard.slice(0, 20);
  }

  res.status(201).json(leaderboard);
});

// Fallback health check
app.get('/health', (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Jumps5k backend server running on port ${PORT}`);
});
