// Tools: the player's answer to the ladder's escalation.
//
// Each round from 2 to 5 unlocks one, and each unlock answers the pressure
// that same round introduces — the round hands you a problem and the means
// to deal with it. Rounds 6 to 8 unlock nothing and are pure escalation, so
// the endgame is about using what you hold well rather than learning new
// buttons.
//
// Charges are not bought. A currency would mean an economy, a shop, and a
// second balance surface, and it would make a puzzle game feel
// free-to-play; unlocking by progress gets the same "something new each
// round" for none of that.

export type ToolId = "hammer" | "swap" | "reroll" | "foresight";

export interface ToolDef {
  id: ToolId;
  name: string;
  /** Zero-based round index at which the tool becomes available. */
  unlocksAt: number;
  /** One line, shown on the tool button and in the rules card. */
  description: string;
  /** Why this tool arrives in this round — the pressure it answers. */
  answers: string;
}

export const TOOLS: ToolDef[] = [
  {
    id: "hammer",
    name: "Hammer",
    unlocksAt: 1,
    description: "Smash any one marble off the board.",
    answers: "Round 2 starts spiking your near-complete lines; the hammer takes the spike back off.",
  },
  {
    id: "swap",
    name: "Swap",
    unlocksAt: 2,
    description: "Exchange the colours of two marbles.",
    answers: "Round 3's eighth colour leaves more odd ones out; swapping rearranges rather than conjures.",
  },
  {
    id: "reroll",
    name: "Reroll",
    unlocksAt: 3,
    description: "Reshuffle what's coming in Next up.",
    answers: "Round 4 drops four marbles a turn, so a bad queue costs more.",
  },
  {
    id: "foresight",
    name: "Foresight",
    unlocksAt: 4,
    description: "Reveal the whole of this turn's spawn.",
    answers: "Round 5 hides one of the four; foresight buys the hidden one back for a turn.",
  },
];

/** Zero-based round index from which unused charges carry over instead of
 * resetting. It is the round after the last unlock, deliberately: while
 * tools are still arriving, one use each keeps them being tried rather than
 * hoarded, and once the set is complete, banking them is what makes the
 * final rounds survivable. */
export const ACCUMULATE_FROM_ROUND = 5;

export type ToolCharges = Record<ToolId, number>;

export const NO_CHARGES: ToolCharges = { hammer: 0, swap: 0, reroll: 0, foresight: 0 };

export function isUnlocked(tool: ToolDef, levelIndex: number): boolean {
  return levelIndex >= tool.unlocksAt;
}

export function unlockedAt(levelIndex: number): ToolDef[] {
  return TOOLS.filter((tool) => isUnlocked(tool, levelIndex));
}

/** The tool unlocked by arriving at this round, if any — used to call it
 * out on the round-cleared screen. */
export function toolUnlockedAt(levelIndex: number): ToolDef | null {
  return TOOLS.find((tool) => tool.unlocksAt === levelIndex) ?? null;
}

/** Charges the player holds on entering `levelIndex`.
 *
 * Below ACCUMULATE_FROM_ROUND every unlocked tool is set to exactly one,
 * discarding anything unspent — use it or lose it. From that round on, the
 * round's grant is added to what survived instead, so saving a charge
 * through an easy round pays for a hard one. */
export function grantCharges(previous: ToolCharges, levelIndex: number): ToolCharges {
  const next = { ...NO_CHARGES };
  for (const tool of TOOLS) {
    if (!isUnlocked(tool, levelIndex)) continue;
    next[tool.id] = levelIndex >= ACCUMULATE_FROM_ROUND ? (previous[tool.id] ?? 0) + 1 : 1;
  }
  return next;
}

export function spendCharge(charges: ToolCharges, id: ToolId): ToolCharges {
  if ((charges[id] ?? 0) <= 0) return charges;
  return { ...charges, [id]: charges[id]! - 1 };
}

export function hasCharge(charges: ToolCharges, id: ToolId): boolean {
  return (charges[id] ?? 0) > 0;
}
