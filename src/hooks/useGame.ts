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
  bombAt,
  cloneBoard,
  createEmptyBoard,
  emptyCells,
  findLinesThrough,
  findPath,
  randomColors,
  reachableFrom,
  scoreForClear,
  shuffleBoardColors,
  smashMarble,
  swapMarbleColors,
  weightedRandomColor,
  weightedRandomColors,
} from "../game/engine";
import { KING_SCORE, SIZE } from "../game/constants";
import { getLevel, isFinalLevel, LEVEL_COUNT } from "../game/levels";
import type { LevelConfig } from "../game/levels";
import { clearRun, loadRun, saveRun } from "../game/progress";
import type { ForeseenSpawn, RunSnapshot } from "../game/progress";
import { rng } from "../game/rng";
import {
  grantCharges,
  hasCharge,
  NO_CHARGES,
  spendCharge,
} from "../game/tools";
import type { ToolCharges, ToolId } from "../game/tools";
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

/** Whether the URL pins a round. A saved run must not override it, or the
 * dev panel's round buttons would appear to do nothing once a snapshot
 * exists. */
function hasExplicitRound(): boolean {
  if (typeof window === "undefined") return false;
  const round = Number(new URLSearchParams(window.location.search).get("round"));
  return Number.isFinite(round) && round >= 1;
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

  // Tools. Charges live in a ref as well as state for the same reason the
  // level does: the async tool paths read them mid-flight.
  const chargesRef = useRef<ToolCharges>(grantCharges(NO_CHARGES, levelIndexRef.current));
  const [charges, setCharges] = useState<ToolCharges>(chargesRef.current);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  /** Swap's first pick, held until the second tap lands. */
  const [swapFirst, setSwapFirst] = useState<Cell | null>(null);
  /** This turn's spawn, once the crystal ball has committed it: the cells
   * the marbles will land on and the colours that will land there. Null
   * whenever the spawn is still undecided, which is every turn the tool
   * isn't used. Persisted with the rest of the run — the charge is spent the
   * moment it's used, so an evicted tab that dropped this would bill the
   * player for a forecast and then not show it. */
  const foreseenRef = useRef<ForeseenSpawn | null>(null);
  const [foreseen, setForeseen] = useState<ForeseenSpawn | null>(null);
  /** Bumped whenever the dice rewrite the queue, so the Next up strip can
   * flash. Without it the reroll is invisible on a bad draw — swapping
   * three random colours for three other random colours can easily look
   * like nothing happened at all. */
  const [queuePulse, setQueuePulse] = useState(0);

  const clearForeseen = useCallback(() => {
    foreseenRef.current = null;
    setForeseen(null);
  }, []);

  /** Writes the current run to sessionStorage. Called only from settled
   * states — after a completed turn and after a round transition — never
   * mid-animation, so a restored board is always one a player could have
   * been looking at. */
  const persist = useCallback(() => {
    saveRun({
      levelIndex: levelIndexRef.current,
      board: boardRef.current,
      nextQueue: nextQueueRef.current,
      score: scoreRef.current,
      bankedScore: bankedScoreRef.current,
      moves: movesRef.current,
      roundsCleared: roundsClearedRef.current,
      charges: chargesRef.current,
      foreseen: foreseenRef.current,
    });
  }, []);

  /** Rehydrates a snapshot straight into the refs and their mirrored state,
   * bypassing the opening spawn entirely — the saved board already has its
   * marbles, and spawning more would quietly inflate it on every reload. */
  const restoreRun = useCallback((snapshot: RunSnapshot) => {
    const level = getLevel(snapshot.levelIndex);
    levelIndexRef.current = snapshot.levelIndex;
    levelRef.current = level;
    setLevelIndex(snapshot.levelIndex);
    setLevel(level);

    boardRef.current = snapshot.board.map((row) => row.slice());
    scoreRef.current = snapshot.score;
    bankedScoreRef.current = snapshot.bankedScore;
    movesRef.current = snapshot.moves;
    roundsClearedRef.current = snapshot.roundsCleared;
    nextQueueRef.current = snapshot.nextQueue;
    // Restored as saved, NOT re-granted — re-granting would refund a
    // charge every time a tab was evicted.
    chargesRef.current = snapshot.charges;
    setCharges(snapshot.charges);
    // Same reasoning as the charges: the crystal ball was paid for before
    // the tab died, so the forecast it bought comes back with it. `?? null`
    // because a snapshot written before this field existed simply omits it.
    foreseenRef.current = snapshot.foreseen ?? null;
    setForeseen(foreseenRef.current);

    setBoard(cloneBoard(boardRef.current));
    setScore(snapshot.score);
    setBankedScore(snapshot.bankedScore);
    setMoves(snapshot.moves);
    setRoundsCleared(snapshot.roundsCleared);
    setNextQueue(snapshot.nextQueue);
  }, []);

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
    if (isFinalLevel(levelIndexRef.current)) {
      setTimeout(playWin, 1050);
      // Clearing the last round ends the run, so there's nothing left to
      // recover — and leaving the snapshot would drop a returning player
      // back into a round they already finished.
      clearRun();
    }
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

      // The crystal ball commits this turn's spawn when it's used, so if one
      // is held, honour it instead of rolling a new one — a prediction the
      // game then ignores is worse than no prediction. The player still had
      // a move to make after looking, though, and that move can land on a
      // cell the reveal had claimed: those marbles (and only those) get
      // re-homed, so the rest of the forecast stays true.
      const foreseenSpawn = isInitial ? null : foreseenRef.current;
      let colors: ColorIndex[];
      let placedCells: Cell[];

      if (foreseenSpawn) {
        const keptCells: Cell[] = [];
        const keptColors: ColorIndex[] = [];
        const displaced: ColorIndex[] = [];
        foreseenSpawn.cells.forEach((cell, i) => {
          const color = foreseenSpawn.colors[i]!;
          if (boardRef.current[cell.r]![cell.c] === null) {
            keptCells.push(cell);
            keptColors.push(color);
          } else {
            displaced.push(color);
          }
        });
        // Written before the displaced ones are assigned, so the kept cells
        // are already occupied and can't be handed out a second time.
        keptCells.forEach((cell, i) => {
          boardRef.current[cell.r]![cell.c] = keptColors[i]!;
        });
        const { cells: spillCells } = assignSpawnCells(boardRef.current, displaced, {
          minBlockLength: blockMinRunLength,
          enableBlocking: false,
          colorCount,
        });
        spillCells.forEach((cell, i) => {
          boardRef.current[cell.r]![cell.c] = displaced[i]!;
        });
        placedCells = [...keptCells, ...spillCells];
        colors = [...keptColors, ...displaced.slice(0, spillCells.length)];
        clearForeseen();
      } else {
        // Only the first `previewCount` colors were announced in "Next up";
        // anything past that is rolled fresh here, so later levels can spawn
        // more marbles than they show (see `previewCount` in levels.ts).
        colors = isInitial
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
        placedCells = assignSpawnCells(boardRef.current, colors, {
          minBlockLength: blockMinRunLength,
          enableBlocking: canBlock,
          colorCount,
        }).cells;

        placedCells.forEach((cell, i) => {
          boardRef.current[cell.r]![cell.c] = colors[i]!;
        });
      }
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
        // The run is over — nothing left to recover, and leaving the
        // snapshot would resume straight back onto a dead board.
        clearRun();
        return;
      }
      // Settled: marbles placed, any lines resolved, board is final for
      // this turn.
      persist();
    },
    [clearCells, clearForeseen, persist, sync],
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
        if (!levelRef.current.spawnOnClear || clearedRef.current) {
          // A clearing move ends the turn with no spawn, so spawnBalls
          // never runs and this is the only place the new board is settled.
          if (!clearedRef.current) persist();
          return;
        }
        await spawnBalls(levelRef.current.spawnCount);
        return;
      }

      setBusy(false);
      if (clearedRef.current) return;
      await spawnBalls(levelRef.current.spawnCount);
    },
    [clearCells, persist, spawnBalls, sync],
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

      // Charges are granted on arrival at a round. A fresh run starts from
      // nothing; advancing or retrying carries the existing charges in, and
      // grantCharges decides whether they survive (see its two phases).
      chargesRef.current = grantCharges(mode === "restart" ? NO_CHARGES : chargesRef.current, levelIndexRef.current);
      setCharges(chargesRef.current);
      setActiveTool(null);
      setSwapFirst(null);
      clearForeseen();

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
      // A brand-new run must not inherit the old snapshot. Advancing and
      // retrying keep the run alive, and spawnBalls persists the new round
      // once its opening marbles land.
      if (mode === "restart") clearRun();
      void spawnBalls(nextLevel.startCount, true);
    },
    [boardHandleRef, clearForeseen, spawnBalls],
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

  /** Arms a tool, or disarms it if it's already armed. Selecting a tool
   * clears any marble selection, so the board is never showing a move
   * target and a tool target at the same time. */
  const armTool = useCallback(
    (id: ToolId) => {
      if (busy || gameOver || cleared) return;
      primeAudio();
      setSelected(null);
      setSwapFirst(null);
      setActiveTool((current) => {
        if (current === id) return null;
        return hasCharge(chargesRef.current, id) ? id : null;
      });
    },
    [busy, cleared, gameOver],
  );

  const disarmTool = useCallback(() => {
    setActiveTool(null);
    setSwapFirst(null);
  }, []);

  const spend = useCallback((id: ToolId) => {
    chargesRef.current = spendCharge(chargesRef.current, id);
    setCharges(chargesRef.current);
  }, []);

  /** Tools that don't target the board fire straight from the tool bar.
   *
   * Dice rewrites the queue. Pouch rearranges the colours already down, and
   * can complete lines doing it, so it resolves them like any other move.
   * Crystal ball doesn't change the board at all — it decides this turn's
   * spawn early and shows it, and spawnBalls then honours that decision
   * rather than rolling its own. */
  const useInstantTool = useCallback(
    async (id: ToolId) => {
      if (busy || gameOver || cleared || !hasCharge(chargesRef.current, id)) return;
      primeAudio();
      const {
        previewCount,
        spawnCount,
        colors: colorCount,
        colorAffinity,
        blockProbability,
        blockMinRunLength,
      } = levelRef.current;

      if (id === "reroll") {
        nextQueueRef.current = weightedRandomColors(boardRef.current, previewCount, colorCount, colorAffinity);
        setNextQueue(nextQueueRef.current);
        setQueuePulse((t) => t + 1);
      } else if (id === "shuffle") {
        // Refuses on a board it can't actually rearrange, so the charge
        // isn't burnt on a no-op (see shuffleBoardColors).
        if (!shuffleBoardColors(boardRef.current)) return;
        sync();
        setShakeToken((t) => t + 1);
        // A stir can complete lines anywhere, so every marble is a
        // candidate rather than just the ones a move touched.
        const matched = new Map<string, Cell>();
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            if (boardRef.current[r]![c] === null) continue;
            findLinesThrough(boardRef.current, { r, c }).forEach((m) => matched.set(cellKey(m.r, m.c), m));
          }
        }
        spend(id);
        disarmTool();
        playPlace();
        if (matched.size > 0) {
          setBusy(true);
          await clearCells([...matched.values()]);
          setBusy(false);
        }
        persist();
        return;
      } else if (id === "foresight") {
        if (foreseenRef.current) return; // already revealed this turn
        const freeCells = emptyCells(boardRef.current);
        const toPlace = Math.min(spawnCount, freeCells.length);
        if (toPlace === 0) return;
        // Built exactly the way spawnBalls would build it, including the
        // blocking roll — this IS the spawn, just decided early. Rolling it
        // here and storing it is what makes the prediction binding.
        const spawnColors = Array.from(
          { length: toPlace },
          (_, i) => nextQueueRef.current[i] ?? weightedRandomColor(boardRef.current, colorCount, colorAffinity),
        );
        const { cells } = assignSpawnCells(boardRef.current, spawnColors, {
          minBlockLength: blockMinRunLength,
          enableBlocking: rng.random() < blockProbability,
          colorCount,
        });
        if (cells.length === 0) return;
        foreseenRef.current = { cells, colors: spawnColors.slice(0, cells.length) };
        setForeseen(foreseenRef.current);
      } else {
        return;
      }

      spend(id);
      disarmTool();
      playSelect();
      persist();
    },
    [busy, cleared, clearCells, disarmTool, gameOver, persist, spend, sync],
  );

  /** Applies a board-targeting tool to a cell. Hammer resolves on one tap;
   * swap needs two, holding the first pick until the second arrives. */
  const applyToolAt = useCallback(
    async (cell: Cell) => {
      const tool = activeTool;
      if (!tool || !hasCharge(chargesRef.current, tool)) return;

      if (tool === "hammer") {
        if (!smashMarble(boardRef.current, cell)) return; // empty cell: no charge spent
        sync();
        spend("hammer");
        disarmTool();
        playClear(1);
        setShakeToken((t) => t + 1);
        persist();
        return;
      }

      if (tool === "bomb") {
        // Aimed at any cell, not just an occupied one — the blast is a 3x3
        // patch and the useful aim point is often the gap in the middle of
        // a clump. Only a patch that is entirely empty is refused.
        const removed = bombAt(boardRef.current, cell);
        if (removed === 0) return;
        sync();
        spend("bomb");
        disarmTool();
        playClear(removed);
        setShakeToken((t) => t + 1);
        persist();
        return;
      }

      if (tool === "swap") {
        if (boardRef.current[cell.r]![cell.c] === null) return;
        if (!swapFirst) {
          setSwapFirst(cell);
          playSelect();
          return;
        }
        if (swapFirst.r === cell.r && swapFirst.c === cell.c) {
          setSwapFirst(null); // tapping the same marble twice cancels the pick
          return;
        }
        if (!swapMarbleColors(boardRef.current, swapFirst, cell)) {
          // Same colour — nothing to exchange. Keep the tool armed so the
          // player can pick a different second marble.
          setSwapFirst(null);
          return;
        }
        sync();
        spend("swap");
        disarmTool();
        playPlace();

        // A swap can complete a line at either end, so both are checked.
        const matched = new Map<string, Cell>();
        for (const at of [swapFirst, cell]) {
          findLinesThrough(boardRef.current, at).forEach((m) => matched.set(cellKey(m.r, m.c), m));
        }
        if (matched.size > 0) {
          setBusy(true);
          await clearCells([...matched.values()]);
          setBusy(false);
        }
        persist();
      }
    },
    [activeTool, clearCells, disarmTool, persist, spend, swapFirst, sync],
  );

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (busy || gameOver || cleared) return;
      primeAudio();

      // An armed tool takes over the tap entirely — no selecting, no moving
      // — so a mis-tap while armed can never also move a marble.
      if (activeTool) {
        void applyToolAt({ r, c });
        return;
      }

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
    [activeTool, applyToolAt, animateMove, busy, gameOver, cleared, selected],
  );

  const reachable = useMemo(() => {
    if (!selected || busy) return new Set<string>();
    return new Set(reachableFrom(boardRef.current, selected).map((c) => cellKey(c.r, c.c)));
  }, [selected, busy, board]);

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // An explicit ?round= always wins: the dev panel has to be able to jump
    // to a round without a stale snapshot dragging it somewhere else.
    const snapshot = hasExplicitRound() ? null : loadRun();
    if (snapshot) {
      restoreRun(snapshot);
      return;
    }
    void spawnBalls(levelRef.current.startCount, true);
  }, [restoreRun, spawnBalls]);

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
    /** Bumped on every dice reroll, for the Next up flash. */
    queuePulse,
    /** This turn's committed spawn once the crystal ball has shown it. */
    foreseen,
    gameOver,
    cleared,
    busy,
    poppingKeys,
    spawningKeys,
    reachable,
    shakeToken,
    charges,
    activeTool,
    swapFirst,
    armTool,
    useInstantTool,
    handleCellClick,
    advanceLevel,
    retryLevel,
    newGame,
    devJumpToLevel,
    devWinRound,
    devFillBoard,
  };
}
