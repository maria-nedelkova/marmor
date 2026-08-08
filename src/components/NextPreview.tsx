import type { ColorIndex } from "../game/types";
import { Marble } from "./Marble";

export function NextPreview({ colors }: { colors: ColorIndex[] }) {
  return (
    <div className="next-preview">
      {colors.map((color, i) => (
        // Position is the identity here — the queue is replaced wholesale each turn.
        <Marble key={i} color={color} />
      ))}
    </div>
  );
}
