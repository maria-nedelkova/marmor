// Ranking rules for the Hall of Pretenders. Pure and dependency-free (apart
// from LEVEL_COUNT) so the ordering can be unit-tested, and so the exact
// same comparison can later run server-side without dragging React with it.

import { LEVEL_COUNT } from "./levels";

/** One completed run. `score` is what the player sees; it is deliberately
 * NOT what they're ranked on — see `progressOf`. */
export interface RunEntry {
  /** Stable per-browser id, so a player's row updates instead of duplicating. */
  id: string;
  name: string;
  /** Rounds fully cleared this run, 0..LEVEL_COUNT. */
  roundsCleared: number;
  /** Points banked in the round the run ended in; 0 for a finished run. */
  partialPoints: number;
  /** Marble moves across the whole run — the skill axis. Fewer is better. */
  moves: number;
  /** Total Pretender points, overshoot included. Display only. */
  score: number;
  /** Epoch ms, for tie-breaking and "when". */
  at: number;
}

export const MAX_PROGRESS = LEVEL_COUNT * 100;

export function isFinisher(entry: RunEntry): boolean {
  return entry.roundsCleared >= LEVEL_COUNT;
}

/** How far the run got, with last-clear luck removed.
 *
 * A round ends the moment the score crosses the King's 100, so a round's raw
 * points are `100 + overshoot`, and the overshoot is just however long the
 * final clear happened to be. Ranking on raw points would therefore sort
 * finishers by luck. Counting a flat 100 per cleared round plus whatever was
 * banked in the round they died in strips that out: every finisher lands on
 * exactly MAX_PROGRESS and is separated only by `moves`, while players who
 * fell short still rank smoothly by how deep they got. */
export function progressOf(entry: RunEntry): number {
  const rounds = clamp(entry.roundsCleared, 0, LEVEL_COUNT);
  // Clamped below 100 by construction — 100 would have cleared the round —
  // but a corrupt or hand-edited entry shouldn't be able to buy a free round.
  const partial = rounds >= LEVEL_COUNT ? 0 : clamp(entry.partialPoints, 0, 99);
  return rounds * 100 + partial;
}

const MAX_MOVES = 99_999;

/** Packs (progress desc, moves asc) into one ascending number, so a Redis
 * sorted set can hold the whole ordering in its single float score. Stays
 * far inside float64's exact-integer range (max ~8e7 here vs ~9e15). */
export function sortKeyOf(entry: RunEntry): number {
  return progressOf(entry) * 100_000 + (MAX_MOVES - clamp(entry.moves, 0, MAX_MOVES));
}

/** Best-first. Higher progress wins; ties go to fewer moves; then to
 * whoever got there first, so an existing row is never displaced by an
 * identical later one. */
export function compareEntries(a: RunEntry, b: RunEntry): number {
  const diff = sortKeyOf(b) - sortKeyOf(a);
  return diff !== 0 ? diff : a.at - b.at;
}

export function rankEntries(entries: RunEntry[]): RunEntry[] {
  return [...entries].sort(compareEntries);
}

/** True when `next` is a better run than `prev` — used to keep one row per
 * player rather than a wall of their attempts. */
export function isBetterRun(next: RunEntry, prev: RunEntry): boolean {
  return sortKeyOf(next) > sortKeyOf(prev);
}

/** "8/8" for a finished run, otherwise the round it ended in and the points
 * banked there ("R6 · 45"). */
export function reachedLabel(entry: RunEntry): string {
  if (isFinisher(entry)) return `${LEVEL_COUNT}/${LEVEL_COUNT}`;
  return `R${entry.roundsCleared + 1} · ${entry.partialPoints}`;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(Math.max(Math.trunc(n), lo), hi);
}
