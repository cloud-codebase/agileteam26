/**
 * hills.js - Hill profiles & geometry for SkiJump2 (DSJ2 inspired)
 * Defines inrun curve, takeoff lip, knoll, K-point, HS-point, outrun geometry, and terrain sampling.
 */
(function() {
  'use strict';

  // Hill profile definitions
  const HILLS = [
    {
      id: 'zakopane',
      name: 'Wielka Krokiew, Zakopane',
      country: 'POL',
      kPoint: 120,
      hsPoint: 134,
      record: { distance: 138.5, holder: 'Adam Małysz' },
      inrun: {
        length: 98,
        angle: 35.0, // degrees at top
        tableAngle: 10.5, // degrees at lip
        tableLength: 6.5,
        heightDiff: 40.0,
      },
      landing: {
        knollAngle: 36.0,
        kAngle: 34.5,
        hsAngle: 30.5,
        fallLineAngle: 14.0,
        outrunLength: 120,
      },
      skyColor: '#1d2c4d',
      mountainColor: '#2b3f68',
      hillSnowColor: '#f2f5fb',
      treeDensity: 0.75,
      weather: 'fair'
    },
    {
      id: 'wisla',
      name: 'Malinka, Wisła',
      country: 'POL',
      kPoint: 105,
      hsPoint: 120,
      record: { distance: 124.0, holder: 'Piotr Żyła' },
      inrun: {
        length: 90,
        angle: 34.0,
        tableAngle: 10.0,
        tableLength: 6.0,
        heightDiff: 36.0,
      },
      landing: {
        knollAngle: 35.0,
        kAngle: 33.5,
        hsAngle: 29.0,
        fallLineAngle: 13.0,
        outrunLength: 100,
      },
      skyColor: '#1a233a',
      mountainColor: '#233352',
      hillSnowColor: '#eaf0fa',
      treeDensity: 0.9,
      weather: 'snowing'
    },
    {
      id: 'planica',
      name: 'Letalnica bratov Gorišek, Planica',
      country: 'SLO',
      kPoint: 185,
      hsPoint: 215,
      record: { distance: 231.0, holder: 'Matti Hautamäki' },
      inrun: {
        length: 135,
        angle: 38.0,
        tableAngle: 11.2,
        tableLength: 8.5,
        heightDiff: 62.0,
      },
      landing: {
        knollAngle: 38.0,
        kAngle: 36.0,
        hsAngle: 31.5,
        fallLineAngle: 15.0,
        outrunLength: 160,
      },
      skyColor: '#121829',
      mountainColor: '#1c2844',
      hillSnowColor: '#f6f9fe',
      treeDensity: 0.6,
      weather: 'clear'
    },
    {
      id: 'oberstdorf',
      name: 'Schattenbergschanze, Oberstdorf',
      country: 'GER',
      kPoint: 115,
      hsPoint: 130,
      record: { distance: 133.5, holder: 'Martin Schmitt' },
      inrun: {
        length: 95,
        angle: 35.5,
        tableAngle: 10.2,
        tableLength: 6.2,
        heightDiff: 38.0,
      },
      landing: {
        knollAngle: 35.5,
        kAngle: 34.0,
        hsAngle: 30.0,
        fallLineAngle: 13.5,
        outrunLength: 110,
      },
      skyColor: '#1e2638',
      mountainColor: '#2c3750',
      hillSnowColor: '#eef3fc',
      treeDensity: 0.7,
      weather: 'fog'
    }
  ];

  /**
   * Generates continuous 2D geometry for a hill.
   * Coordinate system:
   * Origin (0,0) is at the takeoff lip edge!
   * - Inrun is x <= 0 (top is at negative x, positive y)
   * - Landing slope is x > 0 (downwards, so y goes negative)
   *
   * Units: roughly meters in game physics space.
   */
  function buildHillGeometry(hill) {
    const geom = {
      inrunPoints: [],
      landingPoints: [],
      takeoff: { x: 0, y: 0, angle: (hill.inrun.tableAngle * Math.PI) / 180 },
      kPoint: { x: 0, y: 0, distance: hill.kPoint },
      hsPoint: { x: 0, y: 0, distance: hill.hsPoint },
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    };

    // 1. Inrun generation (x: from -inrunLength to 0)
    // Jumper starts at top gate (e.g. 90% of inrun length)
    const inrunLen = hill.inrun.length;
    const topX = -inrunLen;
    const topY = hill.inrun.heightDiff;
    const tableAngleRad = (hill.inrun.tableAngle * Math.PI) / 180;
    const tableLen = hill.inrun.tableLength;

    // Transition curve from steep inrun to takeoff table
    const stepsInrun = 80;
    for (let i = 0; i <= stepsInrun; i++) {
      const t = i / stepsInrun; // 0 at top, 1 at lip
      const x = topX + t * inrunLen;
      let y = 0;

      if (x < -tableLen) {
        // Curved descent profile: cubic ease in/out
        const norm = (x - topX) / (inrunLen - tableLen); // 0 to 1
        const heightDrop = topY - Math.tan(tableAngleRad) * tableLen;
        y = topY - heightDrop * (norm * norm * (3 - 2 * norm));
      } else {
        // Takeoff table is a straight segment leading to (0,0)
        y = -x * Math.tan(tableAngleRad);
      }
      geom.inrunPoints.push({ x, y });
    }

    // 2. Landing slope generation (x > 0)
    // Modeled with realistic FIS hill profile:
    // - Knoll (transition under takeoff)
    // - Straight landing hill past K-Point
    // - Outrun curve leveling off to horizontal flat finish
    const outrunX = hill.kPoint * 1.5 + hill.landing.outrunLength;
    const stepsLanding = 240;

    let prevX = 0;
    let prevY = 0;
    let accumulatedDist = 0;

    for (let i = 0; i <= stepsLanding; i++) {
      const t = i / stepsLanding;
      // Parametric stretch so more points are near landing zone
      const x = t * outrunX;
      let y = 0;

      // Realistic DSJ2 hill profile curve:
      // Starts steep after knoll, reaches maximum angle around K-point, then transitions into flat outrun
      const knollEnd = hill.kPoint * 0.35;
      const kDist = hill.kPoint;
      const hsDist = hill.hsPoint;
      const curveEnd = hsDist * 1.25;

      if (x <= knollEnd) {
        // Knoll transition
        const r = x / knollEnd;
        const initialDrop = -5.0; // small drop off the table
        const steepDrop = -knollEnd * Math.tan((hill.landing.knollAngle * Math.PI) / 180);
        y = initialDrop * (1 - r) + steepDrop * (r * r);
      } else if (x <= curveEnd) {
        // Main landing slope
        const knollY = -5.0 * (1 - 1) + -knollEnd * Math.tan((hill.landing.knollAngle * Math.PI) / 180);
        const norm = (x - knollEnd) / (curveEnd - knollEnd);
        // Blend from knoll angle to K angle to HS angle
        const avgSlope = Math.tan((hill.landing.kAngle * Math.PI) / 180);
        const delta = (x - knollEnd) * avgSlope;
        // Subtle FIS concave curve
        const curveOffset = Math.sin(norm * Math.PI) * 4.0;
        y = knollY - delta - curveOffset;
      } else {
        // Outrun curve to flat bottom
        const curveEndY = geom.landingPoints.length > 0 ? geom.landingPoints[geom.landingPoints.length - 1].y : -100;
        const outrunProgress = Math.min(1.0, (x - curveEnd) / (outrunX - curveEnd));
        // Smoothly flare to horizontal
        const flatY = curveEndY - 15.0;
        const blend = 1 - Math.cos((outrunProgress * Math.PI) / 2);
        y = curveEndY - 15.0 * blend;
      }

      const pt = { x, y };

      // Calculate distance along slope from lip (0,0)
      if (i > 0) {
        const segDist = Math.hypot(x - prevX, y - prevY);
        accumulatedDist += segDist;
      }
      pt.slopeDistance = accumulatedDist;

      geom.landingPoints.push(pt);
      prevX = x;
      prevY = y;
    }

    // Find exact coordinates of K-point and HS-point along the landing slope
    for (let i = 0; i < geom.landingPoints.length; i++) {
      const pt = geom.landingPoints[i];
      if (!geom.kPoint.found && pt.slopeDistance >= hill.kPoint) {
        geom.kPoint.x = pt.x;
        geom.kPoint.y = pt.y;
        geom.kPoint.found = true;
      }
      if (!geom.hsPoint.found && pt.slopeDistance >= hill.hsPoint) {
        geom.hsPoint.x = pt.x;
        geom.hsPoint.y = pt.y;
        geom.hsPoint.found = true;
      }
    }

    // Compute bounding box
    let minX = topX, maxX = outrunX, minY = -150, maxY = topY + 20;
    geom.bounds = { minX, maxX, minY, maxY };

    return geom;
  }

  // Pre-generate geometry for all hills
  HILLS.forEach(h => {
    h.geometry = buildHillGeometry(h);
  });

  /**
   * Helper to sample ground elevation and normal angle at horizontal coordinate x
   */
  function getGroundAt(hill, x) {
    const geom = hill.geometry;
    if (x <= 0) {
      // Inrun
      const pts = geom.inrunPoints;
      if (x <= pts[0].x) return { y: pts[0].y, angle: -hill.inrun.angle * Math.PI / 180, onLanding: false };
      for (let i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i].x && x <= pts[i + 1].x) {
          const ratio = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
          const y = pts[i].y + ratio * (pts[i + 1].y - pts[i].y);
          const angle = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
          return { y, angle, onLanding: false, distance: 0 };
        }
      }
      return { y: 0, angle: -hill.inrun.tableAngle * Math.PI / 180, onLanding: false, distance: 0 };
    } else {
      // Landing hill
      const pts = geom.landingPoints;
      if (x >= pts[pts.length - 1].x) {
        const last = pts[pts.length - 1];
        return { y: last.y, angle: 0, onLanding: true, distance: last.slopeDistance };
      }
      for (let i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i].x && x <= pts[i + 1].x) {
          const ratio = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
          const y = pts[i].y + ratio * (pts[i + 1].y - pts[i].y);
          const angle = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
          const distance = pts[i].slopeDistance + ratio * (pts[i + 1].slopeDistance - pts[i].slopeDistance);
          return { y, angle, onLanding: true, distance };
        }
      }
      return { y: pts[0].y, angle: 0, onLanding: true, distance: 0 };
    }
  }

  // Public Hill API
  window.SkiHills = {
    getHills: function() {
      return HILLS;
    },
    getHill: function(id) {
      return HILLS.find(h => h.id === id) || HILLS[0];
    },
    getGroundAt: getGroundAt,
    buildHillGeometry: buildHillGeometry
  };

})();
