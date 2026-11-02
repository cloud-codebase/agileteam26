/**
 * Retro Ski Jumps - Hill Profiles and Master Configuration
 * Exposes window.HillData for physics engine, renderer, HUD and tournament scoring
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
      tableHeight: 3.0, // meters
      inrunLength: 98.7, // meters
      landingCurve: {
        r1: 105,
        r2: 90,
        betaP: 38.0,
        betaK: 35.5,
        betaL: 32.0
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
      inrunLength: 133.8,
      landingCurve: {
        r1: 130,
        r2: 120,
        betaP: 35.0,
        betaK: 33.2,
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
      tableHeight: 2.9,
      inrunLength: 88.2,
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
      tableHeight: 3.2,
      inrunLength: 95.5,
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
