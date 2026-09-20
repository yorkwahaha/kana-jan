import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_PROFILE, settleMatch } from './profile'

const memory = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value)
  },
  removeItem: (key: string) => {
    memory.delete(key)
  },
  clear: () => {
    memory.clear()
  },
}

describe('settleMatch', () => {
  beforeEach(() => {
    memory.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    })
  })

  afterEach(() => {
    memory.clear()
  })

  it('同一 matchId 重複呼叫不會再發放金幣', () => {
    const first = settleMatch(1, 'match-a')
    expect(first.netGold).toBe(50)
    expect(first.nextGold).toBe(INITIAL_PROFILE.gold + 50)

    const second = settleMatch(1, 'match-a')
    expect(second).toEqual(first)
    expect(second.nextGold).toBe(INITIAL_PROFILE.gold + 50)
  })

  it('不同對局會各自結算', () => {
    settleMatch(1, 'match-a')
    const next = settleMatch(2, 'match-b')
    expect(next.place).toBe(2)
    expect(next.netGold).toBe(20)
    expect(next.prevGold).toBe(INITIAL_PROFILE.gold + 50)
  })
})
