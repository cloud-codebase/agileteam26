/**
 * hills.js - Hill profiles & geometry for SkiJump2 (DSJ2 inspired)
 * Sprint 2.0: Steeper inrun & landing slopes, knoll relief, and gate height offsets.
 * Defines inrun curve, takeoff lip, knoll, K-point, HS-point, outrun geometry, and terrain sampling.
 */
(function() {
  'use strict';

  // Hill profile definitions with Sprint 2.0 steeper slope geometry
  const HILLS = [
    {
      id: 'zakopane',
      name: 'Wielka Krokiew, Zakopane',
      country: 'POL',
      kPoint: 120,
      hsPoint: 134,
      record: { distance: 140.5, holder: 'Adam Małysz' },
      gates: { default: 12, min: 1, max: 20, pointsPerGate: 4.8 },
      inrun: {
        length: 98,
        angle: 38.0, // Steeper top inrun (38 deg)
        tableAngle: 10.5, // degrees at lip
        tableLength: 6.5,
        heightDiff: 43.5, // increased drop for steeper speed
      },
      landing: {
        knollAngle: 37.0, // Steeper knoll relief for genuine altitude
        kAngle: 35.5,     // FIS authentic steep landing slope
        hsAngle: 32.0,
        fallLineAngle: 15.0,
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
      gates: { default: 10, min: 1, max: 20, pointsPerGate: 4.2 },
      inrun: {
        length: 90,
        angle: 37.0,
        tableAngle: 10.2,
        tableLength: 6.0,
        heightDiff: 39.5,
      },
      landing: {
        knollAngle: 36.5,
        kAngle: 34.8,
        hsAngle: 31.0,
        fallLineAngle: 14.0,
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
      gates: { default: 8, min: 1, max: 20, pointsPerGate: 6.4 },
      inrun: {
        length: 135,
        angle: 39.5, // Gigantic ski flying inrun
        tableAngle: 11.5,
        tableLength: 8.5,
        heightDiff: 68.0,
      },
      landing: {
        knollAngle: 38.5,
        kAngle: 37.0,
        hsAngle: 33.0,
        fallLineAngle: 16.0,
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
      gates: { default: 12, min: 1, max: 20, pointsPerGate: 4.5 },
      inrun: {
        length: 95,
        angle: 37.5,
        tableAngle: 10.5,
        tableLength: 6.2,
        heightDiff: 41.5,
      },
      landing: {
        knollAngle: 36.8,
        kAngle: 35.0,
        hsAngle: 31.5,
        fallLineAngle: 14.5,
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
   * Units: meters in game physics space.
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
    const inrunLen = hill.inrun.length;
    const topX = -inrunLen;
    const topY = hill.inrun.heightDiff;
    const tableAngleRad = (hill.inrun.tableAngle * Math.PI) / 180;
    const tableLen = hill.inrun.tableLength;

    // Transition curve from steep inrun to takeoff table
    const stepsInrun = 100;
    for (let i = 0; i <= stepsInrun; i++) {
      const t = i / stepsInrun; // 0 at top, 1 at lip
      const x = topX + t * inrunLen;
      let y = 0;

      if (x < -tableLen) {
        // Curved descent profile: smooth transition to table angle
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
    // FIS hill profile modeled with genuine flight elevation:
    // - Knoll (transition under takeoff with authentic drop and clearance)
    // - Steep landing hill through K-Point and HS-Point
    // - Outrun flare leveling off smoothly to horizontal
    const outrunX = hill.kPoint * 1.5 + hill.landing.outrunLength;
    const stepsLanding = 280;

    let prevX = 0;
    let prevY = 0;
    let accumulatedDist = 0;

    for (let i = 0; i <= stepsLanding; i++) {
      const t = i / stepsLanding;
      const x = t * outrunX;
      let y = 0;

      const knollEnd = hill.kPoint * 0.32;
      const kDist = hill.kPoint;
      const hsDist = hill.hsPoint;
      const curveEnd = hsDist * 1.25;

      const knollRad = (hill.landing.knollAngle * Math.PI) / 180;
      const kRad = (hill.landing.kAngle * Math.PI) / 180;
      const hsRad = (hill.landing.hsAngle * Math.PI) / 180;

      if (x <= knollEnd) {
        // Knoll transition: deeper drop off lip to create authentic flight float sensation
        const r = x / knollEnd;
        const initialLipDrop = -4.5;
        const steepDrop = -knollEnd * Math.tan(knollRad);
        // Smooth quadratic blend
        y = initialLipDrop * (1 - r) + steepDrop * (r * r);
      } else if (x <= curveEnd) {
        // Main landing slope: steep terrain contour under flight trajectory
        const knollEndY = -knollEnd * Math.tan(knollRad);
        const norm = (x - knollEnd) / (curveEnd - knollEnd);
        
        // Progressive slope angle interpolating knoll -> K -> HS
        const slopeRad = knollRad * (1 - norm) + hsRad * norm;
        const avgSlope = Math.tan(slopeRad);
        const delta = (x - knollEnd) * avgSlope;

        // Slight FIS concave curvature giving natural bowl profile
        const curveOffset = Math.sin(norm * Math.PI) * 4.5;
        y = knollEndY - delta - curveOffset;
      } else {
        // Outrun curve to flat bottom
        const curveEndY = geom.landingPoints.length > 0 ? geom.landingPoints[geom.landingPoints.length - 1].y : -120;
        const outrunProgress = Math.min(1.0, (x - curveEnd) / (outrunX - curveEnd));
        // Flare to horizontal ground
        const blend = 1 - Math.cos((outrunProgress * Math.PI) / 2);
        y = curveEndY - 16.0 * blend;
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
    let minX = topX, maxX = outrunX, minY = -180, maxY = topY + 25;
    geom.bounds = { minX, maxX, minY, maxY };

    return geom;
  }

  // Pre-generate geometry for all hills
  HILLS.forEach(h => {
    h.geometry = buildHillGeometry(h);
  });

  /**
   * Helper to sample ground elevation and normal angle at horizontal coordinate x.
   * Supports gateOffset for starting gate elevation adjustments.
   * Contract: window.SkiHills.getGroundAt(hill, x, gateOffset) -> { y, angle, onLanding, distance }
   */
  function getGroundAt(hill, x, gateOffset) {
    if (!hill || !hill.geometry) return { y: 0, angle: 0, onLanding: false, distance: 0 };
    const geom = hill.geometry;
    const gOffset = typeof gateOffset === 'number' ? gateOffset : 0;

    if (x <= 0) {
      // Inrun
      const pts = geom.inrunPoints;
      if (x <= pts[0].x) {
        return { 
          y: pts[0].y + gOffset, 
          angle: -hill.inrun.angle * Math.PI / 180, 
          onLanding: false, 
          distance: 0 
        };
      }
      for (let i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i].x && x <= pts[i + 1].x) {
          const ratio = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
          const y = pts[i].y + ratio * (pts[i + 1].y - pts[i].y) + gOffset;
          const angle = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
          return { y, angle, onLanding: false, distance: 0 };
        }
      }
      return { 
        y: gOffset, 
        angle: -hill.inrun.tableAngle * Math.PI / 180, 
        onLanding: false, 
        distance: 0 
      };
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
