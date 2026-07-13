import Phaser from 'phaser';
import { audio } from '../audio/AudioDirector';
import { ui } from '../ui/GameUI';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.scene.stop('LocationScene');
    this.scene.stop('UIScene');
    this.scene.stop('EndingScene');

    this.add.image(640, 360, 'titleArt').setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x02070d, 0.12);
    ui.showTitle();
    audio.playMusic('title');
  }
}
