/** Builds a fixed-width pixel-art row from fill ranges, so row width is
 * guaranteed correct by construction instead of by manually counting characters. */
export function row(width: number, base: string, fills: [number, number, string][]): string {
  const cells = Array<string>(width).fill(base);
  for (const [start, end, ch] of fills) {
    for (let i = start; i <= end; i++) cells[i] = ch;
  }
  return cells.join("");
}

/** Mirrors a left-half row (inclusive of the center column(s)) into a full
 * symmetric row of the given total width. */
export function mirror(leftHalf: string, width: number): string {
  const rightHalf = [...leftHalf].reverse().join("");
  const full = leftHalf + rightHalf;
  return full.length === width ? full : full.padEnd(width, full.at(-1));
}
