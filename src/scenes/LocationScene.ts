import Phaser from 'phaser';
import { audio, type SfxCue } from '../audio/AudioDirector';
import { CHARACTERS } from '../data/characters';
import { LOCATIONS, findInteraction } from '../data/locations';
import { FINAL_DIALOGUE, OBJECTIVE_DIALOGUE } from '../data/story';
import { CharacterRig } from '../entities/CharacterRig';
import { createInteractionProp } from '../entities/WorldProps';
import { session } from '../state/GameSession';
import { circleIntersectsRect, distance, moveCircle } from '../systems/collision';
import type { InputSnapshot, InteractionDefinition, LocationDefinition, NpcPlacement, ObstacleDefinition, Point } from '../types/game';
import { ui } from '../ui/GameUI';
import { renderBackdrop } from './BackdropRenderer';

interface NearbyInteraction {
  kind: 'interaction';
  interaction: InteractionDefinition;
  distance: number;
}

interface NearbyNpc {
  kind: 'npc';
  npc: NpcPlacement;
  distance: number;
}

type Nearby = NearbyInteraction | NearbyNpc;

const ZERO_INPUT: InputSnapshot = { moveX: 0, moveY: 0, sprint: false, interact: false, dodge: false };

export class LocationScene extends Phaser.Scene {
  private player!: CharacterRig;
  private readonly propObjects = new Map<string, Phaser.GameObjects.Container>();
  private readonly npcObjects = new Map<string, CharacterRig>();
  private nearby: Nearby | null = null;
  private heldTargetId: string | null = null;
  private heldMs = 0;
  private interactWasDown = false;
  private interactionCooldownUntil = 0;
  private transitionCooldownUntil = 0;
  private transitionLocked = false;
  private exitsArmed = false;
  private dodgeCooldownUntil = 0;
  private stepAt = 0;
  private meterRefreshAt = 0;
  private saveAt = 0;
  private rossTrapAt = 0;
  private rossTrappedUntil = 0;
  private rossTriggered = false;
  private hazard: Phaser.GameObjects.Container | null = null;
  private hazardDirection = 1;
  private hazardHitAt = 0;
  private hornAt = 0;

  constructor() {
    super('LocationScene');
  }

