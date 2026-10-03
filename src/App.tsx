import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { playButtonClick, setMuted } from "./audio/sound";
import { Board } from "./components/Board";
import type { BoardHandle } from "./components/Board";
import { DuelMascot } from "./components/DuelMascot";
import { DuelProgress } from "./components/DuelProgress";
import { DevPanel, isDevMode } from "./components/DevPanel";
import { GameMenu } from "./components/GameMenu";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { Leaderboard } from "./components/Leaderboard";
import { LevelClearedOverlay } from "./components/LevelClearedOverlay";
import { MarmorTitle } from "./components/MarmorTitle";
import { SubmitRunPrompt } from "./components/SubmitRunPrompt";
import { ToolBar } from "./components/ToolBar";
import { TopBar } from "./components/TopBar";
import { WinOverlay } from "./components/WinOverlay";
import { KING_SCORE } from "./game/constants";
import { getLevel } from "./game/levels";
import type { RunEntry } from "./game/score";
import { getPlayerId, localLeaderboard } from "./leaderboard/store";
import kingPortrait from "./assets/king-portrait.png";
import pretenderPortrait from "./assets/pretender-portrait.png";
import { KING_PALETTE, KING_ROWS } from "./game/sprites/king";
import { PRETENDER_PALETTE, PRETENDER_ROWS } from "./game/sprites/pretender";
import { useGame } from "./hooks/useGame";
import { useIsMobile } from "./hooks/useIsMobile";
import { useTheme } from "./hooks/useTheme";

