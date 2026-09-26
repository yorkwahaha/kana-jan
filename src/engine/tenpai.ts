import { getCardById, type CardType, type KanaCard } from '../data/cards'
import { getSound } from '../data/kana'
import type { GameState } from './types'
import { findYaku, type NearYakuHint } from './yaku'

const WAIT_CARD_TYPES: CardType[] = ['hiragana', 'katakana', 'vocabulary']

export interface TenpaiWait {
  sound: string
  card: KanaCard
  minScore: number
  maxScore: number
}

function visibleCopyCounts(hand: KanaCard[], state: GameState): Map<string, number> {
  const byId = new Map<string, KanaCard>()
  for (const card of hand) byId.set(card.id, card)
  for (const card of state.discardPile) byId.set(card.id, card)
  for (const player of state.players) {
    for (const completed of player.completed) {
      for (const card of completed.yaku.cards) byId.set(card.id, card)
    }
  }
  const counts = new Map<string, number>()
  for (const card of byId.values()) {
    const key = `${card.sound}:${card.cardType}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function tenpaiVisibilityKey(state: GameState): string {
  const discards = state.discardPile.map((card) => card.id).join(',')
  const completed = state.players
    .flatMap((player) => player.completed.flatMap((meld) => meld.yaku.cards.map((card) => card.id)))
    .join(',')
  const manifest = Object.entries(state.deckManifest ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key}=${count}`)
    .join(',')
  return `${discards}|${completed}|${manifest}`
}

export function buildTenpaiWaits(
  hand: KanaCard[],
  hints: NearYakuHint[],
  state: GameState,
): TenpaiWait[] {
  const waits = new Map<string, TenpaiWait>()
  const visibleCounts = visibleCopyCounts(hand, state)

  for (const hint of hints) {
    for (const sound of hint.missingSounds) {
      const waitSound = getSound(sound)
      const scores = WAIT_CARD_TYPES.flatMap((cardType, typeIndex) => {
        const key = `${sound}:${cardType}`
        const totalCopies = state.deckManifest?.[key]
        if (totalCopies !== undefined && (visibleCounts.get(key) ?? 0) >= totalCopies) return []

        const card = getCardById(`${sound}-${cardType}-$${900 + typeIndex}`)
        return findYaku([...hand, card], state.bonus, {
          activeRows: state.activeRows,
          mustIncludeCardId: card.id,
        })
          .filter((yaku) => {
            if (yaku.kind !== hint.kind) return false
            if (hint.kind === 'sameSound') return yaku.sound === sound
            return yaku.row === waitSound.row
          })
          .map((yaku) => yaku.totalScore)
      })
      if (scores.length === 0) continue

      const minScore = Math.min(...scores)
      const maxScore = Math.max(...scores)
      const current = waits.get(sound)
      waits.set(sound, {
        sound,
        card: getCardById(`${sound}-hiragana`),
        minScore: current ? Math.min(current.minScore, minScore) : minScore,
        maxScore: current ? Math.max(current.maxScore, maxScore) : maxScore,
      })
    }
  }

  return [...waits.values()]
}
