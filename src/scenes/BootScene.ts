import Phaser from 'phaser';
import { validateWorldGraph } from '../systems/worldGraph';
import { ui } from '../ui/GameUI';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    ui.showLoading();

    // The exhaustive collision-grid audit is intentionally a development and
    // release-time gate. Running it on every production boot creates a long
    // main-thread task before the loading screen can paint on slower phones.
    const report = import.meta.env.DEV ? validateWorldGraph() : { valid: true, errors: [] };
    if (!report.valid) {
      const summary = `World validation failed with ${report.errors.length} error${report.errors.length === 1 ? '' : 's'}.`;
      console.error(summary, report.errors);
      const status = document.querySelector<HTMLElement>('#loading-status');
      if (status) status.textContent = 'The facility map failed its safety inspection.';

      this.add.rectangle(640, 360, 1280, 720, 0x050b14, 0.96);
      this.add.text(640, 245, 'SHIFT MAP ERROR', {
        color: '#ffb0aa',
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(640, 315, `${summary}\n\n${report.errors.join('\n')}`, {
        align: 'center',
        color: '#d8e7eb',
        fontFamily: 'Consolas, monospace',
        fontSize: '15px',
        lineSpacing: 8,
        wordWrap: { width: 920 },
      }).setOrigin(0.5, 0);
      document.querySelector<HTMLElement>('#loading-screen')?.classList.add('hidden');
      return;
    }

    this.scene.start('PreloadScene');
  }
}
