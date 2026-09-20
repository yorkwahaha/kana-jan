import type { KanaCard } from '../data/cards'
import type { PlayerState, ScoreSource } from './types'

export interface GoldTransfer {
  fromId: string
  toId: string
  amount: number
}

export interface ScoreResult {
  transfers: GoldTransfer[]
  players: PlayerState[]
  bankrupt: boolean
}

/**
 * 自摸：由其他三方分攤牌型分數（每方分攤 safeAmount / 3，向上取整至整十數）。
 * 放銃：由單家放槍者全額支付該牌型分數。
 * 金幣不可低於 0，且任何讓渡皆至少十位數起跳，個位數永遠為 0。
 */
export function settleGold(
  players: PlayerState[],
  winnerId: string,
  amount: number,
  source: ScoreSource,
  fromPlayerId?: string,
): ScoreResult {
  // 強制讓渡點數至少十位數起跳，且個位數永遠為 0
  const safeAmount = Math.max(10, Math.round(amount / 10) * 10)

  const next = players.map((p) => ({
    ...p,
    gold: Math.max(0, Math.round(p.gold / 10) * 10),
    hand: [...p.hand],
    discards: [...(p.discards ?? [])],
    completed: [...p.completed],
  }))
  const winner = next.find((p) => p.id === winnerId)
  if (!winner) throw new Error(`Winner not found: ${winnerId}`)

  winner.score += safeAmount
  const transfers: GoldTransfer[] = []

  const payers: PlayerState[] =
    source === 'tsumo'
      ? next.filter((p) => p.id !== winnerId)
      : next.filter((p) => p.id === fromPlayerId)

  // 自摸時由其餘三方平分分攤；放槍時由單家全數支付
  const payerCount = Math.max(1, payers.length)
  const eachAmount =
    source === 'tsumo'
      ? Math.max(10, Math.ceil(safeAmount / payerCount / 10) * 10)
      : safeAmount

  for (const payer of payers) {
    payer.gold = Math.max(0, payer.gold - eachAmount)
    winner.gold += eachAmount
    transfers.push({ fromId: payer.id, toId: winnerId, amount: eachAmount })
  }

  const bankrupt = next.some((p) => p.gold <= 0)
  return { transfers, players: next, bankrupt }
}

export function removeCardsFromHand(hand: KanaCard[], used: KanaCard[]): KanaCard[] {
  const usedIds = new Set(used.map((c) => c.id))
  return hand.filter((c) => !usedIds.has(c.id))
}

export function computeRankings(players: PlayerState[]) {
  const sorted = [...players].sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold
    if (b.score !== a.score) return b.score - a.score
    return a.seat - b.seat
  })

  const results: Array<{
    playerId: string
    name: string
    score: number
    gold: number
    completedCount: number
    place: number
  }> = []

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    if (!p) continue
    const prev = results[i - 1]
    const prevSorted = sorted[i - 1]
    let place = i + 1
    if (prev && prevSorted && p.gold === prevSorted.gold && p.score === prevSorted.score) {
      place = prev.place
    }
    results.push({
      playerId: p.id,
      name: p.name,
      score: p.score,
      gold: p.gold,
      completedCount: p.completed.length,
      place,
    })
  }

  return results
}
