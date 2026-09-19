import type { BonusMission } from '../data/bonuses'
import { bonusSpelling } from '../data/bonuses'
import type { CardType, KanaCard } from '../data/cards'
import {
  COLUMN_LABEL,
  ROW_LABEL,
  ROW_ORDER,
  getSound,
  isYoonRow,
  soundsForRows,
  type ColumnId,
  type RowId,
} from '../data/kana'
import { columnYakuEnabled } from '../data/lessons'
import type { YakuCandidate, YakuKind } from './types'

export const BASE_SCORE: Record<YakuKind, number> = {
  sameSound: 3,
  sameRow: 6,
  sameColumn: 8,
  sameYoon: 4,
  word: 5,
}

export const TYPE_BONUS: Record<CardType, number> = {
  hiragana: 3,
  katakana: 4,
  vocabulary: 5,
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
  if (kind === 'word') return 0
  if (kind === 'sameSound') {
    const types = new Set(cards.map((c) => c.cardType))
    if (types.size === 3) return 3 // 三位相和加成 +3
    const t = uniformType(cards)
    if (t) return TYPE_BONUS[t] // 純色加成
    return 0
  }
  const t = uniformType(cards)
  if (!t) return 0
  if (kind === 'sameYoon') return 2
  return TYPE_BONUS[t]
}

export function missionBonusFor(
  kind: YakuKind,
  cards: KanaCard[],
  bonus: BonusMission,
  column?: ColumnId,
): number {
  if (bonus.kind !== 'targetSound' || bonus.points <= 0) return 0
  const hitsTarget = cards.some((c) => c.sound === bonus.sound)
  if (!hitsTarget && kind !== 'word') return 0
  switch (kind) {
    case 'sameSound':
      return cards[0]?.sound === bonus.sound ? bonus.points : 0
    case 'sameRow':
    case 'sameYoon':
      return hitsTarget ? bonus.points : 0
    case 'word':
      return bonus.points
    case 'sameColumn':
      return column !== undefined && hitsTarget ? bonus.points : 0
    default:
      return 0
  }
}

function finishYaku(
  partial: Omit<YakuCandidate, 'baseScore' | 'typeBonus' | 'missionBonus' | 'totalScore' | 'uniformType' | 'id'> & {
    id?: string
  },
  bonus: BonusMission,
): YakuCandidate {
  const typeBonus = typeBonusFor(partial.kind, partial.cards)
  const missionBonus = missionBonusFor(partial.kind, partial.cards, bonus, partial.column)
  const baseScore = BASE_SCORE[partial.kind]
  const uniform = uniformType(partial.cards)
  const id =
    partial.id ??
    yakuId(partial.kind, partial.sound ?? partial.row ?? partial.column ?? partial.word ?? '', partial.cards)
  return {
    ...partial,
    id,
    uniformType: uniform,
    baseScore,
    typeBonus,
    missionBonus,
    totalScore: baseScore + typeBonus + missionBonus,
  }
}

function pickBestSetForSounds(
  bySound: Map<string, KanaCard[]>,
  sounds: string[],
  mustIncludeCardId?: string,
): KanaCard[] {
  const tryType = (t: CardType): KanaCard[] | null => {
    const picked: KanaCard[] = []
    for (const sound of sounds) {
      const candidates = bySound.get(sound) ?? []
      let card: KanaCard | undefined
      if (mustIncludeCardId && candidates.some((c) => c.id === mustIncludeCardId)) {
        card = candidates.find((c) => c.id === mustIncludeCardId)
        if (card && card.cardType !== t) return null
      } else {
        card = candidates.find((c) => c.cardType === t)
      }
      if (!card) return null
      picked.push(card)
    }
    return picked
  }

  const uniform =
    tryType('vocabulary') ??
    tryType('katakana') ??
    tryType('hiragana')

  if (uniform) return uniform

  return sounds.map((sound) => {
    const candidates = bySound.get(sound) ?? []
    if (mustIncludeCardId) {
      const target = candidates.find((c) => c.id === mustIncludeCardId)
      if (target) return target
    }
    const card = candidates[0]
    if (!card) throw new Error(`Missing sound ${sound}`)
    return card
  })
}

