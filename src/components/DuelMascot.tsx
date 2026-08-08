import type { CSSProperties } from "react";
import type { PixelPalette } from "./PixelArt";
import { PixelArt } from "./PixelArt";
import { PEDESTAL_BASE_HEIGHT, PEDESTAL_CAP_HEIGHT, PEDESTAL_SHAFT_MAX, PEDESTAL_SHAFT_MIN, Pedestal } from "./Pedestal";
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
}

export function DuelMascot({ name, rows, palette, score, accent, side, heightRatio, falling }: DuelMascotProps) {
  const shaftHeight = PEDESTAL_SHAFT_MIN + (PEDESTAL_SHAFT_MAX - PEDESTAL_SHAFT_MIN) * Math.min(1, Math.max(0, heightRatio));
  const pedestalHeight = PEDESTAL_CAP_HEIGHT + shaftHeight + PEDESTAL_BASE_HEIGHT;
  // Each mascot topples outward, away from the board, on its own pedestal's
  // right (for the left-side King) or left (for the right-side Pretender) —
  // opposite fall directions so they never land toward each other.
  const fallSign = side === "left" ? -1 : 1;

  return (
    <div className={`duel-mascot duel-mascot--${side}`}>
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
          <PixelArt rows={rows} palette={palette} pixelSize={6} label={name} />
        </div>
        <Pedestal accent={accent} shaftHeight={shaftHeight} />
      </div>
      <span className="duel-mascot__name retro" style={{ color: accent }}>
        {name}
      </span>
    </div>
  );
}
