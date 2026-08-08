export const SIZE = 9;
export const COLORS = 7;
export const LINE_MIN = 5;
export const SPAWN_COUNT = 3;

// Must match the .board rule in style.css (--cell-size, gap, padding) — used
// to position the imperative glide overlay without reading layout back from
// the DOM (which would force a synchronous reflow on every glide step).
export const CELL_SIZE_PX = 54;
export const CELL_GAP_PX = 3;
export const BOARD_PADDING_PX = 10;

/** The King's fixed score — the Pretender wins by reaching or beating it. */
export const KING_SCORE = 100;

/** A spawn only blocks the player's most advanced line once it's at least this long. */
export const BLOCK_MIN_RUN_LENGTH = 3;

/** Chance, per non-initial spawn, that blocking is even considered this turn.
 * A flat probability rather than a fixed cooldown so it doesn't fall into an
 * obvious every-Nth-turn pattern. */
export const BLOCK_PROBABILITY = 0.35;
