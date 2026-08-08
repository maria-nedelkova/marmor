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
  onClick: (r: number, c: number) => void;
}

export function Cell({ r, c, color, selected, reachable, popping, spawning, onClick }: CellProps) {
  const classes = ["cell"];
  if (selected) classes.push("selected");
  if (reachable) classes.push("reachable");

  const variant = popping ? "popping" : spawning ? "spawning" : "idle";

  return (
    <div className={classes.join(" ")} onClick={() => onClick(r, c)} role="gridcell" aria-selected={selected}>
      {color !== null ? <Marble color={color} variant={variant} /> : null}
    </div>
  );
}
