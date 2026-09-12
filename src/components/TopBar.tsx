import { Menu, Volume2, VolumeX } from "lucide-react";
import type { ColorIndex } from "../game/types";
import { NextPreview } from "./NextPreview";
import { Button } from "./ui/8bit/button";

interface TopBarProps {
  nextQueue: ColorIndex[];
  muted: boolean;
  onToggleMute: () => void;
  /** Opens the pause menu, which owns every action that isn't checked
   * mid-turn (restart, new game, rules, leaderboard). */
  onOpenMenu: () => void;
}

/** Three zones, grouped tight around "Next up" rather than spread across the
 * bar. Next up is the only thing here read every turn, so Menu and Sound sit
 * beside it as satellites instead of being pushed to the far edges where
 * they read as three equally-important controls.
 *
 * Both buttons use the `ghost` variant, which is what suppresses the 8bit
 * Button's pixel-border decorations — the borders made two incidental
 * controls look as heavy as the board itself. */
export function TopBar({ nextQueue, muted, onToggleMute, onOpenMenu }: TopBarProps) {
  return (
    <div className="topbar">
      <Button font="retro" variant="ghost" onClick={onOpenMenu} className="topbar__zone" title="Open menu">
        <Menu size={16} aria-hidden="true" />
        <span className="topbar__label">Menu</span>
      </Button>

      <div className="topbar__zone topbar__next">
        <span className="topbar__next-label">Next up</span>
        <NextPreview colors={nextQueue} />
      </div>

      <Button
        font="retro"
        variant="ghost"
        onClick={onToggleMute}
        className="topbar__zone"
        aria-pressed={muted}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        <span className="topbar__label">Sound</span>
      </Button>
    </div>
  );
}
