import Phaser from 'phaser';
import { ui } from '../ui/GameUI';

const HUD_REFRESH_MS = 100;

export class UIScene extends Phaser.Scene {
  private refreshAccumulator = HUD_REFRESH_MS;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.refreshAccumulator = HUD_REFRESH_MS;
    ui.showHud();
    ui.refresh();
  }

  override update(_time: number, delta: number): void {
    this.refreshAccumulator += delta;
    if (this.refreshAccumulator < HUD_REFRESH_MS) return;
    this.refreshAccumulator %= HUD_REFRESH_MS;
    ui.refresh();
  }
}
