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
  spawn** that turn (the final round takes that away).
- Otherwise, new marbles (shown in the "Next up" preview) drop onto random
  empty cells. If any of those happen to complete a line on landing, it pops
  immediately too.
- The round ends when the board fills up with no space left to spawn.

## Rounds

The game is a ladder of 8 rounds. **The King defends 100 points in every
round** — rounds get harder by making 100 harder to earn, never by moving
the finish line. Reaching it advances you to the next round; filling the
board loses the round, and you can retry it (or restart it mid-round from
the menu) without giving up the run.

**Round 1 is the classic game, unchanged** — seven colors, three marbles a
turn. Each later round is the round before it **plus exactly one difficulty
increase, and nothing else**:

| Round | Adds |
| --- | --- |
| 1 · The Duel | *the classic game* |
| 2 · Court Intrigue | the spawner spikes your near-complete lines more often |
| 3 · A Suspect Too Many | an 8th marble color |
| 4 · The Flood | 4 marbles a turn instead of 3 |
| 5 · Blind Spot | "Next up" shows only 3 of the 4 |
| 6 · Sworn Enemies | marbles stop clustering into colors you already have |
| 7 · Standing Room Only | the board starts crowded |
| 8 · The Coronation | clearing a line no longer buys a free turn |

The whole ladder is data in [`src/game/levels.ts`](./src/game/levels.ts);
tuning it means editing that file, not the engine. `levels.test.ts` enforces
the one-dial-per-round rule structurally, so a step that stacks two
increases fails the build rather than quietly shipping.

### Testing the ladder

A dev panel (bottom-left) appears automatically on `localhost`, or anywhere
with `?dev` in the URL. It never renders for players — it's not in the React
tree at all off localhost.

| Control | Shortcut | What it does |
| --- | --- | --- |
| Round 1–8 | `1`–`8`, or `[` / `]` | Restart on any round; the URL's `?round=` follows along, so reloads stay put |
| Win round | `w` | Awards exactly enough to hit the target and fires the real round-cleared transition |
| Fill board | `f` | Packs the board and spawns into the last cell — the genuine loss path |
| Hide panel | `` ` `` | Collapses to a small `dev` tab |

`Win round` and `Fill board` exist because both end states are slow to reach
on purpose, which otherwise makes the transitions around them (the
round-cleared dialog, the retry flow) the least-tested part of the game.
Neither fakes its end state — they drive the same functions real play does.

Keyboard shortcuts need the page focused, so click the page once after a
reload; the buttons always work.

## Architecture

- `src/game/engine.ts` — pure, DOM-free game logic: BFS pathfinding, line
  detection (all 4 directions), scoring. Fully unit- and fuzz-tested in
  `src/game/engine.test.ts`.
- `src/game/levels.ts` — the 8-round difficulty ladder as plain data, with
  its own guardrail tests in `src/game/levels.test.ts`.
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
