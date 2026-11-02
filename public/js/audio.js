/**
 * audio.js - Procedural Web Audio API Sound Effects Engine
 * Sprint 1.0 (SCRUM-174), Sprint 2.0 (SCRUM-178), Sprint 3.0 (SCRUM-182)
 *
 * Implements 100% synthetic audio for:
 * - FIS Electronic Starting Gate Beeps (playGateBeep('red'|'yellow'|'green')) [SCRUM-178]
 * - Mechanical Gate Latch & Push-off Release (playGateRelease()) [SCRUM-178]
 * - Synthesized Takeoff Timing Rating Chimes (playTakeoffRating(quality)) [SCRUM-182]
 * - Enhanced Takeoff Launch Whoosh & Ski Pop (playTakeoffLaunch()) [SCRUM-182]
 * - Wind gusts & ambient winter breeze
 * - Ski friction sliding whoosh on inrun tracks (speed-modulated)
 * - Takeoff impulse & launch whoosh
 * - Landing impact (smooth telemark vs solid landing vs crash)
 * - Stadium crowd applause & roar (scaled with jump score)
 * - World record / victory fanfare
 */

(function (window) {
  'use strict';

  var AudioContextClass = window.AudioContext || window.webkitAudioContext;

  var SkiAudio = {
    ctx: null,
    masterGain: null,
    isMuted: false,
    initialized: false,

    // Noise buffer for wind and ski sliding
    noiseBuffer: null,

    // Persistent inrun sliding node refs
    inrunGain: null,
    inrunFilter: null,
    inrunSource: null,

    // Wind ambient refs
    windGain: null,
    windFilter: null,
    windSource: null,

    /**
     * Initializes the Web Audio context on user gesture (click/keypress)
     */
    init: function () {
      if (this.initialized && this.ctx && this.ctx.state !== 'suspended') {
        return;
      }

      try {
        if (!this.ctx) {
          if (!AudioContextClass) {
            console.warn('[SkiAudio] Web Audio API not supported in this browser.');
            return;
          }
          this.ctx = new AudioContextClass();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);

          // Generate 3-second looping white/pink noise buffer
          this._createNoiseBuffer();
        }

        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }

        this.initialized = true;
      } catch (e) {
        console.warn('[SkiAudio] Failed to initialize AudioContext:', e);
      }
    },

    /**
     * Generates a mono procedural white noise audio buffer
     */
    _createNoiseBuffer: function () {
      if (!this.ctx) return;
      var bufferSize = this.ctx.sampleRate * 3.0; // 3 seconds
      var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      var output = buffer.getChannelData(0);

      // Filtered pinkish noise for warmer wind/friction
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      this.noiseBuffer = buffer;
    },

    /**
     * Toggles sound on/off
     */
    toggleMute: function () {
      this.isMuted = !this.isMuted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      }
      return this.isMuted;
    },

    /**
     * Authentic FIS electronic starting gate beeps (SCRUM-178).
     * Short 440Hz tone on Red and Yellow ('attention' / 'wait').
     * High 880Hz confirmation beep on Green ('go' / 'gate clear').
     * @param {string} type - 'red' | 'yellow' | 'green'
     */
    playGateBeep: function (type) {
      this.init();
      if (!this.ctx || this.isMuted) return;

      var now = this.ctx.currentTime;
      var isGreen = (type === 'green');

      var freq = isGreen ? 880 : 440;
      var duration = isGreen ? 0.22 : 0.12;

      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();

      osc.type = isGreen ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isGreen ? 0.32 : 0.24, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration + 0.02);

      if (isGreen) {
        var overtone = this.ctx.createOscillator();
        var overGain = this.ctx.createGain();
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(1760, now);

        overGain.gain.setValueAtTime(0.001, now);
        overGain.gain.linearRampToValueAtTime(0.12, now + 0.015);
        overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        overtone.connect(overGain);
        overGain.connect(this.masterGain);

        overtone.start(now);
        overtone.stop(now + 0.20);
      }
    },

    /**
     * Mechanical gate latch release & skier push-off sound (SCRUM-178).
     */
    playGateRelease: function () {
      this.init();
      if (!this.ctx || this.isMuted) return;

      var now = this.ctx.currentTime;

      // 1. Sharp metallic spring latch click
      var clickOsc = this.ctx.createOscillator();
      var clickGain = this.ctx.createGain();
      clickOsc.type = 'sawtooth';
      clickOsc.frequency.setValueAtTime(1400, now);
      clickOsc.frequency.exponentialRampToValueAtTime(220, now + 0.06);

      clickGain.gain.setValueAtTime(0.35, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);

      clickOsc.start(now);
      clickOsc.stop(now + 0.08);

      // 2. Mechanical clunk resonance
      var clunkOsc = this.ctx.createOscillator();
      var clunkGain = this.ctx.createGain();
      clunkOsc.type = 'triangle';
      clunkOsc.frequency.setValueAtTime(320, now + 0.02);
      clunkOsc.frequency.exponentialRampToValueAtTime(95, now + 0.14);

      clunkGain.gain.setValueAtTime(0.001, now);
      clunkGain.gain.setValueAtTime(0.4, now + 0.02);
      clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      clunkOsc.connect(clunkGain);
      clunkGain.connect(this.masterGain);

      clunkOsc.start(now + 0.02);
      clunkOsc.stop(now + 0.18);

      // 3. Crisp snow push-off scrape
      if (this.noiseBuffer) {
        var scrape = this.ctx.createBufferSource();
        scrape.buffer = this.noiseBuffer;

        var scrapeFilter = this.ctx.createBiquadFilter();
        scrapeFilter.type = 'bandpass';
        scrapeFilter.frequency.setValueAtTime(1200, now + 0.01);
        scrapeFilter.Q.setValueAtTime(2.5, now + 0.01);

        var scrapeGain = this.ctx.createGain();
        scrapeGain.gain.setValueAtTime(0.001, now);
        scrapeGain.gain.linearRampToValueAtTime(0.28, now + 0.03);
        scrapeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        scrape.connect(scrapeFilter);
        scrapeFilter.connect(scrapeGain);
        scrapeGain.connect(this.masterGain);

        scrape.start(now);
        scrape.stop(now + 0.16);
      }
    },

    /**
     * Synthesized Web Audio timing rating chimes (SCRUM-182).
     * High pitch sparkling chime for PERFECT, melodic major triad for GREAT/GOOD,
     * dull descending tone for EARLY/LATE, low buzzer thud for MISSED.
     * @param {string} quality - 'PERFECT' | 'GREAT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISSED'
     */
    playTakeoffRating: function (quality) {
      this.init();
      if (!this.ctx || this.isMuted) return;

      var now = this.ctx.currentTime;
      var q = (quality || '').toUpperCase();

      if (q.indexOf('PERFECT') !== -1) {
        // High sparkling dual-chime arpeggio (E6 -> G#6 -> B6) with sparkling bell sheen
        var notes = [1318.5, 1661.2, 1975.5];
        for (var i = 0; i < notes.length; i++) {
          var t = now + (i * 0.06);
          var osc = this.ctx.createOscillator();
          var gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(notes[i], t);

          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(0.24, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.30);
        }
      } else if (q.indexOf('GREAT') !== -1 || q.indexOf('GOOD') !== -1) {
        // Melodic cheerful double chime (C6 -> E6)
        var greatNotes = [1046.5, 1318.5];
        for (var j = 0; j < greatNotes.length; j++) {
          var tg = now + (j * 0.08);
          var oscG = this.ctx.createOscillator();
          var gainG = this.ctx.createGain();
          oscG.type = 'sine';
          oscG.frequency.setValueAtTime(greatNotes[j], tg);

          gainG.gain.setValueAtTime(0.001, tg);
          gainG.gain.linearRampToValueAtTime(0.20, tg + 0.015);
          gainG.gain.exponentialRampToValueAtTime(0.001, tg + 0.22);

          oscG.connect(gainG);
          gainG.connect(this.masterGain);
          oscG.start(tg);
          oscG.stop(tg + 0.24);
        }
      } else if (q.indexOf('EARLY') !== -1 || q.indexOf('LATE') !== -1) {
        // Dull descending two-tone warning blip (A4 -> F4)
        var warnNotes = [440.0, 349.2];
        for (var k = 0; k < warnNotes.length; k++) {
          var tw = now + (k * 0.09);
          var oscW = this.ctx.createOscillator();
          var gainW = this.ctx.createGain();
          oscW.type = 'triangle';
          oscW.frequency.setValueAtTime(warnNotes[k], tw);

          gainW.gain.setValueAtTime(0.001, tw);
          gainW.gain.linearRampToValueAtTime(0.18, tw + 0.015);
          gainW.gain.exponentialRampToValueAtTime(0.001, tw + 0.16);

          oscW.connect(gainW);
          gainW.connect(this.masterGain);
          oscW.start(tw);
          oscW.stop(tw + 0.18);
        }
      } else {
        // MISSED: low hollow slide thud (220Hz down to 110Hz)
        var oscM = this.ctx.createOscillator();
        var gainM = this.ctx.createGain();
        oscM.type = 'sawtooth';
        oscM.frequency.setValueAtTime(220, now);
        oscM.frequency.exponentialRampToValueAtTime(90, now + 0.18);

        gainM.gain.setValueAtTime(0.001, now);
        gainM.gain.linearRampToValueAtTime(0.18, now + 0.01);
        gainM.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        oscM.connect(gainM);
        gainM.connect(this.masterGain);
        oscM.start(now);
        oscM.stop(now + 0.24);
      }
    },

    /**
     * Enhanced satisfying dynamic air whoosh + ski pop at takeoff (SCRUM-182).
     */
    playTakeoffLaunch: function () {
      this.init();
      if (!this.ctx || this.isMuted) return;

      this.stopInrunWhoosh();
      var now = this.ctx.currentTime;

      // 1. Explosive kick spring impulse (bass pop + resonator)
      var osc = this.ctx.createOscillator();
      var oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);

      oscGain.gain.setValueAtTime(0.55, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.26);

      // 2. High-speed ski edge release 'pop'
      var edgeOsc = this.ctx.createOscillator();
      var edgeGain = this.ctx.createGain();
      edgeOsc.type = 'triangle';
      edgeOsc.frequency.setValueAtTime(880, now);
      edgeOsc.frequency.exponentialRampToValueAtTime(240, now + 0.08);

      edgeGain.gain.setValueAtTime(0.32, now);
      edgeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      edgeOsc.connect(edgeGain);
      edgeGain.connect(this.masterGain);

      edgeOsc.start(now);
      edgeOsc.stop(now + 0.10);

      // 3. Dynamic launch whoosh air puff (expanding resonant bandpass noise)
      if (this.noiseBuffer) {
        var noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        var filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(260, now);
        filter.frequency.exponentialRampToValueAtTime(1800, now + 0.09);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.40);
        filter.Q.setValueAtTime(2.6, now);

        var noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.48, now + 0.06);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.44);
      }
    },

    /**
     * Backward-compatible alias for playTakeoff
     */
    playTakeoff: function () {
      this.playTakeoffLaunch();
    },

    /**
     * Plays or updates the ski inrun track sliding whoosh.
     * Speed is in km/h (0 to 110)
     */
    playInrunWhoosh: function (speed) {
      this.init();
      if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

      var now = this.ctx.currentTime;
      var normalizedSpeed = Math.max(0, Math.min(1.0, (speed || 0) / 95));

      if (!this.inrunSource) {
        var source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        source.loop = true;

        var filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(1.8, now);

        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start(now);

        this.inrunSource = source;
        this.inrunFilter = filter;
        this.inrunGain = gain;
      }

      if (this.inrunFilter && this.inrunGain) {
        var targetFreq = 400 + normalizedSpeed * 1800;
        var targetVol = normalizedSpeed * 0.38;

        this.inrunFilter.frequency.cancelScheduledValues(now);
        this.inrunFilter.frequency.linearRampToValueAtTime(targetFreq, now + 0.1);

        this.inrunGain.gain.cancelScheduledValues(now);
        this.inrunGain.gain.linearRampToValueAtTime(targetVol, now + 0.1);
      }
    },

    /**
     * Stops the inrun sliding noise (e.g. at takeoff)
     */
    stopInrunWhoosh: function () {
      if (this.inrunGain && this.ctx) {
        var now = this.ctx.currentTime;
        this.inrunGain.gain.cancelScheduledValues(now);
        this.inrunGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);

        var self = this;
        setTimeout(function () {
          if (self.inrunSource) {
            try {
              self.inrunSource.stop();
              self.inrunSource.disconnect();
            } catch (e) {}
            self.inrunSource = null;
            self.inrunFilter = null;
            self.inrunGain = null;
          }
        }, 100);
      }
    },

    /**
     * Modulates ambient flight wind based on skier air speed and pitch
     */
    playFlightWind: function (speed, lean) {
      this.init();
      if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

      var now = this.ctx.currentTime;
      var normalizedSpeed = Math.max(0, Math.min(1.2, (speed || 0) / 100));

      if (!this.windSource) {
        var source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        source.loop = true;

        var filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start(now);

        this.windSource = source;
        this.windFilter = filter;
        this.windGain = gain;
      }

      if (this.windFilter && this.windGain) {
        var freq = 600 + normalizedSpeed * 1000 + (lean || 0) * 300;
        var vol = 0.12 + normalizedSpeed * 0.22;

        this.windFilter.frequency.setTargetAtTime(Math.max(300, freq), now, 0.1);
        this.windGain.gain.setTargetAtTime(Math.min(0.4, vol), now, 0.1);
      }
    },

    /**
     * Stops the flight wind ambient
     */
    stopFlightWind: function () {
      if (this.windGain && this.ctx) {
        var now = this.ctx.currentTime;
        this.windGain.gain.cancelScheduledValues(now);
        this.windGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);

        var self = this;
        setTimeout(function () {
          if (self.windSource) {
            try {
              self.windSource.stop();
              self.windSource.disconnect();
            } catch (e) {}
            self.windSource = null;
            self.windFilter = null;
            self.windGain = null;
          }
        }, 150);
      }
    },

    /**
     * Landing sound effect:
     * - Telemark: crisp snow-slash slap and hiss
     * - Two-footed: solid thud
     * - Crash: heavy crunching impact, slide and tumble
     */
    playLanding: function (isTelemark, isCrash) {
      this.init();
      if (!this.ctx || this.isMuted) return;

      this.stopFlightWind();
      var now = this.ctx.currentTime;

      if (isCrash) {
        var crashOsc = this.ctx.createOscillator();
        var crashGain = this.ctx.createGain();
        crashOsc.type = 'sawtooth';
        crashOsc.frequency.setValueAtTime(90, now);
        crashOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

        crashGain.gain.setValueAtTime(0.65, now);
        crashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        crashOsc.connect(crashGain);
        crashGain.connect(this.masterGain);
        crashOsc.start(now);
        crashOsc.stop(now + 0.48);

        if (this.noiseBuffer) {
          var snowNoise = this.ctx.createBufferSource();
          snowNoise.buffer = this.noiseBuffer;

          var crunchFilter = this.ctx.createBiquadFilter();
          crunchFilter.type = 'lowpass';
          crunchFilter.frequency.setValueAtTime(700, now);
          crunchFilter.frequency.linearRampToValueAtTime(150, now + 0.55);

          var snowGain = this.ctx.createGain();
          snowGain.gain.setValueAtTime(0.7, now);
          snowGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

          snowNoise.connect(crunchFilter);
          crunchFilter.connect(snowGain);
          snowGain.connect(this.masterGain);

          snowNoise.start(now);
          snowNoise.stop(now + 0.65);
        }

        this.playCrowdMurmur();
      } else {
        var landOsc = this.ctx.createOscillator();
        var landGain = this.ctx.createGain();
        landOsc.type = 'triangle';
        landOsc.frequency.setValueAtTime(110, now);
        landOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        landGain.gain.setValueAtTime(isTelemark ? 0.35 : 0.5, now);
        landGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        landOsc.connect(landGain);
        landGain.connect(this.masterGain);
        landOsc.start(now);
        landOsc.stop(now + 0.2);

        if (this.noiseBuffer) {
          var carve = this.ctx.createBufferSource();
          carve.buffer = this.noiseBuffer;

          var carveFilter = this.ctx.createBiquadFilter();
          carveFilter.type = 'bandpass';
          carveFilter.frequency.setValueAtTime(isTelemark ? 1800 : 900, now);
          carveFilter.Q.setValueAtTime(2.0, now);

          var carveGain = this.ctx.createGain();
          carveGain.gain.setValueAtTime(0.5, now);
          carveGain.gain.exponentialRampToValueAtTime(0.01, now + (isTelemark ? 0.32 : 0.22));

          carve.connect(carveFilter);
          carveFilter.connect(carveGain);
          carveGain.connect(this.masterGain);

          carve.start(now);
          carve.stop(now + 0.35);
        }
      }
    },

    /**
     * Procedural crowd applause and stadium roar
     */
    playCrowdCheer: function (intensity) {
      this.init();
      if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

      var now = this.ctx.currentTime;
      var level = Math.max(0.15, Math.min(1.0, intensity || 0.6));

      var roar = this.ctx.createBufferSource();
      roar.buffer = this.noiseBuffer;

      var roarFilter = this.ctx.createBiquadFilter();
      roarFilter.type = 'bandpass';
      roarFilter.frequency.setValueAtTime(500, now);
      roarFilter.frequency.linearRampToValueAtTime(850, now + 0.6);
      roarFilter.Q.setValueAtTime(1.2, now);

      var roarGain = this.ctx.createGain();
      roarGain.gain.setValueAtTime(0.001, now);
      roarGain.gain.linearRampToValueAtTime(0.35 * level, now + 0.5);
      roarGain.gain.exponentialRampToValueAtTime(0.01, now + 2.4);

      roar.connect(roarFilter);
      roarFilter.connect(roarGain);
      roarGain.connect(this.masterGain);

      roar.start(now);
      roar.stop(now + 2.5);

      var clap = this.ctx.createBufferSource();
      clap.buffer = this.noiseBuffer;

      var clapFilter = this.ctx.createBiquadFilter();
      clapFilter.type = 'highpass';
      clapFilter.frequency.setValueAtTime(1600, now);

      var clapGain = this.ctx.createGain();
      clapGain.gain.setValueAtTime(0.001, now);
      clapGain.gain.linearRampToValueAtTime(0.28 * level, now + 0.3);
      clapGain.gain.exponentialRampToValueAtTime(0.01, now + 2.2);

      clap.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(this.masterGain);

      clap.start(now);
      clap.stop(now + 2.3);
    },

    /**
     * Disappointed crowd groan on crashes
     */
    playCrowdMurmur: function () {
      this.init();
      if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

      var now = this.ctx.currentTime;

      var murmur = this.ctx.createBufferSource();
      murmur.buffer = this.noiseBuffer;

      var filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.linearRampToValueAtTime(280, now + 0.8);

      var gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      murmur.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      murmur.start(now);
      murmur.stop(now + 1.3);
    },

    /**
     * Retro 8-bit brass victory fanfare on record / big jumps
     */
    playFanfare: function () {
      this.init();
      if (!this.ctx || this.isMuted) return;

      var now = this.ctx.currentTime;
      var notes = [523.25, 659.25, 783.99, 1046.50];
      var noteDur = 0.11;

      for (var i = 0; i < notes.length; i++) {
        var startTime = now + i * noteDur;
        var dur = (i === notes.length - 1) ? 0.45 : noteDur * 0.9;

        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i], startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + dur + 0.05);
      }
    },

    /**
     * UI click button blip
     */
    playClick: function () {
      this.init();
      if (!this.ctx || this.isMuted) return;

      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.07);
    }
  };

  window.SkiAudio = SkiAudio;
})(typeof window !== 'undefined' ? window : global);
