import { describe, expect, it } from 'vitest'
import { CARD_CATALOG, getCardById } from './cards'
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
  it('所有單字牌都有結算複習用的標準表記', () => {
    const vocabularyCards = CARD_CATALOG.filter((card) => card.cardType === 'vocabulary')
    expect(vocabularyCards).toHaveLength(KANA_SOUNDS.length)
    expect(vocabularyCards.every((card) => card.writtenForm.length > 0)).toBe(true)
    expect(getCardById('a-vocabulary').writtenForm).toBe('雨')
    expect(getCardById('ja-vocabulary').writtenForm).toBe('馬鈴薯')
  })

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

  it('長音與重複音節不會從單字學習資料中遺失', () => {
    const spelling = (sound: string) => KANA_SOUNDS.find((k) => k.sound === sound)?.spelling
    expect(spelling('kyu')).toEqual(['kyu', 'u', 'ri'])
    expect(spelling('chu')).toEqual(['chu', 'u', 'sha'])
    expect(spelling('nyu')).toEqual(['nyu', 'u', 'ga', 'ku'])
    expect(spelling('nyo')).toEqual(['nyo', 'ro', 'nyo', 'ro'])
    expect(spelling('hyu')).toEqual(['hyu', 'u', 'ga'])
    expect(spelling('myu')).toEqual(['myu', 'ji', 'ku'])
    expect(spelling('myo')).toEqual(['myo', 'u', 'ji'])
  })
})
