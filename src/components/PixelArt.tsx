export type PixelPalette = Record<string, string>;

interface PixelArtProps {
  rows: string[];
  palette: PixelPalette;
  pixelSize?: number;
  className?: string;
  label?: string;
}

/** Renders a hand-authored pixel-art sprite from row-strings of palette-index
 * characters (e.g. "..gg.." → transparent/transparent/gold/gold/...). Original,
 * code-generated art — no image assets. */
export function PixelArt({ rows, palette, pixelSize = 6, className, label }: PixelArtProps) {
  const width = rows[0]?.length ?? 0;
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${width}, ${pixelSize}px)`,
        gridTemplateRows: `repeat(${rows.length}, ${pixelSize}px)`,
        lineHeight: 0,
      }}
    >
      {rows.flatMap((row, r) =>
        [...row].map((ch, c) => (
          <span
            key={`${r}-${c}`}
            style={{
              width: pixelSize,
              height: pixelSize,
              background: palette[ch] ?? "transparent",
            }}
          />
        )),
      )}
    </div>
  );
}
