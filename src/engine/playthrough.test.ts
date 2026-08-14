import { describe, expect, it } from 'vitest'
import { CARD_CATALOG } from '../data/cards'
import { decideAi } from './ai'
import { drainAuto, reduce, startGame, type GameAction } from './game'
import { createRngFromExactState } from './rng'
import type { GameState } from './types'

function stepAutoplay(state: GameState): GameState {
  if (state.phase === 'playerDraw') return drainAuto(reduce(state, { type: 'DRAW' }))
  if (state.phase === 'dealing') return drainAuto(reduce(state, { type: 'DEAL_DONE' }))
  if (state.phase === 'pronunciation') {
    return drainAuto(reduce(state, { type: 'FINISH_PRONUNCIATION' }))
  }

  const rng = createRngFromExactState(state.rngState)
  const asAi: GameState = {
    ...state,
    players: state.players.map((p) => ({ ...p, kind: 'ai' as const })),
  }
  const action: GameAction | null = decideAi(asAi, rng)
  if (!action) return state
  const synced = reduce(state, { type: 'SYNC_RNG', rngState: rng.getState() })
  return drainAuto(reduce(synced, action))
}

describe('完整自動對局', () => {
  it('牌庫為 75 張且 id 不重複', () => {
    expect(CARD_CATALOG).toHaveLength(75)
    expect(new Set(CARD_CATALOG.map((c) => c.id)).size).toBe(75)
  })

  it('能從開局自動進行到遊戲結束並產生排名', () => {
    let state = startGame({ seed: 20260814, aiDifficulty: 'easy' })
    let guard = 0
    while (state.phase !== 'gameOver' && guard < 800) {
      const next = stepAutoplay(state)
      if (next === state) break
      state = next
      guard += 1
    }
    expect(state.phase).toBe('gameOver')
    expect(state.rankings).toHaveLength(4)
    expect(state.rankings?.[0]?.place).toBe(1)
    expect(state.players.every((p) => p.gold >= 0)).toBe(true)
    expect(state.gameOverReason === 'deck' || state.gameOverReason === 'gold').toBe(true)
    if (state.gameOverReason === 'deck') {
      expect(state.deck).toHaveLength(0)
    }
    if (state.gameOverReason === 'gold') {
      expect(state.players.some((p) => p.gold === 0)).toBe(true)
    }
  })
})
