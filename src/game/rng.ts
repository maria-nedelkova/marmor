// Seeded PRNG (mulberry32), used instead of the browser's global
// `Math.random`. Some privacy / anti-fingerprinting extensions shim
// `Math.random` to return degenerate values (observed: always 0), which
// silently breaks anything that relies on real randomness — a spawn picker
// that indexes into an array with `Math.floor(Math.random() * n)` degrades
// to always picking index 0, filling the board in row-major order instead
// of scattering marbles. See docs/LEARNINGS.md.
//
// This generator seeds itself once from crypto.getRandomValues (falling
// back to a timestamp mix if crypto is ever unavailable) and then runs
// entirely in plain JS, so it doesn't depend on Math.random at all.

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromCrypto(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0]!;
  }
  return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
}

/** Wrapped in a mutable object (rather than a bare function export) so tests
 * can substitute a deterministic sequence, the same way code used to
 * monkey-patch the global Math.random. */
export const rng = { random: mulberry32(seedFromCrypto()) };
