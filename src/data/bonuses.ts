import { getCardById, type KanaCard } from './cards'
import { getSound, type KanaSound } from './kana'

export interface BonusMission {
  sound: string
  cardId: string
  label: string
  detail: string
  points: number
}

export const DEFAULT_MISSION_POINTS = 90

export function makeTargetBonus(kana: KanaSound, points = DEFAULT_MISSION_POINTS): BonusMission {
  const cardId = `${kana.sound}-hiragana`
  return {
    sound: kana.sound,
    cardId,
    label: kana.hiragana,
    detail: `牌型中包含「${kana.hiragana}」讀音的平假名、片假名或單字牌時，額外 +${points} 分`,
    points,
  }
}

export function bonusCardOf(bonus: BonusMission): KanaCard {
  return getCardById(bonus.cardId)
}

/** 測試或預設用：目標音為ね，避免干擾あ行／か行牌型分數 */
export const DEFAULT_BONUS: BonusMission = makeTargetBonus(getSound('ne'), 0)
