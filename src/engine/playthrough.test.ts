import { describe, expect, it } from 'vitest'
import { CARD_CATALOG } from '../data/cards'
import { decideAi } from './ai'
import { drainAuto, reduce, startGame, type GameAction } from './game'
import { createRngFromExactState } from './rng'
import type { GameState } from './types'

function stepAutoplay(state: GameState): GameState {
  if (state.phase === 'playerDraw') return drainAuto(reduce(state, { type: 'DRAW' }))
  if (state.phase === 'preview') return drainAuto(reduce(state, { type: 'SKIP_PREVIEW' }))
  if (state.phase === 'dealing') return drainAuto(reduce(state, { type: 'DEAL_DONE' }))
  if (state.phase === 'review') {
    return drainAuto(reduce(state, { type: 'FINISH_REVIEW' }))
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

function authoritativeCardIds(state: GameState): string[] {
  return [
    ...state.deck,
    ...state.players.flatMap((player) => player.hand),
    ...state.players.flatMap((player) => player.discards),
    ...state.players.flatMap((player) => player.completed.flatMap((entry) => entry.yaku.cards)),
  ].map((card) => card.id)
}

function assertCardConservation(state: GameState, expectedCount: number) {
  const ids = authoritativeCardIds(state)
  expect(ids).toHaveLength(expectedCount)
  expect(new Set(ids).size).toBe(expectedCount)
}

function runAutoplay(seed: number, difficulty: 'easy' | 'normal') {
  let state = startGame({ seed, aiDifficulty: difficulty, lessonId: 'a-na', skipPreview: true })
  const expectedCount = Object.values(state.deckManifest ?? {}).reduce((sum, count) => sum + count, 0)
  assertCardConservation(state, expectedCount)

  let guard = 0
  while (state.phase !== 'gameOver' && guard < 800) {
    const next = stepAutoplay(state)
    if (next === state) break
    expect(next.turnNumber).toBeGreaterThanOrEqual(state.turnNumber)
    assertCardConservation(next, expectedCount)
    state = next
    guard += 1
  }
  return state
}

describe('完整自動對局', () => {
  it('完整牌庫為 285 張且 id 不重複', () => {
    expect(CARD_CATALOG).toHaveLength(285)
    expect(new Set(CARD_CATALOG.map((c) => c.id)).size).toBe(285)
  })

  it.each([
    ['easy', 20260814],
    ['normal', 20260926],
  ] as const)('%s 難度能完整跑到終局，且全程維持牌張守恆與唯一 ID', (difficulty, seed) => {
    const state = runAutoplay(seed, difficulty)
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
