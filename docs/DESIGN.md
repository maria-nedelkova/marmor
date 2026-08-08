# Design decisions

Design choices and the reasoning behind them — the "why," not the "what"
(the code already shows the what). See [`ARCHITECTURE.md`](./ARCHITECTURE.md)
for how these are implemented.

## Core rules (unchanged from classic Color Lines)

- 9×9 board (`SIZE` in `src/game/constants.ts`).
- Click a marble, then an empty cell — the marble walks there only if a
  clear path exists (BFS pathfinding; marbles can't jump over each other).
- Lining up 5+ same-colored marbles (any of the 4 directions) pops them and
  scores points; **no new marbles spawn that turn** when a line clears.
- Otherwise, 3 new marbles drop onto random empty cells each turn
  (`SPAWN_COUNT`), previewed beforehand as "Next up" so the move is planned
  around known upcoming colors, not blind luck.
- Score for a clear: `n * 2 + max(0, n - 5) * 3` (`scoreForClear` in
  `engine.ts`) — a flat rate per marble, with an escalating bonus for
  clears longer than the 5-marble minimum, rewarding chaining rather than
  just hitting the minimum repeatedly.

## The King vs. Pretender framing

Plain Color Lines has no real "win" — you just survive as long as possible
before the board fills up. To give the game an explicit goal, it's framed as
a duel: a **King** mascot holds a fixed score (`KING_SCORE`, currently 100);
the player is the **Pretender**, whose score is the live game score.
Reaching or beating the King's score dethrones him — a new win state,
independent of the original "board fills up" loss state. Each mascot stands
on a pedestal and visibly reacts: the loser topples off (with a matching
sound — a comical bouncy "boioioing" for the King, since that moment is the
*player's* win and should feel triumphant rather than punishing; a jeering
crowd "Boooo" for the Pretender, since that's the player's loss).

(Earlier prototypes called the player-side mascot "Challenger" — renamed to
"Pretender" to match the vocabulary of the original DOS-era game this
project takes inspiration from.)

## Difficulty: spawn-blocking

Pure random spawning gets easier as you get better at planning ahead, since
you can build long runs uninterrupted. To keep some pressure on skilled
play, `assignSpawnCells` (in `engine.ts`) can deliberately drop a
mismatched-color marble onto the player's most-advanced near-complete line
instead of spawning purely at random. Tuned as:

- `BLOCK_MIN_RUN_LENGTH` (3) — a line has to already be at least this long
  before it's considered worth blocking. Blocking a 1- or 2-marble line
  would just feel random and unfair, not strategic.
- `BLOCK_PROBABILITY` (0.35) — a flat per-turn chance that blocking is even
  considered, rather than a fixed cooldown (e.g. "every 3rd turn"). A flat
  probability avoids falling into an learnable, exploitable pattern where
  the player can predict exactly when the board will and won't interfere.

This was tuned iteratively: an earlier version blocked deterministically
whenever a long line existed, which felt "too hard" (every good line got
punished); the flat-probability version reads as occasional bad luck
instead of an adversarial board.

## Visual and audio style: coherent pixel-art arcade

Everything reads as one consistent style on purpose:

- **8bitcn/shadcn components** (`src/components/ui/8bit/`) for all chrome —
  buttons, dialogs, badges, switches — so the UI doesn't clash with the
  hand-built pixel-art sprites.
- **One font throughout** (`Press Start 2P`) — title, body text, and UI
  chrome all use the same retro monospace display font rather than mixing a
  "gamey" display font with a normal system font for body copy.
- **Marbles match the sprite aesthetic** — flat colors with hard-edged
  highlights, not soft neon-glow gradients, so they don't visually clash
  with the crisp pixel-art King/Pretender mascots and pedestals standing
  next to them.
- **A custom pixel-art cursor and favicon** (`src/cursor-arrow.svg`,
  `src/favicon.svg`), built the same way as the character sprites (a
  crisp-edge pixel grid, no anti-aliasing), so even the browser chrome
  outside the game board stays in the same visual language.
- **All SFX are synthesized**, not sampled (`src/audio/sound.ts`) — square/
  sawtooth/sine oscillators and filtered noise bursts shaped with gain
  envelopes. This keeps the whole game asset-free (no audio files to author,
  license, or ship) while still giving each action (select, glide tick,
  place, clear, win, lose) a distinct, era-appropriate blip/chime/jeer.

## Replay variety in win/lose messages

`WinOverlay` and `GameOverOverlay` each pick a random quip from a small
pool every time they appear, instead of a single fixed message. A game you
might replay dozens of times in a sitting gets stale fast if the ending
text never changes — the fix was cheap (a `useMemo` keyed on the overlay's
`visible` prop, re-rolling each time it flips to `true`) relative to how
much it helps repeated play still feel fresh.
