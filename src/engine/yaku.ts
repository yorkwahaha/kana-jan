import type { BonusMission } from '../data/bonuses'
import type { CardType, KanaCard } from '../data/cards'
import {
  ROW_LABEL,
  ROW_ORDER,
  isThreeSoundRow,
  soundsForRows,
  type RowId,
} from '../data/kana'
import type { YakuCandidate, YakuKind } from './types'

export const BASE_SCORE: Record<YakuKind, number> = {
  sameSound: 120,
  sameRow: 480,
  sameYoon: 180,
}

export interface FindYakuOptions {
  mustIncludeCardId?: string
  activeRows?: readonly RowId[]
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}

function yakuId(kind: YakuKind, key: string, cards: KanaCard[]): string {
  const ids = cards.map((c) => c.id).sort().join('+')
  return `${kind}:${key}:${ids}`
}

function uniformType(cards: KanaCard[]): CardType | undefined {
  const first = cards[0]?.cardType
  if (!first) return undefined
  return cards.every((c) => c.cardType === first) ? first : undefined
}

export function typeBonusFor(kind: YakuKind, cards: KanaCard[]): number {
  if (kind === 'sameSound') {
    const types = new Set(cards.map((c) => c.cardType))
    if (types.size === 3) return 360 // 三位相和加成 120 + 360 = 480
    const t = uniformType(cards)
    if (t) return 720 // 純色加成 120 + 720 = 840
    return 0
  }
  const t = uniformType(cards)
  if (!t) return 0
  if (kind === 'sameYoon') return 300 // 180 + 300 = 480
  if (kind === 'sameRow') return 1320 // 480 + 1320 = 1800
  return 0
}

export function missionBonusFor(
  _kind: YakuKind,
  cards: KanaCard[],
  bonus: BonusMission,
): number {
  if (bonus.kind !== 'targetSound' || bonus.points <= 0) return 0
  const hitsTarget = cards.some((c) => c.sound === bonus.sound)
  return hitsTarget ? bonus.points : 0
}

function finishYaku(
  partial: Omit<YakuCandidate, 'baseScore' | 'typeBonus' | 'missionBonus' | 'totalScore' | 'uniformType' | 'id'> & {
    id?: string
  },
  bonus: BonusMission,
): YakuCandidate {
  const typeBonus = typeBonusFor(partial.kind, partial.cards)
  const missionBonus = missionBonusFor(partial.kind, partial.cards, bonus)
  const baseScore = BASE_SCORE[partial.kind]
  const uniform = uniformType(partial.cards)
  const id =
    partial.id ??
    yakuId(partial.kind, partial.sound ?? partial.row ?? '', partial.cards)
  return {
    ...partial,
    id,
    uniformType: uniform,
    baseScore,
    typeBonus,
    missionBonus,
    totalScore: Math.max(10, Math.round((baseScore + typeBonus + missionBonus) / 10) * 10),
  }
}

function pickCardSetsForSounds(
  bySound: Map<string, KanaCard[]>,
  sounds: string[],
  mustIncludeCardId?: string,
): KanaCard[][] {
  const choices = sounds.map((sound) => {
    const candidates = bySound.get(sound) ?? []
    const byType = new Map<CardType, KanaCard>()
    for (const card of candidates) {
      const current = byType.get(card.cardType)
      if (!current || card.id === mustIncludeCardId) byType.set(card.cardType, card)
    }
    return [...byType.values()]
  })
  if (choices.some((cards) => cards.length === 0)) return []

  const sets: KanaCard[][] = []
  const visit = (index: number, picked: KanaCard[]) => {
    if (index === choices.length) {
      if (!mustIncludeCardId || picked.some((card) => card.id === mustIncludeCardId)) {
        sets.push(picked)
      }
      return
    }
    for (const card of choices[index]!) visit(index + 1, [...picked, card])
  }
  visit(0, [])
  return sets.sort((a, b) => {
    const bonusA = typeBonusFor(isThreeSoundRow(a[0]!.row) ? 'sameYoon' : 'sameRow', a)
    const bonusB = typeBonusFor(isThreeSoundRow(b[0]!.row) ? 'sameYoon' : 'sameRow', b)
    if (bonusB !== bonusA) return bonusB - bonusA
    return a.map((card) => card.id).join('+').localeCompare(b.map((card) => card.id).join('+'))
  })
}

function sameSoundLabel(hiragana: string, cards: KanaCard[]): string {
  const types = new Set(cards.map((c) => c.cardType))
  if (types.size === 3) {
    return `${hiragana}同音組（三位相和）`
  }
  const t = uniformType(cards)
  if (t === 'hiragana') return `${hiragana}同音組（平假純色）`
  if (t === 'katakana') return `${hiragana}同音組（片假純色）`
  if (t === 'vocabulary') return `${hiragana}同音組（單字純色）`
  const counts = {
    hiragana: cards.filter((card) => card.cardType === 'hiragana').length,
    katakana: cards.filter((card) => card.cardType === 'katakana').length,
    vocabulary: cards.filter((card) => card.cardType === 'vocabulary').length,
  }
  const mix = [
    counts.hiragana > 0 ? `${counts.hiragana}平` : '',
    counts.katakana > 0 ? `${counts.katakana}片` : '',
    counts.vocabulary > 0 ? `${counts.vocabulary}字` : '',
  ].filter(Boolean).join('')
  return `${hiragana}同音組（混色 ${mix}）`
}

