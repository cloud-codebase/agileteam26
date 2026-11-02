/**
 * audio.js - Retro 2000s Web Audio API Synthesizer (DSJ2 inspired)
 * Procedural real-time retro ski jump sound effects with ZERO external audio files:
 * - Start gate beep sequence
 * - Inrun ski vibration / icy track hum
 * - Takeoff pop / spring impulse
 * - Flight whoosh & atmospheric wind gust
 * - Telemark landing snap & two-foot landing slap
 * - Skier crash / tumbling noise
 * - Stadium crowd cheering & fanfare
 */
(function() {
  'use strict';

  class RetroSkiAudio {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.inrunOsc = null;
      this.inrunGain = null;
      this.windGain = null;
      this.windSource = null;
      this.noiseBuffer = null;
    }

    init() {
      if (this.ctx) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('[SkiAudio] Web Audio API is not supported in this browser.');
        return;
      }
      this.ctx = new AudioContextClass();
      this.createNoiseBuffer();
    }

    ensureContext() {
      if (!this.ctx) {
        this.init();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    createNoiseBuffer() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of white noise
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.isMuted) {
        this.stopInRun();
        this.stopWind();
      }
      return this.isMuted;
    }

    /**
     * Start gate electronic ready beep (classic FIS double beep)
     */
    playGateBeep() {
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now); // A5 beep
      osc.frequency.setValueAtTime(1760, now + 0.12); // High beep

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0.0, now + 0.08);
      gain.gain.setValueAtTime(0.18, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    }

    /**
     * In-run ski glide hum (accelerating frequency & rumble along the ice inrun)
     */
    playInRun() {
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;

      this.stopInRun();

      const now = this.ctx.currentTime;
      // Filtered noise + low sine harmonic for icy ski friction
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(240, now);
        filter.frequency.exponentialRampToValueAtTime(850, now + 2.5); // pitches up with speed

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 2.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
        this.inrunOsc = noise;
        this.inrunGain = gain;
      }
    }

    stopInRun() {
      if (this.inrunGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.inrunGain.gain.cancelScheduledValues(now);
        this.inrunGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        setTimeout(() => {
          if (this.inrunOsc) {
            try { this.inrunOsc.stop(); } catch (e) {}
            this.inrunOsc = null;
          }
        }, 60);
      }
    }

    /**
     * Takeoff impulse pop (crisp spring off the edge of the lip)
     */
    playTakeoff() {
      this.stopInRun();
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.15); // punchy downward pop

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);

      // Trigger ambient flight air stream
      this.playWind();
    }

    /**
     * Atmospheric flight wind / whoosh
     */
    playWind() {
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx || !this.noiseBuffer) return;

      this.stopWind();

      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.linearRampToValueAtTime(600, now + 1.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      this.windSource = noise;
      this.windGain = gain;
    }

    stopWind() {
      if (this.windGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.windGain.gain.cancelScheduledValues(now);
        this.windGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        setTimeout(() => {
          if (this.windSource) {
            try { this.windSource.stop(); } catch (e) {}
            this.windSource = null;
          }
        }, 120);
      }
    }

    /**
     * Telemark Landing: Crisp, snappy snow slice with triumphant high accent
     */
    playTelemark() {
      this.stopWind();
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Crisp snow impact snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);

      // 2. High chime tone for telemark perfection
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(987.77, now + 0.05); // B5 note
      chimeGain.gain.setValueAtTime(0.15, now + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      chime.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chime.start(now + 0.05);
      chime.stop(now + 0.38);
    }

    /**
     * Two-Foot Landing: Heavy slap on snow
     */
    playTwoFoot() {
      this.stopWind();
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    /**
     * Crash sound: Harsh wooden ski splinter & tumbling impact
     */
    playCrash() {
      this.stopWind();
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Noise burst for ski snap
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.5);
      }

      // 2. Heavy thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }

    /**
     * Stadium crowd roar & brass fanfare chord
     */
    playCrowdCheer() {
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Retro Crowd Roar using shaped filtered noise
      if (this.noiseBuffer) {
        const crowd = this.ctx.createBufferSource();
        crowd.buffer = this.noiseBuffer;
        crowd.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.Q.setValueAtTime(1.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.4);
        gain.gain.linearRampToValueAtTime(0.25, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        crowd.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        crowd.start(now);
        crowd.stop(now + 2.3);
      }

      // 2. Victory Arpeggio (Fanfare: C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const noteStart = now + idx * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.18, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.4);
      });
    }
  }

  // Export to global window as window.SkiAudio matching DESIGN.md
  const audioInstance = new RetroSkiAudio();
  window.SkiAudio = audioInstance;

  // Attempt auto-init on first user gesture anywhere
  const unlockAudio = () => {
    audioInstance.ensureContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);

})();
