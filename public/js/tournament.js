/**
 * tournament.js - Competition Scoring Engine & Tournament Progression
 * Sprint 1.0 (SCRUM-174)
 *
 * Implements official FIS Ski Jumping Competition Rules:
 * 1. Distance points:
 *    - Base 60 pts at K-point (120 pts for Ski Flying / K >= 170m)
 *    - +/- meterValue (1.8 pts/m for large hills, 1.2 pts/m for ski flying, 2.0 pts/m for normal hills)
 * 2. 5 Style Judges:
 *    - Each judge awards 0.0 to 20.0 points in 0.5 increments.
 *    - Deductions for flight instability, pitch wobble, lack of telemark landing, or crash.
 *    - Drops highest and lowest judge marks; sums the middle 3 (max 60.0 style pts).
 * 3. Wind Compensation points:
 *    - Headwind (-x or indicated as positive speed): minus compensation points (wind helped).
 *    - Tailwind (+x or tail breeze): plus compensation points (wind hindered).
 * 4. Gate Compensation:
 *    - Adjustment if gate changed.
 * 5. Tournament Progression & AI Competitors:
 *    - Simulates authentic World Cup jumpers (Adam M., Janne A., Stefan K., Ryoyu K., etc.)
 *    - Multi-round tournament standing & REST leaderboard sync via relative 'api/leaderboard'
 */