export function App() {
  const boardRef = useRef<BoardHandle>(null);
  const game = useGame(boardRef);
  const [muted, setMutedState] = useState(false);
  const boardWrapRef = useRef<HTMLElement>(null);
  const isPhone = useIsMobile();
  const { theme, setTheme } = useTheme();

  // The single place that decides whether the game is in its one-column
  // layout: a phone viewport, or a theme built around a portrait stage. CSS
  // reads it off the root (see data-layout in style.css) and the mascots read
  // it as a prop, so the two halves cannot disagree.
  const isVertical = isPhone || theme.vertical;

  // useLayoutEffect, not useEffect: this attribute selects the whole layout,
  // so landing it after the browser has painted means one frame of the wide
  // layout on every phone load — and worse, any property with a transition
  // then ANIMATES from the wrong value to the right one.
  useLayoutEffect(() => {
    document.documentElement.dataset.layout = isVertical ? "vertical" : "wide";
  }, [isVertical]);

  useEffect(() => {
    if (game.shakeToken === 0) return;
    const el = boardWrapRef.current;
    if (!el) return;
    el.classList.remove("shake");
    void el.offsetWidth; // force reflow so the animation restarts on repeated clears
    el.classList.add("shake");
  }, [game.shakeToken]);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    // Unmuting needs its own confirmation click: Button3D plays the press
    // sound on pointerdown, which is still inside the muted window, so
    // turning sound back on would otherwise be the one button in the UI
    // that never makes a noise. (Computed outside the state updater rather
    // than inside it — an updater that emits sound would fire twice under
    // StrictMode's double-invoke.)
    if (!next) playButtonClick();
  };

  // The final round's clear is the run's actual victory; every earlier one
  // hands off to the next King instead.
  const roundCleared = game.cleared && !game.isFinal;
  const won = game.cleared && game.isFinal;
  // A run ends either way — finishing the ladder or filling the board — and
  // both are worth recording, since the board ranks partial runs too.
  const runOver = won || game.gameOver;

  const [board, setBoard] = useState<RunEntry[]>([]);
  const [boardOpen, setBoardOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playerName, setPlayerName] = useState("ANON");
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    playerIdRef.current = getPlayerId();
    void localLeaderboard.list().then((entries) => {
      setBoard(entries);
      const mine = entries.find((e) => e.id === playerIdRef.current);
      if (mine) setPlayerName(mine.name);
    });
  }, []);

  const submitRun = useCallback(
    (name: string) => {
      const id = playerIdRef.current;
      if (!id) return;
      setPlayerName(name);
      void localLeaderboard
        .submit({
          id,
          name,
          roundsCleared: game.roundsCleared,
          partialPoints: game.partialPoints,
          moves: game.moves,
          score: game.runScore,
          at: Date.now(),
        })
        .then(setBoard);
    },
    [game.roundsCleared, game.partialPoints, game.moves, game.runScore],
  );

  // Flattened to a cell-keyed lookup once per reveal rather than per cell,
  // so the 81 Cells can each ask about themselves without a scan.
  const foreseenColors = useMemo(() => {
    const map = new Map<string, number>();
    game.foreseen?.cells.forEach((cell, i) => {
      const color = game.foreseen!.colors[i];
      if (color !== undefined) map.set(`${cell.r},${cell.c}`, color);
    });
    return map;
  }, [game.foreseen]);

  // Keyed by the run's own outcome so each finished run gets a fresh prompt
  // rather than inheriting the previous one's "already submitted" state.
  const runPrompt = runOver ? (
    <SubmitRunPrompt
      key={`${game.runId}:${game.roundsCleared}:${game.moves}:${game.runScore}`}
      defaultName={playerName}
      onSubmit={submitRun}
    />
  ) : null;

  return (
    <div className="table">
      <header className="titlebar">
        <MarmorTitle />
      </header>

      <main className="layout">
        <DuelMascot
          name="King"
          rows={KING_ROWS}
          palette={KING_PALETTE}
          score={KING_SCORE}
          accent="#e8c14a"
          side="left"
          heightRatio={1}
          falling={game.cleared}
          compact={isVertical}
          portrait={theme.portraits ? kingPortrait : undefined}
        />

        {/* Tools above the board on desktop. On mobile the rack goes below
            the board instead, which this wrapper allows by going
            `display: contents` there — its two children become grid items
            of .layout in their own right and take separate areas. One
            ToolBar either way. */}
        <div className="board-column">
          <ToolBar
            levelIndex={game.levelIndex}
            charges={game.charges}
            activeTool={game.activeTool}
            awaitingSecondPick={game.swapFirst !== null}
            onArm={game.armTool}
            onUse={game.useInstantTool}
          />

          <section className="board-wrap" ref={boardWrapRef}>
            <Board
              ref={boardRef}
              board={game.board}
              selected={game.selected ?? game.swapFirst}
              reachable={game.reachable}
              poppingKeys={game.poppingKeys}
              spawningKeys={game.spawningKeys}
              foreseenColors={foreseenColors}
              onCellClick={game.handleCellClick}
            />
            <GameOverOverlay
              visible={game.gameOver}
              score={game.score}
              levelName={game.level.name}
              roundNumber={game.levelIndex + 1}
              onRetry={game.retryLevel}
              onRestart={game.newGame}
            >
              {runPrompt}
            </GameOverOverlay>
            <LevelClearedOverlay
              visible={roundCleared}
              score={game.score}
              runScore={game.runScore}
              level={game.level}
              nextLevel={getLevel(game.levelIndex + 1)}
              nextRoundNumber={game.levelIndex + 2}
              onNext={game.advanceLevel}
            />
            <WinOverlay
              visible={won}
              score={game.score}
              runScore={game.runScore}
              rounds={game.levelCount}
              onRestart={game.newGame}
            >
              {runPrompt}
            </WinOverlay>
          </section>
        </div>

        {/* The strip between the two mascots. On mobile that strip is the
            progress bar with the controls stacked under it, which is why
            they share a wrapper; on desktop the bar is hidden and the
            wrapper is just the controls row, spanning the full width under
            the board. */}
        <div className="duel-middle">
          <DuelProgress score={game.score} kingScore={KING_SCORE} />
          <TopBar
            nextQueue={game.nextQueue}
            muted={muted}
            pulseToken={game.queuePulse}
            onToggleMute={toggleMute}
            onOpenMenu={() => setMenuOpen(true)}
          />
        </div>

        <DuelMascot
          name="Pretender"
          rows={PRETENDER_ROWS}
          palette={PRETENDER_PALETTE}
          score={game.score}
          accent="#b34bff"
          side="right"
          heightRatio={game.score / KING_SCORE}
          falling={game.gameOver}
          compact={isVertical}
          portrait={theme.portraits ? pretenderPortrait : undefined}
        />
      </main>

      {/* The rules line and the leaderboard link both used to sit here under
          the board; they're menu items now, so the board is the last thing
          on the page. */}
      <GameMenu
        open={menuOpen}
        level={game.level}
        roundNumber={game.levelIndex + 1}
        roundCount={game.levelCount}
        onClose={() => setMenuOpen(false)}
        onRestartRound={() => {
          setMenuOpen(false);
          game.retryLevel();
        }}
        onNewGame={() => {
          setMenuOpen(false);
          game.newGame();
        }}
        onOpenLeaderboard={() => {
          setMenuOpen(false);
          setBoardOpen(true);
        }}
      />

      <Leaderboard
        open={boardOpen}
        entries={board}
        playerId={playerIdRef.current}
        onClose={() => setBoardOpen(false)}
      />

      {isDevMode() && (
        <DevPanel
          levelIndex={game.levelIndex}
          themeId={theme.id}
          onJump={game.devJumpToLevel}
          onWinRound={game.devWinRound}
          onFillBoard={game.devFillBoard}
          onSetTheme={setTheme}
        />
      )}
    </div>
  );
}
