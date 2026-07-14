import Phaser from 'phaser';
import { getVisual } from '../data/characters';
import type {
  CharacterAnimationName,
  CharacterVectorAppearance,
  CharacterVisualDefinition,
  Direction,
  LocationDefinition,
  Point,
} from '../types/game';

const INK = 0x091019;
const BOOT = 0x111923;

function shiftColour(colour: number, amount: number): number {
  const channel = (value: number): number => Phaser.Math.Clamp(value + amount, 0, 255);
  const red = channel((colour >> 16) & 0xff);
  const green = channel((colour >> 8) & 0xff);
  const blue = channel(colour & 0xff);
  return (red << 16) | (green << 8) | blue;
}

/**
 * A lightweight, palette-driven paper-doll rig. Every visible part is a vector
 * primitive so art can be replaced later without gameplay knowing how it was drawn.
 */
export class CharacterRig extends Phaser.GameObjects.Container {
  readonly visualId: string;
  readonly visual: CharacterVisualDefinition;
  direction: Direction = 'toward';
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly bodyLayer: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  private readonly torso: Phaser.GameObjects.Graphics;
  private readonly head: Phaser.GameObjects.Graphics;
  private readonly leftLeg: Phaser.GameObjects.Graphics;
  private readonly rightLeg: Phaser.GameObjects.Graphics;
  private readonly leftArm: Phaser.GameObjects.Graphics;
  private readonly rightArm: Phaser.GameObjects.Graphics;
  private readonly accent: Phaser.GameObjects.Graphics;
  private readonly featureLayer: Phaser.GameObjects.Graphics;
  private phase = 0;
  private moving = false;
  private interacting = false;
  private baseScale = 1;
  private renderedDirection: Direction = 'toward';
  private activeAnimation: CharacterAnimationName = 'idle';

  get collisionRadius(): number {
    return this.visual.footprint.radius;
  }

  private get vector(): CharacterVectorAppearance {
    if (!this.visual.vector) throw new Error(`Character ${this.visualId} has no vector appearance for ${this.visual.renderer}.`);
    return this.visual.vector;
  }

  private get textureKey(): string | null {
    if (this.visual.renderer === 'sprite-sheet') return this.visual.assets.image?.key ?? null;
    if (this.visual.renderer === 'texture-atlas') return this.visual.assets.atlas?.key ?? null;
    return null;
  }

  constructor(scene: Phaser.Scene, x: number, y: number, visualId: string, label?: string) {
    const visual = getVisual(visualId);
    const shadow = scene.add.ellipse(0, 7, 43, 14, 0x000000, .42);

    const leftArm = scene.add.graphics();
    const leftLeg = scene.add.graphics();
    const rightLeg = scene.add.graphics();
    const torso = scene.add.graphics();
    const accent = scene.add.graphics();
    const rightArm = scene.add.graphics();
    const head = scene.add.graphics();
    const featureLayer = scene.add.graphics();
    const bodyLayer = scene.add.container(0, 0, [leftArm, leftLeg, rightLeg, torso, accent, rightArm, head, featureLayer]);
    const textureKey = visual.renderer === 'sprite-sheet' ? visual.assets.image?.key : visual.assets.atlas?.key;
    const sprite = visual.renderer === 'vector-paper-doll'
      ? null
      : textureKey && scene.textures.exists(textureKey)
        ? scene.add.sprite(0, visual.footprint.originY, textureKey).setOrigin(visual.spriteOrigin.x, visual.spriteOrigin.y)
        : null;

    if (visual.renderer !== 'vector-paper-doll' && !sprite) {
      throw new Error(`Character ${visualId} renderer ${visual.renderer} is missing its loaded texture.`);
    }
    bodyLayer.setVisible(visual.renderer === 'vector-paper-doll');

    const children: Phaser.GameObjects.GameObject[] = [shadow, bodyLayer];
    if (sprite) children.push(sprite);
    if (label) {
      const nameplate = scene.add.text(0, -96, label, {
        fontFamily: 'Inter, Segoe UI, sans-serif',
        fontSize: '12px',
        fontStyle: '600',
        color: '#f4f8fb',
        stroke: '#03101b',
        strokeThickness: 4,
      }).setOrigin(.5);
      children.push(nameplate);
    }

    super(scene, x, y, children);
    scene.add.existing(this);
    this.visualId = visualId;
    this.visual = visual;
    this.shadow = shadow;
    this.bodyLayer = bodyLayer;
    this.sprite = sprite;
    this.torso = torso;
    this.head = head;
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;
    this.leftArm = leftArm;
    this.rightArm = rightArm;
    this.accent = accent;
    this.featureLayer = featureLayer;
    this.baseScale = visual.displayScale;
    this.redrawArtwork();
    this.registerSpriteAnimations();
    this.playAnimation('idle', true);
    this.resetPartPositions();
    this.setSize(visual.footprint.bodyWidth, visual.footprint.bodyHeight);
  }

