const STORAGE_KEY = 'neonsub-sounds-enabled';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

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
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
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

  /** Мягкий тактильный клик — два гармоника с быстрым затуханием */
  tap() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Fundamental — мягкий тон
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.06, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc1.start(t);
    osc1.stop(t + 0.06);

    // Harmonic — добавляет "тело"
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1760;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.02, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc2.start(t);
    osc2.stop(t + 0.04);
  }

  /** Success — мелодичный восходящий аккорд (C-E-G) */
  success() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const delays = [0, 0.07, 0.14];
    const durations = [0.25, 0.22, 0.30];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = t + delays[i];
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08 - i * 0.01, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + durations[i]);
      osc.start(start);
      osc.stop(start + durations[i]);

      // Subtle octave shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = freq * 2;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0, start);
      gain2.gain.linearRampToValueAtTime(0.015, start + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, start + durations[i] * 0.7);
      osc2.start(start);
      osc2.stop(start + durations[i]);
    });
  }

  /** Delete — мягкий нисходящий "вуш" с шумовой текстурой */
  remove() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Тональная часть — нисходящий sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.25);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.25);

    // Мягкий шум для текстуры
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2000, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(0.03, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noise.start(t);
    noise.stop(t + 0.2);
  }

  /** Tab switch — кристальный мини-"пинг" */
  tabSwitch() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1046.5; // C6
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.05);

    // Ghost harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 2093; // C7
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.008, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc2.start(t);
    osc2.stop(t + 0.03);
  }

  /** Mark paid — позитивный "ка-чинг" как звук монетки */
  paid() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Металлический тон 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 1318.5; // E6
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.1, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc1.start(t);
    osc1.stop(t + 0.3);

    // Металлический тон 2 — выше, с задержкой
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 2637; // E7
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.06, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.25);

    // Shimmer
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.frequency.value = 3951; // B7
    osc3.type = 'sine';
    gain3.gain.setValueAtTime(0.02, t + 0.08);
    gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc3.start(t + 0.08);
    osc3.stop(t + 0.2);
  }
}

export const soundEngine = new SoundEngine();
