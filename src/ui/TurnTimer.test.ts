import { describe, expect, it } from 'vitest'
import { followUpDiscardAfterExpiredClock, turnClockKey } from './TurnTimer'

describe('turnClockKey', () => {
  it('自摸略過進入棄牌時沿用同一把回合鐘', () => {
    const action = turnClockKey({
      turnNumber: 4,
      phase: 'playerAction',
      actorId: 'p0',
      comboCount: 0,
      reactionIndex: 0,
    })
    const discard = turnClockKey({
      turnNumber: 4,
      phase: 'discard',
      actorId: 'p0',
      comboCount: 0,
      reactionIndex: 0,
    })
    expect(action).toBe(discard)
  })

  it('反應階段與連鎖宣告各自使用獨立時計', () => {
    const turn = turnClockKey({
      turnNumber: 4,
      phase: 'playerAction',
      actorId: 'p0',
      comboCount: 0,
      reactionIndex: 0,
    })
    const reaction = turnClockKey({
      turnNumber: 4,
      phase: 'reaction',
      actorId: 'p1',
      comboCount: 0,
      reactionIndex: 0,
    })
    const combo = turnClockKey({
      turnNumber: 4,
      phase: 'playerAction',
      actorId: 'p0',
      comboCount: 1,
      reactionIndex: 0,
    })
    expect(reaction).not.toBe(turn)
    expect(combo).not.toBe(turn)
  })

  it('共用回合鐘耗盡於自摸後，棄牌階段必須再託管一次', () => {
    expect(followUpDiscardAfterExpiredClock('playerAction', true)).toBe(false)
    expect(followUpDiscardAfterExpiredClock('discard', false)).toBe(false)
    expect(followUpDiscardAfterExpiredClock('discard', true)).toBe(true)
  })
})
