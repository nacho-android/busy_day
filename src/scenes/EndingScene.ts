import Phaser from 'phaser';
import { audio } from '../audio/AudioDirector';
import { ui } from '../ui/GameUI';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create(): void {
    this.scene.stop('LocationScene');
    this.scene.stop('UIScene');
    this.add.rectangle(640, 360, 1280, 720, 0x09090d, 1);
    audio.playMusic('finale');
    ui.showEnding();
  }
}
