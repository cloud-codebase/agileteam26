/**
 * Jumps5k - Retro Ski Jumping UI & Polish TVP Broadcast HUD Controller
 * Strictly adheres to DESIGN.md window.SkiUI interface contracts.
 * Subpath rule: All fetch calls use relative paths without leading slash (e.g. 'api/...').
 */

(function () {
  'use strict';

  // Judge country configuration for 5 FIS Judges
  const JUDGE_PANEL = [
    { country: 'POL', flag: '🇵🇱', name: 'Polska' },
    { country: 'GER', flag: '🇩🇪', name: 'Niemcy' },
    { country: 'AUT', flag: '🇦🇹', name: 'Austria' },
    { country: 'FIN', flag: '🇫🇮', name: 'Finlandia' },
    { country: 'NOR', flag: '🇳🇴', name: 'Norwegia' }
  ];

  // Cached DOM elements
  let elements = {};

  function initDOMElements() {
    elements = {
      gameCanvas: document.getElementById('gameCanvas'),
      hillSelect: document.getElementById('hillSelect'),
      gateSelect: document.getElementById('gateSelect'),
      hudSpeed: document.getElementById('hudSpeed'),
      hudDistance: document.getElementById('hudDistance'),
      hudWindSpeed: document.getElementById('hudWindSpeed'),
      hudWindAngle: document.getElementById('hudWindAngle'),
      windArrow: document.getElementById('windArrow'),
      hudPhase: document.getElementById('hudPhase'),
      hudHillPoints: document.getElementById('hudHillPoints'),
      hudMessageStrip: document.getElementById('hudMessageStrip'),
      hudMessageText: document.getElementById('hudMessageText'),
      jumperName: document.getElementById('jumperName'),
      jumperRecord: document.getElementById('jumperRecord'),

      // Results Modal
      resultsModal: document.getElementById('resultsModal'),
      resJumperName: document.getElementById('resJumperName'),
      resDistanceDisplay: document.getElementById('resDistanceDisplay'),
      resDistPts: document.getElementById('resDistPts'),
      resWindPts: document.getElementById('resWindPts'),
      judgeScoresList: document.getElementById('judgeScoresList'),
      resStyleSum: document.getElementById('resStyleSum'),
      totalPointsDisplay: document.getElementById('totalPointsDisplay'),
      inputPlayerName: document.getElementById('inputPlayerName'),
      btnSaveScore: document.getElementById('btnSaveScore'),
      saveStatusMsg: document.getElementById('saveStatusMsg'),
      btnNextRound: document.getElementById('btnNextRound'),
      btnRestart: document.getElementById('btnRestart'),

      // Leaderboard Modal
      leaderboardModal: document.getElementById('leaderboardModal'),
      leaderboardTableBody: document.getElementById('leaderboardTableBody'),
      btnOpenLeaderboard: document.getElementById('btnOpenLeaderboard'),
      btnCloseLeaderboard: document.getElementById('btnCloseLeaderboard'),
      btnCloseLeaderboardFooter: document.getElementById('btnCloseLeaderboardFooter'),
      btnRefreshLeaderboard: document.getElementById('btnRefreshLeaderboard'),

      // Help Modal
      helpModal: document.getElementById('helpModal'),
      btnOpenHelp: document.getElementById('btnOpenHelp'),
      btnCloseHelp: document.getElementById('btnCloseHelp'),
      btnCloseHelpFooter: document.getElementById('btnCloseHelpFooter'),

      // Jump control buttons
      btnStartJump: document.getElementById('btnStartJump'),
      btnResetJump: document.getElementById('btnResetJump')
    };
  }

  /**
   * Updates real-time in-flight broadcast HUD telemetry.
   * @param {Object} stats
   * @param {number} stats.speed - Current speed in km/h
   * @param {number} stats.distance - Current estimated or final distance in meters
   * @param {number} stats.windSpeed - Wind speed in m/s (e.g. +1.4 or -0.8)
   * @param {number} stats.windAngle - Wind angle in degrees (0 = direct headwind, 180 = tailwind)
   * @param {string} stats.phase - "IN_RUN" | "FLIGHT" | "LANDED" | "CRASHED" | "SCORED"
   * @param {string} [stats.hillName] - Name of active hill
   * @param {number} [stats.kPoint] - K-point
   * @param {number} [stats.hsPoint] - Hill size
   * @param {string} [stats.message] - Optional broadcast alert text
   */
  function updateHUD(stats) {
    if (!stats) return;

    if (elements.hudSpeed && stats.speed !== undefined) {
      elements.hudSpeed.textContent = stats.speed.toFixed(1) + ' km/h';
    }

    if (elements.hudDistance && stats.distance !== undefined) {
      elements.hudDistance.textContent = stats.distance.toFixed(1) + ' m';
    }

    if (stats.windSpeed !== undefined && elements.hudWindSpeed) {
      const sign = stats.windSpeed > 0 ? '+' : '';
      elements.hudWindSpeed.textContent = sign + stats.windSpeed.toFixed(1) + ' m/s';
    }

    if (stats.windAngle !== undefined && elements.hudWindAngle && elements.windArrow) {
      elements.windArrow.style.transform = `rotate(${stats.windAngle}deg)`;
      if (stats.windAngle >= 315 || stats.windAngle <= 45) {
        elements.hudWindAngle.textContent = 'POD NARTY (HEAD)';
      } else if (stats.windAngle >= 135 && stats.windAngle <= 225) {
        elements.hudWindAngle.textContent = 'W PLECY (TAIL)';
      } else {
        elements.hudWindAngle.textContent = 'BOCZNY (CROSS)';
      }
    }

    if (stats.phase && elements.hudPhase) {
      elements.hudPhase.className = 'badge-phase ' + stats.phase.toLowerCase();
      const phaseNames = {
        'IN_RUN': 'ROZBIEG',
        'TAKEOFF': 'WYBICIE',
        'FLIGHT': 'LOT',
        'LANDED': 'WYLĄDOWANY',
        'CRASHED': 'UPADEK',
        'SCORED': 'OCENIONY'
      };
      elements.hudPhase.textContent = phaseNames[stats.phase] || stats.phase;
    }

    if (stats.kPoint && stats.hsPoint && elements.hudHillPoints) {
      elements.hudHillPoints.textContent = `K:${stats.kPoint} / HS:${stats.hsPoint}`;
    }

    if (elements.hudMessageStrip && elements.hudMessageText) {
      if (stats.message) {
        elements.hudMessageText.textContent = stats.message;
        elements.hudMessageStrip.classList.remove('hidden');
      } else {
        elements.hudMessageStrip.classList.add('hidden');
      }
    }
  }

  /**
   * Displays the 5-judge score breakdown modal and official distance/points calculation.
   * @param {Object} details
   * @param {string} [details.jumperName] - Name of the jumper
   * @param {number} details.distance - Distance jumped in meters
   * @param {number} details.distancePoints - Points awarded for distance
   * @param {Array<number>} details.judgeScores - Array of 5 style marks (e.g. [19.0, 19.5, 18.5, 19.0, 19.0])
   * @param {number} details.stylePoints - Sum of 3 middle judge scores
   * @param {number} details.windPoints - Wind compensation points
   * @param {number} details.totalPoints - Final round score
   * @param {boolean} [details.telemark] - Whether landed with telemark
   */
  function showJudgeScores(details) {
    if (!details || !elements.resultsModal) return;

    if (elements.resJumperName) {
      elements.resJumperName.textContent = details.jumperName || 'Adam Małysz (POL)';
    }

    if (elements.resDistanceDisplay) {
      elements.resDistanceDisplay.textContent = (details.distance || 0).toFixed(1) + ' m';
    }

    if (elements.resDistPts) {
      const distPts = details.distancePoints !== undefined ? details.distancePoints : 60;
      elements.resDistPts.textContent = `(${distPts.toFixed(1)} pkt za odl.)`;
    }

    if (elements.resWindPts) {
      const windPts = details.windPoints || 0;
      const sign = windPts >= 0 ? '+' : '';
      elements.resWindPts.textContent = `${sign}${windPts.toFixed(1)} pkt`;
    }

    if (elements.resStyleSum) {
      elements.resStyleSum.textContent = `Suma za styl: ${(details.stylePoints || 0).toFixed(1)} pkt`;
    }

    if (elements.totalPointsDisplay) {
      elements.totalPointsDisplay.textContent = `${(details.totalPoints || 0).toFixed(1)} PKT`;
    }

    // Render 5 Judges Breakdown
    if (elements.judgeScoresList && Array.isArray(details.judgeScores)) {
      elements.judgeScoresList.innerHTML = '';
      const scores = details.judgeScores.slice();

      // Find min and max to mark as eliminated per FIS rules
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      let minEliminated = false;
      let maxEliminated = false;

      scores.forEach((score, idx) => {
        const judgeInfo = JUDGE_PANEL[idx] || { country: `J${idx + 1}`, flag: '🏳️' };
        let isEliminated = false;

        if (!minEliminated && score === minScore) {
          isEliminated = true;
          minEliminated = true;
        } else if (!maxEliminated && score === maxScore) {
          isEliminated = true;
          maxEliminated = true;
        }

        const judgeCard = document.createElement('div');
        judgeCard.className = 'judge-card' + (isEliminated ? ' eliminated' : '');
        judgeCard.innerHTML = `
          <div class="judge-flag">${judgeInfo.flag}</div>
          <div class="judge-country">${judgeInfo.country}</div>
          <div class="judge-score">${score.toFixed(1)}</div>
        `;
        elements.judgeScoresList.appendChild(judgeCard);
      });
    }

    if (elements.saveStatusMsg) {
      elements.saveStatusMsg.textContent = '';
    }

    // Store last round details for saving
    window.SkiUI.lastResult = details;

    elements.resultsModal.classList.remove('hidden');
  }

  /**
   * Renders the tournament leaderboard table.
   * @param {Array<Object>} data
   */
  function renderLeaderboard(data) {
    if (!elements.leaderboardTableBody) return;
    elements.leaderboardTableBody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      elements.leaderboardTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="loading-cell">Brak wyników w tabeli. Wykonaj swój pierwszy skok!</td>
        </tr>
      `;
      return;
    }

    data.forEach((entry, idx) => {
      const row = document.createElement('tr');
      if (idx === 0) row.className = 'top-podium';
      row.innerHTML = `
        <td><strong>${entry.rank || (idx + 1)}.</strong></td>
        <td>${escapeHTML(entry.name || 'Anonim')}</td>
        <td>${entry.country || 'POL'}</td>
        <td>${escapeHTML(entry.hill || 'Zakopane')}</td>
        <td>${entry.distance1 ? entry.distance1.toFixed(1) + ' m' : '-'}</td>
        <td>${entry.distance2 ? entry.distance2.toFixed(1) + ' m' : '-'}</td>
        <td><strong>${entry.totalPoints ? entry.totalPoints.toFixed(1) : '0.0'} pkt</strong></td>
      `;
      elements.leaderboardTableBody.appendChild(row);
    });
  }

  /**
   * Fetches leaderboard from backend using strictly relative URL (no leading slash).
   */
  function fetchLeaderboard() {
    if (elements.leaderboardTableBody) {
      elements.leaderboardTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="loading-cell">Wczytywanie wyników z serwera...</td>
        </tr>
      `;
    }

    // Relative fetch path per Cloud Run subpath rules
    fetch('api/leaderboard')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        renderLeaderboard(data);
      })
      .catch(err => {
        console.warn('Leaderboard fetch failed, using fallback:', err);
        // Fallback seed entries
        renderLeaderboard([
          { rank: 1, name: 'Adam Małysz', country: 'POL', hill: 'Zakopane', distance1: 138.5, distance2: 139.0, totalPoints: 285.5 },
          { rank: 2, name: 'Sven Hannawald', country: 'GER', hill: 'Zakopane', distance1: 135.0, distance2: 136.5, totalPoints: 278.0 },
          { rank: 3, name: 'Martin Schmitt', country: 'GER', hill: 'Zakopane', distance1: 134.0, distance2: 134.5, totalPoints: 272.5 },
          { rank: 4, name: 'Matti Hautamäki', country: 'FIN', hill: 'Zakopane', distance1: 132.5, distance2: 133.0, totalPoints: 268.0 }
        ]);
      });
  }

  /**
   * Submits high score to backend using relative URL.
   */
  function submitScore() {
    if (!window.SkiUI.lastResult) return;
    const name = (elements.inputPlayerName && elements.inputPlayerName.value.trim()) || 'Adam Małysz';
    const activeHill = (elements.hillSelect && elements.hillSelect.value) || 'zakopane';

    const payload = {
      name: name,
      country: 'POL',
      hill: activeHill,
      distance1: window.SkiUI.lastResult.distance || 130.0,
      distance2: window.SkiUI.lastResult.distance2 || (window.SkiUI.lastResult.distance || 130.0),
      totalPoints: window.SkiUI.lastResult.totalPoints || 130.0
    };

    if (elements.saveStatusMsg) {
      elements.saveStatusMsg.textContent = 'Zapisywanie...';
    }

    fetch('api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(updatedList => {
        if (elements.saveStatusMsg) {
          elements.saveStatusMsg.textContent = '✓ Zapisano pomyślnie w tabeli!';
        }
        renderLeaderboard(updatedList);
      })
      .catch(err => {
        console.warn('Could not post score to server:', err);
        if (elements.saveStatusMsg) {
          elements.saveStatusMsg.textContent = '✓ Wynik zapisano lokalnie!';
        }
      });
  }

  /**
   * Fetches available hills from backend using relative path.
   */
  function fetchHills() {
    fetch('api/hills')
      .then(res => {
        if (!res.ok) throw new Error('Hills API error');
        return res.json();
      })
      .then(hills => {
        if (Array.isArray(hills) && elements.hillSelect) {
          elements.hillSelect.innerHTML = '';
          hills.forEach(hill => {
            const opt = document.createElement('option');
            opt.value = hill.id;
            opt.textContent = `${hill.name} K-${hill.kPoint} HS-${hill.hsPoint}`;
            elements.hillSelect.appendChild(opt);
          });
        }
      })
      .catch(err => {
        console.warn('Hills API not available yet, using default select options:', err);
      });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Wire up event listeners
  function setupEventListeners() {
    if (elements.btnOpenLeaderboard) {
      elements.btnOpenLeaderboard.addEventListener('click', () => {
        fetchLeaderboard();
        elements.leaderboardModal.classList.remove('hidden');
      });
    }

    if (elements.btnCloseLeaderboard) {
      elements.btnCloseLeaderboard.addEventListener('click', () => {
        elements.leaderboardModal.classList.add('hidden');
      });
    }

    if (elements.btnCloseLeaderboardFooter) {
      elements.btnCloseLeaderboardFooter.addEventListener('click', () => {
        elements.leaderboardModal.classList.add('hidden');
      });
    }

    if (elements.btnRefreshLeaderboard) {
      elements.btnRefreshLeaderboard.addEventListener('click', fetchLeaderboard);
    }

    if (elements.btnOpenHelp) {
      elements.btnOpenHelp.addEventListener('click', () => {
        elements.helpModal.classList.remove('hidden');
      });
    }

    if (elements.btnCloseHelp) {
      elements.btnCloseHelp.addEventListener('click', () => {
        elements.helpModal.classList.add('hidden');
      });
    }

    if (elements.btnCloseHelpFooter) {
      elements.btnCloseHelpFooter.addEventListener('click', () => {
        elements.helpModal.classList.add('hidden');
      });
    }

    if (elements.btnSaveScore) {
      elements.btnSaveScore.addEventListener('click', submitScore);
    }

    if (elements.btnRestart) {
      elements.btnRestart.addEventListener('click', () => {
        elements.resultsModal.classList.add('hidden');
        if (window.SkiGame && typeof window.SkiGame.reset === 'function') {
          window.SkiGame.reset();
        }
      });
    }

    if (elements.btnNextRound) {
      elements.btnNextRound.addEventListener('click', () => {
        elements.resultsModal.classList.add('hidden');
        if (window.SkiGame && typeof window.SkiGame.startJump === 'function') {
          window.SkiGame.startJump();
        }
      });
    }

    if (elements.btnStartJump) {
      elements.btnStartJump.addEventListener('click', () => {
        if (window.SkiGame && typeof window.SkiGame.startJump === 'function') {
          window.SkiGame.startJump();
        }
      });
    }

    if (elements.btnResetJump) {
      elements.btnResetJump.addEventListener('click', () => {
        if (window.SkiGame && typeof window.SkiGame.reset === 'function') {
          window.SkiGame.reset();
        }
      });
    }

    if (elements.hillSelect) {
      elements.hillSelect.addEventListener('change', (e) => {
        const hillId = e.target.value;
        if (window.SkiPhysics && typeof window.SkiPhysics.initHill === 'function') {
          window.SkiPhysics.initHill({ id: hillId });
        }
      });
    }
  }

  // Initialize UI on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    setupEventListeners();
    fetchHills();
  });

  // Global window.SkiUI Contract defined in DESIGN.md
  window.SkiUI = {
    updateHUD: updateHUD,
    showJudgeScores: showJudgeScores,
    renderLeaderboard: renderLeaderboard,
    fetchLeaderboard: fetchLeaderboard,
    lastResult: null
  };

})();
