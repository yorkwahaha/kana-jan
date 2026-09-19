import { describe, expect, it } from 'vitest'
import { DEFAULT_BONUS } from '../data/bonuses'
import { getCardById, type KanaCard } from '../data/cards'
import { decideAi, needsHumanInput, shouldWaitForPlayer } from './ai'
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
})

describe('連線玩家不得被 AI 代打', () => {
  function remoteTurnState() {
    let state = startGame({
      seed: 7,
      skipPreview: true,
      startPlayerIndex: 1,
      bonus,
      playerConfigs: [
        { id: 'p0', name: '房主', kind: 'human', seat: 0 },
        { id: 'p1', name: '朋友A', kind: 'remote', seat: 1 },
        { id: 'p2', name: '電腦', kind: 'ai', seat: 2 },
        { id: 'p3', name: '電腦2', kind: 'ai', seat: 3 },
      ],
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'na-hiragana', 'ni-hiragana'),
        cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary', 'sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana'),
        cards('ta-hiragana', 'chi-hiragana', 'tsu-hiragana', 'te-hiragana', 'to-hiragana', 'ne-hiragana', 'no-hiragana'),
        cards('ki-katakana', 'ku-katakana', 'ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana'),
      ],
      deck: cards('so-hiragana', 'so-katakana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    return state
  }

  it('decideAi 在 remote 玩家的行動階段回傳 null', () => {
    const state = remoteTurnState()
    expect(state.players[1]?.kind).toBe('remote')
    expect(decideAi(state, createRng(1))).toBeNull()
  })

  it('needsHumanInput 對 remote 玩家為 true，Host 必須等待', () => {
    const state = remoteTurnState()
    expect(needsHumanInput(state)).toBe(true)
  })

  it('即使 kind 誤標為 ai，只要該座位有真人連線，Host 仍應等待', () => {
    const state = remoteTurnState()
    const mislabeled = {
      ...state,
      players: state.players.map((p) => (p.seat === 1 ? { ...p, kind: 'ai' as const } : p)),
    }
    expect(shouldWaitForPlayer(mislabeled.players[1], new Set([1]))).toBe(true)
    expect(shouldWaitForPlayer(mislabeled.players[2], new Set([1]))).toBe(false)
  })
})
