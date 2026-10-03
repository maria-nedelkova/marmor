import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THEME, getTheme, isThemeId } from "../themes/themes";
import type { ThemeDef, ThemeId } from "../themes/themes";

const KEY = "marmor.theme";

/** localStorage, NOT the sessionStorage the run snapshot uses. The two are
 * deliberately different: a run is one sitting, but which skin you prefer is
 * a setting, and having to re-pick it every visit would make trying themes
 * annoying in exactly the way this system exists to avoid. */
function readStored(): ThemeId | null {
  try {
    const stored = localStorage.getItem(KEY);
    return isThemeId(stored) ? stored : null;
  } catch {
    return null; // Safari private mode throws on first access.
  }
}

/** `?theme=throne` wins over the stored value for this page load without
 * overwriting it — the point is to be able to send yourself a link, look at a
 * theme on a real phone, and still have your own choice intact afterwards. */
function initialTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  if (isThemeId(fromUrl)) return fromUrl;
  return readStored() ?? DEFAULT_THEME;
}

export function useTheme(): { theme: ThemeDef; setTheme: (id: ThemeId) => void } {
  const [themeId, setThemeId] = useState<ThemeId>(initialTheme);

  // Written to the root element rather than held only in React, because the
  // themes' own stylesheets are plain CSS keyed on this attribute — which is
  // what lets a theme restyle things React never renders, like body.
  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // Storage disabled or full. The theme still applies for this session.
    }
  }, []);

  return { theme: getTheme(themeId), setTheme };
}
