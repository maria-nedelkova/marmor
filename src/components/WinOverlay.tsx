import { useMemo } from "react";
import { Button } from "./ui/8bit/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/8bit/dialog";

interface WinOverlayProps {
  visible: boolean;
  score: number;
  onRestart: () => void;
}

const QUIPS: { title: string; body: string }[] = [
  { title: "The King has fallen!", body: "You dethroned the King with {score} points." },
  { title: "Long live the Pretender!", body: "{score} points and a crown that fits a little too well." },
  { title: "Off with the old throne!", body: "{score} points of pure marble-lining regicide." },
  { title: "A star is dethroned!", body: "The King rolls off his pedestal, {score} points behind." },
  { title: "New management!", body: "{score} points later, the kingdom has a new tyrant. That's you." },
];

export function WinOverlay({ visible, score, onRestart }: WinOverlayProps) {
  const quip = useMemo(() => QUIPS[Math.floor(Math.random() * QUIPS.length)]!, [visible]);

  return (
    <Dialog open={visible}>
      <DialogContent showCloseButton={false} className="win-dialog">
        <DialogHeader>
          <DialogTitle className="win-dialog__title">{quip.title}</DialogTitle>
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
