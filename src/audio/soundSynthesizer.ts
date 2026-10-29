// Procedural Web Audio API Sound Synthesizer
// Generates professional broadcast chimes with zero external audio dependencies.

import type { ChimeStyle } from '../types/timer';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public play(style: ChimeStyle = 'soft_bell', volumeOverride?: number) {
    const previousVolume = this.volume;
    if (volumeOverride !== undefined) this.setVolume(volumeOverride);
    if (this.isMuted || this.volume <= 0) { this.volume = previousVolume; return; }

    try {
      const ctx = this.getContext();
      switch (style) {
        case 'soft_bell':
          this.playSoftBell(ctx);
          break;
        case 'marimba':
          this.playMarimba(ctx);
          break;
        case 'gong':
          this.playGong(ctx);
          break;
        case 'digital_beep':
          this.playDigitalBeep(ctx);
          break;
      }
    } catch (err) {
      console.warn('Audio play prevented or unavailable:', err);
    } finally {
      this.volume = previousVolume;
    }
  }

  // Soft Bell: Dual harmonic frequencies (D5: 587.33Hz + A5: 880Hz)
  private playSoftBell(ctx: AudioContext) {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.4, now);
    masterGain.connect(ctx.destination);

    [587.33, 880].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 1.8);
    });
  }

  // Marimba: Warm, cheerful rising triad (C5, E5, G5)
  private playMarimba(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(this.volume * 0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.9);
    });
  }

  // Gong: Deep resonant bell with harmonic overtones
  private playGong(ctx: AudioContext) {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, now);
    masterGain.connect(ctx.destination);

    [130.81, 261.63, 392.00, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(1 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 3.0);
    });
  }

  // Digital Beep: Clean broadcast alert tone (880Hz)
  private playDigitalBeep(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const soundSynth = new SoundSynthesizer();
