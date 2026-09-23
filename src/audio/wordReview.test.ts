import { describe, expect, it } from 'vitest'
import { KANA_SOUNDS } from '../data/kana'
import {
  buildWordReviewEntries,
  filterFlaggedEntries,
  parseFlaggedSoundIds,
  serializeFlaggedEntries,
  wordAudioUrl,
} from './wordReview'

describe('word audio review data', () => {
  const entries = buildWordReviewEntries()

  it('covers every kana sound exactly once', () => {
    expect(entries).toHaveLength(KANA_SOUNDS.length)
    expect(new Set(entries.map((entry) => entry.sound)).size).toBe(KANA_SOUNDS.length)
  })

  it('maps each sound to its physical word MP3 without TTS fallback', () => {
    expect(wordAudioUrl('kya', '/kana-jan/')).toBe('/kana-jan/audio/words/kya.mp3')
    expect(entries.find((entry) => entry.sound === 'kya')?.audioUrl).toMatch(/audio\/words\/kya\.mp3$/)
  })

  it('restores only valid saved sound IDs', () => {
    expect([...parseFlaggedSoundIds('["a","missing","kya"]')]).toEqual(['a', 'kya'])
    expect(parseFlaggedSoundIds('not json').size).toBe(0)
  })

  it('filters and exports flagged entries in review order', () => {
    const flagged = new Set(['kya', 'a'])
    const filtered = filterFlaggedEntries(entries, flagged)
    expect(filtered.map((entry) => entry.sound)).toEqual(['a', 'kya'])
    expect(serializeFlaggedEntries(filtered)).toContain('a\tあめ\t雨')
    expect(serializeFlaggedEntries(filtered)).toContain('kya\tきゃく\t客人')
  })
})
