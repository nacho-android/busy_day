import type { Point, Rect } from '../types/game';

export interface CollisionResult extends Point {
  collidedX: boolean;
  collidedY: boolean;
}

function overlapsExpandedRect(point: Point, radius: number, rect: Rect): boolean {
  return point.x > rect.x - radius
    && point.x < rect.x + rect.width + radius
    && point.y > rect.y - radius
    && point.y < rect.y + rect.height + radius;
}

function insideBounds(point: Point, radius: number, bounds: Rect): boolean {
  return point.x >= bounds.x + radius
    && point.x <= bounds.x + bounds.width - radius
    && point.y >= bounds.y + radius
    && point.y <= bounds.y + bounds.height - radius;
}

export function canOccupy(point: Point, radius: number, bounds: Rect, obstacles: readonly Rect[]): boolean {
  return insideBounds(point, radius, bounds) && !obstacles.some((rect) => overlapsExpandedRect(point, radius, rect));
}

export function moveCircle(
  start: Point,
  delta: Point,
  radius: number,
  bounds: Rect,
  obstacles: readonly Rect[],
  maxStep = 7,
): CollisionResult {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y)) / maxStep));
  const stepX = delta.x / steps;
  const stepY = delta.y / steps;
  const position = { ...start };
  let collidedX = false;
  let collidedY = false;

  for (let index = 0; index < steps; index += 1) {
    const nextX = { x: position.x + stepX, y: position.y };
    if (canOccupy(nextX, radius, bounds, obstacles)) position.x = nextX.x;
    else collidedX = true;

    const nextY = { x: position.x, y: position.y + stepY };
    if (canOccupy(nextY, radius, bounds, obstacles)) position.y = nextY.y;
    else collidedY = true;
  }

  return { ...position, collidedX, collidedY };
}

export function circleIntersectsRect(point: Point, radius: number, rect: Rect): boolean {
  const closestX = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
  return Math.hypot(point.x - closestX, point.y - closestY) <= radius;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