(function (window) {
  'use strict';

  var SkiTournament = {
    currentHill: null,
    currentRound: 1,
    maxRounds: 2,
    currentGate: 12,
    baseGate: 12,
    roundsHistory: [],
    leaderboardEntries: [],

    // AI competitors roster
    aiCompetitors: [
      { name: 'Adam M. 🇵🇱', skill: 0.95, consistency: 0.92 },
      { name: 'Janne A. 🇫🇮', skill: 0.93, consistency: 0.90 },
      { name: 'Stefan K. 🇦🇹', skill: 0.94, consistency: 0.91 },
      { name: 'Ryoyu K. 🇯🇵', skill: 0.94, consistency: 0.89 },
      { name: 'Kamil S. 🇵🇱', skill: 0.92, consistency: 0.93 },
      { name: 'Halvor G. 🇳🇴', skill: 0.91, consistency: 0.88 },
      { name: 'Sven H. 🇩🇪', skill: 0.90, consistency: 0.86 },
      { name: 'Simon A. 🇨🇭', skill: 0.89, consistency: 0.85 },
      { name: 'Noriaki K. 🇯🇵', skill: 0.88, consistency: 0.94 },
      { name: 'Peter P. 🇸🇮', skill: 0.91, consistency: 0.89 }
    ],

    init: function (hill) {
      this.currentHill = hill || (window.HillData ? window.HillData.get('zakopane') : null);
      this.currentRound = 1;
      this.roundsHistory = [];
      if (this.currentHill) {
        this.baseGate = this.currentHill.defaultGate || 12;
        this.currentGate = this.baseGate;
      }
    },

    setHill: function (hill) {
      this.currentHill = hill;
      if (hill) {
        this.baseGate = hill.defaultGate || 12;
        this.currentGate = this.baseGate;
      }
    },

    /**
     * Calculates official FIS jump score
     * @param {Object} hill - Hill data
     * @param {number} distance - Jumper distance in meters
     * @param {boolean} isTelemark - Telemark landing achieved
     * @param {boolean} isCrash - Whether the jumper crashed
     * @param {Object} wind - Wind vector { speed, x, y }
     * @param {number} [gate] - Starting gate
     */
    calculatePoints: function (hill, distance, isTelemark, isCrash, wind, gate) {
      var h = hill || this.currentHill || (window.HillData ? window.HillData.get('zakopane') : { kPoint: 120, meterValue: 1.8, basePoints: 60 });
      var k = h.kPoint || 120;
      var meterVal = h.meterValue || (k >= 170 ? 1.2 : 1.8);
      var basePts = h.basePoints || (k >= 170 ? 120 : 60);

      // 1. Distance points
      var distDiff = distance - k;
      var distancePoints = basePts + (distDiff * meterVal);
      // Floor at 0 for distance points if extremely short
      if (distancePoints < 0) distancePoints = 0;
      distancePoints = Math.round(distancePoints * 10) / 10;

      // 2. Five Style Judges
      // Judge base depends on landing & flight quality
      var judgeScores = [];
      var countries = ['AUT', 'NOR', 'POL', 'GER', 'FIN'];

      for (var i = 0; i < 5; i++) {
        var baseScore = 18.5;

        if (isCrash) {
          // Crash penalty: FIS rules dictate style marks between 6.0 and 8.5
          baseScore = 7.0 + Math.random() * 1.5;
        } else if (isTelemark) {
          // Clean Telemark: 18.5 - 20.0
          baseScore = 18.5 + (Math.random() * 1.5);
          if (distance >= (h.hsPoint || k * 1.15)) {
            // Excellent distance bonus judge bias
            baseScore = Math.min(20.0, baseScore + 0.5);
          }
        } else {
          // Two-footed landing deduction: typically 1.5 - 2.5 pts off
          baseScore = 16.0 + (Math.random() * 1.5);
        }

        // Slight natural judge variance (0.5 increments in FIS)
        var rounded = Math.round(baseScore * 2) / 2;
        rounded = Math.max(0.0, Math.min(20.0, rounded));

        judgeScores.push({
          judgeId: i + 1,
          country: countries[i % countries.length],
          score: rounded,
          isDropped: false
        });
      }

      // Drop highest and lowest score
      var sortedIndices = [0, 1, 2, 3, 4].sort(function (a, b) {
        return judgeScores[a].score - judgeScores[b].score;
      });

      var lowestIdx = sortedIndices[0];
      var highestIdx = sortedIndices[4];
      judgeScores[lowestIdx].isDropped = true;
      judgeScores[highestIdx].isDropped = true;

      var judgePoints = 0;
      for (var j = 0; j < judgeScores.length; j++) {
        if (!judgeScores[j].isDropped) {
          judgePoints += judgeScores[j].score;
        }
      }
      judgePoints = Math.round(judgePoints * 10) / 10;

      // 3. Wind Compensation
      // Negative wind.x in our physics is headwind (which helps skier lift -> negative compensation points)
      // Positive wind.x is tailwind (which pushes skier down -> positive compensation points)
      var windSens = h.windSens || (k >= 170 ? 1.6 : 1.2);
      var windSpeedVal = 0;
      if (wind) {
        if (typeof wind.x === 'number') {
          // In our physics: wind.x is signed (-headwind, +tailwind)
          windSpeedVal = wind.x;
        } else if (typeof wind.speed === 'number') {
          windSpeedVal = wind.speed;
        }
      }
      // FIS formula: points = windSpeed * (k - 36) * factor
      var windComp = -windSpeedVal * windSens * 1.8;
      windComp = Math.round(windComp * 10) / 10;

      // 4. Gate Compensation
      var activeGate = gate !== undefined ? gate : this.currentGate;
      var gateDiff = this.baseGate - activeGate;
      var gateComp = gateDiff * (k * 0.04);
      gateComp = Math.round(gateComp * 10) / 10;

      // 5. Total Round Score
      var totalPoints = distancePoints + judgePoints + windComp + gateComp;
      if (totalPoints < 0) totalPoints = 0;
      totalPoints = Math.round(totalPoints * 10) / 10;

      return {
        distance: distance,
        distancePoints: distancePoints,
        judgePoints: judgePoints,
        windComp: windComp,
        gateComp: gateComp,
        totalPoints: totalPoints,
        judges: judgeScores,
        isTelemark: isTelemark,
        isCrash: isCrash
      };
    },

    /**
     * Simulates round scores for AI competitors on the current hill
     */
    simulateAiRound: function (hill, roundNumber) {
      var h = hill || this.currentHill || (window.HillData ? window.HillData.get('zakopane') : { kPoint: 120, hsPoint: 140 });
      var k = h.kPoint || 120;
      var hs = h.hsPoint || (k * 1.15);

      var results = [];
      for (var i = 0; i < this.aiCompetitors.length; i++) {
        var comp = this.aiCompetitors[i];

        // Normal distribution around hill size scaled by skill
        var baseRatio = 0.88 + comp.skill * 0.16 + (Math.random() - 0.5) * (1 - comp.consistency) * 0.25;
        var dist = Math.round((k * baseRatio) * 2) / 2;
        // Cap around record
        dist = Math.min((h.record || hs + 6), Math.max(k * 0.65, dist));

        // Crash probability for AI is very low
        var isCrash = Math.random() < 0.03;
        var isTelemark = !isCrash && (Math.random() > 0.25);

        // Wind simulation
        var windSim = { x: Math.round((Math.random() * 3.0 - 1.5) * 10) / 10 };
        var scoreData = this.calculatePoints(h, dist, isTelemark, isCrash, windSim);

        results.push({
          playerName: comp.name,
          distance: dist,
          totalPoints: scoreData.totalPoints,
          judgePoints: scoreData.judgePoints,
          windComp: scoreData.windComp,
          round: roundNumber || 1,
          isAi: true
        });
      }

      return results;
    },

    /**
     * Submits player jump score and retrieves updated global leaderboard from relative 'api/leaderboard'
     * Subpath safe (no leading slashes)!
     */
    submitScore: function (playerName, hillId, scoreResult, callback) {
      var self = this;
      var payload = {
        playerName: (playerName || 'Player 1').trim().slice(0, 20),
        hillId: hillId || (this.currentHill ? this.currentHill.id : 'zakopane'),
        distance: scoreResult.distance,
        totalPoints: scoreResult.totalPoints,
        judgeTotal: scoreResult.judgePoints,
        windComp: scoreResult.windComp
      };

      fetch('api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP error ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (callback) callback(null, data);
        })
        .catch(function (err) {
          console.warn('[SkiTournament] Offline or API unreachable, saving locally:', err);
          // Local fallback entry
          var localEntry = {
            id: 'local-' + Date.now(),
            playerName: payload.playerName,
            hillId: payload.hillId,
            distance: payload.distance,
            totalPoints: payload.totalPoints,
            date: new Date().toISOString().split('T')[0]
          };
          self.leaderboardEntries.unshift(localEntry);
          if (callback) callback(null, { success: true, entry: localEntry, leaderboard: self.leaderboardEntries });
        });
    },

    /**
     * Fetches current leaderboard for hill via relative API
     */
    fetchLeaderboard: function (hillId, callback) {
      var url = 'api/leaderboard' + (hillId ? '?hillId=' + encodeURIComponent(hillId) : '');
      fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (callback) callback(null, data);
        })
        .catch(function (err) {
          console.warn('[SkiTournament] Could not fetch leaderboard:', err);
          if (callback) callback(err, []);
        });
    }
  };

  window.SkiTournament = SkiTournament;
})(typeof window !== 'undefined' ? window : global);