  private animationKey(name: CharacterAnimationName): string {
    return `busy-day-character-${this.visualId}-${name}`;
  }

  private registerSpriteAnimations(): void {
    const textureKey = this.textureKey;
    if (!this.sprite || !textureKey) return;
    for (const name of Object.keys(this.visual.animations) as CharacterAnimationName[]) {
      const key = this.animationKey(name);
      if (this.scene.anims.exists(key)) continue;
      const definition = this.visual.animations[name];
      this.scene.anims.create({
        key,
        frames: definition.frames.map((frame) => ({ key: textureKey, frame })),
        frameRate: definition.frameRate,
        repeat: definition.repeat,
        yoyo: definition.yoyo ?? false,
      });
    }
  }

  private playAnimation(name: CharacterAnimationName, restart = false): void {
    if (!restart && this.activeAnimation === name) return;
    this.activeAnimation = name;
    this.sprite?.play(this.animationKey(name), !restart);
  }

  faceToward(point: Point): void {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    this.direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'away' : 'toward');
  }

  private resetPartPositions(): void {
    const sideOn = this.direction === 'left' || this.direction === 'right';
    this.leftLeg.setPosition(sideOn ? -3 : -7, -12);
    this.rightLeg.setPosition(sideOn ? 3 : 7, -12);
    this.leftArm.setPosition(sideOn ? -7 : -18, -52);
    this.rightArm.setPosition(sideOn ? 10 : 18, -52);
    this.torso.setPosition(0, -35);
    this.accent.setPosition(0, -35);
    this.head.setPosition(sideOn ? 1 : 0, -68);
    this.featureLayer.setPosition(sideOn ? 1 : 0, -68);
    this.leftArm.setAlpha(sideOn ? .72 : 1);
    this.leftLeg.setAlpha(sideOn ? .82 : 1);
    this.bodyLayer.setScale(this.direction === 'left' ? -1 : 1, 1);
  }

  private redrawArtwork(): void {
    if (this.visual.renderer !== 'vector-paper-doll') return;
    const visual = this.vector;
    const sideOn = this.direction === 'left' || this.direction === 'right';
    const away = this.direction === 'away';
    this.drawLeg(this.leftLeg, visual.suit, visual.suitHighlight, false, sideOn);
    this.drawLeg(this.rightLeg, visual.suit, visual.suitHighlight, true, sideOn);
    this.drawArm(this.leftArm, visual.suit, visual.suitHighlight, visual.skin, false);
    this.drawArm(this.rightArm, visual.suit, visual.suitHighlight, visual.skin, true);
    this.drawTorso(sideOn, away);
    this.drawAccents(sideOn, away);
    this.drawHead(sideOn, away);
    this.drawFeatures(sideOn, away);
    this.resetPartPositions();
  }

  private drawLeg(
    graphics: Phaser.GameObjects.Graphics,
    suit: number,
    highlight: number,
    front: boolean,
    sideOn: boolean,
  ): void {
    const fill = front ? suit : shiftColour(suit, -18);
    const halfWidth = sideOn ? 5 : 5.5;
    const points = [
      { x: -halfWidth, y: -2 }, { x: halfWidth, y: -2 },
      { x: halfWidth - .8, y: 17 }, { x: 4, y: 21 },
      { x: -4, y: 21 }, { x: -halfWidth + .8, y: 17 },
    ];
    graphics.clear();
    graphics.fillStyle(INK, .82).fillRoundedRect(-halfWidth - 1.5, -3, halfWidth * 2 + 3, 27, 3);
    graphics.fillStyle(fill, 1).fillPoints(points, true);
    graphics.lineStyle(1.5, shiftColour(suit, -42), .9).strokePoints(points, true);
    graphics.lineStyle(1, highlight, .5).lineBetween(front ? 2 : -2, 1, front ? 1 : -1, 16);
    graphics.fillStyle(BOOT, 1).fillRoundedRect(-5, 17, sideOn ? 12 : 10, 9, 3);
    graphics.fillStyle(0x35404c, .8).fillRoundedRect(sideOn ? 0 : -3.5, 18.5, sideOn ? 6 : 7, 2, 1);
    graphics.lineStyle(1.5, 0x05090d, .9).lineBetween(-4, 24, sideOn ? 6 : 4, 24);
  }

  private drawArm(
    graphics: Phaser.GameObjects.Graphics,
    suit: number,
    highlight: number,
    skin: number,
    front: boolean,
  ): void {
    const fill = front ? suit : shiftColour(suit, -22);
    const points = [
      { x: -5.5, y: 0 }, { x: 5.5, y: 0 }, { x: 4.5, y: 21 },
      { x: 3.5, y: 27 }, { x: -3.5, y: 27 }, { x: -5, y: 20 },
    ];
    graphics.clear();
    graphics.fillStyle(INK, .75).fillRoundedRect(-6.5, -1, 13, 30, 4);
    graphics.fillStyle(fill, 1).fillPoints(points, true);
    graphics.lineStyle(1.5, shiftColour(suit, -44), .95).strokePoints(points, true);
    graphics.fillStyle(highlight, front ? .48 : .22).fillRoundedRect(front ? 1.5 : -3.5, 3, 2.5, 16, 1);
    graphics.fillStyle(highlight, .85).fillRect(-4, 22, 8, 3);
    graphics.fillStyle(INK, .55).fillRect(-4, 25, 8, 2);
    graphics.fillStyle(skin, 1).fillEllipse(0, 31, 8, 11);
    graphics.fillStyle(shiftColour(skin, 28), .42).fillEllipse(front ? 1.5 : -1.5, 29.5, 3, 5);
    graphics.lineStyle(1.4, INK, .7).strokeEllipse(0, 31, 8, 11);
  }

  private drawTorso(sideOn: boolean, away: boolean): void {
    const visual = this.vector;
    const halfShoulder = sideOn ? 13 : 18;
    const halfWaist = sideOn ? 11 : 14;
    const outline = [
      { x: -halfShoulder, y: -17 }, { x: -halfShoulder - 1, y: -9 },
      { x: -halfWaist, y: 20 }, { x: halfWaist, y: 20 },
      { x: halfShoulder + 1, y: -9 }, { x: halfShoulder, y: -17 },
      { x: sideOn ? 7 : 9, y: -21 }, { x: sideOn ? -7 : -9, y: -21 },
    ];
    this.torso.clear();
    this.torso.fillStyle(INK, .88).fillPoints(outline.map(({ x, y }) => ({ x: x * 1.07, y: y - 1 })), true);
    this.torso.fillStyle(visual.suit, 1).fillPoints(outline, true);
    this.torso.lineStyle(2, shiftColour(visual.suit, -48), .95).strokePoints(outline, true);

    if (sideOn) {
      this.torso.fillStyle(visual.suitHighlight, .32).fillPoints([
        { x: 4, y: -19 }, { x: 12, y: -15 }, { x: 11, y: 17 }, { x: 5, y: 19 },
      ], true);
      this.torso.lineStyle(1.2, visual.suitHighlight, .56).lineBetween(5, -15, 5, 15);
    } else {
      this.torso.fillStyle(visual.suitHighlight, away ? .16 : .25).fillPoints([
        { x: away ? -15 : 5, y: -14 }, { x: away ? 15 : 16, y: -14 },
        { x: away ? 12 : 12, y: 17 }, { x: away ? -12 : 5, y: 17 },
      ], true);
      this.torso.lineStyle(1.2, shiftColour(visual.suit, 38), .56).lineBetween(0, -10, 0, 18);
    }

    this.torso.fillStyle(shiftColour(visual.suit, -24), .65).fillRoundedRect(-halfWaist, 13, halfWaist * 2, 7, 2);
    this.torso.lineStyle(1, visual.suitHighlight, .45).lineBetween(-halfWaist + 2, 13, halfWaist - 2, 13);
  }

  private drawAccents(sideOn: boolean, away: boolean): void {
    const visual = this.vector;
    const graphics = this.accent.clear();
    if (away) {
      graphics.lineStyle(2, visual.accent, .76).lineBetween(-13, -13, 13, -13);
      graphics.lineStyle(1.2, visual.suitHighlight, .7).lineBetween(-13, -13, -8, -7).lineBetween(13, -13, 8, -7);
      graphics.fillStyle(visual.accent, .6).fillRoundedRect(-4, 5, 8, 3, 1);
      return;
    }

    if (sideOn) {
      graphics.fillStyle(shiftColour(visual.suit, -32), 1).fillTriangle(-6, -19, 6, -19, 2, -10);
      graphics.lineStyle(2, visual.accent, .82).lineBetween(1, -10, 4, 11);
      graphics.fillStyle(visual.accent, .92).fillRoundedRect(4, -5, 5, 7, 1);
      graphics.fillStyle(0xe9ffff, .72).fillCircle(6, -3, 1);
      return;
    }

    graphics.fillStyle(shiftColour(visual.suit, -34), 1)
      .fillTriangle(-9, -19, -1, -10, -1, -19)
      .fillTriangle(1, -19, 1, -10, 9, -19);
    graphics.lineStyle(1.5, visual.accent, .82).lineBetween(-9, -19, -1, -10).lineBetween(9, -19, 1, -10);
    graphics.fillStyle(visual.accent, .96).fillRoundedRect(5, -5, 7, 8, 1.5);
    graphics.fillStyle(0xeaffff, .78).fillCircle(8.5, -2.5, 1.2);
    graphics.lineStyle(1, visual.accent, .6).strokeRoundedRect(-10, 5, 8, 6, 1.5);
  }

  private drawHead(sideOn: boolean, away: boolean): void {
    const visual = this.vector;
    const graphics = this.head.clear();
    graphics.fillStyle(shiftColour(visual.skin, -30), 1).fillRoundedRect(-5, 10, 10, 14, 3);
    graphics.lineStyle(1.5, INK, .7).strokeRoundedRect(-5, 10, 10, 14, 3);

    if (sideOn) {
      graphics.fillStyle(INK, .78).fillEllipse(2, 0, 28, 32);
      graphics.fillStyle(visual.skin, 1).fillEllipse(2, 0, 25, 29);
      graphics.fillStyle(shiftColour(visual.skin, -24), .48).fillEllipse(-3, 1, 8, 25);
      graphics.fillStyle(visual.skin, 1).fillEllipse(-10, 0, 6, 9);
      graphics.lineStyle(1.2, INK, .55).strokeEllipse(-10, 0, 6, 9);
      graphics.fillStyle(shiftColour(visual.skin, 18), .8).fillTriangle(13, -3, 18, 1, 12, 3);
    } else {
      graphics.fillStyle(INK, .8).fillEllipse(0, 0, 29, 33);
      graphics.fillStyle(visual.skin, 1).fillEllipse(0, 0, 26, 30);
      graphics.fillStyle(shiftColour(visual.skin, -22), away ? .34 : .42).fillEllipse(-7, 1, 7, 25);
      graphics.fillStyle(visual.skin, 1).fillEllipse(-13, 0, 5, 9).fillEllipse(13, 0, 5, 9);
    }
  }

  private drawFeatures(sideOn: boolean, away: boolean): void {
    const visual = this.vector;
    const graphics = this.featureLayer.clear();
    this.drawHair(graphics, sideOn, away);
    if (away) {
      graphics.lineStyle(1.2, shiftColour(visual.hair, 34), .36).lineBetween(-8, -7, 8, -5);
      return;
    }

    if (sideOn) {
      graphics.fillStyle(shiftColour(visual.hair, -18), .8).fillRoundedRect(-12, -2, 3, 8, 1);
      graphics.fillStyle(0x101820, 1).fillEllipse(7, -3, 3.6, 4.6);
      graphics.fillStyle(0xf7ffff, .9).fillCircle(7.7, -3.7, .8);
      graphics.lineStyle(1.2, shiftColour(visual.skin, -38), .7).lineBetween(11, 2, 14, 3).lineBetween(14, 3, 11, 4);
      graphics.lineStyle(1.2, shiftColour(visual.skin, -48), .78).lineBetween(6, 8, 11, 8);
      if (visual.glasses) {
        graphics.lineStyle(2, 0x17222d, 1).strokeEllipse(7, -3, 10, 9).lineBetween(2, -3, -10, -5);
        graphics.lineStyle(1, 0xaee8ef, .65).lineBetween(5, -5, 8, -6);
      }
      if (visual.facialHair) {
        graphics.fillStyle(visual.hair, .76).fillTriangle(8, 4, 14, 5, 9, 8);
        graphics.fillStyle(visual.hair, .52).fillRoundedRect(5, 9, 7, 4, 2);
      }
      return;
    }

    graphics.fillStyle(0x101820, 1).fillEllipse(-5, -3, 3.5, 4.5).fillEllipse(5, -3, 3.5, 4.5);
    graphics.fillStyle(0xf7ffff, .9).fillCircle(-4.4, -3.8, .75).fillCircle(5.6, -3.8, .75);
    graphics.lineStyle(1.1, shiftColour(visual.hair, -18), .78).lineBetween(-8, -7, -2, -7).lineBetween(2, -7, 8, -7);
    graphics.lineStyle(1.2, shiftColour(visual.skin, -40), .72).lineBetween(0, -1, -1.5, 4).lineBetween(-1.5, 4, 1.5, 4);
    graphics.lineStyle(1.2, shiftColour(visual.skin, -55), .85).lineBetween(-4, 8, 4, 8);
    if (visual.glasses) {
      graphics.lineStyle(2, 0x17222d, 1).strokeEllipse(-5.5, -3, 11, 9).strokeEllipse(5.5, -3, 11, 9).lineBetween(0, -3, 1, -3);
      graphics.lineStyle(1, 0xbdeeff, .68).lineBetween(-8, -5, -5, -6).lineBetween(3, -5, 6, -6);
    }
    if (visual.facialHair) {
      graphics.fillStyle(visual.hair, .82).fillEllipse(-3, 5, 7, 4).fillEllipse(3, 5, 7, 4);
      graphics.fillStyle(visual.hair, .5).fillRoundedRect(-6, 8, 12, 6, 3);
    }
  }

  private drawHair(graphics: Phaser.GameObjects.Graphics, sideOn: boolean, away: boolean): void {
    const visual = this.vector;
    const hairLight = shiftColour(visual.hair, 26);
    graphics.fillStyle(visual.hair, 1);

    if (visual.hairStyle === 'cap') {
      graphics.fillRoundedRect(-14, -16, 29, 11, 6);
      graphics.fillStyle(hairLight, .65).fillRoundedRect(-10, -14, 17, 3, 1.5);
      graphics.fillStyle(shiftColour(visual.hair, -26), 1);
      if (sideOn) graphics.fillRoundedRect(5, -8, 15, 4, 2);
      else graphics.fillRoundedRect(-15, -8, 30, 4, 2);
      return;
    }

    if (visual.hairStyle === 'bald') {
      graphics.lineStyle(2, visual.hair, .72).strokeEllipse(0, 1, sideOn ? 25 : 26, 29);
      graphics.fillStyle(hairLight, .35).fillEllipse(sideOn ? 5 : 3, -10, 5, 2);
      graphics.fillStyle(visual.hair, .72).fillCircle(-10, -4, 2.5).fillCircle(sideOn ? -9 : 10, -4, 2.5);
      return;
    }

    if (visual.hairStyle === 'long') {
      graphics.fillRoundedRect(-15, -13, 7, 34, 4).fillRoundedRect(8, -13, 7, 34, 4).fillEllipse(0, -10, 28, 14);
      graphics.fillStyle(hairLight, .38).fillRoundedRect(sideOn ? 8 : -12, -10, 3, 25, 1.5);
    } else {
      graphics.fillEllipse(0, -10, sideOn ? 27 : 28, 14);
      graphics.fillTriangle(-13, -9, -9, 1, -6, -8).fillTriangle(7, -9, 11, 0, 13, -9);
      graphics.fillStyle(hairLight, .4).fillEllipse(sideOn ? 4 : 2, -12, 11, 3);
    }

    if (visual.hairStyle === 'pony') {
      graphics.fillStyle(shiftColour(visual.hair, -10), 1).fillEllipse(sideOn ? -14 : 13, 1, 9, 20);
      graphics.fillStyle(hairLight, .5).fillRect(sideOn ? -17 : 10, -2, 6, 2);
    }
    if (away) {
      graphics.fillStyle(visual.hair, .82).fillRoundedRect(-11, -8, 22, 15, 6);
    }
  }

  updateRig(vx: number, vy: number, deltaSeconds: number, location: LocationDefinition): void {
    const speed = Math.hypot(vx, vy);
    this.moving = speed > 2;
    if (this.moving) {
      if (Math.abs(vx) > Math.abs(vy)) this.direction = vx < 0 ? 'left' : 'right';
      else this.direction = vy < 0 ? 'away' : 'toward';
    }

    const animationName: CharacterAnimationName = this.moving
      ? this.direction === 'left' ? 'walkLeft'
        : this.direction === 'right' ? 'walkRight'
          : this.direction === 'away' ? 'walkAway' : 'walkToward'
      : 'idle';
    const animation = this.visual.animations[animationName];
    const cycleFrames = Math.max(1, animation.frames.length);
    const speedFactor = this.moving ? Phaser.Math.Clamp(speed / 210, .72, 1.45) : 1;
    this.phase += deltaSeconds * animation.frameRate * speedFactor * Phaser.Math.PI2 / cycleFrames;
    if (!this.interacting) this.playAnimation(animationName);

    if (this.direction !== this.renderedDirection) {
      this.renderedDirection = this.direction;
      this.redrawArtwork();
    }

    const motion = animation.motion;
    const wave = Math.sin(this.phase);
    const walk = this.moving ? wave : 0;
    const bob = this.moving ? Math.abs(Math.cos(this.phase)) * motion.bobPixels : wave * motion.bobPixels;
    const sideOn = this.direction === 'left' || this.direction === 'right';
    this.torso.y = -35 - bob;
    this.torso.rotation = (this.moving ? walk : Math.sin(this.phase * .5)) * motion.torsoSwayRadians;
    this.head.y = -68 - bob;
    this.head.rotation = (this.moving ? -walk : Math.sin(this.phase * .42)) * motion.headSwayRadians;
    this.featureLayer.y = -68 - bob;
    this.featureLayer.rotation = this.head.rotation;
    this.accent.y = -35 - bob;
    this.accent.rotation = this.torso.rotation;
    this.leftLeg.y = -12 + walk * motion.legTravelPixels;
    this.rightLeg.y = -12 - walk * motion.legTravelPixels;
    this.leftLeg.rotation = walk * motion.legSwingRadians;
    this.rightLeg.rotation = -walk * motion.legSwingRadians;
    if (!this.interacting) {
      const idleSway = (this.moving ? walk : Math.sin(this.phase * .55)) * motion.armSwingRadians;
      this.leftArm.rotation = idleSway;
      this.rightArm.rotation = -idleSway;
    }
    this.leftArm.y = -52 - bob;
    this.rightArm.y = -52 - bob;
    this.shadow.scaleX = this.moving ? 1.08 : 1;
    this.shadow.scaleY = sideOn ? .86 : 1;
    this.shadow.alpha = .36 + Math.sin(this.phase * .5) * motion.shadowPulse;

    const perspective = location.perspective;
    const t = Phaser.Math.Clamp((this.y - perspective.farY) / (perspective.nearY - perspective.farY), 0, 1);
    const perspectiveScale = Phaser.Math.Linear(perspective.farScale, perspective.nearScale, t);
    this.setScale(this.baseScale * perspectiveScale);
    this.setDepth(Math.round(this.y + 100));
  }

  playInteraction(): void {
    const animation = this.visual.animations.interaction;
    const stepMs = Math.max(60, 1000 / animation.frameRate);
    this.interacting = true;
    this.playAnimation('interaction', true);
    this.scene.tweens.killTweensOf([this.leftArm, this.rightArm, this.accent]);
    this.scene.tweens.add({
      targets: this.rightArm,
      rotation: { from: -animation.motion.armSwingRadians * .28, to: -animation.motion.armSwingRadians },
      yoyo: animation.yoyo ?? true,
      repeat: Math.max(0, animation.repeat),
      duration: stepMs,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.interacting = false;
        this.rightArm.setRotation(0);
      },
    });
    this.scene.tweens.add({ targets: this.accent, alpha: { from: .5, to: 1 }, yoyo: true, repeat: 2, duration: stepMs * .7 });
    if (this.sprite) {
      const totalMs = Math.max(stepMs, animation.frames.length / animation.frameRate * 1000 * (Math.max(0, animation.repeat) + 1));
      this.scene.time.delayedCall(totalMs, () => { this.interacting = false; });
    }
  }

  playReaction(style: 'wave' | 'inspect' | 'startle' = 'wave'): void {
    if (this.interacting) return;
    const animation = this.visual.animations.contextual;
    const stepMs = Math.max(75, 1000 / animation.frameRate);
    const reach = animation.motion.armSwingRadians * (style === 'startle' ? .72 : style === 'inspect' ? .38 : 1);
    this.interacting = true;
    this.playAnimation('contextual', true);
    this.scene.tweens.killTweensOf([this.leftArm, this.rightArm, this.head]);
    this.scene.tweens.add({
      targets: style === 'startle' ? [this.leftArm, this.rightArm] : this.rightArm,
      rotation: style === 'inspect' ? -.38 : -reach,
      yoyo: true,
      repeat: 1,
      duration: stepMs,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.interacting = false;
        this.leftArm.setRotation(0);
        this.rightArm.setRotation(0);
      },
    });
  }

  playHit(): void {
    const animation = this.visual.animations.hit;
    const stepMs = Math.max(55, 1000 / animation.frameRate);
    this.interacting = true;
    this.playAnimation('hit', true);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      angle: { from: -6, to: 6 },
      x: this.x - 12,
      yoyo: true,
      duration: stepMs,
      repeat: Math.max(0, animation.repeat),
      ease: 'Sine.InOut',
      onComplete: () => { this.interacting = false; this.setAngle(0); },
    });
  }
}
