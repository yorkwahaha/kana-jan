import { describe, expect, it } from 'vitest'
import { startGame } from '../engine/game'
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

    // 牌庫保留張數，但內容全被遮蔽
    expect(maskedForSeat1.deck).toHaveLength(originalDeckLen)
    expect(maskedForSeat1.deck.every((c) => c.hiragana === '？')).toBe(true)

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
})
