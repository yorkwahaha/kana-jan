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
