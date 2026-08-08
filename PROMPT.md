# MARMOR — Build Prompt

> Paste this whole file as the initial prompt to your agent.

---

I want you to build **MARMOR** — a marble-lines puzzle game (the genre made
famous by the 1992 DOS game *Color Lines* / *Lines*) at the visual and polish
level of a modern premium mobile/web puzzle title (think *Two Dots*,
*Sugar, Sugar*, *Blackbox* production values — tactile, glossy, satisfying —
not a browser toy). It should be utterly perfect: every single thing done at
that quality bar — marble shading, board feel, motion, audio, UI.

Fan out sub-agents and have each sub-agent tackle one system individually so
the game is utterly perfect. `/loop` on each item and have a **separate,
harsh critic sub-agent** verify it visually and functionally. That critic
must be genuinely brutal — if it doesn't hit the bar, it kicks the work back
and the loop continues. Don't stop until every critic sub-agent is wowed.

**Reference comparison protocol:** the critic must place a screenshot of our
build side by side with a reference screenshot (*Two Dots*, *Lines 98*,
*Blackbox*, and the original DOS *Color Lines*) **blind, unlabeled**, and
state which looks better. Loop until ours wins on at least 8 of 10 blind
comparisons.

`/loop` until it's utterly perfect. Fan out sub-agents and ultracode.

---

## 1. Legal constraints — non-negotiable

The core mechanic (roll balls onto a grid, line up 5+ to clear, unmatched
rolls spawn more) is an unprotectable game rule set that has been reimplemented
under dozens of names for decades (`Lines 98`, GNOME `Five or More`, KDE
`klines`, etc.) — the mechanic itself is fine to reuse. What's **forbidden**:

- The name "Color Lines" or "Lines" as our product name
- Reproductions of any specific existing clone's art, palette, font, or UI layout
- Any third-party audio, sprite, or tileset asset

Our identity is **MARMOR** — a warm, dim tabletop aesthetic: glossy
CSS/shader marbles with painted highlights on a brass-edged wooden board,
under low lamp light. Original art only. Original audio only.

## 2. Core gameplay — identical genre loop

A 9×9 board starts with 5 marbles in random cells and random colors (7-color
palette). The player selects a marble and clicks an empty cell to move it —
movement requires an unobstructed orthogonal path (no jumping). If the move
completes a line of 5+ same-colored marbles (horizontal, vertical, or either
diagonal), the line pops, the player scores, and **no new marbles spawn**
that turn. Otherwise, 3 new marbles (previewed one turn ahead) drop onto
random empty cells; any that land already completing a line pop immediately
too. The game ends when the board fills with no room to spawn.

**Stretch mechanics for a v2 pass (not required for v1 done):**

- Power-ups: a rare "wildcard" marble that matches any color, earned every N points.
- An undo-last-move token, limited per game.
- A "zen" mode with no game-over, just a running high score.

## 3. Technical architecture — get this right first

**This is the load-bearing decision. A sub-agent must implement and validate
it before any other work starts.**

- **Board state is a plain 9×9 array**, the single source of truth. All
  pathing, line detection, and spawning resolve against it — never infer
  state from the DOM.
- **Pathfinding is BFS** over empty cells, 4-directional, and must return the
  actual path (not just reachability) so the move can be animated as a glide.
- **Line detection** scans all 4 directions (—, |, ╲, ╱) from any newly
  placed or newly moved cell, unions the matched runs, and requires length
  ≥ 5.
- **Rendering** can stay DOM/CSS for v1 (glossy marbles via radial-gradient +
  layered box-shadow, no images) — but structure the code so the board-state
  layer has zero DOM dependencies, making a canvas/WebGL renderer a drop-in
  swap later.
- Audio: soft wooden click on placement, a satisfying multi-voiced chime on
  clear (pitch scales with line length), ambient low hum bed, all toggleable.

**Hard perf budget:** interactions must feel instant — under 50 ms from
click to path animation start — and the board must never visibly jank on
a 9×9 grid, which is a trivial budget; treat any dropped frame as a bug.

## 4. Sub-agent fan-out

Spawn these in parallel. Each owns its domain end to end and reports to the
critic loop.

| Agent          | Domain                                                          |
| -------------- | ---------------------------------------------------------------- |
| `sim-core`     | Board state, BFS pathing, line detection, spawn queue            |
| `render`       | Marble rendering, board layout, glide/pop animation               |
| `art`          | Marble materials, board/table texture, palette, next-up preview   |
| `audio`        | Placement/clear/game-over SFX, ambient bed                        |
| `ui`           | Score panel, next-up preview, game-over card, new-game flow, a11y |
| `critic`       | Adversarial review — see below                                    |

## 5. Critic loop — the bar

The critic sub-agent rejects work unless **all** of these hold:

**Visual**

- Marbles read as glossy 3D spheres, not flat circles — a clear highlight and
  a shaded underside on every color.
- Clearing a line is genuinely satisfying to watch: a pop, not an instant
  disappearance.
- Blind side-by-side reference comparison: ours wins ≥ 8 of 10.

**Functional — automated, not vibes**

- Unit tests for line detection: every orientation (—, |, ╲, ╱), off-by-one
  lengths (4 must not clear, 5 must), and lines formed by a spawn landing
  next to existing marbles.
- Unit tests for pathfinding: reachable vs. blocked cases, and that the
  returned path is actually walkable (no diagonal steps, no passing through
  occupied cells).
- Fuzz test: 10,000 random legal moves produce zero crashes and the board
  never ends up with an impossible/negative marble count.
- Game-over test: filling the board (mocked) correctly triggers game over
  exactly once, not on every subsequent click.

**Feel**

- Input-to-response under 50 ms.
- Every move and every clear has distinct audio and visual confirmation.
- Illegal moves (blocked path, clicking a second occupied cell) never throw —
  they just do nothing or reselect, silently and instantly.

If any criterion fails, the critic returns the work with specifics and the
loop continues. No partial credit.

## 6. Definition of done

Single self-contained static build (no backend). Board fully playable start
to game-over. Score + best-score persisted locally. All UI text in English.
Zero third-party assets. Zero references to any specific existing clone's
name or art. Every critic sub-agent signed off.

`/loop` until then. Ultracode.
