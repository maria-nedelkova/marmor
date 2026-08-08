# Marmor

A browser puzzle game in the spirit of the old DOS **Color Lines** — line up
five or more same-colored marbles on a 9×9 board to clear them before the
table fills up. Vibrant, high-energy arcade look: glossy neon-glow marbles,
screen shake and particle-burst clears, synthesized arcade SFX.

## Stack

React 19, TypeScript, [Bun](https://bun.sh) as runtime, dev server, bundler,
and test runner — no Vite/webpack, no separate audio/image assets (all SFX
are synthesized in real time with the Web Audio API).

## Develop

```
bun install
bun run dev
```

Opens a hot-reloading dev server (Bun bundles the TSX/CSS referenced from
`index.html` on the fly — no build config needed).

Other scripts:

```
bun run build      # production build to dist/
bun run typecheck  # tsc --noEmit
bun run test       # unit + fuzz tests for the game engine (bun test)
```

## Rules

- Click a marble, then click an empty cell to move it there. Marbles walk
  along open paths — they can't jump over other marbles.
- If your move lines up 5+ marbles of the same color (horizontal, vertical,
  or either diagonal), that line pops and you score, and **no new marbles
  spawn** that turn.
- Otherwise, 3 new marbles (shown in the "Next up" preview) drop onto random
  empty cells. If any of those happen to complete a line on landing, it pops
  immediately too.
- The game ends when the board fills up with no space left to spawn.

## Architecture

- `src/game/engine.ts` — pure, DOM-free game logic: BFS pathfinding, line
  detection (all 4 directions), scoring. Fully unit- and fuzz-tested in
  `src/game/engine.test.ts`.
- `src/game/persistence.ts` — best-score storage (`localStorage`, fails soft).
- `src/hooks/useGame.ts` — React state layer wrapping the engine: board
  state, selection, animation sequencing (glide/pop), spawn queue.
- `src/components/` — presentational React components (Board, Cell, Marble,
  ScorePanel, GameOverOverlay).
- `src/audio/sound.ts` — procedurally synthesized SFX (oscillators + noise
  bursts shaped with envelopes), no audio files.
- `src/style.css` — the visual theme: dark arcade backdrop, saturated neon
  marbles with bloom-style glow, screen shake and burst-ring pop on clears.

## Docs

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — code layers, and why
  the marble-glide animation is driven by an imperative ref instead of
  React state.
- [`docs/DESIGN.md`](./docs/DESIGN.md) — game design decisions and the
  reasoning behind them (the King vs. Pretender framing, spawn-blocking
  difficulty, visual/audio style).
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — deploying to Vercel,
  including custom domains.
- [`docs/LEARNINGS.md`](./docs/LEARNINGS.md) — bugs we hit and how we
  actually found the root cause, so we don't relearn them.

## Reusing the prompt

The original build prompt is preserved in [PROMPT.md](./PROMPT.md); the
original vanilla-JS implementation (pre-React) is kept in
[legacy-vanilla/](./legacy-vanilla) for reference.

## License

MIT.
