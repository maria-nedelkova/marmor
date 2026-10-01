// Tools: the player's answer to the ladder's escalation.
//
// Each round from 2 to 7 unlocks one, and each unlock answers the pressure
// that same round introduces — the round hands you a problem and the means
// to deal with it. Only round 8 unlocks nothing, so the finale is about
// using what you hold well rather than learning one more button.
//
// The six run small-to-large on purpose: hammer (one marble), flask (two
// marbles), dice (the queue), pouch (every marble on the board), bomb (nine
// marbles at once), crystal ball (information rather than force). A player
// arriving at round 7 has a strictly bigger toolkit than one at round 3,
// which is what keeps the late rounds survivable without flattening them.
//
// Charges are not bought. A currency would mean an economy, a shop, and a
// second balance surface, and it would make a puzzle game feel
// free-to-play; unlocking by progress gets the same "something new each
// round" for none of that.

export type ToolId = "hammer" | "swap" | "reroll" | "shuffle" | "bomb" | "foresight";

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
    name: "Flask",
    unlocksAt: 2,
    description: "Transmute: exchange the colours of two marbles.",
    answers: "Round 3's eighth colour leaves more odd ones out; swapping rearranges rather than conjures.",
  },
  {
    id: "reroll",
    name: "Dice",
    unlocksAt: 3,
    description: "Throw again: reshuffle what's coming in Next up.",
    answers: "Round 4 drops four marbles a turn, so a bad queue costs more.",
  },
  {
    id: "shuffle",
    name: "Pouch",
    unlocksAt: 4,
    description: "Stir the bag: redistribute every colour on the board.",
    answers:
      "Round 5 lands one of the four unannounced, so the board drifts into arrangements you never chose. " +
      "The pouch is the big sibling of the dice — that one re-rolls what is coming, this one re-rolls what is already down.",
  },
  {
    id: "bomb",
    name: "Bomb",
    unlocksAt: 5,
    description: "Blow a hole: clear a marble and the eight around it.",
    answers: "Round 6 makes like colours clump together; nine cells at once is what breaks a clump open.",
  },
  {
    id: "foresight",
    name: "Crystal Ball",
    unlocksAt: 6,
    description: "See ahead: reveal where this turn's marbles will land.",
    answers:
      "Round 7 starts you nine marbles down, and on a crowded board it is WHERE the next ones land, " +
      "not what colour they are, that decides whether you had a move.",
  },
];

/** Zero-based round index from which unused charges carry over instead of
 * resetting.
 *
 * It used to be the round after the last unlock. With six tools the unlocks
 * now run to round 7, and waiting for them to finish would leave
 * accumulation as a single-round footnote — so it stays at round 6 and the
 * two phases overlap. A tool that unlocks at or after this round still
 * arrives with exactly one charge, because `grantCharges` adds to a
 * previous balance of zero; it simply never has a refresh phase. */
export const ACCUMULATE_FROM_ROUND = 5;

export type ToolCharges = Record<ToolId, number>;

export const NO_CHARGES: ToolCharges = { hammer: 0, swap: 0, reroll: 0, shuffle: 0, bomb: 0, foresight: 0 };

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
