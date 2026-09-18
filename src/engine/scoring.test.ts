import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { computeRankings, removeCardsFromHand, settleGold } from './scoring'
import type { PlayerState } from './types'

function player(partial: Partial<PlayerState> & Pick<PlayerState, 'id' | 'name'>): PlayerState {
  return {
    kind: 'ai',
    seat: 0,
    aiDifficulty: 'normal',
    gold: 20,
    score: 0,
    hand: [],
    discards: [],
    completed: [],
    ...partial,
  }
}

describe('金幣結算', () => {
  it('自己抽牌完成時由所有對手付款', () => {
    const players = [
      player({ id: 'a', name: 'A', gold: 20, seat: 0 }),
      player({ id: 'b', name: 'B', gold: 20, seat: 1 }),
      player({ id: 'c', name: 'C', gold: 20, seat: 2 }),
      player({ id: 'd', name: 'D', gold: 20, seat: 3 }),
    ]
    const result = settleGold(players, 'a', 6, 'tsumo')
    expect(result.players.find((p) => p.id === 'a')?.gold).toBe(38)
    expect(result.players.find((p) => p.id === 'a')?.score).toBe(6)
    expect(result.players.filter((p) => p.id !== 'a').every((p) => p.gold === 14)).toBe(true)
    expect(result.transfers).toHaveLength(3)
    expect(result.bankrupt).toBe(false)
  })

  it('使用棄牌完成時只有棄牌者付款', () => {
    const players = [
      player({ id: 'a', name: 'A', gold: 20 }),
      player({ id: 'b', name: 'B', gold: 20 }),
      player({ id: 'c', name: 'C', gold: 20 }),
      player({ id: 'd', name: 'D', gold: 20 }),
    ]
    const result = settleGold(players, 'a', 3, 'ron', 'b')
    expect(result.players.find((p) => p.id === 'a')?.gold).toBe(23)
    expect(result.players.find((p) => p.id === 'b')?.gold).toBe(17)
    expect(result.players.find((p) => p.id === 'c')?.gold).toBe(20)
    expect(result.players.find((p) => p.id === 'd')?.gold).toBe(20)
    expect(result.transfers).toHaveLength(1)
  })

  it('金幣不可低於 0，不足則全額支付', () => {
    const players = [
      player({ id: 'a', name: 'A', gold: 20 }),
      player({ id: 'b', name: 'B', gold: 2 }),
      player({ id: 'c', name: 'C', gold: 20 }),
      player({ id: 'd', name: 'D', gold: 20 }),
    ]
    const result = settleGold(players, 'a', 6, 'ron', 'b')
    expect(result.players.find((p) => p.id === 'b')?.gold).toBe(0)
    expect(result.players.find((p) => p.id === 'a')?.gold).toBe(22)
    expect(result.bankrupt).toBe(true)
  })

  it('自摸時其中一人金幣不足，該人歸零且完成者只拿到實際支付額', () => {
    const players = [
      player({ id: 'a', name: 'A', gold: 20 }),
      player({ id: 'b', name: 'B', gold: 2 }),
      player({ id: 'c', name: 'C', gold: 20 }),
      player({ id: 'd', name: 'D', gold: 20 }),
    ]
    const result = settleGold(players, 'a', 6, 'tsumo')
    expect(result.players.find((p) => p.id === 'b')?.gold).toBe(0)
    expect(result.players.find((p) => p.id === 'a')?.gold).toBe(20 + 2 + 6 + 6)
    expect(result.bankrupt).toBe(true)
  })
})

describe('完成牌型後卡片移出', () => {
  it('使用過的卡片從手牌移除且不可再計分', () => {
    const used = [getCardById('ka-hiragana'), getCardById('ka-katakana'), getCardById('ka-vocabulary')]
    const hand = [...used, getCardById('a-hiragana')]
    const next = removeCardsFromHand(hand, used)
    expect(next.map((c) => c.id)).toEqual(['a-hiragana'])
  })
})

describe('勝負判定', () => {
  it('以局內剩餘籌碼為主、牌型得分為平手決勝', () => {
    const ranking = computeRankings([
      player({ id: 'a', name: 'A', score: 9, gold: 10, seat: 0 }),
      player({ id: 'b', name: 'B', score: 12, gold: 5, seat: 1 }),
      player({ id: 'c', name: 'C', score: 9, gold: 30, seat: 2 }),
      player({ id: 'd', name: 'D', score: 3, gold: 40, seat: 3 }),
    ])
    expect(ranking.map((r) => r.playerId)).toEqual(['d', 'c', 'a', 'b'])
    expect(ranking[0]?.place).toBe(1)
  })
})
