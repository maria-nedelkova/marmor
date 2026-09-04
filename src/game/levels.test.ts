import { describe, expect, test } from "bun:test";
import { COLORS, SIZE } from "./constants";
import { getLevel, isFinalLevel, LEVEL_COUNT, LEVELS } from "./levels";
import type { LevelConfig } from "./levels";

// The ladder is data, so the things that can break it are data mistakes: a
// level that asks for a color the CSS can't paint, a preview that promises
// more marbles than actually spawn, a target that dips below the previous
// round's. These tests are the guardrail for editing LEVELS by hand.

describe("the level ladder", () => {
  test("every level fits the palette the CSS defines", () => {
    for (const level of LEVELS) {
      // The floor is the classic seven — the ladder only ever adds colors.
      expect(level.colors).toBeGreaterThanOrEqual(7);
      expect(level.colors).toBeLessThanOrEqual(COLORS);
    }
  });

  test("preview never promises more marbles than the spawn delivers", () => {
    for (const level of LEVELS) {
      expect(level.previewCount).toBeGreaterThan(0);
      expect(level.previewCount).toBeLessThanOrEqual(level.spawnCount);
    }
  });

  test("the board always starts with room to play", () => {
    for (const level of LEVELS) {
      expect(level.startCount).toBeGreaterThan(0);
      expect(level.startCount).toBeLessThan(SIZE * SIZE);
    }
  });

  test("blocking settings stay in a sane range", () => {
    for (const level of LEVELS) {
      expect(level.blockProbability).toBeGreaterThanOrEqual(0);
      expect(level.blockProbability).toBeLessThanOrEqual(1);
      // Below 3, blocking hits lines so short it reads as random noise
      // rather than as the board pushing back — see DESIGN.md.
      expect(level.blockMinRunLength).toBeGreaterThanOrEqual(3);
      expect(level.colorAffinity).toBeGreaterThanOrEqual(0);
      expect(level.colorAffinity).toBeLessThanOrEqual(1);
    }
  });

  // The ladder's core structural rule: each round is the one before it plus
  // exactly one difficulty increase. This is the test that actually holds
  // the design in place — it's what stops a future tuning pass from quietly
  // stacking two dials into one step (which is how the ramp stops feeling
  // gradual and starts feeling arbitrary).
  //
  // "Dimension" is not the same as "field": spawnCount and previewCount
  // together express how much of the spawn you can plan around, so they're
  // compared as one ratio. A round that raises both (3-of-3 → 4-of-4) has
  // added marbles without hiding any, which is one increase, not two.
  const dimensions = {
    colors: (l: LevelConfig) => l.colors,
    spawnCount: (l: LevelConfig) => l.spawnCount,
    previewShare: (l: LevelConfig) => l.previewCount / l.spawnCount,
    startCount: (l: LevelConfig) => l.startCount,
    blockProbability: (l: LevelConfig) => l.blockProbability,
    blockMinRunLength: (l: LevelConfig) => l.blockMinRunLength,
    colorAffinity: (l: LevelConfig) => l.colorAffinity,
    spawnOnClear: (l: LevelConfig) => Number(l.spawnOnClear),
  } as const;
  // Dimensions where a *lower* number is the harder setting.
  const lowerIsHarder = new Set(["previewShare", "colorAffinity"]);

  test("each round changes exactly one difficulty dimension", () => {
    for (let i = 1; i < LEVEL_COUNT; i++) {
      const prev = LEVELS[i - 1]!;
      const cur = LEVELS[i]!;
      const changed = Object.entries(dimensions)
        .filter(([, read]) => read(prev) !== read(cur))
        .map(([name]) => name);
      expect({ round: i + 1, name: cur.name, changed }).toEqual({
        round: i + 1,
        name: cur.name,
        changed: [changed[0]!],
      });
    }
  });

  test("the one dimension each round changes always gets harder", () => {
    for (let i = 1; i < LEVEL_COUNT; i++) {
      const prev = LEVELS[i - 1]!;
      const cur = LEVELS[i]!;
      for (const [name, read] of Object.entries(dimensions)) {
        if (read(prev) === read(cur)) continue;
        if (lowerIsHarder.has(name)) expect(read(cur)).toBeLessThan(read(prev));
        else expect(read(cur)).toBeGreaterThan(read(prev));
      }
    }
  });

  test("colors and spawn count never go backwards", () => {
    for (let i = 1; i < LEVEL_COUNT; i++) {
      expect(LEVELS[i]!.colors).toBeGreaterThanOrEqual(LEVELS[i - 1]!.colors);
      expect(LEVELS[i]!.spawnCount).toBeGreaterThanOrEqual(LEVELS[i - 1]!.spawnCount);
      expect(LEVELS[i]!.startCount).toBeGreaterThanOrEqual(LEVELS[i - 1]!.startCount);
    }
  });

  test("every round is named and explains its twist", () => {
    const names = new Set(LEVELS.map((l) => l.name));
    expect(names.size).toBe(LEVEL_COUNT);
    for (const level of LEVELS) expect(level.twist.length).toBeGreaterThan(10);
  });

  // Round 1 is the pre-levels game, unchanged. Pinned exactly rather than
  // by inequality: if a future tuning pass drifts these, the ladder has
  // silently stopped being an extension of the original game and started
  // being a different one.
  test("round 1 is the classic game, untouched", () => {
    expect(LEVELS[0]).toMatchObject({
      colors: 7,
      spawnCount: 3,
      previewCount: 3,
      startCount: 5,
      blockProbability: 0.35,
      blockMinRunLength: 3,
      colorAffinity: 1,
      spawnOnClear: false,
    });
  });

  test("no round is easier than the classic baseline", () => {
    const base = LEVELS[0]!;
    for (const level of LEVELS) {
      expect(level.blockProbability).toBeGreaterThanOrEqual(base.blockProbability);
      expect(level.colorAffinity).toBeLessThanOrEqual(base.colorAffinity);
      expect(level.colors).toBeGreaterThanOrEqual(base.colors);
      expect(level.spawnCount).toBeGreaterThanOrEqual(base.spawnCount);
      expect(level.startCount).toBeGreaterThanOrEqual(base.startCount);
      // What matters for preview is the *share* of the spawn revealed, not
      // the raw count: round 4 previews 4 of 4, which is more marbles shown
      // than the baseline's 3 but exactly as much information.
      expect(level.previewCount / level.spawnCount).toBeLessThanOrEqual(base.previewCount / base.spawnCount);
    }
  });

  test("clearing a line buys a free turn in every round but the last", () => {
    for (let i = 0; i < LEVEL_COUNT - 1; i++) {
      expect(LEVELS[i]!.spawnOnClear).toBe(false);
    }
    expect(LEVELS[LEVEL_COUNT - 1]!.spawnOnClear).toBe(true);
  });
});

describe("getLevel", () => {
  test("returns the requested level", () => {
    expect(getLevel(2)).toBe(LEVELS[2]!);
  });

  test("clamps out-of-range indices instead of returning undefined", () => {
    expect(getLevel(-5)).toBe(LEVELS[0]!);
    expect(getLevel(LEVEL_COUNT + 10)).toBe(LEVELS[LEVEL_COUNT - 1]!);
  });
});

describe("isFinalLevel", () => {
  test("only the last index ends the run", () => {
    expect(isFinalLevel(0)).toBe(false);
    expect(isFinalLevel(LEVEL_COUNT - 2)).toBe(false);
    expect(isFinalLevel(LEVEL_COUNT - 1)).toBe(true);
  });
});
