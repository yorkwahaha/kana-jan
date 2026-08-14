import { describe, expect, it } from 'vitest'
import { BONUS_MISSIONS, type BonusMission } from '../data/bonuses'
import { getCardById, type KanaCard } from '../data/cards'
import { findYaku, missionBonusFor, typeBonusFor } from './yaku'

const noBonus: BonusMission = {
  kind: 'rowYaku',
  label: 'none-test',
  detail: '',
  points: 0,
}

function cards(...ids: string[]): KanaCard[] {
  return ids.map(getCardById)
}

describe('同音三張', () => {
  it('正確辨識同一讀音的三種卡片', () => {
    const hand = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary', 'a-hiragana')
    const found = findYaku(hand, noBonus)
    expect(found.some((y) => y.kind === 'sameSound' && y.sound === 'ka')).toBe(true)
    const yaku = found.find((y) => y.kind === 'sameSound')!
    expect(yaku.baseScore).toBe(3)
    expect(yaku.totalScore).toBe(3)
    expect(yaku.cards).toHaveLength(3)
  })

  it('不同讀音不能誤判為同音三張', () => {
    const hand = cards('ka-hiragana', 'ki-katakana', 'ku-vocabulary')
    const found = findYaku(hand, noBonus)
    expect(found.filter((y) => y.kind === 'sameSound')).toHaveLength(0)
  })

  it('缺少一種卡片形式時不能成立', () => {
    const hand = cards('ka-hiragana', 'ka-katakana', 'ki-vocabulary')
    expect(findYaku(hand, noBonus).filter((y) => y.kind === 'sameSound')).toHaveLength(0)
  })
})

describe('同一行五張', () => {
  it('正確辨識か行五個不同讀音', () => {
    const hand = cards(
      'ka-hiragana',
      'ki-katakana',
      'ku-vocabulary',
      'ke-hiragana',
      'ko-katakana',
    )
    const found = findYaku(hand, noBonus).filter((y) => y.kind === 'sameRow')
    expect(found).toHaveLength(1)
    expect(found[0]?.row).toBe('ka')
    expect(found[0]?.baseScore).toBe(6)
    expect(new Set(found[0]!.cards.map((c) => c.sound)).size).toBe(5)
  })

  it('有重複讀音時不能冒充完整同一行', () => {
    const hand = cards(
      'ka-hiragana',
      'ka-katakana',
      'ki-hiragana',
      'ku-hiragana',
      'ke-hiragana',
    )
    const found = findYaku(hand, noBonus).filter((y) => y.kind === 'sameRow')
    expect(found).toHaveLength(0)
  })
})

describe('同一段五張', () => {
  it('正確辨識あ段五個不同讀音', () => {
    const hand = cards(
      'a-hiragana',
      'ka-katakana',
      'sa-vocabulary',
      'ta-hiragana',
      'na-katakana',
    )
    const found = findYaku(hand, noBonus).filter((y) => y.kind === 'sameColumn')
    expect(found).toHaveLength(1)
    expect(found[0]?.column).toBe('a')
    expect(found[0]?.baseScore).toBe(8)
  })

  it('正確辨識い段', () => {
    const hand = cards(
      'i-hiragana',
      'ki-hiragana',
      'shi-hiragana',
      'chi-hiragana',
      'ni-hiragana',
    )
    const found = findYaku(hand, noBonus).filter((y) => y.kind === 'sameColumn')
    expect(found[0]?.column).toBe('i')
    expect(found[0]?.uniformType).toBe('hiragana')
  })
})

describe('同類型加成與 Bonus', () => {
  it('全部平假名行牌 +3', () => {
    const hand = cards(
      'ka-hiragana',
      'ki-hiragana',
      'ku-hiragana',
      'ke-hiragana',
      'ko-hiragana',
    )
    expect(typeBonusFor('sameRow', hand)).toBe(3)
    const yaku = findYaku(hand, noBonus)[0]!
    expect(yaku.typeBonus).toBe(3)
    expect(yaku.totalScore).toBe(9)
  })

  it('全部片假名 +4、全部單字圖像 +5', () => {
    const kata = cards(
      'a-katakana',
      'ka-katakana',
      'sa-katakana',
      'ta-katakana',
      'na-katakana',
    )
    expect(typeBonusFor('sameColumn', kata)).toBe(4)
    const vocab = cards(
      'a-vocabulary',
      'ka-vocabulary',
      'sa-vocabulary',
      'ta-vocabulary',
      'na-vocabulary',
    )
    expect(typeBonusFor('sameColumn', vocab)).toBe(5)
  })

  it('同音組沒有同類型加成', () => {
    const hand = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    expect(typeBonusFor('sameSound', hand)).toBe(0)
  })

  it('Bonus：平假名牌型 +2', () => {
    const bonus = BONUS_MISSIONS.find((b) => b.kind === 'hiraganaYaku')!
    const hira = cards(
      'ka-hiragana',
      'ki-hiragana',
      'ku-hiragana',
      'ke-hiragana',
      'ko-hiragana',
    )
    expect(missionBonusFor('sameRow', hira, bonus)).toBe(2)
    const mixed = cards(
      'ka-hiragana',
      'ki-katakana',
      'ku-vocabulary',
      'ke-hiragana',
      'ko-hiragana',
    )
    expect(missionBonusFor('sameRow', mixed, bonus)).toBe(0)
  })

  it('Bonus：片假名牌型 +3', () => {
    const bonus = BONUS_MISSIONS.find((b) => b.kind === 'katakanaYaku')!
    const kata = cards(
      'ka-katakana',
      'ki-katakana',
      'ku-katakana',
      'ke-katakana',
      'ko-katakana',
    )
    expect(missionBonusFor('sameRow', kata, bonus)).toBe(3)
  })

  it('Bonus：あ段完成 +3、同一行 +2、同一段 +2', () => {
    const aCol = cards(
      'a-hiragana',
      'ka-hiragana',
      'sa-hiragana',
      'ta-hiragana',
      'na-hiragana',
    )
    const aBonus = BONUS_MISSIONS.find((b) => b.kind === 'aColumn')!
    expect(missionBonusFor('sameColumn', aCol, aBonus, 'a')).toBe(3)
    const rowBonus = BONUS_MISSIONS.find((b) => b.kind === 'rowYaku')!
    const row = cards(
      'ka-hiragana',
      'ki-hiragana',
      'ku-hiragana',
      'ke-hiragana',
      'ko-hiragana',
    )
    expect(missionBonusFor('sameRow', row, rowBonus)).toBe(2)
    const colBonus = BONUS_MISSIONS.find((b) => b.kind === 'columnYaku')!
    expect(missionBonusFor('sameColumn', aCol, colBonus, 'a')).toBe(2)
  })
})

describe('多個牌型同時成立', () => {
  it('同手牌可同時列出同音與同一行', () => {
    const hand = cards(
      'ka-hiragana',
      'ka-katakana',
      'ka-vocabulary',
      'ki-hiragana',
      'ku-hiragana',
      'ke-hiragana',
      'ko-hiragana',
    )
    const found = findYaku(hand, noBonus)
    expect(found.some((y) => y.kind === 'sameSound')).toBe(true)
    expect(found.some((y) => y.kind === 'sameRow')).toBe(true)
  })
})
