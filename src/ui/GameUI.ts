import type Phaser from 'phaser';
import { audio } from '../audio/AudioDirector';
import { CHARACTERS, getVisual, getVisualForSpeaker } from '../data/characters';
import { LOCATIONS } from '../data/locations';
import { OBJECTIVES, OPENING_DIALOGUE, objectiveProgress } from '../data/story';
import { session } from '../state/GameSession';
import type {
  CharacterId,
  DialogueChoice,
  DialogueLine,
  InputSnapshot,
  SettingsState,
} from '../types/game';

export type ToastTone = 'info' | 'success' | 'warn' | 'danger';

const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}assets/${path}`;

export interface NearbyPrompt {
  verb: string;
  label: string;
  keyHint?: string;
}

type BlockReason = 'confirm' | 'dialogue' | 'drawer' | 'ending' | 'failure' | 'menu' | 'orientation' | 'settings' | 'visibility';
type SettingsReturn = 'game' | 'pause' | 'title';

interface DialogueSequence {
  lines: DialogueLine[];
  onComplete: (() => void) | null;
}

const LOCATION_SCENE = 'LocationScene';
const UI_SCENE = 'UIScene';
const TITLE_SCENE = 'TitleScene';
const ENDING_SCENE = 'EndingScene';

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Required interface element #${id} is missing.`);
  return element as T;
}

