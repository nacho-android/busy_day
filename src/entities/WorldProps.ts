import Phaser from 'phaser';
import { getWorldArt, THANH_CAR_ART, WORLD_SPRITE_SHEETS, type WorldArtDefinition } from '../data/worldArt';
import type { InteractionDefinition, LocationDefinition } from '../types/game';

function stableNumber(value: string): number {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 17);
}

function animationKey(art: WorldArtDefinition, purpose: string, frames: readonly number[]): string {
  return `busy-day-world-${art.sheet}-${purpose}-${frames.join('-')}`;
}

function ensureAnimation(
  scene: Phaser.Scene,
  art: WorldArtDefinition,
  purpose: string,
  frames: readonly number[],
  frameRate: number,
  repeat: number,
  yoyo = false,
): string | null {
  if (frames.length < 2) return null;
  const sheet = WORLD_SPRITE_SHEETS[art.sheet];
  const key = animationKey(art, purpose, frames);
  if (!scene.anims.exists(key)) {
    scene.anims.create({
      key,
      frames: frames.map((frame) => ({ key: sheet.key, frame })),
      frameRate,
      repeat,
      yoyo,
    });
  }
  return key;
}

function playFrames(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  art: WorldArtDefinition,
  purpose: string,
  frames: readonly number[],
  frameRate: number,
  repeat: number,
  yoyo = false,
): void {
  const key = ensureAnimation(scene, art, purpose, frames, frameRate, repeat, yoyo);
  if (key) sprite.play(key, true);
  else if (frames[0] !== undefined) sprite.setFrame(frames[0]);
}

function createArtSprite(
  scene: Phaser.Scene,
  art: WorldArtDefinition,
  scale: number,
  completed: boolean,
): Phaser.GameObjects.Sprite {
  const sheet = WORLD_SPRITE_SHEETS[art.sheet];
  const initial = completed ? art.actionFrames[0] ?? art.idleFrames[0] : art.idleFrames[0];
  const sprite = scene.add.sprite(0, 2, sheet.key, initial ?? 0)
    .setOrigin(.5, art.originY ?? .84)
    .setScale(art.displayScale * scale);
  if (completed) {
    const frameRate = art.motion === 'machine' ? 2.8 : 5;
    const repeat = art.motion === 'machine' ? -1 : 0;
    playFrames(scene, sprite, art, 'complete', art.actionFrames, frameRate, repeat, true);
  }
  else playFrames(scene, sprite, art, 'idle', art.idleFrames, art.motion === 'animal' ? 2.4 : 1.8, -1, true);
  return sprite;
}

