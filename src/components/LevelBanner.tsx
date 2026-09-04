import type { LevelConfig } from "../game/levels";

interface LevelBannerProps {
  level: LevelConfig;
  index: number;
  count: number;
}

/** Replaces the old static tagline under the title. The round number gives
 * progress a visible place to live, and the level's `twist` line names what
 * changed this round — without it a new level just feels like the same game
 * having a worse day, which is exactly the feeling a ladder needs to avoid. */
export function LevelBanner({ level, index, count }: LevelBannerProps) {
  return (
    <div className="level-banner">
      <p className="level-banner__heading">
        <span className="level-banner__round">
          Round {index + 1}/{count}
        </span>
        <span className="level-banner__name">{level.name}</span>
      </p>
      <p className="titlebar__sub">{level.twist}</p>
    </div>
  );
}
