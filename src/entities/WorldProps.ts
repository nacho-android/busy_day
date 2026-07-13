import Phaser from 'phaser';
import type { InteractionDefinition, LocationDefinition } from '../types/game';

function marker(scene: Phaser.Scene, color: number): Phaser.GameObjects.Arc {
  return scene.add.circle(0, 2, 22, color, .08).setStrokeStyle(2, color, .75);
}

function pig(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const body = scene.add.ellipse(0, -16, 46, 28, 0xeaa6a0).setStrokeStyle(2, 0x6d4244, .75);
  const head = scene.add.ellipse(22, -18, 24, 22, 0xf0b1aa);
  const snout = scene.add.ellipse(31, -16, 12, 9, 0xd98987);
  const ear = scene.add.triangle(18, -32, 0, 10, 10, 0, 18, 11, 0xd98b89);
  const legs = [-13, 8].map((x) => scene.add.rectangle(x, 0, 6, 17, 0xc77f7d).setOrigin(.5, 0));
  return scene.add.container(0, 0, [body, head, snout, ear, ...legs]);
}

function sheep(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const puffs = [-18, -8, 3, 14, 22].map((x, index) => scene.add.circle(x, -18 - (index % 2) * 4, 15, 0xe8e2d5));
  const head = scene.add.ellipse(29, -18, 19, 25, 0x5c554f);
  const legs = [-11, 12].map((x) => scene.add.rectangle(x, -4, 5, 20, 0x524c47).setOrigin(.5, 0));
  return scene.add.container(0, 0, [...puffs, head, ...legs]);
}

function baboon(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const body = scene.add.ellipse(0, -19, 34, 41, 0x7a5745).setStrokeStyle(2, 0x352a25, .8);
  const head = scene.add.circle(2, -45, 14, 0x866250);
  const muzzle = scene.add.ellipse(9, -40, 15, 10, 0xc17c78);
  const tail = scene.add.arc(-9, -15, 28, 60, 250, false).setStrokeStyle(5, 0x6a4d40).setFillStyle(0, 0);
  return scene.add.container(0, 0, [tail, body, head, muzzle]);
}

function cart(scene: Phaser.Scene, trolley = false): Phaser.GameObjects.Container {
  const base = scene.add.rectangle(0, -10, trolley ? 66 : 50, trolley ? 32 : 41, trolley ? 0x65707c : 0x3e6f69).setStrokeStyle(3, 0x9cb8b3, .8);
  const rail = scene.add.rectangle(0, -32, trolley ? 70 : 54, 5, 0xb4c0c3);
  const handle = scene.add.rectangle(-32, -20, 5, 42, 0xaab8ba);
  const wheels = [scene.add.circle(-20, 10, 6, 0x121820), scene.add.circle(20, 10, 6, 0x121820)];
  if (trolley) {
    const payload = pig(scene).setPosition(0, -22).setScale(.82).setAlpha(.9);
    return scene.add.container(0, 0, [base, rail, handle, ...wheels, payload]);
  }
  return scene.add.container(0, 0, [base, rail, handle, ...wheels]);
}

function machine(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const console = scene.add.rectangle(0, -18, 48, 39, 0x263b47).setStrokeStyle(2, 0x72e6dd, .7);
  const screen = scene.add.rectangle(0, -22, 29, 14, 0x54ded2, .48);
  const lights = [-11, 0, 11].map((x, index) => scene.add.circle(x, -2, 3, index === 1 ? 0xff68ac : 0xffd37c, .9));
  return scene.add.container(0, 0, [console, screen, ...lights]);
}

function car(scene: Phaser.Scene, id: string): Phaser.GameObjects.Container {
  const colors: Record<string, number> = { car_sally: 0xb65b76, car_alan: 0x708a68, car_vu: 0x7e6cb1, car_max: 0xc48d4e, car_juan: 0x707b86, car_wayne: 0x197bd4 };
  const body = scene.add.rectangle(0, -16, 82, 39, colors[id] ?? 0x637481).setStrokeStyle(3, 0xdce9ec, .32);
  const roof = scene.add.rectangle(0, -20, 40, 27, 0x152637, .85);
  const lights = [scene.add.rectangle(-31, -34, 12, 5, 0xffd988), scene.add.rectangle(31, -34, 12, 5, 0xffd988)];
  return scene.add.container(0, 0, [body, roof, ...lights]);
}

export function createInteractionProp(scene: Phaser.Scene, interaction: InteractionDefinition, completed: boolean): Phaser.GameObjects.Container {
  let prop: Phaser.GameObjects.Container;
  if (interaction.prop === 'animal') {
    prop = interaction.id.startsWith('pig') ? pig(scene) : interaction.id.startsWith('sheep') || interaction.id === 'shearing_station' ? sheep(scene) : baboon(scene);
  } else if (interaction.prop === 'cart') prop = cart(scene);
  else if (interaction.prop === 'trolley') prop = cart(scene, true);
  else if (interaction.prop === 'car') prop = car(scene, interaction.id);
  else if (interaction.prop === 'machine') prop = machine(scene);
  else if (interaction.prop === 'coffee') {
    const cup = scene.add.rectangle(0, -13, 24, 26, 0xe8e1cf).setStrokeStyle(2, 0x5d4c3c);
    const steam = scene.add.arc(2, -35, 12, 190, 340, false).setStrokeStyle(2, 0xf2f7f5, .6).setFillStyle(0, 0);
    prop = scene.add.container(0, 0, [cup, steam]);
  } else if (interaction.prop === 'board') {
    prop = scene.add.container(0, 0, [scene.add.rectangle(0, -25, 62, 46, 0x223e4a).setStrokeStyle(2, 0x78dbd4), scene.add.rectangle(0, -25, 43, 4, 0xffd27a)]);
  } else {
    prop = scene.add.container(0, 0, [scene.add.circle(0, -12, 17, 0x6b7f88).setStrokeStyle(2, 0xa9c6c9)]);
  }
  const pulse = marker(scene, completed ? 0x6d8c88 : 0x62e0d5);
  const check = scene.add.text(0, -58, completed ? '✓' : '◆', { fontFamily: 'Segoe UI, sans-serif', fontSize: completed ? '18px' : '12px', color: completed ? '#86baa9' : '#77f2e5', stroke: '#03101b', strokeThickness: 4 }).setOrigin(.5);
  const wrapper = scene.add.container(interaction.x, interaction.y, [pulse, prop, check]).setDepth(interaction.y + 30);
  if (!completed) scene.tweens.add({ targets: pulse, scale: 1.35, alpha: .18, duration: 980, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  if (interaction.prop === 'animal') scene.tweens.add({ targets: prop, y: -2, duration: 700 + (interaction.x % 300), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  if (interaction.prop === 'coffee') scene.tweens.add({ targets: prop, angle: 3, duration: 1100, yoyo: true, repeat: -1 });
  wrapper.setData('interactionId', interaction.id);
  return wrapper;
}

export function perspectiveScale(y: number, location: LocationDefinition): number {
  const p = location.perspective;
  const t = Phaser.Math.Clamp((y - p.farY) / (p.nearY - p.farY), 0, 1);
  return Phaser.Math.Linear(p.farScale, p.nearScale, t);
}
