import { describe, expect, it } from 'vitest'
import { makeTargetBonus, type BonusMission } from '../data/bonuses'
import { getCardById, type KanaCard } from '../data/cards'
import { getSound } from '../data/kana'
import { findYaku, missionBonusFor, typeBonusFor } from './yaku'

const noBonus: BonusMission = makeTargetBonus(getSound('ne'), 0)

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
    const found = findYaku(hand, noBonus)[0]!
    expect(found.column).toBe('i')
    expect(found.uniformType).toBe('hiragana')
  })

  it('少於五行時不判定同一段', () => {
    const hand = cards(
      'a-hiragana',
      'ka-katakana',
      'sa-vocabulary',
      'ta-hiragana',
      'na-katakana',
    )
    const found = findYaku(hand, noBonus, { activeRows: ['a', 'ka'] }).filter((y) => y.kind === 'sameColumn')
    expect(found).toHaveLength(0)
  })
})

describe('組字役', () => {
  it('能用讀音卡拼出 Bonus 單字', () => {
    const bonus = makeTargetBonus(getSound('ne'), 3)
    const hand = cards('ne-hiragana', 'ko-katakana', 'a-hiragana')
    const found = findYaku(hand, bonus, { activeRows: ['a', 'ka', 'sa', 'ta', 'na'] }).filter((y) => y.kind === 'word')
    expect(found).toHaveLength(1)
    expect(found[0]?.word).toBe('ねこ')
    expect(found[0]?.baseScore).toBe(5)
    expect(found[0]?.missionBonus).toBe(3)
    expect(found[0]?.totalScore).toBe(8)
  })

  it('缺音時不能組字', () => {
    const bonus = makeTargetBonus(getSound('ne'), 3)
    const hand = cards('ne-hiragana', 'a-hiragana')
    expect(findYaku(hand, bonus).filter((y) => y.kind === 'word')).toHaveLength(0)
  })

  it('單字所需行未出場時不提供組字', () => {
    const bonus = makeTargetBonus(getSound('ne'), 3)
    const hand = cards('ne-hiragana', 'ko-hiragana')
    expect(findYaku(hand, bonus, { activeRows: ['a'] }).filter((y) => y.kind === 'word')).toHaveLength(0)
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

  it('Bonus：目標音的同音組加分', () => {
    const bonus = makeTargetBonus(getSound('ka'), 3)
    const same = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    expect(missionBonusFor('sameSound', same, bonus)).toBe(3)
    const other = cards('sa-hiragana', 'sa-katakana', 'sa-vocabulary')
    expect(missionBonusFor('sameSound', other, bonus)).toBe(0)
  })

  it('Bonus：含目標音的行揃い加分', () => {
    const bonus = makeTargetBonus(getSound('ka'), 3)
    const row = cards(
      'ka-hiragana',
      'ki-hiragana',
      'ku-hiragana',
      'ke-hiragana',
      'ko-hiragana',
    )
    expect(missionBonusFor('sameRow', row, bonus)).toBe(3)
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
