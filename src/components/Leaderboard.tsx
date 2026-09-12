import { LEVEL_COUNT } from "../game/levels";
import { isFinisher, reachedLabel } from "../game/score";
import type { RunEntry } from "../game/score";
import { Button3D } from "./Button3D";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/8bit/dialog";

interface LeaderboardProps {
  open: boolean;
  entries: RunEntry[];
  /** Highlights the current player's row, wherever it lands. */
  playerId: string | null;
  onClose: () => void;
}

const VISIBLE_ROWS = 10;

/** The Hall of Pretenders.
 *
 * Ordering is `progressOf` then fewest moves (see game/score.ts), which puts
 * everyone who finished the ladder at the top ranked purely on efficiency,
 * and everyone else below them ordered by how far they got. SCORE is shown
 * because it's the number players actually feel, but it is deliberately not
 * what they're ranked on — it carries last-clear luck. */
export function Leaderboard({ open, entries, playerId, onClose }: LeaderboardProps) {
  const top = entries.slice(0, VISIBLE_ROWS);
  const playerRank = playerId ? entries.findIndex((e) => e.id === playerId) : -1;
  // If the player didn't make the visible cut, their row is appended so they
  // can always find themselves — the single most-looked-for row on any board.
  const trailing = playerRank >= VISIBLE_ROWS ? entries[playerRank]! : null;

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="game-dialog leaderboard-dialog">
        <DialogHeader>
          <DialogTitle className="leaderboard__title">Hall of Pretenders</DialogTitle>
        </DialogHeader>

        <p className="leaderboard__rule">
          Finishers ranked by fewest moves &middot; everyone else by how far they got
        </p>

        {entries.length === 0 ? (
          <p className="leaderboard__empty">
            No challengers yet. Dethrone the King and put your name up first.
          </p>
        ) : (
          <div className="leaderboard__scroll">
            <table className="leaderboard__table">
              <thead>
                <tr>
                  <th scope="col" className="leaderboard__num">
                    #
                  </th>
                  <th scope="col">Pretender</th>
                  <th scope="col">Reached</th>
                  <th scope="col" className="leaderboard__num">
                    Moves
                  </th>
                  <th scope="col" className="leaderboard__num">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {top.map((entry, i) => (
                  <Row key={entry.id} entry={entry} rank={i + 1} isPlayer={entry.id === playerId} />
                ))}
                {trailing && (
                  <>
                    <tr className="leaderboard__gap">
                      <td colSpan={5}>&middot; &middot; &middot;</td>
                    </tr>
                    <Row entry={trailing} rank={playerRank + 1} isPlayer />
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button3D className="dialog-btn" onClick={onClose}>
            Close
          </Button3D>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ entry, rank, isPlayer }: { entry: RunEntry; rank: number; isPlayer: boolean }) {
  const done = isFinisher(entry);
  const classes = ["leaderboard__row"];
  if (isPlayer) classes.push("is-player");
  if (rank <= 3) classes.push("is-podium");

  return (
    <tr className={classes.join(" ")}>
      <td className="leaderboard__num">{rank}</td>
      <td className="leaderboard__name">{entry.name}</td>
      <td className={done ? "leaderboard__done" : undefined}>
        {done ? `${LEVEL_COUNT}/${LEVEL_COUNT} ♛` : reachedLabel(entry)}
      </td>
      <td className={`leaderboard__num${done ? " leaderboard__moves" : ""}`}>{entry.moves}</td>
      <td className="leaderboard__num leaderboard__score">{entry.score}</td>
    </tr>
  );
}
