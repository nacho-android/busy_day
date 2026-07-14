import { describe, expect, it } from 'vitest';
import { PORTRAIT_ASSETS } from '../../src/data/assets';
import { CHARACTER_VISUALS, getVisual } from '../../src/data/characters';
import { LOCATION_LIST } from '../../src/data/locations';
import type { CharacterAnimationName } from '../../src/types/game';

const ANIMATION_NAMES: readonly CharacterAnimationName[] = [
  'contextual',
  'hit',
  'idle',
  'interaction',
  'walkAway',
  'walkLeft',
  'walkRight',
  'walkToward',
];

describe('replaceable character artwork catalog', () => {
  it('provides a complete rendering, animation, collision, portrait, and voice contract', () => {
    for (const [id, visual] of Object.entries(CHARACTER_VISUALS)) {
      expect(visual.id).toBe(id);
      expect(Object.keys(visual.animations).sort()).toEqual(ANIMATION_NAMES);
      expect(visual.displayScale).toBeGreaterThan(0);
      expect(visual.footprint.radius).toBeGreaterThan(0);
      expect(visual.footprint.bodyWidth).toBeGreaterThanOrEqual(visual.footprint.radius * 2);
      expect(visual.footprint.bodyHeight).toBeGreaterThan(visual.footprint.radius * 2);
      expect(visual.portrait.gradient).toHaveLength(2);
      expect(visual.voice.profile.length).toBeGreaterThan(2);
      expect(visual.voice.cadenceMs).toBeGreaterThan(0);

      for (const animation of Object.values(visual.animations)) {
        expect(animation.frames.length).toBeGreaterThan(0);
        expect(animation.frameRate).toBeGreaterThan(0);
        expect(animation.motion.bobPixels).toBeGreaterThanOrEqual(0);
      }

      if (visual.renderer === 'vector-paper-doll') expect(visual.vector).toBeDefined();
      if (visual.renderer === 'sprite-sheet') {
        expect(visual.assets.image).toBeDefined();
        expect(visual.frameLayout).toBeDefined();
      }
      if (visual.renderer === 'texture-atlas') expect(visual.assets.atlas).toBeDefined();
    }
  });

  it('keeps player collision footprints authored per character', () => {
    expect(getVisual('mel').footprint.radius).toBe(18);
    expect(getVisual('josh').footprint.radius).toBe(19);
  });

  it('maps each final rendered portrait through the replaceable character contract', () => {
    for (const [id, path] of Object.entries(PORTRAIT_ASSETS)) {
      const portrait = getVisual(id).portrait;
      expect(portrait.mode, id).toBe('image');
      expect(portrait.asset?.key, id).toBe(`portrait-${id}`);
      expect(portrait.asset?.path, id).toBe(path);
    }
  });

  it('gives every NPC a valid visual and valid data-driven ambient route', () => {
    for (const location of LOCATION_LIST) {
      for (const npc of location.npcs) {
        expect(CHARACTER_VISUALS[npc.visualId], `${location.id}.${npc.id}`).toBeDefined();
        expect(npc.ambient, `${location.id}.${npc.id}`).toBeDefined();
        if (npc.ambient?.mode !== 'patrol') continue;
        expect(npc.ambient.waypoints?.length, `${location.id}.${npc.id}`).toBeGreaterThanOrEqual(2);
        for (const waypoint of npc.ambient.waypoints ?? []) {
          expect(waypoint.x).toBeGreaterThanOrEqual(location.bounds.x);
          expect(waypoint.x).toBeLessThanOrEqual(location.bounds.x + location.bounds.width);
          expect(waypoint.y).toBeGreaterThanOrEqual(location.bounds.y);
          expect(waypoint.y).toBeLessThanOrEqual(location.bounds.y + location.bounds.height);
        }
      }
    }
  });

  it('keeps authored foreground crops inside their source backgrounds', () => {
    for (const location of LOCATION_LIST) {
      for (const layer of location.foregroundLayers ?? []) {
        expect(location.backgroundKey, `${location.id}.${layer.id}`).toBeDefined();
        expect(layer.x).toBeGreaterThanOrEqual(0);
        expect(layer.y).toBeGreaterThanOrEqual(0);
        expect(layer.x + layer.width).toBeLessThanOrEqual(1280);
        expect(layer.y + layer.height).toBeLessThanOrEqual(720);
        expect(layer.depth).toBeGreaterThan(700);
      }
    }
  });
});
