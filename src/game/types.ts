export type ColorIndex = number;

export type Cell = { r: number; c: number };

/** `null` marks an empty cell. */
export type Board = (ColorIndex | null)[][];

export type GamePhase = "playing" | "gameover";
