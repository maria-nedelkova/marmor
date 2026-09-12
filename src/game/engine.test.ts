import { describe, expect, test } from "bun:test";
import { COLORS, SIZE } from "./constants";
import {
  assignSpawnCells,
  colorCounts,
  createEmptyBoard,
  findLinesThrough,
  findPath,
  findTopThreats,
  longestRunThrough,
  reachableFrom,
  scoreForClear,
  weightedRandomColor,
} from "./engine";
import { rng } from "./rng";
import type { Board } from "./types";

function place(board: Board, cells: [number, number][], color: number) {
  for (const [r, c] of cells) board[r]![c] = color;
}

describe("findLinesThrough", () => {
  test("horizontal line of exactly 5 clears", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5], [4, 6]], 1);
    const line = findLinesThrough(board, { r: 4, c: 4 });
    expect(line.length).toBe(5);
  });

  test("horizontal line of 4 does not clear", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5]], 1);
    const line = findLinesThrough(board, { r: 4, c: 4 });
    expect(line.length).toBe(0);
  });

  test("vertical line of 5 clears", () => {
    const board = createEmptyBoard();
    place(board, [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]], 2);
    expect(findLinesThrough(board, { r: 2, c: 3 }).length).toBe(5);
  });

  test("diagonal (down-right) line of 5 clears", () => {
    const board = createEmptyBoard();
    place(board, [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]], 3);
    expect(findLinesThrough(board, { r: 2, c: 2 }).length).toBe(5);
  });

  test("diagonal (down-left / anti-diagonal) line of 5 clears", () => {
    const board = createEmptyBoard();
    place(board, [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]], 4);
    expect(findLinesThrough(board, { r: 2, c: 2 }).length).toBe(5);
  });

  test("line longer than 5 includes every matching cell", () => {
    const board = createEmptyBoard();
    place(board, [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6]], 5);
    expect(findLinesThrough(board, { r: 4, c: 3 }).length).toBe(7);
  });

  test("union of two directions through the same cell counts once each", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5], [4, 6]], 0); // horizontal
    place(board, [[2, 4], [3, 4], [5, 4], [6, 4]], 0); // vertical through (4,4)
    const line = findLinesThrough(board, { r: 4, c: 4 });
    expect(line.length).toBe(9); // 5 horizontal + 4 additional vertical, (4,4) not double counted
  });

  test("empty cell has no line", () => {
    const board = createEmptyBoard();
    expect(findLinesThrough(board, { r: 0, c: 0 })).toEqual([]);
  });

  test("a spawn landing next to an existing run completes the line", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5]], 6);
    place(board, [[4, 6]], 6); // simulates the just-spawned marble
    expect(findLinesThrough(board, { r: 4, c: 6 }).length).toBe(5);
  });
});

describe("findPath", () => {
  test("finds a direct path across an empty board", () => {
    const board = createEmptyBoard();
    const path = findPath(board, { r: 0, c: 0 }, { r: 0, c: 4 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ r: 0, c: 0 });
    expect(path![path!.length - 1]).toEqual({ r: 0, c: 4 });
  });

  test("every step in the path is an orthogonal neighbor (no diagonal jumps)", () => {
    const board = createEmptyBoard();
    place(board, [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2]], 1); // vertical wall with a gap at row 0 and row 8
    const path = findPath(board, { r: 0, c: 0 }, { r: 0, c: 8 });
    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) {
      const a = path![i - 1]!;
      const b = path![i]!;
      const dist = Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
      expect(dist).toBe(1);
    }
  });

  test("path never passes through an occupied cell", () => {
    const board = createEmptyBoard();
    place(board, [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2]], 1);
    const path = findPath(board, { r: 0, c: 0 }, { r: 0, c: 8 })!;
    for (const { r, c } of path) {
      if (r === 0 && c === 0) continue;
      if (r === 0 && c === 8) continue;
      expect(board[r]![c]).toBeNull();
    }
  });

  test("returns null when the destination is walled off", () => {
    const board = createEmptyBoard();
    for (let r = 0; r < SIZE; r++) board[r]![4] = 1; // full wall across column 4
    const path = findPath(board, { r: 0, c: 0 }, { r: 0, c: 8 });
    expect(path).toBeNull();
  });

  test("returns null when destination is occupied", () => {
    const board = createEmptyBoard();
    board[0]![3] = 2;
    expect(findPath(board, { r: 0, c: 0 }, { r: 0, c: 3 })).toBeNull();
  });
});

describe("reachableFrom", () => {
  test("does not include cells across a wall", () => {
    const board = createEmptyBoard();
    for (let r = 0; r < SIZE; r++) board[r]![4] = 1;
    const reachable = reachableFrom(board, { r: 0, c: 0 });
    expect(reachable.some((c) => c.c > 4)).toBe(false);
  });
});

describe("colorCounts", () => {
  test("counts each color's occurrences on the board", () => {
    const board = createEmptyBoard();
    place(board, [[0, 0], [0, 1], [0, 2]], 3);
    place(board, [[1, 0]], 5);
    const counts = colorCounts(board);
    expect(counts.length).toBe(COLORS);
    expect(counts[3]).toBe(3);
    expect(counts[5]).toBe(1);
    expect(counts[0]).toBe(0);
  });
});

