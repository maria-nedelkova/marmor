import { Eye, Hammer, RefreshCw, Repeat } from "lucide-react";
import type { ComponentType } from "react";
import { hasCharge, TOOLS, unlockedAt } from "../game/tools";
import type { ToolCharges, ToolId } from "../game/tools";

interface ToolBarProps {
  levelIndex: number;
  charges: ToolCharges;
  activeTool: ToolId | null;
  /** True once the first of two swap picks is made — the prompt changes. */
  awaitingSecondPick: boolean;
  /** Board-targeting tools: arm, then tap the board. */
  onArm: (id: ToolId) => void;
  /** Tools that need no target and fire immediately. */
  onUse: (id: ToolId) => void;
}

const ICONS: Record<ToolId, ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>> = {
  hammer: Hammer,
  swap: Repeat,
  reroll: RefreshCw,
  foresight: Eye,
};

/** Which tools need a board target. The rest resolve the moment they're
 * tapped, so arming them would be a pointless extra step. */
const TARGETED: ReadonlySet<ToolId> = new Set<ToolId>(["hammer", "swap"]);

/** The tool rack. Renders nothing at all in round 1, where no tool has
 * unlocked yet — an empty rack would just be a strip of dead space with
 * nothing to explain it. */
export function ToolBar({ levelIndex, charges, activeTool, awaitingSecondPick, onArm, onUse }: ToolBarProps) {
  const available = unlockedAt(levelIndex);
  if (available.length === 0) return null;

  const prompt = activeTool
    ? activeTool === "swap"
      ? awaitingSecondPick
        ? "Now tap the marble to swap it with."
        : "Tap the first of two marbles to swap."
      : "Tap a marble to smash it."
    : null;

  return (
    <div className="toolbar">
      <div className="toolbar__row">
        {TOOLS.map((tool) => {
          const unlocked = available.includes(tool);
          const Icon = ICONS[tool.id];
          const count = charges[tool.id] ?? 0;
          const usable = unlocked && hasCharge(charges, tool.id);
          const classes = ["toolbar__tool"];
          if (activeTool === tool.id) classes.push("is-active");
          if (!usable) classes.push("is-spent");

          return (
            <button
              key={tool.id}
              type="button"
              className={classes.join(" ")}
              // Locked tools stay visible but inert, so the rack's shape
              // doesn't jump every time a round unlocks something — you can
              // see what's coming.
              disabled={!usable}
              title={unlocked ? `${tool.name} — ${tool.description}` : `Unlocks in round ${tool.unlocksAt + 1}`}
              aria-label={`${tool.name}, ${count} left`}
              aria-pressed={activeTool === tool.id}
              onClick={() => (TARGETED.has(tool.id) ? onArm(tool.id) : onUse(tool.id))}
            >
              <Icon size={15} aria-hidden={true} />
              <span className="toolbar__name">{tool.name}</span>
              <span className="toolbar__count">{unlocked ? count : "—"}</span>
            </button>
          );
        })}
      </div>
      {/* Reserved whether or not a tool is armed, so arming one doesn't
          shove the board down a line. */}
      <p className="toolbar__prompt">{prompt ?? " "}</p>
    </div>
  );
}
