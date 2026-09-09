// Web Audio API Synthesizer for pleasant, instant UI sound effects
class SoundController {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('pm_notification_sound');
      if (stored !== null) {
        this.soundEnabled = stored === 'true';
      }
    } catch {}
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('pm_notification_sound', String(enabled));
    } catch {}
  }

  /**
   * Play a clean two-tone chime for incoming notifications
   */
  public playNotificationChime() {
    if (!this.soundEnabled) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // First tone (G5 - 784Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.3);

      // Second tone (C6 - 1046.5Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.12);

      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.22, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(now + 0.12);
      osc2.stop(now + 0.48);
    } catch (e) {
      console.warn('Audio chime playback notice:', e);
    }
  }

  /**
   * Play a subtle success completion pop
   */
  public playSuccessPop() {
    if (!this.soundEnabled) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }
}

export const soundManager = new SoundController();
