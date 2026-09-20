import { describe, expect, it } from 'vitest'
import { makeTargetBonus, type BonusMission } from '../data/bonuses'
import { getCardById, type KanaCard } from '../data/cards'
import { getSound } from '../data/kana'
import { findNearYaku, findYaku, missionBonusFor, typeBonusFor } from './yaku'

const noBonus: BonusMission = makeTargetBonus(getSound('ne'), 0)

function cards(...ids: string[]): KanaCard[] {
  return ids.map(getCardById)
}

describe('同音三張', () => {
  it('正確辨識同一讀音的三種不同形式（三位相和，享 +360 全彩加成，共 480 分）', () => {
    const hand = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary', 'a-hiragana')
    const found = findYaku(hand, noBonus)
    expect(found.some((y) => y.kind === 'sameSound' && y.sound === 'ka')).toBe(true)
    const yaku = found.find((y) => y.kind === 'sameSound')!
    expect(yaku.baseScore).toBe(120)
    expect(yaku.typeBonus).toBe(360) // 三位相和加成
    expect(yaku.totalScore).toBe(480)
    expect(yaku.label).toContain('三位相和')
    expect(yaku.cards).toHaveLength(3)
  })

  it('同一讀音的任意三張卡（如 2平1片）即可組成同音三張（基礎分 120）', () => {
    const k1 = getCardById('ka-hiragana')
    const k2 = { ...k1, id: 'ka-hiragana#1' }
    const k3 = getCardById('ka-katakana')
    const found = findYaku([k1, k2, k3], noBonus)
    const yaku = found.find((y) => y.kind === 'sameSound')
    expect(yaku).toBeTruthy()
    expect(yaku?.baseScore).toBe(120)
    expect(yaku?.typeBonus).toBe(0)
    expect(yaku?.totalScore).toBe(120)
  })

  it('同音三張純平假名享 +720 純色加成（共 840 分）', () => {
    const k1 = getCardById('ka-hiragana')
    const k2 = { ...k1, id: 'ka-hiragana#1' }
    const k3 = { ...k1, id: 'ka-hiragana#2' }
    const found = findYaku([k1, k2, k3], noBonus)
    const yaku = found.find((y) => y.kind === 'sameSound')
    expect(yaku).toBeTruthy()
    expect(yaku?.typeBonus).toBe(720)
    expect(yaku?.totalScore).toBe(840)
  })

  it('同音三張純片假名享 +720 純色加成（共 840 分）', () => {
    const k1 = getCardById('ka-katakana')
    const k2 = { ...k1, id: 'ka-katakana#1' }
    const k3 = { ...k1, id: 'ka-katakana#2' }
    const found = findYaku([k1, k2, k3], noBonus)
    const yaku = found.find((y) => y.kind === 'sameSound')
    expect(yaku).toBeTruthy()
    expect(yaku?.typeBonus).toBe(720)
    expect(yaku?.totalScore).toBe(840)
  })

  it('同音三張純單字圖像享 +720 純色加成（共 840 分）', () => {
    const k1 = getCardById('ka-vocabulary')
    const k2 = { ...k1, id: 'ka-vocabulary#1' }
    const k3 = { ...k1, id: 'ka-vocabulary#2' }
    const found = findYaku([k1, k2, k3], noBonus)
    const yaku = found.find((y) => y.kind === 'sameSound')
    expect(yaku).toBeTruthy()
    expect(yaku?.typeBonus).toBe(720)
    expect(yaku?.totalScore).toBe(840)
  })

  it('手牌有多張同音牌時優先挑選最高分組合（純色 840 > 三位相和 480）', () => {
    // 2平 + 1片 + 1字 -> 應該挑選 1平+1片+1字 達成三位相和 (480分)
    const h1 = getCardById('ka-hiragana')
    const h2 = { ...h1, id: 'ka-hiragana#1' }
    const kata = getCardById('ka-katakana')
    const vocab = getCardById('ka-vocabulary')
    const found = findYaku([h1, h2, kata, vocab], noBonus)
    const yaku = found.find((y) => y.kind === 'sameSound')
    expect(yaku?.totalScore).toBe(480)
    expect(yaku?.label).toContain('三位相和')
  })

  it('不同讀音不能誤判為同音三張', () => {
    const hand = cards('ka-hiragana', 'ki-katakana', 'ku-vocabulary')
    const found = findYaku(hand, noBonus)
    expect(found.filter((y) => y.kind === 'sameSound')).toHaveLength(0)
  })

  it('同音少於三張時不能成立', () => {
    const hand = cards('ka-hiragana', 'ka-katakana', 'ki-vocabulary')
    expect(findYaku(hand, noBonus).filter((y) => y.kind === 'sameSound')).toHaveLength(0)
  })
})

