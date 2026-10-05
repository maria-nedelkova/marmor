import {
  SPARKLE_CYAN_PALETTE,
  SPARKLE_PALETTE,
  SPARKLE_SM_ROWS,
  STAR_CYAN_PALETTE,
  STAR_PINK_PALETTE,
  STAR_ROWS,
} from "../game/sprites/ornaments";
import type { PixelPalette } from "./PixelArt";
import { PixelArt } from "./PixelArt";

// Each letter gets a drop-shadow in one of the marble colors, tying the
// title back to the board instead of a single flat accent shadow.
const LETTER_COLORS = ["var(--c0)", "var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];

/** The decoration scattered inside the plaque: a star at each end and four
 * smaller sparkles filling the space around them. Positions are classes
 * rather than inline offsets, so the mobile plaque can move them without the
 * component knowing anything about size. */
const SPECKS: { slot: string; rows: string[]; palette: PixelPalette; size: number }[] = [
  { slot: "a", rows: STAR_ROWS, palette: STAR_CYAN_PALETTE, size: 2 },
  { slot: "b", rows: STAR_ROWS, palette: STAR_PINK_PALETTE, size: 2 },
  { slot: "c", rows: SPARKLE_SM_ROWS, palette: SPARKLE_PALETTE, size: 2 },
  { slot: "d", rows: SPARKLE_SM_ROWS, palette: SPARKLE_CYAN_PALETTE, size: 2 },
  { slot: "e", rows: SPARKLE_SM_ROWS, palette: SPARKLE_PALETTE, size: 1 },
  { slot: "f", rows: SPARKLE_SM_ROWS, palette: SPARKLE_CYAN_PALETTE, size: 1 },
];

interface MarmorTitleProps {
  /** Shown on the plaque's second line. 1-based, as the player counts. */
  round: number;
}

/** The title plaque: the game's name over the round it is on, in a frame
 * with cut corners and decoration scattered inside it.
 *
 * It says LEVEL rather than ROUND, which is what the rest of the game calls
 * these — the pause menu and the cleared dialog both say "Round N". Worth
 * knowing when the two are read together. */
export function MarmorTitle({ round }: MarmorTitleProps) {
  const letters = [..."MARMOR"];
  return (
    <h1 className="titlebar__plaque">
      <span className="titlebar__name">
        {letters.map((letter, i) => (
          <span
            key={i}
            style={{ textShadow: `3px 3px 0 ${LETTER_COLORS[i % LETTER_COLORS.length]}, 6px 6px 0 rgba(0, 0, 0, 0.5)` }}
          >
            {letter}
          </span>
        ))}
      </span>
      <span className="titlebar__level">Level {round}</span>

      {SPECKS.map(({ slot, rows, palette, size }) => (
        <span key={slot} aria-hidden="true" className={`titlebar__speck titlebar__speck--${slot}`}>
          <PixelArt rows={rows} palette={palette} pixelSize={size} />
        </span>
      ))}
    </h1>
  );
}
