# Learnings

Bugs and gotchas from building Marmor, kept around so we don't relearn them
the hard way a second time.

## The board rendered as a blank strip for one real-world visitor

**Symptom:** a friend testing the live site on "latest Chrome on a MacBook"
saw the board render with no visible grid at all — just the handful of
spawned marbles bunched in a line, with the rest of the 9×9 board a flat
blank rectangle — and the King's and Pretender's pedestals rendered at
nearly identical (short) heights, when the King's is meant to always be
tall. Clicking "New game" didn't fix it. Nobody else, on any browser we had
access to, could reproduce it, and there were no errors in the console.

**What we could confirm:** the deployed site itself was fine — every asset
request (HTML, JS, CSS, fonts, cursor, favicon) returned `200`, and the page
rendered correctly from multiple browsers/sessions on our end. So this
wasn't a bad deploy; it was something specific to that one visitor's
browser/environment that we never fully identified (a stale cache, an
extension rewriting the page, or some other local condition).

**The fix (defensive, not a confirmed root-cause fix):** `.board` and
`.cell` sized themselves from a single CSS custom property,
`var(--cell-size)`, with no fallback. If that property ever fails to
resolve for any reason, `repeat(9, var(--cell-size))` becomes invalid, the
grid definition collapses, and cells lose their explicit width/height —
which matches the symptom exactly. Every usage now has a literal pixel
fallback: `var(--cell-size, 54px)`. The friend confirmed this fixed it for
him. We still don't know *why* the property failed to resolve on his
machine in the first place — the fallback made the failure mode harmless
without requiring us to reproduce or fully explain the trigger.

**Lesson:** when a bug can't be reproduced locally but a plausible failure
mode is identifiable in the code (here: a single point of failure with no
graceful degradation), it's worth shipping a cheap, harmless defensive fix
even without confirmed root cause — rather than blocking on reproducing an
environment we don't have access to. Pair this with asking the affected
user for concrete diagnostics (exact browser version, console errors,
whether Incognito/hard-refresh changes anything, DevTools computed-style
values) so if the defensive fix *doesn't* fully resolve it, there's already
a paper trail instead of starting the investigation from zero.

## The marble-glide animation was slow — and it wasn't the code we suspected

**Symptom:** the marble animating between cells felt laggy — it seemed to
start slow and speed up toward the end of the move, even though the step
delay in code was a constant 12–28ms.

