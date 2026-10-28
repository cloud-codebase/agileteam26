/**
 * RetoSnake4k - audio.js
 * Procedural Web Audio API sound synthesis and cyber synth sound manager.
 * Exposes window.CyberAudio adhering to DESIGN.md
 */

(function () {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let isMuted = false;
  let arpInterval = null;
  let arpStep = 0;

  // Cyber synth pentatonic / cyber scale notes in Hz
  const ARP_NOTES = [110.0, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66]; // A2 minor pentatonic cyber scale

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const CyberAudio = {
    /**
     * Initializes the AudioContext on first user interaction.
     */
    init: function () {
      getAudioContext();
    },

    /**
     * Toggles master audio mute state.
     * @returns {boolean} Current muted state.
     */
    toggleMute: function () {
      isMuted = !isMuted;
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(isMuted ? 0 : 0.18, audioCtx.currentTime);
      }
      return isMuted;
    },

    /**
     * Returns true if audio is muted.
     */
    isMuted: function () {
      return isMuted;
    },

    /**
     * Plays procedural cyber sound effects.
     * @param {'eat' | 'powerup' | 'glitch' | 'death' | 'click'} type
     */
    playTone: function (type) {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      switch (type) {
        case 'eat': {
          // Cyber bite / data absorption: snappy frequency ramp up
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case 'powerup': {
          // Futuristic cyber power charging chime: rapid multi-tone arpeggio sweep
          const chord = [330, 440, 554.37, 659.25, 880];
          chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startT = now + idx * 0.05;
            const endT = startT + 0.25;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startT);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, endT);

            // Filter for warm analog synth texture
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2200, startT);

            gain.gain.setValueAtTime(0.2, startT);
            gain.gain.exponentialRampToValueAtTime(0.001, endT);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            osc.start(startT);
            osc.stop(endT);
          });
          break;
        }

        case 'glitch': {
          // Digital distortion / buffer overflow warning
          const bufferSize = ctx.sampleRate * 0.15;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (i % 8 < 4 ? 0.8 : -0.8);
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(800, now);
          filter.Q.setValueAtTime(3, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);

          noise.start(now);
          noise.stop(now + 0.15);
          break;
        }

        case 'death': {
          // Cyberpunk flatline / explosion descend
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.frequency.exponentialRampToValueAtTime(100, now + 0.6);

          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.65);
          break;
        }

        case 'click': {
          // Crisp terminal UI click / keypress
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        default:
          break;
      }
    },

    /**
     * Starts looping cyber arpeggio drone in background.
     */
    startArp: function () {
      if (arpInterval) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      arpStep = 0;
      arpInterval = setInterval(() => {
        if (isMuted) return;
        const currentCtx = getAudioContext();
        if (!currentCtx || currentCtx.state !== 'running') return;

        const noteFreq = ARP_NOTES[arpStep % ARP_NOTES.length];
        arpStep = (arpStep + 1) % ARP_NOTES.length;

        const now = currentCtx.currentTime;
        const osc = currentCtx.createOscillator();
        const gain = currentCtx.createGain();
        const filter = currentCtx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(noteFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800 + Math.sin(arpStep * 0.7) * 400, now);
        filter.Q.setValueAtTime(4, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.2);
      }, 180);
    },

    /**
     * Stops the looping cyber arpeggio.
     */
    stopArp: function () {
      if (arpInterval) {
        clearInterval(arpInterval);
        arpInterval = null;
      }
    }
  };

  window.CyberAudio = CyberAudio;
})();