  create(): void {
    const run = session.run;
    if (!run) {
      this.scene.start('TitleScene');
      return;
    }
    this.resetTransientState();
    const location = LOCATIONS[run.locationId];
    renderBackdrop(this, location);
    this.createWorldObjects();
    this.player = new CharacterRig(this, run.player.x, run.player.y, run.characterId);
    this.player.direction = run.facing;
    this.player.updateRig(0, 0, 0, location);
    this.transitionCooldownUntil = this.time.now + 750;
    this.cameras.main.fadeIn(session.settings.reducedMotion ? 1 : 320, 2, 8, 15);
    audio.playMusic(location.music);
    ui.showHud();
    ui.refresh();
    this.createLocationHazard();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.propObjects.clear();
      this.npcObjects.clear();
    });
  }

  private resetTransientState(): void {
    this.nearby = null;
    this.heldTargetId = null;
    this.heldMs = 0;
    this.interactWasDown = false;
    this.interactionCooldownUntil = 0;
    this.transitionCooldownUntil = 0;
    this.transitionLocked = false;
    this.exitsArmed = false;
    this.dodgeCooldownUntil = 0;
    this.stepAt = 0;
    this.meterRefreshAt = 0;
    this.saveAt = 0;
    this.rossTrapAt = 0;
    this.rossTrappedUntil = 0;
    this.rossTriggered = false;
    this.hazard = null;
    this.hazardDirection = 1;
    this.hazardHitAt = 0;
    this.hornAt = 0;
  }

  override update(time: number, delta: number): void {
    const run = session.run;
    if (!run || run.failure || run.finished) return;
    const seconds = Math.min(delta, 80) / 1000;
    session.tick(seconds);
    this.updateAmbient(seconds, time);

    const input = this.readInput();
    if (ui.isBlocking || this.transitionLocked) {
      this.player.updateRig(0, 0, seconds, LOCATIONS[run.locationId]);
      ui.setNearby(null, 0);
      return;
    }

    if (this.rossTrappedUntil > time) {
      if (input.dodge) this.releaseRossTrap();
      else {
        this.player.updateRig(0, 0, seconds, LOCATIONS[run.locationId]);
        ui.setNearby({ verb: 'Dodge', label: 'Escape Ross\'s quick question' }, 0);
        return;
      }
    }

    this.movePlayer(input, seconds, time);
    this.updateRoss(time);
    this.nearby = this.findNearby();
    this.updateInteraction(input, delta, time);
    this.updateExits(time);
    if (this.transitionLocked) return;

    if (time >= this.saveAt) {
      session.recordPosition(this.player.x, this.player.y, this.player.direction);
      session.persist();
      this.saveAt = time + 1200;
    }
    if (time >= this.meterRefreshAt) {
      ui.refresh();
      this.meterRefreshAt = time + 120;
    }
  }

  teleportToInteraction(id: string): boolean {
    const run = session.run;
    const found = findInteraction(id);
    if (!run || !found || found.location.id !== run.locationId) return false;
    const location = LOCATIONS[run.locationId];
    const candidates: Point[] = [48, 72, 96].flatMap((offset) => [
      { x: found.interaction.x, y: found.interaction.y + offset },
      { x: found.interaction.x + offset, y: found.interaction.y },
      { x: found.interaction.x - offset, y: found.interaction.y },
      { x: found.interaction.x, y: found.interaction.y - offset },
    ]);
    const obstacles = this.activeObstacles(location);
    const target = candidates.find((point) => {
      const result = moveCircle(point, { x: 0, y: 0 }, 20, location.bounds, obstacles);
      return !result.collidedX && !result.collidedY;
    }) ?? found.interaction;
    this.player.setPosition(target.x, target.y);
    session.recordPosition(target.x, target.y, this.player.direction);
    return true;
  }

  completeCurrentTarget(): boolean {
    const objective = session.currentObjective;
    const target = objective?.targets.find((candidate) => !session.run?.completedTargets.includes(candidate));
    if (!target) return false;
    const result = session.interact(target);
    this.handleInteractionResult(target, result);
    return result.success;
  }

  travelToObjectiveForTest(): boolean {
    const objective = session.currentObjective;
    if (!objective || !session.run) return false;
    if (session.run.locationId === objective.location) return true;
    const spawn = LOCATIONS[objective.location].spawns[0];
    if (!spawn) return false;
    session.transitionTo(objective.location, spawn.id);
    this.scene.restart();
    return true;
  }

  approachExitForTest(id: string): 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | null {
    const run = session.run;
    if (!run) return null;
    const location = LOCATIONS[run.locationId];
    const exit = location.exits.find((candidate) => candidate.id === id);
    if (!exit) return null;
    const centre = { x: exit.x + exit.width / 2, y: exit.y + exit.height / 2 };
    let target: Point;
    let key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
    if (exit.x <= location.bounds.x + 80) {
      target = { x: exit.x + exit.width + 26, y: centre.y };
      key = 'ArrowLeft';
    } else if (exit.x + exit.width >= location.bounds.x + location.bounds.width - 80) {
      target = { x: exit.x - 26, y: centre.y };
      key = 'ArrowRight';
    } else if (exit.y <= location.bounds.y + 80) {
      target = { x: centre.x, y: exit.y + exit.height + 26 };
      key = 'ArrowUp';
    } else {
      target = { x: centre.x, y: exit.y - 26 };
      key = 'ArrowDown';
    }
    const position = moveCircle(target, { x: 0, y: 0 }, 20, location.bounds, this.activeObstacles(location));
    this.player.setPosition(position.x, position.y);
    session.recordPosition(position.x, position.y, this.player.direction);
    this.exitsArmed = false;
    return key;
  }

  private createWorldObjects(): void {
    const run = session.run!;
    const location = LOCATIONS[run.locationId];
    for (const interaction of location.interactions) {
      const completed = run.completedTargets.includes(interaction.id);
      if (completed && interaction.id.startsWith('car_')) continue;
      const object = createInteractionProp(this, interaction, completed);
      object.setAlpha(this.isCurrentTarget(interaction.id) ? 1 : completed ? .45 : .72);
      this.propObjects.set(interaction.id, object);
    }
    for (const npc of location.npcs) {
      const rig = new CharacterRig(this, npc.x, npc.y, npc.visualId, npc.name);
      rig.updateRig(0, 0, npc.x * .0001, location);
      this.npcObjects.set(npc.id, rig);
      this.tweens.add({ targets: rig, y: npc.y - 2, duration: 1400 + (npc.x % 700), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  private readInput(): InputSnapshot {
    return ui.consumeInput?.() ?? ZERO_INPUT;
  }

  private movePlayer(input: InputSnapshot, seconds: number, time: number): void {
    const run = session.run!;
    const location = LOCATIONS[run.locationId];
    let x = input.moveX;
    let y = input.moveY;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    const stats = CHARACTERS[run.characterId].stats;
    const canSprint = input.sprint && magnitude > .05 && run.meters.stamina > 3;
    const carrying = session.hasFlag('hasTrolley') && !session.hasFlag('procedureComplete');
    let speed = canSprint ? stats.sprintSpeed : stats.moveSpeed;
    if (carrying) speed *= stats.carryFactor;

    if (input.dodge && time >= this.dodgeCooldownUntil && run.meters.stamina >= 14) {
      const facing = this.player.direction;
      const dodgeX = magnitude > .05 ? x : facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
      const dodgeY = magnitude > .05 ? y : facing === 'away' ? -1 : facing === 'toward' ? 1 : 0;
      const result = moveCircle({ x: this.player.x, y: this.player.y }, { x: dodgeX * 74, y: dodgeY * 74 }, 20, location.bounds, this.activeObstacles(location));
      this.player.setPosition(result.x, result.y);
      session.adjustMeters({ stamina: -14, stress: -3 });
      audio.playSfx('transition', .35);
      this.dodgeCooldownUntil = time + 850;
    }

    const delta = { x: x * speed * seconds, y: y * speed * seconds };
    const result = moveCircle({ x: this.player.x, y: this.player.y }, delta, 20, location.bounds, this.activeObstacles(location));
    const velocityX = seconds > 0 ? (result.x - this.player.x) / seconds : 0;
    const velocityY = seconds > 0 ? (result.y - this.player.y) / seconds : 0;
    this.player.setPosition(result.x, result.y);
    this.player.updateRig(velocityX, velocityY, seconds, location);
    session.recordPosition(result.x, result.y, this.player.direction);

    if (canSprint) session.updateMeters({ stamina: run.meters.stamina - 23 * seconds }, false);
    else session.updateMeters({ stamina: run.meters.stamina + 17 * seconds }, false);
    if (magnitude > .05 && time >= this.stepAt) {
      audio.playSfx(location.theme === 'exterior' ? 'stepWet' : 'stepTile', .18);
      this.stepAt = time + (canSprint ? 230 : 340);
    }
  }

  private findNearby(): Nearby | null {
    const run = session.run!;
    const location = LOCATIONS[run.locationId];
    let best: Nearby | null = null;
    for (const interaction of location.interactions) {
      const apart = distance(this.player, interaction);
      if (apart <= interaction.radius && (!best || apart < best.distance)) best = { kind: 'interaction', interaction, distance: apart };
    }
    for (const npc of location.npcs) {
      const apart = distance(this.player, npc);
      if (apart <= 78 && (!best || apart < best.distance)) best = { kind: 'npc', npc, distance: apart };
    }
    return best;
  }

  private updateInteraction(input: InputSnapshot, delta: number, time: number): void {
    const nearby = this.nearby;
    const justPressed = input.interact && !this.interactWasDown;
    this.interactWasDown = input.interact;
    if (!nearby) {
      this.heldTargetId = null;
      this.heldMs = 0;
      ui.setNearby(null, 0);
      if (justPressed && time >= this.interactionCooldownUntil) {
        audio.playSfx('back', .34);
        ui.toast('Nothing useful is within reach. Move closer to a glowing prop or colleague.', 'info');
        this.interactionCooldownUntil = time + 900;
      }
      return;
    }
    const id = nearby.kind === 'interaction' ? nearby.interaction.id : nearby.npc.id;
    const baseHoldMs = nearby.kind === 'interaction' ? nearby.interaction.holdMs ?? 280 : 260;
    const holdMs = baseHoldMs / CHARACTERS[session.run!.characterId].stats.interactionRate;
    const prompt = nearby.kind === 'interaction'
      ? { verb: nearby.interaction.verb, label: nearby.interaction.label }
      : { verb: 'Talk', label: `${nearby.npc.name} · ${nearby.npc.role}` };
    if (this.heldTargetId !== id) { this.heldTargetId = id; this.heldMs = 0; }
    if (input.interact && time >= this.interactionCooldownUntil) this.heldMs += delta;
    else if (!input.interact) this.heldMs = 0;
    const progress = Phaser.Math.Clamp(this.heldMs / holdMs, 0, 1);
    ui.setNearby(prompt, progress);
    if (progress < 1) return;
    this.heldMs = 0;
    this.interactionCooldownUntil = time + 520;
    this.player.playInteraction();
    if (nearby.kind === 'npc') {
      audio.playSfx('confirm', .45);
      ui.showDialogue([{ speaker: nearby.npc.name, text: nearby.npc.line }]);
      return;
    }
    const result = session.interact(nearby.interaction.id);
    this.handleInteractionResult(nearby.interaction.id, result);
  }

  private handleInteractionResult(id: string, result: ReturnType<typeof session.interact>): void {
    const cue = this.sfxForInteraction(id);
    audio.playSfx(result.success ? cue : 'back', result.success ? .72 : .5);
    if (result.success && id.startsWith('pig_')) audio.playSfx('pig', .3);
    if (result.success && id.startsWith('sheep_')) audio.playSfx('sheep', .3);
    if (result.success && id.startsWith('baboon_')) audio.playSfx('baboon', .28);
    ui.toast(result.message, result.success ? (result.objectiveCompleted ? 'success' : 'info') : 'warn');
    if (!result.success) return;
    this.refreshProp(id);
    if (result.dialogueKey === 'wayne_choice') {
      ui.showDialogue([{
        speaker: 'Wayne',
        text: 'That blue car is staying pristine. How exactly are you proposing I move it?',
        expression: 'annoyed',
        choices: [
          { label: 'Ask with clinical precision', response: 'Fine. I will move it myself. Nobody breathes near the paint.', effect: 'wayneDown' },
          { label: 'Call it a trolley with windows', response: 'That is not remotely funny. It is, however, moving.', effect: 'wayneUp' },
        ],
      }]);
    } else if (result.dialogueKey === 'juan_car') {
      ui.showDialogue([{ speaker: 'Juan', text: 'I will move mine. You finish the lane and I will defend the coffee promise.' }]);
    }
    if (result.objectiveCompleted) {
      audio.playSfx('objective', .85);
      this.refreshAllProps();
      const objective = session.currentObjective;
      const dialogue = objective ? OBJECTIVE_DIALOGUE[objective.id] : undefined;
      if (dialogue) {
        const protagonist = CHARACTERS[session.run!.characterId].name;
        ui.showDialogue(dialogue.map((line) => line.speaker === 'Player' ? { ...line, speaker: protagonist } : line));
      }
    }
    if (result.gameCompleted) {
      audio.playSfx('success', .9);
      ui.showDialogue(FINAL_DIALOGUE, () => {
        this.scene.pause();
        ui.showEnding();
      });
    }
    ui.refresh();
  }

  private refreshProp(id: string): void {
    const run = session.run;
    const interaction = LOCATIONS[run!.locationId].interactions.find((candidate) => candidate.id === id);
    if (!interaction) return;
    const previous = this.propObjects.get(id);
    if (id.startsWith('car_') && run!.completedTargets.includes(id) && previous) {
      this.propObjects.delete(id);
      this.tweens.add({
        targets: previous,
        x: previous.x + (id === 'car_wayne' ? 230 : -180),
        alpha: 0,
        duration: session.settings.reducedMotion ? 1 : 520,
        ease: 'Cubic.In',
        onComplete: () => previous.destroy(true),
      });
      return;
    }
    previous?.destroy(true);
    const object = createInteractionProp(this, interaction, run!.completedTargets.includes(id));
    object.setAlpha(this.isCurrentTarget(id) ? 1 : .45);
    this.propObjects.set(id, object);
  }

  private activeObstacles(location: LocationDefinition): readonly ObstacleDefinition[] {
    if (location.id !== 'carPark') return location.obstacles;
    const completed = session.run?.completedTargets ?? [];
    return location.obstacles.filter((obstacle) => !obstacle.id.startsWith('car_') || !completed.includes(obstacle.id));
  }

  private refreshAllProps(): void {
    const run = session.run!;
    for (const interaction of LOCATIONS[run.locationId].interactions) {
      const object = this.propObjects.get(interaction.id);
      object?.setAlpha(this.isCurrentTarget(interaction.id) ? 1 : run.completedTargets.includes(interaction.id) ? .45 : .7);
    }
  }

  private isCurrentTarget(id: string): boolean {
    return session.currentObjective?.targets.some((target) => target === id) ?? false;
  }

  private updateExits(time: number): void {
    const run = session.run!;
    const location = LOCATIONS[run.locationId];
    const exit = location.exits.find((candidate) => circleIntersectsRect(this.player, 21, candidate));
    if (!this.exitsArmed) {
      if (!exit) this.exitsArmed = true;
      return;
    }
    if (time < this.transitionCooldownUntil || this.transitionLocked || this.nearby) return;
    if (!exit) return;
    if (exit.requiredFlag && !session.hasFlag(exit.requiredFlag)) {
      ui.toast(exit.lockedLine ?? 'That route is not available yet.', 'warn');
      audio.playSfx('latch', .52);
      this.transitionCooldownUntil = time + 1200;
      return;
    }
    this.transitionLocked = true;
    audio.playSfx('door', .65);
    audio.playSfx('transition', .45);
    const finish = () => {
      session.transitionTo(exit.destination, exit.destinationSpawn);
      this.scene.restart();
    };
    if (session.settings.reducedMotion) finish();
    else this.cameras.main.fadeOut(280, 3, 9, 16, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => { if (progress === 1) finish(); });
  }

  private createLocationHazard(): void {
    if (session.run?.locationId !== 'carPark') return;
    const body = this.add.rectangle(0, -12, 76, 34, 0xd9b83e).setStrokeStyle(3, 0x1a2025, .75);
    const roof = this.add.rectangle(0, -22, 36, 21, 0x26394a);
    const beacon = this.add.circle(0, -40, 6, 0xff665f, .9);
    const wheels = [this.add.circle(-25, 6, 7, 0x10151a), this.add.circle(25, 6, 7, 0x10151a)];
    this.hazard = this.add.container(250, 610, [body, roof, beacon, ...wheels]).setDepth(760);
    this.tweens.add({ targets: beacon, alpha: .2, duration: 260, yoyo: true, repeat: -1 });
  }

  private updateAmbient(seconds: number, time: number): void {
    const run = session.run;
    if (!run || run.locationId !== 'carPark' || !this.hazard) return;
    this.hazard.x += this.hazardDirection * 112 * seconds;
    if (this.hazard.x > 1150) { this.hazard.x = 1150; this.hazardDirection = -1; this.hazard.scaleX = -1; }
    if (this.hazard.x < 190) { this.hazard.x = 190; this.hazardDirection = 1; this.hazard.scaleX = 1; }
    if (time >= this.hornAt) {
      audio.playSfx('horn', .58);
      ui.caption('HONK — Thanh is interpreting lane discipline.');
      this.hornAt = time + 6400;
    }
    if (distance(this.player, this.hazard) < 58 && time >= this.hazardHitAt && !ui.isBlocking) {
      const damage = run.relaxed ? 10 : 22;
      session.adjustMeters({ health: -damage, stress: run.relaxed ? 5 : 12, wayne: run.relaxed ? 2 : 5 });
      this.player.playHit();
      audio.playSfx('horn', .9);
      ui.toast('Thanh has completed an unscheduled proximity test.', 'danger');
      ui.caption('IMPACT · health reduced');
      this.hazardHitAt = time + 1650;
    }
    if (session.currentObjective?.id === 'clear_carpark' && !ui.isBlocking) {
      session.updateMeters({ wayne: run.meters.wayne + (run.relaxed ? .22 : .48) * seconds }, false);
    }
  }

  private updateRoss(time: number): void {
    if (session.run?.locationId !== 'mainHall' || this.rossTriggered) return;
    const ross = LOCATIONS.mainHall.npcs.find((npc) => npc.id === 'ross');
    if (!ross || distance(this.player, ross) > 72) { this.rossTrapAt = 0; return; }
    if (this.rossTrapAt === 0) this.rossTrapAt = time;
    if (time - this.rossTrapAt < 950) return;
    this.rossTriggered = true;
    this.rossTrappedUntil = time + (session.run.relaxed ? 1800 : 3500);
    session.adjustMeters({ stress: session.run.relaxed ? 3 : 8 });
    ui.toast('Ross has one quick corridor question. Press DODGE to escape.', 'warn');
    ui.showDialogue([{ speaker: 'Ross', text: 'Quick question. Have you considered the full philosophical meaning of corridor etiquette?' }], () => {
      this.rossTrappedUntil = Math.max(this.rossTrappedUntil, this.time.now + 700);
    });
  }

  private releaseRossTrap(): void {
    this.rossTrappedUntil = 0;
    session.adjustMeters({ stress: -3, stamina: -6 });
    audio.playSfx('transition', .4);
    ui.toast('You escaped before “quick” acquired a second agenda.', 'success');
  }

  private sfxForInteraction(id: string): SfxCue {
    if (id.includes('feed')) return 'feed';
    if (id.includes('sample')) return 'sample';
    if (id.includes('car_')) return id === 'car_wayne' ? 'horn' : 'door';
    if (id.includes('coffee')) return 'coffee';
    if (id.includes('console') || id.includes('station') || id.includes('scale') || id.includes('support')) return 'machine';
    return 'use';
  }
}
