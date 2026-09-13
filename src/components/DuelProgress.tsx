import { Progress } from "./ui/8bit/progress";

interface DuelProgressProps {
  score: number;
  kingScore: number;
}

/** A compact pixel-square progress bar showing how close the Pretender is
 * to the King's score — carries the "who's winning" signal on narrow
 * screens, where the two pedestals sit too close together (and too short)
 * for their relative heights to read clearly.
 *
 * It fills left-to-right. On mobile the Pretender sits to the LEFT of this
 * bar and the King to the right (see .layout's grid-template-areas), so the
 * fill grows out of the player's own mascot and advances on the King —
 * it points at whoever is being caught. */
export function DuelProgress({ score, kingScore }: DuelProgressProps) {
  const value = Math.min(100, (score / kingScore) * 100);
  return (
    <div className="duel-progress">
      <Progress value={value} variant="retro" font="retro" className="h-3" progressBg="bg-[var(--accent2)]" />
    </div>
  );
}
