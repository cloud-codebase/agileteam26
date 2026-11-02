/**
 * audio.js - Procedural Web Audio API Sound Effects Engine
 * Sprint 1.0 (SCRUM-174)
 *
 * Implements 100% synthetic audio for:
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
     * Plays or updates the ski inrun track sliding whoosh.
     * Speed is in km/h (0 to 110)
     */
    playInrunWhoosh: function (speed) {
      this.init();
      if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

      var now = this.ctx.currentTime;
      var normalizedSpeed = Math.max(0, Math.min(1.0, (speed || 0) / 95));

      if (!this.inrunSource) {
        // Build looped inrun sliding noise generator
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

      // Modulate frequency and volume based on speed
      if (this.inrunFilter && this.inrunGain) {
        var targetFreq = 400 + normalizedSpeed * 1800; // 400Hz up to 2200Hz
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
     * Takeoff impulse sound: deep pop + sharp resonant rush of air
     */
    playTakeoff: function () {
      this.init();
      if (!this.ctx || this.isMuted) return;

      this.stopInrunWhoosh();
      var now = this.ctx.currentTime;

      // 1. Kick impulse (oscillator pitch drop)
      var osc = this.ctx.createOscillator();
      var oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

      oscGain.gain.setValueAtTime(0.45, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);

      // 2. Launch whoosh air puff
      if (this.noiseBuffer) {
        var noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        var filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
        filter.frequency.exponentialRampToValueAtTime(250, now + 0.35);
        filter.Q.setValueAtTime(2.2, now);

        var noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.38);
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
        // High speed or forward pitch creates higher wind hiss
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
        // Crash sound: distorted sub thud + noisy crunch + rattling pitch drop
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

        // Snow crunch blast
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

        // Groan / disappointment crowd murmur
        this.playCrowdMurmur();
      } else {
        // Successful landing
        // Thud
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

        // Snow carve hiss
        if (this.noiseBuffer) {
          var carve = this.ctx.createBufferSource();
          carve.buffer = this.noiseBuffer;

          var carveFilter = this.ctx.createBiquadFilter();
          carveFilter.type = 'bandpass';
          // Telemark is sharper and crisper
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
     * Intensity is scaled from 0 (quiet) to 1.0 (stadium explosion)
     */
    playCrowdCheer: function (intensity) {
      this.init();
      if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

      var now = this.ctx.currentTime;
      var level = Math.max(0.15, Math.min(1.0, intensity || 0.6));

      // Layer 1: Stadium roar (filtered low noise surge)
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

      // Layer 2: Shimmering clapping applause (higher frequency band with mild tremolo)
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
      // Arpeggio notes: C5, E5, G5, C6
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
