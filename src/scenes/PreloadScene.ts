import Phaser from 'phaser';
import { ui } from '../ui/GameUI';

const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}assets/${path}`;

function updateLoadingScreen(progress: number, statusText: string): void {
  const safeProgress = Phaser.Math.Clamp(progress, 0, 1);
  const fill = document.querySelector<HTMLElement>('#loading-fill');
  const status = document.querySelector<HTMLElement>('#loading-status');
  if (fill) fill.style.width = `${Math.round(safeProgress * 100)}%`;
  if (status) status.textContent = statusText;
}

export class PreloadScene extends Phaser.Scene {
  private readonly failedAssets = new Set<string>();

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.failedAssets.clear();
    ui.showLoading();
    updateLoadingScreen(0, 'Switching on the corridor lights\u2026');

    const onProgress = (value: number): void => {
      const status = value < 0.34
        ? 'Checking the rain forecast\u2026'
        : value < 0.67
          ? 'Positioning one extremely important trolley\u2026'
          : 'Negotiating with the coffee machine\u2026';
      updateLoadingScreen(value, status);
    };
    const onLoadError = (file: Phaser.Loader.File): void => {
      this.failedAssets.add(file.key);
      console.error(`Failed to load required asset: ${file.key}`, file.src);
      updateLoadingScreen(this.load.progress, `Could not load ${file.key}. Check the asset manifest.`);
    };
    this.load.on(Phaser.Loader.Events.PROGRESS, onProgress);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onLoadError);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.load.off(Phaser.Loader.Events.PROGRESS, onProgress);
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onLoadError);
    });

    this.load.image('titleArt', assetUrl('backgrounds/title.webp'));
    this.load.image('facilityHub', assetUrl('backgrounds/facility_hub.webp'));
    this.load.image('carPark', assetUrl('backgrounds/car_park.webp'));
    this.load.image('cathLab', assetUrl('backgrounds/cath_lab.webp'));
    this.load.image('teaRoom', assetUrl('backgrounds/tea_room.webp'));
    this.load.image('pigHousing', assetUrl('backgrounds/pig_housing.webp'));
    this.load.image('feedStore', assetUrl('backgrounds/feed-store.webp'));
    this.load.image('sheepScales', assetUrl('backgrounds/sheep-scales.webp'));
    this.load.image('baboonWing', assetUrl('backgrounds/baboon-wing.webp'));
    this.load.image('prepRoom', assetUrl('backgrounds/procedure-prep.webp'));
    this.load.image('coffeeShop', assetUrl('backgrounds/coffee-shop.webp'));
  }

  create(): void {
    if (this.failedAssets.size > 0) {
      const names = [...this.failedAssets].join(', ');
      updateLoadingScreen(this.load.progress, `Required artwork is missing: ${names}`);
      this.add.rectangle(640, 360, 1280, 720, 0x050b14, 0.98);
      this.add.text(640, 500, `Asset loading stopped: ${names}`, {
        align: 'center', color: '#ffb0aa', fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', wordWrap: { width: 880 },
      }).setOrigin(0.5);
      document.querySelector<HTMLElement>('#loading-screen')?.classList.add('hidden');
      return;
    }
    updateLoadingScreen(1, 'Shift ready. Optimism remains unverified.');
    this.time.delayedCall(120, () => this.scene.start('TitleScene'));
  }
}
