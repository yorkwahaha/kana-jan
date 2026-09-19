import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { reduce, startGame } from '../engine/game'
import type { GameState } from '../engine/types'
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

  it('他人剛抽入的牌 id 不外洩，但自己抽的牌提示保留', () => {
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
    // 模擬 p1 剛抽入手中的第一張牌
    const p1Card = state.players[1]!.hand[0]!.id
    const drawn: GameState = { ...state, lastDrawnCardId: p1Card }

    // 對 p1 自己：保留抽牌提示
    expect(maskStateForPlayer(drawn, 1).lastDrawnCardId).toBe(p1Card)
    // 對其他座位（p0）：不得洩漏 p1 抽到的真實卡 id
    expect(maskStateForPlayer(drawn, 0).lastDrawnCardId).toBeNull()
  })

  it('宣告候選只保留自己那組實際卡片，他人可抄牌型的卡片被遮蔽但保留優先權順序', () => {
    // p0 打出 か，p1（下家）與 p2 皆能用它完成同音組
    let s = startGame({
      seed: 5,
      skipPreview: true,
      startPlayerIndex: 0,
      hands: [
        ['ka', 'a', 'i', 'u', 'e', 'o', 'na'].map((x) => getCardById(`${x}-hiragana`)),
        [getCardById('ka-katakana'), getCardById('ka-vocabulary'), ...['i', 'u', 'e', 'o'].map((x) => getCardById(`${x}-katakana`)), getCardById('na-katakana')],
        [getCardById('ka-hiragana'), getCardById('ka-vocabulary'), ...['sa', 'shi', 'su', 'se', 'so'].map((x) => getCardById(`${x}-hiragana`))],
        ['ta', 'chi', 'tsu', 'te', 'to', 'ni', 'nu'].map((x) => getCardById(`${x}-katakana`)),
      ],
      deck: ['ne', 'no', 'ha', 'hi', 'fu'].map((x) => getCardById(`${x}-hiragana`)),
    })
    s = reduce(s, { type: 'DEAL_DONE' })
    s = reduce(s, { type: 'DRAW' })
    s = reduce(s, { type: 'SKIP_YAKU' })
    s = reduce(s, { type: 'DISCARD', cardId: 'ka-hiragana' })

    expect(s.phase).toBe('reaction')
    expect(s.reactionOptions.map((o) => o.playerId)).toEqual(['p1', 'p2'])
    expect(s.reactionOptions.every((o) => o.yaku.cards.length >= 3)).toBe(true)

    // 對棄牌者 p0（seat 0）：所有候選皆屬他人 -> 卡片全部遮蔽，但順序與 playerId 保留
    const forP0 = maskStateForPlayer(s, 0)
    expect(forP0.reactionOptions.map((o) => o.playerId)).toEqual(['p1', 'p2'])
    expect(
      forP0.reactionOptions.every((o) => o.yaku.cards.every((c) => c.hiragana === '？')),
    ).toBe(true)

    // 對 p1（seat 1）：自己那組（index 0）保留實際卡片，p2 那組（index 1）被遮蔽
    const forP1 = maskStateForPlayer(s, 1)
    expect(forP1.reactionOptions[0]!.yaku.cards.some((c) => c.hiragana !== '？')).toBe(true)
    expect(forP1.reactionOptions[1]!.yaku.cards.every((c) => c.hiragana === '？')).toBe(true)
  })
})
