# Architecture

## Layers

- **`src/game/engine.ts`** — pure, DOM-free game logic: board creation, BFS
  pathfinding (`findPath`, `reachableFrom`), line detection in all 4
  directions (`findLinesThrough`), scoring (`scoreForClear`), and spawn
  placement including the "sometimes block the player's near-complete line"
  logic (`assignSpawnCells`). Fully unit- and fuzz-tested in
  `src/game/engine.test.ts`. Nothing in this file touches React or the DOM.
- **`src/game/score.ts`** — leaderboard ranking, pure and React-free:
  `progressOf` (overshoot-stripped depth), `sortKeyOf` (both ranking keys
  packed into the single float a Redis sorted set stores), and the
  comparator. Tested in `score.test.ts`. See
  [`DESIGN.md`](./DESIGN.md#the-leaderboard-ranks-progress-and-efficiency-not-points)
  for why points are displayed but not ranked on.
- **`src/leaderboard/store.ts`** — the `LeaderboardStore` interface plus a
  `localStorage` implementation. Async by design so a Redis-backed store
  drops in without touching callers; every read treats storage as hostile
  (disabled, full, or holding junk) and degrades to an empty board.
- **`src/game/levels.ts`** — the 8-round difficulty ladder, as plain data.
  Every knob the board can turn against the player (`colors`, `spawnCount`,
  `previewCount`, `blockProbability`, `colorAffinity`, `startCount`,
  `spawnOnClear`) is a field on `LevelConfig`, so tuning a round never means
  editing engine or hook code. The King's target is deliberately *not* here
  — it's `KING_SCORE`, a flat 100 for every round. Round 1 reproduces the
  pre-levels game exactly and is pinned by test. `levels.test.ts` guards the
  invariants that hand-editing this table can break — a level asking for a
  color the CSS can't paint, a preview promising more marbles than actually
  spawn, and above all the rule that **each round changes exactly one
  difficulty dimension** relative to the round before it, always upward. See
  [`DESIGN.md`](./DESIGN.md#the-round-ladder) for why each dial ramps the
  way it does.
- **`src/hooks/useGame.ts`** — the state layer wrapping the engine: board
  state, current selection, score, next-up queue, round progression
  (`advanceLevel`/`retryLevel`/`newGame`), win/lose flags, and animation
  sequencing (`animateMove`, `clearCells`, `spawnBalls`). This is the only
  place game rules and React state meet. The active level is held in a
  `levelRef` as well as in state, because the async spawn/move sequences
  read it mid-flight and a stale closure would silently apply the previous
  round's difficulty for one more turn.
- **`src/components/`** — presentational React components (`Board`, `Cell`,
  `Marble`, `TopBar`, `DuelMascot`, `Pedestal`, `LevelBanner`,
  `GameOverOverlay`, `LevelClearedOverlay`, `WinOverlay`, `MarmorTitle`).
  `src/components/ui/` and
  `src/components/ui/8bit/` hold shadcn/8bitcn primitives (Button, Card,
  Dialog, Switch, Badge, Progress) used for the game chrome.
- **`src/audio/sound.ts`** — every sound effect is synthesized in real time
  with the Web Audio API (oscillators + noise bursts shaped with gain
  envelopes). No audio files to ship or license.
- **`src/game/sprites/`** — pixel-art character sprites (`king.ts`,
  `pretender.ts`) built from a `row(width, base, fills)` helper
  (`pixelRow.ts`) that guarantees each row is the declared width by
  construction, rendered via `src/components/PixelArt.tsx`. The same
  row-building idea was reused by hand to produce `src/cursor-arrow.svg` and
  `src/favicon.svg` (crisp-edge pixel-grid SVGs).
- **`src/style.css`** — the whole visual theme in one file: dark arcade
  backdrop, pixel-art-coherent marbles and chrome, screen shake, pop/spawn/
  glide animations, the reachable-dot blink.

## The King vs. Pretender framing

The game wraps classic Color Lines rules in a duel: a **King** mascot (whose
score is a flat `KING_SCORE` of 100 in every round) faces a **Pretender** mascot
(the player, whose score is the live game score). Reaching or beating the
King's score is a new win condition, on top of the original lose condition
(board fills up with no empty cells left). Clearing a round topples the King
off his pedestal (`playKingFall` in `sound.ts`, `--falling` animation in
`style.css`); losing topples the Pretender instead (`playPretenderBoo`).

Which dialog that opens depends on where you are in the ladder — `useGame`
exposes a single `cleared` flag plus `isFinal`, and `App` picks:

- `cleared && !isFinal` → `LevelClearedOverlay`, which previews the next
  round and advances via `advanceLevel`.
- `cleared && isFinal` → `WinOverlay`, the run's actual victory. Only this
  one plays the `playWin` fanfare, so the eighth King's fall still lands as
  an event rather than as the eighth identical jingle.
- `gameOver` → `GameOverOverlay`, whose default action is `retryLevel`
  (same round again), not `newGame`.

All three pick a random quip from a small pool on every appearance so
replaying doesn't show the same line twice in a row.

## The dev panel

`src/components/DevPanel.tsx` is a testing-only round switcher (jump to any
round, force a win, force a loss). `isDevMode()` gates it to `localhost` /
`127.0.0.1` or an explicit `?dev` — off localhost it isn't hidden with CSS,
it's never rendered, so it can't leak into a deployed build.

Its two forcing actions (`devWinRound`, `devFillBoard` in `useGame`) run the
*real* transitions rather than setting the end state directly: `devWinRound`
awards the missing points and calls `checkRoundCleared` (the same function
`clearCells` uses), and `devFillBoard` packs the board leaving one cell and
spawns into it, hitting the genuine "no empty cells" path in `spawnBalls`.
A helper that set `cleared`/`gameOver` directly would test the dialog but
not the thing that opens it — which is the part worth testing.

`devFillBoard`'s filler color is `(r * 3 + c) % colorCount`. That steps by
1, 3, 2 and 4 along the four line directions, none of which is ≡ 0 for a
palette of 7 or 8, so no two adjacent cells ever share a color and the fill
can't accidentally complete a line on its way to packing the board.

## Dialog styling: use the dialog's own color tokens

Anything rendered inside a `DialogContent` must take its colors from
`--foreground` / `--muted-foreground` (the tokens `DialogDescription` itself
uses), **not** from the game's `--text` / `--muted`. Dialog surfaces are
light while the board is dark, so game-side variables produce near-white
text on a white panel — and Tailwind's theme additionally redefines `--muted`
on `:root`, so `var(--muted)` inside a dialog silently resolves to
Tailwind's near-white value rather than the game's slate blue.

The same trap catches the 8bit `Button`'s `outline` variant, which sets a
background but no text color — inside a dialog it inherits body's near-white
`--text` and renders white-on-white. Secondary dialog buttons therefore need
`className="dialog-button--secondary"` (see `GameOverOverlay`), which pins
them to `--foreground`. Both bugs shipped briefly and were caught by reading
computed styles, not by looking at a screenshot: the pixel font's dark
outline decoration makes invisible text still look vaguely present.

## Why the glide overlay bypasses React

`Board` is a `forwardRef<BoardHandle, BoardProps>` component. Besides its
normal props-driven grid of `Cell`s, it renders one extra, always-mounted
(initially hidden) `.glide-overlay` div and exposes two imperative methods
via `useImperativeHandle`:

```ts
interface BoardHandle {
  showGlide: (r: number, c: number, color: ColorIndex, opts?: { instant?: boolean; stepMs?: number }) => void;
  hideGlide: () => void;
}
```

`useGame`'s `animateMove` calls these directly through a
`RefObject<BoardHandle>` passed in from `App.tsx`, instead of holding glide
position in React state. Each call mutates the overlay's `style.transform`
and the inner marble's `className` — no `setState`, no re-render, for every
step of a marble's path across the board.

**This is deliberate, not incidental.** An earlier version drove the glide
via `useState` + prop drilling, and each step's re-render of the 81-cell
grid cost ~100ms in practice — see
[`LEARNINGS.md`](./LEARNINGS.md#the-marble-glide-animation-was-slow--and-it-wasnt-the-code-we-suspected)
for how that was diagnosed. `Cell` doesn't know about gliding at all
anymore; the moving marble is entirely the overlay's concern.

**When to reach for this pattern again:** only for something that updates
many times per second and where the visual is otherwise disconnected from
the rest of the render tree (an overlay, a cursor trail, a drag preview).
It trades away React's declarative update model for raw DOM writes, so it
should stay the exception, not the default — everything else in this
codebase (score, board, selection, dialogs) is plain React state on
purpose, because correctness and readability matter more there than shaving
milliseconds off an update that happens once per click.

## Constants that must stay in sync with CSS

`COLORS` in `src/game/constants.ts` is the *palette ceiling* — it must equal
the number of `.cN` rules in `style.css` (currently 8, `.c0`–`.c7`). It is
not the game's color count: that's `colors` on the active `LevelConfig`,
which is 7 for round 1 and 8 from round 2 on. Raising `COLORS` without
adding the matching `--cN` and `.cN` in CSS renders invisible marbles rather
than failing loudly, which is why `levels.test.ts` bounds every level's
`colors` by `COLORS`.


`src/game/constants.ts` defines `CELL_SIZE_PX`, `CELL_GAP_PX`, and
`BOARD_PADDING_PX`, which must match the `--cell-size`, `gap`, and `padding`
values on `.board` in `style.css`. They're used to compute the glide
overlay's `translate()` offset in plain arithmetic rather than reading
layout back from the DOM with `getBoundingClientRect()` (which would force a
synchronous reflow on every single glide step — exactly the kind of cost
this whole overlay exists to avoid). If the board's visual sizing ever
changes in CSS, these constants need a matching update.
