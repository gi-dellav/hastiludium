/**
 * 12×12 arena, movement, line-of-sight and shrinking-cage helpers. Pure; the
 * UI renders tiles with emoji, this module only decides geometry.
 */

export const GRID_SIZE = 12;

export type Tile = "floor" | "wall" | "pillar";

export interface Pos {
  readonly x: number;
  readonly y: number;
}

export interface Arena {
  readonly size: number;
  /** Row-major, `size * size` entries. */
  readonly tiles: readonly Tile[];
}

/**
 * Symmetric cover layout: walls block movement + line of sight, pillars block
 * line of sight only (passable, so they are pure cover). Corners stay open.
 */
const TEMPLATE: readonly string[] = [
  "............",
  "............",
  "..##....##..",
  "..#......#..",
  "............",
  "...P....P...",
  "...P....P...",
  "............",
  "..#......#..",
  "..##....##..",
  "............",
  "............",
];

function charToTile(ch: string): Tile {
  if (ch === "#") return "wall";
  if (ch === "P") return "pillar";
  return "floor";
}

export function genArena(): Arena {
  const size = GRID_SIZE;
  const tiles: Tile[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = TEMPLATE[y] ?? "";
    for (let x = 0; x < size; x += 1) {
      tiles.push(charToTile(row[x] ?? "."));
    }
  }
  return { size, tiles };
}

export function inBounds(arena: Arena, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < arena.size && y < arena.size;
}

export function tileAt(arena: Arena, x: number, y: number): Tile | undefined {
  if (!inBounds(arena, x, y)) return undefined;
  return arena.tiles[y * arena.size + x];
}

/** Walls stop movement; pillars are walkable cover. */
export function blocksMovement(tile: Tile | undefined): boolean {
  return tile === "wall";
}

/** Walls and pillars both break line of sight. */
export function blocksSight(tile: Tile | undefined): boolean {
  return tile === "wall" || tile === "pillar";
}

export function distance(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function key(pos: Pos): string {
  return `${pos.x},${pos.y}`;
}

const DIRS: readonly Pos[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/**
 * Tiles reachable from `from` within `budget` king moves (orthogonal or
 * diagonal), skipping walls and not cutting diagonal corners through walls.
 * Returns a Map of tile key → cost. `isBlocked` lets callers keep occupied
 * tiles out of the result without this module knowing about players.
 */
export function reachable(
  arena: Arena,
  from: Pos,
  budget: number,
  isBlocked?: (pos: Pos) => boolean,
): Map<string, number> {
  const out = new Map<string, number>();
  if (budget <= 0) return out;
  const start = key(from);
  const seen = new Map<string, number>([[start, 0]]);
  const queue: Pos[] = [from];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (!current) continue;
    const cost = seen.get(key(current)) ?? 0;
    if (cost >= budget) continue;
    for (const dir of DIRS) {
      const next: Pos = { x: current.x + dir.x, y: current.y + dir.y };
      if (!inBounds(arena, next.x, next.y)) continue;
      if (blocksMovement(tileAt(arena, next.x, next.y))) continue;
      if (dir.x !== 0 && dir.y !== 0) {
        const sideX = tileAt(arena, current.x + dir.x, current.y);
        const sideY = tileAt(arena, current.x, current.y + dir.y);
        if (blocksMovement(sideX) && blocksMovement(sideY)) continue;
      }
      const k = key(next);
      if (seen.has(k)) continue;
      const occupant = isBlocked?.(next) ?? false;
      if (occupant) continue;
      seen.set(k, cost + 1);
      out.set(k, cost + 1);
      queue.push(next);
    }
  }
  return out;
}

/** Bresenham line of sight; endpoints are ignored, walls/pillars block. */
export function hasLineOfSight(arena: Arena, a: Pos, b: Pos): boolean {
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  // First step leaves the attacker tile; loop stops before the target tile.
  for (;;) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    if (x0 === x1 && y0 === y1) return true;
    if (blocksSight(tileAt(arena, x0, y0))) return false;
  }
}

/** Number of hazard rings active at a given cage turn (1-based). */
export function hazardRings(turn: number): number {
  if (turn < 4) return 0;
  return 1 + Math.floor((turn - 4) / 2);
}

/** Ring index of a tile (0 = outermost). */
export function ringIndex(arena: Arena, pos: Pos): number {
  return Math.min(pos.x, pos.y, arena.size - 1 - pos.x, arena.size - 1 - pos.y);
}

export function isHazard(arena: Arena, pos: Pos, rings: number): boolean {
  if (rings <= 0) return false;
  return ringIndex(arena, pos) < rings;
}

/** Spawn tiles by player count: 4 corners, or opposite edges for 2 players. */
export function spawnPositions(count: number): Pos[] {
  const max = GRID_SIZE - 2;
  const corners: Pos[] = [
    { x: 1, y: 1 },
    { x: max, y: 1 },
    { x: 1, y: max },
    { x: max, y: max },
  ];
  if (count >= 4) return corners.slice(0, 4);
  if (count === 3) {
    return [
      { x: 1, y: 1 },
      { x: max, y: 1 },
      { x: 1, y: max },
    ];
  }
  if (count === 2) {
    const mid = Math.floor(GRID_SIZE / 2);
    return [
      { x: 1, y: mid },
      { x: max, y: mid - 1 },
    ];
  }
  return [corners[0] ?? { x: 1, y: 1 }];
}
