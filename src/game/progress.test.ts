import { beforeEach, describe, expect, test } from "bun:test";
import { SIZE } from "./constants";
import { clearRun, loadRun, saveRun } from "./progress";
import type { RunSnapshot } from "./progress";
import { NO_CHARGES } from "./tools";

// progress.ts talks to sessionStorage, which doesn't exist in the test
// runtime. An in-memory stand-in is enough: the module only ever calls
// getItem/setItem/removeItem, and every call is already wrapped in a
// try/catch, so without this the tests would pass vacuously by taking the
// "storage unavailable" path on every assertion.
const store = new Map<string, string>();
(globalThis as { sessionStorage?: unknown }).sessionStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const KEY = "marmor.progress.v1";

const base = (): Omit<RunSnapshot, "at"> => ({
  levelIndex: 2,
  board: Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null)),
  nextQueue: [1, 2, 3],
  score: 40,
  bankedScore: 100,
  moves: 12,
  roundsCleared: 1,
  charges: { ...NO_CHARGES, hammer: 1 },
  foreseen: null,
});

/** Writes a payload straight past saveRun, for the cases that need to look
 * like a hand-edited or outdated store rather than something we produced. */
function writeRaw(payload: unknown) {
  store.set(KEY, JSON.stringify(payload));
}

beforeEach(() => store.clear());

describe("round trip", () => {
  test("a snapshot survives save and load", () => {
    const snapshot = base();
    saveRun(snapshot);
    const loaded = loadRun();
    expect(loaded).not.toBeNull();
    expect(loaded!.levelIndex).toBe(2);
    expect(loaded!.charges.hammer).toBe(1);
    expect(loaded!.foreseen).toBeNull();
  });

  test("a committed forecast comes back intact", () => {
    saveRun({
      ...base(),
      foreseen: { cells: [{ r: 0, c: 1 }, { r: 8, c: 8 }], colors: [3, 5] },
    });
    expect(loadRun()!.foreseen).toEqual({ cells: [{ r: 0, c: 1 }, { r: 8, c: 8 }], colors: [3, 5] });
  });

  test("clearRun drops it", () => {
    saveRun(base());
    clearRun();
    expect(loadRun()).toBeNull();
  });

  test("a stale snapshot is refused and cleared", () => {
    writeRaw({ ...base(), at: Date.now() - 31 * 60 * 1000 });
    expect(loadRun()).toBeNull();
    expect(store.has(KEY)).toBe(false);
  });
});

describe("forecast validation", () => {
  const withForeseen = (foreseen: unknown) => writeRaw({ ...base(), foreseen, at: Date.now() });

  test("a payload from before the field existed still loads", () => {
    const { foreseen: _omitted, ...withoutField } = base();
    writeRaw({ ...withoutField, at: Date.now() });
    const loaded = loadRun();
    expect(loaded).not.toBeNull();
    expect(loaded!.foreseen ?? null).toBeNull();
  });

  // The spawn path pairs cells[i] with colors[i]; a short colors array would
  // put undefined on the board somewhere far from this file.
  test("mismatched cell and colour counts reject the whole snapshot", () => {
    withForeseen({ cells: [{ r: 0, c: 0 }, { r: 1, c: 1 }], colors: [2] });
    expect(loadRun()).toBeNull();
  });

  test("an out-of-bounds cell rejects it", () => {
    withForeseen({ cells: [{ r: 0, c: SIZE }], colors: [2] });
    expect(loadRun()).toBeNull();
    withForeseen({ cells: [{ r: -1, c: 0 }], colors: [2] });
    expect(loadRun()).toBeNull();
  });

  test("a non-integer or negative colour rejects it", () => {
    withForeseen({ cells: [{ r: 0, c: 0 }], colors: [1.5] });
    expect(loadRun()).toBeNull();
    withForeseen({ cells: [{ r: 0, c: 0 }], colors: [-1] });
    expect(loadRun()).toBeNull();
  });

  test("a malformed cell rejects it", () => {
    withForeseen({ cells: [null], colors: [2] });
    expect(loadRun()).toBeNull();
    withForeseen({ cells: ["0,0"], colors: [2] });
    expect(loadRun()).toBeNull();
  });

  test("more cells than the board has rejects it", () => {
    const cells = Array.from({ length: SIZE * SIZE + 1 }, () => ({ r: 0, c: 0 }));
    withForeseen({ cells, colors: cells.map(() => 1) });
    expect(loadRun()).toBeNull();
  });

  test("a non-object forecast rejects it", () => {
    withForeseen(42);
    expect(loadRun()).toBeNull();
    withForeseen({ cells: [{ r: 0, c: 0 }] });
    expect(loadRun()).toBeNull();
  });
});

describe("hostile payloads", () => {
  test("garbage in storage reads as no snapshot", () => {
    store.set(KEY, "{not json");
    expect(loadRun()).toBeNull();
  });

  test("a level index past the ladder is refused", () => {
    writeRaw({ ...base(), levelIndex: 99, at: Date.now() });
    expect(loadRun()).toBeNull();
  });

  test("a board of the wrong size is refused", () => {
    writeRaw({ ...base(), board: [[null]], at: Date.now() });
    expect(loadRun()).toBeNull();
  });

  test("an inflated charge count is refused outright, not clamped", () => {
    writeRaw({ ...base(), charges: { ...NO_CHARGES, hammer: 20 }, at: Date.now() });
    expect(loadRun()).toBeNull();
  });
});
