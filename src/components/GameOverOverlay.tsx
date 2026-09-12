import { useMemo } from "react";
import type { ReactNode } from "react";
import { Button3D } from "./Button3D";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/8bit/dialog";

interface GameOverOverlayProps {
  visible: boolean;
  score: number;
  levelName: string;
  roundNumber: number;
  /** Restarts the round that was just lost — the default action, since
   * sending someone back to round 1 for one bad board is how a ladder
   * stops being fun. */
  onRetry: () => void;
  /** Drops back to round 1 for a fresh run. */
  onRestart: () => void;
  /** Slot for the leaderboard name prompt — a lost run still ranks, since
   * the board orders partial runs by how far they got. */
  children?: ReactNode;
}

const QUIPS: { title: string; body: string }[] = [
  { title: "Buried in marbles!", body: "The Pretender is under the pile. {score} points and a very undignified end." },
  { title: "Booed off the board!", body: "No throne for you today. {score} points before the crowd turned on you." },
  { title: "Table: 1, Pretender: 0", body: "You packed the board solid with {score} points, then got packed in with it." },
  { title: "Rock bottom, marble edition", body: "{score} points, zero room to move. The King sleeps soundly tonight." },
  { title: "So close to a coup!", body: "{score} points of scheming, undone by one very full board." },
];

export function GameOverOverlay({
  visible,
  score,
  levelName,
  roundNumber,
  onRetry,
  onRestart,
  children,
}: GameOverOverlayProps) {
  const quip = useMemo(() => QUIPS[Math.floor(Math.random() * QUIPS.length)]!, [visible]);

  return (
    <Dialog open={visible}>
      <DialogContent showCloseButton={false} className="game-dialog gameover-dialog">
        <DialogHeader>
          <DialogTitle className="gameover-dialog__title">{quip.title}</DialogTitle>
          <DialogDescription>
            Round {roundNumber}, {levelName} — {quip.body.replace("{score}", String(score))}
          </DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button3D className="dialog-btn" onClick={onRetry}>
            Retry round {roundNumber}
          </Button3D>
          {/* Secondary: a flatter, dimmer face so "Start over" doesn't
              compete with retrying, which is the action nearly everyone
              wants after losing a round. */}
          <Button3D className="dialog-btn dialog-btn--ghost" onClick={onRestart}>
            Start over
          </Button3D>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
