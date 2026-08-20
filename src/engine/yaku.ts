import type { BonusMission } from '../data/bonuses'
import { bonusSpelling } from '../data/bonuses'
import type { CardType, KanaCard } from '../data/cards'
import { COLUMN_LABEL, ROW_LABEL, ROW_ORDER, getSound, type ColumnId, type RowId } from '../data/kana'
import { columnYakuEnabled } from '../data/lessons'
import type { YakuCandidate, YakuKind } from './types'

export const BASE_SCORE: Record<YakuKind, number> = {
  sameSound: 3,
  sameRow: 6,
  sameColumn: 8,
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
  if (kind === 'sameSound' || kind === 'word') return 0
  const t = uniformType(cards)
  if (!t) return 0
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
      return hitsTarget ? bonus.points : 0
    case 'word':
      return bonus.points
    case 'sameColumn':
      return column !== undefined && cards.some((c) => c.sound === bonus.sound) ? bonus.points : 0
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
): KanaCard[] {
  const tryType = (t: CardType): KanaCard[] | null => {
    const picked: KanaCard[] = []
    for (const sound of sounds) {
      const card = bySound.get(sound)?.find((c) => c.cardType === t)
      if (!card) return null
      picked.push(card)
    }
    return picked
  }

  return (
    tryType('vocabulary') ??
    tryType('katakana') ??
    tryType('hiragana') ??
    sounds.map((sound) => {
      const card = bySound.get(sound)?.[0]
      if (!card) throw new Error(`Missing sound ${sound}`)
      return card
    })
  )
}

function pickFiveSounds(bySound: Map<string, KanaCard[]>): string[] {
  const sounds = [...bySound.keys()]
  for (const t of ['vocabulary', 'katakana', 'hiragana'] as const) {
    const matching = sounds.filter((s) => bySound.get(s)?.some((c) => c.cardType === t))
    if (matching.length >= 5) return matching.slice(0, 5)
  }
  return sounds.slice(0, 5)
}

function sameSoundLabel(hiragana: string): string {
  return `${hiragana}同音組`
}

function pickWordCards(cards: KanaCard[], spelling: string[]): KanaCard[] | null {
  const used = new Set<string>()
  const picked: KanaCard[] = []
  for (const mora of spelling) {
    const pool = cards.filter((c) => c.sound === mora && !used.has(c.id))
    if (pool.length === 0) return null
    const card =
      pool.find((c) => c.cardType === 'hiragana') ??
      pool.find((c) => c.cardType === 'katakana') ??
      pool[0]!
    used.add(card.id)
    picked.push(card)
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

  const bySound = groupBy(cards, (c) => c.sound)
  for (const [sound, group] of bySound) {
    const hira = group.find((c) => c.cardType === 'hiragana')
    const kata = group.find((c) => c.cardType === 'katakana')
    const vocab = group.find((c) => c.cardType === 'vocabulary')
    if (hira && kata && vocab) {
      const picked = [hira, kata, vocab]
      if (includesRequired(picked)) {
        results.push(
          finishYaku(
            {
              kind: 'sameSound',
              cards: picked,
              sound,
              label: sameSoundLabel(hira.hiragana),
            },
            bonus,
          ),
        )
      }
    }
  }

  const byRow = groupBy(cards, (c) => c.row)
  for (const [row, group] of byRow) {
    const soundsInRow = groupBy(group, (c) => c.sound)
    if (soundsInRow.size < 5) continue
    const sounds = pickFiveSounds(soundsInRow)
    const picked = pickBestSetForSounds(soundsInRow, sounds)
    if (includesRequired(picked)) {
      results.push(
        finishYaku(
          {
            kind: 'sameRow',
            cards: picked,
            row: row as RowId,
            label: `${ROW_LABEL[row as RowId]}揃い`,
          },
          bonus,
        ),
      )
    }
  }

  if (columnYakuEnabled(activeRows)) {
    const byColumn = groupBy(cards, (c) => c.column)
    for (const [column, group] of byColumn) {
      const soundsInCol = groupBy(group, (c) => c.sound)
      if (soundsInCol.size < 5) continue
      const sounds = pickFiveSounds(soundsInCol)
      const picked = pickBestSetForSounds(soundsInCol, sounds)
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

  const spelling = bonusSpelling(bonus, activeRows)
  if (spelling.length >= 2) {
    const picked = pickWordCards(cards, spelling)
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
    const types = new Set(group.map((c) => c.cardType))
    if (types.size === 2) {
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
    const sounds = new Set(group.map((c) => c.sound))
    if (sounds.size === 4) {
      hints.push({
        kind: 'sameRow',
        label: `${ROW_LABEL[row as RowId]}揃い`,
        distance: 1,
        cardIds: group.map((c) => c.id),
        missingSounds: [],
      })
    }
  }

  if (columnYakuEnabled(activeRows)) {
    const byColumn = groupBy(cards, (c) => c.column)
    for (const [column, group] of byColumn) {
      const sounds = new Set(group.map((c) => c.sound))
      if (sounds.size === 4) {
        hints.push({
          kind: 'sameColumn',
          label: `${COLUMN_LABEL[column as ColumnId]}揃い`,
          distance: 1,
          cardIds: group.map((c) => c.id),
          missingSounds: [],
        })
      }
    }
  }

  return hints
}

export function yakuUsesCard(yaku: YakuCandidate, cardId: string): boolean {
  return yaku.cards.some((c) => c.id === cardId)
}
