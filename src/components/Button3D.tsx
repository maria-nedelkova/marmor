import type { ButtonHTMLAttributes } from "react";
import { playButtonClick, primeAudio } from "../audio/sound";

interface Button3DProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Extra classes on top of `btn3d` — e.g. `menu-item`, `topbar__btn`. */
  className?: string;
}

/** A button wearing the shared `.btn3d` bevel, with the press sound attached.
 *
 * It exists so the click sound is wired once rather than on every call site;
 * a forgotten handler on one button out of eight is exactly the kind of
 * inconsistency nobody notices until it feels broken.
 *
 * The sound fires on **pointerdown**, not click: the bevel inverts on
 * :active (i.e. on press), so playing at mouseup would visibly decouple the
 * clack from the button moving. Keyboard activation doesn't produce pointer
 * events at all, so Enter/Space are handled separately — without that, the
 * menu would be silent for anyone navigating it by keyboard. */
export function Button3D({ className, onPointerDown, onKeyDown, ...rest }: Button3DProps) {
  return (
    <button
      type="button"
      className={className ? `btn3d ${className}` : "btn3d"}
      onPointerDown={(e) => {
        // Also the first user gesture in many sessions (the menu can be
        // opened before a single marble is touched), and an AudioContext
        // only starts from one — so prime it here as well as on the board.
        primeAudio();
        playButtonClick();
        onPointerDown?.(e);
      }}
      onKeyDown={(e) => {
        if (!e.repeat && (e.key === "Enter" || e.key === " ")) {
          primeAudio();
          playButtonClick();
        }
        onKeyDown?.(e);
      }}
      {...rest}
    />
  );
}
