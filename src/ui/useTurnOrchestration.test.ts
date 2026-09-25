import { describe, expect, it } from 'vitest'
import type { PlayerState } from '../engine/types'
import { shouldUseTurnTimeout } from './useTurnOrchestration'

function player(aiDifficulty: PlayerState['aiDifficulty']): PlayerState {
  return {
    id: 'p0',
    name: '小春',
    kind: 'human',
    seat: 0,
    aiDifficulty,
    gold: 1000,
    score: 0,
    hand: [],
    discards: [],
    completed: [],
  }
}

describe('shouldUseTurnTimeout', () => {
  it('入門雀士完全不使用回合倒數', () => {
    expect(shouldUseTurnTimeout(player('easy'))).toBe(false)
  })

  it('一般雀士維持既有回合倒數', () => {
    expect(shouldUseTurnTimeout(player('normal'))).toBe(true)
  })
})
