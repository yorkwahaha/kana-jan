import type { KanaCard } from './cards'
import { soundsForRows, type RowId } from './kana'

/** 初學者易混讀音；只在該音有出現在本局行時才當干擾項 */
const LOOKALIKE: Record<string, readonly string[]> = {
  a: ['o'],
  o: ['a'],
  i: ['e'],
  e: ['i'],
  shi: ['tsu', 'chi', 'su'],
  tsu: ['shi', 'su', 'chi'],
  so: ['no', 'su', 'se'],
  chi: ['shi', 'tsu'],
  nu: ['me', 'ne'],
  me: ['nu', 'ne'],
  ru: ['ro', 'ra'],
  ro: ['ru', 'ra'],
}

export function pickRecallCard(cards: readonly KanaCard[]): KanaCard | null {
  if (cards.length === 0) return null
  const kana = cards.filter((c) => c.cardType !== 'vocabulary')
  const pool = kana.length > 0 ? kana : cards
  return (
    pool.find((c) => c.confusable && c.cardType === 'katakana') ??
    pool.find((c) => c.confusable) ??
    pool.find((c) => LOOKALIKE[c.sound]) ??
    pool[0] ??
    null
  )
}

export function recallOptions(card: KanaCard, activeRows: readonly RowId[]): string[] {
  const available = soundsForRows(activeRows)
  const bySound = new Map(available.map((s) => [s.sound, s]))
  const distractorIds: string[] = []

  if (card.confusable) {
    for (const sound of available) {
      if (sound.sound !== card.sound && sound.confusable === card.confusable) {
        distractorIds.push(sound.sound)
      }
    }
  }

  for (const id of LOOKALIKE[card.sound] ?? []) {
    if (id !== card.sound && bySound.has(id) && !distractorIds.includes(id)) {
      distractorIds.push(id)
    }
  }

  for (const sound of available) {
    if (sound.sound !== card.sound && !distractorIds.includes(sound.sound)) {
      distractorIds.push(sound.sound)
    }
  }

  const extras = distractorIds
    .slice(0, 2)
    .map((id) => bySound.get(id)?.romaji)
    .filter((r): r is string => Boolean(r))

  return [card.romaji, ...extras].sort((a, b) => a.localeCompare(b))
}
