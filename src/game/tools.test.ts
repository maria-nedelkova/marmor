import { describe, expect, test } from "bun:test";
import { LEVEL_COUNT } from "./levels";
import {
  ACCUMULATE_FROM_ROUND,
  grantCharges,
  hasCharge,
  NO_CHARGES,
  spendCharge,
  TOOLS,
  toolUnlockedAt,
  unlockedAt,
} from "./tools";

describe("unlock schedule", () => {
  test("one tool per round across rounds 2-5, none before or after", () => {
    const byRound = Array.from({ length: LEVEL_COUNT }, (_, i) => toolUnlockedAt(i)?.id ?? null);
    expect(byRound).toEqual([null, "hammer", "swap", "reroll", "foresight", null, null, null]);
  });

  test("round 1 has no tools, and the set is complete from round 5", () => {
    expect(unlockedAt(0)).toHaveLength(0);
    expect(unlockedAt(4)).toHaveLength(TOOLS.length);
    expect(unlockedAt(LEVEL_COUNT - 1)).toHaveLength(TOOLS.length);
  });

  test("accumulation starts the round after the last unlock", () => {
    const lastUnlock = Math.max(...TOOLS.map((t) => t.unlocksAt));
    expect(ACCUMULATE_FROM_ROUND).toBe(lastUnlock + 1);
  });
});

describe("grantCharges — reset phase (rounds 2-5)", () => {
  test("gives exactly one of each unlocked tool", () => {
    expect(grantCharges(NO_CHARGES, 1)).toEqual({ hammer: 1, swap: 0, reroll: 0, foresight: 0 });
    expect(grantCharges(NO_CHARGES, 3)).toEqual({ hammer: 1, swap: 1, reroll: 1, foresight: 0 });
  });

  test("discards anything unspent — saving through these rounds gains nothing", () => {
    const hoarded = { hammer: 1, swap: 1, reroll: 0, foresight: 0 };
    expect(grantCharges(hoarded, 3)).toEqual({ hammer: 1, swap: 1, reroll: 1, foresight: 0 });
  });

  test("a locked tool stays at zero even if a stale value says otherwise", () => {
    const bogus = { hammer: 1, swap: 0, reroll: 5, foresight: 9 };
    expect(grantCharges(bogus, 1)).toEqual({ hammer: 1, swap: 0, reroll: 0, foresight: 0 });
  });
});

describe("grantCharges — accumulating phase (round 6 on)", () => {
  test("adds this round's grant to what survived", () => {
    const leftover = { hammer: 1, swap: 0, reroll: 2, foresight: 1 };
    expect(grantCharges(leftover, ACCUMULATE_FROM_ROUND)).toEqual({
      hammer: 2,
      swap: 1,
      reroll: 3,
      foresight: 2,
    });
  });

  test("banking across the last three rounds is worth doing", () => {
    // Never spending from round 6 to round 8 should leave three of each.
    let charges = grantCharges({ hammer: 0, swap: 0, reroll: 0, foresight: 0 }, ACCUMULATE_FROM_ROUND);
    for (let round = ACCUMULATE_FROM_ROUND + 1; round < LEVEL_COUNT; round++) {
      charges = grantCharges(charges, round);
    }
    expect(charges.hammer).toBe(LEVEL_COUNT - ACCUMULATE_FROM_ROUND);
  });

  test("spending keeps the ceiling down — the reward is for saving, not for idling", () => {
    let charges = grantCharges(NO_CHARGES, ACCUMULATE_FROM_ROUND);
    charges = spendCharge(charges, "hammer");
    charges = grantCharges(charges, ACCUMULATE_FROM_ROUND + 1);
    expect(charges.hammer).toBe(1);
  });
});

describe("spendCharge", () => {
  test("decrements only the tool used", () => {
    const after = spendCharge({ hammer: 2, swap: 1, reroll: 0, foresight: 0 }, "hammer");
    expect(after).toEqual({ hammer: 1, swap: 1, reroll: 0, foresight: 0 });
  });

  test("never goes negative, and leaves the object untouched at zero", () => {
    const empty = { hammer: 0, swap: 1, reroll: 0, foresight: 0 };
    expect(spendCharge(empty, "hammer")).toEqual(empty);
  });

  test("hasCharge gates use", () => {
    expect(hasCharge({ hammer: 1, swap: 0, reroll: 0, foresight: 0 }, "hammer")).toBe(true);
    expect(hasCharge({ hammer: 0, swap: 0, reroll: 0, foresight: 0 }, "hammer")).toBe(false);
  });
});

describe("every tool is described", () => {
  test("names, descriptions and the pressure each answers are filled in", () => {
    for (const tool of TOOLS) {
      expect(tool.name.length).toBeGreaterThan(2);
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.answers.length).toBeGreaterThan(10);
      expect(tool.unlocksAt).toBeGreaterThanOrEqual(0);
      expect(tool.unlocksAt).toBeLessThan(LEVEL_COUNT);
    }
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
  });
});
