import { describe, expect, it } from 'vitest';
import { canOccupy, circleIntersectsRect, distance, moveCircle } from '../../src/systems/collision';

const bounds = { x: 0, y: 0, width: 100, height: 100 } as const;

describe('collision helpers', () => {
  it('keeps the full player footprint within the walkable bounds', () => {
    expect(canOccupy({ x: 5, y: 5 }, 5, bounds, [])).toBe(true);
    expect(canOccupy({ x: 4.99, y: 5 }, 5, bounds, [])).toBe(false);
    expect(canOccupy({ x: 95, y: 95 }, 5, bounds, [])).toBe(true);
    expect(canOccupy({ x: 95.01, y: 95 }, 5, bounds, [])).toBe(false);
  });

  it('rejects obstacle overlap while allowing exact edge contact', () => {
    const obstacle = { x: 40, y: 40, width: 10, height: 10 } as const;
    expect(canOccupy({ x: 35, y: 45 }, 5, bounds, [obstacle])).toBe(true);
    expect(canOccupy({ x: 35.01, y: 45 }, 5, bounds, [obstacle])).toBe(false);
    expect(canOccupy({ x: 55, y: 45 }, 5, bounds, [obstacle])).toBe(true);
  });

  it('substeps movement so a fast player cannot tunnel through a barrier', () => {
    const barrier = { x: 45, y: 0, width: 10, height: 100 } as const;
    const result = moveCircle({ x: 20, y: 50 }, { x: 70, y: 0 }, 5, bounds, [barrier]);

    expect(result.x).toBeLessThan(40);
    expect(result.x).toBeGreaterThan(20);
    expect(result.y).toBe(50);
    expect(result.collidedX).toBe(true);
    expect(result.collidedY).toBe(false);
  });

  it('slides along an obstacle when only one axis is blocked', () => {
    const barrier = { x: 40, y: 0, width: 10, height: 100 } as const;
    const result = moveCircle({ x: 20, y: 20 }, { x: 30, y: 30 }, 5, bounds, [barrier]);

    expect(result.x).toBeCloseTo(32);
    expect(result.y).toBeCloseTo(50);
    expect(result.collidedX).toBe(true);
    expect(result.collidedY).toBe(false);
  });

  it('reports circle/rectangle contact and point distance at boundaries', () => {
    const rect = { x: 20, y: 20, width: 20, height: 20 } as const;
    expect(circleIntersectsRect({ x: 10, y: 30 }, 10, rect)).toBe(true);
    expect(circleIntersectsRect({ x: 9.99, y: 30 }, 10, rect)).toBe(false);
    expect(circleIntersectsRect({ x: 30, y: 30 }, 0, rect)).toBe(true);
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
