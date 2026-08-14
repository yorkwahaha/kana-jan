import type { BonusMission } from '../data/bonuses'
import type { CardType, KanaCard } from '../data/cards'
import { COLUMN_LABEL, ROW_LABEL, type ColumnId, type RowId } from '../data/kana'
import type { YakuCandidate, YakuKind } from './types'

export const BASE_SCORE: Record<YakuKind, number> = {
  sameSound: 3,
  sameRow: 6,
  sameColumn: 8,
}

export const TYPE_BONUS: Record<CardType, number> = {
  hiragana: 3,
  katakana: 4,
  vocabulary: 5,
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
  if (kind === 'sameSound') return 0
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
  const allType = uniformType(cards)
  switch (bonus.kind) {
    case 'hiraganaYaku':
      return allType === 'hiragana' ? bonus.points : 0
    case 'katakanaYaku':
      return allType === 'katakana' ? bonus.points : 0
    case 'aColumn':
      return kind === 'sameColumn' && column === 'a' ? bonus.points : 0
    case 'iColumn':
      return kind === 'sameColumn' && column === 'i' ? bonus.points : 0
    case 'rowYaku':
      return kind === 'sameRow' ? bonus.points : 0
    case 'columnYaku':
      return kind === 'sameColumn' ? bonus.points : 0
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
  const id = partial.id ?? yakuId(partial.kind, partial.sound ?? partial.row ?? partial.column ?? '', partial.cards)
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

  // 優先同類型加成較高者：單字 > 片假名 > 平假名
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

function sameSoundLabel(hiragana: string): string {
  return `${hiragana}同音組`
}

export function findYaku(
  cards: KanaCard[],
  bonus: BonusMission,
  options?: { mustIncludeCardId?: string },
): YakuCandidate[] {
  const results: YakuCandidate[] = []
  const mustId = options?.mustIncludeCardId

  const includesRequired = (picked: KanaCard[]) =>
    !mustId || picked.some((c) => c.id === mustId)

  // 1. 同音三張：同一讀音的平假名＋片假名＋單字圖像
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

  // 2. 同一行五張：五個不同讀音，不可重複計算同一讀音
  const byRow = groupBy(cards, (c) => c.row)
  for (const [row, group] of byRow) {
    const soundsInRow = groupBy(group, (c) => c.sound)
    if (soundsInRow.size < 5) continue
    const sounds = [...soundsInRow.keys()]
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

  // 3. 同一段五張
  const byColumn = groupBy(cards, (c) => c.column)
  for (const [column, group] of byColumn) {
    const soundsInCol = groupBy(group, (c) => c.sound)
    if (soundsInCol.size < 5) continue
    const sounds = [...soundsInCol.keys()]
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

/** 距離完成還差 1 張的牌型，供學習提示高亮 */
export function findNearYaku(cards: KanaCard[]): NearYakuHint[] {
  const hints: NearYakuHint[] = []

  const bySound = groupBy(cards, (c) => c.sound)
  for (const [sound, group] of bySound) {
    const types = new Set(group.map((c) => c.cardType))
    if (types.size === 2) {
      const sample = group[0]!
      hints.push({
        kind: 'sameSound',
        label: `${sample.hiragana}同音組`,
        distance: 1,
        cardIds: group.map((c) => c.id),
        missingSounds: [sound],
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

  return hints
}

export function yakuUsesCard(yaku: YakuCandidate, cardId: string): boolean {
  return yaku.cards.some((c) => c.id === cardId)
}
