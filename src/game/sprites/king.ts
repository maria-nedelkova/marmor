import { row } from "./pixelRow";
import type { PixelPalette } from "../../components/PixelArt";

const W = 16;

// Original chibi pixel-art mascot: crowned King with a scepter held on his
// right (outer) side. Anime-influenced proportions — big head, big eyes —
// rendered as hand-authored pixel data, not a copy of any existing artwork.
export const KING_ROWS: string[] = [
  row(W, ".", [[3, 3, "g"], [7, 8, "g"], [12, 12, "g"]]), // crown tips
  row(W, ".", [[2, 4, "g"], [6, 9, "g"], [11, 13, "g"]]), // crown tips widen
  row(W, ".", [[2, 13, "g"], [7, 8, "j"]]), // crown band + gem
  row(W, ".", [[2, 13, "h"]]), // crown shadow band
  row(W, ".", [[1, 2, "b"], [3, 12, "f"], [13, 14, "b"]]), // hairline + forehead
  row(W, ".", [[1, 1, "b"], [2, 13, "f"], [14, 14, "b"]]), // face
  row(W, ".", [[1, 1, "b"], [2, 13, "f"], [14, 14, "b"], [4, 5, "e"], [10, 11, "e"]]), // eyes (upper)
  row(W, ".", [
    [1, 1, "b"], [2, 13, "f"], [14, 14, "b"],
    [2, 3, "p"], [12, 13, "p"],
    [4, 5, "e"], [10, 11, "e"], [5, 5, "w"], [11, 11, "w"],
  ]), // eyes (lower) + blush
  row(W, ".", [[1, 1, "b"], [2, 13, "f"], [14, 14, "b"], [7, 8, "k"]]), // mouth
  row(W, ".", [[2, 2, "n"], [3, 12, "f"], [13, 13, "n"], [15, 15, "j"]]), // chin + scepter orb
  row(W, ".", [[3, 3, "g"], [4, 11, "f"], [12, 12, "g"], [15, 15, "s"]]), // neck + collar edge
  row(W, ".", [[2, 13, "g"], [15, 15, "s"]]), // collar band
  row(W, ".", [[1, 14, "r"], [15, 15, "s"]]), // shoulders
  row(W, "r", [[4, 4, "d"], [12, 12, "d"], [15, 15, "s"]]), // robe
  row(W, "r", [[15, 15, "s"]]), // robe
  row(W, "r", [[2, 2, "d"], [13, 13, "d"], [15, 15, "s"]]), // robe folds
  row(W, "g", [[15, 15, "s"]]), // hem trim
  row(W, ".", [[1, 14, "h"]]), // base shadow
];

export const KING_PALETTE: PixelPalette = {
  g: "#e8c14a",
  h: "#a9822c",
  j: "#ff4757",
  f: "#ffd9b3",
  n: "#e0ab7a",
  e: "#241a12",
  w: "#ffffff",
  b: "#3a2a1e",
  r: "#c93b3b",
  d: "#8f2323",
  p: "#ff9aa8",
  s: "#cfd6dd",
  k: "#241a12",
};
