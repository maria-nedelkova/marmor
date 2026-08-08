import { useMemo } from "react";
import { Button } from "./ui/8bit/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/8bit/dialog";

interface GameOverOverlayProps {
  visible: boolean;
  score: number;
  onRestart: () => void;
}

const QUIPS: { title: string; body: string }[] = [
  { title: "Buried in marbles!", body: "The Pretender is under the pile. {score} points and a very undignified end." },
  { title: "Booed off the board!", body: "No throne for you today. {score} points before the crowd turned on you." },
  { title: "Table: 1, Pretender: 0", body: "You packed the board solid with {score} points, then got packed in with it." },
  { title: "Rock bottom, marble edition", body: "{score} points, zero room to move. The King sleeps soundly tonight." },
  { title: "So close to a coup!", body: "{score} points of scheming, undone by one very full board." },
];

export function GameOverOverlay({ visible, score, onRestart }: GameOverOverlayProps) {
  const quip = useMemo(() => QUIPS[Math.floor(Math.random() * QUIPS.length)]!, [visible]);

  return (
    <Dialog open={visible}>
      <DialogContent showCloseButton={false} className="gameover-dialog">
        <DialogHeader>
          <DialogTitle className="gameover-dialog__title">{quip.title}</DialogTitle>
          <DialogDescription>{quip.body.replace("{score}", String(score))}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button font="retro" onClick={onRestart}>
            New game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
