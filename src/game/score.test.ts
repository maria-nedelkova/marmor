import { describe, expect, test } from "bun:test";
import { LEVEL_COUNT } from "./levels";
import {
  compareEntries,
  isBetterRun,
  isFinisher,
  MAX_PROGRESS,
  progressOf,
  rankEntries,
  reachedLabel,
  sortKeyOf,
} from "./score";
import type { RunEntry } from "./score";

function run(over: Partial<RunEntry> = {}): RunEntry {
  return { id: "p", name: "P", roundsCleared: 0, partialPoints: 0, moves: 100, score: 0, at: 1, ...over };
}

describe("progressOf", () => {
  test("a finished run is exactly MAX_PROGRESS, whatever the score was", () => {
    const lucky = run({ roundsCleared: LEVEL_COUNT, score: 880 });
    const tidy = run({ roundsCleared: LEVEL_COUNT, score: 803 });
    expect(progressOf(lucky)).toBe(MAX_PROGRESS);
    expect(progressOf(tidy)).toBe(MAX_PROGRESS);
  });

  test("an unfinished run counts 100 a round plus what it banked in the last", () => {
    expect(progressOf(run({ roundsCleared: 5, partialPoints: 45 }))).toBe(545);
  });

  test("overshoot can't inflate progress — the whole point of the metric", () => {
    // Same depth, wildly different raw scores because of final-clear length.
    const a = run({ roundsCleared: 3, partialPoints: 20, score: 340 });
    const b = run({ roundsCleared: 3, partialPoints: 20, score: 395 });
    expect(progressOf(a)).toBe(progressOf(b));
  });

  test("a corrupt entry can't buy an extra round", () => {
    expect(progressOf(run({ roundsCleared: 2, partialPoints: 5_000 }))).toBe(299);
    expect(progressOf(run({ roundsCleared: 999 }))).toBe(MAX_PROGRESS);
    expect(progressOf(run({ roundsCleared: -3, partialPoints: -9 }))).toBe(0);
    expect(progressOf(run({ roundsCleared: Number.NaN }))).toBe(0);
  });
});

describe("ranking", () => {
  test("finishers are ordered by moves, not by score", () => {
    // The mockup case: Lena finished with the lowest score but the fewest
    // moves, and must still come first.
    const lena = run({ id: "lena", roundsCleared: LEVEL_COUNT, moves: 198, score: 812 });
    const maria = run({ id: "maria", roundsCleared: LEVEL_COUNT, moves: 204, score: 861 });
    expect(rankEntries([maria, lena]).map((e) => e.id)).toEqual(["lena", "maria"]);
  });

  test("every finisher outranks every non-finisher", () => {
    const slowFinisher = run({ id: "fin", roundsCleared: LEVEL_COUNT, moves: 9_000 });
    const fastQuitter = run({ id: "quit", roundsCleared: LEVEL_COUNT - 1, partialPoints: 99, moves: 1 });
    expect(rankEntries([fastQuitter, slowFinisher]).map((e) => e.id)).toEqual(["fin", "quit"]);
  });

  test("among non-finishers, depth beats efficiency", () => {
    const deeper = run({ id: "deep", roundsCleared: 5, partialPoints: 0, moves: 900 });
    const tidier = run({ id: "tidy", roundsCleared: 4, partialPoints: 99, moves: 10 });
    expect(rankEntries([tidier, deeper]).map((e) => e.id)).toEqual(["deep", "tidy"]);
  });

  test("identical runs keep the earlier one first", () => {
    const first = run({ id: "a", at: 100 });
    const second = run({ id: "b", at: 200 });
    expect(rankEntries([second, first]).map((e) => e.id)).toEqual(["a", "b"]);
  });

  test("compareEntries is a consistent total order over a mixed field", () => {
    const field = [
      run({ id: "a", roundsCleared: LEVEL_COUNT, moves: 251 }),
      run({ id: "b", roundsCleared: LEVEL_COUNT, moves: 198 }),
      run({ id: "c", roundsCleared: 6, partialPoints: 88, moves: 203 }),
      run({ id: "d", roundsCleared: 6, partialPoints: 88, moves: 190 }),
      run({ id: "e", roundsCleared: 0, partialPoints: 0, moves: 4 }),
    ];
    const ranked = rankEntries(field).map((e) => e.id);
    expect(ranked).toEqual(["b", "a", "d", "c", "e"]);
    // Sorting an already-sorted list must not reshuffle it.
    expect(rankEntries(rankEntries(field)).map((e) => e.id)).toEqual(ranked);
  });
});

describe("sortKeyOf", () => {
  test("stays inside float64's exact-integer range", () => {
    const worst = run({ roundsCleared: LEVEL_COUNT, moves: 0 });
    expect(sortKeyOf(worst)).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(sortKeyOf(worst))).toBe(true);
  });

  test("more moves always lowers the key, never raises it", () => {
    const fast = run({ roundsCleared: 4, moves: 50 });
    const slow = run({ roundsCleared: 4, moves: 51 });
    expect(sortKeyOf(fast)).toBeGreaterThan(sortKeyOf(slow));
  });

  test("a move count beyond the cap can't wrap into a better key", () => {
    const capped = run({ roundsCleared: 4, moves: 99_999 });
    const absurd = run({ roundsCleared: 4, moves: 10_000_000 });
    expect(sortKeyOf(absurd)).toBe(sortKeyOf(capped));
    expect(sortKeyOf(absurd)).toBeLessThan(sortKeyOf(run({ roundsCleared: 4, moves: 0 })));
  });

  test("one extra point of progress outweighs any move saving", () => {
    const deeperButSlow = run({ roundsCleared: 4, partialPoints: 1, moves: 99_999 });
    const shallowerButFast = run({ roundsCleared: 4, partialPoints: 0, moves: 0 });
    expect(sortKeyOf(deeperButSlow)).toBeGreaterThan(sortKeyOf(shallowerButFast));
  });
});

describe("isBetterRun", () => {
  test("keeps the better of two attempts by the same player", () => {
    const prev = run({ roundsCleared: 3, partialPoints: 10, moves: 200 });
    expect(isBetterRun(run({ roundsCleared: 4, moves: 400 }), prev)).toBe(true);
    expect(isBetterRun(run({ roundsCleared: 3, partialPoints: 10, moves: 199 }), prev)).toBe(true);
    expect(isBetterRun(run({ roundsCleared: 3, partialPoints: 10, moves: 201 }), prev)).toBe(false);
    expect(isBetterRun(prev, prev)).toBe(false);
  });
});

describe("reachedLabel", () => {
  test("finished runs show the full ladder", () => {
    expect(reachedLabel(run({ roundsCleared: LEVEL_COUNT }))).toBe(`${LEVEL_COUNT}/${LEVEL_COUNT}`);
  });

  test("unfinished runs name the round they died in, 1-indexed", () => {
    expect(reachedLabel(run({ roundsCleared: 5, partialPoints: 45 }))).toBe("R6 · 45");
    expect(reachedLabel(run({ roundsCleared: 0, partialPoints: 0 }))).toBe("R1 · 0");
  });
});

describe("isFinisher", () => {
  test("only a full ladder counts", () => {
    expect(isFinisher(run({ roundsCleared: LEVEL_COUNT }))).toBe(true);
    expect(isFinisher(run({ roundsCleared: LEVEL_COUNT - 1, partialPoints: 99 }))).toBe(false);
  });
});
