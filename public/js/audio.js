/**
 * SkiAudio - Deluxe Ski Jump / Zakopane Polish Fan Horn & Atmospheric Synthesizers
 * Implemented with pure Web Audio API (oscillators, white noise, and envelope filters).
 * Complies strictly with DESIGN.md: window.SkiAudio
 */
(function(window) {
  'use strict';

  const SkiAudio = {
    ctx: null,
    isMuted: false,
    windGain: null,
    windSource: null,
    inrunGain: null,
    inrunSource: null,
    initialized: false,

    // Initialize AudioContext on first user interaction
    init: function() {
      if (this.initialized && this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        return;
      }

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          console.warn('[SkiAudio] Web Audio API is not supported in this browser.');
          return;
        }
        this.ctx = new AudioContext();
        this.initialized = true;

        // Setup continuous wind noise generator
        this._setupWindSynth();
        // Setup in-run track rumble generator
        this._setupInrunSynth();

        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      } catch (err) {
        console.warn('[SkiAudio] AudioContext init error:', err);
      }
    },

    toggleMute: function() {
      this.isMuted = !this.isMuted;
      if (this.windGain) {
        this.windGain.gain.setValueAtTime(this.isMuted ? 0 : 0.05, this.ctx ? this.ctx.currentTime : 0);
      }
      return this.isMuted;
    },

    setMute: function(muted) {
      this.isMuted = !!muted;
      if (this.windGain && this.ctx) {
        this.windGain.gain.setValueAtTime(this.isMuted ? 0 : 0.05, this.ctx.currentTime);
      }
    },

    // Play named sound effects
    play: function(soundName) {
      if (this.isMuted) return;
      if (!this.initialized || !this.ctx) {
        this.init();
      }
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;

      switch (soundName) {
        case 'gate':
          this._playGateBeep(now);
          break;
        case 'inrun':
          this._startInrunRumble();
          break;
        case 'takeoff':
          this._stopInrunRumble();
          this._playTakeoffSwoosh(now);
          break;
        case 'telemark':
          this._playTelemarkChime(now);
          break;
        case 'crash':
          this._stopInrunRumble();
          this._playCrashImpact(now);
          break;
        case 'trumpet':
          // Polish fan stadium horn / trumpet ("Polska, Biało-Czerwoni!" fanfare)
          this._playStadiumTrumpet(now);
          break;
        case 'cheer':
          this._playCrowdCheer(now);
          break;
        case 'wind':
          // Wind is active ambiently; adjust surge
          this._surgeWind(now);
          break;
        case 'record':
          this._playRecordFanfare(now);
          break;
        default:
          console.warn('[SkiAudio] Unknown sound:', soundName);
      }
    },

    // 1. Starting Gate Triple Beep (Classic FIS Start Lights)
    _playGateBeep: function(startTime) {
      const freqs = [520, 520, 880];
      const intervals = [0, 0.28, 0.56];

      intervals.forEach((delay, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[idx], startTime + delay);

        gain.gain.setValueAtTime(0.001, startTime + delay);
        gain.gain.linearRampToValueAtTime(idx === 2 ? 0.35 : 0.22, startTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + delay + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime + delay);
        osc.stop(startTime + delay + 0.22);
      });
    },

    // 2. Takeoff Swoosh Impulse
    _playTakeoffSwoosh: function(now) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.25);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(2400, now + 0.15);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    },

    // 3. Telemark Chime / Crisp landing snap
    _playTelemarkChime: function(now) {
      // Crisp ski snap on snow
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(660, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    },

    // 4. Crash Impact & Clatter
    _playCrashImpact: function(now) {
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.linearRampToValueAtTime(80, now + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    },

    // 5. Polish Fan Stadium Horn / Trumpet (Vuvuzela / Trąbka Małyszomania)
    _playStadiumTrumpet: function(now) {
      // Classic Polish ski jumping horn pattern: C4 -> E4 -> G4 -> C5
      const notes = [261.63, 329.63, 392.00, 523.25];
      const durations = [0.18, 0.18, 0.18, 0.45];
      let offset = 0;

      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Sawtooth with lowpass filter replicates brass trumpet
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + offset);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now + offset);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.26, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + durations[i]);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + durations[i] + 0.05);

        offset += durations[i] * 0.9;
      });
    },

    // 6. Record Fanfare
    _playRecordFanfare: function(now) {
      const chords = [
        [392.0, 493.88, 587.33], // G major
        [440.0, 554.37, 659.25], // A major
        [523.25, 659.25, 783.99] // C major triumphant
      ];
      chords.forEach((chord, step) => {
        chord.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + step * 0.22);

          gain.gain.setValueAtTime(0.001, now + step * 0.22);
          gain.gain.linearRampToValueAtTime(0.2, now + step * 0.22 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + step * 0.22 + 0.45);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + step * 0.22);
          osc.stop(now + step * 0.22 + 0.5);
        });
      });
    },

    // 7. Stadium Crowd Roar
    _playCrowdCheer: function(now) {
      const bufferSize = this.ctx.sampleRate * 1.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(540, now);
      filter.Q.setValueAtTime(1.8, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    },

    // Wind Synth Setup (Continuous pink noise through bandpass)
    _setupWindSynth: function() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Pinkish noise
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.12;
      }

      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = buffer;
      this.windSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(380, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.windSource.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(this.ctx.destination);

      this.windSource.start();
    },

    _surgeWind: function(now) {
      if (!this.windGain || this.isMuted) return;
      this.windGain.gain.cancelScheduledValues(now);
      this.windGain.gain.setValueAtTime(this.windGain.gain.value, now);
      this.windGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
      this.windGain.gain.linearRampToValueAtTime(0.04, now + 1.2);
    },

    // In-Run Ice Rumble Synth Setup
    _setupInrunSynth: function() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.inrunSource = this.ctx.createBufferSource();
      this.inrunSource.buffer = buffer;
      this.inrunSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, this.ctx.currentTime);

      this.inrunGain = this.ctx.createGain();
      this.inrunGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.inrunSource.connect(filter);
      filter.connect(this.inrunGain);
      this.inrunGain.connect(this.ctx.destination);

      this.inrunSource.start();
    },

    _startInrunRumble: function() {
      if (!this.inrunGain || this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.inrunGain.gain.cancelScheduledValues(now);
      this.inrunGain.gain.linearRampToValueAtTime(0.24, now + 0.15);
    },

    _stopInrunRumble: function() {
      if (!this.inrunGain || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.inrunGain.gain.cancelScheduledValues(now);
      this.inrunGain.gain.linearRampToValueAtTime(0, now + 0.08);
    }
  };

  window.SkiAudio = SkiAudio;
})(typeof window !== 'undefined' ? window : this);
