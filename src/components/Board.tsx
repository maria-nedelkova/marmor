import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { BOARD_PADDING_PX, CELL_GAP_PX, CELL_SIZE_PX, SIZE } from "../game/constants";
import type { Board as BoardType, Cell as CellType, ColorIndex } from "../game/types";
import { Cell } from "./Cell";

export interface BoardHandle {
  showGlide: (r: number, c: number, color: ColorIndex, opts?: { instant?: boolean; stepMs?: number }) => void;
  hideGlide: () => void;
}

interface BoardProps {
  board: BoardType;
  selected: CellType | null;
  reachable: Set<string>;
  poppingKeys: Set<string>;
  spawningKeys: Set<string>;
  onCellClick: (r: number, c: number) => void;
}

const STEP_PX = CELL_SIZE_PX + CELL_GAP_PX;

/** The marble glide is updated imperatively (see showGlide/hideGlide) rather
 * than through React state. Driving it via setState meant a full 81-cell
 * re-render on every ~12-28ms step — measured at ~100ms per re-render in
 * this app (vs ~0.2ms for the state update call itself), which is what made
 * the animation look like it eased in: early steps were still waiting on a
 * previous render to finish. Direct DOM writes have no such cost. */
export const Board = forwardRef<BoardHandle, BoardProps>(function Board(
  { board, selected, reachable, poppingKeys, spawningKeys, onCellClick },
  ref,
) {
  const gridRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayMarbleRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    showGlide(r, c, color, opts) {
      const overlay = overlayRef.current;
      const marble = overlayMarbleRef.current;
      if (!overlay || !marble) return;
      if (opts?.stepMs !== undefined) {
        overlay.style.setProperty("--glide-step", `${opts.stepMs}ms`);
      }
      // translate(), not top/left — a transform is compositor-only and
      // costs nothing extra per step, whereas animating top/left would
      // force a layout reflow on every frame (the exact cost that made the
      // old React-driven glide feel sluggish in the first place).
      overlay.style.transition = opts?.instant ? "none" : "";
      overlay.style.transform = `translate(${BOARD_PADDING_PX + c * STEP_PX}px, ${BOARD_PADDING_PX + r * STEP_PX}px)`;
      overlay.style.display = "flex";
      marble.className = `marble c${color} moving`;
    },
    hideGlide() {
      const overlay = overlayRef.current;
      if (overlay) overlay.style.display = "none";
    },
  }));

  // Force every currently-reachable dot's pulse animation to restart
  // together on each new selection, rather than relying on a shared
  // animation-delay custom property to keep them in phase. A CSS custom
  // property referenced via var() is re-resolved live for an
  // ALREADY-RUNNING animation too (confirmed: Animation#effect.getTiming()
  // reflects the current variable value even for an instance that started
  // selections ago) — but that instance's startTime/currentTime stay
  // anchored to whenever it actually began. So a cell that survives several
  // selections without React ever toggling its `reachable` class keeps
  // reading a fresh delay value against a stale time baseline, drifting a
  // little further out of sync with every later selection. Explicitly
  // removing and re-adding the class (with a forced reflow in between, so
  // the browser actually drops the old animation instance first) is the
  // same trick App.tsx uses to restart `.shake` — a one-time DOM operation
  // per selection, not a recurring timer, so it doesn't reintroduce the
  // setInterval performance cost from the very first attempt at this bug.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const dots = grid.querySelectorAll<HTMLElement>(".cell.reachable");
    dots.forEach((el) => el.classList.remove("reachable"));
    void grid.offsetWidth;
    dots.forEach((el) => el.classList.add("reachable"));
  }, [reachable]);

  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const key = `${r},${c}`;
      cells.push(
        <Cell
          key={key}
          r={r}
          c={c}
          color={board[r]![c]!}
          selected={selected?.r === r && selected?.c === c}
          reachable={reachable.has(key)}
          popping={poppingKeys.has(key)}
          spawning={spawningKeys.has(key)}
          onClick={onCellClick}
        />,
      );
    }
  }

  return (
    <div ref={gridRef} className="board" role="grid" aria-label="Game board">
      {cells}
      <div ref={overlayRef} className="glide-overlay" style={{ display: "none", transform: "translate(0, 0)" }}>
        <div ref={overlayMarbleRef} className="marble moving" />
      </div>
    </div>
  );
});
