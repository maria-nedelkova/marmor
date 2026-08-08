// Each letter gets a drop-shadow in one of the marble colors, tying the
// title back to the board instead of a single flat accent shadow.
const LETTER_COLORS = ["var(--c0)", "var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];

export function MarmorTitle() {
  const letters = [..."MARMOR"];
  return (
    <h1 className="titlebar__title">
      {letters.map((letter, i) => (
        <span key={i} style={{ textShadow: `3px 3px 0 ${LETTER_COLORS[i % LETTER_COLORS.length]}, 6px 6px 0 rgba(0, 0, 0, 0.5)` }}>
          {letter}
        </span>
      ))}
    </h1>
  );
}
