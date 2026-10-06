import { useEffect, useState } from "react";
import { LEVELS } from "../game/levels";

interface DevPanelProps {
  levelIndex: number;
  onJump: (index: number) => void;
  onWinRound: () => void;
  onFillBoard: () => void;
}

/** Only ever true on a local dev server, or when `?dev` is explicitly in the
 * URL. Checked once at module load rather than per render — it can't change
 * without a navigation, and a stable value keeps the panel out of the React
 * tree entirely (not merely hidden with CSS) for real players. */
export function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname, search } = window.location;
  if (new URLSearchParams(search).has("dev")) return true;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** Keeps `?round=N` in the address bar in step with the round you jumped to,
 * so reloading (or copying the URL to a phone) lands on the same round.
 * replaceState rather than pushState: round-hopping while testing shouldn't
 * fill up the back button. */
function syncRoundParam(index: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("round", String(index + 1));
  window.history.replaceState(null, "", url);
}

/** A testing-only round switcher: jump to any round, force a win, or force a
 * loss, without playing the rounds in between. Both end states are otherwise
 * slow to reach on purpose, which makes the transitions around them (the
 * round-cleared dialog, the retry flow) the least-tested part of the game. */
export function DevPanel({ levelIndex, onJump, onWinRound, onFillBoard }: DevPanelProps) {
  const [open, setOpen] = useState(true);

  const jump = (index: number) => {
    if (index < 0 || index >= LEVELS.length) return;
    onJump(index);
    syncRoundParam(index);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The game itself is pointer-only, so no shortcut here can collide
      // with playing it — but modifier combos still belong to the browser.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= "1" && e.key <= String(Math.min(9, LEVELS.length))) {
        jump(Number(e.key) - 1);
      } else if (e.key === "[") {
        jump(levelIndex - 1);
      } else if (e.key === "]") {
        jump(levelIndex + 1);
      } else if (e.key.toLowerCase() === "w") {
        onWinRound();
      } else if (e.key.toLowerCase() === "f") {
        onFillBoard();
      } else if (e.key === "`") {
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [levelIndex, onJump, onWinRound, onFillBoard]);

  if (!open) {
    return (
      <button type="button" className="devpanel devpanel--collapsed" onClick={() => setOpen(true)}>
        dev
      </button>
    );
  }

  return (
    <div className="devpanel">
      <div className="devpanel__header">
        <span className="devpanel__title">dev</span>
        <button type="button" className="devpanel__close" onClick={() => setOpen(false)} aria-label="Hide dev panel">
          ×
        </button>
      </div>

      <div className="devpanel__rounds">
        {LEVELS.map((level, i) => (
          <button
            key={level.name}
            type="button"
            className={`devpanel__round${i === levelIndex ? " is-active" : ""}`}
            onClick={() => jump(i)}
            title={`${level.name} — ${level.twist}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <p className="devpanel__level">{LEVELS[levelIndex]?.name}</p>

      <div className="devpanel__actions">
        <button type="button" className="devpanel__action" onClick={onWinRound}>
          Win round
        </button>
        <button type="button" className="devpanel__action" onClick={onFillBoard}>
          Fill board
        </button>
      </div>

      <p className="devpanel__keys">1–8 round · [ ] prev/next · w win · f lose · ` hide</p>
    </div>
  );
}
