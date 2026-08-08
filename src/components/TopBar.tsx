import { Volume2, VolumeX } from "lucide-react";
import type { ColorIndex } from "../game/types";
import { NextPreview } from "./NextPreview";
import { Button } from "./ui/8bit/button";

interface TopBarProps {
  nextQueue: ColorIndex[];
  muted: boolean;
  onToggleMute: () => void;
  onNewGame: () => void;
}

export function TopBar({ nextQueue, muted, onToggleMute, onNewGame }: TopBarProps) {
  return (
    <div className="topbar">
      <Button font="retro" onClick={onNewGame} className="topbar__zone">
        New game
      </Button>

      <div className="topbar__zone topbar__next">
        <span className="topbar__next-label">Next up</span>
        <NextPreview colors={nextQueue} />
      </div>

      <Button font="retro" variant="secondary" onClick={onToggleMute} className="topbar__zone" aria-pressed={muted}>
        {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        Sound
      </Button>
    </div>
  );
}
