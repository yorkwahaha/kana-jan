import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { createRng } from './rng'
import { buildLessonDeck, copiesNeeded, dealHands, refillHand, sortHandByGojuon } from './deck'
import { HAND_SIZE, PLAYER_COUNT } from './types'

describe('課程牌庫', () => {
  it('小課程會複製到足夠四人發牌', () => {
    expect(copiesNeeded(15)).toBeGreaterThanOrEqual(4)
    const rng = createRng(1)
    const deck = buildLessonDeck(['a'], rng)
    expect(deck.length).toBeGreaterThanOrEqual(PLAYER_COUNT * HAND_SIZE)
    expect(deck.every((c) => c.row === 'a')).toBe(true)
  })
})

describe('五十音手牌排序', () => {
  it('依行→段→平假名／片假名／單字排列', () => {
    const unsorted = [
      getCardById('ka-vocabulary'),
      getCardById('a-katakana'),
      getCardById('sa-hiragana'),
      getCardById('a-hiragana'),
      getCardById('i-hiragana'),
    ]
    expect(sortHandByGojuon(unsorted).map((c) => c.id)).toEqual([
      'a-hiragana',
      'a-katakana',
      'i-hiragana',
      'ka-vocabulary',
      'sa-hiragana',
    ])
  })

  it('發牌後各家手牌已依五十音排序', () => {
    const rng = createRng(1)
    const deck = buildLessonDeck(['a', 'ka'], rng)
    const { hands } = dealHands(deck)
    for (const hand of hands) {
      expect(hand.map((c) => c.id)).toEqual(sortHandByGojuon(hand).map((c) => c.id))
    }
  })

  it('補牌後仍保持五十音順序', () => {
    const filled = refillHand(
      [getCardById('sa-hiragana'), getCardById('a-hiragana')],
      [getCardById('ka-hiragana'), getCardById('i-hiragana')],
      4,
    )
    expect(filled.hand.map((c) => c.id)).toEqual([
      'a-hiragana',
      'i-hiragana',
      'ka-hiragana',
      'sa-hiragana',
    ])
  })
})
