/**
 * AudioFX - Web Audio API Synthesizer for Fencing Duel Game
 * Adheres strictly to DESIGN.md contract:
 *  - AudioFX.init()
 *  - AudioFX.playClash()
 *  - AudioFX.playParry()
 *  - AudioFX.playTouche()
 *  - AudioFX.playWhistle()
 * Additional ergonomic helpers: AudioFX.playBuzzer(), AudioFX.toggleMute(), AudioFX.isMuted()
 */
(function(window) {
  'use strict';

  let audioCtx = null;
  let muted = false;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  const AudioFX = {
    init: function() {
      try {
        getAudioContext();
      } catch (err) {
        console.warn('AudioContext not allowed without prior user interaction.', err);
      }
    },

    toggleMute: function() {
      muted = !muted;
      return muted;
    },

    isMuted: function() {
      return muted;
    },

    setMuted: function(val) {
      muted = !!val;
    },

    /**
     * Metallic blade clash (higher metallic resonance with quick decay)
     */
    playClash: function() {
      if (muted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High-pitched bell/metal frequencies
      const freqs = [1800, 2400, 3100, 4200];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.7, now + 0.18);

        gain.gain.setValueAtTime(0.15 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.19);
      });
    },

    /**
     * Defensive blade parry / deflection (Zasłona block: deeper metallic ring + deflection snap)
     */
    playParry: function() {
      if (muted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Metallic thud + resonating ring
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(950, now);
      osc1.frequency.exponentialRampToValueAtTime(400, now + 0.25);

      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1450, now);
      osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.26);
      osc2.stop(now + 0.36);
    },

    /**
     * Touché scoring sound (Electric scoring buzzer chime)
     */
    playTouche: function() {
      if (muted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sharp electronic beep characteristic of FIE scoring apparatus
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now); // A5 note
      osc.frequency.setValueAtTime(1108.73, now + 0.08); // C#6
      osc.frequency.setValueAtTime(1318.51, now + 0.18); // E6

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.setValueAtTime(0.25, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);
    },

    /**
     * Referee whistle ("Allez!" / "Halte!")
     */
    playWhistle: function() {
      if (muted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(2600, now);
      osc2.frequency.setValueAtTime(2625, now); // Slight beat frequency for whistle warble

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gain.gain.setValueAtTime(0.25, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    },

    /**
     * End of bout / time buzzer
     */
    playBuzzer: function() {
      if (muted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.setValueAtTime(0.3, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.72);
    }
  };

  window.AudioFX = AudioFX;
})(typeof window !== 'undefined' ? window : this);
