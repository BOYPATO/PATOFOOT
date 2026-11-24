/**
 * Procedural Web Audio Engine for PATOFOOT
 * Generates referee whistles, stadium roars, goal reactions, woodwork impacts, and UI clicks
 * with persistent Master Volume (0-100%) and Mute controls.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.8; // 0.0 to 1.0

  constructor() {
    try {
      const savedSettings = localStorage.getItem('patofoot_game_settings_v1');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (typeof parsed.isMuted === 'boolean') {
          this.isMuted = parsed.isMuted;
        }
        if (typeof parsed.masterVolume === 'number') {
          this.masterVolume = Math.max(0, Math.min(1, parsed.masterVolume / 100));
        }
      } else {
        const savedMute = localStorage.getItem('brasfoot_muted');
        if (savedMute !== null) {
          this.isMuted = savedMute === 'true';
        }
      }
    } catch {
      // Fallback defaults
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.isMuted ? 0 : this.masterVolume,
          this.ctx.currentTime
        );
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
  }

  private getOutputNode(): AudioNode | null {
    if (!this.ctx) return null;
    return this.masterGain || this.ctx.destination;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('brasfoot_muted', String(this.isMuted));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volumePercent: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
    this.masterVolume = clamped / 100;
    if (clamped > 0 && this.isMuted) {
      this.isMuted = false;
      localStorage.setItem('brasfoot_muted', 'false');
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
  }

  public getVolume(): number {
    return Math.round(this.masterVolume * 100);
  }

  /**
   * Classic authentic referee whistle
   * Dual frequencies (2650Hz and 3000Hz) with rapid vibrato
   */
  public playWhistle(long: boolean = false) {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;

    const now = this.ctx.currentTime;
    const duration = long ? 0.8 : 0.25;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(2650, now);
    osc2.frequency.setValueAtTime(3000, now);

    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.setValueAtTime(35, now);
    vibratoGain.gain.setValueAtTime(80, now);
    vibrato.connect(osc1.frequency);
    vibrato.connect(osc2.frequency);
    vibrato.start(now);
    vibrato.stop(now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gainNode.gain.setValueAtTime(0.2, now + duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(out);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * Double whistle for halftime / fulltime
   */
  public playDoubleWhistle() {
    this.playWhistle(false);
    setTimeout(() => {
      this.playWhistle(true);
    }, 280);
  }

  /**
   * Stadium crowd roar when a goal is scored
   */
  public playGoalRoar() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;

    this.playWhistle(true);

    const now = this.ctx.currentTime;
    const duration = 2.4;

    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.Q.setValueAtTime(1.8, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.frequency.setValueAtTime(120, now);
    kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    kickGain.gain.setValueAtTime(0.5, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    kickOsc.connect(kickGain);
    kickGain.connect(out);
    kickOsc.start(now);
    kickOsc.stop(now + 0.4);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(out);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);
  }

  /**
   * Metallic post / crossbar ping
   */
  public playWoodworkHit() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * UI button click / action
   */
  public playClick() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Powerful ball kick / strike sound
   */
  public playBallKick() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Goalkeeper glove punch / diving deflection slap
   */
  public playGoalkeeperSave() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playFanfare() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startT = now + idx * 0.12;
      const dur = 0.8;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.001, startT);
      gain.gain.linearRampToValueAtTime(0.2, startT + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);

      osc.connect(gain);
      gain.connect(out);

      osc.start(startT);
      osc.stop(startT + dur);
    });
  }

  /**
   * Low crowd groan / tension chord when the opponent scores
   */
  public playOpponentGoalGroan() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;

    const now = this.ctx.currentTime;
    const freqs = [196.0, 146.83]; // G3 -> D3 descending murmur
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = now + idx * 0.14;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, start);
      osc.frequency.exponentialRampToValueAtTime(f * 0.82, start + 0.35);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  /**
   * Warm major triad chime for completed signings and contract renewals
   */
  public playContractSigned() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25]; // A4, C#5, E5
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /**
   * Crisp glassy pot-ball reveal cue for cup draws
   */
  public playCupDrawCue() {
    if (this.isMuted || this.masterVolume <= 0) return;
    this.initContext();
    const out = this.getOutputNode();
    if (!this.ctx || !out) return;

    const now = this.ctx.currentTime;
    [587.33, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }
}

export const soundEngine = new SoundEngine();
