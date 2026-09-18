import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { soundsForRows } from '../data/kana'
import { pickLessonRows } from '../data/lessons'
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

  it('四行牌組（含拗音）之標準對局牌庫切出前 100 張，發牌後山牌剩餘 72 張', () => {
    const rng = createRng(42)
    // 3 一般行 (a, ka, sa = 15 音) + 1 拗音行 (kya = 3 音) = 18 音
    const deck = buildLessonDeck(['a', 'ka', 'sa', 'kya'], rng)
    expect(deck).toHaveLength(100)
    const { hands, remaining } = dealHands(deck)
    expect(hands).toHaveLength(4)
    expect(hands.every((h) => h.length === 7)).toBe(true)
    expect(remaining).toHaveLength(72)
  })

  it('兩行清濁 + 兩行拗音（16 音）之牌庫亦切出前 100 張', () => {
    const rng = createRng(42)
    // 2 一般行 (a, ka = 10 音) + 2 拗音行 (kya, sha = 6 音) = 16 音
    const deck = buildLessonDeck(['a', 'ka', 'kya', 'sha'], rng)
    expect(deck).toHaveLength(100)
  })

  it('隨機 4 行 (random-4) 抽選保證 2清濁 + 1拗音 + 1任意，總音數必為 16 或 18', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = createRng(seed)
      const rows = pickLessonRows('random-4', (arr) => rng.shuffle(arr))
      expect(rows).toHaveLength(4)
      expect(new Set(rows).size).toBe(4)
      const sounds = soundsForRows(rows)
      expect([16, 18]).toContain(sounds.length)
      const deck = buildLessonDeck(rows, rng)
      expect(deck).toHaveLength(100)
    }
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
