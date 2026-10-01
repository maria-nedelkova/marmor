import { useMemo } from "react";
import type { LevelConfig } from "../game/levels";
import { rng } from "../game/rng";
import { TOOL_ART } from "../game/sprites/tools";
import { toolUnlockedAt } from "../game/tools";
import { Button3D } from "./Button3D";
import { PixelArt } from "./PixelArt";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/8bit/dialog";

interface LevelClearedOverlayProps {
  visible: boolean;
  score: number;
  runScore: number;
  /** The round just beaten. */
  level: LevelConfig;
  /** The round about to start — its `twist` is the hook to keep playing. */
  nextLevel: LevelConfig;
  nextRoundNumber: number;
  onNext: () => void;
}

const QUIPS: { title: string; body: string }[] = [
  { title: "Round won!", body: "{score} points and the King is off his pedestal. He gets up. He looks annoyed." },
  { title: "One throne down!", body: "{score} points. The King dusts himself off and calls for a rematch." },
  { title: "The court is nervous", body: "{score} points said out loud, and nobody in the hall will meet your eye." },
  { title: "He wants a rematch", body: "{score} points wasn't enough to keep him down. It never is." },
  { title: "Toppled, not finished", body: "{score} points, and a King who has clearly been holding back." },
];

export function LevelClearedOverlay({
  visible,
  score,
  runScore,
  level,
  nextLevel,
  nextRoundNumber,
  onNext,
}: LevelClearedOverlayProps) {
  const quip = useMemo(() => QUIPS[Math.floor(rng.random() * QUIPS.length)]!, [visible]);

  // The tool the round you're about to start hands you, if any. Rounds 1
  // and 8 unlock nothing, so this is null for those two transitions and the
  // block simply isn't rendered — the dialog doesn't reserve space for it.
  const newTool = toolUnlockedAt(nextRoundNumber - 1);

  return (
    <Dialog open={visible}>
      <DialogContent showCloseButton={false} className="game-dialog level-dialog">
        <DialogHeader>
          <DialogTitle className="level-dialog__title">{quip.title}</DialogTitle>
          <DialogDescription>
            {level.name} cleared — {quip.body.replace("{score}", String(score))}
          </DialogDescription>
        </DialogHeader>

        <div className="level-dialog__next">
          <p className="level-dialog__next-label">
            Round {nextRoundNumber}: {nextLevel.name}
          </p>
          <p className="level-dialog__twist">{nextLevel.twist}</p>
          {/* No "next King defends N" here any more — the target is a flat
              100 every round, so printing it would only imply it varies. */}
          <p className="level-dialog__target">Run total {runScore}</p>
        </div>

        {/* A new tool used to appear in the rack unannounced, which meant
            the one round that handed you an answer to its own difficulty
            was the round you were least likely to notice it. */}
        {newTool ? (
          <div className="level-dialog__unlock">
            <PixelArt
              rows={TOOL_ART[newTool.id].rows}
              palette={TOOL_ART[newTool.id].palette}
              pixelSize={4}
              className="level-dialog__unlock-art"
            />
            <div className="level-dialog__unlock-text">
              <p className="level-dialog__unlock-label">New tool unlocked</p>
              <p className="level-dialog__unlock-name">{newTool.name}</p>
              <p className="level-dialog__unlock-desc">{newTool.description}</p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button3D className="dialog-btn" onClick={onNext}>
            Round {nextRoundNumber}
          </Button3D>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
