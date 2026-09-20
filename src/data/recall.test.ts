import { describe, expect, it } from 'vitest'
import { getCardById } from './cards'
import { KANA_SOUNDS } from './kana'
import { pickRecallCard, recallOptions } from './recall'

describe('回想題選牌', () => {
  it('優先考片假名易混對', () => {
    const picked = pickRecallCard([
      getCardById('ka-hiragana'),
      getCardById('shi-katakana'),
      getCardById('tsu-hiragana'),
    ])
    expect(picked?.id).toBe('shi-katakana')
  })

  it('沒有片假名時改考平假名易混音', () => {
    const picked = pickRecallCard([getCardById('a-hiragana'), getCardById('tsu-hiragana')])
    expect(picked?.id).toBe('tsu-hiragana')
  })
})

describe('回想題選項', () => {
  it('し的干擾項會包含つ', () => {
    const options = recallOptions(getCardById('shi-katakana'), ['sa', 'ta'])
    expect(options).toContain('shi')
    expect(options).toContain('tsu')
    expect(options).toHaveLength(3)
  })

  it('あ行課程用あ／お當易混對', () => {
    const options = recallOptions(getCardById('a-hiragana'), ['a'])
    expect(options).toContain('a')
    expect(options).toContain('o')
    expect(options).toHaveLength(3)
  })
})

describe('假名資料完整性', () => {
  it('所有單字拼字中的讀音均存在於 KANA_SOUNDS 中', () => {
    const allSoundIds = new Set(KANA_SOUNDS.map((k) => k.sound))
    for (const kana of KANA_SOUNDS) {
      for (const mora of kana.spelling) {
        expect(allSoundIds.has(mora)).toBe(true)
      }
    }
  })

  it('含撥音的單字拼字包含 n（ん）', () => {
    expect(KANA_SOUNDS.find((k) => k.sound === 'pa')?.spelling).toEqual(['pa', 'n'])
    expect(KANA_SOUNDS.find((k) => k.sound === 'n')?.hiragana).toBe('ん')
    expect(KANA_SOUNDS.find((k) => k.sound === 'ya')?.hiragana).toBe('や')
  })
})
