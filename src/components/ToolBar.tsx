import { LOCK_PALETTE, LOCK_ROWS, TOOL_ART } from "../game/sprites/tools";
import { hasCharge, isUnlocked, TOOLS, unlockedAt } from "../game/tools";
import type { ToolCharges, ToolId } from "../game/tools";
import { PixelArt } from "./PixelArt";

interface ToolBarProps {
  levelIndex: number;
  charges: ToolCharges;
  activeTool: ToolId | null;
  /** True once the first of two flask picks is made — the prompt changes. */
  awaitingSecondPick: boolean;
  onArm: (id: ToolId) => void;
  onUse: (id: ToolId) => void;
}

/** Which tools need a board target. The rest resolve on tap, so arming them
 * would be a pointless extra step. */
const TARGETED: ReadonlySet<ToolId> = new Set<ToolId>(["hammer", "swap", "bomb"]);

/** What the board is waiting for while each targeted tool is armed. */
const PROMPTS: Record<string, string> = {
  hammer: "Tap a marble to smash it.",
  bomb: "Tap anywhere to blow a hole.",
  swap: "Tap the first of two marbles to swap.",
  "swap:second": "Now tap the marble to swap it with.",
};

/** The tool rack. Icons only — each tool is a recognisable object, so a
 * label underneath would be repeating what the picture already says, and
 * four labelled buttons don't fit one phone row anyway. The name still
 * reaches screen readers and the tooltip. */
export function ToolBar({ levelIndex, charges, activeTool, awaitingSecondPick, onArm, onUse }: ToolBarProps) {
  if (unlockedAt(levelIndex).length === 0) return null;

  const prompt = activeTool
    ? (PROMPTS[activeTool === "swap" && awaitingSecondPick ? "swap:second" : activeTool] ?? null)
    : null;

  return (
    <div className="toolbar">
      <div className="toolbar__row">
        {TOOLS.map((tool) => {
          const unlocked = isUnlocked(tool, levelIndex);
          const count = charges[tool.id] ?? 0;
          const usable = unlocked && hasCharge(charges, tool.id);
          const art = TOOL_ART[tool.id];
          const classes = ["btn-key", "toolbar__tool"];
          if (activeTool === tool.id) classes.push("is-active");
          if (!unlocked) classes.push("is-locked");
          else if (!usable) classes.push("is-spent");

          return (
            <button
              key={tool.id}
              type="button"
              className={classes.join(" ")}
              disabled={!usable}
              title={unlocked ? `${tool.name} — ${tool.description}` : `${tool.name} unlocks in round ${tool.unlocksAt + 1}`}
              aria-label={unlocked ? `${tool.name}, ${count} left` : `${tool.name}, locked until round ${tool.unlocksAt + 1}`}
              aria-pressed={activeTool === tool.id}
              onClick={() => (TARGETED.has(tool.id) ? onArm(tool.id) : onUse(tool.id))}
            >
              <PixelArt rows={art.rows} palette={art.palette} pixelSize={3} className="toolbar__art" />
              {/* Locked tools keep their silhouette underneath rather than
                  being swapped for a lock, so you can see what is coming. */}
              {unlocked ? (
                <span className="toolbar__count">{count}</span>
              ) : (
                <PixelArt rows={LOCK_ROWS} palette={LOCK_PALETTE} pixelSize={2} className="toolbar__lock" />
              )}
            </button>
          );
        })}
      </div>
      {/* Reserved whether or not a tool is armed, so arming one doesn't shove
          the board up a line. */}
      <p className="toolbar__prompt">{prompt ?? " "}</p>
    </div>
  );
}
