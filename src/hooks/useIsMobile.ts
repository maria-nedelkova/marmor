import { useEffect, useState } from "react";

const QUERY = "(max-width: 640px)";

/** Mirrors the CSS breakpoint that switches to the compact mobile layout
 * (see the max-width: 640px block in style.css) — kept as one shared
 * constant so the JS- and CSS-driven halves of that layout can't drift out
 * of sync with each other. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
