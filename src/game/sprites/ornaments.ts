import { row } from "./pixelRow";
import type { PixelPalette } from "../../components/PixelArt";

// The decorations scattered around the queue in the control panel: a
// sparkle, a heart, two stars and a coin.
//
// Hand-authored like everything else in this folder rather than typed as
// ✦ ♥ ★ in the display font. A font renders those as whatever its designer
// drew — or as a system fallback glyph, which is worse — at whatever weight
// the font happens to have, and neither matches the marbles they sit
// between. Seven pixels of deliberate art does.
//
// They carry no information; the queue beside them is the content. TopBar
// renders them aria-hidden.

const W = 7;

/** Four-point sparkle: long axes, pinched waist, bright core. */
export const SPARKLE_ROWS: string[] = [
  row(W, ".", [[3, 3, "d"]]),
  row(W, ".", [[3, 3, "m"]]),
  row(W, ".", [[2, 4, "m"], [3, 3, "l"]]),
  row(W, ".", [[0, 6, "d"], [1, 5, "m"], [2, 4, "l"]]),
  row(W, ".", [[2, 4, "m"], [3, 3, "l"]]),
  row(W, ".", [[3, 3, "m"]]),
  row(W, ".", [[3, 3, "d"]]),
];

export const SPARKLE_PALETTE: PixelPalette = {
  l: "#fffdf0",
  m: "#ffe9a8",
  d: "#c9a04a",
};

/** Heart: two lobes over a point. */
export const HEART_ROWS: string[] = [
  row(W, ".", []),
  row(W, ".", [[1, 2, "m"], [4, 5, "m"]]),
  row(W, ".", [[0, 6, "m"], [1, 1, "l"]]),
  row(W, ".", [[0, 6, "m"], [1, 2, "l"]]),
  row(W, ".", [[1, 5, "m"]]),
  row(W, ".", [[2, 4, "d"]]),
  row(W, ".", [[3, 3, "d"]]),
];

export const HEART_PALETTE: PixelPalette = {
  l: "#ffc2ec",
  m: "#f45fc8",
  d: "#b32e92",
};

/** Five-point star, drawn once and recoloured by palette. */
export const STAR_ROWS: string[] = [
  row(W, ".", [[3, 3, "m"]]),
  row(W, ".", [[2, 4, "m"], [3, 3, "l"]]),
  row(W, ".", [[0, 6, "m"], [2, 4, "l"]]),
  row(W, ".", [[1, 5, "m"], [2, 4, "l"]]),
  row(W, ".", [[1, 5, "m"]]),
  row(W, ".", [[1, 2, "m"], [4, 5, "m"]]),
  row(W, ".", [[0, 1, "d"], [5, 6, "d"]]),
];

export const STAR_GOLD_PALETTE: PixelPalette = {
  l: "#fff3c4",
  m: "#f0b429",
  d: "#a6761a",
};

export const STAR_CYAN_PALETTE: PixelPalette = {
  l: "#dffbff",
  m: "#4fd2e6",
  d: "#2a8a9c",
};

/** Coin: a disc with a struck face. */
export const COIN_ROWS: string[] = [
  row(W, ".", [[2, 4, "d"]]),
  row(W, ".", [[1, 5, "m"], [2, 3, "l"]]),
  row(W, ".", [[0, 6, "m"], [1, 2, "l"], [3, 3, "d"]]),
  row(W, ".", [[0, 6, "m"], [1, 1, "l"], [3, 3, "d"]]),
  row(W, ".", [[0, 6, "m"], [3, 3, "d"]]),
  row(W, ".", [[1, 5, "m"], [4, 5, "d"]]),
  row(W, ".", [[2, 4, "d"]]),
];

export const COIN_PALETTE: PixelPalette = {
  l: "#fff0b8",
  m: "#f0b429",
  d: "#9a6a12",
};
