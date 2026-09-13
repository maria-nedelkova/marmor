import { BookOpen, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Button3D } from "./Button3D";
import { useEffect, useRef, useState } from "react";
import type { LevelConfig } from "../game/levels";

interface GameMenuProps {
  open: boolean;
  level: LevelConfig;
  roundNumber: number;
  roundCount: number;
  onClose: () => void;
  onRestartRound: () => void;
  onNewGame: () => void;
  onOpenLeaderboard: () => void;
}

/** The pause menu, laid out like a console/Minecraft-style pause screen: a
 * wide banner naming where you are, one wide primary action, then paired
 * secondary actions.
 *
 * Built as a plain fixed overlay rather than on the 8bitcn Dialog the other
 * overlays use. Two reasons: it wants the game's own dark palette (dialog
 * surfaces are light — see ARCHITECTURE.md), and it wants to read as a layer
 * dropped over the board rather than as a card floating above a dimmed page.
 * The accessibility affordances a Dialog would have supplied (escape to
 * close, focus into the panel, aria-modal) are therefore wired up by hand
 * below — this is the trade, not an oversight. */
export function GameMenu({
  open,
  level,
  roundNumber,
  roundCount,
  onClose,
  onRestartRound,
  onNewGame,
  onOpenLeaderboard,
}: GameMenuProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes the info card first, then the menu — so the key always
  // dismisses exactly the topmost layer rather than the whole stack.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (infoOpen) setInfoOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, infoOpen, onClose]);

  // A fresh open always starts on the menu itself, never on whatever card
  // was showing when it was last closed.
  useEffect(() => {
    if (!open) setInfoOpen(false);
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="menu-overlay"
      onClick={(e) => {
        // Backdrop only — a click that started inside the panel shouldn't
        // dismiss the menu just because it ended on the overlay.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Game menu"
        tabIndex={-1}
        ref={panelRef}
      >
        {/* The round's name and twist used to sit under the title on the
            main screen. This banner is now their only home, so it carries
            the twist line too — otherwise "what changed this round?" would
            have no answer anywhere in the UI. */}
        <div className="menu-banner">
          <p className="menu-banner__heading">
            <span className="menu-banner__round">
              Round {roundNumber}/{roundCount}
            </span>
            <span className="menu-banner__name">{level.name}</span>
          </p>
          <p className="menu-banner__twist">{level.twist}</p>
        </div>

        {/* No icon here on purpose: it's the one action that resumes rather
            than navigates, and staying unadorned keeps it distinct from the
            four labelled options below. */}
        <Button3D className="menu-item menu-item--wide" onClick={onClose}>
          Back to game
        </Button3D>

        <div className="menu-grid">
          <Button3D className="menu-item" onClick={onRestartRound}>
            <RotateCcw className="menu-item__icon" size={16} aria-hidden="true" />
            <span>Restart round</span>
          </Button3D>
          <Button3D className="menu-item" onClick={onNewGame}>
            <Sparkles className="menu-item__icon" size={16} aria-hidden="true" />
            <span>New game</span>
          </Button3D>
          <Button3D className="menu-item" onClick={() => setInfoOpen(true)}>
            <BookOpen className="menu-item__icon" size={16} aria-hidden="true" />
            <span>How to play</span>
          </Button3D>
          {/* Shortened from "Hall of Pretenders", which wrapped to two lines
              and left this cell taller and busier than its three neighbours.
              The dialog it opens is still titled in full, so the flavour name
              isn't lost — and the joke arguably lands better cropped: a whole
              hall of people who each insist they're the rightful king. */}
          <Button3D className="menu-item" onClick={onOpenLeaderboard}>
            <Trophy className="menu-item__icon" size={16} aria-hidden="true" />
            <span>Pretenders</span>
          </Button3D>
        </div>
      </div>

      {infoOpen && <InfoCard onClose={() => setInfoOpen(false)} />}
    </div>
  );
}

/** The rules card. This text used to sit permanently under the board; it's
 * on demand now, which is why it can afford to say more than the single
 * line that fitted there. */
function InfoCard({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="info-card__scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="info-card" role="dialog" aria-modal="true" aria-label="How to play">
        <h2 className="info-card__title">How to play</h2>
        {/* Kept deliberately terse — this has to fit a phone screen without
            scrolling, and every line here is read once. The long-form
            version lived under the board and had the room; this doesn't. */}
        <ul className="info-card__list">
          <li>Tap a marble, then an empty cell. Marbles walk — they can&rsquo;t jump.</li>
          <li>Line up 5+ of one colour, any direction, to clear and score.</li>
          <li>Clearing is a free turn. Otherwise marbles drop — see &ldquo;Next up&rdquo;.</li>
          <li>Hit 100 to win the round. Fill the board and you lose it.</li>
        </ul>
        <Button3D className="menu-item menu-item--wide" onClick={onClose}>
          Got it
        </Button3D>
      </div>
    </div>
  );
}
