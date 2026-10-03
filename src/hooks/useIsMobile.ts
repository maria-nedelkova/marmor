import { useEffect, useState } from "react";

const QUERY = "(max-width: 640px)";

/** Whether the VIEWPORT is phone-sized. Not the same question as "is the
 * game in its one-column layout" — a theme can ask for that column at any
 * width (see themes/themes.ts), so App combines this with the theme and
 * publishes the answer as data-layout. Use that attribute in CSS; this hook
 * is only one of its two inputs. */
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
