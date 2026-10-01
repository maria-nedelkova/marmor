import { row } from "./pixelRow";
import type { PixelPalette } from "../../components/PixelArt";

// Tool icons, hand-authored the same way as the mascots (see king.ts) rather
// than drawn from an icon font. A lucide glyph next to this game's sprites
// reads as a different piece of software; these are the same pixel grid, the
// same hard edges, the same palette discipline.
//
// Each tool is a physical object, not an abstraction: a mallet, a flask, a
// die, a crystal ball. An object is recognisable at 12x12 in a way an
// arrow-cycle or an eye is not, and it gives the tool a name a player can say.

const W = 12;

/** Mallet: dark head with a highlight edge, wooden haft running to the
 * bottom-left corner. */
export const HAMMER_ROWS: string[] = [
  row(W, ".", []),
  row(W, ".", [[4, 9, "l"]]),
  row(W, ".", [[3, 10, "m"], [4, 9, "l"]]),
  row(W, ".", [[3, 10, "m"], [4, 5, "s"]]),
  row(W, ".", [[3, 10, "m"], [4, 4, "s"]]),
  row(W, ".", [[3, 10, "d"]]),
  row(W, ".", [[5, 7, "d"], [6, 7, "w"]]),
  row(W, ".", [[5, 6, "w"]]),
  row(W, ".", [[4, 5, "w"]]),
  row(W, ".", [[3, 4, "w"]]),
  row(W, ".", [[2, 3, "h"]]),
  row(W, ".", [[1, 2, "h"]]),
];

export const HAMMER_PALETTE: PixelPalette = {
  m: "#8f9bb8", // head
  l: "#c3cde4", // head highlight
  d: "#5b6480", // head shadow
  s: "#eef3ff", // glint
  w: "#b07b3e", // haft
  h: "#6f4a22", // haft shadow
};

/** Flask: round-bottomed bottle with a stopper and a bright liquid line —
 * the swap is a transmutation, so it gets alchemy glassware. */
export const FLASK_ROWS: string[] = [
  row(W, ".", [[5, 6, "k"]]),
  row(W, ".", [[5, 6, "k"]]),
  row(W, ".", [[4, 7, "g"]]),
  row(W, ".", [[4, 4, "g"], [7, 7, "g"]]),
  row(W, ".", [[3, 3, "g"], [8, 8, "g"]]),
  row(W, ".", [[3, 3, "g"], [8, 8, "g"], [4, 7, "p"]]),
  row(W, ".", [[2, 2, "g"], [9, 9, "g"], [3, 8, "p"]]),
  row(W, ".", [[2, 2, "g"], [9, 9, "g"], [3, 8, "q"]]),
  row(W, ".", [[2, 2, "g"], [9, 9, "g"], [3, 8, "q"]]),
  row(W, ".", [[2, 2, "g"], [9, 9, "g"], [3, 8, "q"]]),
  row(W, ".", [[3, 3, "g"], [8, 8, "g"], [4, 7, "q"]]),
  row(W, ".", [[4, 7, "g"]]),
];

export const FLASK_PALETTE: PixelPalette = {
  g: "#cfe3f5", // glass
  k: "#8a6a45", // cork
  p: "#7ff0ff", // liquid surface
  q: "#1f9fd6", // liquid
};

/** Die: a five-pip face, because a reroll is exactly a dice throw.
 *
 * The body is deliberately square (10x10, rows 1-10) — an earlier version was
 * a row taller than it was wide and read as a playing card rather than a die.
 * The one-pixel lighter top/left and darker bottom/right inner border is the
 * same bevel the 3D buttons use, and is what makes it read as a solid cube
 * rather than a printed square. */
export const DICE_ROWS: string[] = [
  row(W, ".", []),
  row(W, ".", [[1, 10, "e"]]),
  row(W, ".", [[1, 10, "e"], [2, 9, "s"]]),
  row(W, ".", [[1, 10, "e"], [2, 9, "f"], [2, 2, "s"], [9, 9, "d"], [3, 4, "p"], [7, 8, "p"]]),
  row(W, ".", [[1, 10, "e"], [2, 9, "f"], [2, 2, "s"], [9, 9, "d"], [3, 4, "p"], [7, 8, "p"]]),
  row(W, ".", [[1, 10, "e"], [2, 9, "f"], [2, 2, "s"], [9, 9, "d"], [5, 6, "p"]]),
  row(W, ".", [[1, 10, "e"], [2, 9, "f"], [2, 2, "s"], [9, 9, "d"], [5, 6, "p"]]),
  row(W, ".", [[1, 10, "e"], [2, 9, "f"], [2, 2, "s"], [9, 9, "d"], [3, 4, "p"], [7, 8, "p"]]),
  row(W, ".", [[1, 10, "e"], [2, 9, "f"], [2, 2, "s"], [9, 9, "d"], [3, 4, "p"], [7, 8, "p"]]),
  row(W, ".", [[1, 10, "e"], [2, 9, "d"]]),
  row(W, ".", [[1, 10, "e"]]),
  row(W, ".", []),
];

export const DICE_PALETTE: PixelPalette = {
  e: "#241a12", // edge
  f: "#f2ead6", // face
  s: "#fffaf0", // top/left inner bevel
  d: "#c6b899", // bottom/right inner bevel
  p: "#c2334a", // pips
};

