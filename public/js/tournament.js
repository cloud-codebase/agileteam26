/**
 * Tournament Engine for SkiJump2
 * Supports World Cup series, AI competitor simulations, 5-judge scoring,
 * and leaderboard synchronization using relative subpath-safe API endpoints.
 */

(function () {
  'use strict';

  class TournamentEngine {
    constructor() {
      this.hills = [];
      this.aiCompetitors = [];
      this.currentTournament = null;
      this.isInitialized = false;

      // Default fallback hills in case network is offline
      this.defaultHills = [
        {
          id: 'zakopane',
          name: 'Zakopane - Wielka Krokiew',
          country: 'POL',
          kPoint: 120,
          hsPoint: 134,
          record: { distance: 140.5, holder: 'Adam Małysz (POL)' }
        },
        {
          id: 'wisla',
          name: 'Wisła - Malinka',
          country: 'POL',
          kPoint: 120,
          hsPoint: 134,
          record: { distance: 139.0, holder: 'Stefan Kraft (AUT)' }
        },
        {
          id: 'planica',
          name: 'Planica - Letalnica bratov Gorišek',
          country: 'SLO',
          kPoint: 200,
          hsPoint: 240,
          record: { distance: 252.0, holder: 'Ryoyu Kobayashi (JPN)' }
        },
        {
          id: 'oberstdorf',
          name: 'Oberstdorf - Schattenbergschanze',
          country: 'GER',
          kPoint: 115,
          hsPoint: 137,
          record: { distance: 143.5, holder: 'Sigurd Pettersen (NOR)' }
        }
      ];

      // Default fallback AI competitors
      this.defaultAiCompetitors = [
        { name: 'Adam Małysz', country: 'POL', skill: 98, consistency: 95 },
        { name: 'Martin Schmitt', country: 'GER', skill: 95, consistency: 90 },
        { name: 'Janne Ahonen', country: 'FIN', skill: 96, consistency: 94 },
        { name: 'Sven Hannawald', country: 'GER', skill: 94, consistency: 88 },
        { name: 'Simon Ammann', country: 'SUI', skill: 93, consistency: 89 },
        { name: 'Noriaki Kasai', country: 'JPN', skill: 91, consistency: 92 },
        { name: 'Matti Hautamäki', country: 'FIN', skill: 92, consistency: 87 },
        { name: 'Andreas Goldberger', country: 'AUT', skill: 90, consistency: 86 }
      ];
    }

    /**
     * Fetch hills and competitors from backend using relative subpath-safe paths ('api/...')
     */
    async init() {
      try {
        const [hillsRes, aiRes] = await Promise.all([
          fetch('api/hills').catch(() => null),
          fetch('api/ai-competitors').catch(() => null)
        ]);

        if (hillsRes && hillsRes.ok) {
          this.hills = await hillsRes.json();
        } else {
          this.hills = this.defaultHills;
        }

        if (aiRes && aiRes.ok) {
          this.aiCompetitors = await aiRes.json();
        } else {
          this.aiCompetitors = this.defaultAiCompetitors;
        }
      } catch (err) {
        console.warn('[TournamentEngine] Using default fallback data due to fetch error:', err);
        this.hills = this.defaultHills;
        this.aiCompetitors = this.defaultAiCompetitors;
      }
      this.isInitialized = true;
      return { hills: this.hills, competitors: this.aiCompetitors };
    }

    /**
     * Start a new tournament or World Cup
     * @param {Array<string>} hillIds - list of hill IDs (e.g., ['zakopane', 'wisla', 'planica'])
     * @param {Object} humanPlayer - { name: 'Player', country: 'POL', suitColor: '#d91424', hasMustache: true }
     */
    startTournament(hillIds = ['zakopane', 'wisla', 'planica'], humanPlayer = null) {
      if (!this.hills || this.hills.length === 0) {
        this.hills = this.defaultHills;
      }
      if (!this.aiCompetitors || this.aiCompetitors.length === 0) {
        this.aiCompetitors = this.defaultAiCompetitors;
      }

      const activeHills = hillIds
        .map(id => this.hills.find(h => h.id === id))
        .filter(Boolean);

      const tournamentHills = activeHills.length > 0 ? activeHills : this.hills;

      const player = {
        id: 'human-1',
        name: humanPlayer?.name || 'Gracz',
        country: humanPlayer?.country || 'POL',
        isHuman: true,
        skill: 95,
        consistency: 90,
        suitColor: humanPlayer?.suitColor || '#d91424',
        hasMustache: humanPlayer?.hasMustache !== false
      };

      const participants = [
        player,
        ...this.aiCompetitors.map((ai, idx) => ({
          id: `ai-${idx}`,
          name: ai.name,
          country: ai.country,
          isHuman: false,
          skill: ai.skill || 90,
          consistency: ai.consistency || 88
        }))
      ];

      this.currentTournament = {
        id: `tourney-${Date.now()}`,
        hills: tournamentHills,
        currentHillIndex: 0,
        currentRound: 1, // 2 rounds per hill
        maxRoundsPerHill: 2,
        participants: participants,
        // Standings store total World Cup points and hill stats
        standings: participants.map(p => ({
          participant: p,
          hillScores: {}, // hillId -> { round1: { distance, style, points }, round2: ... , totalPoints: ... }
          totalTournamentPoints: 0,
          worldCupPoints: 0
        })),
        isFinished: false
      };

      return this.getState();
    }

    /**
     * Get current tournament state and hill
     */
    getState() {
      if (!this.currentTournament) return null;
      const t = this.currentTournament;
      const currentHill = t.hills[t.currentHillIndex] || null;
      return {
        tournamentId: t.id,
        currentHill,
        hillNumber: t.currentHillIndex + 1,
        totalHills: t.hills.length,
        currentRound: t.currentRound,
        maxRounds: t.maxRoundsPerHill,
        isFinished: t.isFinished,
        standings: this.getStandings()
      };
    }

    /**
     * Compute FIS style score from 5 judges (discard highest and lowest, sum remaining 3)
     * @param {Array<number>} rawScores - 5 scores between 10.0 and 20.0
     * @returns {Object} { rawScores, countedScores, styleScore }
     */
    calculateJudgeScores(rawScores = null, landingQuality = 'TELEMARK') {
      let scores = rawScores;
      if (!scores || scores.length !== 5) {
        // Base score determined by landing quality
        let base = 18.0;
        if (landingQuality === 'TWO_FOOT') base = 15.5;
        if (landingQuality === 'TOUCH') base = 13.0;
        if (landingQuality === 'CRASH') base = 8.0;

        scores = Array.from({ length: 5 }, () => {
          const delta = (Math.random() - 0.5) * 1.5;
          const score = Math.round((base + delta) * 2) / 2; // increments of 0.5
          return Math.min(20.0, Math.max(6.0, score));
        });
      }

      const sorted = [...scores].sort((a, b) => a - b);
      const counted = sorted.slice(1, 4); // drop lowest and highest
      const styleScore = counted.reduce((sum, val) => sum + val, 0);

      return {
        allScores: scores,
        countedScores: counted,
        droppedScores: [sorted[0], sorted[4]],
        styleScore: Number(styleScore.toFixed(1))
      };
    }

    /**
     * Calculate FIS jump points: base 60pts at K-point (or 120 on ski flying K>=170),
     * +/- points per meter, plus style score and wind compensation.
     */
    calculateJumpPoints(distance, hill, styleScore, windCompensation = 0) {
      const isFlying = hill.kPoint >= 170;
      const basePoints = isFlying ? 120 : 60;
      const meterValue = isFlying ? 1.2 : (hill.kPoint >= 100 ? 1.8 : 2.0);

      const distanceDiff = distance - hill.kPoint;
      const distancePoints = basePoints + (distanceDiff * meterValue);
      const total = distancePoints + styleScore + windCompensation;

      return {
        distancePoints: Number(distancePoints.toFixed(1)),
        stylePoints: Number(styleScore.toFixed(1)),
        windPoints: Number(windCompensation.toFixed(1)),
        totalPoints: Number(Math.max(0, total).toFixed(1))
      };
    }

    /**
     * Simulate an AI competitor's jump on a given hill
     */
    simulateAiJump(participant, hill, wind = 0) {
      const skillFactor = (participant.skill || 90) / 100;
      const consistencyFactor = (participant.consistency || 90) / 100;

      // Random factor modulated by consistency
      const variance = (1 - consistencyFactor) * 20;
      const randomOffset = (Math.random() - 0.5) * variance;

      // Base distance targets between K-point and HS-point
      const targetRange = hill.hsPoint - hill.kPoint;
      const baseDistance = hill.kPoint + (targetRange * 0.7 * skillFactor) + randomOffset;

      // Wind effect: positive front wind gives lift, negative tail wind reduces
      const windEffect = wind * 2.5;
      let finalDistance = baseDistance + windEffect;
      finalDistance = Math.max(hill.kPoint * 0.6, Math.min(hill.hsPoint + 8.0, finalDistance));
      finalDistance = Math.round(finalDistance * 2) / 2; // Round to 0.5m

      // Determine landing style: skilled jumpers execute telemark
      let landingQuality = 'TELEMARK';
      const crashChance = Math.random();
      if (finalDistance > hill.hsPoint + 4 && crashChance < 0.15) {
        landingQuality = 'TOUCH';
      } else if (Math.random() > skillFactor) {
        landingQuality = 'TWO_FOOT';
      }

      const judges = this.calculateJudgeScores(null, landingQuality);
      const windComp = Number((-wind * 1.5).toFixed(1));
      const points = this.calculateJumpPoints(finalDistance, hill, judges.styleScore, windComp);

      return {
        participant,
        distance: finalDistance,
        landingQuality,
        judgeScores: judges.allScores,
        styleScore: judges.styleScore,
        windCompensation: windComp,
        totalPoints: points.totalPoints
      };
    }

    /**
     * Process the human player's jump result for the current round,
     * simultaneously simulate all AI jumps, and advance tournament state.
     */
    processJumpResult(humanResult) {
      if (!this.currentTournament || this.currentTournament.isFinished) {
        return null;
      }

      const t = this.currentTournament;
      const currentHill = t.hills[t.currentHillIndex];
      const roundKey = `round${t.currentRound}`;

      // 1. Record human player jump
      const humanStanding = t.standings.find(s => s.participant.isHuman);
      if (humanStanding) {
        if (!humanStanding.hillScores[currentHill.id]) {
          humanStanding.hillScores[currentHill.id] = { rounds: {}, totalHillPoints: 0 };
        }
        humanStanding.hillScores[currentHill.id].rounds[roundKey] = humanResult;
        humanStanding.hillScores[currentHill.id].totalHillPoints += humanResult.totalPoints;
        humanStanding.totalTournamentPoints += humanResult.totalPoints;
      }

      // 2. Simulate AI jumps for this round
      const roundAiResults = [];
      t.standings.forEach(s => {
        if (s.participant.isHuman) return;

        // Generate slight wind variance for AI jumps
        const aiWind = (Math.random() - 0.5) * 2.0;
        const aiResult = this.simulateAiJump(s.participant, currentHill, aiWind);
        roundAiResults.push(aiResult);

        if (!s.hillScores[currentHill.id]) {
          s.hillScores[currentHill.id] = { rounds: {}, totalHillPoints: 0 };
        }
        s.hillScores[currentHill.id].rounds[roundKey] = aiResult;
        s.hillScores[currentHill.id].totalHillPoints += aiResult.totalPoints;
        s.totalTournamentPoints += aiResult.totalPoints;
      });

      // 3. Check for advancement
      const isRound2 = t.currentRound === t.maxRoundsPerHill;
      let roundSummary = {
        hill: currentHill,
        round: t.currentRound,
        humanResult,
        aiResults: roundAiResults,
        hillFinished: isRound2
      };

      if (isRound2) {
        // Award World Cup points for this hill (100 for 1st, 80 for 2nd, 60 for 3rd, etc.)
        this.awardWorldCupPoints(currentHill.id);

        if (t.currentHillIndex + 1 < t.hills.length) {
          t.currentHillIndex += 1;
          t.currentRound = 1;
        } else {
          t.isFinished = true;
        }
      } else {
        t.currentRound += 1;
      }

      return {
        summary: roundSummary,
        state: this.getState()
      };
    }

    /**
     * Award classic World Cup points for the completed hill
     */
    awardWorldCupPoints(hillId) {
      if (!this.currentTournament) return;
      const fisCupPoints = [100, 80, 60, 50, 45, 40, 36, 32, 29, 26, 24, 22, 20];

      // Rank standings for this specific hill
      const hillRankings = [...this.currentTournament.standings].sort((a, b) => {
        const ptsA = a.hillScores[hillId]?.totalHillPoints || 0;
        const ptsB = b.hillScores[hillId]?.totalHillPoints || 0;
        return ptsB - ptsA;
      });

      hillRankings.forEach((standing, rankIdx) => {
        const cupPts = fisCupPoints[rankIdx] || 0;
        standing.worldCupPoints = (standing.worldCupPoints || 0) + cupPts;
      });
    }

    /**
     * Get sorted standings (by World Cup points or total tournament points)
     */
    getStandings() {
      if (!this.currentTournament) return [];
      return [...this.currentTournament.standings].sort((a, b) => {
        if (b.worldCupPoints !== a.worldCupPoints) {
          return b.worldCupPoints - a.worldCupPoints;
        }
        return b.totalTournamentPoints - a.totalTournamentPoints;
      });
    }

    /**
     * Save human jump to remote / local API leaderboard
     * Uses relative subpath-safe fetch: 'api/leaderboard'
     */
    async submitScoreToLeaderboard(entry) {
      try {
        const response = await fetch('api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: entry.playerName || 'Gracz',
            country: entry.country || 'POL',
            hillId: entry.hillId || 'zakopane',
            distance: entry.distance,
            styleScore: entry.styleScore,
            totalPoints: entry.totalPoints
          })
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.warn('[TournamentEngine] Failed to submit score to API, falling back to localStorage:', err);
      }

      // Local fallback
      try {
        const localKey = `skijump2_leaderboard_${entry.hillId || 'zakopane'}`;
        const localScores = JSON.parse(localStorage.getItem(localKey) || '[]');
        localScores.push({
          id: `local-${Date.now()}`,
          playerName: entry.playerName,
          country: entry.country || 'POL',
          hillId: entry.hillId,
          distance: entry.distance,
          styleScore: entry.styleScore,
          totalPoints: entry.totalPoints,
          timestamp: Date.now()
        });
        localScores.sort((a, b) => b.totalPoints - a.totalPoints);
        localStorage.setItem(localKey, JSON.stringify(localScores.slice(0, 20)));
        return { success: true, local: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    /**
     * Fetch leaderboard for a hill (relative subpath-safe path)
     */
    async fetchLeaderboard(hillId = 'zakopane') {
      try {
        const res = await fetch(`api/leaderboard?hillId=${encodeURIComponent(hillId)}`);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[TournamentEngine] API leaderboard fetch failed, checking localStorage:', err);
      }

      // Local fallback
      try {
        const localKey = `skijump2_leaderboard_${hillId}`;
        return JSON.parse(localStorage.getItem(localKey) || '[]');
      } catch (e) {
        return [];
      }
    }
  }

  // Export as Singleton and Class on window object according to DESIGN.md
  window.TournamentEngine = TournamentEngine;
  window.SkiTournament = new TournamentEngine();

  // Auto-init on DOMContentLoaded or immediate execution
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.SkiTournament.init().catch(console.error);
    });
  } else {
    window.SkiTournament.init().catch(console.error);
  }
})();
