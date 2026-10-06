import { useEffect, useState } from "react";

const QUERY = "(max-width: 640px)";

/** Whether the viewport is phone-sized, which is what puts the game in its
 * one-column layout. App publishes the answer as `data-layout` on the root;
 * match that attribute in CSS rather than re-declaring the media query, so
 * the stylesheet and the mascots' `compact` prop can never disagree. */
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
