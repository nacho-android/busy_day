import { describe, expect, it } from 'vitest';
import { CHARACTER_VISUALS } from '../../src/data/characters';
import { LOCATION_LIST } from '../../src/data/locations';
import { getWorldArt, WORLD_SPRITE_SHEETS } from '../../src/data/worldArt';

const FRAME_COUNTS = {
  animals: 12,
  trolleys: 12,
  vehicles: 21,
  facility: 40,
} as const;

describe('generated sprite runtime contracts', () => {
  it('uses authored raster sheets for both leads and every placed NPC identity', () => {
    for (const id of ['mel', 'josh'] as const) {
      const visual = CHARACTER_VISUALS[id]!;
      expect(visual.renderer).toBe('sprite-sheet');
      expect(visual.frameLayout).toMatchObject({ frameWidth: 128, frameHeight: 256 });
      expect(visual.directionalFrames?.idle?.left).toHaveLength(2);
      expect(visual.directionalFrames?.interaction?.away).toHaveLength(2);
    }

    for (const location of LOCATION_LIST) {
      for (const npc of location.npcs) {
        const visual = CHARACTER_VISUALS[npc.visualId]!;
        expect(visual.renderer, `${location.id}.${npc.visualId}`).toBe('sprite-sheet');
        expect(visual.frameLayout, npc.visualId).toMatchObject({ frameWidth: 128, frameHeight: 192 });
        expect(visual.animations.walkLeft.frames, npc.visualId).toHaveLength(4);
        expect(visual.animations.walkRight.frames, npc.visualId).toHaveLength(4);
      }
    }
  });

  it('maps every interaction to an in-range generated art frame and action', () => {
    for (const location of LOCATION_LIST) {
      for (const interaction of location.interactions) {
        const art = getWorldArt(interaction);
        const maximum = FRAME_COUNTS[art.sheet];
        const frames = [...art.idleFrames, ...art.actionFrames, ...(art.movementFrames ?? [])];
        expect(WORLD_SPRITE_SHEETS[art.sheet].path, interaction.id).toMatch(/\.webp$/);
        expect(frames.length, interaction.id).toBeGreaterThan(0);
        for (const frame of frames) {
          expect(frame, `${interaction.id} frame ${frame}`).toBeGreaterThanOrEqual(0);
          expect(frame, `${interaction.id} frame ${frame}`).toBeLessThan(maximum);
        }
      }
    }
  });

  it('gives animals, trolleys, and cars authored movement/action frames', () => {
    for (const location of LOCATION_LIST) {
      for (const interaction of location.interactions) {
        if (!['animal', 'cart', 'trolley', 'car'].includes(interaction.prop)) continue;
        const art = getWorldArt(interaction);
        expect(art.actionFrames.length, interaction.id).toBeGreaterThan(0);
        expect(art.movementFrames?.length, interaction.id).toBeGreaterThan(0);
      }
    }
  });

  it('gives every interactive machine distinct authored standby and action frames', () => {
    for (const location of LOCATION_LIST) {
      for (const interaction of location.interactions) {
        const art = getWorldArt(interaction);
        if (art.motion !== 'machine') continue;
        expect(art.idleFrames.length, interaction.id).toBeGreaterThanOrEqual(2);
        expect(art.actionFrames.length, interaction.id).toBeGreaterThanOrEqual(2);
        expect(art.actionFrames, interaction.id).not.toEqual(art.idleFrames);
        expect(
          art.actionFrames.some((frame) => !art.idleFrames.includes(frame)),
          `${interaction.id} must have an active frame not reused by standby`,
        ).toBe(true);
      }
    }
  });

  it('uses a coherent elevated-camera scale profile in the Tea Room', () => {
    const tea = LOCATION_LIST.find((location) => location.id === 'teaRoom')!;
    const hall = LOCATION_LIST.find((location) => location.id === 'mainHall')!;
    const scaleAt = (y: number) => {
      const p = tea.perspective;
      const t = Math.min(1, Math.max(0, (y - p.farY) / (p.nearY - p.farY)));
      return p.farScale + (p.nearScale - p.farScale) * t;
    };

    expect(tea.perspective).not.toEqual(hall.perspective);
    expect(tea.perspective.farScale).toBeLessThan(hall.perspective.farScale);
    expect(scaleAt(205)).toBeCloseTo(.62, 2);
    expect(scaleAt(385)).toBeGreaterThan(.8);
    expect(scaleAt(520)).toBeGreaterThan(.98);
    expect(scaleAt(520)).toBeLessThanOrEqual(1.02);
    expect(scaleAt(520) - scaleAt(245)).toBeGreaterThan(.3);
  });

  it('authors a walk-through target for every exit in its travel direction', () => {
    for (const location of LOCATION_LIST) {
      for (const exit of location.exits) {
        const target = exit.portal?.target;
        expect(target, `${location.id}.${exit.id}`).toBeDefined();
        const centre = { x: exit.x + exit.width / 2, y: exit.y + exit.height / 2 };
        if (exit.facing === 'left') expect(target!.x, exit.id).toBeLessThan(centre.x);
        if (exit.facing === 'right') expect(target!.x, exit.id).toBeGreaterThan(centre.x);
        if (exit.facing === 'away') expect(target!.y, exit.id).toBeLessThan(centre.y);
        if (exit.facing === 'toward') expect(target!.y, exit.id).toBeGreaterThan(centre.y);
      }
    }
  });
});
