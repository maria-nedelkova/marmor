import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  playClear,
  playGlideTick,
  playKingFall,
  playPlace,
  playPretenderBoo,
  playSelect,
  playWin,
  primeAudio,
} from "../audio/sound";
import type { BoardHandle } from "../components/Board";
import {
  assignSpawnCells,
  cloneBoard,
  createEmptyBoard,
  emptyCells,
  findLinesThrough,
  findPath,
  randomColors,
  reachableFrom,
  scoreForClear,
  weightedRandomColor,
  weightedRandomColors,
} from "../game/engine";
import { KING_SCORE } from "../game/constants";
import { getLevel, isFinalLevel, LEVEL_COUNT } from "../game/levels";
import type { LevelConfig } from "../game/levels";
import { rng } from "../game/rng";
import type { Board, Cell, ColorIndex } from "../game/types";

const cellKey = (r: number, c: number) => `${r},${c}`;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** `?round=6` opens straight on that round. A playtesting shortcut: tuning
 * the late levels is otherwise gated behind winning every earlier one, which
 * makes the hardest rounds — the ones most likely to need tuning — the least
 * likely to actually get played. Out-of-range values fall back to round 1. */
function initialLevelIndex(): number {
  if (typeof window === "undefined") return 0;
  const round = Number(new URLSearchParams(window.location.search).get("round"));
  if (!Number.isFinite(round) || round < 1) return 0;
  return Math.min(Math.floor(round), LEVEL_COUNT) - 1;
}

