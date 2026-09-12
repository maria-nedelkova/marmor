// The difficulty ladder. Every knob the board can turn against the player
// lives here as data, so tuning a level never means touching engine or hook
// code — and so the whole progression can be read top to bottom in one place.
//
// The King's target is NOT one of those knobs: it's a flat 100 every round
// (KING_SCORE in constants.ts). Rounds get harder by making 100 points
// harder to earn, never by moving the finish line further away.

export interface LevelConfig {
  /** Display name, shown in the banner and the round-cleared dialog. */
  name: string;
  /** How many of the palette's colors are in play (<= COLORS). */
  colors: number;
  /** Marbles dropped at the end of a turn that didn't clear a line. */
  spawnCount: number;
  /** How many of the coming spawn's colors are revealed in "Next up".
   * Below `spawnCount`, the remainder land unannounced. */
  previewCount: number;
  /** Marbles already on the board when the level starts. */
  startCount: number;
  /** Per-turn chance the spawner is allowed to aim a mismatched marble at
   * the player's most advanced run instead of dropping at random. */
  blockProbability: number;
  /** How long an existing run must be before it's worth blocking. */
  blockMinRunLength: number;
  /** How strongly spawns favour colors already on the board: 1 is the
   * classic helpful bias (lines cluster, so they're easier to finish), 0 is
   * flat random (every color equally likely, so runs stall more often). */
  colorAffinity: number;
  /** Whether marbles still spawn on a turn whose move cleared a line.
   * Classic rules give that turn away for free; setting this drops the
   * single largest advantage the player has. */
  spawnOnClear: boolean;
  /** One line naming what this round changed — shown under the title. */
  twist: string;
}

/** Round 1 is the game exactly as it played before levels existed — all
 * seven colors, three marbles a turn, blocking at 0.35. It is the baseline
 * the rest of the ladder builds on, so it is the one entry here that should
 * not be "tuned"; changing it changes what the game *is*, not how hard
 * round 1 happens to be.
 *
 * **Every later round raises exactly one dial, and may ease at most one
 * other to pay for it.** Two increases never land at once, so each round
 * keeps a single legible identity ("the one where marbles come four at a
 * time") and the player only ever has one new thing to adapt to. The
 * optional easing exists so a heavy dial can land without the round reading
 * as spiteful; the ladder currently uses none, and `levels.test.ts` pins
 * that, so introducing one is a deliberate act rather than something found
 * later in a diff. Both halves are enforced by diffing consecutive rounds:
 * more than one increase fails, and so does more than one easing.
 *
 * One subtlety: `spawnCount` and `previewCount` move together in round 4.
 * That is still a single increase, because what those two express jointly
 * is the *share* of the spawn you get to plan around — going 3-of-3 to
 * 4-of-4 leaves that share at 100% and only adds marbles. Round 5 then
 * spends its one increase on cutting the share to 3-of-4. */
export const LEVELS: LevelConfig[] = [
  {
    name: "The Duel",
    colors: 7,
    spawnCount: 3,
    previewCount: 3,
    startCount: 5,
    blockProbability: 0.35,
    blockMinRunLength: 3,
    colorAffinity: 1,
    spawnOnClear: false,
    twist: "The classic duel: seven colors, three marbles a turn, and a King who already fights dirty.",
  },
  {
    name: "Court Intrigue",
    colors: 7,
    spawnCount: 3,
    previewCount: 3,
    startCount: 5,
    // +0.05, the ladder's smallest step by some way. Blocking leads because
    // it's the one dial the player can actually watch operate — a marble
    // visibly lands on the line they were building — so even a small change
    // has somewhere to register. Whether it registers at THIS size is an
    // open question: 0.4 is roughly one extra blocked line per twenty turns,
    // which may well sit under the threshold of noticing. Under playtest.
    blockProbability: 0.4,
    blockMinRunLength: 3,
    colorAffinity: 1,
    spawnOnClear: false,
    twist: "The court plays dirty — your almost-finished lines start getting spiked.",
  },
  {
    name: "A Suspect Too Many",
    colors: 8, // +1 color
    spawnCount: 3,
    previewCount: 3,
    startCount: 5,
    blockProbability: 0.4, // flat from here to the end of the ladder
    blockMinRunLength: 3,
    colorAffinity: 1,
    spawnOnClear: false,
    twist: "An eighth color joins the court. Every line you start is now harder to finish.",
  },
  {
    name: "The Flood",
    colors: 8,
    spawnCount: 4, // +1 marble a turn, still fully previewed
    previewCount: 4,
    startCount: 5,
    blockProbability: 0.4,
    blockMinRunLength: 3,
    colorAffinity: 1,
    spawnOnClear: false,
    twist: "Four marbles a turn instead of three. Space is the enemy now.",
  },
  {
    name: "Blind Spot",
    colors: 8,
    spawnCount: 4,
    previewCount: 3, // one of the four now lands unannounced
    startCount: 5,
    blockProbability: 0.4,
    blockMinRunLength: 3,
    colorAffinity: 1,
    spawnOnClear: false,
    twist: "Next up only shows three of the four. One marble lands unannounced.",
  },
  {
    name: "Sworn Enemies",
    colors: 8,
    spawnCount: 4,
    previewCount: 3,
    startCount: 5,
    blockProbability: 0.4,
    blockMinRunLength: 3,
    colorAffinity: 0.45, // the board stops clustering colors in your favour
    spawnOnClear: false,
    twist: "The marbles stop clumping in your favour — runs stall where they used to build.",
  },
  {
    name: "Standing Room Only",
    colors: 8,
    spawnCount: 4,
    previewCount: 3,
    startCount: 9, // crowded before you touch it
    blockProbability: 0.4,
    blockMinRunLength: 3,
    colorAffinity: 0.45,
    spawnOnClear: false,
    twist: "The board is already crowded before you make your first move.",
  },
  {
    name: "The Coronation",
    colors: 8,
    spawnCount: 4,
    previewCount: 3,
    startCount: 9,
    blockProbability: 0.4,
    blockMinRunLength: 3,
    colorAffinity: 0.45,
    // The last dial, saved for last: clearing a line stops buying a free
    // turn. Every other round lets a good move hold the tide back entirely.
    spawnOnClear: true,
    twist: "No more free turns — clearing a line no longer holds back the next wave.",
  },
];

export const LEVEL_COUNT = LEVELS.length;

/** Clamped so a stray index can never crash the game into an undefined level. */
export function getLevel(index: number): LevelConfig {
  const clamped = Math.min(Math.max(index, 0), LEVEL_COUNT - 1);
  return LEVELS[clamped]!;
}

export function isFinalLevel(index: number): boolean {
  return index >= LEVEL_COUNT - 1;
}
