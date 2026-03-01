const STORAGE_KEY = 'neonsub-sounds-enabled';

const SOUND_FILES = {
  tap:       '/sounds/button.wav',
  success:   '/sounds/transition_up.wav',
  remove:    '/sounds/transition_down.wav',
  tabSwitch: '/sounds/select.wav',
  paid:      '/sounds/notification.wav',
  error:     '/sounds/caution.wav',
  toggleOn:  '/sounds/toggle_on.wav',
  toggleOff: '/sounds/toggle_off.wav',
  // Short ticks for counting machine and hold progress
  tick1:     '/sounds/tap_01.wav',
  tick2:     '/sounds/tap_02.wav',
  tick3:     '/sounds/tap_03.wav',
  swipe:     '/sounds/swipe.wav',
} as const;

type SoundName = keyof typeof SOUND_FILES;

const VOLUMES: Record<SoundName, number> = {
  tap:       0.4,
  success:   0.55,
  remove:    0.45,
  tabSwitch: 0.25,
  paid:      0.6,
  error:     0.45,
  toggleOn:  0.4,
  toggleOff: 0.4,
  tick1:     0.25,
  tick2:     0.3,
  tick3:     0.35,
  swipe:     0.35,
};

class SoundEngine {
  private cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
  private enabled: boolean = false;

  // Count-up ticker state
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;

  // Hold milestones: tracks which have been played (25 / 50 / 75)
  private holdMilestonesHit = new Set<number>();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
      if (this.enabled) {
        this.preload();
      }
    }
  }

  private preload() {
    if (typeof window === 'undefined') return;
    (Object.keys(SOUND_FILES) as SoundName[]).forEach((name) => {
      const audio = new Audio(SOUND_FILES[name]);
      audio.preload = 'auto';
      audio.volume = VOLUMES[name];
      this.cache[name] = audio;
    });
  }

  private play(name: SoundName) {
    if (!this.enabled) return;
    let audio = this.cache[name];
    if (!audio) {
      audio = new Audio(SOUND_FILES[name]);
      audio.volume = VOLUMES[name];
      this.cache[name] = audio;
    }
    // Clone to allow rapid consecutive plays
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = VOLUMES[name];
    clone.play().catch(() => {});
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
      if (enabled && Object.keys(this.cache).length === 0) {
        this.preload();
      }
    }
  }

  isEnabled() { return this.enabled; }

  tap()       { this.play('tap'); }
  success()   { this.play('success'); }
  remove()    { this.play('remove'); }
  tabSwitch() { this.play('tabSwitch'); }
  paid()      { this.play('paid'); }
  error()     { this.play('error'); }
  toggleOn()  { this.play('toggleOn'); }
  toggleOff() { this.play('toggleOff'); }
  swipe()     { this.play('swipe'); }

  /** Start money-counter ticking during count-up animation (duration ms) */
  startCountTick(duration: number) {
    if (!this.enabled) return;
    this.stopCountTick();
    this.tickCount = 0;
    const interval = 65; // ~15 ticks/sec — cash register cadence
    this.tickIntervalId = setInterval(() => {
      // Alternate between tick1 and tick2 for natural variation
      this.play(this.tickCount % 2 === 0 ? 'tick1' : 'tick2');
      this.tickCount++;
    }, interval);
    // Auto-stop after duration
    setTimeout(() => this.stopCountTick(), duration);
  }

  stopCountTick() {
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  /** Call during hold progress (0–100). Plays ascending ticks at milestones. */
  holdTick(progress: number) {
    if (!this.enabled) return;
    const milestones = [25, 50, 75];
    for (const m of milestones) {
      if (progress >= m && !this.holdMilestonesHit.has(m)) {
        this.holdMilestonesHit.add(m);
        // Higher milestone = higher tick (tick1 → tick2 → tick3)
        const idx = milestones.indexOf(m);
        this.play(['tick1', 'tick2', 'tick3'][idx] as SoundName);
      }
    }
  }

  /** Reset hold milestone tracking (call on holdEnd) */
  resetHold() {
    this.holdMilestonesHit.clear();
  }
}

export const soundEngine = new SoundEngine();
