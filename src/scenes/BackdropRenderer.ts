import type Phaser from 'phaser';
import { session } from '../state/GameSession';
import type { LocationDefinition } from '../types/game';

const THEME_COLORS = {
  social: ['#1a3440', '#07131f', '#8bd8c8'], corridor: ['#17313a', '#070d14', '#d19b57'], storage: ['#2d332d', '#0a1216', '#db9d4b'],
  animal: ['#28424a', '#0b1820', '#83c7af'], clinical: ['#1b3442', '#06101a', '#66d9dd'], exterior: ['#152635', '#03070d', '#ff5fa9'], coffee: ['#4b2c28', '#100a0b', '#ffd27a'],
} as const;

function seededNoise(context: CanvasRenderingContext2D, seed: number): void {
  let value = seed >>> 0;
  for (let index = 0; index < 1600; index += 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const x = value % 1280;
    value = (value * 1664525 + 1013904223) >>> 0;
    const y = value % 720;
    const alpha = ((value >>> 24) / 255) * .08;
    context.fillStyle = `rgba(255,255,255,${alpha})`;
    context.fillRect(x, y, 1 + (value % 2), 1 + (value % 2));
  }
}

function buildProceduralTexture(scene: Phaser.Scene, location: LocationDefinition): string {
  const key = `backdrop-${location.id}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, 1280, 720);
  if (!texture) return '__MISSING';
  const context = texture.context;
  const [upper, lower, accent] = THEME_COLORS[location.theme];
  const wall = context.createLinearGradient(0, 0, 0, 720);
  wall.addColorStop(0, '#03070d'); wall.addColorStop(.16, upper); wall.addColorStop(.38, lower); wall.addColorStop(1, '#050a10');
  context.fillStyle = wall; context.fillRect(0, 0, 1280, 720);
  const floor = context.createLinearGradient(0, 180, 0, 700);
  floor.addColorStop(0, `${upper}ee`); floor.addColorStop(.45, '#17232a'); floor.addColorStop(1, '#0b1117');
  context.beginPath(); context.moveTo(75, 185); context.lineTo(1205, 185); context.lineTo(1275, 700); context.lineTo(5, 700); context.closePath(); context.fillStyle = floor; context.fill();
  context.strokeStyle = 'rgba(144,196,197,.10)'; context.lineWidth = 1;
  for (let y = 235; y < 690; y += 68) { context.beginPath(); context.moveTo(22, y); context.lineTo(1258, y); context.stroke(); }
  for (let x = 90; x < 1250; x += 110) { context.beginPath(); context.moveTo(640 + (x - 640) * .78, 185); context.lineTo(x, 700); context.stroke(); }
  context.strokeStyle = `${accent}55`; context.lineWidth = 3; context.strokeRect(60, 105, 1160, 565);
  for (let index = 0; index < 9; index += 1) {
    const x = 100 + index * 135;
    const glow = context.createRadialGradient(x, 124, 2, x, 124, 95);
    glow.addColorStop(0, `${accent}68`); glow.addColorStop(1, `${accent}00`); context.fillStyle = glow; context.fillRect(x - 95, 30, 190, 190);
    context.fillStyle = index % 3 === 0 ? '#ff62aa' : accent; context.fillRect(x - 16, 111, 32, 5);
  }
  seededNoise(context, [...location.id].reduce((sum, char) => sum + char.charCodeAt(0), 0));
  const vignette = context.createRadialGradient(640, 390, 220, 640, 390, 760);
  vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.78)'); context.fillStyle = vignette; context.fillRect(0, 0, 1280, 720);
  texture.refresh();
  return key;
}

function addThemeDecor(scene: Phaser.Scene, location: LocationDefinition): void {
  const graphics = scene.add.graphics().setDepth(12);
  graphics.lineStyle(2, 0x8fd8d0, .12);
  if (location.theme === 'social' && !location.backgroundKey) {
    graphics.fillStyle(0x6d4c32, .9).fillRoundedRect(390, 270, 370, 190, 18).lineStyle(4, 0xc49360, .22).strokeRoundedRect(390, 270, 370, 190, 18);
    [[410,255],[735,255],[410,470],[735,470]].forEach(([x,y]) => graphics.fillStyle(0xd9ded8,.65).fillRoundedRect(x!, y!, 50, 42, 8));
  } else if (location.theme === 'storage' && !location.backgroundKey) {
    for (let shelf = 0; shelf < 5; shelf += 1) {
      const x = 250 + shelf * 185; graphics.fillStyle(0x263f3b, .9).fillRoundedRect(x, 122, 145, 105, 7);
      for (let box = 0; box < 3; box += 1) graphics.fillStyle(0x9b784f, .62).fillRect(x + 12 + box * 41, 155, 31, 29);
    }
  } else if (location.theme === 'animal' && !location.backgroundKey) {
    graphics.lineStyle(5, 0x9bb6b6, .35);
    location.obstacles.filter((item) => item.id.includes('pen') || item.id.includes('cage')).forEach((item) => {
      graphics.strokeRoundedRect(item.x, item.y, item.width, item.height, 8);
      for (let x = item.x + 20; x < item.x + item.width; x += 28) graphics.lineBetween(x, item.y, x, item.y + item.height);
    });
  } else if (location.theme === 'clinical' && !location.backgroundKey) {
    graphics.fillStyle(0x203747, .88); location.obstacles.forEach((item) => graphics.fillRoundedRect(item.x, item.y, item.width, item.height, 10));
    graphics.lineStyle(3, 0x61ddd6, .4); location.obstacles.forEach((item) => graphics.strokeRoundedRect(item.x, item.y, item.width, item.height, 10));
  } else if (location.theme === 'coffee' && !location.backgroundKey) {
    graphics.fillStyle(0x5b332b, .85).fillRoundedRect(690, 145, 440, 145, 12);
    graphics.fillStyle(0xffd27a, .22).fillRoundedRect(720, 175, 380, 76, 8);
    for (let index = 0; index < 10; index += 1) graphics.fillStyle(index % 2 ? 0x68e2d5 : 0xff61aa, .6).fillCircle(170 + index * 98, 150 + Math.sin(index) * 8, 4);
  }
  if (location.id === 'carPark') {
    const rain = scene.add.graphics().setDepth(900);
    rain.lineStyle(1, 0xa9d6ef, .24);
    for (let index = 0; index < 95; index += 1) {
      const x = (index * 137) % 1280; const y = (index * 79) % 720; rain.lineBetween(x, y, x - 8, y + 28);
    }
    scene.tweens.add({ targets: rain, alpha: .48, duration: 800, yoyo: true, repeat: -1 });
  }
}

function addForegroundLayers(scene: Phaser.Scene, location: LocationDefinition): void {
  if (!location.backgroundKey) return;
  for (const layer of location.foregroundLayers ?? []) {
    const textureKey = layer.textureKey ?? location.backgroundKey;
    scene.add.image(layer.x, layer.y, textureKey)
      .setName(`foreground:${layer.id}`)
      .setOrigin(0, 0)
      .setCrop(layer.x, layer.y, layer.width, layer.height)
      .setTint(0xdcdcdc)
      .setAlpha(layer.alpha ?? 1)
      .setDepth(layer.depth);
  }
}

export function renderBackdrop(scene: Phaser.Scene, location: LocationDefinition): void {
  if (location.backgroundKey) {
    scene.add.image(640, 360, location.backgroundKey).setDisplaySize(1280, 720).setDepth(0);
    scene.add.rectangle(640, 360, 1280, 720, 0x03101a, location.id === 'carPark' ? .08 : .14).setDepth(1);
  } else {
    scene.add.image(640, 360, buildProceduralTexture(scene, location)).setDepth(0);
  }
  addThemeDecor(scene, location);
  addForegroundLayers(scene, location);
  scene.add.text(78, 127, location.name.toUpperCase(), { fontFamily: 'Chakra Petch, Segoe UI, sans-serif', fontSize: '20px', color: '#d9f5f0', letterSpacing: 2, stroke: '#06101a', strokeThickness: 5 }).setDepth(20);
  scene.add.text(80, 154, location.subtitle, { fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '11px', color: '#9eb0bb', stroke: '#06101a', strokeThickness: 4 }).setDepth(20);
  for (const exit of location.exits) {
    const locked = Boolean(exit.requiredFlag && !session.hasFlag(exit.requiredFlag));
    scene.add.rectangle(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.width, exit.height, locked ? 0xffbb67 : 0x5ce0d3, .045).setStrokeStyle(2, locked ? 0xffc57c : 0x69e9db, .5).setDepth(30);
    scene.add.text(exit.x + exit.width / 2, exit.y + exit.height / 2, `${exit.label}\n${locked ? '◇' : '↗'}`, { align: 'center', fontFamily: 'Chakra Petch, Segoe UI, sans-serif', fontSize: '10px', color: locked ? '#ffd7a0' : '#a7fff3', stroke: '#06101a', strokeThickness: 4 }).setOrigin(.5).setDepth(31);
  }
}