function visible(element: HTMLElement, show: boolean): void {
  element.classList.toggle('hidden', !show);
  element.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function formatClock(startMinutes: number, elapsedSeconds: number): string {
  const totalMinutes = Math.floor(startMinutes + elapsedSeconds / 60) % (24 * 60);
  const hour = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minute = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * Owns the HTML interface and translates DOM input into a small, scene-safe API.
 * Phaser scenes remain responsible for world simulation and call this controller
 * for presentation, pausing, dialogue and touch input.
 */
export class GameUI {
  private game: Phaser.Game | null = null;
  private selectedCharacter: CharacterId = 'mel';
  private gameActive = false;
  private readonly blockReasons = new Set<BlockReason>();
  private readonly pressedKeys = new Set<string>();
  private touchMoveX = 0;
  private touchMoveY = 0;
  private touchSprint = false;
  private touchUse = false;
  private touchDodgeQueued = false;
  private keyboardDodgeQueued = false;
  private gamepadDodgeWasDown = false;
  private gamepadUiButtons = { up: false, down: false, left: false, right: false, accept: false, back: false, start: false };
  private joystickPointer: number | null = null;
  private captionTimer = 0;
  private typewriterTimer = 0;
  private toastSequence = 0;
  private settingsReturn: SettingsReturn = 'game';
  private drawerOpenedFromPause = false;
  private dialogueQueue: DialogueSequence[] = [];
  private activeDialogue: DialogueSequence | null = null;
  private dialogueIndex = 0;
  private typing = false;
  private fullDialogueText = '';
  private pendingConfirmation: (() => void) | null = null;

  private readonly el = {
    loading: required<HTMLElement>('loading-screen'),
    loadingFill: required<HTMLElement>('loading-fill'),
    loadingStatus: required<HTMLElement>('loading-status'),
    title: required<HTMLElement>('title-screen'),
    characterCards: [...document.querySelectorAll<HTMLButtonElement>('.character-card')],
    newGame: required<HTMLButtonElement>('new-game-button'),
    continueGame: required<HTMLButtonElement>('continue-button'),
    titleSettings: required<HTMLButtonElement>('title-settings-button'),
    hud: required<HTMLElement>('hud'),
    hudLead: required<HTMLElement>('hud-lead'),
    hudLocation: required<HTMLElement>('hud-location'),
    hudAct: required<HTMLElement>('hud-act'),
    hudObjectiveTitle: required<HTMLElement>('hud-objective-title'),
    hudObjectiveProgress: required<HTMLElement>('hud-objective-progress'),
    healthValue: required<HTMLElement>('health-value'),
    healthFill: required<HTMLElement>('health-fill'),
    staminaValue: required<HTMLElement>('stamina-value'),
    staminaFill: required<HTMLElement>('stamina-fill'),
    stressValue: required<HTMLElement>('stress-value'),
    stressFill: required<HTMLElement>('stress-fill'),
    wayneMeter: required<HTMLElement>('wayne-meter'),
    wayneValue: required<HTMLElement>('wayne-value'),
    wayneFill: required<HTMLElement>('wayne-fill'),
    objectiveButton: required<HTMLButtonElement>('objective-button'),
    pauseButton: required<HTMLButtonElement>('pause-button'),
    interaction: required<HTMLElement>('interaction-prompt'),
    interactionKey: required<HTMLElement>('interaction-prompt').querySelector<HTMLElement>('kbd')!,
    interactionVerb: required<HTMLElement>('interaction-verb'),
    interactionLabel: required<HTMLElement>('interaction-label'),
    interactionProgress: required<HTMLElement>('interaction-progress'),
    caption: required<HTMLElement>('caption'),
    toastStack: required<HTMLElement>('toast-stack'),
    dialogue: required<HTMLElement>('dialogue-panel'),
    dialoguePortrait: required<HTMLElement>('dialogue-portrait'),
    dialogueSpeaker: required<HTMLElement>('dialogue-speaker'),
    dialogueText: required<HTMLElement>('dialogue-text'),
    dialogueChoices: required<HTMLElement>('dialogue-choices'),
    dialogueAdvance: required<HTMLButtonElement>('dialogue-advance'),
    objectivePanel: required<HTMLElement>('objective-panel'),
    objectivePanelTitle: required<HTMLElement>('objective-panel-title'),
    objectivePanelCopy: required<HTMLElement>('objective-panel-copy'),
    objectiveList: required<HTMLOListElement>('objective-list'),
    kitList: required<HTMLElement>('kit-list'),
    hintButton: required<HTMLButtonElement>('hint-button'),
    hintCopy: required<HTMLElement>('hint-copy'),
    drawerClose: required<HTMLElement>('objective-panel').querySelector<HTMLButtonElement>('[data-close-drawer]')!,
    pauseMenu: required<HTMLElement>('pause-menu'),
    resume: required<HTMLButtonElement>('resume-button'),
    pauseObjectives: required<HTMLButtonElement>('pause-objectives-button'),
    pauseSettings: required<HTMLButtonElement>('pause-settings-button'),
    restartCheckpoint: required<HTMLButtonElement>('restart-checkpoint-button'),
    restartShift: required<HTMLButtonElement>('restart-shift-button'),
    titleButton: required<HTMLButtonElement>('title-button'),
    settings: required<HTMLElement>('settings-menu'),
    settingsClose: required<HTMLElement>('settings-menu').querySelector<HTMLButtonElement>('[data-close-settings]')!,
    musicVolume: required<HTMLInputElement>('music-volume'),
    sfxVolume: required<HTMLInputElement>('sfx-volume'),
    mute: required<HTMLInputElement>('mute-setting'),
    typewriter: required<HTMLInputElement>('typewriter-setting'),
    reducedMotion: required<HTMLInputElement>('reduced-motion-setting'),
    highContrast: required<HTMLInputElement>('high-contrast-setting'),
    subtitles: required<HTMLInputElement>('subtitles-setting'),
    textSize: required<HTMLSelectElement>('text-size-setting'),
    handedness: required<HTMLSelectElement>('handedness-setting'),
    relaxed: required<HTMLInputElement>('relaxed-setting'),
    failure: required<HTMLElement>('failure-screen'),
    failureReason: required<HTMLElement>('failure-reason'),
    failureRetry: required<HTMLButtonElement>('failure-retry-button'),
    failureRestart: required<HTMLButtonElement>('failure-restart-button'),
    failureTitle: required<HTMLButtonElement>('failure-title-button'),
    ending: required<HTMLElement>('ending-screen'),
    endingRank: required<HTMLElement>('ending-rank'),
    endingSummary: required<HTMLElement>('ending-summary'),
    endingTasks: required<HTMLElement>('ending-tasks'),
    endingCoins: required<HTMLElement>('ending-coins'),
    endingReplay: required<HTMLButtonElement>('ending-replay-button'),
    endingTitle: required<HTMLButtonElement>('ending-title-button'),
    touchControls: required<HTMLElement>('touch-controls'),
    joystick: required<HTMLElement>('joystick'),
    joystickKnob: required<HTMLElement>('joystick-knob'),
    touchSprintButton: required<HTMLButtonElement>('touch-sprint'),
    touchDodgeButton: required<HTMLButtonElement>('touch-dodge'),
    touchUseButton: required<HTMLButtonElement>('touch-use'),
    rotatePrompt: required<HTMLElement>('rotate-prompt'),
    confirm: required<HTMLElement>('confirm-dialog'),
    confirmTitle: required<HTMLElement>('confirm-title'),
    confirmCopy: required<HTMLElement>('confirm-copy'),
    confirmCancel: required<HTMLButtonElement>('confirm-cancel'),
    confirmAccept: required<HTMLButtonElement>('confirm-accept'),
  };

  constructor() {
    this.createResetButton();
    this.bindDomEvents();
    this.bindSessionEvents();
    this.applySettings();
    this.updateCharacterPicker();
    this.updateOrientation();
    window.requestAnimationFrame(() => this.pollGamepadUi());
  }

  private connectedGamepad(): Gamepad | null {
    let gamepad: Gamepad | null = null;
    try {
      gamepad = [...(navigator.getGamepads?.() ?? [])].find((candidate) => candidate?.connected) ?? null;
    } catch { /* Some privacy modes expose the API but deny enumeration. */ }
    return gamepad;
  }

  private pollGamepadUi(): void {
    const gamepad = this.connectedGamepad();
    const next = {
      up: Boolean(gamepad?.buttons[12]?.pressed) || (gamepad?.axes[1] ?? 0) < -.62,
      down: Boolean(gamepad?.buttons[13]?.pressed) || (gamepad?.axes[1] ?? 0) > .62,
      left: Boolean(gamepad?.buttons[14]?.pressed) || (gamepad?.axes[0] ?? 0) < -.62,
      right: Boolean(gamepad?.buttons[15]?.pressed) || (gamepad?.axes[0] ?? 0) > .62,
      accept: Boolean(gamepad?.buttons[0]?.pressed),
      back: Boolean(gamepad?.buttons[1]?.pressed),
      start: Boolean(gamepad?.buttons[9]?.pressed),
    };
    const pressed = (key: keyof typeof next): boolean => next[key] && !this.gamepadUiButtons[key];
    const container = this.gamepadUiContainer();
    if (container) {
      if (pressed('up')) this.moveGamepadFocus(container, -1);
      if (pressed('down')) this.moveGamepadFocus(container, 1);
      if (pressed('left')) this.adjustGamepadControl(container, -1);
      if (pressed('right')) this.adjustGamepadControl(container, 1);
      if (pressed('accept')) this.activateGamepadControl(container);
      if (pressed('back')) this.gamepadBack();
    } else if (pressed('start') && this.gameActive) {
      this.openPause();
    }
    this.gamepadUiButtons = next;
    window.requestAnimationFrame(() => this.pollGamepadUi());
  }

  private gamepadUiContainer(): HTMLElement | null {
    const ordered = [this.el.confirm, this.el.dialogue, this.el.settings, this.el.objectivePanel, this.el.pauseMenu, this.el.failure, this.el.ending, this.el.title];
    return ordered.find((element) => !element.classList.contains('hidden') && element.getAttribute('aria-hidden') !== 'true') ?? null;
  }

  private gamepadControls(container: HTMLElement): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>('button, input, select')].filter((element) => {
      if (element.closest('.hidden') || element.hasAttribute('disabled')) return false;
      return element instanceof HTMLButtonElement || element instanceof HTMLInputElement || element instanceof HTMLSelectElement;
    });
  }

  private moveGamepadFocus(container: HTMLElement, direction: -1 | 1): void {
    const controls = this.gamepadControls(container);
    if (controls.length === 0) return;
    const current = controls.indexOf(document.activeElement as HTMLElement);
    const next = current < 0 ? (direction > 0 ? 0 : controls.length - 1) : (current + direction + controls.length) % controls.length;
    controls[next]?.focus();
    audio.playSfx('focus', .35);
  }

  private adjustGamepadControl(container: HTMLElement, direction: -1 | 1): void {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === 'range') {
      if (direction > 0) active.stepUp(); else active.stepDown();
      active.dispatchEvent(new Event('input', { bubbles: true }));
      audio.playSfx('focus', .28);
      return;
    }
    if (active instanceof HTMLSelectElement) {
      active.selectedIndex = Math.max(0, Math.min(active.options.length - 1, active.selectedIndex + direction));
      active.dispatchEvent(new Event('change', { bubbles: true }));
      audio.playSfx('focus', .28);
      return;
    }
    this.moveGamepadFocus(container, direction);
  }

  private activateGamepadControl(container: HTMLElement): void {
    audio.unlock();
    const controls = this.gamepadControls(container);
    const active = document.activeElement;
    const target = active instanceof HTMLElement && controls.includes(active) ? active : controls[0];
    if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) target.click();
  }

  private gamepadBack(): void {
    if (!this.el.confirm.classList.contains('hidden')) this.closeConfirmation(false);
    else if (!this.el.settings.classList.contains('hidden')) this.closeSettings();
    else if (!this.el.objectivePanel.classList.contains('hidden')) this.closeObjectives();
    else if (this.blockReasons.has('menu')) this.closePause();
  }

  get isBlocking(): boolean {
    return this.blockReasons.size > 0;
  }

  get isPaused(): boolean {
    return this.isBlocking;
  }

  bindGame(game: Phaser.Game): void {
    this.game = game;
    this.syncScenePause();
  }

  showLoading(progress = 0, status?: string): void {
    this.gameActive = false;
    this.dismissRuntimeOverlays();
    visible(this.el.title, false);
    visible(this.el.hud, false);
    visible(this.el.touchControls, false);
    visible(this.el.loading, true);
    const normalised = progress > 1 ? progress / 100 : progress;
    this.el.loadingFill.style.width = `${Math.round(clampUnit(normalised) * 100)}%`;
    if (status !== undefined) this.el.loadingStatus.textContent = status;
  }

  showTitle(): void {
    this.gameActive = false;
    this.dismissRuntimeOverlays();
    visible(this.el.loading, false);
    visible(this.el.hud, false);
    visible(this.el.touchControls, false);
    visible(this.el.title, true);
    this.el.continueGame.classList.toggle('hidden', !session.hasContinue);
    this.el.continueGame.disabled = !session.hasContinue;
    if (session.run && !session.run.finished) this.selectedCharacter = session.run.characterId;
    this.updateCharacterPicker();
    this.updateOrientation();
    window.setTimeout(() => this.el.newGame.focus(), 0);
  }

  showHud(): void {
    this.gameActive = true;
    visible(this.el.loading, false);
    visible(this.el.title, false);
    visible(this.el.failure, false);
    visible(this.el.ending, false);
    visible(this.el.hud, true);
    this.updateOrientation();
    this.syncTouchControls();
    this.refresh();
  }

  /** Starts the Phaser world for the run currently held by GameSession. */
  startCurrentRun(): boolean {
    if (!this.game || !session.run || session.run.finished) return false;
    this.dismissRuntimeOverlays();
    this.gameActive = true;
    const manager = this.game.scene;
    for (const key of [TITLE_SCENE, ENDING_SCENE, LOCATION_SCENE, UI_SCENE]) {
      if (manager.isActive(key) || manager.isPaused(key) || manager.isSleeping(key)) manager.stop(key);
    }
    manager.start(LOCATION_SCENE);
    manager.run(UI_SCENE);
    this.showHud();
    audio.duck(false);
    return true;
  }

  restartCurrentRun(mode: 'checkpoint' | 'shift' = 'checkpoint'): boolean {
    const run = mode === 'checkpoint' ? session.retryCheckpoint() : session.restartShift();
    return Boolean(run && this.startCurrentRun());
  }

  refresh(): void {
    const run = session.run;
    this.el.continueGame.classList.toggle('hidden', !session.hasContinue);
    this.el.continueGame.disabled = !session.hasContinue;
    if (!run) return;

    const objective = session.currentObjective;
    const location = LOCATIONS[run.locationId];
    const staminaMaximum = CHARACTERS[run.characterId].stats.maxStamina;
    const progress = objective ? objectiveProgress(run.objectiveIndex, run.completedTargets) : { done: OBJECTIVES.length, total: OBJECTIVES.length };
    this.el.hudLead.textContent = CHARACTERS[run.characterId].name.toUpperCase();
    this.el.hudLocation.textContent = location.name.toUpperCase();
    this.el.hudAct.textContent = `${objective?.act === 0 ? 'PROLOGUE' : objective ? `ACT ${objective.act}` : 'EPILOGUE'} · ${formatClock(run.startedAtMinutes, run.elapsedSeconds)}`;
    this.el.hudObjectiveTitle.textContent = objective?.title ?? 'Shift complete';
    this.el.hudObjectiveProgress.textContent = `${progress.done} / ${progress.total}`;
    this.updateMeter(this.el.healthValue, this.el.healthFill, run.meters.health, 100);
    this.updateMeter(this.el.staminaValue, this.el.staminaFill, run.meters.stamina, staminaMaximum);
    this.updateMeter(this.el.stressValue, this.el.stressFill, run.meters.stress, 100);
    this.updateMeter(this.el.wayneValue, this.el.wayneFill, run.meters.wayne, 100);
    const showWayne = run.locationId === 'carPark' || objective?.id === 'clear_carpark' || run.meters.wayne > 0;
    visible(this.el.wayneMeter, showWayne);
    this.renderObjectives();
  }

  consumeInput(): InputSnapshot {
    const gamepad = this.connectedGamepad();
    const deadzone = (value: number): number => Math.abs(value) < 0.18 ? 0 : value;
    const padX = deadzone(gamepad?.axes[0] ?? 0);
    const padY = deadzone(gamepad?.axes[1] ?? 0);
    const keyX = (this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('KeyA') ? -1 : 0)
      + (this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('KeyD') ? 1 : 0);
    const keyY = (this.pressedKeys.has('ArrowUp') || this.pressedKeys.has('KeyW') ? -1 : 0)
      + (this.pressedKeys.has('ArrowDown') || this.pressedKeys.has('KeyS') ? 1 : 0);
    const gamepadDodge = Boolean(gamepad?.buttons[2]?.pressed);
    const dodge = this.touchDodgeQueued || this.keyboardDodgeQueued || (gamepadDodge && !this.gamepadDodgeWasDown);
    this.touchDodgeQueued = false;
    this.keyboardDodgeQueued = false;
    this.gamepadDodgeWasDown = gamepadDodge;
    if (this.isBlocking) return { moveX: 0, moveY: 0, sprint: false, interact: false, dodge: false };
    return {
      moveX: Math.max(-1, Math.min(1, this.touchMoveX + keyX + padX)),
      moveY: Math.max(-1, Math.min(1, this.touchMoveY + keyY + padY)),
      sprint: this.touchSprint || this.pressedKeys.has('ShiftLeft') || this.pressedKeys.has('ShiftRight') || Boolean(gamepad?.buttons[1]?.pressed),
      interact: this.touchUse || this.pressedKeys.has('KeyE') || Boolean(gamepad?.buttons[0]?.pressed),
      dodge,
    };
  }

  setNearby(target: NearbyPrompt | null, holdFraction = 0): void {
    if (!target || this.isBlocking || !this.gameActive) {
      visible(this.el.interaction, false);
      this.el.interactionProgress.style.width = '0%';
      this.el.touchUseButton.textContent = 'USE';
      return;
    }
    this.el.interactionKey.textContent = target.keyHint ?? (this.isTouchLayout() ? 'USE' : 'E');
    this.el.interactionVerb.textContent = target.verb.toUpperCase();
    this.el.interactionLabel.textContent = target.label;
    this.el.interactionProgress.style.width = `${Math.round(clampUnit(holdFraction) * 100)}%`;
    this.el.touchUseButton.textContent = target.verb.toUpperCase();
    visible(this.el.interaction, true);
  }

  showDialogue(lines: readonly DialogueLine[], onComplete?: () => void): void {
    if (lines.length === 0) {
      onComplete?.();
      return;
    }
    this.dialogueQueue.push({ lines: lines.map((line) => ({ ...line })), onComplete: onComplete ?? null });
    if (!this.activeDialogue) this.startNextDialogue();
  }

  toast(message: string, tone: ToastTone = 'info', duration = 3600): void {
    if (!message.trim()) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    toast.dataset['toastId'] = String(++this.toastSequence);
    this.el.toastStack.append(toast);
    while (this.el.toastStack.children.length > 4) this.el.toastStack.firstElementChild?.remove();
    window.setTimeout(() => toast.remove(), Math.max(1400, duration));
  }

  caption(text: string, duration = 2800): void {
    window.clearTimeout(this.captionTimer);
    if (!session.settings.subtitles || !text.trim()) {
      visible(this.el.caption, false);
      return;
    }
    this.el.caption.textContent = text;
    visible(this.el.caption, true);
    this.captionTimer = window.setTimeout(() => visible(this.el.caption, false), Math.max(900, duration));
  }

  showEnding(): void {
    const run = session.run;
    if (!run) return;
    this.clearDialogue();
    this.blockReasons.add('ending');
    this.gameActive = false;
    visible(this.el.hud, false);
    visible(this.el.touchControls, false);
    visible(this.el.interaction, false);
    visible(this.el.failure, false);
    this.el.endingRank.textContent = session.rank();
    this.el.endingTasks.textContent = `${run.completedObjectives.length}/${OBJECTIVES.length}`;
    this.el.endingCoins.textContent = String(run.coins);
    const lead = CHARACTERS[run.characterId].name;
    const minutes = Math.max(1, Math.round(run.elapsedSeconds / 60));
    this.el.endingSummary.textContent = `${lead} completed the board in ${minutes} shift minute${minutes === 1 ? '' : 's'}, with ${Math.round(run.meters.health)} health and ${Math.round(run.meters.stress)} stress remaining.`;
    visible(this.el.ending, true);
    audio.playMusic('finale');
    this.syncScenePause();
    window.setTimeout(() => this.el.endingReplay.focus(), 0);
  }

  private bindDomEvents(): void {
    for (const card of this.el.characterCards) {
      card.addEventListener('click', () => {
        const id = card.dataset['character'];
        if (id !== 'mel' && id !== 'josh') return;
        this.selectedCharacter = id;
        this.updateCharacterPicker();
        audio.playSfx('focus', 0.45);
      });
    }
    this.el.newGame.addEventListener('click', () => this.beginNewRun());
    this.el.continueGame.addEventListener('click', () => this.continueRun());
    this.el.titleSettings.addEventListener('click', () => this.openSettings('title'));
    this.el.objectiveButton.addEventListener('click', () => this.openObjectives(false));
    this.el.pauseButton.addEventListener('click', () => this.openPause());
    this.el.resume.addEventListener('click', () => this.closePause());
    this.el.pauseObjectives.addEventListener('click', () => this.openObjectives(true));
    this.el.pauseSettings.addEventListener('click', () => this.openSettings('pause'));
    this.el.restartCheckpoint.addEventListener('click', () => this.confirmAction(
      'Restart this checkpoint?',
      'Progress after the last completed checkpoint will be replayed.',
      'Restart checkpoint',
      () => this.restartCurrentRun('checkpoint'),
    ));
    this.el.restartShift.addEventListener('click', () => this.confirmRestartShift());
    this.el.titleButton.addEventListener('click', () => this.returnToTitle());
    this.el.drawerClose.addEventListener('click', () => this.closeObjectives());
    this.el.hintButton.addEventListener('click', () => visible(this.el.hintCopy, true));
    this.el.settingsClose.addEventListener('click', () => this.closeSettings());
    this.el.dialogueAdvance.addEventListener('click', () => this.advanceDialogue());

    this.el.failureRetry.addEventListener('click', () => this.retryFailure('checkpoint'));
    this.el.failureRestart.addEventListener('click', () => this.confirmRestartShift());
    this.el.failureTitle.addEventListener('click', () => this.returnToTitle());
    this.el.endingReplay.addEventListener('click', () => {
      this.selectedCharacter = session.run?.characterId ?? this.selectedCharacter;
      this.beginNewRun();
    });
    this.el.endingTitle.addEventListener('click', () => this.returnToTitle());
    this.el.confirmCancel.addEventListener('click', () => this.closeConfirmation(false));
    this.el.confirmAccept.addEventListener('click', () => this.closeConfirmation(true));

    const settingsControls: Array<HTMLInputElement | HTMLSelectElement> = [
      this.el.musicVolume, this.el.sfxVolume, this.el.mute, this.el.typewriter,
      this.el.reducedMotion, this.el.highContrast, this.el.subtitles,
      this.el.textSize, this.el.handedness, this.el.relaxed,
    ];
    for (const control of settingsControls) {
      control.addEventListener(control instanceof HTMLInputElement && control.type === 'range' ? 'input' : 'change', () => this.commitSettings());
    }

    this.bindJoystick();
    this.bindHoldButton(this.el.touchSprintButton, (down) => { this.touchSprint = down; });
    this.bindHoldButton(this.el.touchUseButton, (down) => { this.touchUse = down; });
    this.el.touchDodgeButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.touchDodgeQueued = true;
      this.el.touchDodgeButton.classList.add('active');
      window.setTimeout(() => this.el.touchDodgeButton.classList.remove('active'), 130);
    });

    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.pressedKeys.delete(event.code));
    document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
    window.addEventListener('resize', () => {
      this.updateOrientation();
      this.syncTouchControls();
    });
    window.matchMedia('(orientation: portrait)').addEventListener('change', () => this.updateOrientation());
    document.addEventListener('visibilitychange', () => {
      if (!this.gameActive) return;
      if (document.hidden) {
        session.persist();
        this.addBlock('visibility');
      }
      else this.removeBlock('visibility');
    });
  }

  private bindSessionEvents(): void {
    session.on('change', () => this.refresh());
    session.on('transition', () => this.refresh());
    session.on('settings', () => {
      this.applySettings();
      audio.applyVolumes();
    });
    session.on('failure', () => this.showFailure());
  }

  private createResetButton(): void {
    const card = this.el.settings.querySelector<HTMLElement>('.settings-card');
    if (!card || document.getElementById('reset-save-button')) return;
    const reset = document.createElement('button');
    reset.id = 'reset-save-button';
    reset.type = 'button';
    reset.className = 'danger-button';
    reset.textContent = 'Reset saved progress';
    reset.addEventListener('click', () => this.confirmAction(
      'Reset every saved shift?',
      'This removes the active run, best rank, settings and accessibility preferences on this device.',
      'Reset everything',
      () => {
        session.resetAll();
        this.selectedCharacter = 'mel';
        this.returnToTitle();
        this.toast('Local progress reset.', 'info');
      },
    ));
    card.append(reset);
  }

  private beginNewRun(): void {
    audio.unlock();
    if (session.hasContinue) {
      this.confirmAction(
        'Replace the unfinished shift?',
        'Starting a new shift will replace the current checkpoint and progress on this device.',
        'Start new shift',
        () => this.startFreshRun(),
      );
      return;
    }
    this.startFreshRun();
  }

  private startFreshRun(): void {
    session.newGame(this.selectedCharacter, session.settings.relaxed);
    if (!this.startCurrentRun()) return;
    audio.playSfx('confirm', 0.7);
    window.setTimeout(() => this.showDialogue(OPENING_DIALOGUE), session.settings.reducedMotion ? 0 : 180);
  }

  private continueRun(): void {
    audio.unlock();
    const run = session.continueGame();
    if (!run || !this.startCurrentRun()) {
      this.toast('No unfinished shift was found on this device.', 'warn');
      this.showTitle();
      return;
    }
    audio.playSfx('confirm', 0.65);
  }

  private returnToTitle(): void {
    this.dismissRuntimeOverlays();
    this.gameActive = false;
    if (this.game) {
      const manager = this.game.scene;
      for (const key of [LOCATION_SCENE, UI_SCENE, ENDING_SCENE]) {
        if (manager.isActive(key) || manager.isPaused(key) || manager.isSleeping(key)) manager.stop(key);
      }
      if (!manager.isActive(TITLE_SCENE)) manager.start(TITLE_SCENE);
      else this.showTitle();
    } else {
      this.showTitle();
    }
    audio.duck(false);
    audio.playMusic('title');
  }

  private updateCharacterPicker(): void {
    for (const card of this.el.characterCards) {
      const id = card.dataset['character'];
      const selected = id === this.selectedCharacter;
      card.classList.toggle('selected', selected);
      card.setAttribute('aria-pressed', String(selected));
      if (id === 'mel' || id === 'josh') {
        const portrait = card.querySelector<HTMLElement>('.portrait');
        const asset = getVisual(id).portrait.asset;
        if (portrait && asset) {
          portrait.textContent = '';
          portrait.style.backgroundImage = `url("${assetUrl(asset.path)}")`;
          portrait.style.backgroundPosition = 'center';
          portrait.style.backgroundSize = 'cover';
          portrait.setAttribute('aria-hidden', 'true');
        }
      }
    }
  }

  private updateMeter(valueElement: HTMLElement, fillElement: HTMLElement, value: number, maximum: number): void {
    const safe = Math.max(0, Math.min(maximum, value));
    valueElement.textContent = String(Math.round(safe));
    fillElement.style.width = `${Math.round((safe / maximum) * 100)}%`;
  }

  private renderObjectives(): void {
    const run = session.run;
    if (!run) return;
    const current = session.currentObjective;
    this.el.objectivePanelTitle.textContent = current?.title ?? 'Shift complete';
    this.el.objectivePanelCopy.textContent = current?.description ?? 'Every item on the board has reluctantly become history.';
    this.el.hintCopy.textContent = current?.hint ?? 'Juan is still defending the coffee.';
    visible(this.el.hintCopy, false);
    const objectiveFragment = document.createDocumentFragment();
    OBJECTIVES.forEach((objective, index) => {
      const item = document.createElement('li');
      item.textContent = objective.title;
      item.classList.toggle('done', run.completedObjectives.includes(objective.id));
      item.classList.toggle('current', index === run.objectiveIndex && !run.finished);
      if (index === run.objectiveIndex && !run.finished) item.setAttribute('aria-current', 'step');
      objectiveFragment.append(item);
    });
    this.el.objectiveList.replaceChildren(objectiveFragment);

    const kitDefinitions = [
      { label: 'Feed cart', active: session.hasFlag('hasFeedCart') },
      { label: 'Sample kit', active: session.hasFlag('hasSamples') },
      { label: 'Pig trolley', active: session.hasFlag('hasTrolley') },
    ];
    const kitFragment = document.createDocumentFragment();
    for (const kit of kitDefinitions) {
      const item = document.createElement('span');
      item.className = `kit-item${kit.active ? ' active' : ''}`;
      item.textContent = `${kit.active ? '✓ ' : ''}${kit.label}`;
      kitFragment.append(item);
    }
    this.el.kitList.replaceChildren(kitFragment);
  }

  private openObjectives(fromPause: boolean): void {
    if (!session.run || this.activeDialogue || this.blockReasons.has('failure') || this.blockReasons.has('ending')) return;
    this.drawerOpenedFromPause = fromPause;
    if (fromPause) visible(this.el.pauseMenu, false);
    else this.addBlock('drawer');
    this.renderObjectives();
    visible(this.el.objectivePanel, true);
    audio.playSfx('focus', 0.4);
    window.setTimeout(() => this.el.drawerClose.focus(), 0);
  }

  private closeObjectives(): void {
    visible(this.el.objectivePanel, false);
    if (this.drawerOpenedFromPause) visible(this.el.pauseMenu, true);
    else this.removeBlock('drawer');
    this.drawerOpenedFromPause = false;
    audio.playSfx('back', 0.4);
  }

  private openPause(): void {
    if (!this.gameActive || this.blockReasons.has('failure') || this.blockReasons.has('ending') || this.activeDialogue) return;
    this.addBlock('menu');
    visible(this.el.pauseMenu, true);
    audio.duck(true);
    audio.playSfx('focus', 0.4);
    window.setTimeout(() => this.el.resume.focus(), 0);
  }

  private closePause(): void {
    visible(this.el.pauseMenu, false);
    this.removeBlock('menu');
    audio.duck(false);
    audio.playSfx('back', 0.38);
  }

  private openSettings(returnTo: SettingsReturn): void {
    this.settingsReturn = returnTo;
    if (returnTo === 'pause') visible(this.el.pauseMenu, false);
    this.addBlock('settings');
    this.applySettings();
    visible(this.el.settings, true);
    audio.playSfx('focus', 0.4);
    window.setTimeout(() => this.el.musicVolume.focus(), 0);
  }

  private closeSettings(): void {
    visible(this.el.settings, false);
    this.removeBlock('settings');
    if (this.settingsReturn === 'pause') visible(this.el.pauseMenu, true);
    audio.playSfx('back', 0.38);
  }

  private commitSettings(): void {
    const patch: Partial<SettingsState> = {
      musicVolume: Number(this.el.musicVolume.value),
      sfxVolume: Number(this.el.sfxVolume.value),
      muted: this.el.mute.checked,
      typewriter: this.el.typewriter.checked,
      reducedMotion: this.el.reducedMotion.checked,
      highContrast: this.el.highContrast.checked,
      subtitles: this.el.subtitles.checked,
      textSize: this.el.textSize.value === 'large' ? 'large' : 'normal',
      handedness: this.el.handedness.value === 'left' ? 'left' : 'right',
      relaxed: this.el.relaxed.checked,
    };
    session.updateSettings(patch);
  }

  private applySettings(): void {
    const settings = session.settings;
    this.el.musicVolume.value = String(settings.musicVolume);
    this.el.sfxVolume.value = String(settings.sfxVolume);
    this.el.mute.checked = settings.muted;
    this.el.typewriter.checked = settings.typewriter;
    this.el.reducedMotion.checked = settings.reducedMotion;
    this.el.highContrast.checked = settings.highContrast;
    this.el.subtitles.checked = settings.subtitles;
    this.el.textSize.value = settings.textSize;
    this.el.handedness.value = settings.handedness;
    this.el.relaxed.checked = settings.relaxed;
    document.body.classList.toggle('text-large', settings.textSize === 'large');
    document.body.classList.toggle('high-contrast', settings.highContrast);
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    document.body.classList.toggle('touch-left', settings.handedness === 'left');
    this.syncTouchControls();
  }

  private showFailure(): void {
    const failure = session.run?.failure;
    if (!failure) return;
    this.clearDialogue();
    this.addBlock('failure');
    this.el.failureReason.textContent = failure === 'wayne'
      ? 'Wayne reached maximum environmental condition. The blue car has won this round.'
      : 'Health reached zero. The shift has been paused for a professionally necessary reset.';
    visible(this.el.interaction, false);
    visible(this.el.failure, true);
    audio.duck(true);
    audio.playSfx('failure', 0.85);
    this.caption(failure === 'wayne' ? 'SETBACK · Wayne meter full' : 'SETBACK · health depleted');
    window.setTimeout(() => this.el.failureRetry.focus(), 0);
  }

  private retryFailure(mode: 'checkpoint' | 'shift'): void {
    visible(this.el.failure, false);
    this.removeBlock('failure');
    if (!this.restartCurrentRun(mode)) this.returnToTitle();
  }

  private confirmRestartShift(): void {
    this.confirmAction(
      'Restart the whole shift?',
      'All progress in the current shift will be replaced by a fresh 06:45 start.',
      'Restart shift',
      () => {
        visible(this.el.pauseMenu, false);
        visible(this.el.failure, false);
        this.blockReasons.delete('menu');
        this.blockReasons.delete('failure');
        if (!this.restartCurrentRun('shift')) this.returnToTitle();
      },
    );
  }

  private confirmAction(title: string, copy: string, acceptLabel: string, action: () => void): void {
    this.pendingConfirmation = action;
    this.el.confirmTitle.textContent = title;
    this.el.confirmCopy.textContent = copy;
    this.el.confirmAccept.textContent = acceptLabel;
    this.addBlock('confirm');
    visible(this.el.confirm, true);
    window.setTimeout(() => this.el.confirmCancel.focus(), 0);
  }

  private closeConfirmation(accept: boolean): void {
    const action = this.pendingConfirmation;
    this.pendingConfirmation = null;
    visible(this.el.confirm, false);
    this.removeBlock('confirm');
    if (accept) {
      audio.playSfx('confirm', 0.55);
      action?.();
    } else {
      audio.playSfx('back', 0.4);
    }
  }

  private startNextDialogue(): void {
    const sequence = this.dialogueQueue.shift();
    if (!sequence) {
      this.removeBlock('dialogue');
      visible(this.el.dialogue, false);
      return;
    }
    this.activeDialogue = sequence;
    this.dialogueIndex = 0;
    this.addBlock('dialogue');
    visible(this.el.dialogue, true);
    audio.duck(true);
    this.renderDialogueLine();
  }

  private renderDialogueLine(): void {
    const line = this.activeDialogue?.lines[this.dialogueIndex];
    if (!line) {
      this.finishDialogueSequence();
      return;
    }
    this.stopTypewriter();
    this.el.dialogueSpeaker.textContent = line.speaker;
    const expression = line.expression ?? 'neutral';
    const visual = getVisualForSpeaker(line.speaker);
    const portraitExpression = visual?.portrait.expressions[expression];
    const portraitAsset = portraitExpression?.asset ?? visual?.portrait.asset;
    this.el.dialoguePortrait.textContent = portraitAsset ? '' : line.speaker.trim().charAt(0).toUpperCase() || '?';
    this.el.dialoguePortrait.dataset['expression'] = expression;
    this.el.dialoguePortrait.dataset['voiceProfile'] = visual?.voice.profile ?? 'unassigned';
    this.el.dialoguePortrait.style.backgroundImage = portraitAsset
      ? `url("${assetUrl(portraitAsset.path)}")`
      : visual
        ? `linear-gradient(145deg, ${visual.portrait.gradient[0]}, ${visual.portrait.gradient[1]})`
        : '';
    this.el.dialoguePortrait.style.backgroundSize = portraitAsset ? 'cover' : '';
    this.el.dialoguePortrait.style.backgroundPosition = portraitAsset ? 'center' : '';
    this.el.dialoguePortrait.style.filter = portraitExpression?.cssFilter ?? '';
    this.el.dialoguePortrait.setAttribute('aria-label', `${line.speaker} portrait`);
    this.el.dialogueChoices.replaceChildren();
    this.el.dialogueAdvance.disabled = false;
    this.el.dialogueAdvance.classList.remove('hidden');
    this.fullDialogueText = line.text;
    if (session.settings.typewriter && !session.settings.reducedMotion) this.beginTypewriter(line.text);
    else {
      this.el.dialogueText.textContent = line.text;
      this.renderDialogueChoices(line);
    }
    window.setTimeout(() => this.el.dialogueAdvance.focus(), 0);
  }

  private beginTypewriter(text: string): void {
    const characters = Array.from(text);
    let index = 0;
    this.typing = true;
    this.el.dialogueText.textContent = '';
    this.typewriterTimer = window.setInterval(() => {
      index = Math.min(characters.length, index + 1);
      this.el.dialogueText.textContent = characters.slice(0, index).join('');
      if (index >= characters.length) {
        this.stopTypewriter();
        const line = this.activeDialogue?.lines[this.dialogueIndex];
        if (line) this.renderDialogueChoices(line);
      }
    }, 18);
  }

  private stopTypewriter(): void {
    window.clearInterval(this.typewriterTimer);
    this.typewriterTimer = 0;
    this.typing = false;
  }

  private revealDialogueText(): void {
    this.stopTypewriter();
    this.el.dialogueText.textContent = this.fullDialogueText;
    const line = this.activeDialogue?.lines[this.dialogueIndex];
    if (line) this.renderDialogueChoices(line);
  }

  private renderDialogueChoices(line: DialogueLine): void {
    this.el.dialogueChoices.replaceChildren();
    if (!line.choices?.length) {
      this.el.dialogueAdvance.classList.remove('hidden');
      return;
    }
    this.el.dialogueAdvance.classList.add('hidden');
    line.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${index + 1}. ${choice.label}`;
      button.addEventListener('click', () => this.chooseDialogueResponse(choice, line));
      this.el.dialogueChoices.append(button);
    });
    this.el.dialogueChoices.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private chooseDialogueResponse(choice: DialogueChoice, line: DialogueLine): void {
    if (!this.activeDialogue) return;
    this.applyChoiceEffect(choice);
    const response: DialogueLine = { speaker: line.speaker, text: choice.response };
    if (line.expression) response.expression = line.expression;
    this.activeDialogue.lines[this.dialogueIndex] = response;
    audio.playSfx('confirm', 0.5);
    this.renderDialogueLine();
  }

  private applyChoiceEffect(choice: DialogueChoice): void {
    if (choice.effect === 'wayneDown') {
      session.adjustMeters({ wayne: -20, stress: -3 });
      this.toast('Diplomacy lowered Wayne pressure.', 'success');
    } else if (choice.effect === 'wayneUp') {
      session.adjustMeters({ wayne: 22, stress: 5 });
      this.toast('Wayne pressure increased. The car is still moving.', 'warn');
    } else if (choice.effect === 'stressDown') {
      session.adjustMeters({ stress: -14 });
      this.toast('A professional breath helped.', 'success');
    }
  }

  private advanceDialogue(): void {
    if (!this.activeDialogue) return;
    if (this.typing) {
      this.revealDialogueText();
      return;
    }
    const line = this.activeDialogue.lines[this.dialogueIndex];
    if (line?.choices?.length) {
      this.el.dialogueChoices.querySelector<HTMLButtonElement>('button')?.focus();
      return;
    }
    audio.playSfx('focus', 0.3);
    this.dialogueIndex += 1;
    if (this.dialogueIndex >= this.activeDialogue.lines.length) this.finishDialogueSequence();
    else this.renderDialogueLine();
  }

  private finishDialogueSequence(): void {
    const completed = this.activeDialogue;
    this.activeDialogue = null;
    this.stopTypewriter();
    if (this.dialogueQueue.length > 0) this.startNextDialogue();
    else {
      visible(this.el.dialogue, false);
      this.removeBlock('dialogue');
      audio.duck(false);
    }
    completed?.onComplete?.();
  }

  private clearDialogue(): void {
    this.stopTypewriter();
    this.dialogueQueue = [];
    this.activeDialogue = null;
    this.dialogueIndex = 0;
    visible(this.el.dialogue, false);
    this.blockReasons.delete('dialogue');
  }

  private bindJoystick(): void {
    const update = (event: PointerEvent): void => {
      if (this.joystickPointer !== event.pointerId) return;
      const bounds = this.el.joystick.getBoundingClientRect();
      const centreX = bounds.left + bounds.width / 2;
      const centreY = bounds.top + bounds.height / 2;
      const maximum = Math.max(28, bounds.width * 0.34);
      let x = event.clientX - centreX;
      let y = event.clientY - centreY;
      const magnitude = Math.hypot(x, y);
      if (magnitude > maximum) {
        x = x / magnitude * maximum;
        y = y / magnitude * maximum;
      }
      this.touchMoveX = x / maximum;
      this.touchMoveY = y / maximum;
      this.el.joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
    };
    const release = (event: PointerEvent): void => {
      if (this.joystickPointer !== event.pointerId) return;
      this.joystickPointer = null;
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.el.joystickKnob.style.transform = '';
    };
    this.el.joystick.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.joystickPointer = event.pointerId;
      this.el.joystick.setPointerCapture(event.pointerId);
      update(event);
    });
    this.el.joystick.addEventListener('pointermove', update);
    this.el.joystick.addEventListener('pointerup', release);
    this.el.joystick.addEventListener('pointercancel', release);
    this.el.joystick.addEventListener('lostpointercapture', release);
  }

  private bindHoldButton(button: HTMLButtonElement, update: (pressed: boolean) => void): void {
    const release = (): void => {
      update(false);
      button.classList.remove('active');
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      update(true);
      button.classList.add('active');
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }

  private onKeyDown(event: KeyboardEvent): void {
    audio.unlock();
    const target = event.target;
    const editing = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
    if (event.code === 'Escape') {
      event.preventDefault();
      if (!this.el.confirm.classList.contains('hidden')) this.closeConfirmation(false);
      else if (!this.el.settings.classList.contains('hidden')) this.closeSettings();
      else if (!this.el.objectivePanel.classList.contains('hidden')) this.closeObjectives();
      else if (this.activeDialogue) this.advanceDialogue();
      else if (this.blockReasons.has('menu')) this.closePause();
      else this.openPause();
      return;
    }
    if (editing) return;
    if (this.activeDialogue) {
      if (event.code === 'Enter' || event.code === 'Space' || event.code === 'KeyE') {
        event.preventDefault();
        this.advanceDialogue();
      } else if (/^Digit[1-9]$/.test(event.code)) {
        const index = Number(event.code.slice(-1)) - 1;
        this.el.dialogueChoices.querySelectorAll<HTMLButtonElement>('button')[index]?.click();
      }
      return;
    }
    if (event.code === 'KeyP') {
      event.preventDefault();
      if (this.blockReasons.has('menu')) this.closePause();
      else this.openPause();
      return;
    }
    if (event.code === 'KeyO') {
      event.preventDefault();
      this.openObjectives(false);
      return;
    }
    if (event.code === 'KeyM' && !event.repeat) {
      session.updateSettings({ muted: !session.settings.muted });
      this.toast(session.settings.muted ? 'Audio muted.' : 'Audio restored.', 'info');
      return;
    }
    if (event.code === 'Space' && !event.repeat) this.keyboardDodgeQueued = true;
    this.pressedKeys.add(event.code);
    if (this.gameActive && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
  }

  private addBlock(reason: BlockReason): void {
    this.blockReasons.add(reason);
    this.resetInput();
    visible(this.el.interaction, false);
    this.syncTouchControls();
    this.syncScenePause();
  }

  private removeBlock(reason: BlockReason): void {
    this.blockReasons.delete(reason);
    this.syncTouchControls();
    this.syncScenePause();
  }

  private syncScenePause(): void {
    if (!this.game || !this.gameActive) return;
    const manager = this.game.scene;
    if (this.isBlocking && manager.isActive(LOCATION_SCENE)) manager.pause(LOCATION_SCENE);
    else if (!this.isBlocking && manager.isPaused(LOCATION_SCENE)) manager.resume(LOCATION_SCENE);
  }

  private syncTouchControls(): void {
    const show = this.gameActive && !this.isBlocking && this.isTouchLayout();
    visible(this.el.touchControls, show);
  }

  private isTouchLayout(): boolean {
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || window.innerWidth <= 980;
  }

  private updateOrientation(): void {
    const portrait = window.matchMedia('(orientation: portrait)').matches && window.innerWidth <= 900;
    this.el.rotatePrompt.setAttribute('aria-hidden', portrait ? 'false' : 'true');
    if (!this.gameActive) {
      this.blockReasons.delete('orientation');
      return;
    }
    if (portrait) this.addBlock('orientation');
    else this.removeBlock('orientation');
  }

  private resetInput(): void {
    this.pressedKeys.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchSprint = false;
    this.touchUse = false;
    this.touchDodgeQueued = false;
    this.keyboardDodgeQueued = false;
    this.el.joystickKnob.style.transform = '';
    this.el.touchSprintButton.classList.remove('active');
    this.el.touchUseButton.classList.remove('active');
  }

  private dismissRuntimeOverlays(): void {
    this.clearDialogue();
    window.clearTimeout(this.captionTimer);
    this.pendingConfirmation = null;
    this.blockReasons.clear();
    this.resetInput();
    for (const element of [
      this.el.objectivePanel, this.el.pauseMenu, this.el.settings, this.el.failure,
      this.el.ending, this.el.confirm, this.el.interaction, this.el.caption,
    ]) visible(element, false);
    this.el.toastStack.replaceChildren();
    this.syncScenePause();
  }
}

export const ui = new GameUI();
