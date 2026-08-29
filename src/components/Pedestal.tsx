export const PEDESTAL_CAP_HEIGHT = 8;
export const PEDESTAL_BASE_HEIGHT = 10;
export const PEDESTAL_SHAFT_MIN = 10;
export const PEDESTAL_SHAFT_MAX = 54 * 3.5; // one more "original" (54px) height on top of the 2.5x bump

// A shorter set of the same constants for the compact mobile layout, where
// the mascots sit in a row under the board instead of flanking it — see
// DuelProgress, which carries the "who's winning" signal there instead.
export const PEDESTAL_CAP_HEIGHT_COMPACT = 5;
export const PEDESTAL_BASE_HEIGHT_COMPACT = 6;
export const PEDESTAL_SHAFT_MIN_COMPACT = 6;
export const PEDESTAL_SHAFT_MAX_COMPACT = 40;

interface PedestalProps {
  accent: string;
  shaftHeight: number;
  /** Total cap + shaft + base height — the same number DuelMascot uses to
   * set the figure's `bottom` offset. Set explicitly on the container (not
   * just left to emerge from the three children stacking in a flex column)
   * so the pedestal's own box height can't drift out of sync with where the
   * figure is placed above it, whatever the cause — see the pedestal-height
   * mismatch entry in docs/LEARNINGS.md. */
  height: number;
  compact?: boolean;
}

/** A solid-filled pixel-style column whose shaft height reflects progress
 * toward the King's score — crisp by construction (plain rectangles, no
 * raster scaling needed). */
export function Pedestal({ accent, shaftHeight, height, compact }: PedestalProps) {
  return (
    <div className={compact ? "pedestal pedestal--compact" : "pedestal"} style={{ height }}>
      <div className="pedestal__cap" style={{ background: accent }} />
      <div className="pedestal__shaft" style={{ background: accent, height: shaftHeight }} />
      <div className="pedestal__base" style={{ background: accent }} />
    </div>
  );
}
