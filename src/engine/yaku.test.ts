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

describe('拗音牌型', () => {
  it('拗音三張（しゃ/しゅ/しょ）正確判定 sameYoon 且基礎分為 4', () => {
    const hand = cards('sha-hiragana', 'shu-katakana', 'sho-vocabulary')
    const found = findYaku(hand, noBonus, { activeRows: ['sha', 'ka', 'sa', 'ta'] })
    const yoon = found.find((y) => y.kind === 'sameYoon')
    expect(yoon).toBeTruthy()
    expect(yoon?.baseScore).toBe(4)
    expect(yoon?.totalScore).toBe(4)
    expect(yoon?.label).toContain('しゃ行揃い')
  })

  it('拗音同音三張（しゃ/シャ/写真）正確判定 sameSound（3 分）', () => {
    const hand = cards('sha-hiragana', 'sha-katakana', 'sha-vocabulary')
    const found = findYaku(hand, noBonus, { activeRows: ['sha', 'ka', 'sa', 'ta'] })
    const same = found.find((y) => y.kind === 'sameSound')
    expect(same).toBeTruthy()
    expect(same?.baseScore).toBe(3)
    expect(same?.totalScore).toBe(3)
  })

  it('拗音三張全同類型享 +2 純色加成', () => {
    const hand = cards('sha-hiragana', 'shu-hiragana', 'sho-hiragana')
    const found = findYaku(hand, noBonus, { activeRows: ['sha', 'ka', 'sa', 'ta'] })
    const yoon = found.find((y) => y.kind === 'sameYoon')
    expect(yoon).toBeTruthy()
    expect(yoon?.typeBonus).toBe(2)
    expect(yoon?.totalScore).toBe(6) // 4 + 2
  })

  it('拗音同音重複卡（如 しゃ/しゃ/しゃ）亦可組成 sameSound', () => {
    const h1 = getCardById('sha-hiragana')
    const h2 = { ...h1, id: 'sha-hiragana#1' }
    const h3 = { ...h1, id: 'sha-hiragana#2' }
    const found = findYaku([h1, h2, h3], noBonus, { activeRows: ['sha'] })
    expect(found.some((y) => y.kind === 'sameSound')).toBe(true)
  })
})

describe('4 行環境下的段牌型與抄牌 Bug 修復', () => {
  it('4 行環境下湊齊同段 4 張判定 sameColumn（8 分）', () => {
    const hand = cards('a-hiragana', 'ka-hiragana', 'sa-hiragana', 'ta-hiragana')
    const found = findYaku(hand, noBonus, { activeRows: ['a', 'ka', 'sa', 'ta'] })
    const col = found.find((y) => y.kind === 'sameColumn')
    expect(col).toBeTruthy()
    expect(col?.baseScore).toBe(8)
  })

  it('手牌有重複牌時，抄對手打出的牌必定被包含進候選組合中', () => {
    // 手牌有 a#0, 對手打出 a#1, 手牌還有 i, u, e, o
    const a0 = getCardById('a-hiragana')
    const a1 = { ...a0, id: 'a-hiragana#1' }
    const other = cards('i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana')
    const found = findYaku([a0, a1, ...other], noBonus, {
      mustIncludeCardId: a1.id,
      activeRows: ['a'],
    })
    expect(found.some((y) => y.cards.some((c) => c.id === a1.id))).toBe(true)
  })
})

