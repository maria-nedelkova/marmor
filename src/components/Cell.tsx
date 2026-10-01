import type { ColorIndex } from "../game/types";
import { Marble } from "./Marble";

interface CellProps {
  r: number;
  c: number;
  color: ColorIndex | null;
  selected: boolean;
  reachable: boolean;
  popping: boolean;
  spawning: boolean;
  /** Colour due to land here this turn, shown as a ghost once the crystal
   * ball has been used. Only ever set on an empty cell — the spawn is
   * assigned to empty cells by definition. */
  foreseen: ColorIndex | null;
  onClick: (r: number, c: number) => void;
}

export function Cell({ r, c, color, selected, reachable, popping, spawning, foreseen, onClick }: CellProps) {
  const classes = ["cell"];
  if (selected) classes.push("selected");
  if (reachable) classes.push("reachable");

  const variant = popping ? "popping" : spawning ? "spawning" : "idle";

  return (
    <div className={classes.join(" ")} onClick={() => onClick(r, c)} role="gridcell" aria-selected={selected}>
      {color !== null ? (
        <Marble color={color} variant={variant} />
      ) : foreseen !== null ? (
        // A shrunken, see-through marble rather than a neutral marker: the
        // spawn is already decided at this point, so withholding the colour
        // would be hiding information the game has, and the player's whole
        // reason for looking is to plan around what lands where.
        <div className={`marble c${foreseen} foreseen`} aria-label="Incoming marble" />
      ) : null}
    </div>
  );
}