function pickSameSoundCardSets(group: KanaCard[], mustId?: string): KanaCard[][] {
  if (group.length < 3) return []
  if (mustId && !group.some((c) => c.id === mustId)) return []

  const bestByTypeMix = new Map<string, KanaCard[]>()
  const n = group.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const sub = [group[i]!, group[j]!, group[k]!]
        if (mustId && !sub.some((c) => c.id === mustId)) continue
        const mixKey = [...sub.map((c) => c.cardType)].sort().join('+')
        if (!bestByTypeMix.has(mixKey)) bestByTypeMix.set(mixKey, sub)
      }
    }
  }

  return [...bestByTypeMix.values()].sort((a, b) => {
    const bonusA = typeBonusFor('sameSound', a)
    const bonusB = typeBonusFor('sameSound', b)
    if (bonusB !== bonusA) return bonusB - bonusA
    return a.map((c) => c.id).join('+').localeCompare(b.map((c) => c.id).join('+'))
  })
}

export function findYaku(
  cards: KanaCard[],
  bonus: BonusMission,
  options?: FindYakuOptions,
): YakuCandidate[] {
  const results: YakuCandidate[] = []
  const mustId = options?.mustIncludeCardId
  const eligibleCards = options?.activeRows
    ? cards.filter((card) => options.activeRows!.includes(card.row))
    : cards
  const includesRequired = (picked: KanaCard[]) =>
    !mustId || picked.some((c) => c.id === mustId)

  // 1. 同音三張 (sameSound: 任意同音 3 張，平+片+字或同型態享額外加成)
  const bySound = groupBy(eligibleCards, (c) => c.sound)
  for (const [sound, group] of bySound) {
    if (mustId && !group.some((c) => c.id === mustId)) continue

    const pickedSets = pickSameSoundCardSets(group, mustId)
    for (const picked of pickedSets) {
      if (!includesRequired(picked)) continue
      const displaySound = picked.find((c) => c.cardType === 'hiragana')?.hiragana ?? picked[0]!.hiragana
      results.push(
        finishYaku(
          {
            kind: 'sameSound',
            cards: picked,
            sound,
            label: sameSoundLabel(displaySound, picked),
          },
          bonus,
        ),
      )
    }
  }

  // 2. 行牌型：一般行五張 (sameRow) 或 拗音三張 (sameYoon)
  const byRow = groupBy(eligibleCards, (c) => c.row)
  for (const [row, group] of byRow) {
    if (mustId && !group.some((c) => c.id === mustId)) continue
    const rowId = row as RowId
    const expectedSounds = soundsForRows([rowId]).map((kana) => kana.sound)

    if (isThreeSoundRow(rowId)) {
      // 三音行（拗音／や行／わ行）：3 個不同讀音湊齊即成牌型
      const soundsInRow = groupBy(group, (c) => c.sound)
      if (expectedSounds.every((sound) => soundsInRow.has(sound))) {
        for (const picked of pickCardSetsForSounds(soundsInRow, expectedSounds, mustId)) {
          results.push(
            finishYaku(
              {
                kind: 'sameYoon',
                cards: picked,
                row: rowId,
                label: `${ROW_LABEL[rowId]}揃い`,
              },
              bonus,
            ),
          )
        }
      }
    } else {
      // 清音 / 濁音行：5 個音
      const soundsInRow = groupBy(group, (c) => c.sound)
      if (expectedSounds.every((sound) => soundsInRow.has(sound))) {
        for (const picked of pickCardSetsForSounds(soundsInRow, expectedSounds, mustId)) {
          results.push(
            finishYaku(
              {
                kind: 'sameRow',
                cards: picked,
                row: rowId,
                label: `${ROW_LABEL[rowId]}揃い`,
              },
              bonus,
            ),
          )
        }
      }
    }
  }

  results.sort((a, b) => b.totalScore - a.totalScore || a.label.localeCompare(b.label, 'ja'))
  return results
}

export interface NearYakuHint {
  kind: YakuKind
  label: string
  distance: number
  cardIds: string[]
  missingSounds: string[]
}

export function findNearYaku(
  cards: KanaCard[],
  activeRows: readonly RowId[] = ROW_ORDER,
): NearYakuHint[] {
  const hints: NearYakuHint[] = []
  const eligibleCards = cards.filter((card) => activeRows.includes(card.row))

  const bySound = groupBy(eligibleCards, (c) => c.sound)
  for (const [, group] of bySound) {
    if (group.length === 2) {
      const sample = group[0]!
      hints.push({
        kind: 'sameSound',
        label: `${sample.hiragana}同音組`,
        distance: 1,
        cardIds: group.map((c) => c.id),
        missingSounds: [sample.sound],
      })
    }
  }

  const byRow = groupBy(eligibleCards, (c) => c.row)
  for (const [row, group] of byRow) {
    const rowId = row as RowId
    if (!activeRows.includes(rowId)) continue
    const rowSounds = soundsForRows([rowId]).map((kana) => kana.sound)
    const rowSoundSet = new Set(rowSounds)
    const validGroup = group.filter((card) => rowSoundSet.has(card.sound))
    const sounds = new Set(validGroup.map((c) => c.sound))
    const missingSounds = rowSounds.filter((sound) => !sounds.has(sound))
    if (isThreeSoundRow(rowId)) {
      if (sounds.size === 2) {
        hints.push({
          kind: 'sameYoon',
          label: `${ROW_LABEL[rowId]}揃い`,
          distance: 1,
          cardIds: validGroup.map((c) => c.id),
          missingSounds,
        })
      }
    } else {
      if (sounds.size === 4) {
        hints.push({
          kind: 'sameRow',
          label: `${ROW_LABEL[rowId]}揃い`,
          distance: 1,
          cardIds: validGroup.map((c) => c.id),
          missingSounds,
        })
      }
    }
  }

  return hints
}
