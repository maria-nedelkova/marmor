# Design decisions

Design choices and the reasoning behind them — the "why," not the "what"
(the code already shows the what). See [`ARCHITECTURE.md`](./ARCHITECTURE.md)
for how these are implemented.

## Core rules (unchanged from classic Color Lines)

- 9×9 board (`SIZE` in `src/game/constants.ts`).
- Click a marble, then an empty cell — the marble walks there only if a
  clear path exists (BFS pathfinding; marbles can't jump over each other).
- Lining up 5+ same-colored marbles (any of the 4 directions) pops them and
  scores points; **no new marbles spawn that turn** when a line clears
  (except in the final round — see `spawnOnClear` below).
- Otherwise, new marbles drop onto random empty cells each turn
  (`spawnCount`), previewed beforehand as "Next up" so the move is planned
  around known upcoming colors, not blind luck.
- Score for a clear: `n * 2 + max(0, n - 5) * 3` (`scoreForClear` in
  `engine.ts`) — a flat rate per marble, with an escalating bonus for
  clears longer than the 5-marble minimum, rewarding chaining rather than
  just hitting the minimum repeatedly.

## The King vs. Pretender framing

Plain Color Lines has no real "win" — you just survive as long as possible
before the board fills up. To give the game an explicit goal, it's framed as
a duel: a **King** mascot holds a fixed score (`KING_SCORE`, a flat 100 in
every round); the player is the **Pretender**, whose score is the live game
score. Reaching or beating the King's score dethrones him — a new win state,
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

- `blockMinRunLength` (3 in every round) — a line has to already be at least
  this long before it's considered worth blocking. Blocking a 1- or
  2-marble line would just feel random and unfair, not strategic. It's a
  per-round field for symmetry with the other dials, but nothing moves it:
  the *rate* of blocking is what the ladder ramps, not the threshold.
- `blockProbability` — a flat per-turn chance that blocking is even
  considered, rather than a fixed cooldown (e.g. "every 3rd turn"). A flat
  probability avoids falling into a learnable, exploitable pattern where
  the player can predict exactly when the board will and won't interfere.

This was tuned iteratively: an earlier version blocked deterministically
whenever a long line existed, which felt "too hard" (every good line got
punished); the flat-probability version reads as occasional bad luck
instead of an adversarial board.

## The round ladder

One fixed difficulty can't serve both a first-time player and someone on
their thirtieth game. The game is now **8 rounds** (`src/game/levels.ts`),
each a duel against a King defending the same 100 points.

**The King's score never changes.** `KING_SCORE` is a constant, not a
per-level field, so the ladder cannot get harder by moving the finish line
further away — only by making 100 points harder to earn. That's a real
constraint and not just bookkeeping: a rising target would let a round feel
"harder" purely by lasting longer, which is tedium rather than difficulty,
and it would make the difficulty of the *board* impossible to compare
across rounds.

**Round 1 is the pre-levels game, unchanged**: 100 to beat, all seven
colors, three marbles a turn, blocking at 0.35. The ladder extends the
original game rather than replacing it, so what long-time players already
know how to play is exactly what they still get on round 1, and every later
round builds on it. `levels.test.ts` pins those values exactly (not by
inequality) so a future tuning pass can't quietly drift the game out from
under itself.

The dials each round can turn, roughly in order of how hard they bite:

| Dial | Range across the ladder | What it changes |
| --- | --- | --- |
| `blockProbability` | 0.35 → 0.4 | How often the board spikes your near-complete lines. |
| `spawnCount` | 3 → 4 | Marbles per turn. The largest single jump in the ladder. |
| `colors` | 7 → 8 | An 8th color joins in round 3 (see below). |
| `previewCount` | 3 of 3 → 3 of 4 | How much of the coming spawn "Next up" reveals. |
| `colorAffinity` | 1 → 0.45 | How strongly spawns cluster into colors already on the board. |
| `startCount` | 5 → 9 | How cluttered the board is before the first move. |
| `spawnOnClear` | false → true (round 8 only) | Whether clearing a line still buys a free turn. |

Two rules hold the tuning together:

- **Exactly one dial goes up per round; at most one may come down to pay for
  it.** Two increases never land together, so each round keeps one legible
  identity ("the one where marbles come four at a time") and the player only
  ever has one new thing to adapt to. The round's `twist` line, under the
  title, is the player-facing version of this. `levels.test.ts` enforces
  both halves by diffing consecutive rounds — more than one increase fails,
  and so does more than one easing — so it's a structural property of the
  ladder rather than a convention someone has to remember.

  The easing allowance is currently unused — every round is strictly harder
  than the last on its one dial — and a third test pins that, so introducing
  an easing means updating a failing test rather than slipping it past
  review.

  **Blocking is the open question in this tuning.** It moves once, in round
  2, from 0.35 to 0.4, and then holds flat for the rest of the ladder. That
  is a very small step: roughly one extra blocked line per twenty turns, and
  quite possibly below the threshold at which anyone notices. It leads the
  ladder because blocking is the only dial a player can literally watch
  operate — a marble lands on the line they were building — so even a small
  change has somewhere to register. Whether it registers *at this size* is
  under playtest; rounds 1 and 2 are otherwise identical, which makes them a
  clean A/B for exactly that question. If the answer is no, the options are
  a bigger step (0.45–0.5, though 0.5 was tried and felt too harsh) or
  giving round 2 a different dial entirely.

  The one apparent exception is round 4, which raises `spawnCount` *and*
  `previewCount` together, 3-of-3 to 4-of-4. That's still one increase: what
  those two express jointly is the **share** of the spawn you can plan
  around, and 4-of-4 leaves that share at 100%. Round 5 then spends its one
  increase on cutting it to 3-of-4. The test compares the ratio for exactly
  this reason.
- **Save the rule change for last.** Everything through round 7 tunes
  numbers; only round 8 changes a *rule* (`spawnOnClear`). A player who has
  got that far has earned a surprise that isn't just "more marbles."

Four dials worth naming because they aren't obvious:

- **The 8th color** (round 3) is the only change here that needed new art
  rather than new numbers. The seven original colors already fill the neon
  hue circle, so an eighth cannot claim a clear hue of its own — it has to
  separate on **lightness** instead. `--c7` is a deep wine red, sitting far
  below the bright `--c0` red and `--c6` pink it shares a family with (2.3:1
  and 2.9:1) while holding 2.3:1 against the `.cell` background so it still
  reads as a marble rather than an empty cell.

  Two things are worth knowing before retuning it. First, the constraints
  are opposed: every step darker separates it further from red and pink and
  sinks it further into the near-black board, so all three ratios have to be
  checked, not just the one being fixed. Second, **judge it as alternating
  adjacent marbles, not as a lone swatch pair** — isolated swatches always
  read as more distinct than a board row does, which is exactly how an
  earlier, too-similar green passed review before being reported as
  indistinguishable in play.

  A note on why the ratios above look low: luminance contrast understates
  separation between colors that differ in *hue*. The existing red and pink
  measure only 1.24:1 against each other and are nevertheless unmistakable.
  The numbers here are meaningful because wine is deliberately competing on
  lightness within its own hue family; they are not a target other palette
  pairs should be held to.
- **Preview truncation** (`previewCount` < `spawnCount`) is the cheapest
  difficulty in the whole ladder. Nothing about the board changes; the
  player just stops being able to plan the last marble. It attacks the
  *skill* the game rewards rather than piling on more marbles.
- **Color affinity** turns down the bias in `weightedRandomColor` that makes
  spawns favour colors already on the table. That bias exists to *help* the
  player (clustered colors finish lines), so dialling it toward uniform in
  the last rounds makes the board quietly less cooperative without changing
  a single visible rule.
- **`spawnOnClear`** removes the largest advantage the player has: in
  classic rules a clearing move buys the turn back entirely, so a good
  player can hold the tide off indefinitely. Round 8 alone switches it off,
  which is why it's the last round and not an earlier one — applied any
  sooner it would dominate every dial after it.

Deliberately rejected: raising `LINE_MIN` from 5 to 6 (changes the game's
identity rather than its difficulty — every learned pattern stops applying),
and shrinking the board (the glide overlay positions itself from fixed pixel
constants, so board size is a layout change, not a tuning knob).

## Losing a round doesn't cost the run

Filling the board ends the round, not the run: the game-over dialog's
default action is **Retry round N**, with "Start over" as the secondary. A
ladder that sends you back to round 1 for one bad board punishes the exact
players who got far enough to see the hard rounds, and turns the late levels
— the ones most in need of play — into the ones nobody reaches twice.

The same restart is available *before* you lose, as **Restart round** in the
top bar, sitting ahead of "New game". A board can become obviously
unwinnable — jammed, or one bad spawn from it — well before it's actually
full, and without this the only options were to play the round out or throw
away the whole run. It keeps the run's banked score, since the rounds you
already cleared were still cleared.

Score resets each round, but a **run total** accumulates across rounds and
is shown on every round-cleared dialog, so a run still reads as one
continuous climb rather than eight unrelated games.

The round-cleared dialog also previews the *next* round by name and twist.
That panel is the only thing standing between "I won" and closing the tab,
so it's the one place in the UI that gets to advertise what's coming.

## The leaderboard ranks progress and efficiency, not points

The obvious metric — sum every Pretender point across the run — degenerates.
A round ends the *instant* the score crosses the King's 100, so a round is
worth `100 + overshoot`, and the overshoot is only ever however long the
final clear happened to be. Total points therefore reduces to "how many
rounds did you clear", plus noise: every player who finishes the ladder
lands somewhere around 800–880, ordered by whether their last clear was a
6-line instead of a 5-line. That's luck deciding the top of the board.

So ranking uses two keys (`src/game/score.ts`):

1. **`progressOf`** — a flat 100 per cleared round, plus whatever was banked
   in the round the run ended in. Overshoot is discarded, so every finisher
   lands on exactly `MAX_PROGRESS` and players who fell short still order
   smoothly by depth.
2. **`moves`, fewer first** — the tiebreak, which therefore decides the
   entire finisher tier. Moves rather than elapsed time: no clock pressure
   on a puzzle game, unaffected by animation timings, and deterministic.

Total points is still shown in the table, because it's the number players
actually feel — it just isn't what they're ranked on.

A retry keeps the run alive and keeps its move count. Retrying is free in
progress terms (so a jammed board never ends a run) but not in efficiency
terms, which is the right shape: available to everyone, not free at the top.

`sortKeyOf` packs both keys into one number, because a Redis sorted set has
exactly one float per member — the storage design that Phase 2 wants is
already the ranking design.

## Leaderboard storage: local first, Redis later

`src/leaderboard/store.ts` defines a `LeaderboardStore` interface with an
async `localStorage` implementation. Async from day one purely so swapping in
a Redis-backed version is a one-file change rather than a refactor of every
call site.

Phase 2 is a sorted set (`ZADD … GT` keyed on `sortKeyOf`, `ZREVRANGE` for
the top N, a hash per player for display fields) behind two serverless
routes. The genuinely hard part there is not storage but trust: a static SPA
can post any number it likes. Signing the payload client-side is not a fix —
the key ships in the bundle. The real answer, and the reason `engine.ts` is
kept pure and DOM-free, is server-side replay: seed the RNG, record the move
list, and re-run the same engine on the server to recompute the score. That
needs a seeded PRNG threaded through the four gameplay `Math.random()` calls
(three in `engine.ts`, one in `useGame.ts`), which is why it's deliberately
deferred until someone actually cheats.

## Progress isn't persisted (yet)

Reloading returns you to round 1 — there's no `localStorage` of the highest
round reached. This is a known gap, not a decision: it's the obvious next
step if the ladder proves worth finishing. `?round=N` in the URL exists as
a playtesting shortcut in the meantime, since tuning round 7 is otherwise
gated behind winning rounds 1–6 every time.

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
