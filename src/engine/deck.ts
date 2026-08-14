import { CARD_CATALOG, type KanaCard } from '../data/cards'
import { HAND_SIZE, PLAYER_COUNT } from './types'
import type { Rng } from './rng'

export function createShuffledDeck(rng: Rng): KanaCard[] {
  return rng.shuffle(CARD_CATALOG)
}

export function dealHands(
  deck: KanaCard[],
  playerCount = PLAYER_COUNT,
  handSize = HAND_SIZE,
): { hands: KanaCard[][]; remaining: KanaCard[] } {
  const hands: KanaCard[][] = Array.from({ length: playerCount }, () => [])
  const remaining = [...deck]
  for (let i = 0; i < handSize; i++) {
    for (let p = 0; p < playerCount; p++) {
      const card = remaining.shift()
      if (!card) throw new Error('Deck exhausted while dealing')
      hands[p]!.push(card)
    }
  }
  return { hands, remaining }
}

export function drawOne(deck: KanaCard[]): { card: KanaCard | null; remaining: KanaCard[] } {
  if (deck.length === 0) return { card: null, remaining: deck }
  const remaining = [...deck]
  const card = remaining.shift() ?? null
  return { card, remaining }
}

export function refillHand(
  hand: KanaCard[],
  deck: KanaCard[],
  handSize = HAND_SIZE,
): { hand: KanaCard[]; deck: KanaCard[] } {
  const nextHand = [...hand]
  const nextDeck = [...deck]
  while (nextHand.length < handSize && nextDeck.length > 0) {
    const card = nextDeck.shift()
    if (!card) break
    nextHand.push(card)
  }
  return { hand: nextHand, deck: nextDeck }
}