function pickDistinctSounds(
  bySound: Map<string, KanaCard[]>,
  targetCount: number,
  mustIncludeCardId?: string,
  bonusSound?: string,
): string[] {
  const sounds = [...bySound.keys()]
  if (sounds.length <= targetCount) return sounds

  // Prioritize sounds containing mustIncludeCardId, then bonusSound, then matching types
  sounds.sort((a, b) => {
    const aHasMust = mustIncludeCardId && bySound.get(a)?.some((c) => c.id === mustIncludeCardId) ? 1 : 0
    const bHasMust = mustIncludeCardId && bySound.get(b)?.some((c) => c.id === mustIncludeCardId) ? 1 : 0
    if (bHasMust !== aHasMust) return bHasMust - aHasMust

    const aHasBonus = bonusSound && a === bonusSound ? 1 : 0
    const bHasBonus = bonusSound && b === bonusSound ? 1 : 0
    if (bHasBonus !== aHasBonus) return bHasBonus - aHasBonus

    return 0
  })

  // Try to find a group of targetCount sounds that share a uniform card type
  for (const t of ['vocabulary', 'katakana', 'hiragana'] as const) {
    const matching = sounds.filter((s) => bySound.get(s)?.some((c) => c.cardType === t))
    if (matching.length >= targetCount) {
      const mustSound = mustIncludeCardId
        ? matching.find((s) => bySound.get(s)?.some((c) => c.id === mustIncludeCardId))
        : undefined
      if (!mustIncludeCardId || mustSound) {
        const sorted = [...matching].sort((a, b) => {
          if (mustSound) {
            if (a === mustSound) return -1
            if (b === mustSound) return 1
          }
          if (bonusSound) {
            if (a === bonusSound) return -1
            if (b === bonusSound) return 1
          }
          return 0
        })
        return sorted.slice(0, targetCount)
      }
    }
  }

  return sounds.slice(0, targetCount)
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
  return `${hiragana}同音組`
}

function pickBestSameSoundCards(group: KanaCard[], mustId?: string): KanaCard[] | null {
  if (group.length < 3) return null
  if (mustId && !group.some((c) => c.id === mustId)) return null

  if (group.length === 3) {
    return group
  }

  const validSubsets: KanaCard[][] = []
  const n = group.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const sub = [group[i]!, group[j]!, group[k]!]
        if (!mustId || sub.some((c) => c.id === mustId)) {
          validSubsets.push(sub)
        }
      }
    }
  }

  if (validSubsets.length === 0) return null

  validSubsets.sort((a, b) => {
    const bonusA = typeBonusFor('sameSound', a)
    const bonusB = typeBonusFor('sameSound', b)
    if (bonusB !== bonusA) return bonusB - bonusA
    return 0
  })

  return validSubsets[0] ?? null
}

function pickWordCards(cards: KanaCard[], spelling: string[], mustIncludeCardId?: string): KanaCard[] | null {
  const used = new Set<string>()
  const picked: KanaCard[] = []
  for (const mora of spelling) {
    const pool = cards.filter((c) => c.sound === mora && !used.has(c.id))
    if (pool.length === 0) return null
    const target = mustIncludeCardId ? pool.find((c) => c.id === mustIncludeCardId) : undefined
    const card =
      target ??
      pool.find((c) => c.cardType === 'hiragana') ??
      pool.find((c) => c.cardType === 'katakana') ??
      pool[0]!
    used.add(card.id)
    picked.push(card)
  }
  if (mustIncludeCardId && !picked.some((c) => c.id === mustIncludeCardId)) {
    return null
  }
  return picked
}

