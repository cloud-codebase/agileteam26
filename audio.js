/**
 * audio.js - Retro Procedural Web Audio API Synthesizer
 * Space Invaders arcade style sounds without external audio assets.
 * Exposes window.AudioEngine
 */

(function () {
  'use strict';

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.masterGain = null;
      this.ufoOsc = null;
      this.ufoGain = null;
      this.ufoLfo = null;
      this.marchFrequencies = [174.61, 164.81, 155.56, 146.83]; // F3, E3, D#3, D3 classic bass march
    }

    _initContext() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setMuted(muted) {
      this.isMuted = !!muted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      }
    }

    toggleMute() {
      this.setMuted(!this.isMuted);
      return this.isMuted;
    }

    /**
     * Player firing high-pitch downward chirping laser
     */
    playShoot() {
      this._initContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.exponentialRampToValueAtTime(110.0, now + 0.18); // drop to A2

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.19);
    }

    /**
     * Short invader pop / zap
     */
    playInvaderKilled() {
      this._initContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.12);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.13);
    }

    /**
     * Player destroyed: dramatic noisy explosion with decaying low rumble
     */
    playPlayerExplosion() {
      this._initContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const duration = 0.8;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + duration);
    }

    /**
     * 4-step low pitch marching cadence: step between 0 and 3
     */
    playMarchBeat(step = 0) {
      this._initContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = this.marchFrequencies[step % this.marchFrequencies.length] || 160;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.08);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.09);
    }

    /**
     * Continuous pulsating sci-fi warble for mystery saucer (UFO)
     */
    playUfoSound() {
      this._initContext();
      if (!this.ctx || this.isMuted || this.ufoOsc) return;

      try {
        const now = this.ctx.currentTime;
        this.ufoOsc = this.ctx.createOscillator();
        this.ufoGain = this.ctx.createGain();
        this.ufoLfo = this.ctx.createOscillator();

        const lfoGain = this.ctx.createGain();
        this.ufoLfo.frequency.setValueAtTime(4.5, now); // 4.5 Hz vibrato
        lfoGain.gain.setValueAtTime(40, now); // +/- 40 Hz modulation

        this.ufoOsc.type = 'sawtooth';
        this.ufoOsc.frequency.setValueAtTime(320, now);

        this.ufoLfo.connect(lfoGain);
        lfoGain.connect(this.ufoOsc.frequency);

        this.ufoGain.gain.setValueAtTime(0.2, now);

        this.ufoOsc.connect(this.ufoGain);
        this.ufoGain.connect(this.masterGain);

        this.ufoLfo.start(now);
        this.ufoOsc.start(now);
      } catch (err) {
        console.warn('AudioEngine playUfoSound error:', err);
      }
    }

    stopUfoSound() {
      if (this.ufoOsc) {
        try {
          this.ufoOsc.stop();
          this.ufoOsc.disconnect();
          if (this.ufoLfo) {
            this.ufoLfo.stop();
            this.ufoLfo.disconnect();
          }
          if (this.ufoGain) {
            this.ufoGain.disconnect();
          }
        } catch (e) {
          // ignore
        }
        this.ufoOsc = null;
        this.ufoLfo = null;
        this.ufoGain = null;
      }
    }
  }

  window.AudioEngine = new AudioEngine();
})();