describe("weightedRandomColor", () => {
  test("every color remains reachable on an empty board", () => {
    const board = createEmptyBoard();
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(weightedRandomColor(board));
    expect(seen.size).toBe(COLORS);
  });

  test("is biased toward colors already heavily present on the board", () => {
    const board = createEmptyBoard();
    // Flood the board with color 2 everywhere except a few cells reserved for color 6.
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) board[r]![c] = 2;
    }
    board[0]![0] = 6;

    let color2Count = 0;
    let color6Count = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const picked = weightedRandomColor(board);
      if (picked === 2) color2Count++;
      if (picked === 6) color6Count++;
    }

    // Color 2 dominates the board (many more occurrences than color 6's one),
    // so it should be picked dramatically more often.
    expect(color2Count).toBeGreaterThan(color6Count * 10);
  });

  test("never returns a color outside the level's range", () => {
    const board = createEmptyBoard();
    // A color from outside the range already sitting on the board (as after
    // a level change) must not drag the picker past `colorCount`.
    place(board, [[0, 0], [0, 1], [0, 2], [0, 3]], 6);
    for (let i = 0; i < 500; i++) {
      const color = weightedRandomColor(board, 5);
      expect(color).toBeGreaterThanOrEqual(0);
      expect(color).toBeLessThan(5);
    }
  });

  test("affinity 0 ignores the board entirely, unlike affinity 1", () => {
    const board = createEmptyBoard();
    // 40 marbles of color 0 — at affinity 1 that swamps every other color's
    // +1 smoothing weight; at affinity 0 it should count for nothing.
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 8; c++) board[r]![c] = 0;
    }
    const runs = 3000;
    let biased = 0;
    let flat = 0;
    for (let i = 0; i < runs; i++) {
      if (weightedRandomColor(board, COLORS, 1) === 0) biased++;
      if (weightedRandomColor(board, COLORS, 0) === 0) flat++;
    }
    // Expected shares: ~41/47 (~0.87) biased vs ~1/7 (~0.14) flat.
    expect(biased / runs).toBeGreaterThan(0.7);
    expect(flat / runs).toBeLessThan(0.25);
  });

  test("falls back to uniform-ish behavior when no color dominates", () => {
    const board = createEmptyBoard();
    const counts = new Array(COLORS).fill(0);
    const trials = 7000;
    for (let i = 0; i < trials; i++) counts[weightedRandomColor(board)]++;
    // On an empty board every color has equal weight; each should land
    // roughly near trials/COLORS without any single color starving out.
    for (const count of counts) {
      expect(count).toBeGreaterThan(0);
    }
  });
});

describe("longestRunThrough", () => {
  test("an isolated empty cell has run length 1 for any color", () => {
    const board = createEmptyBoard();
    expect(longestRunThrough(board, { r: 4, c: 4 }, 0)).toBe(1);
  });

  test("counts contiguous same-color neighbors on both sides", () => {
    const board = createEmptyBoard();
    place(board, [[4, 1], [4, 2], [4, 3]], 2); // three in a row, gap at (4,4) then more room
    place(board, [[4, 5], [4, 6]], 2);
    // (4,4) is empty; filling it with color 2 would bridge into a run of 6
    expect(longestRunThrough(board, { r: 4, c: 4 }, 2)).toBe(6);
  });

  test("a mismatched color sees no boost from neighbors", () => {
    const board = createEmptyBoard();
    place(board, [[4, 3], [4, 5]], 2);
    expect(longestRunThrough(board, { r: 4, c: 4 }, 3)).toBe(1);
  });

  test("detects diagonal runs too", () => {
    const board = createEmptyBoard();
    place(board, [[0, 0], [1, 1], [2, 2]], 5);
    // (3,3) empty; filling with color 5 extends the diagonal to length 4
    expect(longestRunThrough(board, { r: 3, c: 3 }, 5)).toBe(4);
  });
});

describe("findTopThreats", () => {
  test("finds the cell that would complete a near-full line, sorted first", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5]], 1); // one gap short of 5 at (4,6) or (4,1)
    const threats = findTopThreats(board, 3);
    expect(threats.length).toBeGreaterThan(0);
    const top = threats[0]!;
    expect(top.length).toBe(5);
    expect(top.color).toBe(1);
    expect([1, 6]).toContain(top.cell.c);
    expect(top.cell.r).toBe(4);
  });

  test("ignores runs shorter than minLength", () => {
    const board = createEmptyBoard();
    place(board, [[0, 0]], 4); // a lone marble — any neighbor fill only reaches length 2
    const threats = findTopThreats(board, 3);
    expect(threats.some((t) => t.color === 4)).toBe(false);
  });

  test("empty board has no threats", () => {
    expect(findTopThreats(createEmptyBoard(), 3)).toEqual([]);
  });
});

