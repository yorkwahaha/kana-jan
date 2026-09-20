import { KANA_SOUNDS, soundsForRows, type KanaSound, type RowId } from './kana'

export type CardType = 'hiragana' | 'katakana' | 'vocabulary'

export interface KanaCard {
  id: string
  sound: string
  romaji: string
  hiragana: string
  katakana: string
  row: KanaSound['row']
  column: KanaSound['column']
  rowLabel: string
  columnLabel: string
  cardType: CardType
  vocabulary: string
  meaning: string
  /** 未來正式插圖。空字串表示使用 icon。 */
  image: string
  icon: string
  color: string
  styleVariant: CardType
  confusable?: KanaSound['confusable']
}

const CARD_TYPES: CardType[] = ['hiragana', 'katakana', 'vocabulary']

export function buildCard(sound: KanaSound, cardType: CardType): KanaCard {
  return {
    id: `${sound.sound}-${cardType}`,
    sound: sound.sound,
    romaji: sound.romaji,
    hiragana: sound.hiragana,
    katakana: sound.katakana,
    row: sound.row,
    column: sound.column,
    rowLabel: sound.rowLabel,
    columnLabel: sound.columnLabel,
    cardType,
    vocabulary: sound.vocabulary,
    meaning: sound.meaning,
    image: sound.image,
    icon: sound.icon,
    color: sound.color,
    styleVariant: cardType,
    confusable: sound.confusable,
  }
}

/** 完整牌庫：95 讀音 × 3 類型 = 285 張（不含課程複本） */
export function createCardCatalog(): KanaCard[] {
  const cards: KanaCard[] = []
  for (const kana of KANA_SOUNDS) {
    for (const type of CARD_TYPES) {
      cards.push(buildCard(kana, type))
    }
  }
  return cards
}

export const CARD_CATALOG = createCardCatalog()

export function catalogForRows(rows: readonly RowId[]): KanaCard[] {
  const cards: KanaCard[] = []
  for (const kana of soundsForRows(rows)) {
    for (const type of CARD_TYPES) {
      cards.push(buildCard(kana, type))
    }
  }
  return cards
}

export function baseCardId(id: string): string {
  return id.split('#')[0] ?? id
}

export function getCardById(id: string): KanaCard {
  const baseId = baseCardId(id)
  const card = CARD_CATALOG.find((c) => c.id === baseId)
  if (!card) throw new Error(`Unknown card id: ${id}`)
  return id === card.id ? card : { ...card, id }
}

export function displayGlyph(card: KanaCard): string {
  if (card.cardType === 'hiragana') return card.hiragana
  if (card.cardType === 'katakana') return card.katakana
  return card.vocabulary
}

export function speechText(card: KanaCard): string {
  if (card.cardType === 'vocabulary') return card.vocabulary
  if (card.cardType === 'katakana') return card.katakana
  return card.hiragana
}
