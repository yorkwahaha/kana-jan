import { catalogForRows, type CardType, type KanaCard } from '../data/cards'
import { COLUMN_ORDER, ROW_ORDER, type RowId } from '../data/kana'
import { HAND_SIZE, PLAYER_COUNT } from './types'
import type { Rng } from './rng'

const MIN_DECK = 48
export const TARGET_DECK_SIZE = 100
export const COPIES_PER_CARD_TYPE = 3

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
  const motherPool: KanaCard[] = []
  for (let i = 0; i < COPIES_PER_CARD_TYPE; i++) {
    for (const card of base) {
      motherPool.push({ ...card, id: `${card.id}#${i}` })
    }
  }

  // 若母池足以達到 TARGET_DECK_SIZE (100)，洗牌後切出前 100 張進入對局
  if (motherPool.length >= TARGET_DECK_SIZE) {
    return rng.shuffle(motherPool).slice(0, TARGET_DECK_SIZE)
  }

  // 若母池小於 100（如單行測試教學關卡），確保滿足 MIN_DECK (48) 以供 4 人發牌
  if (motherPool.length >= MIN_DECK) {
    return rng.shuffle(motherPool)
  }

  const extraCopies = copiesNeeded(motherPool.length, MIN_DECK)
  const deck: KanaCard[] = []
  for (let c = 0; c < extraCopies; c++) {
    for (const card of motherPool) {
      deck.push({ ...card, id: `${card.id}-$${c}` })
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