function addAmbientMotion(
  scene: Phaser.Scene,
  wrapper: Phaser.GameObjects.Container,
  sprite: Phaser.GameObjects.Sprite,
  art: WorldArtDefinition,
  id: string,
  completed: boolean,
): void {
  const seed = stableNumber(id);
  if (art.motion === 'animal' && !completed) {
    const idleFrames = art.idleFrames;
    const actionFrames = [idleFrames[0]!, ...art.actionFrames, idleFrames[0]!];
    scene.time.addEvent({
      delay: 2800 + seed % 2400,
      loop: true,
      callback: () => {
        if (!sprite.active || sprite.anims.isPlaying && sprite.anims.currentAnim?.key.includes('action')) return;
        playFrames(scene, sprite, art, 'action', actionFrames, 3.2, 0);
        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          if (sprite.active) playFrames(scene, sprite, art, 'idle', idleFrames, 2.4, -1, true);
        });
      },
    });
    scene.tweens.add({ targets: sprite, y: { from: 1, to: -1.5 }, duration: 850 + seed % 350, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return;
  }

  if (art.motion === 'trolley') {
    scene.tweens.add({ targets: sprite, angle: { from: -.35, to: .35 }, y: { from: 2, to: 0 }, duration: 1150 + seed % 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return;
  }

  if (art.motion === 'vehicle') {
    const reflection = scene.add.ellipse(0, -24, 75, 9, 0xbfeaff, .09).setBlendMode(Phaser.BlendModes.ADD);
    wrapper.addAt(reflection, 1);
    scene.tweens.add({ targets: reflection, alpha: { from: .04, to: .2 }, scaleX: { from: .82, to: 1.14 }, duration: 1450 + seed % 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return;
  }

  if (art.motion === 'steam') {
    scene.tweens.add({ targets: sprite, y: { from: 5, to: -7 }, alpha: { from: .55, to: .95 }, scaleX: { from: sprite.scaleX * .88, to: sprite.scaleX * 1.08 }, duration: 1250, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return;
  }

  if (art.motion === 'machine') {
    const glow = scene.add.ellipse(0, -27, 64, 36, completed ? 0x72f3bf : 0x5ce5df, completed ? .2 : .1)
      .setBlendMode(Phaser.BlendModes.ADD);
    wrapper.addAt(glow, 1);
    scene.tweens.add({ targets: glow, alpha: { from: completed ? .12 : .05, to: completed ? .34 : .2 }, scale: { from: .88, to: 1.14 }, duration: 720 + seed % 480, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return;
  }

  if (art.motion === 'board' && completed) {
    const confirmation = scene.add.rectangle(0, -24, 56, 5, 0x76f0c3, .5).setBlendMode(Phaser.BlendModes.ADD);
    wrapper.add(confirmation);
    scene.tweens.add({ targets: confirmation, alpha: { from: .25, to: .8 }, duration: 900, yoyo: true, repeat: -1 });
  }
}

export function createInteractionProp(
  scene: Phaser.Scene,
  interaction: InteractionDefinition,
  completed: boolean,
  location: LocationDefinition,
): Phaser.GameObjects.Container {
  const art = getWorldArt(interaction);
  const scale = perspectiveScale(interaction.y, location);
  const shadowWidth = WORLD_SPRITE_SHEETS[art.sheet].frameWidth * art.displayScale * scale * .58;
  const shadow = scene.add.ellipse(0, 5, shadowWidth, Math.max(10, shadowWidth * .2), 0x000000, .34);
  const focus = scene.add.ellipse(0, 6, Math.max(38, shadowWidth * .8), Math.max(13, shadowWidth * .2), completed ? 0x72ba9e : 0x60e8d8, completed ? .025 : .07)
    .setStrokeStyle(completed ? 1 : 2, completed ? 0x72ba9e : 0x60e8d8, completed ? .16 : .48);
  const sprite = createArtSprite(scene, art, scale, completed);
  if (interaction.id === 'pig_feed_2') {
    // Only the head and forequarters project through the lower feeding hatch;
    // the rest of the animal remains visually inside the fixed pen.
    sprite.setCrop(72, 0, 88, WORLD_SPRITE_SHEETS.animals.frameHeight);
  }
  if (interaction.id === 'pig_feed_3') {
    // Crop coordinates are evaluated after the right-side sprite is mirrored.
    sprite.setCrop(0, 0, 88, WORLD_SPRITE_SHEETS.animals.frameHeight);
  }
  // The south-right pen opens toward the aisle, so its pig faces out through
  // the feeding threshold while the body remains occluded by the authored pen.
  if (interaction.id === 'pig_feed_3') sprite.setFlipX(true);
  const wrapper = scene.add.container(interaction.x, interaction.y, [shadow, focus, sprite]).setDepth(interaction.y + 30);
  wrapper.setData('interactionId', interaction.id);
  wrapper.setData('mainSprite', sprite);
  wrapper.setData('worldArt', art);
  if (!completed) {
    scene.tweens.add({ targets: focus, scaleX: 1.28, scaleY: 1.22, alpha: .13, duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  addAmbientMotion(scene, wrapper, sprite, art, interaction.id, completed);
  return wrapper;
}

/**
 * Plays a prop's authored interaction state without marking it permanently
 * complete. This is used by successful optional consoles: they acknowledge
 * the input, then return to their ambient standby cycle.
 */
export function playWorldPropAction(
  scene: Phaser.Scene,
  wrapper: Phaser.GameObjects.Container,
  interaction: InteractionDefinition,
): void {
  const art = getWorldArt(interaction);
  const sprite = wrapper.getData('mainSprite') as Phaser.GameObjects.Sprite | undefined;
  if (!sprite?.active || art.actionFrames.length === 0) return;

  const actionKey = ensureAnimation(scene, art, 'interaction', art.actionFrames, art.motion === 'machine' ? 3.4 : 5, 0, true);
  if (!actionKey) {
    sprite.setFrame(art.actionFrames[0]!);
    scene.time.delayedCall(320, () => {
      if (sprite.active) playFrames(scene, sprite, art, 'idle', art.idleFrames, art.motion === 'animal' ? 2.4 : 1.8, -1, true);
    });
    return;
  }

  sprite.play(actionKey, true);
  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    if (sprite.active) playFrames(scene, sprite, art, 'idle', art.idleFrames, art.motion === 'animal' ? 2.4 : 1.8, -1, true);
  });
}

export function animateWorldPropDeparture(
  scene: Phaser.Scene,
  wrapper: Phaser.GameObjects.Container,
  interaction: InteractionDefinition,
  reducedMotion: boolean,
  onComplete: () => void,
): void {
  const art = getWorldArt(interaction);
  const sprite = wrapper.getData('mainSprite') as Phaser.GameObjects.Sprite | undefined;
  if (sprite && art.movementFrames?.length) playFrames(scene, sprite, art, 'move', art.movementFrames, art.motion === 'vehicle' ? 7 : 5, -1, true);
  if (reducedMotion) {
    onComplete();
    return;
  }

  if (art.motion === 'vehicle') {
    const turnX = Math.min(1080, wrapper.x + 95);
    const turnY = Math.min(590, wrapper.y + 35);
    scene.tweens.add({
      targets: wrapper,
      x: turnX,
      y: turnY,
      angle: 5,
      duration: 560,
      ease: 'Sine.InOut',
      onUpdate: () => wrapper.setDepth(wrapper.y + 30),
      onComplete: () => {
        scene.tweens.add({
          targets: wrapper,
          x: 1360,
          y: Math.min(620, turnY + 20),
          scale: .64,
          alpha: .08,
          angle: 10,
          duration: 1160,
          ease: 'Cubic.In',
          onUpdate: () => wrapper.setDepth(wrapper.y + 30),
          onComplete,
        });
      },
    });
    return;
  }

  const leavesRight = interaction.id === 'pig_trolley';
  scene.tweens.add({
    targets: wrapper,
    x: leavesRight ? 1245 : 205,
    y: leavesRight ? 330 : 270,
    alpha: .05,
    angle: leavesRight ? -3 : 3,
    duration: 720,
    ease: 'Cubic.InOut',
    onComplete,
  });
}

export function createThanhVehicle(scene: Phaser.Scene, x: number, y: number, location: LocationDefinition): Phaser.GameObjects.Container {
  const scale = perspectiveScale(y, location);
  const shadow = scene.add.ellipse(0, 7, 90, 18, 0x000000, .38);
  const sprite = createArtSprite(scene, THANH_CAR_ART, scale, false);
  playFrames(scene, sprite, THANH_CAR_ART, 'hazard-drive', THANH_CAR_ART.movementFrames ?? THANH_CAR_ART.idleFrames, 7, -1, true);
  const wrapper = scene.add.container(x, y, [shadow, sprite]).setDepth(y + 150);
  const beacon = scene.add.circle(0, -48, 8, 0xff554f, .28).setBlendMode(Phaser.BlendModes.ADD);
  wrapper.add(beacon);
  scene.tweens.add({ targets: beacon, alpha: { from: .12, to: .8 }, scale: { from: .7, to: 1.45 }, duration: 260, yoyo: true, repeat: -1 });
  return wrapper;
}

export function perspectiveScale(y: number, location: LocationDefinition): number {
  const p = location.perspective;
  const t = Phaser.Math.Clamp((y - p.farY) / (p.nearY - p.farY), 0, 1);
  return Phaser.Math.Linear(p.farScale, p.nearScale, t);
}
