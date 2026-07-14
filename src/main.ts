import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { EndingScene } from './scenes/EndingScene';
import { LocationScene } from './scenes/LocationScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { session } from './state/GameSession';
import type { BusyDayTestApi, LocationId } from './types/game';
import { ui } from './ui/GameUI';
import { shouldUseCanvasRenderer } from './utils/rendererPreference';

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const rendererType = shouldUseCanvasRenderer(navigator.userAgent) ? Phaser.CANVAS : Phaser.AUTO;

const config: Phaser.Types.Core.GameConfig = {
  type: rendererType,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#050b14',
  banner: false,
  disableContextMenu: true,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    expandParent: true,
  },
  input: {
    activePointers: 4,
    gamepad: true,
  },
  fps: {
    target: 60,
    min: 30,
    smoothStep: true,
  },
  scene: [BootScene, PreloadScene, TitleScene, LocationScene, UIScene, EndingScene],
};

const game = new Phaser.Game(config);
ui.bindGame(game);

type TestableLocationScene = Phaser.Scene & {
  teleportToInteraction?: (id: string) => boolean;
  completeCurrentTarget?: () => boolean;
  travelToObjectiveForTest?: () => boolean;
  prepareExitForTest?: (locationId: LocationId, exitId: string) => boolean;
  approachExitForTest?: (id: string) => 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | null;
};

function activeLocationScene(): TestableLocationScene | null {
  // Dialogue pauses the world scene. Development helpers must still be able
  // to drive its deterministic interaction methods while that pause is active.
  if (!game.scene.isActive('LocationScene') && !game.scene.isPaused('LocationScene')) return null;
  return game.scene.getScene('LocationScene') as TestableLocationScene;
}

if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  const testApi = Object.freeze({
    getState: () => session.run ? structuredClone(session.run) : null,
    getLocation: () => session.run?.locationId ?? null,
    teleportToInteraction: (id: string) => activeLocationScene()?.teleportToInteraction?.(id) ?? false,
    completeCurrentTarget: () => activeLocationScene()?.completeCurrentTarget?.() ?? false,
    travelToObjective: () => activeLocationScene()?.travelToObjectiveForTest?.() ?? false,
    prepareExit: (locationId, exitId) => activeLocationScene()?.prepareExitForTest?.(locationId, exitId) ?? false,
    approachExit: (id: string) => activeLocationScene()?.approachExitForTest?.(id) ?? null,
    setMeters: (partial) => session.updateMeters(partial),
    showDialogue: (lines) => ui.showDialogue(lines),
  } satisfies BusyDayTestApi);
  window.__busyDayTest = testApi;
}

const preventPageGesture = (event: TouchEvent): void => {
  const target = event.target;
  if (target instanceof Element && (target.closest('#game') || target.closest('#touch-controls'))) event.preventDefault();
};
document.addEventListener('touchmove', preventPageGesture, { passive: false });
