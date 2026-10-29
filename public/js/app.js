/**
 * SkiJumps2 - Deluxe Ski Jump / Adam Małysz Edition
 * Orchestrator: UI, Input, Audio, Game State, API Integration & Tournament Mode
 * Complies strictly with DESIGN.md and subpath-safe relative fetch rules (fetch('api/...')).
 */
(function() {
  'use strict';

  // Game Engine & State Variables
  let hills = [];
  let jumpers = [];
  let currentHill = null;
  let currentJumper = null;
  let activeMode = 'cup'; // 'practice' | 'cup' | 'hotseat'

  // Wind vector (x: headwind/tailwind in m/s, y: updraft/downdraft in m/s)
  const currentWind = { x: 1.2, y: 0.1, speed: 1.2, angleDeg: 90 };

  // Tournament / Hotseat State Machine
  const tournamentState = {
    totalRounds: 4,
    currentRoundIndex: 0,
    currentJumperIndex: 0,
    standings: [], // array of { jumper, totalPoints, roundScores: [] }
    isCompleted: false
  };

  // Input Tracker
  const inputState = {
    pitchUp: false,
    pitchDown: false,
    leanForward: false,
    leanBack: false
  };

  let animationFrameId = null;
  let lastTime = 0;
  let jumpPhase = 'GATE'; // 'GATE' | 'INRUN' | 'FLIGHT' | 'LANDED' | 'FINISHED'
  let postJumpHandled = false;

  // DOM Elements
  let dom = {};

  // Wait for DOMContentLoaded defensive initialisation
  document.addEventListener('DOMContentLoaded', () => {
    initDomReferences();
    initAudio();
    initCanvas();
    setupEventListeners();
    fetchInitialData();
  });

  function initDomReferences() {
    dom = {
      canvas: document.getElementById('game-canvas'),
      btnJump: document.getElementById('btn-jump'),
      btnLandTelemark: document.getElementById('btn-land-telemark'),
      btnReset: document.getElementById('btn-reset'),
      btnSoundToggle: document.getElementById('btn-sound-toggle'),
      soundIcon: document.getElementById('sound-icon'),
      btnFanHorn: document.getElementById('btn-fan-horn'),
      speedDisplay: document.getElementById('speed-display'),
      distanceDisplay: document.getElementById('distance-display'),
      windSpeed: document.getElementById('wind-speed'),
      windArrow: document.getElementById('wind-arrow'),
      scoreBoard: document.getElementById('score-board'),
      flightGuidance: document.getElementById('flight-guidance'),
      jumpStatusBadge: document.getElementById('jump-status-badge'),
      stylePointsVal: document.getElementById('style-points-val'),
      totalPointsVal: document.getElementById('total-points-val'),
      hillSelect: document.getElementById('hill-select'),
      jumperSelect: document.getElementById('jumper-select'),
      modeSelect: document.getElementById('mode-select'),
      tournamentPanel: document.getElementById('tournament-panel'),
      tournamentRoundInfo: document.getElementById('tournament-round-info'),
      tournamentStandings: document.getElementById('tournament-standings'),
      leaderboardList: document.getElementById('leaderboard-list'),
      btnRefreshLb: document.getElementById('btn-refresh-lb'),
      modalPodium: document.getElementById('modal-podium'),
      podiumSubtitle: document.getElementById('podium-subtitle'),
      podiumGoldName: document.getElementById('podium-gold-name'),
      podiumGoldPoints: document.getElementById('podium-gold-points'),
      podiumSilverName: document.getElementById('podium-silver-name'),
      podiumSilverPoints: document.getElementById('podium-silver-points'),
      podiumBronzeName: document.getElementById('podium-bronze-name'),
      podiumBronzePoints: document.getElementById('podium-bronze-points'),
      btnClosePodium: document.getElementById('btn-close-podium'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  function initCanvas() {
    if (window.SkiRenderer && dom.canvas) {
      window.SkiRenderer.init(dom.canvas);
    }
  }

  function initAudio() {
    // Web Audio auto starts on first click
    const unlockAudio = () => {
      if (window.SkiAudio) {
        window.SkiAudio.init();
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
  }

  // Relative Fetch calls (strictly without leading slash for Cloud Run subpath proxy)
  async function fetchInitialData() {
    try {
      // 1. Hills
      const hillsRes = await fetch('api/hills');
      if (hillsRes.ok) {
        hills = await hillsRes.json();
        populateHillsDropdown();
      } else {
        useFallbackHills();
      }

      // 2. Jumpers
      const jumpersRes = await fetch('api/jumpers');
      if (jumpersRes.ok) {
        jumpers = await jumpersRes.json();
        populateJumpersDropdown();
      } else {
        useFallbackJumpers();
      }

      // 3. Initialize default selection
      currentHill = hills[0] || { id: 'zakopane', name: 'Zakopane - Wielka Krokiew', kPoint: 120, hs: 134, inrunAngle: 35 };
      currentJumper = jumpers[0] || { id: 'malysz', name: 'Adam Małysz', country: 'POL', skill: 98 };

      initTournamentState();
      resetToGate();
      fetchLeaderboard(currentHill.id);

      // Start 60fps render/physics loop
      lastTime = performance.now();
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    } catch (err) {
      console.warn('[SkiApp] Fetch initial data error:', err);
      useFallbackHills();
      useFallbackJumpers();
      currentHill = hills[0];
      currentJumper = jumpers[0];
      initTournamentState();
      resetToGate();
    }
  }

  function useFallbackHills() {
    hills = [
      { id: 'zakopane', name: 'Zakopane - Wielka Krokiew', country: 'POL', kPoint: 120, hs: 134, inrunAngle: 35, record: 140.5 },
      { id: 'oberstdorf', name: 'Oberstdorf - Schattenbergschanze', country: 'GER', kPoint: 120, hs: 137, inrunAngle: 35.5, record: 143.5 },
      { id: 'kulm', name: 'Bad Mitterndorf - Kulm (Flying)', country: 'AUT', kPoint: 200, hs: 235, inrunAngle: 36, record: 244.0 },
      { id: 'planica', name: 'Planica - Letalnica', country: 'SLO', kPoint: 200, hs: 240, inrunAngle: 35.1, record: 252.0 }
    ];
    populateHillsDropdown();
  }

  function useFallbackJumpers() {
    jumpers = [
      { id: 'malysz', name: 'Adam Małysz', country: 'POL', skill: 98, mustache: true },
      { id: 'hannawald', name: 'Sven Hannawald', country: 'GER', skill: 96 },
      { id: 'ahonen', name: 'Janne Ahonen', country: 'FIN', skill: 97 },
      { id: 'amman', name: 'Simon Ammann', country: 'SUI', skill: 95 }
    ];
    populateJumpersDropdown();
  }

  function populateHillsDropdown() {
    if (!dom.hillSelect) return;
    dom.hillSelect.innerHTML = '';
    hills.forEach(hill => {
      const opt = document.createElement('option');
      opt.value = hill.id;
      opt.textContent = `${hill.name} (K-${hill.kPoint} / HS-${hill.hs})`;
      dom.hillSelect.appendChild(opt);
    });
  }

  function populateJumpersDropdown() {
    if (!dom.jumperSelect) return;
    dom.jumperSelect.innerHTML = '';
    jumpers.forEach(jumper => {
      const opt = document.createElement('option');
      opt.value = jumper.id;
      opt.textContent = `${jumper.name} (${jumper.country} - Skill: ${jumper.skill})`;
      dom.jumperSelect.appendChild(opt);
    });
  }

  async function fetchLeaderboard(hillId) {
    if (!dom.leaderboardList) return;
    dom.leaderboardList.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 0.5rem; font-size: 0.8rem;">Syncing scores...</div>';

    try {
      const url = hillId ? `api/leaderboard?hillId=${encodeURIComponent(hillId)}` : 'api/leaderboard';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      renderLeaderboard(data);
    } catch (err) {
      console.warn('[SkiApp] fetchLeaderboard error:', err);
      dom.leaderboardList.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 0.5rem; font-size: 0.8rem;">Leaderboard offline</div>';
    }
  }

  function renderLeaderboard(records) {
    if (!dom.leaderboardList) return;
    if (!records || records.length === 0) {
      dom.leaderboardList.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 0.5rem; font-size: 0.8rem;">No jumps recorded yet for this hill.</div>';
      return;
    }

    dom.leaderboardList.innerHTML = '';
    records.slice(0, 8).forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-item';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-weight: 800; color: #94a3b8; width: 16px;">${index + 1}.</span>
          <span style="font-weight: 700; color: #ffffff;">${escapeHtml(item.jumperName)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <span style="color: #facc15; font-family: var(--font-mono); font-size: 0.78rem;">${(item.distance || 0).toFixed(1)}m</span>
          <span style="font-weight: 800; color: #38bdf8; font-family: var(--font-mono);">${(item.totalPoints || 0).toFixed(1)}p</span>
        </div>
      `;
      dom.leaderboardList.appendChild(row);
    });
  }

  async function submitLeaderboardScore(jumperName, hillId, distance, stylePoints, totalPoints) {
    try {
      const payload = {
        jumperName,
        hillId,
        distance,
        stylePoints,
        totalPoints
      };
      const res = await fetch('api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Score registered on FIS hill leaderboard!`, 'success');
        fetchLeaderboard(hillId);
      }
    } catch (err) {
      console.warn('[SkiApp] Submit score error:', err);
    }
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Jump Button (State Machine: GATE -> Start In-run; INRUN -> Takeoff; FLIGHT -> Safe Land)
    if (dom.btnJump) {
      dom.btnJump.addEventListener('click', () => handleJumpAction());
    }

    // Telemark Land Button
    if (dom.btnLandTelemark) {
      dom.btnLandTelemark.addEventListener('click', () => handleTelemarkAction());
    }

    // Reset Button
    if (dom.btnReset) {
      dom.btnReset.addEventListener('click', () => resetToGate());
    }

    // Sound Toggle
    if (dom.btnSoundToggle) {
      dom.btnSoundToggle.addEventListener('click', () => {
        if (window.SkiAudio) {
          const isMuted = window.SkiAudio.toggleMute();
          if (dom.soundIcon) {
            dom.soundIcon.textContent = isMuted ? '🔇' : '🔊';
          }
          dom.btnSoundToggle.innerHTML = `${isMuted ? '🔇 Sound OFF' : '🔊 Sound ON'}`;
          showToast(isMuted ? 'Audio muted' : 'Audio enabled', 'info');
        }
      });
    }

    // Stadium Fan Horn Trumpet
    if (dom.btnFanHorn) {
      dom.btnFanHorn.addEventListener('click', () => {
        if (window.SkiAudio) {
          window.SkiAudio.play('trumpet');
          showToast('🎺 Polska, Biało-Czerwoni!', 'info');
        }
      });
    }

    // Mode Selector
    if (dom.modeSelect) {
      dom.modeSelect.addEventListener('change', (e) => {
        activeMode = e.target.value;
        initTournamentState();
        resetToGate();
        showToast(`Game mode switched to: ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
    }

    // Hill Selector
    if (dom.hillSelect) {
      dom.hillSelect.addEventListener('change', (e) => {
        const found = hills.find(h => h.id === e.target.value);
        if (found) {
          currentHill = found;
          resetToGate();
          fetchLeaderboard(currentHill.id);
          showToast(`Hill changed to ${found.name}`, 'info');
        }
      });
    }

    // Jumper Selector
    if (dom.jumperSelect) {
      dom.jumperSelect.addEventListener('change', (e) => {
        const found = jumpers.find(j => j.id === e.target.value);
        if (found) {
          currentJumper = found;
          resetToGate();
          showToast(`Active jumper: ${found.name}`, 'info');
        }
      });
    }

    // Refresh Leaderboard Button
    if (dom.btnRefreshLb) {
      dom.btnRefreshLb.addEventListener('click', () => {
        if (currentHill) {
          fetchLeaderboard(currentHill.id);
        }
      });
    }

    // Podium Modal Close
    if (dom.btnClosePodium) {
      dom.btnClosePodium.addEventListener('click', () => {
        if (dom.modalPodium) {
          dom.modalPodium.classList.remove('open');
        }
        initTournamentState();
        resetToGate();
      });
    }

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJumpAction();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        handleTelemarkAction();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetToGate();
      } else if (e.code === 'ArrowUp') {
        inputState.pitchUp = true;
      } else if (e.code === 'ArrowDown') {
        inputState.pitchDown = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowUp') {
        inputState.pitchUp = false;
      } else if (e.code === 'ArrowDown') {
        inputState.pitchDown = false;
      }
    });

    // Canvas click triggers action
    if (dom.canvas) {
      dom.canvas.addEventListener('click', () => {
        handleJumpAction();
      });
    }
  }

  // Jump Action State Machine
  function handleJumpAction() {
    if (!window.SkiPhysics) return;
    const physState = window.SkiPhysics.getState();

    if (physState.state === 'GATE') {
      // 1. Release gate down inrun
      window.SkiPhysics.startInrun();
      jumpPhase = 'INRUN';
      if (window.SkiAudio) {
        window.SkiAudio.play('gate');
        window.SkiAudio.play('inrun');
      }
      updateActionControlsUI();

    } else if (physState.state === 'INRUN') {
      // 2. Takeoff timing!
      const takeoffRes = window.SkiPhysics.triggerTakeoff();
      jumpPhase = 'FLIGHT';
      if (window.SkiAudio) {
        window.SkiAudio.play('takeoff');
        window.SkiAudio.play('wind');
      }
      if (takeoffRes && takeoffRes.precision > 0.88) {
        showToast('🎯 Perfect Takeoff Timing!', 'success');
      }
      updateActionControlsUI();

    } else if (physState.state === 'FLIGHT') {
      // 3. Normal Two-Feet Landing
      executeLanding(false);

    } else if (physState.state === 'STOPPED' || physState.state === 'FALL') {
      // Reset for next jump
      advanceTournamentOrNextJump();
    }
  }

  function handleTelemarkAction() {
    if (!window.SkiPhysics) return;
    const physState = window.SkiPhysics.getState();
    if (physState.state === 'FLIGHT') {
      executeLanding(true);
    }
  }

  function executeLanding(telemark) {
    if (!window.SkiPhysics) return;
    const landRes = window.SkiPhysics.triggerLanding(telemark);
    if (!landRes) return;

    if (landRes.crashed) {
      if (window.SkiAudio) window.SkiAudio.play('crash');
      showToast('💥 Crash Landing!', 'error');
    } else {
      if (landRes.telemark) {
        if (window.SkiAudio) {
          window.SkiAudio.play('telemark');
          window.SkiAudio.play('cheer');
        }
        showToast('✨ Elegant Telemark Landing! (+Judges Style Bonus)', 'success');
      } else {
        if (window.SkiAudio) {
          window.SkiAudio.play('cheer');
        }
        showToast('Clean Two-Feet Landing!', 'info');
      }
    }
    updateActionControlsUI();
  }

  function resetToGate() {
    if (!window.SkiPhysics || !currentHill) return;

    postJumpHandled = false;
    jumpPhase = 'GATE';

    // Randomize dynamic wind for this jump round
    randomizeWind();

    // Prepare physics
    window.SkiPhysics.initJump(currentHill, currentJumper);

    // Reset camera
    if (window.SkiRenderer) {
      window.SkiRenderer.resetCamera();
    }

    updateActionControlsUI();
    renderJudgesScorecard(null);
    updateTelemetryHUD({ distanceMeters: 0, speedKmH: 0, totalPoints: 0, stylePoints: 0 });

    if (dom.jumpStatusBadge) {
      dom.jumpStatusBadge.textContent = 'READY AT GATE';
      dom.jumpStatusBadge.style.color = '#38bdf8';
    }
    if (dom.flightGuidance) {
      dom.flightGuidance.textContent = `[${currentJumper ? currentJumper.name : 'Jumper'}] PRESS [START / SPACE] TO DROP`;
    }
  }

  function randomizeWind() {
    // DSJ realistic wind between -3.5m/s (tailwind) and +4.0m/s (headwind)
    const wx = Math.round((Math.random() * 6.5 - 2.5) * 10) / 10;
    const wy = Math.round((Math.random() * 1.6 - 0.8) * 10) / 10;
    currentWind.x = wx;
    currentWind.y = wy;
    currentWind.speed = Math.round(Math.sqrt(wx * wx + wy * wy) * 10) / 10;

    // Angle in degrees for compass needle
    currentWind.angleDeg = Math.round((Math.atan2(wy, wx) * 180 / Math.PI));

    // Update UI
    if (dom.windSpeed) {
      const sign = wx >= 0 ? '+' : '';
      dom.windSpeed.textContent = `${sign}${wx.toFixed(1)} m/s`;
      dom.windSpeed.style.color = wx >= 0 ? '#34d399' : '#f87171';
    }
    if (dom.windArrow) {
      dom.windArrow.style.transform = `rotate(${currentWind.angleDeg - 90}deg)`;
    }
  }

  function updateActionControlsUI() {
    if (!window.SkiPhysics) return;
    const physState = window.SkiPhysics.getState();

    if (physState.state === 'GATE') {
      if (dom.btnJump) {
        dom.btnJump.innerHTML = '🚀 <span>START IN-RUN</span>';
        dom.btnJump.disabled = false;
      }
      if (dom.btnLandTelemark) dom.btnLandTelemark.disabled = true;
      if (dom.flightGuidance) dom.flightGuidance.textContent = 'PRESS [START / SPACE] TO BEGIN IN-RUN';

    } else if (physState.state === 'INRUN') {
      if (dom.btnJump) {
        dom.btnJump.innerHTML = '⚡ <span>JUMP / TAKEOFF</span>';
        dom.btnJump.disabled = false;
      }
      if (dom.btnLandTelemark) dom.btnLandTelemark.disabled = true;
      if (dom.flightGuidance) dom.flightGuidance.textContent = 'TIMING! JUMP AT THE EDGE OF THE TAKEOFF TABLE!';

    } else if (physState.state === 'FLIGHT') {
      if (dom.btnJump) {
        dom.btnJump.innerHTML = '👟 <span>SAFE LAND</span>';
        dom.btnJump.disabled = false;
      }
      if (dom.btnLandTelemark) dom.btnLandTelemark.disabled = false;
      if (dom.flightGuidance) dom.flightGuidance.textContent = 'PRESS [T] FOR TELEMARK OR [SPACE] FOR SAFE LANDING';

    } else if (physState.state === 'LANDING' || physState.state === 'FALL' || physState.state === 'STOPPED') {
      if (dom.btnJump) {
        dom.btnJump.innerHTML = '🔄 <span>NEXT JUMP</span>';
        dom.btnJump.disabled = false;
      }
      if (dom.btnLandTelemark) dom.btnLandTelemark.disabled = true;
      if (dom.flightGuidance) dom.flightGuidance.textContent = 'JUMP COMPLETED. PRESS NEXT JUMP TO PROCEED';
    }
  }

  function updateTelemetryHUD(physState) {
    if (dom.speedDisplay) {
      dom.speedDisplay.textContent = `${(physState.speedKmH || 0).toFixed(1)} km/h`;
    }
    if (dom.distanceDisplay) {
      dom.distanceDisplay.textContent = `${(physState.distanceMeters || 0).toFixed(1)} m`;
    }
    if (dom.stylePointsVal) {
      dom.stylePointsVal.textContent = (physState.stylePoints || 0).toFixed(1);
    }
    if (dom.totalPointsVal) {
      dom.totalPointsVal.textContent = (physState.totalPoints || 0).toFixed(1);
    }
    if (dom.jumpStatusBadge) {
      dom.jumpStatusBadge.textContent = physState.state;
      if (physState.state === 'FALL') {
        dom.jumpStatusBadge.style.color = '#ef4444';
      } else if (physState.telemarkSuccess) {
        dom.jumpStatusBadge.style.color = '#10b981';
      } else {
        dom.jumpStatusBadge.style.color = '#38bdf8';
      }
    }
  }

  function renderJudgesScorecard(physState) {
    const scores = (physState && physState.styleJudges) ? physState.styleJudges : ['--.-', '--.-', '--.-', '--.-', '--.-'];
    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`j-score-${i}`);
      if (el) {
        el.textContent = typeof scores[i] === 'number' ? scores[i].toFixed(1) : scores[i];
      }
    }
  }

  // Tournament and Hotseat State Machine
  function initTournamentState() {
    tournamentState.currentRoundIndex = 0;
    tournamentState.currentJumperIndex = 0;
    tournamentState.isCompleted = false;

    if (activeMode === 'practice') {
      tournamentState.standings = [
        { jumper: currentJumper, totalPoints: 0, roundScores: [] }
      ];
      tournamentState.totalRounds = 1;
    } else if (activeMode === 'hotseat') {
      // 2 players hotseat
      const p1 = jumpers[0] || { name: 'Player 1', country: 'POL', skill: 95 };
      const p2 = jumpers[1] || { name: 'Player 2', country: 'GER', skill: 95 };
      tournamentState.standings = [
        { jumper: p1, totalPoints: 0, roundScores: [] },
        { jumper: p2, totalPoints: 0, roundScores: [] }
      ];
      tournamentState.totalRounds = 2;
    } else {
      // 'cup': 4-Hills Tournament (Małysz, Hannawald, Ahonen, Ammann, etc.)
      tournamentState.totalRounds = 4;
      tournamentState.standings = jumpers.map(j => ({
        jumper: j,
        totalPoints: 0,
        roundScores: []
      }));
    }

    renderTournamentStandings();
  }

  function renderTournamentStandings() {
    if (!dom.tournamentStandings) return;

    if (dom.tournamentRoundInfo) {
      dom.tournamentRoundInfo.textContent = `Round ${tournamentState.currentRoundIndex + 1} / ${tournamentState.totalRounds}`;
    }

    // Sort standings by totalPoints descending
    const sorted = [...tournamentState.standings].sort((a, b) => b.totalPoints - a.totalPoints);

    dom.tournamentStandings.innerHTML = '';
    sorted.forEach((item, index) => {
      const isCurrent = (item.jumper.id === currentJumper.id);
      const row = document.createElement('div');
      row.className = `standing-row ${isCurrent ? 'active' : ''}`;
      row.innerHTML = `
        <span class="standing-rank">${index + 1}.</span>
        <span class="standing-name">${escapeHtml(item.jumper.name)} (${item.jumper.country || 'FIS'})</span>
        <span class="standing-points">${item.totalPoints.toFixed(1)} pts</span>
      `;
      dom.tournamentStandings.appendChild(row);
    });
  }

  function handlePostJumpFinalization(physState) {
    if (postJumpHandled) return;
    postJumpHandled = true;

    // Check hill record beat!
    if (currentHill && physState.distanceMeters > (currentHill.record || 0)) {
      if (window.SkiAudio) {
        window.SkiAudio.play('record');
      }
      showToast(`🎉 NEW HILL RECORD! ${physState.distanceMeters.toFixed(1)}m!`, 'success');
      currentHill.record = physState.distanceMeters;
      currentHill.recordHolder = currentJumper ? currentJumper.name : 'Unknown';
    }

    // Save to in-memory / backend leaderboard
    if (currentJumper && currentHill) {
      submitLeaderboardScore(
        currentJumper.name,
        currentHill.id,
        physState.distanceMeters,
        physState.stylePoints,
        physState.totalPoints
      );
    }

    // Record score in tournament standings
    const currentEntry = tournamentState.standings.find(s => s.jumper.id === currentJumper.id);
    if (currentEntry) {
      currentEntry.roundScores.push(physState.totalPoints);
      currentEntry.totalPoints = Math.round((currentEntry.totalPoints + physState.totalPoints) * 10) / 10;
    }

    renderTournamentStandings();
    renderJudgesScorecard(physState);
  }

  function advanceTournamentOrNextJump() {
    if (activeMode === 'practice') {
      resetToGate();
      return;
    }

    // Advance to next competitor or round
    tournamentState.currentJumperIndex++;

    if (tournamentState.currentJumperIndex >= tournamentState.standings.length) {
      // Completed round
      tournamentState.currentJumperIndex = 0;
      tournamentState.currentRoundIndex++;

      // Change hill for tournament flavor if more than 1 hill available
      if (tournamentState.currentRoundIndex < tournamentState.totalRounds) {
        const nextHillIdx = tournamentState.currentRoundIndex % hills.length;
        currentHill = hills[nextHillIdx];
        if (dom.hillSelect) {
          dom.hillSelect.value = currentHill.id;
        }
        showToast(`Moving to Round ${tournamentState.currentRoundIndex + 1} at ${currentHill.name}!`, 'info');
      }
    }

    if (tournamentState.currentRoundIndex >= tournamentState.totalRounds) {
      // Tournament Finished! Show Podium Ceremony!
      triggerPodiumCeremony();
      return;
    }

    // Set next active jumper
    const nextStanding = tournamentState.standings[tournamentState.currentJumperIndex];
    currentJumper = nextStanding.jumper;
    if (dom.jumperSelect) {
      dom.jumperSelect.value = currentJumper.id;
    }

    showToast(`Next up on gate: ${currentJumper.name}!`, 'info');
    resetToGate();
  }

  function triggerPodiumCeremony() {
    if (window.SkiAudio) {
      window.SkiAudio.play('trumpet');
    }

    const sorted = [...tournamentState.standings].sort((a, b) => b.totalPoints - a.totalPoints);
    const p1 = sorted[0] || { jumper: { name: 'Adam Małysz' }, totalPoints: 0 };
    const p2 = sorted[1] || { jumper: { name: 'Sven Hannawald' }, totalPoints: 0 };
    const p3 = sorted[2] || { jumper: { name: 'Janne Ahonen' }, totalPoints: 0 };

    if (dom.podiumSubtitle) {
      dom.podiumSubtitle.textContent = `${activeMode === 'hotseat' ? 'Hotseat Duel' : '4-Hills Grand Prix'} Final Standings`;
    }
    if (dom.podiumGoldName) dom.podiumGoldName.textContent = p1.jumper.name;
    if (dom.podiumGoldPoints) dom.podiumGoldPoints.textContent = `${p1.totalPoints.toFixed(1)} pts`;

    if (dom.podiumSilverName) dom.podiumSilverName.textContent = p2.jumper.name;
    if (dom.podiumSilverPoints) dom.podiumSilverPoints.textContent = `${p2.totalPoints.toFixed(1)} pts`;

    if (dom.podiumBronzeName) dom.podiumBronzeName.textContent = p3.jumper.name;
    if (dom.podiumBronzePoints) dom.podiumBronzePoints.textContent = `${p3.totalPoints.toFixed(1)} pts`;

    if (dom.modalPodium) {
      dom.modalPodium.classList.add('open');
    }
  }

  // Main 60 FPS Game Loop
  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (window.SkiPhysics) {
      const physState = window.SkiPhysics.update(dt, inputState, currentWind);

      // Render 2D Canvas Scene
      if (window.SkiRenderer) {
        window.SkiRenderer.render(physState, currentHill, currentWind);
      }

      // Live Telemetry HUD updates
      updateTelemetryHUD(physState);

      // Check jump termination
      if ((physState.state === 'STOPPED' || physState.state === 'FALL') && !postJumpHandled) {
        handlePostJumpFinalization(physState);
        updateActionControlsUI();
      }
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // Toast Notification Helper
  function showToast(message, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'success') toast.style.borderColor = '#10b981';
    if (type === 'error') toast.style.borderColor = '#ef4444';
    toast.textContent = message;

    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