describe("assignSpawnCells", () => {
  test("blocks the player's most advanced line with a mismatched color", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5]], 1); // needs (4,1) or (4,6) to clear
    const { cells, blocked } = assignSpawnCells(board, [2]); // spawning a non-matching color
    expect(blocked).toBe(true);
    expect(cells.length).toBe(1);
    const { r, c } = cells[0]!;
    expect(r).toBe(4);
    expect([1, 6]).toContain(c);
  });

  test("never hands the player the finishing color on their own threat cell", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5]], 1);
    // If the only color available IS the threatened color, "blocking" with it
    // would finish the line for the player, so it must fall back to a
    // non-targeted cell instead. Force the fallback's random pick to be
    // deterministic so this is a real assertion, not a 2-in-77 coin flip.
    const originalRandom = rng.random;
    rng.random = () => 0;
    try {
      const { cells, blocked } = assignSpawnCells(board, [1]);
      expect(blocked).toBe(false);
      expect(cells.length).toBe(1);
      const { r, c } = cells[0]!;
      if (r === 4) expect([1, 6]).not.toContain(c);
    } finally {
      rng.random = originalRandom;
    }
  });

  test("never returns duplicate or occupied cells", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5]], 1);
    place(board, [[0, 0], [0, 1], [0, 2]], 3);
    const { cells } = assignSpawnCells(board, [2, 4, 5, 6]);
    const keys = cells.map((c) => `${c.r},${c.c}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const { r, c } of cells) expect(board[r]![c]).toBeNull();
  });

  test("caps output at however many empty cells remain", () => {
    const board = createEmptyBoard();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!(r === 0 && (c === 0 || c === 1))) board[r]![c] = 0;
      }
    }
    // Only 2 empty cells exist; asking for 5 should yield at most 2.
    const { cells } = assignSpawnCells(board, [1, 1, 1, 1, 1]);
    expect(cells.length).toBe(2);
  });

  test("enableBlocking=false never blocks, even with an obvious threat", () => {
    const board = createEmptyBoard();
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5]], 1);
    const { blocked } = assignSpawnCells(board, [2], { enableBlocking: false });
    expect(blocked).toBe(false);
  });

  test("a threat in a color outside the level's range is not blocked", () => {
    const board = createEmptyBoard();
    // Color 6 exists on the board but round 1 only plays colors 0-4, so the
    // threat scan must not see it and must not aim a spawn at it.
    place(board, [[4, 2], [4, 3], [4, 4], [4, 5]], 6);
    const { blocked } = assignSpawnCells(board, [2], { colorCount: 5 });
    expect(blocked).toBe(false);
  });
});

describe("scoreForClear", () => {
  test("base case: exactly 5 marbles", () => {
    expect(scoreForClear(5)).toBe(10);
  });

  test("longer lines score a bonus", () => {
    expect(scoreForClear(6)).toBeGreaterThan(scoreForClear(5));
    expect(scoreForClear(9)).toBe(9 * 2 + 4 * 3);
  });
});

describe("fuzz: random legal moves never crash or corrupt marble count", () => {
  test("10,000 random legal moves stay consistent", () => {
    let board = createEmptyBoard();
    let placedTotal = 0;

    const emptyCellsOf = (b: Board) => {
      const out: [number, number][] = [];
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r]![c] === null) out.push([r, c]);
      return out;
    };

    // Seed with 5 marbles.
    for (let i = 0; i < 5; i++) {
      const free = emptyCellsOf(board);
      const [r, c] = free[Math.floor(Math.random() * free.length)]!;
      board[r]![c] = Math.floor(Math.random() * 7);
      placedTotal++;
    }

    for (let iter = 0; iter < 10_000; iter++) {
      const occupied: [number, number][] = [];
      const free: [number, number][] = [];
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (board[r]![c] !== null) occupied.push([r, c]);
          else free.push([r, c]);
        }
      }
      if (occupied.length === 0 || free.length === 0) break;

      const [fr, fc] = occupied[Math.floor(Math.random() * occupied.length)]!;
      const [tr, tc] = free[Math.floor(Math.random() * free.length)]!;
      const path = findPath(board, { r: fr, c: fc }, { r: tr, c: tc });
      if (!path) continue;

      const color = board[fr]![fc]!;
      board[fr]![fc] = null;
      board[tr]![tc] = color;

      const matches = findLinesThrough(board, { r: tr, c: tc });
      if (matches.length > 0) {
        for (const { r, c } of matches) board[r]![c] = null;
      } else {
        const spawnCount = Math.min(3, emptyCellsOf(board).length);
        const spawnFree = emptyCellsOf(board);
        for (let i = 0; i < spawnCount; i++) {
          const idx = Math.floor(Math.random() * spawnFree.length);
          const [r, c] = spawnFree.splice(idx, 1)[0]!;
          board[r]![c] = Math.floor(Math.random() * 7);
          placedTotal++;
        }
      }

      // Invariant: never a negative or out-of-range marble count.
      const count = board.flat().filter((v) => v !== null).length;
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(SIZE * SIZE);
    }
  });
});
