import { describe, expect, it } from 'vitest'
import { drainAuto, reduce, startGame } from '../engine/game'
import { maskStateForPlayer } from './mask'

describe('maskStateForPlayer 防窺牌遮罩', () => {
  it('為指定座位的玩家遮蔽牌庫與其他玩家之手牌，但保留張數', () => {
    const state = startGame({
      seed: 42,
      skipPreview: true,
      playerConfigs: [
        { id: 'p0', name: '玩家0', kind: 'human', seat: 0 },
        { id: 'p1', name: '玩家1', kind: 'remote', seat: 1 },
        { id: 'p2', name: '玩家2', kind: 'remote', seat: 2 },
        { id: 'p3', name: '玩家3', kind: 'remote', seat: 3 },
      ],
    })

    const originalDeckLen = state.deck.length
    const maskedForSeat1 = maskStateForPlayer(state, 1)

    // wire payload 只傳牌庫張數，guest parse 後才重建隱藏牌。
    expect(maskedForSeat1.deck).toHaveLength(0)
    expect(maskedForSeat1.deckCount).toBe(originalDeckLen)

    // 玩家 1 自己的手牌保持真實
    expect(maskedForSeat1.players[1]!.hand[0]!.hiragana).not.toBe('？')
    expect(maskedForSeat1.players[1]!.hand[0]!.id).not.toContain('hidden')

    // 其他玩家（0, 2, 3）的手牌被遮蔽，但張數保持一致
    expect(maskedForSeat1.players[0]!.hand).toHaveLength(7)
    expect(maskedForSeat1.players[0]!.hand.every((c) => c.hiragana === '？')).toBe(true)

    expect(maskedForSeat1.players[2]!.hand).toHaveLength(7)
    expect(maskedForSeat1.players[2]!.hand.every((c) => c.hiragana === '？')).toBe(true)

    expect(maskedForSeat1.players[3]!.hand).toHaveLength(7)
    expect(maskedForSeat1.players[3]!.hand.every((c) => c.hiragana === '？')).toBe(true)
  })

  it('觀戰座位（seat < 0）遮蔽所有手牌', () => {
    const state = startGame({ seed: 42, skipPreview: true })
    const masked = maskStateForPlayer(state, -1)
    expect(masked.players.every((p) => p.hand.every((c) => c.hiragana === '？'))).toBe(true)
  })

  it('只讓目前抽牌者看到 lastDrawnCardId，且 reactionOptions 不攜帶手牌組合', () => {
    let state = startGame({ seed: 42, skipPreview: true, startPlayerIndex: 1 })
    state = drainAuto(reduce(state, { type: 'DEAL_DONE' }))
    state = drainAuto(reduce(state, { type: 'DRAW' }))
    expect(state.lastDrawnCardId).not.toBeNull()

    expect(maskStateForPlayer(state, 1).lastDrawnCardId).toBe(state.lastDrawnCardId)
    expect(maskStateForPlayer(state, 0).lastDrawnCardId).toBeNull()
    expect(maskStateForPlayer(state, -1).lastDrawnCardId).toBeNull()
    expect(state.reactionOptions.every((option) => !('yaku' in option))).toBe(true)
  })

  it('不傳送可重建牌山的亂數狀態，且只公開目前反應者', () => {
    const state = startGame({ seed: 123, activeRows: ['a', 'ka', 'sa', 'ta'], skipPreview: true })
    state.reactionOptions = [{ playerId: 'p1' }, { playerId: 'p2' }]
    state.reactionIndex = 0
    const masked = maskStateForPlayer(state, 1)
    expect(masked.seed).toBe(0)
    expect(masked.rngState).toBe(0)
    expect(masked.reactionOptions).toEqual([{ playerId: 'p1' }])
    expect(masked.reactionIndex).toBe(0)
  })
})
