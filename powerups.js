/**
 * RetoSnake4k - powerups.js
 * Cyber Power-Up mechanics, visual rendering glyphs, active timers,
 * and persistent local leaderboard management.
 * Exposes window.PowerUpManager and window.LeaderboardManager adhering to DESIGN.md
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // LEADERBOARD MANAGER
  // --------------------------------------------------------------------------
  const STORAGE_KEY = 'retosnake4k_scores';

  const DEFAULT_SCORES = [
    { name: 'NEO_CYBER', score: 4200, date: '2088-04-12', wave: 14 },
    { name: 'GLITCH_FOX', score: 3150, date: '2088-03-30', wave: 11 },
    { name: 'ZER0_COOL', score: 2400, date: '2088-03-15', wave: 8 },
    { name: 'ACID_BURN', score: 1850, date: '2088-02-28', wave: 6 },
    { name: 'PHREAKER', score: 1200, date: '2088-01-10', wave: 4 }
  ];

  const LeaderboardManager = {
    /**
     * Retrieves all scores sorted descending, seeded if empty.
     * @returns {Array<{ name: string, score: number, date: string, wave: number }>}
     */
    getScores: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
          return [...DEFAULT_SCORES];
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
        return [...DEFAULT_SCORES];
      } catch (e) {
        console.warn('Leaderboard localStorage access failed, using in-memory defaults', e);
        return [...DEFAULT_SCORES];
      }
    },

    /**
     * Saves a new score to localStorage and returns updated leaderboard.
     * @param {string} name
     * @param {number} score
     * @param {number} [wave=1]
     */
    saveScore: function (name, score, wave) {
      const sanitizedName = (name || 'NET_RUNNER').trim().toUpperCase().substring(0, 12) || 'NET_RUNNER';
      const safeScore = Math.max(0, parseInt(score, 10) || 0);
      const safeWave = Math.max(1, parseInt(wave, 10) || 1);
      const dateStr = new Date().toISOString().split('T')[0];

      const currentScores = this.getScores();
      currentScores.push({
        name: sanitizedName,
        score: safeScore,
        date: dateStr,
        wave: safeWave
      });

      currentScores.sort((a, b) => b.score - a.score);
      const topScores = currentScores.slice(0, 10);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
      } catch (e) {
        console.warn('Failed to persist score to localStorage', e);
      }

      this.renderLeaderboardDOM();
      return topScores;
    },

    /**
     * Defensive helper to populate #leaderboard-list in the DOM if present
     */
    renderLeaderboardDOM: function () {
      const listEl = document.getElementById('leaderboard-list');
      if (!listEl) return;

      const scores = this.getScores();
      listEl.innerHTML = '';

      scores.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '8px 12px';
        row.style.margin = '4px 0';
        row.style.borderBottom = '1px solid rgba(0, 255, 204, 0.2)';
        row.style.fontFamily = 'monospace';

        const rankColor = index === 0 ? '#ff007f' : index === 1 ? '#00e5ff' : index === 2 ? '#ffe600' : '#a0a5b5';

        row.innerHTML = `
          <span style="color: ${rankColor}; font-weight: bold;">#${index + 1} ${escapeHtml(item.name)}</span>
          <span style="color: #00ffcc; font-weight: bold;">${item.score.toLocaleString()} PTS</span>
          <span style="color: #8892b0; font-size: 0.85em;">WAVE ${item.wave || 1}</span>
        `;
        listEl.appendChild(row);
      });
    }
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --------------------------------------------------------------------------
  // POWER-UP MANAGER
  // --------------------------------------------------------------------------
  const POWERUP_TYPES = {
    OVERCLOCK: 'overclock',     // Speed boost + bonus points
    CHRONO: 'chrono',           // Slow motion / matrix time
    GHOST: 'ghost',             // Phase through walls & snake tail
    MULTIPLIER: 'multiplier'    // 3x score multiplier
  };

  const POWERUP_CONFIG = {
    [POWERUP_TYPES.OVERCLOCK]: {
      name: 'OVERCLOCK',
      color: '#ff0055',
      glow: 'rgba(255, 0, 85, 0.8)',
      glyph: '⚡',
      duration: 6.0,
      description: 'TURBO BOOST & +50% SPEED'
    },
    [POWERUP_TYPES.CHRONO]: {
      name: 'CHRONO_DILATE',
      color: '#00e5ff',
      glow: 'rgba(0, 229, 255, 0.8)',
      glyph: '⏱',
      duration: 7.0,
      description: 'BULLET TIME SLOW-MO'
    },
    [POWERUP_TYPES.GHOST]: {
      name: 'GHOST_PHASE',
      color: '#9d00ff',
      glow: 'rgba(157, 0, 255, 0.8)',
      glyph: '◈',
      duration: 5.0,
      description: 'WALL & TAIL PHASING'
    },
    [POWERUP_TYPES.MULTIPLIER]: {
      name: 'DATA_SURGE 3X',
      color: '#ffe600',
      glow: 'rgba(255, 230, 0, 0.8)',
      glyph: '▲',
      duration: 8.0,
      description: 'TRIPLE SCORE MULTIPLIER'
    }
  };

  let activeItemOnGrid = null; // Current uncollected power-up spawned on canvas: { x, y, type, expiresAt }
  let activePowerUps = [];     // Currently active effects: [{ type, duration, remaining }]

  const PowerUpManager = {
    types: POWERUP_TYPES,
    activePowerUps: activePowerUps,

    /**
     * Gets current active item waiting on grid.
     */
    getCurrentGridItem: function () {
      return activeItemOnGrid;
    },

    /**
     * Clears all active effects and grid items (on game restart or game over)
     */
    reset: function () {
      activeItemOnGrid = null;
      activePowerUps.length = 0;
      this.updateHudDOM();
    },

    /**
     * Attempts to spawn a new power-up item on the grid away from snake body and food.
     * @param {number} gridWidth
     * @param {number} gridHeight
     * @param {Array<{x: number, y: number}>} snakeBody
     * @param {{x: number, y: number}} currentFood
     * @returns {Object|null}
     */
    spawn: function (gridWidth, gridHeight, snakeBody, currentFood) {
      if (activeItemOnGrid) {
        // Check expiration on grid
        if (Date.now() > activeItemOnGrid.expiresAt) {
          activeItemOnGrid = null;
        } else {
          return activeItemOnGrid;
        }
      }

      // 40% probability spawn check when called
      if (Math.random() > 0.45) {
        return null;
      }

      const typeKeys = Object.values(POWERUP_TYPES);
      const chosenType = typeKeys[Math.floor(Math.random() * typeKeys.length)];

      const maxAttempts = 60;
      let attempt = 0;
      let candidateX = 0;
      let candidateY = 0;

      const isOccupied = (x, y) => {
        if (currentFood && currentFood.x === x && currentFood.y === y) return true;
        if (snakeBody && snakeBody.some(segment => segment.x === x && segment.y === y)) return true;
        return false;
      };

      do {
        candidateX = Math.floor(Math.random() * (gridWidth - 2)) + 1;
        candidateY = Math.floor(Math.random() * (gridHeight - 2)) + 1;
        attempt++;
      } while (isOccupied(candidateX, candidateY) && attempt < maxAttempts);

      if (attempt >= maxAttempts) return null;

      activeItemOnGrid = {
        x: candidateX,
        y: candidateY,
        type: chosenType,
        expiresAt: Date.now() + 10000 // 10 seconds to collect
      };

      return activeItemOnGrid;
    },

    /**
     * Consumes item on grid if snake head coordinates match.
     * @param {{x: number, y: number}} head
     * @param {Object} gameState
     * @returns {boolean} true if power-up collected
     */
    checkCollection: function (head, gameState) {
      if (!activeItemOnGrid) return false;
      if (head.x === activeItemOnGrid.x && head.y === activeItemOnGrid.y) {
        const type = activeItemOnGrid.type;
        activeItemOnGrid = null;
        this.applyEffect(type, gameState);
        if (window.CyberAudio && typeof window.CyberAudio.playTone === 'function') {
          window.CyberAudio.playTone('powerup');
        }
        return true;
      }
      return false;
    },

    /**
     * Applies a powerup effect to the active stack and mutates gameState.
     * @param {string} type
     * @param {Object} gameState
     */
    applyEffect: function (type, gameState) {
      const config = POWERUP_CONFIG[type];
      if (!config) return;

      // Remove existing identical effect to refresh timer
      const existingIdx = activePowerUps.findIndex(p => p.type === type);
      if (existingIdx !== -1) {
        activePowerUps.splice(existingIdx, 1);
      }

      activePowerUps.push({
        type: type,
        duration: config.duration,
        remaining: config.duration
      });

      this.recalculateGameState(gameState);
      this.updateHudDOM();
    },

    /**
     * Ticks powerup durations, cleans expired ones, and reapplies gameState modifiers.
     * @param {number} deltaTime - in seconds
     * @param {Object} gameState - reference to snake game state
     */
    update: function (deltaTime, gameState) {
      // Check grid item expiration
      if (activeItemOnGrid && Date.now() > activeItemOnGrid.expiresAt) {
        activeItemOnGrid = null;
      }

      if (activePowerUps.length === 0) return;

      let changed = false;
      for (let i = activePowerUps.length - 1; i >= 0; i--) {
        activePowerUps[i].remaining -= deltaTime;
        if (activePowerUps[i].remaining <= 0) {
          activePowerUps.splice(i, 1);
          changed = true;
        }
      }

      if (changed || activePowerUps.length > 0) {
        this.recalculateGameState(gameState);
        this.updateHudDOM();
      }
    },

    /**
     * Recalculates gameState modifiers based on all currently active powerups.
     * @param {Object} gameState
     */
    recalculateGameState: function (gameState) {
      if (!gameState) return;

      const hasGhost = activePowerUps.some(p => p.type === POWERUP_TYPES.GHOST);
      const hasOverclock = activePowerUps.some(p => p.type === POWERUP_TYPES.OVERCLOCK);
      const hasChrono = activePowerUps.some(p => p.type === POWERUP_TYPES.CHRONO);
      const hasMultiplier = activePowerUps.some(p => p.type === POWERUP_TYPES.MULTIPLIER);

      gameState.ghostMode = hasGhost;

      // Base speed factor calculation
      let speedFactor = 1.0;
      if (hasOverclock) speedFactor *= 1.45;
      if (hasChrono) speedFactor *= 0.6;
      gameState.speedMultiplier = speedFactor;

      // Score multiplier
      gameState.scoreMultiplier = hasMultiplier ? 3 : (hasOverclock ? 1.5 : 1.0);
    },

    /**
     * Updates DOM HUD powerup indicators if present in DESIGN.md:
     * #powerup-bar, #powerup-label, #powerup-timer, #multiplier-display
     */
    updateHudDOM: function () {
      const labelEl = document.getElementById('powerup-label');
      const timerEl = document.getElementById('powerup-timer');
      const barEl = document.getElementById('powerup-bar');
      const multEl = document.getElementById('multiplier-display');

      if (activePowerUps.length === 0) {
        if (labelEl) labelEl.textContent = 'NONE';
        if (timerEl) timerEl.textContent = '--';
        if (barEl) barEl.style.width = '0%';
        if (multEl && multEl.dataset.custom !== 'true') multEl.textContent = '1x';
        return;
      }

      // Show top active powerup
      const topPowerup = activePowerUps[0];
      const cfg = POWERUP_CONFIG[topPowerup.type] || { name: topPowerup.type, duration: 6, color: '#00ffcc' };
      const pct = Math.max(0, Math.min(100, (topPowerup.remaining / cfg.duration) * 100));

      if (labelEl) {
        labelEl.textContent = cfg.name;
        labelEl.style.color = cfg.color;
      }
      if (timerEl) {
        timerEl.textContent = `${topPowerup.remaining.toFixed(1)}s`;
      }
      if (barEl) {
        barEl.style.width = `${pct}%`;
        barEl.style.backgroundColor = cfg.color;
        barEl.style.boxShadow = `0 0 10px ${cfg.color}`;
      }
      if (multEl) {
        const multVal = activePowerUps.some(p => p.type === POWERUP_TYPES.MULTIPLIER)
          ? '3x'
          : activePowerUps.some(p => p.type === POWERUP_TYPES.OVERCLOCK) ? '1.5x' : '1x';
        multEl.textContent = multVal;
      }
    },

    /**
     * Renders glowing neon pulsating glyphs on canvas for any item waiting on grid.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} tileSize
     */
    render: function (ctx, tileSize) {
      if (!activeItemOnGrid || !ctx) return;

      const item = activeItemOnGrid;
      const cfg = POWERUP_CONFIG[item.type] || {
        color: '#ff00ff',
        glow: 'rgba(255, 0, 255, 0.8)',
        glyph: '★'
      };

      const px = item.x * tileSize;
      const py = item.y * tileSize;
      const center = tileSize / 2;

      // Pulse animation based on timestamp
      const pulse = Math.sin(Date.now() / 150) * 0.2 + 0.8;
      const radius = (tileSize / 2.2) * pulse;

      ctx.save();
      // Outer neon glow ring
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(px + center, py + center, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner semitransparent fill
      ctx.fillStyle = cfg.glow;
      ctx.beginPath();
      ctx.arc(px + center, py + center, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Glyph icon
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(tileSize * 0.55)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.glyph, px + center, py + center);

      ctx.restore();
    }
  };

  // Auto-init leaderboard DOM if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LeaderboardManager.renderLeaderboardDOM());
  } else {
    LeaderboardManager.renderLeaderboardDOM();
  }

  window.PowerUpManager = PowerUpManager;
  window.LeaderboardManager = LeaderboardManager;
})();