**What we tried first (and why it didn't fix it):**
1. Suspected the custom SVG cursor — disabled it entirely. Still slow.
2. Suspected `console.log` overhead from DevTools protocol forwarding —
   switched to silent logging into a `window.__glideLog` array read once at
   the end. Still slow.
3. Suspected the inline `style` object passed to the board (a new object
   reference every render) — memoized it with `useMemo`. Still slow.

**How we actually found it:** added `performance.now()` timestamps around
each step of the glide loop and looked at real numbers instead of guessing.
Steps were taking ~100–150ms (sometimes up to 338ms) instead of the intended
12–28ms, for most of the animation — only the last few steps hit the correct
timing. Then we ran a controlled A/B test: added a `window.__skipSetGlide`
flag that skipped only the `setGlide(...)` state update while leaving
everything else (including the `sleep()` delay) identical. With the state
update skipped, timing became accurate immediately.

**Root cause:** every glide step called `setGlide(...)`, a React state
update that re-rendered the entire 81-cell board. In this app, that
re-render cost roughly **~100ms**, vs ~0.2ms for the state update call
itself. Steps were effectively bottlenecked on React finishing the previous
render, not on the `sleep(stepDelay)` we'd tuned.

**Fix:** stopped using React state for the glide entirely. `Board` is a
`forwardRef` component exposing `showGlide`/`hideGlide` via
`useImperativeHandle`; these mutate a permanently-mounted overlay `<div>`'s
`style.transform`/`display` and the marble's `className` directly — zero
React re-renders per step. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for
the general pattern this established.

**Lesson:** when an animation "feels wrong" in a way that doesn't match the
code's own timing constants, measure the actual wall-clock time of each step
before touching anything else. Plausible-looking fixes (cursor, logging,
memoization) can all pass a "seems reasonable" sniff test and still be
wrong — an A/B toggle that isolates exactly one suspect at a time is what
actually finds the cause.

## `top`/`left` vs `transform` for the glide overlay's position

Once the glide was imperative, the first version positioned the overlay
with `style.top`/`style.left` in pixels. That works, but animating
`top`/`left` forces a layout reflow on every frame — the same category of
cost that made the React-driven version slow, just smaller in scale. Switched
to `transform: translate(x, y)`, which the browser can composite without
triggering layout. Also added `will-change: transform` as a hint.

**Lesson:** for anything animated at high frequency, prefer `transform`/
`opacity` over layout-triggering properties (`top`, `left`, `width`,
`height`, `margin`) — this is a general web-performance rule, not specific
to React.

## The reachable-cell blink desync

**Symptom:** select a marble → dots pulse on reachable cells in sync. Select
a different, more-blocked marble (smaller reachable set) → its dots pulse
out of sync with each other. Select the first marble again → still
desynced.

**Root cause:** the pulsing dot was a per-cell CSS `animation` with no
explicit start-time coordination. A cell that stayed reachable across two
different selections never had its `.reachable` class removed and re-added,
so its animation kept running on its original timeline. A cell that dropped
out of the reachable set and came back got a *fresh* animation start. Two
groups of cells ended up on different timelines, drifting apart.

**Fix attempts that didn't fully work:**
- A `setInterval`-driven shared `blinkOn` boolean, applied via inline style
  per cell. Fixed the sync, but the recurring timer's re-renders measurably
  slowed the (separately broken, at the time) marble glide down further.
- Gating that interval to only run while `reachable.size > 0` — better, but
  didn't address the real performance cost, and still a needless recurring
  timer.

**Actual fix:** replaced the timer entirely with a `useMemo` computed once
per new selection: `-(Date.now() % 1100)`, exposed as a single CSS custom
property (`--blink-delay`) set **once on the `.board` container**, not on
every cell. Every reachable cell's `::after` pseudo-element inherits it via
`animation-delay: var(--blink-delay, 0ms)`. No JS timer, no per-cell inline
styles, no re-renders after the initial selection.

**Lesson:** CSS custom properties inherit down the DOM tree. If many
sibling elements need to agree on one value (a start time, a phase, a
delay), set it once on a shared ancestor instead of duplicating it onto
every element — cheaper, and there's no per-element state to fall out of
sync in the first place.

## Doubled background gradient → visible seam lines

`html` and `body` both had the same radial-gradient background applied.
Because they're two different boxes (independently sized/positioned), the
"same" gradient rendered twice, slightly misaligned, producing faint seam
lines. Fixed by putting the gradient on `body` only and giving `html` a
flat fallback color.

**Lesson:** be suspicious of copy-pasting the same `background` value onto
nested elements "just to be safe" — if only one of them is actually visible
as the intended backdrop, the other copy is either wasted or actively
harmful.

## Layout reflow on window resize

A `@media (max-width: 720px)` breakpoint shrank `--cell-size` and switched
`.layout` to `flex-direction: column`, so resizing the window mid-game could
suddenly move the mascots and board. Since the game area was never meant to
be responsive (it's a fixed-size arcade cabinet, not a fluid layout), the
fix was to delete the breakpoint, give `.table` a fixed `width` (not
`max-width`), and let `body` scroll (`overflow: auto`) instead of reflowing
its contents.

**Lesson:** a responsive breakpoint is a deliberate design decision, not a
default to leave in place. If a layout isn't meant to adapt, don't give it
rules that adapt it.

## CSS `transform` function order

The King's "fall off the pedestal" animation had him flying sideways
instead of down. The transform was
`rotate(deg) translateY(px)`. CSS transform functions compose **right to
left** — the translate was applied first (in the rotated coordinate space),
so a "down" vector got rotated into mostly "sideways" once the angle
approached 90°. Reordering to `translateX() translateY() rotate()` fixed it
by applying the fall offset in unrotated screen space, with rotation added
on top purely as a visual spin.

**Lesson:** when composing multiple CSS transforms, read the list
right-to-left to know what's actually happening to a "down" or "right"
vector — order changes the result, it isn't just cosmetic.