/** Crystal ball on a stand: a sphere with a highlight, sitting on a base.
 *
 * The shading runs as an unbroken bottom-right crescent that reaches the
 * silhouette edge on every row it touches. An earlier version stopped the
 * shadow short of the edge on some rows and not others, which broke the
 * curve and made the ball look chipped rather than round. */
export const ORB_ROWS: string[] = [
  row(W, ".", [[4, 7, "o"]]),
  row(W, ".", [[2, 9, "o"], [3, 4, "s"]]),
  row(W, ".", [[1, 10, "o"], [2, 3, "s"]]),
  row(W, ".", [[1, 10, "o"], [2, 2, "s"]]),
  row(W, ".", [[1, 10, "o"]]),
  row(W, ".", [[1, 10, "o"], [8, 10, "u"]]),
  row(W, ".", [[1, 10, "o"], [7, 10, "u"]]),
  row(W, ".", [[1, 10, "o"], [6, 10, "u"]]),
  row(W, ".", [[2, 9, "o"], [5, 9, "u"]]),
  row(W, ".", [[4, 7, "o"], [5, 7, "u"]]),
  row(W, ".", [[3, 8, "b"]]),
  row(W, ".", [[2, 9, "c"]]),
];

export const ORB_PALETTE: PixelPalette = {
  o: "#a77cf5", // glass
  u: "#6234b8", // depth
  s: "#f0e9ff", // highlight
  b: "#8f9bb8", // stand
  c: "#5b6480", // stand shadow
};

/** Drawstring pouch: the bag the marbles came out of, so shaking it is an
 * obvious way to say "same marbles, new arrangement". Narrow gathered neck
 * over a round body, which is what separates it from the flask's straight
 * stopper at this size. */
export const POUCH_ROWS: string[] = [
  row(W, ".", [[4, 7, "t"]]),
  row(W, ".", [[4, 4, "t"], [7, 7, "t"]]),
  row(W, ".", [[3, 8, "n"]]),
  row(W, ".", [[2, 9, "g"], [3, 8, "n"]]),
  row(W, ".", [[2, 9, "g"], [3, 5, "i"]]),
  row(W, ".", [[1, 10, "g"], [2, 4, "i"]]),
  row(W, ".", [[1, 10, "g"], [2, 3, "i"]]),
  row(W, ".", [[1, 10, "g"], [8, 10, "k"]]),
  row(W, ".", [[1, 10, "g"], [7, 10, "k"]]),
  row(W, ".", [[1, 10, "g"], [7, 10, "k"]]),
  row(W, ".", [[2, 9, "g"], [6, 9, "k"]]),
  row(W, ".", [[3, 8, "k"]]),
];

export const POUCH_PALETTE: PixelPalette = {
  g: "#a8703c", // leather
  i: "#d9a063", // lit side
  k: "#6b4320", // shadow side
  n: "#7a4e24", // gathered neck
  t: "#d8cdb4", // drawstring
};

/** Bomb: black sphere, lit fuse, single spark. The most-drawn object in
 * pixel art for "this removes a lot at once", and the silhouette survives
 * being greyed out behind a padlock. */
export const BOMB_ROWS: string[] = [
  row(W, ".", [[9, 10, "r"]]),
  row(W, ".", [[8, 8, "v"], [10, 10, "r"]]),
  row(W, ".", [[7, 7, "v"]]),
  row(W, ".", [[5, 6, "x"], [7, 7, "v"]]),
  row(W, ".", [[3, 8, "b"], [5, 6, "x"]]),
  row(W, ".", [[2, 9, "b"], [3, 4, "h"]]),
  row(W, ".", [[1, 10, "b"], [2, 3, "h"]]),
  row(W, ".", [[1, 10, "b"], [2, 2, "h"]]),
  row(W, ".", [[1, 10, "b"]]),
  row(W, ".", [[1, 10, "b"], [8, 10, "d"]]),
  row(W, ".", [[2, 9, "b"], [7, 9, "d"]]),
  row(W, ".", [[3, 8, "b"], [5, 8, "d"]]),
];

export const BOMB_PALETTE: PixelPalette = {
  b: "#2e3350", // casing
  h: "#7d87ad", // highlight
  d: "#161a2e", // shadow
  x: "#4a4030", // collar
  v: "#c08a3e", // fuse
  r: "#ffd34d", // spark
};

/** Padlock, drawn over a tool that hasn't unlocked yet. */
export const LOCK_ROWS: string[] = [
  row(W, ".", [[4, 7, "a"]]),
  row(W, ".", [[3, 4, "a"], [7, 8, "a"]]),
  row(W, ".", [[3, 3, "a"], [8, 8, "a"]]),
  row(W, ".", [[3, 3, "a"], [8, 8, "a"]]),
  row(W, ".", [[2, 9, "y"]]),
  row(W, ".", [[2, 9, "y"], [5, 6, "z"]]),
  row(W, ".", [[2, 9, "y"], [5, 6, "z"]]),
  row(W, ".", [[2, 9, "y"]]),
  row(W, ".", [[2, 9, "y"]]),
  row(W, ".", [[2, 9, "y"]]),
  row(W, ".", []),
  row(W, ".", []),
];

export const LOCK_PALETTE: PixelPalette = {
  a: "#7c8ab8", // shackle
  y: "#4a5578", // body
  z: "#1b2244", // keyhole
};
