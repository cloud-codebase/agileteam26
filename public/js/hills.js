/**
 * Retro Ski Jumps - Hill Profiles and Master Configuration
 * Exposes window.HillData for physics engine, renderer, HUD and tournament scoring
 * Sprint 3.0 (SCRUM-180): Added takeoffConfig (warningZoneLen, sweetSpotLen, lipHeight)
 * Sprint 4.0 (SCRUM-184): Redesigned steep FIS hill profiles, knoll drop-off & standardized elevation functions
 */
(function (global) {
  'use strict';

  var HillData = {
    zakopane: {
      id: 'zakopane',
      name: 'Zakopane (Wielka Krokiew)',
      shortName: 'Zakopane',
      country: 'POL',
      flag: '🇵🇱',
      kPoint: 120,
      hsPoint: 140,
      inrunAngle: 35.0, // degrees
      tableAngle: 10.5, // degrees takeoff lip
      tableHeight: 3.2, // meters vertical table drop
      knollDrop: 3.5,   // meters table drop-off at takeoff exit
      inrunLength: 98.7, // meters
      takeoffConfig: {
        warningZoneLen: 12.0, // meters before lip
        sweetSpotLen: 2.8,    // optimal jump zone (e.g. 0.4m - 3.2m before lip)
        lipHeight: 3.2        // table height in meters
      },
      landingCurve: {
        r1: 105,
        r2: 90,
        betaP: 38.0, // steep knoll slope in degrees
        betaK: 35.5, // FIS standard landing slope at K-point
        betaL: 32.0  // transition slope towards HS
      },
      record: 147.0,
      recordHolder: 'Yukiya Sato',
      meterValue: 1.8, // 1.8 pts per meter for large hills (K100-K169)
      basePoints: 60, // 60 pts at K point
      windSens: 1.2,
      skyGradient: ['#0f172a', '#1e293b', '#38bdf8'],
      snowColor: '#f8fafc',
      pineDensity: 24,
      crowdDensity: 32
    },
    planica: {
      id: 'planica',
      name: 'Planica (Letalnica bratov Gorišek)',
      shortName: 'Planica',
      country: 'SLO',
      flag: '🇸🇮',
      kPoint: 185,
      hsPoint: 240,
      inrunAngle: 35.1,
      tableAngle: 11.2,
      tableHeight: 3.8,
      knollDrop: 3.8,
      inrunLength: 133.8,
      takeoffConfig: {
        warningZoneLen: 14.0,
        sweetSpotLen: 3.2,
        lipHeight: 3.8
      },
      landingCurve: {
        r1: 130,
        r2: 120,
        betaP: 36.5,
        betaK: 34.0,
        betaL: 30.5
      },
      record: 252.0,
      recordHolder: 'Ryoyu Kobayashi',
      meterValue: 1.2, // 1.2 pts per meter for flying hills (K170+)
      basePoints: 120, // 120 pts at K point for ski flying
      windSens: 1.6,
      skyGradient: ['#020617', '#0f172a', '#2563eb'],
      snowColor: '#f1f5f9',
      pineDensity: 30,
      crowdDensity: 48
    },
    wisla: {
      id: 'wisla',
      name: 'Wisła (Malinka)',
      shortName: 'Wisła',
      country: 'POL',
      flag: '🇵🇱',
      kPoint: 120,
      hsPoint: 134,
      inrunAngle: 35.0,
      tableAngle: 10.5,
      tableHeight: 3.0,
      knollDrop: 3.2,
      inrunLength: 88.2,
      takeoffConfig: {
        warningZoneLen: 11.0,
        sweetSpotLen: 2.6,
        lipHeight: 3.0
      },
      landingCurve: {
        r1: 100,
        r2: 85,
        betaP: 37.5,
        betaK: 34.8,
        betaL: 31.0
      },
      record: 139.0,
      recordHolder: 'Stefan Kraft',
      meterValue: 1.8,
      basePoints: 60,
      windSens: 1.4,
      skyGradient: ['#111827', '#1f2937', '#60a5fa'],
      snowColor: '#ffffff',
      pineDensity: 28,
      crowdDensity: 28
    },
    oberstdorf: {
      id: 'oberstdorf',
      name: 'Oberstdorf (Schattenbergschanze)',
      shortName: 'Oberstdorf',
      country: 'GER',
      flag: '🇩🇪',
      kPoint: 120,
      hsPoint: 137,
      inrunAngle: 35.5,
      tableAngle: 11.0,
      tableHeight: 3.4,
      knollDrop: 3.5,
      inrunLength: 95.5,
      takeoffConfig: {
        warningZoneLen: 12.0,
        sweetSpotLen: 2.8,
        lipHeight: 3.4
      },
      landingCurve: {
        r1: 104,
        r2: 88,
        betaP: 37.0,
        betaK: 35.0,
        betaL: 31.5
      },
      record: 143.5,
      recordHolder: 'Sigurd Pettersen',
      meterValue: 1.8,
      basePoints: 60,
      windSens: 1.1,
      skyGradient: ['#090d16', '#1e1b4b', '#4338ca'],
      snowColor: '#f8fafc',
      pineDensity: 32,
      crowdDensity: 36
    }
  };

  /**
   * Evaluates the landing hill ground y coordinate in world coordinates for a given world x.
   * Coordinate frame: Takeoff lip edge is at (x = 0, y = 0).
   * Positive y is downwards (canvas coordinate system).
   *
   * Sprint 4.0 FIS Steep Profile Overhaul (DESIGN.md):
   * 1. Initial table drop-off (ht ~ 3.0m - 3.8m) at takeoff exit (x = 0).
   *    Base terrain ground below lip starts at ht. At x <= 0, returns 0 for table deck.
   * 2. Accelerating knoll (bula) drop (0 < x <= P):
   *    Quadratic/cubic descent starting with initial angle 11.5° - 14° and accelerating to betaP (35° - 38°).
   * 3. Steep FIS Landing Slope (P < x <= K):
   *    Sustained FIS landing incline betaK (34° - 38°).
   * 4. Transition Zone (K < x <= HS):
   *    Radius curve easing from betaK down to ~28°-30°.
   * 5. Outrun Basin (x > HS):
   *    Smooth transition curve easing from ~28° to flat deceleration outrun (x > HS + 40m).
   */
  HillData.getGroundY = function (hill, x) {
    if (x <= 0) {
      // Inrun / table deck edge at lip
      return 0;
    }

    var hillObj = (hill && hill.kPoint) ? hill : (HillData[hill] || HillData.zakopane);
    var k = hillObj.kPoint || 120;
    var hs = hillObj.hsPoint || (k * 1.15);

    // Geometry key points
    var P = k * 0.78;
    var K = k;
    var HS = hs;
    var outrunStart = HS + 25;
    var outrunFlat = outrunStart + 35;

    // Table drop-off height (ht ~ 3.0m - 3.8m)
    var ht = (hillObj.knollDrop !== undefined) ? hillObj.knollDrop :
             ((hillObj.tableHeight !== undefined) ? hillObj.tableHeight : 3.4);

    // Profile angles in degrees
    var curve = hillObj.landingCurve || {};
    var betaPDeg = (curve.betaP !== undefined) ? curve.betaP : 37.5; // ~37.5°
    var betaKDeg = (curve.betaK !== undefined) ? curve.betaK : 35.5; // ~35.5°

    var tanBetaP = Math.tan((betaPDeg * Math.PI) / 180);
    var tanBetaK = Math.tan((betaKDeg * Math.PI) / 180);

    // Initial knoll takeoff drop slope (at x=0+) ~ 12.5°
    var beta0Deg = (hillObj.tableAngle !== undefined) ? (hillObj.tableAngle + 2.0) : 12.5;
    var tanBeta0 = Math.tan((beta0Deg * Math.PI) / 180);

    // Elevation at P-point: starts at ht, accelerates from tanBeta0 to tanBetaP
    // Integrating linear slope acceleration: slope(t) = tanBeta0 + (tanBetaP - tanBeta0) * t
    // yP = ht + P * [ tanBeta0 + 0.5 * (tanBetaP - tanBeta0) ] = ht + P * (tanBeta0 + tanBetaP) / 2
    var yP = ht + P * ((tanBeta0 + tanBetaP) / 2);

    if (x <= P) {
      // Knoll curve: accelerating drop reaching betaP at x = P
      var t = x / P;
      // Quadratic/cubic acceleration curve:
      // integral of (tanBeta0 + (tanBetaP - tanBeta0) * t) * dt from 0 to x
      return ht + x * (tanBeta0 + 0.5 * (tanBetaP - tanBeta0) * t);
    } else if (x <= K) {
      // Sustained steep FIS landing slope between P and K
      return yP + (x - P) * tanBetaK;
    } else if (x <= HS) {
      // Transition zone between K and HS: easing from betaK to ~29°
      var yK = yP + (K - P) * tanBetaK;
      var tK = (x - K) / (HS - K);
      var currentBeta = betaKDeg - (betaKDeg - 29.0) * tK;
      var avgSlope = Math.tan(((betaKDeg + currentBeta) / 2 * Math.PI) / 180);
      return yK + (x - K) * avgSlope;
    } else if (x <= outrunStart) {
      // Transition from HS to outrun bowl: slope easing from 29° to ~8°
      var yK_full = yP + (K - P) * tanBetaK;
      var avgSlopeKHS = Math.tan(((betaKDeg + 29.0) / 2 * Math.PI) / 180);
      var yHS = yK_full + (HS - K) * avgSlopeKHS;

      var tHS = (x - HS) / (outrunStart - HS);
      var slopeDeg = 29.0 * (1.0 - tHS * 0.75); // down to ~7.25°
      var avgSlopeHS = Math.tan(((29.0 + slopeDeg) / 2 * Math.PI) / 180);
      return yHS + (x - HS) * avgSlopeHS;
    } else if (x <= outrunFlat) {
      // Outrun curve rounding into flat basin
      var yK_f = yP + (K - P) * tanBetaK;
      var avgSlopeKHS_f = Math.tan(((betaKDeg + 29.0) / 2 * Math.PI) / 180);
      var yHS_f = yK_f + (HS - K) * avgSlopeKHS_f;
      var avgSlopeHS_f = Math.tan(((29.0 + 7.25) / 2 * Math.PI) / 180);
      var yOut = yHS_f + (outrunStart - HS) * avgSlopeHS_f;

      var tOut = (x - outrunStart) / (outrunFlat - outrunStart);
      var entrySlope = 7.25;
      var exitSlope = 1.0;
      var currentSl = entrySlope * (1.0 - tOut) + exitSlope * tOut;
      var avgSl = Math.tan(((entrySlope + currentSl) / 2 * Math.PI) / 180);
      return yOut + (x - outrunStart) * avgSl;
    } else {
      // Horizontal flat deceleration outrun basin
      var yK_end = yP + (K - P) * tanBetaK;
      var avgSlopeKHS_end = Math.tan(((betaKDeg + 29.0) / 2 * Math.PI) / 180);
      var yHS_end = yK_end + (HS - K) * avgSlopeKHS_end;
      var avgSlopeHS_end = Math.tan(((29.0 + 7.25) / 2 * Math.PI) / 180);
      var yOut_end = yHS_end + (outrunStart - HS) * avgSlopeHS_end;
      var avgOut_end = Math.tan(((7.25 + 1.0) / 2 * Math.PI) / 180);
      var yFlat = yOut_end + (outrunFlat - outrunStart) * avgOut_end;

      // Slight residual slope 0.5° for natural drainage, then purely flat
      var extraX = x - outrunFlat;
      return yFlat + extraX * Math.tan((0.5 * Math.PI) / 180);
    }
  };

  /**
   * Computes ground tangent angle in degrees at coordinate x.
   * Exported on HillData for uniform use by physics and renderer.
   */
  HillData.getGroundSlopeAngle = function (hill, x) {
    var delta = 0.2;
    var y1 = HillData.getGroundY(hill, Math.max(0, x - delta));
    var y2 = HillData.getGroundY(hill, x + delta);
    var dy = y2 - y1;
    var dx = 2 * delta;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  // Helper method to retrieve hill or fallback
  HillData.get = function (id) {
    return HillData[id] || HillData.zakopane;
  };

  // Helper method to get list of hills
  HillData.list = function () {
    return Object.keys(HillData)
      .filter(function (key) {
        return typeof HillData[key] === 'object' && HillData[key].id;
      })
      .map(function (key) {
        return HillData[key];
      });
  };

  global.HillData = HillData;
})(typeof window !== 'undefined' ? window : this);
