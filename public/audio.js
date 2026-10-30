/**
 * audio.js - Web Audio API Synthesizer for Retro Ski Jumps (DSJ / Małysz style)
 * Fully procedural retro sound effects:
 * - Wind noise / in-run whoosh (filtered white noise with dynamic pitch/gain)
 * - Takeoff snap (snappy punch & swoosh)
 * - Landing telemark thud
 * - Crash crunch & tumble
 * - Crowd applause / roar
 * - Fanfare trumpets (triumphant brass melody)
 */
(function() {
  'use strict';

  let audioCtx = null;
  let windSource = null;
  let windFilter = null;
  let windGain = null;
  let inRunOsc = null;
  let inRunGain = null;
  let isWindActive = false;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Create looped white noise buffer
  function createNoiseBuffer(ctx, duration = 2.0) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  const SkiAudio = {
    /**
     * Start / update dynamic wind & in-run whoosh sound.
     * @param {number} speed - velocity or wind intensity (0 to 100)
     */
    playWind(speed = 30) {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const normalizedSpeed = Math.max(0, Math.min(100, speed));

        if (!isWindActive || !windGain) {
          const noiseBuffer = createNoiseBuffer(ctx, 3.0);
          windSource = ctx.createBufferSource();
          windSource.buffer = noiseBuffer;
          windSource.loop = true;

          windFilter = ctx.createBiquadFilter();
          windFilter.type = 'bandpass';
          windFilter.frequency.setValueAtTime(300, ctx.currentTime);
          windFilter.Q.setValueAtTime(1.8, ctx.currentTime);

          windGain = ctx.createGain();
          windGain.gain.setValueAtTime(0.01, ctx.currentTime);

          windSource.connect(windFilter);
          windFilter.connect(windGain);
          windGain.connect(ctx.destination);

          windSource.start();
          isWindActive = true;
        }

        const targetFreq = 200 + normalizedSpeed * 12;
        const targetGain = Math.min(0.35, 0.04 + (normalizedSpeed / 100) * 0.28);

        if (windFilter && windGain) {
          windFilter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
          windGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
        }
      } catch (err) {
        console.warn('SkiAudio.playWind error:', err);
      }
    },

    /**
     * Stop wind audio smoothly
     */
    stopWind() {
      try {
        if (!audioCtx || !windGain || !isWindActive) return;
        windGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
        setTimeout(() => {
          if (windSource) {
            try { windSource.stop(); } catch (e) {}
            try { windSource.disconnect(); } catch (e) {}
            windSource = null;
          }
          isWindActive = false;
        }, 200);
      } catch (err) {
        console.warn('SkiAudio.stopWind error:', err);
      }
    },

    /**
     * In-run ski slide sound on icy track
     */
    playInRunWhoosh(speed = 50) {
      this.playWind(speed);
    },

    /**
     * Snappy takeoff pop & ski flick
     */
    playTakeoff() {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Snappy frequency drop oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);

        // White noise swoosh puff
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.2);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start();
        noise.stop(ctx.currentTime + 0.16);
      } catch (err) {
        console.warn('SkiAudio.playTakeoff error:', err);
      }
    },

    /**
     * Clean telemark landing sound - solid snow thud & ski slide
     */
    playLanding() {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Low frequency thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.6, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.26);

        // Snow spray whoosh
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.35);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start();
        noise.stop(ctx.currentTime + 0.36);
      } catch (err) {
        console.warn('SkiAudio.playLanding error:', err);
      }
    },

    /**
     * Crash crunch & ski rattle
     */
    playCrash() {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Discordant impact
        [140, 95, 62].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.4);

          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.03);
          osc.stop(ctx.currentTime + 0.5);
        });

        // Violent snow slide noise
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.7);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(700, ctx.currentTime);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start();
        noise.stop(ctx.currentTime + 0.7);
      } catch (err) {
        console.warn('SkiAudio.playCrash error:', err);
      }
    },

    /**
     * Retro crowd cheer / applause
     */
    playCheer() {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 2.2);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(0.9, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + 2.25);
      } catch (err) {
        console.warn('SkiAudio.playCheer error:', err);
      }
    },

    /**
     * 8-bit Trumpet Fanfare for podium & long jumps
     */
    playFanfare() {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const melody = [
          { note: 261.63, dur: 0.12, start: 0.0 },   // C4
          { note: 329.63, dur: 0.12, start: 0.13 },  // E4
          { note: 392.00, dur: 0.12, start: 0.26 },  // G4
          { note: 523.25, dur: 0.35, start: 0.39 },  // C5
          { note: 392.00, dur: 0.12, start: 0.76 },  // G4
          { note: 523.25, dur: 0.50, start: 0.89 }   // C5
        ];

        melody.forEach(item => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(item.note, ctx.currentTime + item.start);

          gain.gain.setValueAtTime(0, ctx.currentTime + item.start);
          gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + item.start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + item.start + item.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + item.start);
          osc.stop(ctx.currentTime + item.start + item.dur + 0.05);
        });
      } catch (err) {
        console.warn('SkiAudio.playFanfare error:', err);
      }
    }
  };

  window.SkiAudio = SkiAudio;
})();
