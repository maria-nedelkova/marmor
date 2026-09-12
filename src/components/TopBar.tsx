import { Menu, Volume2, VolumeX } from "lucide-react";
import type { ColorIndex } from "../game/types";
import { NextPreview } from "./NextPreview";
import { Button } from "./ui/8bit/button";

interface TopBarProps {
  nextQueue: ColorIndex[];
  muted: boolean;
  onToggleMute: () => void;
  /** Opens the pause menu, which now owns every action that isn't checked
   * mid-turn (restart, new game, rules, leaderboard). */
  onOpenMenu: () => void;
}

/** Deliberately down to three zones. "Next up" and mute are glanced at or
 * toggled during play; everything else is a between-turns decision and lives
 * behind the menu, so the bar above the board stays quiet. */
export function TopBar({ nextQueue, muted, onToggleMute, onOpenMenu }: TopBarProps) {
  return (
    <div className="topbar">
      <Button font="retro" onClick={onOpenMenu} className="topbar__zone" title="Open menu">
        <Menu size={16} aria-hidden="true" />
        <span className="topbar__label">Menu</span>
      </Button>

      <div className="topbar__zone topbar__next">
        <span className="topbar__next-label">Next up</span>
        <NextPreview colors={nextQueue} />
      </div>

      <Button font="retro" onClick={onToggleMute} className="topbar__zone" aria-pressed={muted}>
        {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        <span className="topbar__label">Sound</span>
      </Button>
    </div>
  );
}
