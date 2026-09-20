import { getCardById, type KanaCard } from './cards'
import { getSound, spellingInRows, type KanaSound, type RowId } from './kana'

export type BonusKind = 'targetSound'

export interface BonusMission {
  kind: BonusKind
  sound: string
  cardId: string
  label: string
  detail: string
  points: number
}

export const DEFAULT_MISSION_POINTS = 90

export function makeTargetBonus(kana: KanaSound, points = DEFAULT_MISSION_POINTS): BonusMission {
  const cardId = `${kana.sound}-vocabulary`
  return {
    kind: 'targetSound',
    sound: kana.sound,
    cardId,
    label: kana.vocabulary,
    detail: `包含「${kana.hiragana}」之同音組、行揃い，或拼出「${kana.vocabulary}」時額外 +${points} 分`,
    points,
  }
}

export function bonusCardOf(bonus: BonusMission): KanaCard {
  return getCardById(bonus.cardId)
}

export function bonusSpelling(bonus: BonusMission, rows: readonly RowId[]): string[] {
  const kana = getSound(bonus.sound)
  return spellingInRows(kana.spelling, rows) ? kana.spelling : []
}

/** 測試或預設用：目標音為ね，避免干擾あ行／か行牌型分數 */
export const DEFAULT_BONUS: BonusMission = makeTargetBonus(getSound('ne'), 0)
