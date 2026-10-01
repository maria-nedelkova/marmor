// Crash recovery for an in-progress run — deliberately NOT save-anywhere
// progress.
//
// A run is meant to be a single sitting: leave, and you start the ladder
// again. What shouldn't cost you the run is iOS evicting a backgrounded tab
// and reloading the page on return, which is the OS's decision, not the
// player's. This module exists to tell those two cases apart.
//
// sessionStorage, not localStorage, is what draws that line. It is scoped to
// the tab session: it survives a reload, and it is gone the moment the tab
// or the browser closes — which is the rule expressed by the storage layer
// rather than by logic that has to be trusted to be right. The freshness
// window below covers the one case sessionStorage can't: a tab left open in
// the background for hours should feel like a new run, not a resumed one.

import { LEVEL_COUNT } from "./levels";
import { SIZE } from "./constants";
import { NO_CHARGES } from "./tools";
import type { ToolCharges, ToolId } from "./tools";
import type { Board, Cell, ColorIndex } from "./types";

const KEY = "marmor.progress.v1";

/** How stale a snapshot can be and still be resumed. Long enough to cover
 * an app switch, a phone call, or a commute interruption; short enough that
 * coming back to a tab the next morning starts the ladder over. */
const MAX_AGE_MS = 30 * 60 * 1000;

export interface RunSnapshot {
  levelIndex: number;
  board: Board;
  nextQueue: ColorIndex[];
  score: number;
  bankedScore: number;
  moves: number;
  roundsCleared: number;
  /** Unspent tool charges. Persisted so a recovered tab resumes with what
   * the player actually had left, rather than silently refunding a hammer. */
  charges: ToolCharges;
  /** This turn's committed spawn, if the crystal ball has been used and not
   * yet consumed. Null the rest of the time. Without it a tab evicted
   * between using the tool and making the move would charge for the
   * forecast and then throw it away — the charge is already spent by the
   * time the snapshot is written, so dropping this is strictly worse than
   * not persisting at all. */
  foreseen: ForeseenSpawn | null;
  /** Epoch ms of the save, for the freshness check. */
  at: number;
}

export interface ForeseenSpawn {
  cells: Cell[];
  colors: ColorIndex[];
}

/** Every read is treated as hostile — Safari private mode throws on the
 * very first access, storage can be full, and the payload may be whatever a
 * previous version of the game (or devtools) left behind. Resuming is a
 * convenience, so anything unexpected degrades to "no snapshot" and the
 * player simply starts at round 1. */
export function loadRun(): RunSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed)) return null;
    if (Date.now() - parsed.at > MAX_AGE_MS) {
      clearRun();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveRun(snapshot: Omit<RunSnapshot, "at">): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...snapshot, at: Date.now() }));
  } catch {
    // Quota or a disabled store. Play continues; only the safety net is lost.
  }
}

export function clearRun(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do — see loadRun's note on hostile storage.
  }
}

/** Validates shape AND bounds. A board of the wrong size or a level index
 * past the end of the ladder would crash the game far from here, so it's
 * rejected at the boundary where the bad data actually arrives. */
function isSnapshot(value: unknown): value is RunSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  const ints = ["levelIndex", "score", "bankedScore", "moves", "roundsCleared", "at"] as const;
  if (!ints.every((k) => typeof s[k] === "number" && Number.isFinite(s[k]))) return false;
  if ((s.levelIndex as number) < 0 || (s.levelIndex as number) >= LEVEL_COUNT) return false;
  if (!Array.isArray(s.nextQueue) || !s.nextQueue.every((c) => typeof c === "number")) return false;
  if (!isCharges(s.charges)) return false;
  if (!isForeseen(s.foreseen)) return false;
  if (!Array.isArray(s.board) || s.board.length !== SIZE) return false;
  return (s.board as unknown[]).every(
    (row) => Array.isArray(row) && row.length === SIZE && row.every((cell) => cell === null || typeof cell === "number"),
  );
}

/** Absent, null, or a well-formed forecast — anything else rejects the whole
 * snapshot. Absent counts as valid so a snapshot written by a build from
 * before this field existed still loads.
 *
 * The equal-lengths check is the one that matters: the spawn path pairs
 * `cells[i]` with `colors[i]`, so a short `colors` array would write
 * undefined straight into the board and corrupt it somewhere far from here.
 * Coordinates are bounds-checked for the same reason. */
function isForeseen(value: unknown): value is ForeseenSpawn | null {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  if (!Array.isArray(f.cells) || !Array.isArray(f.colors)) return false;
  if (f.cells.length !== f.colors.length) return false;
  // A spawn can't exceed the board. Bounding by area rather than by a
  // level's spawnCount keeps this file independent of the ladder.
  if (f.cells.length > SIZE * SIZE) return false;
  if (!f.colors.every((c) => typeof c === "number" && Number.isInteger(c) && c >= 0)) return false;
  return f.cells.every((cell) => {
    if (typeof cell !== "object" || cell === null) return false;
    const { r, c } = cell as Record<string, unknown>;
    return [r, c].every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < SIZE);
  });
}

/** Charges are rejected outright rather than clamped if anything is off:
 * a hand-edited save handing out twenty hammers would quietly undo the
 * whole point of the charge economy, and starting the round fresh is a far
 * better failure than an unbounded one. */
function isCharges(value: unknown): value is ToolCharges {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (Object.keys(NO_CHARGES) as ToolId[]).every(
    (id) => typeof c[id] === "number" && Number.isInteger(c[id]) && (c[id] as number) >= 0 && (c[id] as number) <= 9,
  );
}
