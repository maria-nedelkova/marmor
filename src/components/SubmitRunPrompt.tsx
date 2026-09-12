import { useState } from "react";
import { MAX_NAME_LENGTH, sanitizeName } from "../leaderboard/store";
import { Button3D } from "./Button3D";

interface SubmitRunPromptProps {
  defaultName: string;
  onSubmit: (name: string) => void;
}

/** Name entry, rendered inside the win / game-over dialogs rather than as a
 * dialog of its own — stacking a second modal on the celebration is the
 * quickest way to make people dismiss both without reading either. */
export function SubmitRunPrompt({ defaultName, onSubmit }: SubmitRunPromptProps) {
  // Per-run freshness comes from the caller's `key`, NOT from an effect
  // watching `defaultName`. Submitting updates the stored player name, so a
  // `[defaultName]` effect would fire on submit and immediately reset the
  // component back out of its confirmation state.
  const [name, setName] = useState(defaultName);
  const [submitted, setSubmitted] = useState(false);
  // Skipping is purely this component's business — it hides its own form and
  // leaves the surrounding dialog (quip, Retry, Start over) alone. It was
  // briefly an `onSkip` prop, which the caller wired to the leaderboard's
  // close handler; that dialog is never open at this point, so the link did
  // nothing at all.
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (submitted) {
    return <p className="submit-run__done">Recorded in the Hall of Pretenders.</p>;
  }

  const commit = () => {
    setSubmitted(true);
    onSubmit(sanitizeName(name));
  };

  return (
    <form
      className="submit-run"
      onSubmit={(e) => {
        e.preventDefault();
        commit();
      }}
    >
      <label className="submit-run__label" htmlFor="pretender-name">
        Name for the leaderboard
      </label>
      <div className="submit-run__row">
        <input
          id="pretender-name"
          className="submit-run__input"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
        />
        <Button3D className="dialog-btn" type="submit">
          Submit
        </Button3D>
      </div>
      <button type="button" className="submit-run__skip" onClick={() => setDismissed(true)}>
        skip
      </button>
    </form>
  );
}