export function useGame(boardHandleRef: RefObject<BoardHandle | null>) {
  // The level is held in a ref as well as state because the async spawn/move
  // sequences below read it mid-flight, and a stale closure would silently
  // apply the previous round's difficulty for one more turn.
  const levelIndexRef = useRef(initialLevelIndex());
  const levelRef = useRef<LevelConfig>(getLevel(levelIndexRef.current));
  const [levelIndex, setLevelIndex] = useState(levelIndexRef.current);
  const [level, setLevel] = useState<LevelConfig>(levelRef.current);

  const boardRef = useRef<Board>(createEmptyBoard());
  const scoreRef = useRef(0);
  const nextQueueRef = useRef<ColorIndex[]>(randomColors(levelRef.current.previewCount, levelRef.current.colors));

  const [board, setBoard] = useState<Board>(() => cloneBoard(boardRef.current));
  const [selected, setSelected] = useState<Cell | null>(null);
  const [score, setScore] = useState(0);
  // Score banked from levels already cleared — the score itself resets each
  // round (every King has his own target), so this is what makes a run feel
  // cumulative rather than like eight unrelated games.
  const [bankedScore, setBankedScore] = useState(0);
  const bankedScoreRef = useRef(0);
  // Run-wide tallies for the leaderboard. Both survive a round change and a
  // retry — a retry keeps the run alive, so its cost stays on the bill. That
  // is deliberate: retrying is free in progress terms but not in moves, so
  // it never blocks a stuck player yet still shows up in the skill ranking.
  const movesRef = useRef(0);
  const [moves, setMoves] = useState(0);
  const roundsClearedRef = useRef(0);
  const [roundsCleared, setRoundsCleared] = useState(0);
  /** Bumped whenever a fresh run starts, so UI keyed on the run (the
   * leaderboard prompt) remounts instead of inheriting the last run's state. */
  const [runId, setRunId] = useState(0);
  const [nextQueue, setNextQueue] = useState<ColorIndex[]>(() => nextQueueRef.current);
  const [gameOver, setGameOver] = useState(false);
  const [cleared, setCleared] = useState(false);
  const clearedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [poppingKeys, setPoppingKeys] = useState<Set<string>>(new Set());
  const [spawningKeys, setSpawningKeys] = useState<Set<string>>(new Set());
  const [shakeToken, setShakeToken] = useState(0);

  const sync = useCallback(() => setBoard(cloneBoard(boardRef.current)), []);

  const addScore = useCallback((points: number) => {
    const next = scoreRef.current + points;
    scoreRef.current = next;
    setScore(next);
  }, []);

  /** Fires the round-cleared transition if the score has reached this
   * round's target. Idempotent, and the single place that transition
   * happens — the dev panel's "win round" drives this same function rather
   * than a shortcut of its own, so what it tests is the real path. */
  const checkRoundCleared = useCallback(() => {
    if (clearedRef.current || scoreRef.current < KING_SCORE) return;
    clearedRef.current = true;
    setCleared(true);
    roundsClearedRef.current += 1;
    setRoundsCleared(roundsClearedRef.current);
    playKingFall();
    // The full fanfare is saved for the last King — every earlier round
    // gets the topple sound only, so the final one still lands as an
    // event rather than as the eighth identical victory jingle.
    if (isFinalLevel(levelIndexRef.current)) setTimeout(playWin, 1050);
  }, []);

  const clearCells = useCallback(
    async (cells: Cell[]) => {
      const keys = cells.map((cell) => cellKey(cell.r, cell.c));
      setPoppingKeys((prev) => new Set([...prev, ...keys]));
      addScore(scoreForClear(cells.length));
      playClear(cells.length);
      setShakeToken((t) => t + 1);
      checkRoundCleared();

      await sleep(260);

      for (const { r, c } of cells) boardRef.current[r]![c] = null;
      sync();
      setPoppingKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      });
    },
    [addScore, checkRoundCleared, sync],
  );

  const spawnBalls = useCallback(
    async (count: number, isInitial = false) => {
      const { colors: colorCount, colorAffinity, previewCount, blockProbability, blockMinRunLength } = levelRef.current;
      const free = emptyCells(boardRef.current);
      const toPlace = Math.min(count, free.length);
      // Only the first `previewCount` colors were announced in "Next up";
      // anything past that is rolled fresh here, so later levels can spawn
      // more marbles than they show (see `previewCount` in levels.ts).
      const colors = isInitial
        ? weightedRandomColors(boardRef.current, toPlace, colorCount, colorAffinity)
        : Array.from(
            { length: toPlace },
            (_, i) => nextQueueRef.current[i] ?? weightedRandomColor(boardRef.current, colorCount, colorAffinity),
          );
      // Cells aren't picked uniformly at random — each turn has a flat,
      // per-level chance of the board looking for the player's near-complete
      // lines and dropping a mismatched color right on top of one, instead
      // of anywhere empty. Rolled through `rng`, not Math.random, for the
      // reason given in game/rng.ts.
      const canBlock = !isInitial && rng.random() < blockProbability;
      const { cells: placedCells } = assignSpawnCells(boardRef.current, colors, {
        minBlockLength: blockMinRunLength,
        enableBlocking: canBlock,
        colorCount,
      });

      placedCells.forEach((cell, i) => {
        boardRef.current[cell.r]![cell.c] = colors[i]!;
      });
      sync();
      if (placedCells.length > 0) {
        playPlace();
        const spawnKeys = placedCells.map((cell) => cellKey(cell.r, cell.c));
        setSpawningKeys((prev) => new Set([...prev, ...spawnKeys]));
        setTimeout(() => {
          setSpawningKeys((prev) => {
            const next = new Set(prev);
            spawnKeys.forEach((k) => next.delete(k));
            return next;
          });
        }, 340);
      }

      if (!isInitial) {
        const freshQueue = weightedRandomColors(boardRef.current, previewCount, colorCount, colorAffinity);
        nextQueueRef.current = freshQueue;
        setNextQueue(freshQueue);
      }

      const matched = new Map<string, Cell>();
      for (const cell of placedCells) {
        findLinesThrough(boardRef.current, cell).forEach((c) => matched.set(cellKey(c.r, c.c), c));
      }
      if (matched.size > 0) {
        await clearCells([...matched.values()]);
      }

      if (clearedRef.current) return;

      if (emptyCells(boardRef.current).length === 0) {
        setGameOver(true);
        playPretenderBoo();
      }
    },
    [clearCells, sync],
  );

  const animateMove = useCallback(
    async (path: Cell[]) => {
      setBusy(true);
      const from = path[0]!;
      const to = path[path.length - 1]!;
      const color = boardRef.current[from.r]![from.c] as ColorIndex;

      boardRef.current[from.r]![from.c] = null;
      sync();

      const stepDelay = path.length > 12 ? 12 : 28;
      // Placed instantly at the origin (no transition) so the marble picks
      // up exactly where the board marble just vanished, then every later
      // step animates — giving one continuous slide instead of the first
      // step visibly popping in.
      boardHandleRef.current?.showGlide(from.r, from.c, color, { instant: true, stepMs: stepDelay });
      for (let i = 1; i < path.length; i++) {
        const step = path[i]!;
        boardHandleRef.current?.showGlide(step.r, step.c, color);
        playGlideTick();
        await sleep(stepDelay);
      }
      boardHandleRef.current?.hideGlide();

      boardRef.current[to.r]![to.c] = color;
      sync();
      playPlace();
      // Counted on completion, not on click: a click that finds no path
      // never reaches here, so an unroutable tap costs nothing.
      movesRef.current += 1;
      setMoves(movesRef.current);

      const matches = findLinesThrough(boardRef.current, to);
      if (matches.length > 0) {
        await clearCells(matches);
        setBusy(false);
        // Classic rules: clearing a line buys the turn back — nothing
        // spawns. The last round switches that off (`spawnOnClear`), which
        // is the single biggest advantage the player ever loses.
        if (!levelRef.current.spawnOnClear || clearedRef.current) return;
        await spawnBalls(levelRef.current.spawnCount);
        return;
      }

      setBusy(false);
      if (clearedRef.current) return;
      await spawnBalls(levelRef.current.spawnCount);
    },
    [clearCells, spawnBalls, sync],
  );

  /** Resets the board and starts `index` from scratch. `mode` decides what
   * happens to the run total: advancing banks the round you just cleared,
   * retrying keeps whatever earlier rounds already earned (a lost round
   * shouldn't erase rounds you genuinely won), and restarting zeroes it. */
  const startLevel = useCallback(
    (index: number, mode: "advance" | "retry" | "restart") => {
      const nextLevel = getLevel(index);
      levelIndexRef.current = Math.min(Math.max(index, 0), LEVEL_COUNT - 1);
      levelRef.current = nextLevel;
      setLevelIndex(levelIndexRef.current);
      setLevel(nextLevel);

      const banked =
        mode === "advance" ? bankedScoreRef.current + scoreRef.current : mode === "retry" ? bankedScoreRef.current : 0;
      bankedScoreRef.current = banked;
      setBankedScore(banked);

      // "restart" is the only mode that begins a new run, so it's the only
      // one that clears the run-wide tallies. Advancing and retrying both
      // continue the same run and carry them forward.
      if (mode === "restart") {
        movesRef.current = 0;
        setMoves(0);
        roundsClearedRef.current = 0;
        setRoundsCleared(0);
        setRunId((n) => n + 1);
      }

      boardRef.current = createEmptyBoard();
      scoreRef.current = 0;
      nextQueueRef.current = randomColors(nextLevel.previewCount, nextLevel.colors);
      setBoard(cloneBoard(boardRef.current));
      setSelected(null);
      setScore(0);
      setNextQueue(nextQueueRef.current);
      setGameOver(false);
      clearedRef.current = false;
      setCleared(false);
      setBusy(false);
      boardHandleRef.current?.hideGlide();
      setPoppingKeys(new Set());
      setSpawningKeys(new Set());
      void spawnBalls(nextLevel.startCount, true);
    },
    [spawnBalls],
  );

  const advanceLevel = useCallback(() => startLevel(levelIndexRef.current + 1, "advance"), [startLevel]);
  const retryLevel = useCallback(() => startLevel(levelIndexRef.current, "retry"), [startLevel]);
  const newGame = useCallback(() => startLevel(0, "restart"), [startLevel]);

  // --- Test-only helpers (driven by DevPanel, which only renders on
  // localhost or with ?dev — see isDevMode there). They deliberately reuse
  // the real transitions rather than faking the end states, so what you see
  // while testing is what a player would get.

  /** Restarts the game on an arbitrary round. */
  const devJumpToLevel = useCallback((index: number) => startLevel(index, "restart"), [startLevel]);

  /** Awards exactly enough points to hit the target, then runs the same
   * round-cleared transition a real clear would. */
  const devWinRound = useCallback(() => {
    if (clearedRef.current || gameOver) return;
    addScore(Math.max(0, KING_SCORE - scoreRef.current));
    checkRoundCleared();
  }, [addScore, checkRoundCleared, gameOver]);

  /** Packs the board so only one cell is left, then spawns into it — the
   * genuine "no empty cells" loss path, not a setGameOver(true) shortcut.
   * The color pattern steps by a different amount along each of the four
   * line directions, so filling can't accidentally complete a line. */
  const devFillBoard = useCallback(() => {
    if (clearedRef.current || gameOver) return;
    const { colors: colorCount } = levelRef.current;
    const free = emptyCells(boardRef.current);
    for (const { r, c } of free.slice(1)) {
      boardRef.current[r]![c] = (r * 3 + c) % colorCount;
    }
    sync();
    void spawnBalls(1);
  }, [gameOver, spawnBalls, sync]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (busy || gameOver || cleared) return;
      primeAudio();

      const occupied = boardRef.current[r]![c] !== null;

      if (selected && !occupied) {
        const path = findPath(boardRef.current, selected, { r, c });
        setSelected(null);
        if (!path) return;
        void animateMove(path);
        return;
      }

      if (occupied) {
        setSelected({ r, c });
        playSelect();
        return;
      }

      setSelected(null);
    },
    [animateMove, busy, gameOver, cleared, selected],
  );

  const reachable = useMemo(() => {
    if (!selected || busy) return new Set<string>();
    return new Set(reachableFrom(boardRef.current, selected).map((c) => cellKey(c.r, c.c)));
  }, [selected, busy, board]);

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void spawnBalls(levelRef.current.startCount, true);
  }, [spawnBalls]);

  return {
    board,
    selected,
    score,
    runScore: bankedScore + score,
    moves,
    roundsCleared,
    runId,
    // Points banked in the round the run ended in. Zero once the ladder is
    // finished, so a finisher's progress is exactly MAX_PROGRESS and they're
    // separated only by moves — see progressOf in game/score.ts.
    partialPoints: roundsCleared >= LEVEL_COUNT ? 0 : score,
    level,
    levelIndex,
    levelCount: LEVEL_COUNT,
    isFinal: isFinalLevel(levelIndex),
    nextQueue,
    gameOver,
    cleared,
    busy,
    poppingKeys,
    spawningKeys,
    reachable,
    shakeToken,
    handleCellClick,
    advanceLevel,
    retryLevel,
    newGame,
    devJumpToLevel,
    devWinRound,
    devFillBoard,
  };
}
