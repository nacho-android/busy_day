import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { CHARACTER_SPRITE_ASSETS } from '../../src/data/assets';
import { CHARACTER_VISUALS } from '../../src/data/characters';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function numericFrames(frames: readonly (number | string)[], label: string): number[] {
  return frames.map((frame) => {
    expect(typeof frame, `${label} must use numeric sheet frames`).toBe('number');
    return Number(frame);
  });
}

function frameHash(
  pixels: Buffer,
  imageWidth: number,
  channels: number,
  frameWidth: number,
  frameHeight: number,
  frame: number,
): string {
  const columns = imageWidth / frameWidth;
  const frameX = (frame % columns) * frameWidth;
  const frameY = Math.floor(frame / columns) * frameHeight;
  const hash = createHash('sha1');
  for (let row = 0; row < frameHeight; row += 1) {
    const start = ((frameY + row) * imageWidth + frameX) * channels;
    hash.update(pixels.subarray(start, start + frameWidth * channels));
  }
  return hash.digest('hex');
}

describe('character sprite-sheet animation contracts', () => {
  it('packs every NPC as four genuine 8-frame directional cycles', async () => {
    const npcEntries = Object.entries(CHARACTER_SPRITE_ASSETS).filter(([id]) => id !== 'mel' && id !== 'josh');

    for (const [id, assetPath] of npcEntries) {
      const visual = CHARACTER_VISUALS[id]!;
      expect(visual.renderer, id).toBe('sprite-sheet');
      expect(visual.frameLayout, id).toEqual({ frameWidth: 128, frameHeight: 192, startFrame: 0, endFrame: 31 });

      const { data, info } = await sharp(resolve(ROOT, 'public', 'assets', assetPath))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect([info.width, info.height, info.channels], id).toEqual([1024, 768, 4]);

      const groups = {
        towardIdle: visual.directionalFrames?.idle?.toward ?? [],
        awayIdle: visual.directionalFrames?.idle?.away ?? [],
        rightIdle: visual.directionalFrames?.idle?.right ?? [],
        leftIdle: visual.directionalFrames?.idle?.left ?? [],
        towardWalk: visual.animations.walkToward.frames,
        awayWalk: visual.animations.walkAway.frames,
        rightWalk: visual.animations.walkRight.frames,
        leftWalk: visual.animations.walkLeft.frames,
        towardAction: visual.directionalFrames?.interaction?.toward ?? [],
        awayAction: visual.directionalFrames?.interaction?.away ?? [],
        rightAction: visual.directionalFrames?.interaction?.right ?? [],
        leftAction: visual.directionalFrames?.interaction?.left ?? [],
      };

      for (const [groupName, rawFrames] of Object.entries(groups)) {
        const frames = numericFrames(rawFrames, `${id}.${groupName}`);
        expect(frames.length, `${id}.${groupName}`).toBe(groupName.includes('Walk') ? 4 : 2);
        expect(new Set(frames).size, `${id}.${groupName} frame indices`).toBe(frames.length);
        const hashes = frames.map((frame) => frameHash(data, info.width, info.channels, 128, 192, frame));
        expect(new Set(hashes).size, `${id}.${groupName} rendered pixels`).toBe(frames.length);
      }
    }
  }, 30_000);

  it('keeps both Mel and Josh interaction cells visually distinct in every direction', async () => {
    for (const id of ['mel', 'josh'] as const) {
      const visual = CHARACTER_VISUALS[id]!;
      const assetPath = CHARACTER_SPRITE_ASSETS[id];
      const { data, info } = await sharp(resolve(ROOT, 'public', 'assets', assetPath))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect([info.width, info.height, info.channels], id).toEqual([1024, 1024, 4]);

      for (const direction of ['toward', 'away', 'right', 'left'] as const) {
        const frames = numericFrames(visual.directionalFrames?.interaction?.[direction] ?? [], `${id}.${direction}`);
        expect(frames, `${id}.${direction}`).toHaveLength(2);
        const hashes = frames.map((frame) => frameHash(data, info.width, info.channels, 128, 256, frame));
        expect(new Set(hashes).size, `${id}.${direction} interaction pixels`).toBe(2);
      }
    }
  });
});
