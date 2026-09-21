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
  /** 單字的標準日文表記；結算複習以此搭配 vocabulary 作振假名。 */
  writtenForm: string
  meaning: string
  /** 未來正式插圖。空字串表示使用 icon。 */
  image: string
  icon: string
  color: string
  styleVariant: CardType
  confusable?: KanaSound['confusable']
}

const CARD_TYPES: CardType[] = ['hiragana', 'katakana', 'vocabulary']

const VOCABULARY_WRITTEN_FORMS: Record<string, string> = {
  あめ: '雨', いぬ: '犬', うま: '馬', えさ: '餌', おに: '鬼',
  かさ: '傘', きつね: '狐', くるま: '車', けしき: '景色', こねこ: '子猫',
  さくら: '桜', しお: '塩', すいか: '西瓜', せみ: '蝉', そら: '空',
  たこ: '蛸', ちかてつ: '地下鉄', つき: '月', てら: '寺', とけい: '時計',
  なみ: '波', にく: '肉', ぬの: '布', ねこ: '猫', のり: '海苔',
  はな: '花', ひる: '昼', ふね: '船', へそ: '臍', ほし: '星',
  まち: '町', みみ: '耳', むし: '虫', めし: '飯', もも: '桃',
  やま: '山', ゆき: '雪', よる: '夜', らっこ: '海獺', りす: '栗鼠',
  るす: '留守', れい: '例', ろく: '六', わに: '鰐', を: 'を', ん: 'ん',
  がっこう: '学校', ぎんこう: '銀行', ぐんたい: '軍隊', げーむ: 'ゲーム', ごはん: '御飯',
  ざっし: '雑誌', じかん: '時間', ずぼん: 'ズボン', ぜんぶ: '全部', ぞう: '象',
  だんご: '団子', はなぢ: '鼻血', つづく: '続く', でんしゃ: '電車', どあ: 'ドア',
  ばす: 'バス', びーる: 'ビール', ぶた: '豚', べんとう: '弁当', ぼーる: 'ボール',
  ぱん: 'パン', ぴあの: 'ピアノ', ぷりん: 'プリン', ぺん: 'ペン', ぽすと: 'ポスト',
  きゃく: '客', きゅうり: '胡瓜', きょう: '今日', しゃしん: '写真', しゅみ: '趣味',
  しょくじ: '食事', おちゃ: 'お茶', ちゅうしゃ: '注射', ちょこ: 'チョコ', にゃんこ: 'にゃんこ',
  にゅうがく: '入学', にょろにょろ: 'にょろにょろ', ひゃく: '百', ひゅうが: '日向', ひょう: '豹',
  みゃく: '脈', みゅーじっく: 'ミュージック', みょうじ: '名字', りゃく: '略', りゅう: '竜',
  りょこう: '旅行', じゃがいも: '馬鈴薯', じゅう: '十', じょせい: '女性',
}

export function writtenFormForVocabulary(vocabulary: string): string {
  return VOCABULARY_WRITTEN_FORMS[vocabulary] ?? vocabulary
}

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
    writtenForm: writtenFormForVocabulary(sound.vocabulary),
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
const CARD_BY_ID = new Map(CARD_CATALOG.map((card) => [card.id, card]))

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
  return id.replace(/(?:#\d+)?(?:-\$\d+)?$/, '')
}

export function getCardById(id: string): KanaCard {
  const baseId = baseCardId(id)
  const card = CARD_BY_ID.get(baseId)
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
