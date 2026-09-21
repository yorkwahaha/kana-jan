import type { CardType, KanaCard } from '../data/cards'
import { ROW_COLOR, ROW_LABEL, soundsForRows, type RowId } from '../data/kana'
import type { GameState } from '../engine/types'

export const DEFAULT_COPIES_PER_TYPE = 3

export interface TypeStat {
  cardType: CardType
  seen: number
  remaining: number
  max: number
}

export interface SoundCardStat {
  sound: string
  hiraganaText: string
  katakanaText: string
  vocabularyText: string
  icon: string
  hiragana: TypeStat
  katakana: TypeStat
  vocabulary: TypeStat
  totalRemaining: number
  totalMax: number
}

export interface RowCardStat {
  rowId: RowId
  rowLabel: string
  color: string
  sounds: SoundCardStat[]
  totalRemaining: number
  totalMax: number
}

/**
 * 收集對玩家公開可見的所有卡牌：
 * 1. 玩家自己的手牌
 * 2. 所有玩家的棄牌堆
 * 3. 所有玩家已結算的牌型
 * 4. 當前回合剛打出的棄牌
 */
export function getVisibleCards(state: GameState, myPlayerId?: string): KanaCard[] {
  const map = new Map<string, KanaCard>()

  const add = (c: KanaCard | undefined | null) => {
    if (c && !map.has(c.id)) {
      map.set(c.id, c)
    }
  }

  // 1. 玩家自己的手牌（若有指定 myPlayerId）
  if (myPlayerId) {
    const me = state.players.find((p) => p.id === myPlayerId)
    me?.hand?.forEach(add)
  }

  // 2. 所有玩家的棄牌堆與完成牌型
  for (const p of state.players) {
    p.discards?.forEach(add)
    for (const comp of p.completed ?? []) {
      comp.yaku?.cards?.forEach(add)
    }
  }

  // 3. 當前棄牌
  if (state.currentDiscard) {
    add(state.currentDiscard)
  }

  return Array.from(map.values())
}

/**
 * 依據登場行與可見牌，計算每個讀音與卡牌型態的殘餘情況
 */
export function computeRowCardStats(
  rows: readonly RowId[],
  visibleCards: KanaCard[],
  copiesPerType = DEFAULT_COPIES_PER_TYPE,
  deckManifest?: Readonly<Record<string, number>>,
): RowCardStat[] {
  // 建立快速計數字典：`${sound}_${cardType}` -> seen count
  const seenMap = new Map<string, number>()
  for (const card of visibleCards) {
    const key = `${card.sound}_${card.cardType}`
    seenMap.set(key, (seenMap.get(key) ?? 0) + 1)
  }

  return rows.map((rowId) => {
    const soundsInRow = soundsForRows([rowId])
    let rowTotalRemaining = 0
    let rowTotalMax = 0

    const sounds: SoundCardStat[] = soundsInRow.map((kana) => {
      const buildTypeStat = (type: CardType): TypeStat => {
        const seen = seenMap.get(`${kana.sound}_${type}`) ?? 0
        const max = deckManifest?.[`${kana.sound}:${type}`] ?? copiesPerType
        const remaining = Math.max(0, max - seen)
        return {
          cardType: type,
          seen,
          remaining,
          max,
        }
      }

      const hira = buildTypeStat('hiragana')
      const kata = buildTypeStat('katakana')
      const vocab = buildTypeStat('vocabulary')
      const totalRemaining = hira.remaining + kata.remaining + vocab.remaining
      const totalMax = hira.max + kata.max + vocab.max

      rowTotalRemaining += totalRemaining
      rowTotalMax += totalMax

      return {
        sound: kana.sound,
        hiraganaText: kana.hiragana,
        katakanaText: kana.katakana,
        vocabularyText: kana.vocabulary,
        icon: kana.icon,
        hiragana: hira,
        katakana: kata,
        vocabulary: vocab,
        totalRemaining,
        totalMax,
      }
    })

    return {
      rowId,
      rowLabel: ROW_LABEL[rowId] ?? `${rowId}行`,
      color: ROW_COLOR[rowId] ?? '#888',
      sounds,
      totalRemaining: rowTotalRemaining,
      totalMax: rowTotalMax,
    }
  })
}
