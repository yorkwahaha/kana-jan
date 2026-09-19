import type { KanaCard } from '../data/cards'
import { isYoonRow, type RowId } from '../data/kana'
import { currentPlayer, currentReactionYakus, reactionActor, type GameAction } from './game'
import type { Rng } from './rng'
import type { GameState, PlayerState, YakuCandidate } from './types'
import { findNearYaku, findYaku } from './yaku'

function minDistance(hand: KanaCard[]): { distance: number; cardIds: Set<string> } {
  let best = { distance: 5, cardIds: new Set<string>() }

  const bySound = new Map<string, KanaCard[]>()
  for (const card of hand) {
    const list = bySound.get(card.sound) ?? []
    list.push(card)
    bySound.set(card.sound, list)
  }
  for (const group of bySound.values()) {
    const distance = Math.max(0, 3 - group.length)
    if (distance < best.distance) best = { distance, cardIds: new Set(group.map((c) => c.id)) }
  }

  for (const key of ['row', 'column'] as const) {
    const grouped = new Map<string, KanaCard[]>()
    for (const card of hand) {
      const list = grouped.get(card[key]) ?? []
      list.push(card)
      grouped.set(card[key], list)
    }
    for (const [groupKey, group] of grouped.entries()) {
      const sounds = new Set(group.map((c) => c.sound))
      const targetSize = key === 'row' && isYoonRow(groupKey as RowId) ? 3 : key === 'column' ? 4 : 5
      const distance = Math.max(0, targetSize - sounds.size)
      const ids = new Set(group.map((c) => c.id))
      if (distance < best.distance) best = { distance, cardIds: ids }
    }
  }

  return best
}

function keepValue(card: KanaCard, hand: KanaCard[]): number {
  const sameSoundCount = hand.filter((c) => c.sound === card.sound).length
  const rowSounds = new Set(hand.filter((c) => c.row === card.row).map((c) => c.sound)).size
  const colSounds = new Set(hand.filter((c) => c.column === card.column).map((c) => c.sound)).size
  return sameSoundCount * 4 + rowSounds * 2 + colSounds * 2
}

function isDangerousDiscard(card: KanaCard, state: GameState, selfId: string): number {
  let danger = 0
  for (const p of state.players) {
    if (p.id === selfId) continue
    const publicCards = p.completed.flatMap((c) => c.yaku.cards)
    const discardedSame = state.discardPile.filter((c) => c.sound === card.sound).length
    if (discardedSame === 0) danger += 1
    if (!publicCards.some((c) => c.row === card.row)) danger += 0.5
  }
  if (card.cardType === 'katakana' && card.confusable) danger += 0.3
  return danger
}

function pickDiscard(player: PlayerState, state: GameState, rng: Rng): string {
  if (player.hand.length === 0) throw new Error('Empty hand')
  if (player.aiDifficulty === 'easy') {
    return rng.pick(player.hand).id
  }

  const best = minDistance(player.hand)
  const scored = player.hand.map((card) => {
    const remaining = player.hand.filter((c) => c.id !== card.id)
    const after = minDistance(remaining)
    const keep = keepValue(card, player.hand)
    const inTarget = best.cardIds.has(card.id) ? 6 : 0
    const danger = isDangerousDiscard(card, state, player.id)
    const progressHurt = after.distance - best.distance
    const score = progressHurt * 8 + inTarget + keep - danger
    return { id: card.id, score }
  })
  scored.sort((a, b) => a.score - b.score)
  const floor = scored[0]!.score
  const candidates = scored.filter((s) => s.score <= floor + 1.5)
  return rng.pick(candidates).id
}

function shouldDelayLowYaku(yaku: YakuCandidate, hand: KanaCard[], rng: Rng): boolean {
  if (yaku.kind !== 'sameSound') return false
  if (yaku.totalScore >= 480) return false
  const near = findNearYaku(hand)
  const high = near.find((n) => n.kind !== 'sameSound')
  if (!high) return false
  return rng.next() < 0.28
}

function decideAction(state: GameState, rng: Rng): GameAction {
  const player = currentPlayer(state)
  const yakus = findYaku(player.hand, state.bonus, { activeRows: state.activeRows })
  if (yakus.length === 0) return { type: 'SKIP_YAKU' }

  if (player.aiDifficulty === 'easy') {
    const chosen = rng.pick(yakus)
    return { type: 'CHOOSE_YAKU', yakuId: chosen.id }
  }

  const best = yakus[0]!
  if (state.comboCount === 0 && shouldDelayLowYaku(best, player.hand, rng) && yakus.every((y) => y.totalScore <= 180)) {
    return { type: 'SKIP_YAKU' }
  }
  return { type: 'CHOOSE_YAKU', yakuId: best.id }
}

export function decideAi(state: GameState, rng: Rng): GameAction | null {
  switch (state.phase) {
    case 'playerDraw': {
      if (currentPlayer(state).kind !== 'ai') return null
      return { type: 'DRAW' }
    }
    case 'playerAction': {
      if (currentPlayer(state).kind !== 'ai') return null
      return decideAction(state, rng)
    }
    case 'discard': {
      if (currentPlayer(state).kind !== 'ai') return null
      const id = pickDiscard(currentPlayer(state), state, rng)
      return { type: 'DISCARD', cardId: id }
    }
    case 'reaction': {
      const actor = reactionActor(state)
      if (!actor || actor.kind !== 'ai') return null
      const yakus = currentReactionYakus(state)
      if (yakus.length === 0) return { type: 'PASS_CLAIM' }
      if (actor.aiDifficulty === 'easy') {
        return { type: 'CLAIM_YAKU', yakuId: rng.pick(yakus).id }
      }
      return { type: 'CLAIM_YAKU', yakuId: yakus[0]!.id }
    }
    case 'review': {
      return { type: 'FINISH_REVIEW' }
    }
    default:
      return null
  }
}

export function needsHumanInput(state: GameState): boolean {
  if (state.phase === 'playerDraw' || state.phase === 'playerAction' || state.phase === 'discard') {
    const p = currentPlayer(state)
    return p.kind === 'human' || p.kind === 'remote'
  }
  if (state.phase === 'reaction') {
    const actor = reactionActor(state)
    return actor?.kind === 'human' || actor?.kind === 'remote'
  }
  if (state.phase === 'review' || state.phase === 'preview') {
    return state.players.some((p) => p.kind === 'human' || p.kind === 'remote')
  }
  return false
}
