// Leaderboard persistence, behind an async interface from day one.
//
// Phase 1 keeps everything in localStorage so the board is playable with no
// backend at all. Phase 2 swaps in a Redis-backed implementation of this
// same interface (a sorted set keyed on `sortKeyOf`, which is why that
// function packs the whole ordering into a single number). The methods are
// async here purely so that swap is a one-file change rather than a
// refactor of every caller.

import { isBetterRun, rankEntries } from "../game/score";
import type { RunEntry } from "../game/score";

export interface LeaderboardStore {
  /** Best-first, already ranked. */
  list(limit?: number): Promise<RunEntry[]>;
  /** Records a run, keeping only a player's best. Returns the new board. */
  submit(entry: RunEntry): Promise<RunEntry[]>;
}

const ENTRIES_KEY = "marmor.leaderboard.v1";
const PLAYER_KEY = "marmor.player.v1";
export const MAX_NAME_LENGTH = 12;

/** Every storage read is treated as hostile: localStorage can be disabled
 * (Safari private mode throws on access), full, or hold whatever a previous
 * version — or the user's devtools — left behind. A leaderboard is a nice
 * extra, so every failure here degrades to "no scores yet" rather than
 * taking the game down with it. */
function readEntries(): RunEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRunEntry);
  } catch {
    return [];
  }
}

function writeEntries(entries: RunEntry[]): void {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // Quota or a disabled store — the in-memory board still works for this
    // session, which is better than blowing up mid-celebration.
  }
}

function isRunEntry(value: unknown): value is RunEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.name === "string" &&
    typeof e.roundsCleared === "number" &&
    typeof e.partialPoints === "number" &&
    typeof e.moves === "number" &&
    typeof e.score === "number" &&
    typeof e.at === "number"
  );
}

/** Trims, collapses whitespace, strips control characters and caps length.
 * Names are rendered as text (never as HTML), so this is about keeping the
 * table readable rather than about injection — a 400-character name would
 * wreck the layout long before it did anything dangerous. */
export function sanitizeName(raw: string): string {
  // A positive allowlist (letters, digits, space, a little punctuation)
  // rather than a control-character blocklist: it can't be slipped past
  // with an exotic separator, and it keeps the fixed-width table readable.
  // Whitespace is normalised to spaces FIRST, so that a newline or tab
  // separates words ("two\nlines" -> "two lines") instead of being deleted
  // and welding them together.
  const cleaned = raw
    .replace(/\s+/gu, " ")
    .replace(/[^\p{L}\p{N} _.-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return cleaned.slice(0, MAX_NAME_LENGTH).trim() || "ANON";
}

/** A stable id per browser, so re-running replaces your row instead of
 * stacking up attempts. Not an identity claim — anyone can clear it. */
export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_KEY);
    if (existing) return existing;
    const id = `p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(PLAYER_KEY, id);
    return id;
  } catch {
    // No storage: a per-session id still ranks correctly, it just won't
    // survive a reload.
    return `p_${Math.random().toString(36).slice(2)}`;
  }
}

export const localLeaderboard: LeaderboardStore = {
  async list(limit) {
    const ranked = rankEntries(readEntries());
    return limit === undefined ? ranked : ranked.slice(0, limit);
  },

  async submit(entry) {
    const entries = readEntries();
    const index = entries.findIndex((e) => e.id === entry.id);
    if (index === -1) {
      entries.push(entry);
    } else if (isBetterRun(entry, entries[index]!)) {
      entries[index] = entry;
    } else {
      // A worse attempt still refreshes the display name, so renaming
      // yourself doesn't require beating your own best.
      entries[index] = { ...entries[index]!, name: entry.name };
    }
    const ranked = rankEntries(entries);
    writeEntries(ranked);
    return ranked;
  },
};
