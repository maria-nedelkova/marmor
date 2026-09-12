import { beforeEach, describe, expect, test } from "bun:test";
import { LEVEL_COUNT } from "../game/levels";
import type { RunEntry } from "../game/score";
import { localLeaderboard, MAX_NAME_LENGTH, sanitizeName } from "./store";

function run(over: Partial<RunEntry> = {}): RunEntry {
  return { id: "p", name: "P", roundsCleared: 0, partialPoints: 0, moves: 100, score: 0, at: 1, ...over };
}

// Bun's test runner has no DOM, so the store's one browser dependency is
// stubbed here. `failing` reproduces Safari private mode, where merely
// touching localStorage throws — the case the store's try/catch exists for.
class MemoryStorage {
  private data = new Map<string, string>();
  failing = false;
  private guard() {
    if (this.failing) throw new Error("SecurityError: storage is disabled");
  }
  getItem(key: string): string | null {
    this.guard();
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.guard();
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.guard();
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
  key(i: number): string | null {
    return [...this.data.keys()][i] ?? null;
  }
  get length(): number {
    return this.data.size;
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

beforeEach(() => {
  storage.failing = false;
  storage.clear();
});

describe("sanitizeName", () => {
  test("keeps ordinary names untouched", () => {
    expect(sanitizeName("Maria")).toBe("Maria");
    expect(sanitizeName("kosta_99")).toBe("kosta_99");
  });

  test("trims and collapses whitespace", () => {
    expect(sanitizeName("   lena   b  ")).toBe("lena b");
  });

  test("strips control characters instead of letting them into the table", () => {
    expect(sanitizeName("a\u0000b\u001Fc")).toBe("abc");
    expect(sanitizeName("two\nlines")).toBe("two lines");
  });

  test("strips markup rather than relying on the renderer", () => {
    expect(sanitizeName("<b>hi</b>")).toBe("bhib");
    // Longer payloads are additionally cut by the length cap.
    expect(sanitizeName("<script>x</script>")).not.toContain("<");
  });

  test("keeps non-Latin names, which an ASCII-only filter would erase", () => {
    expect(sanitizeName("Мария")).toBe("Мария");
    expect(sanitizeName("さくら")).toBe("さくら");
  });

  test("caps length so one entry can't wreck the layout", () => {
    expect(sanitizeName("x".repeat(200)).length).toBe(MAX_NAME_LENGTH);
  });

  test("falls back rather than allowing an empty name", () => {
    expect(sanitizeName("")).toBe("ANON");
    expect(sanitizeName("   ")).toBe("ANON");
    expect(sanitizeName("💀💀")).toBe("ANON");
  });
});

describe("localLeaderboard", () => {
  test("starts empty and returns submissions best-first", async () => {
    expect(await localLeaderboard.list()).toEqual([]);
    await localLeaderboard.submit(run({ id: "a", roundsCleared: 3 }));
    await localLeaderboard.submit(run({ id: "b", roundsCleared: LEVEL_COUNT }));
    expect((await localLeaderboard.list()).map((e) => e.id)).toEqual(["b", "a"]);
  });

  test("keeps one row per player, holding their best run", async () => {
    await localLeaderboard.submit(run({ id: "a", roundsCleared: 5, moves: 300 }));
    await localLeaderboard.submit(run({ id: "a", roundsCleared: 2, moves: 10 }));
    const board = await localLeaderboard.list();
    expect(board.length).toBe(1);
    expect(board[0]!.roundsCleared).toBe(5);
  });

  test("a worse run still updates the display name", async () => {
    await localLeaderboard.submit(run({ id: "a", name: "OLD", roundsCleared: 5 }));
    await localLeaderboard.submit(run({ id: "a", name: "NEW", roundsCleared: 1 }));
    const board = await localLeaderboard.list();
    expect(board[0]!.name).toBe("NEW");
    expect(board[0]!.roundsCleared).toBe(5);
  });

  test("survives a reload — entries round-trip through storage", async () => {
    await localLeaderboard.submit(run({ id: "a", roundsCleared: 4, moves: 77 }));
    const [entry] = await localLeaderboard.list();
    expect(entry).toMatchObject({ id: "a", roundsCleared: 4, moves: 77 });
  });

  test("limit returns only the top N", async () => {
    for (let i = 0; i < 5; i++) await localLeaderboard.submit(run({ id: `p${i}`, roundsCleared: i }));
    expect((await localLeaderboard.list(2)).map((e) => e.id)).toEqual(["p4", "p3"]);
  });

  test("corrupt storage degrades to an empty board, not a crash", async () => {
    localStorage.setItem("marmor.leaderboard.v1", "{not json");
    expect(await localLeaderboard.list()).toEqual([]);
    localStorage.setItem("marmor.leaderboard.v1", '{"nope":true}');
    expect(await localLeaderboard.list()).toEqual([]);
  });

  test("a disabled store (Safari private mode) degrades instead of throwing", async () => {
    storage.failing = true;
    expect(await localLeaderboard.list()).toEqual([]);
    // Submitting must still resolve, and still rank in memory for this session.
    const board = await localLeaderboard.submit(run({ id: "a", roundsCleared: 4 }));
    expect(board.map((e) => e.id)).toEqual(["a"]);
  });

  test("getPlayerId returns a usable id even with no storage", async () => {
    storage.failing = true;
    const { getPlayerId } = await import("./store");
    expect(getPlayerId()).toMatch(/^p_/);
  });

  test("malformed rows are dropped, valid neighbours kept", async () => {
    localStorage.setItem(
      "marmor.leaderboard.v1",
      JSON.stringify([{ id: "good", name: "G", roundsCleared: 2, partialPoints: 0, moves: 5, score: 200, at: 1 }, null, { id: "bad" }, 42]),
    );
    const board = await localLeaderboard.list();
    expect(board.map((e) => e.id)).toEqual(["good"]);
  });
});
