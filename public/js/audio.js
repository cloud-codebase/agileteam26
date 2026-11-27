/**
 * Retro Drift Race - Web Audio Procedural Sound FX Synthesizer
 * Module: public/js/audio.js
 * Author: Athos (Senior Full-Stack Developer - Wave 2 / SCRUM-203)
 *
 * Implements window.RetroAudio adhering to DESIGN.md:
 * - init()
 * - playEngine(speedRatio, throttle)
 * - playDriftScreech(intensity)
 * - playScoreBank()
 * - playCrash()
 * - playCheckpoint()
 * - toggleMute()
 * - isMuted()
 */

(function (window) {
  'use strict';

  class RetroAudioSystem {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.isMutedState = false;
      this.initialized = false;

      // Engine synthesis nodes
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineGain = null;
      this.engineFilter = null;
      this.engineRunning = false;

      // Tire screech noise nodes
      this.screechSource = null;
      this.screechFilter = null;
      this.screechGain = null;
      this.screechRunning = false;
      this.noiseBuffer = null;

      // Master volume setting
      this.masterVolume = 0.5;
    }

    /**
     * Lazy init AudioContext upon user gesture
     */
    init() {
      if (this.initialized && this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return this;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported in this browser environment');
        return this;
      }

      try {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMutedState ? 0 : this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this._createWhiteNoiseBuffer();
        this._setupEngineSynth();
        this._setupScreechSynth();

        this.initialized = true;
      } catch (err) {
        console.warn('Failed to initialize AudioContext:', err);
      }

      return this;
    }

    _createWhiteNoiseBuffer() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise loop
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        // Pink-ish filtered noise for tire friction
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut * 0.94) + (white * 0.06);
        data[i] = (lastOut * 3.5) + (white * 0.15);
      }
      this.noiseBuffer = buffer;
    }

    _setupEngineSynth() {
      if (!this.ctx || !this.masterGain) return;

      // Dual sawtooth / triangle oscillators with resonant low-pass filter
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'triangle';

      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
      this.engineOsc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineRunning = true;
    }

    _setupScreechSynth() {
      if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

      this.screechSource = this.ctx.createBufferSource();
      this.screechSource.buffer = this.noiseBuffer;
      this.screechSource.loop = true;

      this.screechFilter = this.ctx.createBiquadFilter();
      this.screechFilter.type = 'bandpass';
      this.screechFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
      this.screechFilter.Q.setValueAtTime(4.2, this.ctx.currentTime);

      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      this.screechSource.connect(this.screechFilter);
      this.screechFilter.connect(this.screechGain);
      this.screechGain.connect(this.masterGain);

      this.screechSource.start();
      this.screechRunning = true;
    }

    /**
     * Modulate engine pitch and volume based on speed and throttle
     * @param {number} speedRatio Normalized 0.0 to 1.0+
     * @param {boolean} isThrottlePressed
     */
    playEngine(speedRatio = 0, isThrottlePressed = false) {
      if (!this.initialized || !this.ctx || this.isMutedState) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const clampedSpeed = Math.max(0, Math.min(speedRatio, 1.2));
      const now = this.ctx.currentTime;

      // Base idle at 40Hz up to 260Hz redline
      const baseFreq = 42 + (clampedSpeed * 180) + (isThrottlePressed ? 28 : 0);
      const filterFreq = 260 + (clampedSpeed * 850) + (isThrottlePressed ? 200 : 0);
      const targetGain = 0.08 + (clampedSpeed * 0.16) + (isThrottlePressed ? 0.05 : 0);

      if (this.engineOsc1 && this.engineOsc2 && this.engineFilter && this.engineGain) {
        this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);
      }
    }

    /**
     * Modulate tire screech sound during drift or hard braking
     * @param {number} intensity Normalized 0.0 to 1.0
     */
    playDriftScreech(intensity = 0) {
      if (!this.initialized || !this.ctx || this.isMutedState) return;

      const clamped = Math.max(0, Math.min(intensity, 1.0));
      const now = this.ctx.currentTime;

      if (this.screechGain && this.screechFilter) {
        if (clamped > 0.05) {
          // Modulate bandpass frequency higher with intensity
          const freq = 900 + clamped * 1200;
          this.screechFilter.frequency.setTargetAtTime(freq, now, 0.03);
          const screechVol = clamped * 0.28;
          this.screechGain.gain.setTargetAtTime(screechVol, now, 0.04);
        } else {
          this.screechGain.gain.setTargetAtTime(0.0001, now, 0.08);
        }
      }
    }

    /**
     * Retro 80s arcade combo chime (arpeggio / chord) when drift is banked into score
     * @param {number} comboMultiplier Current combo level for higher pitch
     */
    playScoreBank(comboMultiplier = 1) {
      if (!this.initialized || !this.ctx || this.isMutedState) return;

      const now = this.ctx.currentTime;
      const baseFreq = Math.min(440 * (1 + (comboMultiplier - 1) * 0.12), 1200);

      // Play 3 rapid rising synth notes
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.06 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    }

    /**
     * Deep punchy retro collision thud
     */
    playCrash() {
      if (!this.initialized || !this.ctx || this.isMutedState) return;

      const now = this.ctx.currentTime;

      // Low pitch drop oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.3);

      // Noise burst for crunch impact
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.setValueAtTime(350, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.4, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.24);
      }
    }

    /**
     * High synth blip when crossing track checkpoints
     */
    playCheckpoint() {
      if (!this.initialized || !this.ctx || this.isMutedState) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.06);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.18);
    }

    /**
     * Mute or unmute all synthesized sound
     */
    toggleMute() {
      this.isMutedState = !this.isMutedState;
      if (this.masterGain && this.ctx) {
        const target = this.isMutedState ? 0 : this.masterVolume;
        this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
      }
      return this.isMutedState;
    }

    isMuted() {
      return this.isMutedState;
    }
  }

  // Expose singleton on window.RetroAudio
  window.RetroAudio = new RetroAudioSystem();

})(typeof window !== 'undefined' ? window : globalThis);
