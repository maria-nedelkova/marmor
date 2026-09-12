import { useMemo } from "react";
import type { ReactNode } from "react";
import { Button3D } from "./Button3D";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/8bit/dialog";

interface WinOverlayProps {
  visible: boolean;
  score: number;
  /** Points across every round of the run — the number worth bragging about
   * once the whole ladder is behind you. */
  runScore: number;
  rounds: number;
  onRestart: () => void;
  /** Slot for the leaderboard name prompt, so the run is recorded from the
   * celebration itself rather than from a second stacked modal. */
  children?: ReactNode;
}

const QUIPS: { title: string; body: string }[] = [
  { title: "The King has fallen!", body: "You dethroned the King for good with {score} points." },
  { title: "Long live the Pretender!", body: "{score} points and a crown that fits a little too well." },
  { title: "Off with the old throne!", body: "{score} points of pure marble-lining regicide." },
  { title: "A star is dethroned!", body: "The King rolls off his pedestal for the last time, {score} points behind." },
  { title: "New management!", body: "{score} points later, the kingdom has a new tyrant. That's you." },
];

export function WinOverlay({ visible, score, runScore, rounds, onRestart, children }: WinOverlayProps) {
  const quip = useMemo(() => QUIPS[Math.floor(Math.random() * QUIPS.length)]!, [visible]);

  return (
    <Dialog open={visible}>
      <DialogContent showCloseButton={false} className="game-dialog win-dialog">
        <DialogHeader>
          <DialogTitle className="win-dialog__title">{quip.title}</DialogTitle>
          <DialogDescription>{quip.body.replace("{score}", String(score))}</DialogDescription>
        </DialogHeader>
        <p className="win-dialog__run">
          All {rounds} rounds cleared &middot; {runScore} points on the run
        </p>
        {children}
        <DialogFooter>
          <Button3D className="dialog-btn" onClick={onRestart}>
            New game
          </Button3D>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
