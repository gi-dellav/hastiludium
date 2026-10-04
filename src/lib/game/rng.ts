/**
 * Tiny deterministic PRNG. Pure: callers thread the returned `state` back into
 * `GameState.rngState` so reducers stay side-effect free and `bun test`-able.
 *
 * Algorithm: splitmix32. Not cryptographic — game RNG only.
 */
export interface Roll {
  readonly value: number;
  readonly state: number;
}

/** Advance the state once; `value` is in `[0, 1)`. */
export function nextRandom(state: number): Roll {
  let z = (state + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  z ^= z >>> 15;
  return { value: (z >>> 0) / 4294967296, state: z | 0 };
}

/** Advance the state and return an integer in `[0, maxExclusive)`. */
export function nextInt(state: number, maxExclusive: number): { value: number; state: number } {
  const roll = nextRandom(state);
  const span = Math.max(1, Math.floor(maxExclusive));
  return { value: Math.floor(roll.value * span), state: roll.state };
}

/** Non-deterministic seed for a fresh match. */
export function randomSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) | 0;
}

/** In-place-free Fisher–Yates over a copy, seeded by the threaded state. */
export function shuffle<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const out = [...items];
  let cursor = state;
  for (let i = out.length - 1; i > 0; i -= 1) {
    const roll = nextInt(cursor, i + 1);
    cursor = roll.state;
    const j = roll.value;
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return { items: out, state: cursor };
}
