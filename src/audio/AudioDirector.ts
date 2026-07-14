import { session } from '../state/GameSession';
import { MUSIC_ASSETS, SFX_ASSETS, type SfxCue } from '../data/assets';
import type { MusicCueId } from '../types/game';

const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}assets/${path}`;

export type { SfxCue } from '../data/assets';

class AudioDirector {
  private currentMusic: HTMLAudioElement | null = null;
  private currentCue: MusicCueId | null = null;
  private unlocked = false;
  private ducked = false;

  unlock(): void {
    this.unlocked = true;
    if (this.currentCue && !this.currentMusic) this.playMusic(this.currentCue);
  }

  playMusic(cue: MusicCueId): void {
    this.currentCue = cue;
    if (!this.unlocked || session.settings.muted || session.settings.musicVolume <= 0) {
      this.currentMusic?.pause();
      this.currentMusic = null;
      return;
    }
    if (this.currentMusic?.dataset['cue'] === cue) { this.applyVolumes(); return; }
    const previous = this.currentMusic;
    const next = new Audio(assetUrl(MUSIC_ASSETS[cue]));
    next.loop = true;
    next.preload = 'auto';
    next.dataset['cue'] = cue;
    next.volume = 0;
    this.currentMusic = next;
    void next.play().then(() => this.fade(next, previous)).catch(() => {
      if (this.currentMusic === next) this.currentMusic = previous;
      next.pause();
    });
  }

  private fade(next: HTMLAudioElement, previous: HTMLAudioElement | null): void {
    const target = this.targetVolume();
    const steps = session.settings.reducedMotion ? 1 : 12;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      const fraction = Math.min(1, index / steps);
      next.volume = target * fraction;
      if (previous) previous.volume = Math.max(0, target * (1 - fraction));
      if (fraction >= 1) { window.clearInterval(timer); previous?.pause(); }
    }, steps === 1 ? 1 : 45);
  }

  playSfx(cue: SfxCue, gain = 1): void {
    if (!this.unlocked || session.settings.muted || session.settings.sfxVolume <= 0) return;
    const audio = new Audio(assetUrl(SFX_ASSETS[cue]));
    audio.volume = Math.max(0, Math.min(1, session.settings.sfxVolume * gain));
    void audio.play().catch(() => undefined);
  }

  applyVolumes(): void {
    if (!this.currentMusic && this.unlocked && this.currentCue && !session.settings.muted && session.settings.musicVolume > 0) {
      this.playMusic(this.currentCue);
      return;
    }
    if (this.currentMusic) this.currentMusic.volume = this.targetVolume();
  }

  duck(active: boolean): void {
    this.ducked = active;
    if (this.currentMusic) this.currentMusic.volume = this.targetVolume();
  }

  private targetVolume(): number {
    return session.settings.muted ? 0 : session.settings.musicVolume * (this.ducked ? .22 : .64);
  }

  stop(): void { this.currentMusic?.pause(); this.currentMusic = null; this.currentCue = null; this.ducked = false; }
}

export const audio = new AudioDirector();
