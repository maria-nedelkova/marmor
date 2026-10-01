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
import type { ToolCharges } from "./tools";

/** Spread over NO_CHARGES so these cases name only the tools they care
 * about and adding a seventh tool doesn't rewrite the file. */
const charges = (partial: Partial<ToolCharges>): ToolCharges => ({ ...NO_CHARGES, ...partial });

describe("unlock schedule", () => {
  test("one tool per round across rounds 2-7, none in round 1 or round 8", () => {
    const byRound = Array.from({ length: LEVEL_COUNT }, (_, i) => toolUnlockedAt(i)?.id ?? null);
    expect(byRound).toEqual([null, "hammer", "swap", "reroll", "shuffle", "bomb", "foresight", null]);
  });

  test("round 1 has no tools, and the set is complete for the final round", () => {
    expect(unlockedAt(0)).toHaveLength(0);
    expect(unlockedAt(LEVEL_COUNT - 1)).toHaveLength(TOOLS.length);
  });

  test("the rack only ever grows", () => {
    for (let round = 1; round < LEVEL_COUNT; round++) {
      expect(unlockedAt(round).length).toBeGreaterThanOrEqual(unlockedAt(round - 1).length);
    }
  });
});

describe("grantCharges — reset phase", () => {
  test("gives exactly one of each unlocked tool", () => {
    expect(grantCharges(NO_CHARGES, 1)).toEqual(charges({ hammer: 1 }));
    expect(grantCharges(NO_CHARGES, 3)).toEqual(charges({ hammer: 1, swap: 1, reroll: 1 }));
  });

  test("discards anything unspent — saving through these rounds gains nothing", () => {
    const hoarded = charges({ hammer: 1, swap: 1 });
    expect(grantCharges(hoarded, 3)).toEqual(charges({ hammer: 1, swap: 1, reroll: 1 }));
  });

  test("a locked tool stays at zero even if a stale value says otherwise", () => {
    const bogus = charges({ hammer: 1, reroll: 5, foresight: 9 });
    expect(grantCharges(bogus, 1)).toEqual(charges({ hammer: 1 }));
  });
});

describe("grantCharges — accumulating phase", () => {
  test("adds this round's grant to what survived", () => {
    const leftover = charges({ hammer: 1, reroll: 2, shuffle: 1 });
    expect(grantCharges(leftover, ACCUMULATE_FROM_ROUND)).toEqual(
      charges({ hammer: 2, swap: 1, reroll: 3, shuffle: 2, bomb: 1 }),
    );
  });

  test("banking across the accumulating rounds is worth doing", () => {
    let held = grantCharges(NO_CHARGES, ACCUMULATE_FROM_ROUND);
    for (let round = ACCUMULATE_FROM_ROUND + 1; round < LEVEL_COUNT; round++) {
      held = grantCharges(held, round);
    }
    expect(held.hammer).toBe(LEVEL_COUNT - ACCUMULATE_FROM_ROUND);
  });

  test("spending keeps the ceiling down — the reward is for saving, not for idling", () => {
    let held = grantCharges(NO_CHARGES, ACCUMULATE_FROM_ROUND);
    held = spendCharge(held, "hammer");
    held = grantCharges(held, ACCUMULATE_FROM_ROUND + 1);
    expect(held.hammer).toBe(1);
  });

  // The two phases overlap now: bomb and crystal ball unlock at or after
  // ACCUMULATE_FROM_ROUND, so they never see a reset round. They must still
  // show up holding exactly one, which they do only because grantCharges
  // adds to a previous balance of zero.
  test("a tool unlocking inside the accumulating phase still arrives with one", () => {
    for (const tool of TOOLS) {
      if (tool.unlocksAt < ACCUMULATE_FROM_ROUND) continue;
      expect(grantCharges(NO_CHARGES, tool.unlocksAt)[tool.id]).toBe(1);
    }
  });
});

describe("spendCharge", () => {
  test("decrements only the tool used", () => {
    const after = spendCharge(charges({ hammer: 2, swap: 1 }), "hammer");
    expect(after).toEqual(charges({ hammer: 1, swap: 1 }));
  });

  test("never goes negative, and leaves the object untouched at zero", () => {
    const empty = charges({ swap: 1 });
    expect(spendCharge(empty, "hammer")).toEqual(empty);
  });

  test("hasCharge gates use", () => {
    expect(hasCharge(charges({ hammer: 1 }), "hammer")).toBe(true);
    expect(hasCharge(NO_CHARGES, "hammer")).toBe(false);
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

  test("NO_CHARGES covers every tool, so a grant can't leave one undefined", () => {
    expect(Object.keys(NO_CHARGES).sort()).toEqual(TOOLS.map((t) => t.id).sort());
  });
});
