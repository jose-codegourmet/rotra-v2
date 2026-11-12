/** Seeded randomness for the simulations (mulberry32, no dependencies). Every run logs its seed. */
export type Rng = {
  readonly seed: number
  /** [0, 1) */
  next: () => number
  /** Whole number in [min, max], both included. */
  int: (min: number, max: number) => number
  chance: (p: number) => boolean
  pick: <T>(items: readonly T[]) => T
  shuffle: <T>(items: readonly T[]) => T[]
  /** `k` different items. */
  sample: <T>(items: readonly T[], k: number) => T[]
  /** An independent stream derived from this seed and a label (stable across code changes). */
  fork: (label: string) => Rng
}

export function hashSeed(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const shuffle = <T>(items: readonly T[]) => {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[out[i], out[j]] = [out[j] as T, out[i] as T]
    }
    return out
  }
  return {
    seed: seed >>> 0,
    next,
    int,
    chance: (p) => next() < p,
    pick: (items) => {
      if (!items.length) throw new Error('[sim] pick from an empty list')
      return items[Math.floor(next() * items.length)] as (typeof items)[number]
    },
    shuffle,
    sample: (items, k) => shuffle(items).slice(0, Math.max(0, k)),
    fork: (label) => createRng(hashSeed(`${seed}:${label}`)),
  }
}
