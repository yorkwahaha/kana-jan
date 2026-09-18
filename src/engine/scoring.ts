import type { KanaCard } from '../data/cards'
import type { GameState, PlayerState, ScoreSource } from './types'

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
 * 自摸：其他三名玩家各支付牌型分數（金幣不足則全付）。
 * 放銃：只有棄牌者支付。
 * 金幣不可低於 0。
 */
export function settleGold(
  players: PlayerState[],
  winnerId: string,
  amount: number,
  source: ScoreSource,
  fromPlayerId?: string,
): ScoreResult {
  const next = players.map((p) => ({
    ...p,
    hand: [...p.hand],
    discards: [...(p.discards ?? [])],
    completed: [...p.completed],
  }))
  const winner = next.find((p) => p.id === winnerId)
  if (!winner) throw new Error(`Winner not found: ${winnerId}`)

  winner.score += amount
  const transfers: GoldTransfer[] = []

  const payers: PlayerState[] =
    source === 'tsumo'
      ? next.filter((p) => p.id !== winnerId)
      : next.filter((p) => p.id === fromPlayerId)

  for (const payer of payers) {
    const pay = Math.min(payer.gold, amount)
    if (pay <= 0) continue
    payer.gold -= pay
    winner.gold += pay
    transfers.push({ fromId: payer.id, toId: winnerId, amount: pay })
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
  return sorted.map((p, i) => ({
    playerId: p.id,
    name: p.name,
    score: p.score,
    gold: p.gold,
    completedCount: p.completed.length,
    place: i + 1,
  }))
}

export function playerById(state: GameState, id: string): PlayerState {
  const p = state.players.find((x) => x.id === id)
  if (!p) throw new Error(`Player not found: ${id}`)
  return p
}
