import { describe, expect, it } from 'vitest'
import type { PlayerState } from '../engine/types'
import { shouldScheduleHostTimeout, shouldUseTurnTimeout } from './useTurnOrchestration'

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

describe('turn timeout policy', () => {
  it('入門雀士完全不使用回合倒數', () => {
    expect(shouldUseTurnTimeout(player('easy'))).toBe(false)
  })

  it('一般雀士維持既有回合倒數', () => {
    expect(shouldUseTurnTimeout(player('normal'))).toBe(true)
  })

  it('房主開啟本地 overlay 時會暫停遠端玩家 timeout', () => {
    expect(shouldScheduleHostTimeout(true, 'host', true, 'remote', false)).toBe(true)
    expect(shouldScheduleHostTimeout(true, 'host', true, 'remote', true)).toBe(false)
    expect(shouldScheduleHostTimeout(true, 'guest', true, 'remote', false)).toBe(false)
  })
})