describe('同一行五張', () => {
  it('正確辨識か行五個不同讀音（基礎分 480）', () => {
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
    expect(found[0]?.baseScore).toBe(480)
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

describe('移除同一段 (sameColumn)', () => {
  it('湊齊同段讀音不再判定為役種（回歸純粹 Pokajan 規則）', () => {
    const hand = cards(
      'a-hiragana',
      'ka-katakana',
      'sa-vocabulary',
      'ta-hiragana',
      'na-katakana',
    )
    const found = findYaku(hand, noBonus, { activeRows: ['a', 'ka', 'sa', 'ta', 'na'] })
    expect(found).toHaveLength(0)
  })
})

describe('組字役', () => {
  it('能用讀音卡拼出 Bonus 單字（基礎分 240 + Bonus 90 = 330）', () => {
    const bonus = makeTargetBonus(getSound('ne'), 90)
    const hand = cards('ne-hiragana', 'ko-katakana', 'a-hiragana')
    const found = findYaku(hand, bonus, { activeRows: ['a', 'ka', 'sa', 'ta', 'na'] }).filter((y) => y.kind === 'word')
    expect(found).toHaveLength(1)
    expect(found[0]?.word).toBe('ねこ')
    expect(found[0]?.baseScore).toBe(240)
    expect(found[0]?.missionBonus).toBe(90)
    expect(found[0]?.totalScore).toBe(330)
  })

  it('本局有 ん 時可組字 ぱん', () => {
    const bonus = makeTargetBonus(getSound('pa'), 90)
    const hand = cards('pa-hiragana', 'n-hiragana')
    const found = findYaku(hand, bonus, { activeRows: ['pa', 'wa'] }).filter((y) => y.kind === 'word')
    expect(found).toHaveLength(1)
    expect(found[0]?.word).toBe('ぱん')
  })

  it('缺音時不能組字', () => {
    const bonus = makeTargetBonus(getSound('ne'), 90)
    const hand = cards('ne-hiragana', 'a-hiragana')
    expect(findYaku(hand, bonus).filter((y) => y.kind === 'word')).toHaveLength(0)
  })

  it('單字所需行未出場時不提供組字', () => {
    const bonus = makeTargetBonus(getSound('ne'), 90)
    const hand = cards('ne-hiragana', 'ko-hiragana')
    expect(findYaku(hand, bonus, { activeRows: ['a'] }).filter((y) => y.kind === 'word')).toHaveLength(0)
  })
})

describe('同類型加成與 Bonus', () => {
  it('全部平假名行牌享純色加成（+1320，共 1800 分）', () => {
    const hand = cards(
      'ka-hiragana',
      'ki-hiragana',
      'ku-hiragana',
      'ke-hiragana',
      'ko-hiragana',
    )
    expect(typeBonusFor('sameRow', hand)).toBe(1320)
    const yaku = findYaku(hand, noBonus)[0]!
    expect(yaku.typeBonus).toBe(1320)
    expect(yaku.totalScore).toBe(1800)
  })


  it('同音組混色時無加成，三位相和享 +360，純色享 +720', () => {
    const k1 = getCardById('ka-hiragana')
    const k2 = { ...k1, id: 'ka-hiragana#1' }
    const kKata = getCardById('ka-katakana')
    const kVocab = getCardById('ka-vocabulary')
    // 2平1片 -> 混色無加成
    expect(typeBonusFor('sameSound', [k1, k2, kKata])).toBe(0)
    // 平片字各一 -> 三位相和 +360 (共 480)
    expect(typeBonusFor('sameSound', [k1, kKata, kVocab])).toBe(360)
    // 3平 -> 純色 +720 (共 840)
    const k3 = { ...k1, id: 'ka-hiragana#2' }
    expect(typeBonusFor('sameSound', [k1, k2, k3])).toBe(720)
  })

  it('Bonus：目標音的同音組加分（+90）', () => {
    const bonus = makeTargetBonus(getSound('ka'), 90)
    const same = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    expect(missionBonusFor('sameSound', same, bonus)).toBe(90)
    const other = cards('sa-hiragana', 'sa-katakana', 'sa-vocabulary')
    expect(missionBonusFor('sameSound', other, bonus)).toBe(0)
  })

  it('Bonus：含目標音的行揃い加分（+90）', () => {
    const bonus = makeTargetBonus(getSound('ka'), 90)
    const row = cards(
      'ka-hiragana',
      'ki-hiragana',
      'ku-hiragana',
      'ke-hiragana',
      'ko-hiragana',
    )
    expect(missionBonusFor('sameRow', row, bonus)).toBe(90)
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
  it('拗音三張（しゃ/しゅ/しょ）正確判定 sameYoon 且基礎分為 180', () => {
    const hand = cards('sha-hiragana', 'shu-katakana', 'sho-vocabulary')
    const found = findYaku(hand, noBonus, { activeRows: ['sha', 'ka', 'sa', 'ta'] })
    const yoon = found.find((y) => y.kind === 'sameYoon')
    expect(yoon).toBeTruthy()
    expect(yoon?.baseScore).toBe(180)
    expect(yoon?.totalScore).toBe(180)
    expect(yoon?.label).toContain('しゃ行揃い')
  })

  it('拗音同音三張（しゃ/シャ/写真）正確判定 sameSound（三位相和 480 分）', () => {
    const hand = cards('sha-hiragana', 'sha-katakana', 'sha-vocabulary')
    const found = findYaku(hand, noBonus, { activeRows: ['sha', 'ka', 'sa', 'ta'] })
    const same = found.find((y) => y.kind === 'sameSound')
    expect(same).toBeTruthy()
    expect(same?.baseScore).toBe(120)
    expect(same?.typeBonus).toBe(360) // 三位相和加成
    expect(same?.totalScore).toBe(480)
  })

  it('や行三音（や／ゆ／よ）判定為三音揃い', () => {
    const hand = cards('ya-hiragana', 'yu-katakana', 'yo-vocabulary')
    const found = findYaku(hand, noBonus, { activeRows: ['ya', 'wa'] })
    const yoon = found.find((y) => y.kind === 'sameYoon' && y.row === 'ya')
    expect(yoon).toBeTruthy()
    expect(yoon?.baseScore).toBe(180)
    expect(yoon?.label).toContain('や行揃い')
  })

  it('わ行三音（わ／を／ん）判定為三音揃い', () => {
    const hand = cards('wa-hiragana', 'wo-katakana', 'n-vocabulary')
    const found = findYaku(hand, noBonus, { activeRows: ['ya', 'wa'] })
    const yoon = found.find((y) => y.kind === 'sameYoon' && y.row === 'wa')
    expect(yoon).toBeTruthy()
    expect(yoon?.baseScore).toBe(180)
    expect(yoon?.label).toContain('わ行揃い')
  })

  it('拗音三張全同類型享 +300 純色加成（共 480 分）', () => {
    const hand = cards('sha-hiragana', 'shu-hiragana', 'sho-hiragana')
    const found = findYaku(hand, noBonus, { activeRows: ['sha', 'ka', 'sa', 'ta'] })
    const yoon = found.find((y) => y.kind === 'sameYoon')
    expect(yoon).toBeTruthy()
    expect(yoon?.typeBonus).toBe(300)
    expect(yoon?.totalScore).toBe(480) // 180 + 300
  })

  it('拗音同音重複卡（如 しゃ/しゃ/しゃ）亦可組成 sameSound', () => {
    const h1 = getCardById('sha-hiragana')
    const h2 = { ...h1, id: 'sha-hiragana#1' }
    const h3 = { ...h1, id: 'sha-hiragana#2' }
    const found = findYaku([h1, h2, h3], noBonus, { activeRows: ['sha'] })
    expect(found.some((y) => y.kind === 'sameSound')).toBe(true)
  })
})

describe('抄牌與聽牌判定', () => {
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

  it('已有同音 3 張（例如 2平1片）時已成牌，findNearYaku 不應誤報為聽牌', () => {
    const k1 = getCardById('ka-hiragana')
    const k2 = { ...k1, id: 'ka-hiragana#1' }
    const kKata = getCardById('ka-katakana')
    const hints = findNearYaku([k1, k2, kKata], ['ka'])
    expect(hints.filter((h) => h.kind === 'sameSound')).toHaveLength(0)
  })

  it('findNearYaku 不再提供同一段聽牌提示', () => {
    const ki = getCardById('ki-hiragana')
    const shi = getCardById('shi-hiragana')
    const hints = findNearYaku([ki, shi], ['sha', 'ka', 'sa', 'ta'])
    expect(hints.some((h) => h.label.includes('段'))).toBe(false)
  })
})

