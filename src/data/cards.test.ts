import { describe, expect, it } from 'vitest'
import { CARD_CATALOG, getCardById } from './cards'
import { KANA_SOUNDS } from './kana'

describe('getCardById', () => {
  it('可解析只有小課程 -$ 複本後綴的卡牌 ID', () => {
    expect(getCardById('a-hiragana-$0').sound).toBe('a')
    expect(getCardById('a-hiragana-$0').id).toBe('a-hiragana-$0')
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

  it('所有單字拼字中的一般讀音均存在於 KANA_SOUNDS，特殊單位只允許促音或長音', () => {
    const allSoundIds = new Set(KANA_SOUNDS.map((k) => k.sound))
    for (const kana of KANA_SOUNDS) {
      for (const unit of kana.spelling) {
        if (typeof unit === 'string') {
          expect(allSoundIds.has(unit)).toBe(true)
        } else {
          expect(['sokuon', 'choon']).toContain(unit.type)
        }
      }
    }
  })

  it('含撥音的單字拼字包含 n（ん）', () => {
    expect(KANA_SOUNDS.find((k) => k.sound === 'pa')?.spelling).toEqual(['pa', 'n'])
    expect(KANA_SOUNDS.find((k) => k.sound === 'n')?.hiragana).toBe('ん')
    expect(KANA_SOUNDS.find((k) => k.sound === 'ya')?.hiragana).toBe('や')
  })

  it('長音、促音與重複音節不會從單字學習資料中遺失', () => {
    const spelling = (sound: string) => KANA_SOUNDS.find((k) => k.sound === sound)?.spelling
    expect(spelling('ke')).toEqual(['ke', { type: 'choon' }, 'ki'])
    expect(spelling('ga')).toEqual(['ga', { type: 'sokuon' }, 'ko', 'u'])
    expect(spelling('za')).toEqual(['za', { type: 'sokuon' }, 'shi'])
    expect(spelling('kyu')).toEqual(['kyu', 'u', 'ri'])
    expect(spelling('chu')).toEqual(['chu', 'u', 'sha'])
    expect(spelling('nyu')).toEqual(['nyu', 'u', 'ga', 'ku'])
    expect(spelling('nyo')).toEqual(['nyo', 'ro', 'nyo', 'ro'])
    expect(spelling('hyu')).toEqual(['hyu', { type: 'choon' }, 'ma', 'n'])
    expect(spelling('myu')).toEqual(['myu', { type: 'choon' }, 'ji', { type: 'sokuon' }, 'ku'])
    expect(spelling('myo')).toEqual(['myo', 'u', 'ji'])
  })
})
