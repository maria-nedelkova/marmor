// Each letter gets a drop-shadow in one of the marble colors, tying the
// title back to the board instead of a single flat accent shadow.
const LETTER_COLORS = ["var(--c0)", "var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];

interface MarmorTitleProps {
  /** Shown on the plaque's second line. 1-based, as the player counts. */
  round: number;
}

/** The title plaque: the game's name over the round it is on, in the same
 * framed panel the controls and score chips wear.
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
    </h1>
  );
}
