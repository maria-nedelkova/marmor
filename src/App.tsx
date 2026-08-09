import { useEffect, useRef, useState } from "react";
import { setMuted } from "./audio/sound";
import { Board } from "./components/Board";
import type { BoardHandle } from "./components/Board";
import { DuelMascot } from "./components/DuelMascot";
import { DuelProgress } from "./components/DuelProgress";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { MarmorTitle } from "./components/MarmorTitle";
import { TopBar } from "./components/TopBar";
import { WinOverlay } from "./components/WinOverlay";
import { KING_SCORE } from "./game/constants";
import { KING_PALETTE, KING_ROWS } from "./game/sprites/king";
import { PRETENDER_PALETTE, PRETENDER_ROWS } from "./game/sprites/pretender";
import { useGame } from "./hooks/useGame";
import { useIsMobile } from "./hooks/useIsMobile";

export function App() {
  const boardRef = useRef<BoardHandle>(null);
  const game = useGame(boardRef);
  const [muted, setMutedState] = useState(false);
  const boardWrapRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (game.shakeToken === 0) return;
    const el = boardWrapRef.current;
    if (!el) return;
    el.classList.remove("shake");
    void el.offsetWidth; // force reflow so the animation restarts on repeated clears
    el.classList.add("shake");
  }, [game.shakeToken]);

  const toggleMute = () => {
    setMutedState((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  };

  return (
    <div className="table">
      <header className="titlebar">
        <MarmorTitle />
        <p className="titlebar__sub">Dethrone the King. Line up five or more to climb the score.</p>
      </header>

      <TopBar
        nextQueue={game.nextQueue}
        muted={muted}
        onToggleMute={toggleMute}
        onNewGame={game.newGame}
      />

      <main className="layout">
        <DuelMascot
          name="King"
          rows={KING_ROWS}
          palette={KING_PALETTE}
          score={KING_SCORE}
          accent="#e8c14a"
          side="left"
          heightRatio={1}
          falling={game.won}
          compact={isMobile}
        />

        <section className="board-wrap" ref={boardWrapRef}>
          <Board
            ref={boardRef}
            board={game.board}
            selected={game.selected}
            reachable={game.reachable}
            poppingKeys={game.poppingKeys}
            spawningKeys={game.spawningKeys}
            onCellClick={game.handleCellClick}
          />
          <GameOverOverlay visible={game.gameOver} score={game.score} onRestart={game.newGame} />
          <WinOverlay visible={game.won} score={game.score} onRestart={game.newGame} />
        </section>

        <DuelProgress score={game.score} kingScore={KING_SCORE} />

        <DuelMascot
          name="Pretender"
          rows={PRETENDER_ROWS}
          palette={PRETENDER_PALETTE}
          score={game.score}
          accent="#b34bff"
          side="right"
          heightRatio={game.score / KING_SCORE}
          falling={game.gameOver}
          compact={isMobile}
        />
      </main>

      <p className="hint">Click a marble, then an empty cell. A clear path is required — marbles can&rsquo;t jump.</p>
    </div>
  );
}
