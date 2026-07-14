import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { EndingScene } from './scenes/EndingScene';
import { LocationScene } from './scenes/LocationScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { LOCATIONS } from './data/locations';
import { session } from './state/GameSession';
import type { BusyDayTestApi } from './types/game';
import { ui } from './ui/GameUI';

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
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
    prepareExit: (locationId, exitId) => {
      const run = session.run;
      const location = LOCATIONS[locationId];
      const exit = location.exits.find((candidate) => candidate.id === exitId);
      const spawn = location.spawns[0];
      if (!run || !exit || !spawn) return false;
      if (exit.requiredFlag && !run.flags.includes(exit.requiredFlag)) run.flags.push(exit.requiredFlag);
      session.transitionTo(locationId, spawn.id);
      activeLocationScene()?.scene.restart();
      return true;
    },
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
