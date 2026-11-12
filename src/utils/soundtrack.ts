export type MusicTrackId = 'upbeat' | 'calm' | 'countdown' | 'adventure' | 'lofi';

export const MUSIC_TRACKS: { id: MusicTrackId; label: string }[] = [
  { id: 'upbeat', label: 'Game Show' },
  { id: 'calm', label: 'Calm Focus' },
  { id: 'countdown', label: 'Pulse Beat' },
  { id: 'adventure', label: 'Quiz Quest' },
  { id: 'lofi', label: 'Gentle Chimes' },
];

class ClassroomSoundtrackEngine {
  private ctx: AudioContext | null = null;
  private timerId: number | null = null;
  private step = 0;
  private playing = false;
  private track: MusicTrackId = 'upbeat';
  private volume = 0.25;
  private sfxEnabled = true;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType,
    gainLevel: number,
    delaySec = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, gainLevel), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  }

  public start(track?: MusicTrackId) {
    if (track) this.track = track;
    this.stop();
    this.ensureContext();
    this.playing = true;
    this.step = 0;

    const tempoMs =
      this.track === 'upbeat'
        ? 230
        : this.track === 'countdown'
        ? 260
        : this.track === 'adventure'
        ? 210
        : this.track === 'lofi'
        ? 450
        : 620;

    const upbeatNotes = [261.63, 329.63, 392.0, 523.25, 392.0, 440.0, 349.23, 392.0];
    const adventureNotes = [293.66, 369.99, 440.0, 587.33, 440.0, 493.88, 392.0, 440.0];
    const lofiNotes = [523.25, 587.33, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25];
    const calmChords = [
      [261.63, 329.63, 392.0],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 246.94, 293.66],
    ];
    const pulseNotes = [220.0, 220.0, 261.63, 293.66, 220.0, 220.0, 329.63, 293.66];

    const tick = () => {
      if (!this.playing) return;
      const vol = this.volume * 0.22;
      if (vol > 0.002) {
        if (this.track === 'upbeat') {
          const note = upbeatNotes[this.step % upbeatNotes.length];
          this.playTone(note, 0.2, 'triangle', vol);
          if (this.step % 4 === 0) {
            this.playTone(note / 2, 0.35, 'sine', vol * 0.8);
          }
        } else if (this.track === 'adventure') {
          const note = adventureNotes[this.step % adventureNotes.length];
          this.playTone(note, 0.18, 'triangle', vol * 0.95);
          if (this.step % 2 === 0) {
            this.playTone(note / 2, 0.25, 'sine', vol * 0.7);
          }
        } else if (this.track === 'lofi') {
          const note = lofiNotes[this.step % lofiNotes.length];
          this.playTone(note, 0.5, 'sine', vol * 0.65);
          if (this.step % 4 === 0) {
            this.playTone(261.63, 0.9, 'sine', vol * 0.45);
          }
        } else if (this.track === 'calm') {
          const chord = calmChords[this.step % calmChords.length];
          chord.forEach((f) => this.playTone(f, 0.75, 'sine', vol * 0.45));
        } else {
          const note = pulseNotes[this.step % pulseNotes.length];
          this.playTone(note, 0.16, 'sine', vol * 0.75);
          if (this.step % 2 === 0) {
            this.playTone(110, 0.12, 'triangle', vol * 0.4);
          }
        }
      }
      this.step += 1;
    };

    tick();
    this.timerId = window.setInterval(tick, tempoMs);
  }

  public stop() {
    this.playing = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public setTrack(track: MusicTrackId) {
    this.track = track;
    if (this.playing) {
      this.start(track);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public playCorrectChime(force = false) {
    if (!this.sfxEnabled && !force) return;
    this.playTone(523.25, 0.15, 'triangle', 0.13);
    this.playTone(659.25, 0.24, 'triangle', 0.13, 0.09);
  }

  public playBingoCall(force = false) {
    if (!this.sfxEnabled && !force) return;
    this.playTone(587.33, 0.14, 'sine', 0.11);
    this.playTone(880.0, 0.24, 'sine', 0.12, 0.1);
  }

  public playUnlockFanfare(force = false) {
    if (!this.sfxEnabled && !force) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      this.playTone(freq, 0.3, 'triangle', 0.13, idx * 0.09);
    });
  }

  public playTimerBell(force = false) {
    if (!this.sfxEnabled && !force) return;
    this.playTone(784, 0.4, 'sine', 0.15);
    this.playTone(784, 0.55, 'sine', 0.15, 0.25);
  }

  public playDrumroll() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    for (let i = 0; i < 12; i++) {
      const freq = 140 + i * 8;
      this.playTone(freq, 0.07, 'triangle', 0.07 + i * 0.005, i * 0.075);
    }
    this.playTone(523.25, 0.35, 'triangle', 0.14, 0.95);
  }

  public playApplause() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    // Cheerful celebratory chord + rapid rhythmic claps
    [523.25, 659.25, 783.99].forEach((f) => this.playTone(f, 0.45, 'triangle', 0.09));
    const bufferSize = ctx.sampleRate * 0.9;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      const pulse = Math.abs(Math.sin(i / 750));
      data[i] = (Math.random() * 2 - 1) * env * pulse * 0.35;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.value = 0.25;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public playLevelUp() {
    [440, 554.37, 659.25, 880, 1108.73].forEach((f, idx) => {
      this.playTone(f, 0.18, 'sine', 0.12, idx * 0.065);
    });
  }

  public playTryAgainBounce() {
    this.playTone(329.63, 0.12, 'sine', 0.1);
    this.playTone(261.63, 0.2, 'sine', 0.1, 0.11);
  }
}

export const soundtrack = new ClassroomSoundtrackEngine();
