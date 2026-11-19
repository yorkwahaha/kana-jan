import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { startGame } from '../engine/game'
import type { PlayerState } from '../engine/types'
import { shouldUseTurnTimeout, useTurnOrchestration, withRoomTurnDeadline } from './useTurnOrchestration'

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

  it('共用自摸與棄牌的期限，換成抄牌時再開始新期限', () => {
    const initial = startGame({ seed: 9, startPlayerIndex: 0 })
    const decision = withRoomTurnDeadline(initial, { ...initial, phase: 'playerAction' }, 1000)
    expect(decision.turnDeadlineAt).toBe(19000)
    const discard = withRoomTurnDeadline(decision, { ...decision, phase: 'discard' }, 4000)
    expect(discard.turnDeadlineAt).toBe(decision.turnDeadlineAt)
    const reaction = withRoomTurnDeadline(discard, {
      ...discard, phase: 'reaction', reactionOptions: [{ playerId: 'p0' }],
    }, 5000)
    expect(reaction.turnDeadlineAt).toBe(17000)
    expect(withRoomTurnDeadline(reaction, { ...reaction, phase: 'review' }, 9000).turnDeadlineAt).toBeUndefined()
  })

  it('房主開著本機面板時仍會代打，客端只顯示倒數', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1000)
      const initial = startGame({ seed: 9, startPlayerIndex: 0 })
      const state = withRoomTurnDeadline(initial, { ...initial, phase: 'discard' }, Date.now())
      const dispatch = vi.fn()
      const guestDispatch = vi.fn()
      const host = renderHook(() => useTurnOrchestration({ state, networkMode: 'host', mySeat: 0, spectating: false, dispatch, paused: true }))
      const guest = renderHook(() => useTurnOrchestration({ state, networkMode: 'guest', mySeat: 0, spectating: false, dispatch: guestDispatch }))
      act(() => vi.advanceTimersByTime(18_000))
      expect(dispatch).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'DISCARD' }))
      act(() => guest.result.current.handleTurnTimeout())
      expect(guestDispatch).not.toHaveBeenCalled()
      host.unmount()
      guest.unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})
