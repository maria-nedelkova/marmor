import { row } from "./pixelRow";
import type { PixelPalette } from "../../components/PixelArt";

// The decorations in the control panel: a sparkle and a heart at the queue's
// four corners, and a star/coin/star set into the panel's bottom edge.
//
// Hand-authored like everything else in this folder rather than typed as
// ✦ ♥ ★ in the display font. A font renders those as whatever its designer
// drew — or as a system fallback glyph, which is worse — at whatever weight
// the font happens to have, and neither matches the marbles they sit
// between. A few pixels of deliberate art does.
//
// They carry no information; the queue beside them is the content. TopBar
// renders them aria-hidden.

const W = 7;

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

// The corner pair, at 5x5. Their own art rather than the 7x7 sprites at a
// fractional pixel size — fractional sizes blur the one thing pixel art
// cannot afford to blur.

const S = 5;

/** Sparkle: a solid rhomb with a lit core, points reaching the edges.
 *
 * Drawn as a filled diamond, not as a cross of one-pixel arms. The arms-only
 * version read as a plus sign, because at 5x5 a thin cross is nothing BUT
 * its arms — the body that makes a sparkle a sparkle has to be filled in for
 * it to be there at all. */
export const SPARKLE_SM_ROWS: string[] = [
  row(S, ".", [[2, 2, "m"]]),
  row(S, ".", [[1, 3, "m"], [2, 2, "l"]]),
  row(S, ".", [[0, 4, "m"], [1, 3, "l"]]),
  row(S, ".", [[1, 3, "m"], [2, 2, "l"]]),
  row(S, ".", [[2, 2, "m"]]),
];

export const SPARKLE_PALETTE: PixelPalette = {
  l: "#fffdf0",
  m: "#ffe9a8",
  d: "#c9a04a",
};

/** The reference's lower-right sparkle is cyan where the upper-left one is
 * gold — the two diagonals are told apart by colour as well as by shape. */
export const SPARKLE_CYAN_PALETTE: PixelPalette = {
  l: "#eafdff",
  m: "#8fe6f5",
  d: "#3f9fb4",
};

/** Heart: two lobes over a point. */
export const HEART_SM_ROWS: string[] = [
  row(S, ".", [[0, 1, "m"], [3, 4, "m"]]),
  row(S, ".", [[0, 4, "m"], [1, 1, "l"]]),
  row(S, ".", [[0, 4, "m"]]),
  row(S, ".", [[1, 3, "m"]]),
  row(S, ".", [[2, 2, "d"]]),
];

export const HEART_PALETTE: PixelPalette = {
  l: "#ffc2ec",
  m: "#f45fc8",
  d: "#b32e92",
};

/** The reference flanks its title with a cyan star on one side and a pink
 * one on the other. */
export const STAR_PINK_PALETTE: PixelPalette = {
  l: "#ffd9f3",
  m: "#f45fc8",
  d: "#a82f80",
};
