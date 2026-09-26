import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { reduce, startGame } from './game'
import { findYaku } from './yaku'

const cards = (...ids: string[]) => ids.map(getCardById)

describe('對局規則契約', () => {
  it('對局固定四席', () => {
    const state = startGame({ seed: 41, lessonId: 'a-ra', skipPreview: true })
    expect(state.players).toHaveLength(4)
    expect(state.players.map((player) => player.seat)).toEqual([0, 1, 2, 3])
  })

  it('不符合當前 phase 的動作會保持 reducer identity', () => {
    const state = startGame({ seed: 43, lessonId: 'a-ra', skipPreview: true })
    expect(state.phase).toBe('dealing')
    expect(reduce(state, { type: 'PASS_CLAIM' })).toBe(state)
  })

  it('摸牌後可宣告手牌既有合法役，不要求役包含剛摸到的牌', () => {
    let state = startGame({
      seed: 42,
      lessonId: 'a-ra',
      skipPreview: true,
      startPlayerIndex: 0,
      hands: [
        cards(
          'ka-hiragana',
          'ka-katakana',
          'ka-vocabulary',
          'sa-hiragana',
          'ta-hiragana',
          'na-hiragana',
          'ha-hiragana',
        ),
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'ki-hiragana', 'ku-hiragana'),
        cards('se-hiragana', 'so-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'hi-hiragana'),
        cards('ma-hiragana', 'mi-hiragana', 'mu-hiragana', 'me-hiragana', 'mo-hiragana', 'ra-hiragana', 'ri-hiragana'),
      ],
      deck: cards('to-hiragana', 'te-hiragana', 'ko-hiragana', 'ke-hiragana'),
    })

    state = reduce(state, { type: 'DEAL_DONE' })
    state = reduce(state, { type: 'DRAW' })
    expect(state.lastDrawnCardId).toBe('to-hiragana')

    const yaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).find(
      (candidate) => candidate.kind === 'sameSound' && candidate.cards.every((card) => card.sound === 'ka'),
    )
    expect(yaku).toBeTruthy()
    expect(yaku!.cards.some((card) => card.id === state.lastDrawnCardId)).toBe(false)

    state = reduce(state, { type: 'CHOOSE_YAKU', yakuId: yaku!.id })
    expect(state.phase).toBe('scoring')
    expect(state.pendingScore?.source).toBe('tsumo')
  })
})
