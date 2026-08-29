// Pure game engine — no DOM, no React. Board state is a plain 2D array and
// every function here is a straightforward transform over it, so it can be
// unit-tested and swapped to a different renderer without touching this file.

import { COLORS, LINE_MIN, SIZE } from "./constants";
import { rng } from "./rng";
import type { Board, Cell, ColorIndex } from "./types";

export function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<ColorIndex | null>(SIZE).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function randomColor(): ColorIndex {
  return Math.floor(rng.random() * COLORS);
}

export function randomColors(n: number): ColorIndex[] {
  return Array.from({ length: n }, randomColor);
}

/** Count of each color currently on the board, indexed by color. */
export function colorCounts(board: Board): number[] {
  const counts = Array<number>(COLORS).fill(0);
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) counts[cell]!++;
    }
  }
  return counts;
}

/** Picks a color weighted toward colors already present on the board — the
 * more of a color already on the table, the likelier it spawns again, which
 * makes lines easier to complete (and to run into by accident). A +1
 * smoothing weight keeps every color reachable even when absent. */
export function weightedRandomColor(board: Board): ColorIndex {
  const weights = colorCounts(board).map((count) => count + 1);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

export function weightedRandomColors(board: Board, n: number): ColorIndex[] {
  return Array.from({ length: n }, () => weightedRandomColor(board));
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function emptyCells(board: Board): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r]![c] === null) out.push({ r, c });
    }
  }
  return out;
}

/** BFS shortest path between two cells through empty cells only (4-directional).
 * Returns the full walkable path (inclusive of both ends), or null if unreachable. */
export function findPath(board: Board, from: Cell, to: Cell): Cell[] | null {
  const visited = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const prev = Array.from({ length: SIZE }, () => Array<Cell | null>(SIZE).fill(null));
  const queue: Cell[] = [from];
  visited[from.r]![from.c] = true;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++]!;
    if (cur.r === to.r && cur.c === to.c) break;
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (!inBounds(nr, nc)) continue;
      if (visited[nr]![nc]) continue;
      if (board[nr]![nc] !== null) continue;
      visited[nr]![nc] = true;
      prev[nr]![nc] = cur;
      queue.push({ r: nr, c: nc });
    }
  }

  if (!visited[to.r]![to.c]) return null;

  const path: Cell[] = [];
  let cur: Cell | null = to;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur.r]![cur.c] ?? null;
  }
  return path;
}

/** Returns the set of cells forming a line of >= LINE_MIN through (r, c),
 * across all four directions (—, |, \, /), unioned. Empty if none. */
export function findLinesThrough(board: Board, { r, c }: Cell): Cell[] {
  const color = board[r]![c];
  if (color === null) return [];

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;

  const result = new Map<string, Cell>();

  for (const [dr, dc] of directions) {
    const line: Cell[] = [{ r, c }];
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && board[nr]![nc] === color) {
      line.push({ r: nr, c: nc });
      nr += dr;
      nc += dc;
    }
    nr = r - dr;
    nc = c - dc;
    while (inBounds(nr, nc) && board[nr]![nc] === color) {
      line.unshift({ r: nr, c: nc });
      nr -= dr;
      nc -= dc;
    }
    if (line.length >= LINE_MIN) {
      for (const cell of line) result.set(`${cell.r},${cell.c}`, cell);
    }
  }

  return [...result.values()];
}

/** All empty cells reachable from `from` via 4-directional travel through
 * empty cells (flood fill) — used to preview legal destinations. */
export function reachableFrom(board: Board, from: Cell): Cell[] {
  const visited = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const queue: Cell[] = [from];
  visited[from.r]![from.c] = true;
  const out: Cell[] = [];

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++]!;
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (!inBounds(nr, nc)) continue;
      if (visited[nr]![nc]) continue;
      if (board[nr]![nc] !== null) continue;
      visited[nr]![nc] = true;
      const cell = { r: nr, c: nc };
      out.push(cell);
      queue.push(cell);
    }
  }
  return out;
}

/** Base 2 points per marble, escalating bonus for longer lines. */
export function scoreForClear(n: number): number {
  return n * 2 + Math.max(0, n - LINE_MIN) * 3;
}

const LINE_DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

/** The length of the longest same-color run that would pass through an empty
 * cell if it were filled with `color` — i.e. "how long a line would this
 * complete." Used to spot near-complete lines worth defending against. */
export function longestRunThrough(board: Board, { r, c }: Cell, color: ColorIndex): number {
  let best = 1;
  for (const [dr, dc] of LINE_DIRECTIONS) {
    let length = 1;
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && board[nr]![nc] === color) {
      length++;
      nr += dr;
      nc += dc;
    }
    nr = r - dr;
    nc = c - dc;
    while (inBounds(nr, nc) && board[nr]![nc] === color) {
      length++;
      nr -= dr;
      nc -= dc;
    }
    if (length > best) best = length;
  }
  return best;
}

export interface CellThreat {
  cell: Cell;
  color: ColorIndex;
  /** Resulting run length if this cell were filled with `color`. */
  length: number;
}

/** Scans every empty cell for near-complete lines — cells that, if filled
 * with a given color, would extend an existing run to at least `minLength`.
 * Sorted most urgent (longest resulting run) first. This is what the spawner
 * uses to find the player's in-progress lines worth blocking. */
export function findTopThreats(board: Board, minLength = 3): CellThreat[] {
  const threats: CellThreat[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r]![c] !== null) continue;
      for (let color = 0; color < COLORS; color++) {
        const length = longestRunThrough(board, { r, c }, color);
        if (length >= minLength) threats.push({ cell: { r, c }, color, length });
      }
    }
  }
  return threats.sort((a, b) => b.length - a.length);
}

export interface SpawnAssignment {
  cells: Cell[];
  /** True if at least one of `cells` was chosen specifically to block a near-complete line. */
  blocked: boolean;
}

/** Assigns each of `colors` (already decided, e.g. from the next-up queue) to
 * an empty cell. When `enableBlocking` is on, it prefers the board's most
 * urgent near-complete lines, placing a *different* color there to block it,
 * falling back to a random empty cell when no block is available or useful
 * for that color. This is the "AI" behind the difficulty: it doesn't change
 * what colors spawn, only where they land. The caller decides *when*
 * blocking is allowed (e.g. only some turns) via `enableBlocking`. */
export function assignSpawnCells(
  board: Board,
  colors: ColorIndex[],
  minBlockLength = 3,
  enableBlocking = true,
): SpawnAssignment {
  const remainingFree = emptyCells(board);
  const toPlace = Math.min(colors.length, remainingFree.length);
  if (toPlace === 0) return { cells: [], blocked: false };

  const threats = enableBlocking ? findTopThreats(board, minBlockLength) : [];
  const usedKeys = new Set<string>();
  const assigned: Cell[] = [];
  let blocked = false;

  for (let i = 0; i < toPlace; i++) {
    const color = colors[i]!;
    const blocker = threats.find((t) => t.color !== color && !usedKeys.has(`${t.cell.r},${t.cell.c}`));
    const idx = blocker
      ? remainingFree.findIndex((c) => c.r === blocker.cell.r && c.c === blocker.cell.c)
      : Math.floor(rng.random() * remainingFree.length);

    const cell = remainingFree.splice(idx, 1)[0]!;
    usedKeys.add(`${cell.r},${cell.c}`);
    assigned.push(cell);
    if (blocker) blocked = true;
  }

  return { cells: assigned, blocked };
}
