import { catalogForRows, type CardType, type KanaCard } from '../data/cards'
import { COLUMN_ORDER, ROW_ORDER, type RowId } from '../data/kana'
import { HAND_SIZE, PLAYER_COUNT } from './types'
import type { Rng } from './rng'

const MIN_DECK = 48

const TYPE_ORDER: Record<CardType, number> = {
  hiragana: 0,
  katakana: 1,
  vocabulary: 2,
}

export function sortHandByGojuon(hand: KanaCard[]): KanaCard[] {
  return [...hand].sort((a, b) => {
    const row = ROW_ORDER.indexOf(a.row) - ROW_ORDER.indexOf(b.row)
    if (row !== 0) return row
    const col = COLUMN_ORDER.indexOf(a.column) - COLUMN_ORDER.indexOf(b.column)
    if (col !== 0) return col
    const type = TYPE_ORDER[a.cardType] - TYPE_ORDER[b.cardType]
    if (type !== 0) return type
    return a.id.localeCompare(b.id)
  })
}

export function copiesNeeded(baseLength: number, minDeck = MIN_DECK): number {
  if (baseLength <= 0) return 1
  return Math.max(1, Math.ceil(minDeck / baseLength))
}

export function buildLessonDeck(rows: readonly RowId[], rng: Rng): KanaCard[] {
  const base = catalogForRows(rows)
  const copies = copiesNeeded(base.length)
  const deck: KanaCard[] = []
  for (let i = 0; i < copies; i++) {
    for (const card of base) {
      deck.push(copies === 1 ? card : { ...card, id: `${card.id}#${i}` })
    }
  }
  return rng.shuffle(deck)
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
  return { hands: hands.map(sortHandByGojuon), remaining }
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
  return { hand: sortHandByGojuon(nextHand), deck: nextDeck }
}
