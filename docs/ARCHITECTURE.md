# Architecture

## Layers

- **`src/game/engine.ts`** — pure, DOM-free game logic: board creation, BFS
  pathfinding (`findPath`, `reachableFrom`), line detection in all 4
  directions (`findLinesThrough`), scoring (`scoreForClear`), and spawn
  placement including the "sometimes block the player's near-complete line"
  logic (`assignSpawnCells`). Fully unit- and fuzz-tested in
  `src/game/engine.test.ts`. Nothing in this file touches React or the DOM.
- **`src/hooks/useGame.ts`** — the state layer wrapping the engine: board
  state, current selection, score, next-up queue, win/lose flags, and
  animation sequencing (`animateMove`, `clearCells`, `spawnBalls`). This is
  the only place game rules and React state meet.
- **`src/components/`** — presentational React components (`Board`, `Cell`,
  `Marble`, `TopBar`, `DuelMascot`, `Pedestal`, `GameOverOverlay`,
  `WinOverlay`, `MarmorTitle`). `src/components/ui/` and
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

The game wraps classic Color Lines rules in a duel: a **King** mascot (fixed
score, `KING_SCORE` in `src/game/constants.ts`) faces a **Pretender** mascot
(the player, whose score is the live game score). Reaching or beating the
King's score is a new win condition, on top of the original lose condition
(board fills up with no empty cells left). Winning topples the King off his
pedestal (`playKingFall` + `playWin` in `sound.ts`, `--falling` animation in
`style.css`); losing topples the Pretender instead (`playPretenderBoo`).
`WinOverlay` and `GameOverOverlay` each pick a random quip from a small pool
on every appearance so replaying doesn't show the same line twice in a row.

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

`src/game/constants.ts` defines `CELL_SIZE_PX`, `CELL_GAP_PX`, and
`BOARD_PADDING_PX`, which must match the `--cell-size`, `gap`, and `padding`
values on `.board` in `style.css`. They're used to compute the glide
overlay's `translate()` offset in plain arithmetic rather than reading
layout back from the DOM with `getBoundingClientRect()` (which would force a
synchronous reflow on every single glide step — exactly the kind of cost
this whole overlay exists to avoid). If the board's visual sizing ever
changes in CSS, these constants need a matching update.
