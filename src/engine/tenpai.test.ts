import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { startGame } from './game'
import { buildTenpaiWaits, tenpaiVisibilityKey } from './tenpai'
import { findNearYaku } from './yaku'

describe('tenpai waits', () => {
  it('does not recommend a sound when every publicly known copy is exhausted', () => {
    const state = startGame({ seed: 9, activeRows: ['ka'], skipPreview: true })
    const hand = [getCardById('ka-hiragana'), getCardById('ka-katakana')]
    const hints = findNearYaku(hand, state.activeRows)
    state.deckManifest = {
      ...(state.deckManifest ?? {}),
      'ka:hiragana': 1,
      'ka:katakana': 1,
      'ka:vocabulary': 0,
    }

    const waits = buildTenpaiWaits(hand, hints, state)
    expect(waits.some((wait) => wait.sound === 'ka')).toBe(false)
  })

  it('keeps a wait when public information shows at least one copy remains', () => {
    const state = startGame({ seed: 10, activeRows: ['ka'], skipPreview: true })
    const hand = [getCardById('ka-hiragana'), getCardById('ka-katakana')]
    const hints = findNearYaku(hand, state.activeRows)
    state.discardPile = [getCardById('ka-vocabulary')]
    state.deckManifest = {
      ...(state.deckManifest ?? {}),
      'ka:hiragana': 1,
      'ka:katakana': 1,
      'ka:vocabulary': 2,
    }

    expect(buildTenpaiWaits(hand, hints, state).some((wait) => wait.sound === 'ka')).toBe(true)
  })

  it('completed yaku changes both the fingerprint and actual wait availability', () => {
    const state = startGame({ seed: 12, activeRows: ['ka'], skipPreview: true })
    const hand = [getCardById('ka-hiragana'), getCardById('ka-katakana')]
    const hints = findNearYaku(hand, state.activeRows)
    state.deckManifest = {
      ...(state.deckManifest ?? {}),
      'ka:hiragana': 1,
      'ka:katakana': 1,
      'ka:vocabulary': 1,
    }
    expect(buildTenpaiWaits(hand, hints, state).some((wait) => wait.sound === 'ka')).toBe(true)
    const before = tenpaiVisibilityKey(state)

    state.players[1]!.completed = [{
      source: 'tsumo',
      yaku: {
        id: 'test-completed-ka',
        kind: 'sameSound',
        sound: 'ka',
        cards: [getCardById('ka-vocabulary')],
        baseScore: 0,
        typeBonus: 0,
        missionBonus: 0,
        totalScore: 0,
        label: 'test',
      },
    }]

    expect(tenpaiVisibilityKey(state)).not.toBe(before)
    expect(buildTenpaiWaits(hand, hints, state).some((wait) => wait.sound === 'ka')).toBe(false)
  })

  it('changes its visibility fingerprint when public wait inputs change', () => {
    const state = startGame({ seed: 11, activeRows: ['ka'], skipPreview: true })
    const original = tenpaiVisibilityKey(state)

    state.discardPile = [getCardById('ka-vocabulary')]
    const afterDiscard = tenpaiVisibilityKey(state)
    expect(afterDiscard).not.toBe(original)

    state.deckManifest = { ...(state.deckManifest ?? {}), 'ka:vocabulary': 99 }
    expect(tenpaiVisibilityKey(state)).not.toBe(afterDiscard)
  })
})
