import { useEffect, useRef } from "react";
import { Menu, Volume2, VolumeX } from "lucide-react";
import type { ColorIndex } from "../game/types";
import { Button3D } from "./Button3D";
import { NextPreview } from "./NextPreview";

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

/** Three zones, grouped tight around "Next up" rather than spread across the
 * bar. Next up is the only thing here read every turn, so Menu and Sound sit
 * beside it as satellites instead of being pushed to the far edges where
 * they read as three equally-important controls. */
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
      <Button3D className="topbar__btn" onClick={onOpenMenu} title="Open menu">
        <Menu size={16} aria-hidden="true" />
        <span className="topbar__label">Menu</span>
      </Button3D>

      <div ref={nextRef} className="topbar__zone topbar__next">
        <span className="topbar__next-label">Next up</span>
        <NextPreview colors={nextQueue} />
      </div>

      <Button3D
        className="topbar__btn"
        onClick={onToggleMute}
        aria-pressed={muted}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        <span className="topbar__label">Sound</span>
      </Button3D>
    </div>
  );
}
