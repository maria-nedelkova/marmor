import { Menu, Volume2, VolumeX } from "lucide-react";
import type { ColorIndex } from "../game/types";
import { NextPreview } from "./NextPreview";

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
 * Plain buttons on the shared `.btn3d` bevel rather than the 8bitcn Button:
 * once these wanted the same 3D treatment as the menu items, the component
 * was contributing nothing but utility classes to override. */
export function TopBar({ nextQueue, muted, onToggleMute, onOpenMenu }: TopBarProps) {
  return (
    <div className="topbar">
      <button type="button" className="btn3d topbar__btn" onClick={onOpenMenu} title="Open menu">
        <Menu size={16} aria-hidden="true" />
        <span className="topbar__label">Menu</span>
      </button>

      <div className="topbar__zone topbar__next">
        <span className="topbar__next-label">Next up</span>
        <NextPreview colors={nextQueue} />
      </div>

      <button
        type="button"
        className="btn3d topbar__btn"
        onClick={onToggleMute}
        aria-pressed={muted}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        <span className="topbar__label">Sound</span>
      </button>
    </div>
  );
}