export function findYaku(
  cards: KanaCard[],
  bonus: BonusMission,
  options?: FindYakuOptions,
): YakuCandidate[] {
  const results: YakuCandidate[] = []
  const mustId = options?.mustIncludeCardId
  const activeRows = options?.activeRows ?? ROW_ORDER

  const includesRequired = (picked: KanaCard[]) =>
    !mustId || picked.some((c) => c.id === mustId)

  // 1. 同音三張 (sameSound: 任意同音 3 張，平+片+字或同型態享額外加成)
  const bySound = groupBy(cards, (c) => c.sound)
  for (const [sound, group] of bySound) {
    if (mustId && !group.some((c) => c.id === mustId)) continue

    const picked = pickBestSameSoundCards(group, mustId)
    if (picked && includesRequired(picked)) {
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
  const byRow = groupBy(cards, (c) => c.row)
  for (const [row, group] of byRow) {
    if (mustId && !group.some((c) => c.id === mustId)) continue
    const rowId = row as RowId

    if (isYoonRow(rowId)) {
      // 拗音行：3 個音 (a, u, o 段) 湊齊即成牌型
      const soundsInRow = groupBy(group, (c) => c.sound)
      if (soundsInRow.size === 3) {
        const picked = pickBestSetForSounds(soundsInRow, [...soundsInRow.keys()], mustId)
        if (includesRequired(picked)) {
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
      if (soundsInRow.size >= 5) {
        const sounds = pickDistinctSounds(soundsInRow, 5, mustId, bonus.sound)
        const picked = pickBestSetForSounds(soundsInRow, sounds, mustId)
        if (includesRequired(picked)) {
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

  // 3. 段牌型：同一段 (sameColumn)
  if (columnYakuEnabled(activeRows)) {
    const byColumn = groupBy(cards, (c) => c.column)
    for (const [column, group] of byColumn) {
      if (mustId && !group.some((c) => c.id === mustId)) continue
      const colId = column as ColumnId
      const activeRowsWithCol = activeRows.filter((r) => soundsForRows([r]).some((s) => s.column === colId))
      const targetCount = Math.min(4, activeRowsWithCol.length)
      if (targetCount < 3) continue
      const soundsInCol = groupBy(group, (c) => c.sound)
      if (soundsInCol.size >= targetCount) {
        const sounds = pickDistinctSounds(soundsInCol, targetCount, mustId, bonus.sound)
        const picked = pickBestSetForSounds(soundsInCol, sounds, mustId)
        if (includesRequired(picked)) {
          results.push(
            finishYaku(
              {
                kind: 'sameColumn',
                cards: picked,
                column: column as ColumnId,
                label: `${COLUMN_LABEL[column as ColumnId]}揃い`,
              },
              bonus,
            ),
          )
        }
      }
    }
  }

  // 4. 組字牌型 (word)
  const spelling = bonusSpelling(bonus, activeRows)
  if (spelling.length >= 2) {
    const picked = pickWordCards(cards, spelling, mustId)
    if (picked && includesRequired(picked)) {
      const kana = getSound(bonus.sound)
      results.push(
        finishYaku(
          {
            kind: 'word',
            cards: picked,
            sound: bonus.sound,
            word: kana.vocabulary,
            label: `組字 ${kana.vocabulary}`,
          },
          bonus,
        ),
      )
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

export function findNearYaku(cards: KanaCard[], activeRows: readonly RowId[] = ROW_ORDER): NearYakuHint[] {
  const hints: NearYakuHint[] = []

  const bySound = groupBy(cards, (c) => c.sound)
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

  const byRow = groupBy(cards, (c) => c.row)
  for (const [row, group] of byRow) {
    const rowId = row as RowId
    const sounds = new Set(group.map((c) => c.sound))
    if (isYoonRow(rowId)) {
      if (sounds.size === 2) {
        hints.push({
          kind: 'sameYoon',
          label: `${ROW_LABEL[rowId]}揃い`,
          distance: 1,
          cardIds: group.map((c) => c.id),
          missingSounds: [],
        })
      }
    } else {
      if (sounds.size === 4) {
        hints.push({
          kind: 'sameRow',
          label: `${ROW_LABEL[rowId]}揃い`,
          distance: 1,
          cardIds: group.map((c) => c.id),
          missingSounds: [],
        })
      }
    }
  }

  if (columnYakuEnabled(activeRows)) {
    const byColumn = groupBy(cards, (c) => c.column)
    for (const [column, group] of byColumn) {
      const colId = column as ColumnId
      const activeRowsWithCol = activeRows.filter((r) => soundsForRows([r]).some((s) => s.column === colId))
      const targetCount = Math.min(4, activeRowsWithCol.length)
      if (targetCount < 3) continue
      const sounds = new Set(group.map((c) => c.sound))
      if (sounds.size === targetCount - 1) {
        hints.push({
          kind: 'sameColumn',
          label: `${COLUMN_LABEL[colId]}揃い`,
          distance: 1,
          cardIds: group.map((c) => c.id),
          missingSounds: [],
        })
      }
    }
  }

  return hints
}

