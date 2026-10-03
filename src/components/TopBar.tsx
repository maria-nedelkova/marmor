import { useEffect, useRef } from "react";
import { Menu, Volume2, VolumeX } from "lucide-react";
import {
  COIN_PALETTE,
  COIN_ROWS,
  HEART_PALETTE,
  HEART_SM_ROWS,
  SPARKLE_CYAN_PALETTE,
  SPARKLE_PALETTE,
  SPARKLE_SM_ROWS,
  STAR_CYAN_PALETTE,
  STAR_GOLD_PALETTE,
  STAR_ROWS,
} from "../game/sprites/ornaments";
import type { ColorIndex } from "../game/types";
import { GameButton } from "./GameButton";
import { NextPreview } from "./NextPreview";
import type { PixelPalette } from "./PixelArt";
import { PixelArt } from "./PixelArt";

interface TopBarProps {
  nextQueue: ColorIndex[];
  muted: boolean;
  /** Bumped by the dice. Each new value replays the flash on this zone. */
  pulseToken: number;
  onToggleMute: () => void;
  /** Opens the pause menu, which owns every action that isn't checked
   * mid-turn (restart, new game, rules, leaderboard). */
  onOpenMenu: () => void;
}

/** Decoration only, so it is hidden from assistive tech outright — the queue
 * beside it is the content. */
function Ornament({ rows, palette, className }: { rows: string[]; palette: PixelPalette; className?: string }) {
  return (
    <span aria-hidden="true" className={className ? `topbar__ornament ${className}` : "topbar__ornament"}>
      <PixelArt rows={rows} palette={palette} pixelSize={2} />
    </span>
  );
}

/** The control panel: a menu key, the queue, a sound key.
 *
 * Icon-only keys with no captions, and the queue flanked by pixel ornaments
 * — an arcade panel rather than a labelled toolbar. The names are still
 * rendered for assistive tech (.topbar__label clips them rather than hiding
 * them), so dropping the captions costs the two buttons nothing in
 * accessible naming. */
export function TopBar({ nextQueue, muted, pulseToken, onToggleMute, onOpenMenu }: TopBarProps) {
  const nextRef = useRef<HTMLDivElement>(null);

  // Remove, force a reflow, re-add — the same restart trick .shake uses. A
  // CSS animation won't replay just because the class is already there, and
  // rerolling twice in a row has to flash twice or the second one looks
  // like it failed. Skipped on the initial render (token 0), which isn't a
  // reroll.
  useEffect(() => {
    const el = nextRef.current;
    if (!el || pulseToken === 0) return;
    el.classList.remove("is-rerolled");
    void el.offsetWidth;
    el.classList.add("is-rerolled");
  }, [pulseToken]);

  return (
    <div className="topbar">
      <GameButton className="topbar__key" onClick={onOpenMenu} title="Open menu">
        <Menu size={18} aria-hidden="true" />
        <span className="topbar__label">Menu</span>
      </GameButton>

      {/* The queue is the one thing in here read every turn, so it is what
          sits dead centre. The ornaments hang off its corners absolutely
          rather than sitting beside it in flow — in flow they are four more
          items in the row, and they push the marbles off the panel's centre
          line.

          Two diagonals, the way the reference arranges them: sparkles on
          one (top-left, bottom-right) and hearts on the other (bottom-left,
          top-right). Scattered across a diagonal rather than mirrored in
          pairs is what stops them reading as a row of UI. */}
      <div ref={nextRef} className="topbar__zone topbar__next">
        <Ornament rows={SPARKLE_SM_ROWS} palette={SPARKLE_PALETTE} className="topbar__ornament--tl" />
        <Ornament rows={HEART_SM_ROWS} palette={HEART_PALETTE} className="topbar__ornament--bl" />
        <NextPreview colors={nextQueue} />
        <Ornament rows={HEART_SM_ROWS} palette={HEART_PALETTE} className="topbar__ornament--tr" />
        <Ornament rows={SPARKLE_SM_ROWS} palette={SPARKLE_CYAN_PALETTE} className="topbar__ornament--br" />
      </div>

      <GameButton
        className="topbar__key"
        onClick={onToggleMute}
        aria-pressed={muted}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        <span className="topbar__label">Sound</span>
      </GameButton>

      {/* Straddles the panel's bottom edge, breaking the border behind it —
          the trinkets are set INTO the frame rather than sitting inside it.
          A direct child of .topbar, not of the queue, because it positions
          against the panel. */}
      <div className="topbar__trinkets">
        <span className="topbar__stud" />
        <Ornament rows={STAR_ROWS} palette={STAR_CYAN_PALETTE} />
        <span className="topbar__stud" />
        <Ornament rows={COIN_ROWS} palette={COIN_PALETTE} />
        <span className="topbar__stud" />
        <Ornament rows={STAR_ROWS} palette={STAR_GOLD_PALETTE} />
        <span className="topbar__stud" />
      </div>
    </div>
  );
}
