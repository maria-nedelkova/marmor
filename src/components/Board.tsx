import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
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

  // A fresh sync point computed once per new reachable set (not a recurring
  // timer) — every currently-reachable dot reads this same delay via CSS
  // inheritance (set once here on the board, not per-cell), so they always
  // start a new selection's blink in phase with each other.
  const blinkDelay = useMemo(() => -(Date.now() % 1100), [reachable]);
  const boardStyle = useMemo(() => ({ "--blink-delay": `${blinkDelay}ms` }) as CSSProperties, [blinkDelay]);

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
    <div className="board" role="grid" aria-label="Game board" style={boardStyle}>
      {cells}
      <div ref={overlayRef} className="glide-overlay" style={{ display: "none", transform: "translate(0, 0)" }}>
        <div ref={overlayMarbleRef} className="marble moving" />
      </div>
    </div>
  );
});
