/**
 * app.js - Main Application Coordinator for SkiJump2 (Sprint 1.0)
 * Integrates SkiHills, SkiPhysics, SkiRenderer, TournamentEngine, and SkiAudio.
 * Manages HUD reactive updates, keyboard & mouse controls, jumper customizer,
 * 5-judge scoring cards, and REST API communication via relative paths.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentHillId: 'zakopane',
    gameMode: 'TRAINING', // 'TRAINING' | 'WORLD_CUP'
    jumper: {
      name: 'Adam Małysz',
      country: 'POL',
      suitColor: '#d63031',
      helmetColor: '#ffffff',
      hasMustache: true
    },
    currentWind: { speed: 1.8, angle: 15 }, // positive headwind
    lastJumpSummary: null,
    isScoresModalOpen: false
  };

  // DOM Elements Cache
  let dom = {};

  function initDomElements() {
    dom = {
      canvas: document.getElementById('gameCanvas'),
      hillSelect: document.getElementById('hillSelect'),
      modeSelect: document.getElementById('modeSelect'),
      customizerBtn: document.getElementById('customizerBtn'),
      standingsBtn: document.getElementById('standingsBtn'),
      soundToggleBtn: document.getElementById('soundToggleBtn'),
      
      // HUD readouts
      hillNameDisplay: document.getElementById('hillNameDisplay'),
      hillHsDisplay: document.getElementById('hillHsDisplay'),
      hillRecordDisplay: document.getElementById('hillRecordDisplay'),
      windVane: document.getElementById('windVane'),
      windArrow: document.getElementById('windArrow'),
      windSpeed: document.getElementById('windSpeed'),
      windAngle: document.getElementById('windAngle'),
      speedMeter: document.getElementById('speedMeter'),
      distanceMeter: document.getElementById('distanceMeter'),
      jumpPhase: document.getElementById('jumpPhase'),
      actionPrompter: document.getElementById('actionPrompter'),

      // Judge Scores Modal
      judgeScoresPanel: document.getElementById('judgeScoresPanel'),
      closeScoresBtn: document.getElementById('closeScoresBtn'),
      summaryDistance: document.getElementById('summaryDistance'),
      summaryDistancePoints: document.getElementById('summaryDistancePoints'),
      summaryLandingType: document.getElementById('summaryLandingType'),
      summaryStylePoints: document.getElementById('summaryStylePoints'),
      summaryWindComp: document.getElementById('summaryWindComp'),
      totalPointsDisplay: document.getElementById('totalPointsDisplay'),
      judgesList: document.getElementById('judgesList'),
      nextJumpBtn: document.getElementById('nextJumpBtn'),
      submitScoreBtn: document.getElementById('submitScoreBtn'),

      // Customizer Modal
      customizerPanel: document.getElementById('customizerPanel'),
      closeCustomizerBtn: document.getElementById('closeCustomizerBtn'),
      saveCustomizerBtn: document.getElementById('saveCustomizerBtn'),
      playerNameInput: document.getElementById('playerNameInput'),
      suitColorSelect: document.getElementById('suitColorSelect'),
      helmetColorSelect: document.getElementById('helmetColorSelect'),
      mustacheToggle: document.getElementById('mustacheToggle'),
      avatarHelmet: document.getElementById('avatarHelmet'),
      avatarMustache: document.getElementById('avatarMustache'),
      avatarSuit: document.getElementById('avatarSuit'),

      // Tournament Modal
      tournamentModal: document.getElementById('tournamentModal'),
      tournamentTitle: document.getElementById('tournamentTitle'),
      tournamentRoundStatus: document.getElementById('tournamentRoundStatus'),
      standingsTableBody: document.getElementById('standingsTableBody'),
      closeTournamentBtn: document.getElementById('closeTournamentBtn'),
      restartTournamentBtn: document.getElementById('restartTournamentBtn'),
      resumeTournamentBtn: document.getElementById('resumeTournamentBtn')
    };
  }

  /**
   * Generates authentic outdoor wind for ski jumping
   */
  function generateRandomWind() {
    // Speed: 0.2 to 4.2 m/s
    const speed = Math.round((Math.random() * 3.8 + 0.4) * 10) / 10;
    // Angle: mostly favorable headwind / slight crosswind (330 to 30 deg or 150 to 210 deg)
    const baseAngle = Math.random() > 0.3 ? 0 : 180;
    const angleOffset = Math.round((Math.random() - 0.5) * 60);
    const angle = (baseAngle + angleOffset + 360) % 360;

    return { speed, angle };
  }

  /**
   * Initializes or resets jump sequence on current hill
   */
  function setupNewJump() {
    state.currentWind = generateRandomWind();
    const hill = window.SkiHills ? window.SkiHills.getHill(state.currentHillId) : null;
    
    if (hill && window.SkiPhysics) {
      window.SkiPhysics.initJump(hill, state.currentWind);
    }
    if (hill && window.SkiRenderer) {
      window.SkiRenderer.setHill(hill);
      window.SkiRenderer.setSkierConfig({
        suitColor: state.jumper.suitColor,
        helmetColor: state.jumper.helmetColor,
        hasMustache: state.jumper.hasMustache
      });
    }

    if (window.SkiAudio && window.SkiAudio.playGateBeep) {
      window.SkiAudio.playGateBeep();
    }

    updateHillHeader(hill);
    updateWindHUD(state.currentWind);
    closeJudgeScores();
  }

  function updateHillHeader(hill) {
    if (!hill) return;
    if (dom.hillNameDisplay) dom.hillNameDisplay.textContent = hill.name;
    if (dom.hillHsDisplay) dom.hillHsDisplay.textContent = `${hill.hsPoint}.0m`;
    if (dom.hillRecordDisplay) {
      dom.hillRecordDisplay.textContent = `${hill.record.distance}m (${hill.record.holder})`;
    }
    if (dom.hillSelect && dom.hillSelect.value !== hill.id) {
      dom.hillSelect.value = hill.id;
    }
  }

  function updateWindHUD(wind) {
    if (dom.windSpeed) dom.windSpeed.textContent = `${wind.speed.toFixed(1)} m/s`;
    if (dom.windArrow) {
      // Rotate needle according to wind direction
      dom.windArrow.style.transform = `rotate(${wind.angle}deg)`;
    }
    if (dom.windAngle) {
      let desc = 'Czołowy';
      if (wind.angle > 60 && wind.angle < 120) desc = 'Boczny Prawy';
      else if (wind.angle >= 120 && wind.angle <= 240) desc = 'Tylny';
      else if (wind.angle > 240 && wind.angle < 300) desc = 'Boczny Lewy';
      dom.windAngle.textContent = `${Math.round(wind.angle)}° (${desc})`;
    }
  }

  /**
   * HUD real-time refresh synchronized with render loop
   */
  function updateHUD() {
    if (!window.SkiPhysics) return;
    const phys = window.SkiPhysics.getJumpState();

    // Speedometer
    if (dom.speedMeter) {
      dom.speedMeter.textContent = `${phys.speed.toFixed(1)} km/h`;
    }

    // Distance meter
    if (dom.distanceMeter) {
      if (phys.phase === 'FLIGHT' || phys.phase === 'LANDED' || phys.phase === 'CRASHED' || phys.phase === 'STOPPED') {
        dom.distanceMeter.textContent = `${phys.distance.toFixed(1)} m`;
      } else {
        dom.distanceMeter.textContent = '0.0 m';
      }
    }

    // Phase badge and contextual prompter
    if (dom.jumpPhase) {
      dom.jumpPhase.className = 'hud-status-badge';
      let phaseText = '';
      let prompterText = '';

      switch (phys.phase) {
        case 'GATE':
          dom.jumpPhase.classList.add('phase-gate');
          phaseText = 'BELKA STARTOWA';
          prompterText = '<span class="prompter-blink">[SPACJA / L-KLIK]</span> NAJAZD';
          break;
        case 'IN_RUN':
          dom.jumpPhase.classList.add('phase-inrun');
          phaseText = 'NAJAZD';
          prompterText = '<span class="prompter-blink">[SPACJA / L-KLIK]</span> WYBICIE NA PROGU!';
          break;
        case 'TAKEOFF':
        case 'FLIGHT':
          dom.jumpPhase.classList.add('phase-flight');
          phaseText = 'LOT';
          prompterText = '<kbd>SPACJA</kbd> TELEMARK &bull; <kbd>P-KLIK / L</kbd> OBIE NOGI &bull; <kbd>▲▼</kbd> PITCH';
          break;
        case 'LANDED':
          dom.jumpPhase.classList.add('phase-landed');
          phaseText = phys.landingType === 'telemark' ? 'LĄDOWANIE (TELEMARK)' : 'LĄDOWANIE (OBIE NOGI)';
          prompterText = 'LĄDOWANIE ZALICZONE!';
          break;
        case 'CRASHED':
          dom.jumpPhase.classList.add('phase-crashed');
          phaseText = 'UPADEK!';
          prompterText = 'UPADEK NA ZESKOKU!';
          break;
        case 'STOPPED':
          dom.jumpPhase.classList.add('phase-landed');
          phaseText = 'STOP';
          prompterText = '[SPACJA] KOLEJNY SKOK';
          break;
      }
      dom.jumpPhase.textContent = phaseText;
      if (dom.actionPrompter) dom.actionPrompter.innerHTML = prompterText;
    }

    requestAnimationFrame(updateHUD);
  }

  /**
   * Handle jump completion, calculate FIS judge scores, and show modal
   */
  function handleJumpCompleted(physState) {
    const hill = window.SkiHills.getHill(state.currentHillId);
    if (!hill) return;

    // Determine landing quality string for FIS scoring
    let landingQuality = 'TELEMARK';
    if (physState.phase === 'CRASHED' || physState.landingType === 'crash') {
      landingQuality = 'CRASH';
    } else if (physState.landingType === 'two-foot') {
      landingQuality = 'TWO_FOOT';
    }

    // Use TournamentEngine judge calculations if available
    let judgeResult = null;
    let pointResult = null;

    if (window.SkiTournament && window.SkiTournament.calculateJudgeScores) {
      judgeResult = window.SkiTournament.calculateJudgeScores(null, landingQuality);
      // Wind compensation calculation (approximate: headwind gives minus points, tailwind plus)
      const windComp = Number((state.currentWind.speed * (state.currentWind.angle < 90 || state.currentWind.angle > 270 ? -1.5 : 1.5)).toFixed(1));
      pointResult = window.SkiTournament.calculateJumpPoints(physState.distance, hill, judgeResult.styleScore, windComp);
    } else {
      // Fallback
      judgeResult = {
        allScores: [18.5, 18.0, 18.5, 19.0, 18.5],
        countedScores: [18.5, 18.5, 18.5],
        droppedScores: [18.0, 19.0],
        styleScore: 55.5
      };
      pointResult = {
        distancePoints: 60 + (physState.distance - hill.kPoint) * 1.8,
        stylePoints: 55.5,
        windPoints: 0,
        totalPoints: 115.5
      };
    }

    const summary = {
      hill: hill,
      distance: physState.distance,
      landingType: physState.landingType || (physState.phase === 'CRASHED' ? 'crash' : 'two-foot'),
      judgeResult: judgeResult,
      pointResult: pointResult,
      playerName: state.jumper.name,
      country: state.jumper.country
    };

    state.lastJumpSummary = summary;

    // In Tournament mode, record jump in TournamentEngine
    if (state.gameMode === 'WORLD_CUP' && window.SkiTournament) {
      window.SkiTournament.processJumpResult({
        distance: summary.distance,
        styleScore: judgeResult.styleScore,
        totalPoints: pointResult.totalPoints,
        landingQuality: landingQuality,
        judgeScores: judgeResult.allScores
      });
    }

    // Display Judge Score Panel with a short authentic broadcast delay
    setTimeout(() => {
      displayJudgeScores(summary);
    }, 700);
  }

  function displayJudgeScores(summary) {
    if (!dom.judgeScoresPanel) return;

    if (dom.summaryDistance) dom.summaryDistance.textContent = `${summary.distance.toFixed(1)} m`;
    if (dom.summaryDistancePoints) dom.summaryDistancePoints.textContent = `${summary.pointResult.distancePoints.toFixed(1)} pkt`;
    
    if (dom.summaryLandingType) {
      if (summary.landingType === 'telemark') {
        dom.summaryLandingType.textContent = 'TELEMARK ✨';
        dom.summaryLandingType.style.color = 'var(--neon-green)';
      } else if (summary.landingType === 'two-foot') {
        dom.summaryLandingType.textContent = 'OBIE NOGI';
        dom.summaryLandingType.style.color = '#fff';
      } else {
        dom.summaryLandingType.textContent = 'UPADEK (CRASH)';
        dom.summaryLandingType.style.color = 'var(--polish-red)';
      }
    }

    if (dom.summaryStylePoints) dom.summaryStylePoints.textContent = `Styl: ${summary.judgeResult.styleScore.toFixed(1)} pkt`;
    if (dom.totalPointsDisplay) dom.totalPointsDisplay.textContent = `${summary.pointResult.totalPoints.toFixed(1)} pkt`;
    if (dom.summaryWindComp) {
      const wSign = summary.pointResult.windPoints >= 0 ? '+' : '';
      dom.summaryWindComp.textContent = `Komp. wiatru: ${wSign}${summary.pointResult.windPoints.toFixed(1)} pkt`;
    }

    // Render 5 Judge cards
    if (dom.judgesList && summary.judgeResult) {
      dom.judgesList.innerHTML = '';
      const countries = ['POL', 'GER', 'AUT', 'FIN', 'NOR'];
      const allScores = summary.judgeResult.allScores;

      // Identify lowest and highest for visual drop indicator
      const minScore = Math.min(...allScores);
      const maxScore = Math.max(...allScores);
      let droppedMin = false;
      let droppedMax = false;

      allScores.forEach((score, idx) => {
        const card = document.createElement('div');
        card.className = 'judge-card';

        let isDropped = false;
        if (!droppedMin && score === minScore) {
          isDropped = true;
          droppedMin = true;
        } else if (!droppedMax && score === maxScore) {
          isDropped = true;
          droppedMax = true;
        }

        if (isDropped) {
          card.classList.add('dropped');
        }

        card.innerHTML = `
          <span class="judge-country">${countries[idx]}</span>
          <span class="judge-mark">${score.toFixed(1)}</span>
        `;
        dom.judgesList.appendChild(card);
      });
    }

    dom.judgeScoresPanel.classList.remove('hidden');
    state.isScoresModalOpen = true;
  }

  function closeJudgeScores() {
    if (dom.judgeScoresPanel) {
      dom.judgeScoresPanel.classList.add('hidden');
    }
    state.isScoresModalOpen = false;
  }

  /**
   * Submit jump result to backend leaderboard via relative API path
   */
  async function submitCurrentScore() {
    if (!state.lastJumpSummary) return;
    const s = state.lastJumpSummary;

    if (dom.submitScoreBtn) {
      dom.submitScoreBtn.disabled = true;
      dom.submitScoreBtn.textContent = 'ZAPISYWANIE...';
    }

    try {
      const payload = {
        playerName: s.playerName,
        country: s.country,
        hillId: s.hill.id,
        distance: s.distance,
        styleScore: s.judgeResult.styleScore,
        totalPoints: s.pointResult.totalPoints
      };

      if (window.SkiTournament && window.SkiTournament.submitScoreToLeaderboard) {
        await window.SkiTournament.submitScoreToLeaderboard(payload);
      } else {
        await fetch('api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (dom.submitScoreBtn) {
        dom.submitScoreBtn.textContent = 'ZAPISANO W TABELI!';
        setTimeout(() => {
          if (dom.submitScoreBtn) dom.submitScoreBtn.textContent = 'ZAPISZ REKORD DO TABELI';
          if (dom.submitScoreBtn) dom.submitScoreBtn.disabled = false;
        }, 2000);
      }
    } catch (e) {
      console.error('[app.js] Error saving score:', e);
      if (dom.submitScoreBtn) {
        dom.submitScoreBtn.textContent = 'BŁĄD ZAPISU';
        dom.submitScoreBtn.disabled = false;
      }
    }
  }

  /**
   * Render Leaderboard Table inside modal
   */
  async function openTournamentModal() {
    if (!dom.tournamentModal) return;

    if (state.gameMode === 'WORLD_CUP' && window.SkiTournament) {
      // Show World Cup tournament standings
      const tourneyState = window.SkiTournament.getState();
      if (dom.tournamentTitle) dom.tournamentTitle.textContent = 'PUCHAR ŚWIATA - KLASYFIKACJA';
      if (dom.tournamentRoundStatus && tourneyState) {
        dom.tournamentRoundStatus.textContent = `Skocznia ${tourneyState.hillNumber} z ${tourneyState.totalHills} (${tourneyState.currentHill.name}) • Seria ${tourneyState.currentRound}`;
      }

      const standings = window.SkiTournament.getStandings();
      renderStandingsRows(standings.map((s, idx) => ({
        rank: idx + 1,
        name: s.participant.name,
        country: s.participant.country,
        distance: s.hillScores[state.currentHillId]?.rounds?.round1?.distance || '-',
        score: s.totalTournamentPoints.toFixed(1),
        cupPoints: s.worldCupPoints || 0,
        isHuman: s.participant.isHuman
      })));

    } else {
      // Training mode: fetch top leaderboard for current hill
      if (dom.tournamentTitle) dom.tournamentTitle.textContent = `REKORDY SKOCZNI - ${state.currentHillId.toUpperCase()}`;
      if (dom.tournamentRoundStatus) dom.tournamentRoundStatus.textContent = 'Top 20 Najlepszych Wyników';

      let scores = [];
      try {
        if (window.SkiTournament && window.SkiTournament.fetchLeaderboard) {
          scores = await window.SkiTournament.fetchLeaderboard(state.currentHillId);
        } else {
          const res = await fetch(`api/leaderboard?hillId=${state.currentHillId}`);
          scores = await res.json();
        }
      } catch (err) {
        console.warn('[app.js] Failed to fetch leaderboard:', err);
      }

      renderStandingsRows((scores || []).map((s, idx) => ({
        rank: idx + 1,
        name: s.playerName,
        country: s.country,
        distance: `${s.distance} m`,
        score: `${s.totalPoints} pkt`,
        cupPoints: '-',
        isHuman: s.playerName === state.jumper.name
      })));
    }

    dom.tournamentModal.classList.remove('hidden');
  }

  function renderStandingsRows(rows) {
    if (!dom.standingsTableBody) return;
    dom.standingsTableBody.innerHTML = '';

    if (!rows || rows.length === 0) {
      dom.standingsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 18px;">Brak wpisów w tabeli</td></tr>`;
      return;
    }

    rows.forEach(r => {
      const tr = document.createElement('tr');
      if (r.isHuman) tr.classList.add('human-player-row');
      tr.innerHTML = `
        <td>${r.rank}</td>
        <td>${r.name} ${r.isHuman ? '⭐' : ''}</td>
        <td>${r.country}</td>
        <td>${r.distance}</td>
        <td>${r.score}</td>
        <td><b>${r.cupPoints}</b></td>
      `;
      dom.standingsTableBody.appendChild(tr);
    });
  }

  function closeTournamentModal() {
    if (dom.tournamentModal) dom.tournamentModal.classList.add('hidden');
  }

  /**
   * Jumper Customizer bindings & preview
   */
  function openCustomizerModal() {
    if (!dom.customizerPanel) return;
    if (dom.playerNameInput) dom.playerNameInput.value = state.jumper.name;
    if (dom.suitColorSelect) dom.suitColorSelect.value = state.jumper.suitColor;
    if (dom.helmetColorSelect) dom.helmetColorSelect.value = state.jumper.helmetColor;
    if (dom.mustacheToggle) dom.mustacheToggle.checked = state.jumper.hasMustache;
    updateCustomizerPreview();
    dom.customizerPanel.classList.remove('hidden');
  }

  function closeCustomizerModal() {
    if (dom.customizerPanel) dom.customizerPanel.classList.add('hidden');
  }

  function updateCustomizerPreview() {
    const suit = dom.suitColorSelect ? dom.suitColorSelect.value : state.jumper.suitColor;
    const helmet = dom.helmetColorSelect ? dom.helmetColorSelect.value : state.jumper.helmetColor;
    const mustache = dom.mustacheToggle ? dom.mustacheToggle.checked : state.jumper.hasMustache;

    if (dom.avatarSuit) dom.avatarSuit.style.backgroundColor = suit;
    if (dom.avatarHelmet) dom.avatarHelmet.style.backgroundColor = helmet;
    if (dom.avatarMustache) dom.avatarMustache.style.display = mustache ? 'block' : 'none';
  }

  function saveCustomizer() {
    if (dom.playerNameInput) state.jumper.name = dom.playerNameInput.value.trim() || 'Gracz';
    if (dom.suitColorSelect) state.jumper.suitColor = dom.suitColorSelect.value;
    if (dom.helmetColorSelect) state.jumper.helmetColor = dom.helmetColorSelect.value;
    if (dom.mustacheToggle) state.jumper.hasMustache = dom.mustacheToggle.checked;

    if (window.SkiRenderer) {
      window.SkiRenderer.setSkierConfig({
        suitColor: state.jumper.suitColor,
        helmetColor: state.jumper.helmetColor,
        hasMustache: state.jumper.hasMustache
      });
    }

    closeCustomizerModal();
  }

  /**
   * Bind DOM Events & Keyboard Listeners
   */
  function bindDomEvents() {
    // Hill Selector
    if (dom.hillSelect) {
      dom.hillSelect.addEventListener('change', (e) => {
        state.currentHillId = e.target.value;
        setupNewJump();
      });
    }

    // Mode Selector
    if (dom.modeSelect) {
      dom.modeSelect.addEventListener('change', (e) => {
        state.gameMode = e.target.value;
        if (state.gameMode === 'WORLD_CUP' && window.SkiTournament) {
          window.SkiTournament.startTournament(['zakopane', 'wisla', 'planica'], state.jumper);
        }
        setupNewJump();
      });
    }

    // Sound Toggle
    if (dom.soundToggleBtn) {
      dom.soundToggleBtn.addEventListener('click', () => {
        if (window.SkiAudio) {
          const isMuted = window.SkiAudio.toggleMute();
          dom.soundToggleBtn.textContent = isMuted ? '🔇 WYCISZONY' : '🔊 DŹWIĘK';
        }
      });
    }

    // Standings / Leaderboard modal
    if (dom.standingsBtn) dom.standingsBtn.addEventListener('click', openTournamentModal);
    if (dom.closeTournamentBtn) dom.closeTournamentBtn.addEventListener('click', closeTournamentModal);
    if (dom.resumeTournamentBtn) dom.resumeTournamentBtn.addEventListener('click', closeTournamentModal);
    if (dom.restartTournamentBtn) {
      dom.restartTournamentBtn.addEventListener('click', () => {
        if (window.SkiTournament) {
          window.SkiTournament.startTournament(['zakopane', 'wisla', 'planica'], state.jumper);
        }
        openTournamentModal();
      });
    }

    // Customizer Modal
    if (dom.customizerBtn) dom.customizerBtn.addEventListener('click', openCustomizerModal);
    if (dom.closeCustomizerBtn) dom.closeCustomizerBtn.addEventListener('click', closeCustomizerModal);
    if (dom.saveCustomizerBtn) dom.saveCustomizerBtn.addEventListener('click', saveCustomizer);
    if (dom.suitColorSelect) dom.suitColorSelect.addEventListener('change', updateCustomizerPreview);
    if (dom.helmetColorSelect) dom.helmetColorSelect.addEventListener('change', updateCustomizerPreview);
    if (dom.mustacheToggle) dom.mustacheToggle.addEventListener('change', updateCustomizerPreview);

    // Score Panel Buttons
    if (dom.closeScoresBtn) dom.closeScoresBtn.addEventListener('click', closeJudgeScores);
    if (dom.nextJumpBtn) dom.nextJumpBtn.addEventListener('click', setupNewJump);
    if (dom.submitScoreBtn) dom.submitScoreBtn.addEventListener('click', submitCurrentScore);

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        // If scores panel is open, Spacebar closes it and triggers next jump
        if (state.isScoresModalOpen) {
          e.preventDefault();
          setupNewJump();
          return;
        }
        // If jumper is stopped in outrun, space restarts
        if (window.SkiPhysics) {
          const p = window.SkiPhysics.getJumpState();
          if (p.phase === 'STOPPED' || p.phase === 'CRASHED' || p.phase === 'LANDED') {
            e.preventDefault();
            setupNewJump();
          }
        }
      } else if (e.code === 'Escape') {
        closeJudgeScores();
        closeCustomizerModal();
        closeTournamentModal();
      }
    });

    // Hook game renderer phase changes for landing / crash resolution
    const rendererInstance = window.SkiRenderer ? window.SkiRenderer.getInstance() : null;
    if (rendererInstance) {
      rendererInstance.onPhaseChange = (newPhase, physState) => {
        if (newPhase === 'LANDED' || newPhase === 'CRASHED') {
          handleJumpCompleted(physState);
        }
      };
    }
  }

  /**
   * Bootstrapping on DOM Ready
   */
  async function initApp() {
    initDomElements();
    bindDomEvents();

    // Initialize Audio Engine
    if (window.SkiAudio && window.SkiAudio.init) {
      window.SkiAudio.init();
    }

    // Initialize Tournament Engine
    if (window.SkiTournament && window.SkiTournament.init) {
      await window.SkiTournament.init().catch(console.warn);
    }

    // Initialize Canvas Renderer
    if (dom.canvas && window.SkiRenderer) {
      window.SkiRenderer.init(dom.canvas);
    }

    // Initial jump setup
    setupNewJump();

    // Start reactive HUD update loop
    updateHUD();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
