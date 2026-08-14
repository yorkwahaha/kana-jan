/**
 * 可重現的亂數來源。所有洗牌、Bonus、起始玩家、AI 機率都必須走這裡。
 * 使用 Mulberry32，給定同一個 seed 會得到相同序列。
 */
export interface Rng {
  next(): number
  nextInt(maxExclusive: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
  getState(): number
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0
  if (state === 0) state = 0x9e3779b9

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    nextInt(maxExclusive: number) {
      if (maxExclusive <= 0) return 0
      return Math.floor(next() * maxExclusive)
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('Cannot pick from empty list')
      return items[Math.floor(next() * items.length)] as T
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        const tmp = copy[i] as T
        copy[i] = copy[j] as T
        copy[j] = tmp
      }
      return copy
    },
    getState() {
      return state >>> 0
    },
  }
}

export function rngFromState(state: number): Rng {
  const rng = createRng(1)
  // Recreate with exact state by wrapping
  return createRngFromExactState(state >>> 0) ?? rng
}

function createRngFromExactState(state: number): Rng {
  let s = state >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    nextInt(maxExclusive: number) {
      if (maxExclusive <= 0) return 0
      return Math.floor(next() * maxExclusive)
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('Cannot pick from empty list')
      return items[Math.floor(next() * items.length)] as T
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        const tmp = copy[i] as T
        copy[i] = copy[j] as T
        copy[j] = tmp
      }
      return copy
    },
    getState() {
      return s >>> 0
    },
  }
}

export { createRngFromExactState }
