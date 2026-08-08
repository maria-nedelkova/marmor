import type { ColorIndex } from "../game/types";

interface MarbleProps {
  color: ColorIndex;
  variant?: "idle" | "spawning" | "moving" | "popping";
}

export function Marble({ color, variant = "idle" }: MarbleProps) {
  const classes = ["marble", `c${color}`];
  if (variant !== "idle") classes.push(variant);
  return <div className={classes.join(" ")} />;
}
