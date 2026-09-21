import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_PROFILE, loadProfile, settleMatch } from './profile'

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

  it('並列第一名不發冠軍獎金、不加勝場，並保留連勝', () => {
    settleMatch(1, 'win-1')
    const tied = settleMatch(1, 'tie-2', { tiedForFirst: true })
    expect(tied.netGold).toBe(0)
    expect(tied.nextGold).toBe(INITIAL_PROFILE.gold + 50)
    expect(tied.nextStreak).toBe(1)

    const profile = loadProfile()
    expect(profile.wins).toBe(1)
    expect(profile.streak).toBe(1)
    expect(profile.gamesPlayed).toBe(2)
    expect(profile.gold).toBe(INITIAL_PROFILE.gold + 50)
  })

  it('開局即平手時不會把第一名獎金灌進個人檔', () => {
    const tied = settleMatch(1, 'opening-tie', { tiedForFirst: true })
    expect(tied.netGold).toBe(0)
    expect(tied.nextStreak).toBe(0)
    const profile = loadProfile()
    expect(profile.wins).toBe(0)
    expect(profile.gold).toBe(INITIAL_PROFILE.gold)
    expect(profile.gamesPlayed).toBe(1)
  })
})
