/**
 * Retro Drift Race - Track Renderer, Camera & Particle System
 * Module: public/js/track.js
 * Author: Aramis (Wave 1 - SCRUM-202)
 *
 * Exposes window.TrackRenderer adhering strictly to DESIGN.md:
 * - init(canvas, ctx)
 * - update(dt, vehicleState)
 * - render(ctx, camera)
 * - checkCollision(x, y)
 * - getCamera()
 * - getSpawnPoint()
 * - getCheckpoints()
 */

(function () {
  'use strict';

  // Synthwave neon palette & track configuration
  const CONFIG = {
    trackWidth: 160,
    curbWidth: 18,
    runoutWidth: 26,
    gridSize: 80,
    maxParticles: 450,
    maxSkidPoints: 800,
    cameraLerp: 0.08,
    cameraLead: 0.35, // Lead camera slightly in direction of vehicle velocity/heading
    worldBounds: { minX: -600, minY: -600, maxX: 3400, maxY: 2600 }
  };

  // Curated synthwave circuit track points (looping smooth closed spline/polygon with hairpins & chicanes)
  const WAYPOINTS = [
    { x: 300,  y: 350 },
    { x: 900,  y: 350 },
    { x: 1400, y: 450 },
    { x: 1900, y: 350 },
    { x: 2350, y: 650 },
    { x: 2550, y: 1100 },
    { x: 2350, y: 1600 },
    { x: 1850, y: 1850 },
    { x: 1400, y: 1600 },
    { x: 1050, y: 1950 },
    { x: 650,  y: 1900 },
    { x: 300,  y: 1550 },
    { x: 350,  y: 1050 },
    { x: 150,  y: 700 }
  ];

  // Helper math utilities
  function distSq(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  }

  function dist(p1, p2) {
    return Math.sqrt(distSq(p1, p2));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function pointToSegmentDistance(p, v, w) {
    const l2 = distSq(v, w);
    if (l2 === 0) return { distance: dist(p, v), proj: v, t: 0 };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return { distance: dist(p, proj), proj, t };
  }

  // Pre-sample high-resolution track centerline using Catmull-Rom spline interpolation
  function generateSmoothCenterline(points, samplesPerSegment = 24) {
    const smoothed = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];

      for (let s = 0; s < samplesPerSegment; s++) {
        const t = s / samplesPerSegment;
        const t2 = t * t;
        const t3 = t2 * t;

        // Catmull-Rom spline formulation
        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );
        smoothed.push({ x, y });
      }
    }
    return smoothed;
  }

  class TrackRenderer {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.centerline = [];
      this.checkpoints = [];

      // Camera State
      this.camera = {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        zoom: 1.0,
        viewportWidth: 1280,
        viewportHeight: 720
      };

      // Skid marks buffer (stores discrete segments with alpha decay)
      this.skidMarks = []; // { x1, y1, x2, y2, alpha, width, color }
      this.lastSkidPoints = { left: null, right: null };

      // Particle system (smoke puffs and drift sparks)
      this.particles = [];

      // Environment animation timer for grid pulse and neon lights
      this.pulseTime = 0;

      // Finish / Start line coordinates
      this.startLine = {
        p1: { x: 0, y: 0 },
        p2: { x: 0, y: 0 },
        angle: 0
      };
    }

    init(canvas, ctx) {
      this.canvas = canvas || document.getElementById('game-canvas');
      this.ctx = ctx || (this.canvas ? this.canvas.getContext('2d') : null);

      if (this.canvas) {
        this.camera.viewportWidth = this.canvas.width || 1280;
        this.camera.viewportHeight = this.canvas.height || 720;
      }

      this.centerline = generateSmoothCenterline(WAYPOINTS, 20);
      this.setupCheckpointsAndStartLine();

      // Initial camera positioning at start line
      const spawn = this.getSpawnPoint();
      this.camera.x = spawn.x;
      this.camera.y = spawn.y;
      this.camera.targetX = spawn.x;
      this.camera.targetY = spawn.y;

      return this;
    }

    setupCheckpointsAndStartLine() {
      if (this.centerline.length < 2) return;

      const p0 = this.centerline[0];
      const p1 = this.centerline[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const halfW = CONFIG.trackWidth * 0.5 + 10;

      this.startLine = {
        p1: { x: p0.x - nx * halfW, y: p0.y - ny * halfW },
        p2: { x: p0.x + nx * halfW, y: p0.y + ny * halfW },
        center: { x: p0.x, y: p0.y },
        angle: Math.atan2(dy, dx)
      };

      // Generate evenly spaced checkpoints along track for lap progression & orientation
      this.checkpoints = [];
      const step = Math.floor(this.centerline.length / 10);
      for (let i = 0; i < this.centerline.length; i += step) {
        const pt = this.centerline[i];
        const next = this.centerline[(i + 1) % this.centerline.length];
        const segDx = next.x - pt.x;
        const segDy = next.y - pt.y;
        this.checkpoints.push({
          index: this.checkpoints.length,
          x: pt.x,
          y: pt.y,
          angle: Math.atan2(segDy, segDx),
          radius: CONFIG.trackWidth * 0.7
        });
      }
    }

    getSpawnPoint() {
      if (!this.centerline.length) {
        return { x: 300, y: 350, angle: 0 };
      }
      const p0 = this.centerline[0];
      const p1 = this.centerline[1];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      return {
        x: p0.x,
        y: p0.y,
        angle: angle
      };
    }

    getCheckpoints() {
      return this.checkpoints;
    }

    getCamera() {
      return this.camera;
    }

    /**
     * Checks whether coordinate (x, y) is on track, on curb, or off-track.
     * Returns: { isOffTrack: boolean, distanceToCenter: number, nearestProj: {x, y}, onCurb: boolean }
     */
    checkCollision(x, y) {
      if (!this.centerline || this.centerline.length < 2) {
        return { isOffTrack: false, distanceToCenter: 0, nearestProj: { x, y }, onCurb: false };
      }

      const p = { x, y };
      let minDistance = Infinity;
      let nearestProj = null;

      // Test against track segments
      for (let i = 0; i < this.centerline.length; i++) {
        const v = this.centerline[i];
        const w = this.centerline[(i + 1) % this.centerline.length];
        const res = pointToSegmentDistance(p, v, w);
        if (res.distance < minDistance) {
          minDistance = res.distance;
          nearestProj = res.proj;
        }
      }

      const asphaltBoundary = CONFIG.trackWidth * 0.5;
      const curbBoundary = asphaltBoundary + CONFIG.curbWidth;
      const runoutBoundary = curbBoundary + CONFIG.runoutWidth;

      const isOffTrack = minDistance > asphaltBoundary;
      const onCurb = minDistance > (asphaltBoundary - 6) && minDistance <= curbBoundary;
      const isWallCollision = minDistance > runoutBoundary;

      return {
        isOffTrack,
        onCurb,
        isWallCollision,
        distanceToCenter: minDistance,
        nearestProj: nearestProj || p,
        trackWidth: CONFIG.trackWidth
      };
    }

    update(dt, vehicleState) {
      this.pulseTime += dt;

      // 1. Update Camera Smooth Follow (Lerp with forward dynamic look-ahead)
      if (vehicleState) {
        const speed = vehicleState.speed || 0;
        const lookAheadDist = Math.min(speed * 0.3, 140);
        const headingAngle = vehicleState.angle || 0;

        // Lead camera ahead along vehicle velocity vector or heading
        const forwardX = Math.cos(headingAngle) * lookAheadDist;
        const forwardY = Math.sin(headingAngle) * lookAheadDist;

        this.camera.targetX = vehicleState.x + forwardX;
        this.camera.targetY = vehicleState.y + forwardY;

        // Smooth camera lerp
        const lerpFactor = 1 - Math.pow(1 - CONFIG.cameraLerp, dt * 60);
        this.camera.x = lerp(this.camera.x, this.camera.targetX, lerpFactor);
        this.camera.y = lerp(this.camera.y, this.camera.targetY, lerpFactor);

        // Dynamic slight zoom out on high speed
        const targetZoom = 1.0 - Math.min(0.2, (speed / 900) * 0.15);
        this.camera.zoom = lerp(this.camera.zoom, targetZoom, 0.05);

        // 2. Tire Skid Marks and Particle Emission
        this.updateTiresAndParticles(dt, vehicleState);
      }

      // 3. Update Existing Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const part = this.particles[i];
        part.age += dt;
        if (part.age >= part.maxLife) {
          this.particles.splice(i, 1);
          continue;
        }

        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.size += (part.growth || 0) * dt;
        part.vx *= part.friction || 0.96;
        part.vy *= part.friction || 0.96;
        part.alpha = Math.max(0, 1 - (part.age / part.maxLife));
      }

      // 4. Decay and prune old skid marks
      if (this.skidMarks.length > CONFIG.maxSkidPoints) {
        this.skidMarks.splice(0, this.skidMarks.length - CONFIG.maxSkidPoints);
      }
      for (let i = 0; i < this.skidMarks.length; i++) {
        // Slow natural fade over time
        this.skidMarks[i].alpha = Math.max(0, this.skidMarks[i].alpha - (dt * 0.008));
      }
    }

    updateTiresAndParticles(dt, vehicleState) {
      const { x, y, angle, speed, isDrifting, handbrake } = vehicleState;
      const absSlip = Math.abs(vehicleState.slipAngle || 0);

      // Determine rear wheel positions based on vehicle dimensions
      const carHalfLength = 22;
      const carHalfWidth = 14;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Rear axle center
      const rearX = x - cosA * carHalfLength;
      const rearY = y - sinA * carHalfLength;

      // Left and right rear tire world positions
      const leftTire = {
        x: rearX - sinA * carHalfWidth,
        y: rearY + cosA * carHalfWidth
      };
      const rightTire = {
        x: rearX + sinA * carHalfWidth,
        y: rearY - cosA * carHalfWidth
      };

      const shouldSkid = (isDrifting && Math.abs(speed) > 120) || (handbrake && Math.abs(speed) > 50) || (absSlip > 0.35 && Math.abs(speed) > 140);

      if (shouldSkid) {
        const skidAlpha = Math.min(0.65, 0.25 + (absSlip * 0.4) + (handbrake ? 0.3 : 0));

        // Connect previous tire mark point to new point to draw continuous ribbon
        if (this.lastSkidPoints.left) {
          this.skidMarks.push({
            x1: this.lastSkidPoints.left.x,
            y1: this.lastSkidPoints.left.y,
            x2: leftTire.x,
            y2: leftTire.y,
            alpha: skidAlpha,
            width: 5,
            color: '#1a102a'
          });
        }
        if (this.lastSkidPoints.right) {
          this.skidMarks.push({
            x1: this.lastSkidPoints.right.x,
            y1: this.lastSkidPoints.right.y,
            x2: rightTire.x,
            y2: rightTire.y,
            alpha: skidAlpha,
            width: 5,
            color: '#1a102a'
          });
        }

        this.lastSkidPoints.left = { x: leftTire.x, y: leftTire.y };
        this.lastSkidPoints.right = { x: rightTire.x, y: rightTire.y };

        // Emit dynamic smoke puffs and hot sparks
        const intensity = Math.min(1.0, (absSlip / 1.2) + (handbrake ? 0.5 : 0));
        const numParticles = Math.random() < (intensity * 0.9) ? 2 : 1;

        for (let p = 0; p < numParticles; p++) {
          if (this.particles.length >= CONFIG.maxParticles) break;

          // Alternate left and right tire emitters
          const emitter = (p % 2 === 0) ? leftTire : rightTire;
          const isSpark = Math.random() < 0.28;

          if (isSpark) {
            // Neon pink / cyan hot sparks
            const sparkAngle = angle + Math.PI + (Math.random() - 0.5) * 1.4;
            const sparkSpeed = (Math.random() * 90) + 40;
            this.particles.push({
              x: emitter.x + (Math.random() - 0.5) * 4,
              y: emitter.y + (Math.random() - 0.5) * 4,
              vx: Math.cos(sparkAngle) * sparkSpeed,
              vy: Math.sin(sparkAngle) * sparkSpeed,
              size: (Math.random() * 2.2) + 1.2,
              growth: -1.2,
              friction: 0.91,
              age: 0,
              maxLife: (Math.random() * 0.3) + 0.15,
              alpha: 1.0,
              type: 'spark',
              color: Math.random() < 0.5 ? '#ff007f' : '#00ffff'
            });
          } else {
            // Synthwave drift vapor / tire smoke
            const smokeAngle = angle + Math.PI + (Math.random() - 0.5) * 0.9;
            const smokeSpeed = (Math.random() * 45) + 15;
            this.particles.push({
              x: emitter.x + (Math.random() - 0.5) * 6,
              y: emitter.y + (Math.random() - 0.5) * 6,
              vx: Math.cos(smokeAngle) * smokeSpeed,
              vy: Math.sin(smokeAngle) * smokeSpeed,
              size: (Math.random() * 7) + 5,
              growth: 18 + Math.random() * 12,
              friction: 0.93,
              age: 0,
              maxLife: (Math.random() * 0.55) + 0.35,
              alpha: 0.5,
              type: 'smoke',
              color: Math.random() < 0.6 ? '#d6249f' : '#281b40'
            });
          }
        }
      } else {
        // Reset last skid anchor when tires lose drift contact
        this.lastSkidPoints.left = null;
        this.lastSkidPoints.right = null;
      }
    }

    render(ctx, camera) {
      const renderCtx = ctx || this.ctx;
      if (!renderCtx) return;

      const cam = camera || this.camera;
      const width = this.canvas ? this.canvas.width : 1280;
      const height = this.canvas ? this.canvas.height : 720;

      renderCtx.save();

      // Clear full screen background with deep cyber dark purple
      renderCtx.fillStyle = '#0a0518';
      renderCtx.fillRect(0, 0, width, height);

      // Camera transformation: center screen, apply zoom & translate to camera focus
      renderCtx.translate(width * 0.5, height * 0.5);
      renderCtx.scale(cam.zoom, cam.zoom);
      renderCtx.translate(-cam.x, -cam.y);

      // 1. Draw Synthwave Retro Grid Background
      this.drawSynthwaveGrid(renderCtx, cam, width, height);

      // 2. Draw Circuit Track (Asphalt, Curbs, Runoff, Neon Boundaries)
      this.drawTrackSurface(renderCtx);

      // 3. Draw Persistent Skid Marks
      this.drawSkidMarks(renderCtx);

      // 4. Draw Start/Finish Line & Checkpoint Markers
      this.drawTrackDecorations(renderCtx);

      // 5. Draw Drift Particles & Sparks
      this.drawParticles(renderCtx);

      renderCtx.restore();
    }

    drawSynthwaveGrid(ctx, cam, viewW, viewH) {
      const b = CONFIG.worldBounds;
      const step = CONFIG.gridSize;

      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(74, 28, 110, 0.28)';

      const startX = Math.floor(b.minX / step) * step;
      const endX = Math.ceil(b.maxX / step) * step;
      const startY = Math.floor(b.minY / step) * step;
      const endY = Math.ceil(b.maxY / step) * step;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += step) {
        ctx.moveTo(x, b.minY);
        ctx.lineTo(x, b.maxY);
      }
      for (let y = startY; y <= endY; y += step) {
        ctx.moveTo(b.minX, y);
        ctx.lineTo(b.maxX, y);
      }
      ctx.stroke();

      // Radial dark horizon vignette
      const pulseGlow = (Math.sin(this.pulseTime * 2.0) + 1) * 0.5;
      const grad = ctx.createRadialGradient(cam.x, cam.y, 100, cam.x, cam.y, 1200);
      grad.addColorStop(0, 'rgba(255, 0, 128, 0.04)');
      grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.03)');
      grad.addColorStop(1, 'rgba(10, 5, 24, 0.65)');
      ctx.fillStyle = grad;
      ctx.fillRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);

      ctx.restore();
    }

    drawTrackSurface(ctx) {
      const pts = this.centerline;
      if (!pts || pts.length < 3) return;

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // 1. Outer Neon Glow Barrier
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();

      // Barrier glow & outer runoff buffer
      ctx.lineWidth = CONFIG.trackWidth + (CONFIG.curbWidth + CONFIG.runoutWidth) * 2;
      ctx.strokeStyle = '#180a2c';
      ctx.stroke();

      // 2. Alternating Neon Curbs (Magenta & Cyan stripes)
      this.drawAlternatingCurbs(ctx);

      // 3. Asphalt Main Surface (Dark Cyber Slate with inner glow)
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.lineWidth = CONFIG.trackWidth;
      ctx.strokeStyle = '#130d24';
      ctx.stroke();

      // 4. Subtle inner asphalt texture / side borders
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.lineWidth = CONFIG.trackWidth - 12;
      ctx.strokeStyle = '#1a1230';
      ctx.stroke();

      // 5. Neon Center Guide Dashes (Cyberpunk Laser Yellow/Cyan)
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 24]);
      ctx.strokeStyle = 'rgba(0, 255, 234, 0.45)';
      ctx.shadowColor = '#00ffe0';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // 6. Laser Edge Neon Bounds
      this.drawNeonEdgeBorders(ctx);

      ctx.restore();
    }

    drawAlternatingCurbs(ctx) {
      const pts = this.centerline;
      const halfW = (CONFIG.trackWidth * 0.5) + (CONFIG.curbWidth * 0.5);
      const curbThickness = CONFIG.curbWidth;

      ctx.save();
      for (let i = 0; i < pts.length; i++) {
        const nextIdx = (i + 1) % pts.length;
        const p1 = pts[i];
        const p2 = pts[nextIdx];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const isMagenta = (Math.floor(i / 2) % 2 === 0);
        ctx.strokeStyle = isMagenta ? '#ff007f' : '#ffffff';
        ctx.lineWidth = curbThickness;

        // Left curb
        ctx.beginPath();
        ctx.moveTo(p1.x - nx * halfW, p1.y - ny * halfW);
        ctx.lineTo(p2.x - nx * halfW, p2.y - ny * halfW);
        ctx.stroke();

        // Right curb
        ctx.beginPath();
        ctx.moveTo(p1.x + nx * halfW, p1.y + ny * halfW);
        ctx.lineTo(p2.x + nx * halfW, p2.y + ny * halfW);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawNeonEdgeBorders(ctx) {
      const pts = this.centerline;
      const edgeDist = (CONFIG.trackWidth * 0.5) + CONFIG.curbWidth;

      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ff00a0';
      ctx.shadowColor = '#ff00a0';
      ctx.shadowBlur = 10;

      // Left edge
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        const dx = next.x - pts[i].x;
        const dy = next.y - pts[i].y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const ex = pts[i].x - nx * edgeDist;
        const ey = pts[i].y - ny * edgeDist;
        if (i === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.stroke();

      // Right edge
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        const dx = next.x - pts[i].x;
        const dy = next.y - pts[i].y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const ex = pts[i].x + nx * edgeDist;
        const ey = pts[i].y + ny * edgeDist;
        if (i === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }

    drawSkidMarks(ctx) {
      if (!this.skidMarks.length) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < this.skidMarks.length; i++) {
        const s = this.skidMarks[i];
        if (s.alpha <= 0.01) continue;

        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.lineWidth = s.width || 5;
        ctx.strokeStyle = `rgba(10, 5, 20, ${s.alpha.toFixed(3)})`;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawTrackDecorations(ctx) {
      // 1. Draw Checkered Finish / Start Line
      const sl = this.startLine;
      if (sl && sl.p1 && sl.p2) {
        ctx.save();
        ctx.translate(sl.center.x, sl.center.y);
        ctx.rotate(sl.angle + Math.PI * 0.5);

        const rows = 2;
        const cols = 14;
        const sqW = (CONFIG.trackWidth) / cols;
        const sqH = 12;

        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isWhite = (r + c) % 2 === 0;
            ctx.fillStyle = isWhite ? '#ffffff' : '#ff007f';
            ctx.fillRect(
              -CONFIG.trackWidth * 0.5 + c * sqW,
              -rows * sqH * 0.5 + r * sqH,
              sqW,
              sqH
            );
          }
        }
        ctx.restore();
      }

      // 2. Draw Checkpoint gates
      ctx.save();
      for (let i = 0; i < this.checkpoints.length; i++) {
        const cp = this.checkpoints[i];
        ctx.save();
        ctx.translate(cp.x, cp.y);
        ctx.rotate(cp.angle + Math.PI * 0.5);

        const halfW = CONFIG.trackWidth * 0.5;
        // Neon checkpoint pylons on side of track
        ctx.fillStyle = '#00ffe0';
        ctx.shadowColor = '#00ffe0';
        ctx.shadowBlur = 8;
        ctx.fillRect(-halfW - 8, -4, 6, 8);
        ctx.fillRect(halfW + 2, -4, 6, 8);
        ctx.restore();
      }
      ctx.restore();
    }

    drawParticles(ctx) {
      if (!this.particles.length) return;

      ctx.save();
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);

        if (p.type === 'spark') {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        } else {
          // Smoke puff
          ctx.shadowBlur = 0;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha * 0.45;
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // Expose singleton instance and class on window
  const instance = new TrackRenderer();
  window.TrackRenderer = instance;
  window.TrackRendererClass = TrackRenderer;

})();
