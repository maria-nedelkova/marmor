export const PEDESTAL_CAP_HEIGHT = 8;
export const PEDESTAL_BASE_HEIGHT = 10;
export const PEDESTAL_SHAFT_MIN = 10;
export const PEDESTAL_SHAFT_MAX = 54 * 3.5; // one more "original" (54px) height on top of the 2.5x bump

interface PedestalProps {
  accent: string;
  shaftHeight: number;
}

/** A solid-filled pixel-style column whose shaft height reflects progress
 * toward the King's score — crisp by construction (plain rectangles, no
 * raster scaling needed). */
export function Pedestal({ accent, shaftHeight }: PedestalProps) {
  return (
    <div className="pedestal">
      <div className="pedestal__cap" style={{ background: accent }} />
      <div className="pedestal__shaft" style={{ background: accent, height: shaftHeight }} />
      <div className="pedestal__base" style={{ background: accent }} />
    </div>
  );
}
