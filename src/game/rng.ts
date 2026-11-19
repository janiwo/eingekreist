/**
 * Small seeded PRNG (mulberry32). Its whole state is one 32-bit integer, so the game state can
 * store it and a reload continues the same random sequence.
 */
export type RngState = number

/** Returns a float in [0, 1) and the next state. Pure. */
export function nextRandom(state: RngState): [value: number, next: RngState] {
  const next = (state + 0x6d2b79f5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Draws an integer in [0, n) and the next state. */
export function nextInt(state: RngState, n: number): [value: number, next: RngState] {
  const [r, next] = nextRandom(state)
  return [Math.floor(r * n), next]
}

/** A fresh random seed for a new game (not used by tests, which pass their own). */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] | 0
}
