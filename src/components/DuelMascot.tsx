import type { CSSProperties } from "react";
import type { PixelPalette } from "./PixelArt";
import { PixelArt } from "./PixelArt";
import {
  PEDESTAL_BASE_HEIGHT,
  PEDESTAL_BASE_HEIGHT_COMPACT,
  PEDESTAL_CAP_HEIGHT,
  PEDESTAL_CAP_HEIGHT_COMPACT,
  PEDESTAL_SHAFT_MAX,
  PEDESTAL_SHAFT_MAX_COMPACT,
  PEDESTAL_SHAFT_MIN,
  PEDESTAL_SHAFT_MIN_COMPACT,
  Pedestal,
} from "./Pedestal";
import { Badge } from "./ui/8bit/badge";

interface DuelMascotProps {
  name: string;
  rows: string[];
  palette: PixelPalette;
  score: number;
  accent: string;
  side: "left" | "right";
  /** 0 = pedestal at its shortest, 1 = pedestal at full (the King's) height. */
  heightRatio: number;
  /** Plays the toppling-off-the-pedestal animation (used for the King on a win). */
  falling?: boolean;
  /** Renders at mobile-layout scale: smaller sprite, shorter pedestal — see
   * useIsMobile. A real size change (smaller pixelSize, shorter pedestal
   * constants), not a CSS transform, so the score badge's text stays crisp
   * and legible instead of shrinking past readable size. */
  compact?: boolean;
}

// Both sprites happen to transition from head to neck/collar at the same
// row (see king.ts/pretender.ts) — sliced here rather than in the sprite
// files themselves, since this crop is specific to the compact mobile
// display, not a property of the artwork.
const HEAD_ROWS = 10;

/** Blanks the leftmost and rightmost pixel columns.
 *
 * Both mascots hold their weapon in an outer column — the King's scepter at
 * 15, the Pretender's sword at 0 — and inside the head crop that column
 * holds nothing else, so this removes the weapons and only the weapons.
 * Cropping to the head left just the scepter orb and the sword tip floating
 * beside the face, which read as specks of dirt rather than as weapons. */
function stripWeaponColumns(pixelRow: string): string {
  return `.${pixelRow.slice(1, -1)}.`;
}

export function DuelMascot({ name, rows, palette, score, accent, side, heightRatio, falling, compact }: DuelMascotProps) {
  const displayRows = compact ? rows.slice(0, HEAD_ROWS).map(stripWeaponColumns) : rows;
  const capHeight = compact ? PEDESTAL_CAP_HEIGHT_COMPACT : PEDESTAL_CAP_HEIGHT;
  const baseHeight = compact ? PEDESTAL_BASE_HEIGHT_COMPACT : PEDESTAL_BASE_HEIGHT;
  const shaftMin = compact ? PEDESTAL_SHAFT_MIN_COMPACT : PEDESTAL_SHAFT_MIN;
  const shaftMax = compact ? PEDESTAL_SHAFT_MAX_COMPACT : PEDESTAL_SHAFT_MAX;
  const shaftHeight = shaftMin + (shaftMax - shaftMin) * Math.min(1, Math.max(0, heightRatio));
  const pedestalHeight = capHeight + shaftHeight + baseHeight;
  // Each mascot topples outward, away from the board, on its own pedestal's
  // right (for the left-side King) or left (for the right-side Pretender) —
  // opposite fall directions so they never land toward each other.
  const fallSign = side === "left" ? -1 : 1;

  return (
    <div className={`duel-mascot duel-mascot--${side}${compact ? " duel-mascot--compact" : ""}`}>
      <div className="duel-mascot__stage">
        <div
          className={`duel-mascot__figure${falling ? " duel-mascot__figure--falling" : ""}`}
          style={
            {
              bottom: pedestalHeight,
              "--fall-distance": `${pedestalHeight}px`,
              "--fall-x": `${fallSign * 55}px`,
              "--fall-rotate": `${fallSign * 98}deg`,
            } as CSSProperties
          }
        >
          <Badge
            variant="outline"
            font="retro"
            className="duel-mascot__score"
            style={{ borderColor: accent, color: accent }}
          >
            {score}
          </Badge>
          <PixelArt rows={displayRows} palette={palette} pixelSize={compact ? 4 : 6} label={name} />
        </div>
        <Pedestal accent={accent} shaftHeight={shaftHeight} height={pedestalHeight} compact={compact} />
      </div>
      <span className="duel-mascot__name retro" style={{ color: accent }}>
        {name}
      </span>
    </div>
  );
}
