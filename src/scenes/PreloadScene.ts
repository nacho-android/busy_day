import Phaser from 'phaser';
import { BACKGROUND_ASSETS } from '../data/assets';
import { CHARACTER_VISUALS } from '../data/characters';
import { WORLD_SPRITE_SHEETS } from '../data/worldArt';
import { ui } from '../ui/GameUI';
import type { CharacterAssetReference } from '../types/game';

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
  private readonly queuedCharacterAssets = new Set<string>();

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.failedAssets.clear();
    this.queuedCharacterAssets.clear();
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

    // Load only the title and first room up front. Later rooms are decoded on
    // entry by LocationScene and retained in a small LRU texture cache.
    for (const key of ['titleArt', 'teaRoom'] as const) this.load.image(key, assetUrl(BACKGROUND_ASSETS[key]));
    this.queueCharacterAssets();
    for (const sheet of Object.values(WORLD_SPRITE_SHEETS)) {
      this.load.spritesheet(sheet.key, assetUrl(sheet.path), { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
  }

  private queueImage(asset: CharacterAssetReference | undefined): void {
    if (!asset || this.queuedCharacterAssets.has(asset.key)) return;
    this.queuedCharacterAssets.add(asset.key);
    this.load.image(asset.key, assetUrl(asset.path));
  }

  private queueCharacterAssets(): void {
    for (const visual of Object.values(CHARACTER_VISUALS)) {
      if (visual.renderer === 'sprite-sheet') {
        const asset = visual.assets.image;
        const layout = visual.frameLayout;
        if (!asset || !layout) {
          this.failedAssets.add(`character:${visual.id}`);
          console.error(`Character ${visual.id} needs an image and frameLayout for sprite-sheet rendering.`);
        } else if (!this.queuedCharacterAssets.has(asset.key)) {
          this.queuedCharacterAssets.add(asset.key);
          this.load.spritesheet(asset.key, assetUrl(asset.path), layout);
        }
      } else if (visual.renderer === 'texture-atlas') {
        const atlas = visual.assets.atlas;
        if (!atlas) {
          this.failedAssets.add(`character:${visual.id}`);
          console.error(`Character ${visual.id} needs an atlas for texture-atlas rendering.`);
        } else if (!this.queuedCharacterAssets.has(atlas.key)) {
          this.queuedCharacterAssets.add(atlas.key);
          this.load.atlas(atlas.key, assetUrl(atlas.path), assetUrl(atlas.dataPath));
        }
      }
      this.queueImage(visual.portrait.asset);
      Object.values(visual.portrait.expressions).forEach((expression) => this.queueImage(expression?.asset));
    }
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
