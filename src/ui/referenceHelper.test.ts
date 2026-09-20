import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { createLobbyState } from '../engine/game'
import type { GameState, PlayerState } from '../engine/types'
import { computeRowCardStats, getVisibleCards } from './referenceHelper'

describe('referenceHelper', () => {
  it('correctly collects visible cards for human player', () => {
    const p0: PlayerState = {
      id: 'p0',
      name: '小春',
      kind: 'human',
      seat: 0,
      aiDifficulty: 'normal',
      gold: 20,
      score: 0,
      hand: [getCardById('a-hiragana'), getCardById('ka-katakana')],
      discards: [getCardById('sa-vocabulary')],
      completed: [
        {
          yaku: {
            id: 'y1',
            kind: 'sameSound',
            cards: [getCardById('i-hiragana'), getCardById('i-katakana'), getCardById('i-vocabulary')],
            baseScore: 3,
            typeBonus: 3,
            missionBonus: 0,
            totalScore: 6,
            label: 'い同音組',
          },
          source: 'tsumo',
        },
      ],
    }

    const p1: PlayerState = {
      id: 'p1',
      name: '電腦2',
      kind: 'ai',
      seat: 1,
      aiDifficulty: 'normal',
      gold: 20,
      score: 0,
      hand: [getCardById('o-hiragana')], // 對手手牌不可見！
      discards: [getCardById('ta-hiragana')],
      completed: [],
    }

    const state: GameState = {
      ...createLobbyState(),
      players: [p0, p1],
      currentDiscard: getCardById('na-hiragana'),
      activeRows: ['a', 'ka', 'sa', 'ta'],
    }

    const visible = getVisibleCards(state, 'p0')
    const visibleIds = visible.map((c) => c.id)

    // 自己的手牌可見
    expect(visibleIds).toContain('a-hiragana')
    expect(visibleIds).toContain('ka-katakana')
    // 自己的棄牌與對手的棄牌可見
    expect(visibleIds).toContain('sa-vocabulary')
    expect(visibleIds).toContain('ta-hiragana')
    // 結算牌可見
    expect(visibleIds).toContain('i-hiragana')
    // 當前棄牌可見
    expect(visibleIds).toContain('na-hiragana')
    // 對手手牌絕不可見
    expect(visibleIds).not.toContain('o-hiragana')
  })

  it('correctly computes card block remaining counts (each type starts with 3)', () => {
    const visibleCards = [
      getCardById('a-hiragana'),
      { ...getCardById('a-hiragana'), id: 'a-hiragana#1' }, // 2 張 a-hiragana 可見
      getCardById('a-katakana'), // 1 張 a-katakana 可見
    ]

    const stats = computeRowCardStats(['a'], visibleCards)
    const aRow = stats.find((r) => r.rowId === 'a')
    expect(aRow).toBeDefined()

    const aSound = aRow!.sounds.find((s) => s.sound === 'a')
    expect(aSound).toBeDefined()

    // 平假名可見 2 張，剩餘 3 - 2 = 1
    expect(aSound!.hiragana.seen).toBe(2)
    expect(aSound!.hiragana.remaining).toBe(1)

    // 片假名可見 1 張，剩餘 3 - 1 = 2
    expect(aSound!.katakana.seen).toBe(1)
    expect(aSound!.katakana.remaining).toBe(2)

    // 單字卡可見 0 張，剩餘 3 - 0 = 3
    expect(aSound!.vocabulary.seen).toBe(0)
    expect(aSound!.vocabulary.remaining).toBe(3)

    // a 音總剩餘 1 + 2 + 3 = 6 張（滿分 9）
    expect(aSound!.totalRemaining).toBe(6)
  })

  it('單行課程可用動態複本數顯示每種牌 6 張', () => {
    const visibleCards = [
      getCardById('a-hiragana'),
      { ...getCardById('a-hiragana'), id: 'a-hiragana#1' },
      { ...getCardById('a-hiragana'), id: 'a-hiragana#2' },
    ]
    const stats = computeRowCardStats(['a'], visibleCards, 6)
    const aSound = stats[0]!.sounds.find((sound) => sound.sound === 'a')!

    expect(aSound.hiragana.max).toBe(6)
    expect(aSound.hiragana.remaining).toBe(3)
    expect(aSound.totalMax).toBe(18)
  })

  it('當前棄牌若已在 player.discards 中，不重複計數', () => {
    const card = getCardById('a-hiragana')
    const p: PlayerState = {
      id: 'p0',
      name: '玩家',
      kind: 'human',
      seat: 0,
      aiDifficulty: 'normal',
      gold: 20,
      score: 0,
      hand: [],
      discards: [card],
      completed: [],
    }
    const state: GameState = {
      ...createLobbyState(),
      players: [p],
      currentDiscard: card, // 同一張卡
      activeRows: ['a'],
    }
    const visible = getVisibleCards(state, 'p0')
    expect(visible).toHaveLength(1)
  })
})
