import type { ColumnId } from './kana'

export type BonusKind =
  | 'hiraganaYaku'
  | 'katakanaYaku'
  | 'aColumn'
  | 'iColumn'
  | 'rowYaku'
  | 'columnYaku'

export interface BonusMission {
  kind: BonusKind
  label: string
  detail: string
  points: number
}

export const BONUS_MISSIONS: BonusMission[] = [
  {
    kind: 'hiraganaYaku',
    label: '平假名牌型',
    detail: '完成的牌型若全部為平假名，額外 +2 分',
    points: 2,
  },
  {
    kind: 'katakanaYaku',
    label: '片假名牌型',
    detail: '完成的牌型若全部為片假名，額外 +3 分',
    points: 3,
  },
  {
    kind: 'aColumn',
    label: 'あ段達人',
    detail: '完成「あ段」牌型時額外 +3 分',
    points: 3,
  },
  {
    kind: 'iColumn',
    label: 'い段達人',
    detail: '完成「い段」牌型時額外 +3 分',
    points: 3,
  },
  {
    kind: 'rowYaku',
    label: '行の達人',
    detail: '完成同一行牌型時額外 +2 分',
    points: 2,
  },
  {
    kind: 'columnYaku',
    label: '段の達人',
    detail: '完成同一段牌型時額外 +2 分',
    points: 2,
  },
]

export function bonusColumn(kind: BonusKind): ColumnId | null {
  if (kind === 'aColumn') return 'a'
  if (kind === 'iColumn') return 'i'
  return null
}
