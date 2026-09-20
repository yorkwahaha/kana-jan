import { describe, expect, it } from 'vitest'
import { DEFAULT_BONUS } from '../data/bonuses'
import { getCardById, type KanaCard } from '../data/cards'
import { decideAi, needsHumanInput } from './ai'
import { drainAuto, reduce, startGame } from './game'
import { createRng } from './rng'

const bonus = DEFAULT_BONUS

function cards(...ids: string[]): KanaCard[] {
  return ids.map(getCardById)
}

function play(state: ReturnType<typeof startGame>, action: Parameters<typeof reduce>[1]) {
  return drainAuto(reduce(state, action))
}

describe('電腦決策', () => {
  it('簡單難度在可完成時會結算牌型', () => {
    let state = startGame({
      seed: 99,
      startPlayerIndex: 1,
      aiDifficulty: 'easy',
      bonus,
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'na-hiragana', 'ni-hiragana'),
        cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary', 'sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana'),
        cards('ta-hiragana', 'chi-hiragana', 'tsu-hiragana', 'te-hiragana', 'to-hiragana', 'ne-hiragana', 'no-hiragana'),
        cards('ki-katakana', 'ku-katakana', 'ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana'),
      ],
      deck: cards('so-hiragana', 'so-katakana', 'so-vocabulary', 'na-katakana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const rng = createRng(1)
    const action = decideAi(state, rng)
    expect(action?.type).toBe('CHOOSE_YAKU')
  })

  it('普通難度棄牌會避開自己接近完成的牌', () => {
    let state = startGame({
      seed: 100,
      startPlayerIndex: 1,
      aiDifficulty: 'normal',
      bonus,
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'na-hiragana', 'ni-hiragana'),
        cards('ka-hiragana', 'ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'sa-vocabulary', 'shi-vocabulary', 'a-katakana'),
        cards('ta-hiragana', 'chi-hiragana', 'tsu-hiragana', 'te-hiragana', 'to-hiragana', 'ne-hiragana', 'no-hiragana'),
        cards('ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'na-katakana'),
      ],
      deck: cards('nu-vocabulary', 'ne-vocabulary', 'no-vocabulary'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const rng = createRng(3)
    const skip = decideAi(state, rng)
    expect(skip?.type).toBe('SKIP_YAKU')
    state = play(state, skip!)
    const discard = decideAi(state, rng)
    expect(discard?.type).toBe('DISCARD')
    if (discard?.type === 'DISCARD') {
      expect(['ka-hiragana', 'ki-hiragana', 'ku-hiragana', 'ke-hiragana']).not.toContain(discard.cardId)
    }
  })

  it('普通難度手牌有同音兩張相同類型（如2平）時，視為接近聽牌而不優先捨棄', () => {
    const k1 = getCardById('ka-hiragana')
    const k2 = { ...k1, id: 'ka-hiragana#1' }
    let state = startGame({
      seed: 101,
      startPlayerIndex: 1,
      aiDifficulty: 'normal',
      bonus,
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'na-hiragana', 'ni-hiragana'),
        [k1, k2, getCardById('sa-vocabulary'), getCardById('chi-vocabulary'), getCardById('tsu-vocabulary'), getCardById('re-vocabulary'), getCardById('ro-vocabulary')],
        cards('ta-hiragana', 'chi-hiragana', 'tsu-hiragana', 'te-hiragana', 'to-hiragana', 'ne-hiragana', 'no-hiragana'),
        cards('ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'na-katakana'),
      ],
      deck: cards('nu-vocabulary', 'ne-vocabulary', 'no-vocabulary'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const rng = createRng(5)
    const skip = decideAi(state, rng)
    expect(skip?.type).toBe('SKIP_YAKU')
    state = play(state, skip!)
    const discard = decideAi(state, rng)
    expect(discard?.type).toBe('DISCARD')
    if (discard?.type === 'DISCARD') {
      expect([k1.id, k2.id]).not.toContain(discard.cardId)
    }
  })

  it('普通難度在進度相同時優先棄出牌河已有的安全牌', () => {
    let state = startGame({
      seed: 102,
      startPlayerIndex: 1,
      aiDifficulty: 'normal',
      bonus,
      hands: [
        cards('i-hiragana', 'ki-hiragana', 'shi-hiragana', 'chi-hiragana', 'ni-hiragana', 'hi-hiragana', 'mi-hiragana'),
        cards('a-hiragana', 'ka-hiragana', 'sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana', 'ma-hiragana'),
        cards('u-hiragana', 'ku-hiragana', 'su-hiragana', 'tsu-hiragana', 'nu-hiragana', 'fu-hiragana', 'mu-hiragana'),
        cards('e-hiragana', 'ke-hiragana', 'se-hiragana', 'te-hiragana', 'ne-hiragana', 'he-hiragana', 'me-hiragana'),
      ],
      deck: cards('ra-hiragana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    state = play(state, { type: 'SKIP_YAKU' })
    state = { ...state, discardPile: cards('ka-katakana') }

    expect(decideAi(state, createRng(1))).toEqual({ type: 'DISCARD', cardId: 'ka-hiragana' })
  })
})

describe('真人操作需求判定 (needsHumanInput)', () => {
  it('remote 與 human 玩家在 playerAction / discard 階段均需真人輸入', () => {
    const baseState = startGame({
      playerConfigs: [
        { id: 'p0', name: '房主', kind: 'human', seat: 0 },
        { id: 'p1', name: '朋友', kind: 'remote', seat: 1 },
        { id: 'p2', name: '電腦1', kind: 'ai', seat: 2 },
        { id: 'p3', name: '電腦2', kind: 'ai', seat: 3 },
      ],
      skipPreview: true,
      startPlayerIndex: 1,
    })

    const stateAtDraw = play(baseState, { type: 'DEAL_DONE' })
    const stateAtAction = play(stateAtDraw, { type: 'DRAW' })
    expect(stateAtAction.phase).toBe('playerAction')
    expect(needsHumanInput(stateAtAction)).toBe(true)

    const stateAtDiscard = play(stateAtAction, { type: 'SKIP_YAKU' })
    expect(stateAtDiscard.phase).toBe('discard')
    expect(needsHumanInput(stateAtDiscard)).toBe(true)
  })

  it('AI 玩家在 discard 階段不需真人輸入', () => {
    const baseState = startGame({
      playerConfigs: [
        { id: 'p0', name: '房主', kind: 'human', seat: 0 },
        { id: 'p1', name: '朋友', kind: 'remote', seat: 1 },
        { id: 'p2', name: '電腦1', kind: 'ai', seat: 2 },
        { id: 'p3', name: '電腦2', kind: 'ai', seat: 3 },
      ],
      skipPreview: true,
      startPlayerIndex: 2,
    })

    const stateAtDraw = play(baseState, { type: 'DEAL_DONE' })
    const stateAtAction = play(stateAtDraw, { type: 'DRAW' })
    const stateAtDiscard = play(stateAtAction, { type: 'SKIP_YAKU' })
    expect(needsHumanInput(stateAtDiscard)).toBe(false)
  })
})
