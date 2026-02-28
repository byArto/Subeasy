const STORAGE_KEY = 'neonsub-sounds-enabled';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private enabled: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        // Compressor for consistent loudness across all sounds
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 6;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.1;
        this.compressor.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private get output(): AudioNode | null {
    this.getContext();
    return this.compressor;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  }

  isEnabled() {
    return this.enabled;
  }

  /** Tap — тёплый физический клик кнопки */
  tap() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const out = this.output;
    if (!ctx || !out) return;
    const t = ctx.currentTime;

    // Main tone at E5 — warm mid-range
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);
    osc.type = 'sine';
    osc.frequency.value = 659;
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.start(t);
    osc.stop(t + 0.06);

    // Subtle harmonic for body
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(out);
    osc2.type = 'sine';
    osc2.frequency.value = 988; // B5 — adds warmth
    gain2.gain.setValueAtTime(0.02, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc2.start(t);
    osc2.stop(t + 0.035);
  }

  /** Success — восходящий аккорд Em: E5 → G5 → B5 (ощущение завершённости) */
  success() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const out = this.output;
    if (!ctx || !out) return;
    const t = ctx.currentTime;

    const notes = [
      { freq: 659.25, delay: 0,    dur: 0.22 }, // E5
      { freq: 783.99, delay: 0.09, dur: 0.22 }, // G5
      { freq: 987.77, delay: 0.17, dur: 0.28 }, // B5
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const s = t + delay;

      // Main tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(out);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, s);
      gain.gain.linearRampToValueAtTime(0.055, s + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, s + dur);
      osc.start(s);
      osc.stop(s + dur + 0.01);

      // Octave shimmer — adds bell-like quality
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(out);
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0, s);
      gain2.gain.linearRampToValueAtTime(0.01, s + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.001, s + dur * 0.55);
      osc2.start(s);
      osc2.stop(s + dur * 0.6);
    });
  }

  /** Remove — нисходящий тон B4→G4 (ощущение "ушло") */
  remove() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const out = this.output;
    if (!ctx || !out) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(494, t);               // B4
    osc.frequency.exponentialRampToValueAtTime(392, t + 0.18); // G4
    gain.gain.setValueAtTime(0.055, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t);
    osc.stop(t + 0.24);

    // Harmonic shadow
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(out);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(988, t);
    osc2.frequency.exponentialRampToValueAtTime(784, t + 0.12);
    gain2.gain.setValueAtTime(0.018, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc2.start(t);
    osc2.stop(t + 0.15);
  }

  /** Tab switch — едва слышимый переход */
  tabSwitch() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const out = this.output;
    if (!ctx || !out) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);
    osc.type = 'sine';
    osc.frequency.value = 880; // A5
    gain.gain.setValueAtTime(0.028, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  /** Paid — G5→C6 восходящий "чинг" как подтверждение платежа */
  paid() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const out = this.output;
    if (!ctx || !out) return;
    const t = ctx.currentTime;

    const notes = [
      { freq: 783.99, delay: 0,    dur: 0.26 }, // G5
      { freq: 1046.5, delay: 0.08, dur: 0.32 }, // C6
    ];

    notes.forEach(({ freq, delay, dur }, i) => {
      const s = t + delay;
      const vol = 0.065 - i * 0.01;

      // Main tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(out);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, s);
      gain.gain.linearRampToValueAtTime(vol, s + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, s + dur);
      osc.start(s);
      osc.stop(s + dur + 0.01);

      // Perfect 5th harmonic — bell-like quality
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(out);
      osc2.type = 'sine';
      osc2.frequency.value = freq * 1.5;
      gain2.gain.setValueAtTime(0, s);
      gain2.gain.linearRampToValueAtTime(vol * 0.25, s + 0.008);
      gain2.gain.exponentialRampToValueAtTime(0.001, s + dur * 0.45);
      osc2.start(s);
      osc2.stop(s + dur * 0.5);
    });
  }

  /** Error — два мягких нисходящих тона A4→F#4 ("упс", не тревога) */
  error() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const out = this.output;
    if (!ctx || !out) return;
    const t = ctx.currentTime;

    const pulses = [
      { freq: 440, delay: 0 },    // A4
      { freq: 370, delay: 0.13 }, // F#4
    ];

    pulses.forEach(({ freq, delay }) => {
      const s = t + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(out);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, s);
      gain.gain.exponentialRampToValueAtTime(0.001, s + 0.1);
      osc.start(s);
      osc.stop(s + 0.12);
    });
  }

  /** Toggle ON — восходящий мягкий блип A4→E5 */
  toggleOn() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const out = this.output;
    if (!ctx || !out) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(659, t + 0.09); // A4 → E5
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Toggle OFF — нисходящий мягкий блип E5→A4 */
  toggleOff() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const out = this.output;
    if (!ctx || !out) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659, t);
    osc.frequency.linearRampToValueAtTime(440, t + 0.09); // E5 → A4
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.start(t);
    osc.stop(t + 0.12);
  }
}

export const soundEngine = new SoundEngine();
