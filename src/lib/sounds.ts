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
};

class SoundEngine {
  private cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
  private enabled: boolean = false;

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
}

export const soundEngine = new SoundEngine();
