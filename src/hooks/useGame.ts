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
import { BLOCK_MIN_RUN_LENGTH, BLOCK_PROBABILITY, KING_SCORE, SPAWN_COUNT } from "../game/constants";
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
import { rng } from "../game/rng";
import type { Board, Cell, ColorIndex } from "../game/types";

const cellKey = (r: number, c: number) => `${r},${c}`;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useGame(boardHandleRef: RefObject<BoardHandle | null>) {
  const boardRef = useRef<Board>(createEmptyBoard());
  const scoreRef = useRef(0);
  const nextQueueRef = useRef<ColorIndex[]>(randomColors(SPAWN_COUNT));

  const [board, setBoard] = useState<Board>(() => cloneBoard(boardRef.current));
  const [selected, setSelected] = useState<Cell | null>(null);
  const [score, setScore] = useState(0);
  const [nextQueue, setNextQueue] = useState<ColorIndex[]>(() => nextQueueRef.current);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
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

  const clearCells = useCallback(
    async (cells: Cell[]) => {
      const keys = cells.map((cell) => cellKey(cell.r, cell.c));
      setPoppingKeys((prev) => new Set([...prev, ...keys]));
      addScore(scoreForClear(cells.length));
      playClear(cells.length);
      setShakeToken((t) => t + 1);

      if (!wonRef.current && scoreRef.current >= KING_SCORE) {
        wonRef.current = true;
        setWon(true);
        playKingFall();
        setTimeout(playWin, 1050); // fanfare once he's landed
      }

      await sleep(260);

      for (const { r, c } of cells) boardRef.current[r]![c] = null;
      sync();
      setPoppingKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      });
    },
    [addScore, sync],
  );

  const spawnBalls = useCallback(
    async (count: number, isInitial = false) => {
      const free = emptyCells(boardRef.current);
      const toPlace = Math.min(count, free.length);
      const colors = isInitial
        ? weightedRandomColors(boardRef.current, toPlace)
        : Array.from({ length: toPlace }, (_, i) => nextQueueRef.current[i] ?? weightedRandomColor(boardRef.current));
      // Cells aren't picked uniformly at random — each turn has a flat chance
      // of the board looking for the player's near-complete lines and
      // dropping a mismatched color right on top of one, instead of anywhere empty.
      const canBlock = !isInitial && rng.random() < BLOCK_PROBABILITY;
      const { cells: placedCells } = assignSpawnCells(boardRef.current, colors, BLOCK_MIN_RUN_LENGTH, canBlock);

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
        const freshQueue = weightedRandomColors(boardRef.current, SPAWN_COUNT);
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

      if (wonRef.current) return;

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

      const matches = findLinesThrough(boardRef.current, to);
      if (matches.length > 0) {
        await clearCells(matches);
        setBusy(false);
        return;
      }

      setBusy(false);
      if (wonRef.current) return;
      await spawnBalls(SPAWN_COUNT);
    },
    [clearCells, spawnBalls, sync],
  );

  const newGame = useCallback(() => {
    boardRef.current = createEmptyBoard();
    scoreRef.current = 0;
    nextQueueRef.current = randomColors(SPAWN_COUNT);
    setBoard(cloneBoard(boardRef.current));
    setSelected(null);
    setScore(0);
    setNextQueue(nextQueueRef.current);
    setGameOver(false);
    wonRef.current = false;
    setWon(false);
    setBusy(false);
    boardHandleRef.current?.hideGlide();
    setPoppingKeys(new Set());
    setSpawningKeys(new Set());
    void spawnBalls(5, true);
  }, [spawnBalls]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (busy || gameOver || won) return;
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
    [animateMove, busy, gameOver, won, selected],
  );

  const reachable = useMemo(() => {
    if (!selected || busy) return new Set<string>();
    return new Set(reachableFrom(boardRef.current, selected).map((c) => cellKey(c.r, c.c)));
  }, [selected, busy, board]);

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void spawnBalls(5, true);
  }, [spawnBalls]);

  return {
    board,
    selected,
    score,
    nextQueue,
    gameOver,
    won,
    busy,
    poppingKeys,
    spawningKeys,
    reachable,
    shakeToken,
    handleCellClick,
    newGame,
  };
}
