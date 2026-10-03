// Themes: a way to try a new look without throwing the old one away.
//
// A theme is an id written to `document.documentElement.dataset.theme` plus a
// stylesheet of `[data-theme="<id>"]` rules that override the base styles in
// style.css. The base styles are the "classic" theme and carry no attribute
// selector at all, which is what guarantees that adding themes can never
// change how classic looks — there is nothing to get wrong, because classic
// is simply what style.css already said.
//
// The one thing a theme gets to decide structurally is `vertical`, because
// that choice has to be made in JS (the mascots take a `compact` prop, and no
// media query can set a React prop). Everything else a theme wants is CSS.

export type ThemeId = "classic" | "pixelart";

export interface ThemeDef {
  id: ThemeId;
  /** Shown in the theme switcher. */
  label: string;
  /** One line on what this theme is going for. */
  blurb: string;
  /** Force the one-column layout at every width, instead of only on a phone.
   * A theme built around a portrait backdrop needs the game to stay in a
   * portrait column on a desktop monitor too. */
  vertical: boolean;
  /** Show the duellists as drawn portraits in a card rather than as the
   * hand-authored sprites on their pedestals. Like `vertical`, this has to
   * be a flag rather than CSS, because it changes what DuelMascot renders. */
  portraits: boolean;
}

export const THEMES: ThemeDef[] = [
  {
    id: "classic",
    label: "Classic",
    blurb: "Neon on black. Wide on desktop, one column on a phone.",
    vertical: false,
    portraits: false,
  },
  {
    id: "pixelart",
    label: "Pixel art",
    blurb: "A pixel-art hall behind a minimal, mostly-transparent board.",
    vertical: true,
    portraits: true,
  },
];

export const DEFAULT_THEME: ThemeId = "classic";

export function getTheme(id: string | null | undefined): ThemeDef {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((theme) => theme.id === value);
}
