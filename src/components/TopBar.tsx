import { RefreshCw, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { ColorIndex } from "../game/types";
import { NextPreview } from "./NextPreview";
import { Button } from "./ui/8bit/button";

interface TopBarProps {
  nextQueue: ColorIndex[];
  muted: boolean;
  roundNumber: number;
  onToggleMute: () => void;
  /** Restarts the current round, keeping the run's banked score. */
  onRestartRound: () => void;
  /** Drops back to round 1 for a fresh run. */
  onNewGame: () => void;
}

export function TopBar({
  nextQueue,
  muted,
  roundNumber,
  onToggleMute,
  onRestartRound,
  onNewGame,
}: TopBarProps) {
  return (
    <div className="topbar">
      {/* Restarting the round you're on is the common case — a board gets
          jammed long before you want to abandon the whole run — so it sits
          first, with "New game" (back to round 1) next to it. */}
      <Button font="retro" onClick={onRestartRound} className="topbar__zone" title={`Restart round ${roundNumber}`}>
        <RefreshCw size={16} aria-hidden="true" />
        <span className="topbar__label">Restart round</span>
      </Button>

      <Button font="retro" onClick={onNewGame} className="topbar__zone" title="Start over from round 1">
        <RotateCcw size={16} aria-hidden="true" />
        <span className="topbar__label">New game</span>
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
