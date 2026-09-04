export const SIZE = 9;
/** Palette size — the number of marble colors the CSS defines (.c0–.c7 in
 * style.css). How many of these are actually in play is per-level
 * (`colors` in `levels.ts`); this is the ceiling, not the game setting.
 * The classic game (and round 1) uses the first seven; c7 exists only for
 * the later rounds. */
export const COLORS = 8;
export const LINE_MIN = 5;

/** The King's score, in every round. Deliberately a constant rather than a
 * per-level field: the target never varies, so the ladder gets harder by
 * making 100 points harder to reach, not by moving the finish line. */
export const KING_SCORE = 100;

// Must match the .board rule in style.css (--cell-size, gap, padding) — used
// to position the imperative glide overlay without reading layout back from
// the DOM (which would force a synchronous reflow on every glide step).
export const CELL_SIZE_PX = 54;
export const CELL_GAP_PX = 3;
export const BOARD_PADDING_PX = 10;
