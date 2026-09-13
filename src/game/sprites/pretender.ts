import { row } from "./pixelRow";
import type { PixelPalette } from "../../components/PixelArt";

const W = 16;

// Original chibi pixel-art mascot: the Pretender, spiky-haired rival with a
// sword held on his left (outer) side — mirrors the King's silhouette
// compositionally, distinct in color, headwear, and weapon shape.
export const PRETENDER_ROWS: string[] = [
  row(W, ".", [[1, 1, "c"], [4, 4, "c"], [7, 8, "c"], [11, 11, "c"], [14, 14, "c"]]), // crown spikes
  row(W, ".", [[1, 2, "c"], [3, 5, "c"], [6, 9, "c"], [10, 12, "c"], [13, 14, "c"]]), // spikes widen
  row(W, ".", [[1, 14, "c"], [7, 8, "u"]]), // crown band + streak
  row(W, ".", [[1, 14, "t"]]), // hair shadow band
  row(W, ".", [[1, 2, "v"], [3, 12, "f"], [13, 14, "v"]]), // hairline + forehead
  row(W, ".", [[1, 1, "v"], [2, 13, "f"], [14, 14, "v"]]), // face
  row(W, ".", [[1, 1, "v"], [2, 13, "f"], [14, 14, "v"], [4, 5, "e"], [10, 11, "e"]]), // eyes (upper)
  row(W, ".", [
    [1, 1, "v"], [2, 13, "f"], [14, 14, "v"],
    [2, 3, "p"], [12, 13, "p"],
    [4, 5, "e"], [10, 11, "e"], [5, 5, "w"], [11, 11, "w"],
  ]), // eyes (lower) + blush
  row(W, ".", [[0, 0, "x"], [1, 1, "v"], [2, 13, "f"], [14, 14, "v"], [7, 9, "k"]]), // smirking mouth + sword tip
  row(W, ".", [[0, 0, "s"], [2, 2, "n"], [3, 12, "f"], [13, 13, "n"]]), // chin + blade
  row(W, ".", [[0, 0, "s"], [3, 3, "m"], [4, 11, "f"], [12, 12, "m"]]), // neck + collar edge + blade
  row(W, ".", [[0, 0, "s"], [2, 13, "m"]]), // collar band + blade
  row(W, ".", [[0, 0, "s"], [1, 14, "R"]]), // shoulders + blade
  row(W, "R", [[0, 0, "s"], [4, 4, "D"], [12, 12, "D"]]), // robe
  row(W, "R", [[0, 1, "m"]]), // crossguard
  row(W, "R", [[0, 0, "b"], [2, 2, "D"], [13, 13, "D"]]), // grip + robe folds
  row(W, "m", [[0, 0, "b"]]), // hem trim + grip end
  row(W, ".", [[1, 14, "t"]]), // base shadow
];

export const PRETENDER_PALETTE: PixelPalette = {
  /** Crown. Split out from `v` (which still outlines the face) so the
   * headwear could be lifted out of near-black without turning the face
   * outline purple too — at #241a33 the crown read as a dark smudge,
   * especially at the smaller mobile sprite size. */
  c: "#5b3a9e",
  v: "#241a33",
  u: "#8f74f0",
  t: "#160f22",
  f: "#ffd9b3",
  n: "#e0ab7a",
  e: "#241a12",
  w: "#ffffff",
  p: "#ff9aa8",
  k: "#241a12",
  R: "#8b3bc9",
  D: "#5c1f94",
  m: "#7a8290",
  s: "#e3e8ee",
  x: "#c3ccd6",
  b: "#3a2a1e",
};
