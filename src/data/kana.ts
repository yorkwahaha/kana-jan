/** 五十音行 */
export type RowId =
  | 'a'
  | 'ka'
  | 'sa'
  | 'ta'
  | 'na'
  | 'ha'
  | 'ma'
  | 'ra'
  | 'ga'
  | 'za'
  | 'da'
  | 'ba'
  | 'pa'
  | 'kya'
  | 'sha'
  | 'cha'
  | 'nya'
  | 'hya'
  | 'mya'
  | 'rya'
  | 'ja'

/** 五十音段 */
export type ColumnId = 'a' | 'i' | 'u' | 'e' | 'o'

export interface KanaSound {
  sound: string
  romaji: string
  hiragana: string
  katakana: string
  row: RowId
  column: ColumnId
  rowLabel: string
  columnLabel: string
  vocabulary: string
  meaning: string
  icon: string
  /** 用本牌庫讀音拼出單字；空陣列表示無法組字 */
  spelling: string[]
  /** 未來正式插圖路徑 */
  image: string
  color: string
  confusable?: 'shi-tsu' | 'so-n'
}

export const ROW_LABEL: Record<RowId, string> = {
  a: 'あ行',
  ka: 'か行',
  sa: 'さ行',
  ta: 'た行',
  na: 'な行',
  ha: 'は行',
  ma: 'ま行',
  ra: 'ら行',
  ga: 'が行',
  za: 'ざ行',
  da: 'だ行',
  ba: 'ば行',
  pa: 'ぱ行',
  kya: 'きゃ行',
  sha: 'しゃ行',
  cha: 'ちゃ行',
  nya: 'にゃ行',
  hya: 'ひゃ行',
  mya: 'みゃ行',
  rya: 'りゃ行',
  ja: 'じゃ行',
}

export const ROW_MARK: Record<RowId, string> = {
  a: 'あ',
  ka: 'か',
  sa: 'さ',
  ta: 'た',
  na: 'な',
  ha: 'は',
  ma: 'ま',
  ra: 'ら',
  ga: 'が',
  za: 'ざ',
  da: 'だ',
  ba: 'ば',
  pa: 'ぱ',
  kya: 'きゃ',
  sha: 'しゃ',
  cha: 'ちゃ',
  nya: 'にゃ',
  hya: 'ひゃ',
  mya: 'みゃ',
  rya: 'りゃ',
  ja: 'じゃ',
}

export const COLUMN_LABEL: Record<ColumnId, string> = {
  a: 'あ段',
  i: 'い段',
  u: 'う段',
  e: 'え段',
  o: 'お段',
}

export const ROW_COLOR: Record<RowId, string> = {
  a: '#E85D75',
  ka: '#F08A4B',
  sa: '#7CBC6E',
  ta: '#4A90D9',
  na: '#8B6BBF',
  ha: '#D45D8C',
  ma: '#C9A227',
  ra: '#3D9B8F',
  ga: '#3A86C8',
  za: '#5C9EAD',
  da: '#8C68A8',
  ba: '#D97443',
  pa: '#E65F8E',
  kya: '#E05A47',
  sha: '#2A9D8F',
  cha: '#E76F51',
  nya: '#F4A261',
  hya: '#9D4EDD',
  mya: '#D68C45',
  rya: '#2B9348',
  ja: '#7209B7',
}

export const SEION_ROWS: RowId[] = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ra']
export const DAKUON_ROWS: RowId[] = ['ga', 'za', 'da', 'ba', 'pa']
export const YOON_ROWS: RowId[] = ['kya', 'sha', 'cha', 'nya', 'hya', 'mya', 'rya', 'ja']

export const ROW_ORDER: RowId[] = [...SEION_ROWS, ...DAKUON_ROWS, ...YOON_ROWS]
export const COLUMN_ORDER: ColumnId[] = ['a', 'i', 'u', 'e', 'o']

export function isYoonRow(row: RowId): boolean {
  return YOON_ROWS.includes(row)
}

function sound(partial: Omit<KanaSound, 'rowLabel' | 'columnLabel' | 'color' | 'image'>): KanaSound {
  return {
    ...partial,
    rowLabel: ROW_LABEL[partial.row],
    columnLabel: COLUMN_LABEL[partial.column],
    color: ROW_COLOR[partial.row],
    image: '',
  }
}

export const KANA_SOUNDS: KanaSound[] = [
  sound({
    sound: 'a',
    romaji: 'a',
    hiragana: 'あ',
    katakana: 'ア',
    row: 'a',
    column: 'a',
    vocabulary: 'あめ',
    meaning: '雨',
    icon: '☔',
    spelling: ['a', 'me'],
  }),
  sound({
    sound: 'i',
    romaji: 'i',
    hiragana: 'い',
    katakana: 'イ',
    row: 'a',
    column: 'i',
    vocabulary: 'いぬ',
    meaning: '狗',
    icon: '🐶',
    spelling: ['i', 'nu'],
  }),
  sound({
    sound: 'u',
    romaji: 'u',
    hiragana: 'う',
    katakana: 'ウ',
    row: 'a',
    column: 'u',
    vocabulary: 'うま',
    meaning: '馬',
    icon: '🐴',
    spelling: ['u', 'ma'],
  }),
  sound({
    sound: 'e',
    romaji: 'e',
    hiragana: 'え',
    katakana: 'エ',
    row: 'a',
    column: 'e',
    vocabulary: 'えさ',
    meaning: '飼料',
    icon: '🌾',
    spelling: ['e', 'sa'],
  }),
  sound({
    sound: 'o',
    romaji: 'o',
    hiragana: 'お',
    katakana: 'オ',
    row: 'a',
    column: 'o',
    vocabulary: 'おに',
    meaning: '鬼',
    icon: '👹',
    spelling: ['o', 'ni'],
  }),
  sound({
    sound: 'ka',
    romaji: 'ka',
    hiragana: 'か',
    katakana: 'カ',
    row: 'ka',
    column: 'a',
    vocabulary: 'かさ',
    meaning: '傘',
    icon: '☂️',
    spelling: ['ka', 'sa'],
  }),
  sound({
    sound: 'ki',
    romaji: 'ki',
    hiragana: 'き',
    katakana: 'キ',
    row: 'ka',
    column: 'i',
    vocabulary: 'きつね',
    meaning: '狐狸',
    icon: '🦊',
    spelling: ['ki', 'tsu', 'ne'],
  }),
  sound({
    sound: 'ku',
    romaji: 'ku',
    hiragana: 'く',
    katakana: 'ク',
    row: 'ka',
    column: 'u',
    vocabulary: 'くるま',
    meaning: '車',
    icon: '🚗',
    spelling: ['ku', 'ru', 'ma'],
  }),
  sound({
    sound: 'ke',
    romaji: 'ke',
    hiragana: 'け',
    katakana: 'ケ',
    row: 'ka',
    column: 'e',
    vocabulary: 'けしき',
    meaning: '景色',
    icon: '🏞️',
    spelling: ['ke', 'shi', 'ki'],
  }),
  sound({
    sound: 'ko',
    romaji: 'ko',
    hiragana: 'こ',
    katakana: 'コ',
    row: 'ka',
    column: 'o',
    vocabulary: 'こねこ',
    meaning: '小貓',
    icon: '🐱',
    spelling: ['ko', 'ne', 'ko'],
  }),
  sound({
    sound: 'sa',
    romaji: 'sa',
    hiragana: 'さ',
    katakana: 'サ',
    row: 'sa',
    column: 'a',
    vocabulary: 'さくら',
    meaning: '櫻花',
    icon: '🌸',
    spelling: ['sa', 'ku', 'ra'],
  }),
  sound({
    sound: 'shi',
    romaji: 'shi',
    hiragana: 'し',
    katakana: 'シ',
    row: 'sa',
    column: 'i',
    vocabulary: 'しお',
    meaning: '鹽',
    icon: '🧂',
    spelling: ['shi', 'o'],
    confusable: 'shi-tsu',
  }),
  sound({
    sound: 'su',
    romaji: 'su',
    hiragana: 'す',
    katakana: 'ス',
    row: 'sa',
    column: 'u',
    vocabulary: 'すいか',
    meaning: '西瓜',
    icon: '🍉',
    spelling: ['su', 'i', 'ka'],
  }),
  sound({
    sound: 'se',
    romaji: 'se',
    hiragana: 'せ',
    katakana: 'セ',
    row: 'sa',
    column: 'e',
    vocabulary: 'せみ',
    meaning: '蟬',
    icon: '🦗',
    spelling: ['se', 'mi'],
  }),
  sound({
    sound: 'so',
    romaji: 'so',
    hiragana: 'そ',
    katakana: 'ソ',
    row: 'sa',
    column: 'o',
    vocabulary: 'そら',
    meaning: '天空',
    icon: '☁️',
    spelling: ['so', 'ra'],
    confusable: 'so-n',
  }),
  sound({
    sound: 'ta',
    romaji: 'ta',
    hiragana: 'た',
    katakana: 'タ',
    row: 'ta',
    column: 'a',
    vocabulary: 'たこ',
    meaning: '章魚',
    icon: '🐙',
    spelling: ['ta', 'ko'],
  }),
  sound({
    sound: 'chi',
    romaji: 'chi',
    hiragana: 'ち',
    katakana: 'チ',
    row: 'ta',
    column: 'i',
    vocabulary: 'ちかてつ',
    meaning: '地鐵',
    icon: '🚇',
    spelling: ['chi', 'ka', 'te', 'tsu'],
  }),
  sound({
    sound: 'tsu',
    romaji: 'tsu',
    hiragana: 'つ',
    katakana: 'ツ',
    row: 'ta',
    column: 'u',
    vocabulary: 'つき',
    meaning: '月亮',
    icon: '🌙',
    spelling: ['tsu', 'ki'],
    confusable: 'shi-tsu',
  }),
  sound({
    sound: 'te',
    romaji: 'te',
    hiragana: 'て',
    katakana: 'テ',
    row: 'ta',
    column: 'e',
    vocabulary: 'てら',
    meaning: '寺',
    icon: '🛕',
    spelling: ['te', 'ra'],
  }),
  sound({
    sound: 'to',
    romaji: 'to',
    hiragana: 'と',
    katakana: 'ト',
    row: 'ta',
    column: 'o',
    vocabulary: 'とけい',
    meaning: '鐘錶',
    icon: '⏰',
    spelling: ['to', 'ke', 'i'],
  }),
  sound({
    sound: 'na',
    romaji: 'na',
    hiragana: 'な',
    katakana: 'ナ',
    row: 'na',
    column: 'a',
    vocabulary: 'なみ',
    meaning: '波浪',
    icon: '🌊',
    spelling: ['na', 'mi'],
  }),
  sound({
    sound: 'ni',
    romaji: 'ni',
    hiragana: 'に',
    katakana: 'ニ',
    row: 'na',
    column: 'i',
    vocabulary: 'にく',
    meaning: '肉',
    icon: '🥩',
    spelling: ['ni', 'ku'],
  }),
  sound({
    sound: 'nu',
    romaji: 'nu',
    hiragana: 'ぬ',
    katakana: 'ヌ',
    row: 'na',
    column: 'u',
    vocabulary: 'ぬの',
    meaning: '布',
    icon: '🧵',
    spelling: ['nu', 'no'],
  }),
  sound({
    sound: 'ne',
    romaji: 'ne',
    hiragana: 'ね',
    katakana: 'ネ',
    row: 'na',
    column: 'e',
    vocabulary: 'ねこ',
    meaning: '貓',
    icon: '🐱',
    spelling: ['ne', 'ko'],
  }),
  sound({
    sound: 'no',
    romaji: 'no',
    hiragana: 'の',
    katakana: 'ノ',
    row: 'na',
    column: 'o',
    vocabulary: 'のり',
    meaning: '海苔',
    icon: '🍱',
    spelling: ['no', 'ri'],
  }),
  sound({
    sound: 'ha',
    romaji: 'ha',
    hiragana: 'は',
    katakana: 'ハ',
    row: 'ha',
    column: 'a',
    vocabulary: 'はな',
    meaning: '花',
    icon: '🌷',
    spelling: ['ha', 'na'],
  }),
  sound({
    sound: 'hi',
    romaji: 'hi',
    hiragana: 'ひ',
    katakana: 'ヒ',
    row: 'ha',
    column: 'i',
    vocabulary: 'ひる',
    meaning: '中午',
    icon: '☀️',
    spelling: ['hi', 'ru'],
  }),
  sound({
    sound: 'fu',
    romaji: 'fu',
    hiragana: 'ふ',
    katakana: 'フ',
    row: 'ha',
    column: 'u',
    vocabulary: 'ふね',
    meaning: '船',
    icon: '⛵',
    spelling: ['fu', 'ne'],
  }),
  sound({
    sound: 'he',
    romaji: 'he',
    hiragana: 'へ',
    katakana: 'ヘ',
    row: 'ha',
    column: 'e',
    vocabulary: 'へそ',
    meaning: '肚臍',
    icon: '🟡',
    spelling: ['he', 'so'],
  }),
  sound({
    sound: 'ho',
    romaji: 'ho',
    hiragana: 'ほ',
    katakana: 'ホ',
    row: 'ha',
    column: 'o',
    vocabulary: 'ほし',
    meaning: '星星',
    icon: '⭐',
    spelling: ['ho', 'shi'],
  }),
  sound({
    sound: 'ma',
    romaji: 'ma',
    hiragana: 'ま',
    katakana: 'マ',
    row: 'ma',
    column: 'a',
    vocabulary: 'まち',
    meaning: '城鎮',
    icon: '🏘️',
    spelling: ['ma', 'chi'],
  }),
  sound({
    sound: 'mi',
    romaji: 'mi',
    hiragana: 'み',
    katakana: 'ミ',
    row: 'ma',
    column: 'i',
    vocabulary: 'みみ',
    meaning: '耳朵',
    icon: '👂',
    spelling: ['mi', 'mi'],
  }),
  sound({
    sound: 'mu',
    romaji: 'mu',
    hiragana: 'む',
    katakana: 'ム',
    row: 'ma',
    column: 'u',
    vocabulary: 'むし',
    meaning: '蟲',
    icon: '🐛',
    spelling: ['mu', 'shi'],
  }),
  sound({
    sound: 'me',
    romaji: 'me',
    hiragana: 'め',
    katakana: 'メ',
    row: 'ma',
    column: 'e',
    vocabulary: 'めし',
    meaning: '飯',
    icon: '🍚',
    spelling: ['me', 'shi'],
  }),
  sound({
    sound: 'mo',
    romaji: 'mo',
    hiragana: 'も',
    katakana: 'モ',
    row: 'ma',
    column: 'o',
    vocabulary: 'もも',
    meaning: '桃子',
    icon: '🍑',
    spelling: ['mo', 'mo'],
  }),
  sound({
    sound: 'ra',
    romaji: 'ra',
    hiragana: 'ら',
    katakana: 'ラ',
    row: 'ra',
    column: 'a',
    vocabulary: 'らっこ',
    meaning: '海獺',
    icon: '🦦',
    spelling: ['ra', 'tsu', 'ko'],
  }),
  sound({
    sound: 'ri',
    romaji: 'ri',
    hiragana: 'り',
    katakana: 'リ',
    row: 'ra',
    column: 'i',
    vocabulary: 'りす',
    meaning: '松鼠',
    icon: '🐿️',
    spelling: ['ri', 'su'],
  }),
  sound({
    sound: 'ru',
    romaji: 'ru',
    hiragana: 'る',
    katakana: 'ル',
    row: 'ra',
    column: 'u',
    vocabulary: 'るす',
    meaning: '不在家',
    icon: '🚪',
    spelling: ['ru', 'su'],
  }),
  sound({
    sound: 're',
    romaji: 're',
    hiragana: 'れ',
    katakana: 'レ',
    row: 'ra',
    column: 'e',
    vocabulary: 'れい',
    meaning: '例子',
    icon: '📌',
    spelling: ['re', 'i'],
  }),
  sound({
    sound: 'ro',
    romaji: 'ro',
    hiragana: 'ろ',
    katakana: 'ロ',
    row: 'ra',
    column: 'o',
    vocabulary: 'ろく',
    meaning: '六',
    icon: '6️⃣',
    spelling: ['ro', 'ku'],
  }),

  // --- 濁音 / 半濁音 ---
  sound({ sound: 'ga', romaji: 'ga', hiragana: 'が', katakana: 'ガ', row: 'ga', column: 'a', vocabulary: 'がっこう', meaning: '學校', icon: '🏫', spelling: ['ga', 'ko', 'u'] }),
  sound({ sound: 'gi', romaji: 'gi', hiragana: 'ぎ', katakana: 'ギ', row: 'ga', column: 'i', vocabulary: 'ぎんこう', meaning: '銀行', icon: '🏦', spelling: ['gi', 'ko', 'u'] }),
  sound({ sound: 'gu', romaji: 'gu', hiragana: 'ぐ', katakana: 'グ', row: 'ga', column: 'u', vocabulary: 'ぐんたい', meaning: '軍隊', icon: '💂', spelling: ['gu', 'ta', 'i'] }),
  sound({ sound: 'ge', romaji: 'ge', hiragana: 'げ', katakana: 'ゲ', row: 'ga', column: 'e', vocabulary: 'げーむ', meaning: '遊戲', icon: '🎮', spelling: ['ge', 'mu'] }),
  sound({ sound: 'go', romaji: 'go', hiragana: 'ご', katakana: 'ゴ', row: 'ga', column: 'o', vocabulary: 'ごはん', meaning: '米飯', icon: '🍚', spelling: ['go', 'ha'] }),

  sound({ sound: 'za', romaji: 'za', hiragana: 'ざ', katakana: 'ザ', row: 'za', column: 'a', vocabulary: 'ざっし', meaning: '雜誌', icon: '📖', spelling: ['za', 'shi'] }),
  sound({ sound: 'ji', romaji: 'ji', hiragana: 'じ', katakana: 'ジ', row: 'za', column: 'i', vocabulary: 'じかん', meaning: '時間', icon: '⏱️', spelling: ['ji', 'ka'] }),
  sound({ sound: 'zu', romaji: 'zu', hiragana: 'ず', katakana: 'ズ', row: 'za', column: 'u', vocabulary: 'ずぼん', meaning: '長褲', icon: '👖', spelling: ['zu', 'bo'] }),
  sound({ sound: 'ze', romaji: 'ze', hiragana: 'ぜ', katakana: 'ゼ', row: 'za', column: 'e', vocabulary: 'ぜんぶ', meaning: '全部', icon: '📦', spelling: ['ze', 'bu'] }),
  sound({ sound: 'zo', romaji: 'zo', hiragana: 'ぞ', katakana: 'ゾ', row: 'za', column: 'o', vocabulary: 'ぞう', meaning: '大象', icon: '🐘', spelling: ['zo', 'u'] }),

  sound({ sound: 'da', romaji: 'da', hiragana: 'だ', katakana: 'ダ', row: 'da', column: 'a', vocabulary: 'だんご', meaning: '糰子', icon: '🍡', spelling: ['da', 'go'] }),
  sound({ sound: 'di', romaji: 'di', hiragana: 'ぢ', katakana: 'ヂ', row: 'da', column: 'i', vocabulary: 'はなぢ', meaning: '鼻血', icon: '🩸', spelling: ['ha', 'na', 'di'] }),
  sound({ sound: 'du', romaji: 'du', hiragana: 'づ', katakana: 'ヅ', row: 'da', column: 'u', vocabulary: 'つづく', meaning: '持續', icon: '⏩', spelling: ['tsu', 'du', 'ku'] }),
  sound({ sound: 'de', romaji: 'de', hiragana: 'で', katakana: 'デ', row: 'da', column: 'e', vocabulary: 'でんしゃ', meaning: '電車', icon: '🚃', spelling: ['de', 'sha'] }),
  sound({ sound: 'do', romaji: 'do', hiragana: 'ど', katakana: 'ド', row: 'da', column: 'o', vocabulary: 'どあ', meaning: '門', icon: '🚪', spelling: ['do', 'a'] }),

  sound({ sound: 'ba', romaji: 'ba', hiragana: 'ば', katakana: 'バ', row: 'ba', column: 'a', vocabulary: 'ばす', meaning: '公車', icon: '🚌', spelling: ['ba', 'su'] }),
  sound({ sound: 'bi', romaji: 'bi', hiragana: 'び', katakana: 'ビ', row: 'ba', column: 'i', vocabulary: 'びーる', meaning: '啤酒', icon: '🍺', spelling: ['bi', 'ru'] }),
  sound({ sound: 'bu', romaji: 'bu', hiragana: 'ぶ', katakana: 'ブ', row: 'ba', column: 'u', vocabulary: 'ぶた', meaning: '豬', icon: '🐷', spelling: ['bu', 'ta'] }),
  sound({ sound: 'be', romaji: 'be', hiragana: 'べ', katakana: 'ベ', row: 'ba', column: 'e', vocabulary: 'べんとう', meaning: '便當', icon: '🍱', spelling: ['be', 'to', 'u'] }),
  sound({ sound: 'bo', romaji: 'bo', hiragana: 'ぼ', katakana: 'ボ', row: 'ba', column: 'o', vocabulary: 'ぼーる', meaning: '球', icon: '⚽', spelling: ['bo', 'ru'] }),

  sound({ sound: 'pa', romaji: 'pa', hiragana: 'ぱ', katakana: 'パ', row: 'pa', column: 'a', vocabulary: 'ぱん', meaning: '麵包', icon: '🍞', spelling: ['pa'] }),
  sound({ sound: 'pi', romaji: 'pi', hiragana: 'ぴ', katakana: 'ピ', row: 'pa', column: 'i', vocabulary: 'ぴあの', meaning: '鋼琴', icon: '🎹', spelling: ['pi', 'a', 'no'] }),
  sound({ sound: 'pu', romaji: 'pu', hiragana: 'ぷ', katakana: 'プ', row: 'pa', column: 'u', vocabulary: 'ぷりん', meaning: '布丁', icon: '🍮', spelling: ['pu', 'ri'] }),
  sound({ sound: 'pe', romaji: 'pe', hiragana: 'ぺ', katakana: 'ペ', row: 'pa', column: 'e', vocabulary: 'ぺん', meaning: '原子筆', icon: '🖊️', spelling: ['pe'] }),
  sound({ sound: 'po', romaji: 'po', hiragana: 'ぽ', katakana: 'ポ', row: 'pa', column: 'o', vocabulary: 'ぽすと', meaning: '郵筒', icon: '📮', spelling: ['po', 'su', 'to'] }),

  // --- 拗音 (每行 3 音: a, u, o) ---
  sound({ sound: 'kya', romaji: 'kya', hiragana: 'きゃ', katakana: 'キャ', row: 'kya', column: 'a', vocabulary: 'きゃく', meaning: '客人', icon: '👥', spelling: ['kya', 'ku'] }),
  sound({ sound: 'kyu', romaji: 'kyu', hiragana: 'きゅ', katakana: 'キュ', row: 'kya', column: 'u', vocabulary: 'きゅうり', meaning: '小黃瓜', icon: '🥒', spelling: ['kyu', 'ri'] }),
  sound({ sound: 'kyo', romaji: 'kyo', hiragana: 'きょ', katakana: 'キョ', row: 'kya', column: 'o', vocabulary: 'きょう', meaning: '今天', icon: '📅', spelling: ['kyo', 'u'] }),

  sound({ sound: 'sha', romaji: 'sha', hiragana: 'しゃ', katakana: 'シャ', row: 'sha', column: 'a', vocabulary: 'しゃしん', meaning: '照片', icon: '📸', spelling: ['sha', 'shi'] }),
  sound({ sound: 'shu', romaji: 'shu', hiragana: 'しゅ', katakana: 'シュ', row: 'sha', column: 'u', vocabulary: 'しゅみ', meaning: '愛好', icon: '🎨', spelling: ['shu', 'mi'] }),
  sound({ sound: 'sho', romaji: 'sho', hiragana: 'しょ', katakana: 'ショ', row: 'sha', column: 'o', vocabulary: 'しょくじ', meaning: '用餐', icon: '🍽️', spelling: ['sho', 'ku', 'ji'] }),

  sound({ sound: 'cha', romaji: 'cha', hiragana: 'ちゃ', katakana: 'チャ', row: 'cha', column: 'a', vocabulary: 'ちゃわん', meaning: '茶碗', icon: '🍵', spelling: ['cha', 'wa'] }),
  sound({ sound: 'chu', romaji: 'chu', hiragana: 'ちゅ', katakana: 'チュ', row: 'cha', column: 'u', vocabulary: 'ちゅうしゃ', meaning: '打針', icon: '💉', spelling: ['chu', 'sha'] }),
  sound({ sound: 'cho', romaji: 'cho', hiragana: 'ちょ', katakana: 'チョ', row: 'cha', column: 'o', vocabulary: 'ちょこ', meaning: '巧克力', icon: '🍫', spelling: ['cho', 'ko'] }),

  sound({ sound: 'nya', romaji: 'nya', hiragana: 'にゃ', katakana: 'ニャ', row: 'nya', column: 'a', vocabulary: 'にゃんこ', meaning: '貓咪', icon: '🐱', spelling: ['nya', 'ko'] }),
  sound({ sound: 'nyu', romaji: 'nyu', hiragana: 'にゅ', katakana: 'ニュ', row: 'nya', column: 'u', vocabulary: 'にゅうがく', meaning: '入學', icon: '🎒', spelling: ['nyu', 'ga', 'ku'] }),
  sound({ sound: 'nyo', romaji: 'nyo', hiragana: 'にょ', katakana: 'ニョ', row: 'nya', column: 'o', vocabulary: 'にょろにょろ', meaning: '扭動', icon: '🐍', spelling: ['nyo', 'ro'] }),

  sound({ sound: 'hya', romaji: 'hya', hiragana: 'ひゃ', katakana: 'ヒャ', row: 'hya', column: 'a', vocabulary: 'ひゃく', meaning: '一百', icon: '💯', spelling: ['hya', 'ku'] }),
  sound({ sound: 'hyu', romaji: 'hyu', hiragana: 'ひゅ', katakana: 'ヒュ', row: 'hya', column: 'u', vocabulary: 'ひゅうが', meaning: '日向', icon: '☀️', spelling: ['hyu', 'ga'] }),
  sound({ sound: 'hyo', romaji: 'hyo', hiragana: 'ひょ', katakana: 'ヒョ', row: 'hya', column: 'o', vocabulary: 'ひょう', meaning: '豹', icon: '🐆', spelling: ['hyo', 'u'] }),

  sound({ sound: 'mya', romaji: 'mya', hiragana: 'みゃ', katakana: 'ミャ', row: 'mya', column: 'a', vocabulary: 'みゃく', meaning: '脈搏', icon: '💓', spelling: ['mya', 'ku'] }),
  sound({ sound: 'myu', romaji: 'myu', hiragana: 'みゅ', katakana: 'ミュ', row: 'mya', column: 'u', vocabulary: 'みゅーじっく', meaning: '音樂', icon: '🎵', spelling: ['myu', 'ji'] }),
  sound({ sound: 'myo', romaji: 'myo', hiragana: 'みょ', katakana: 'ミョ', row: 'mya', column: 'o', vocabulary: 'みょうじ', meaning: '姓氏', icon: '🏷️', spelling: ['myo', 'ji'] }),

  sound({ sound: 'rya', romaji: 'rya', hiragana: 'りゃ', katakana: 'リャ', row: 'rya', column: 'a', vocabulary: 'りゃく', meaning: '省略', icon: '✂️', spelling: ['rya', 'ku'] }),
  sound({ sound: 'ryu', romaji: 'ryu', hiragana: 'りゅ', katakana: 'リュ', row: 'rya', column: 'u', vocabulary: 'りゅう', meaning: '龍', icon: '🐉', spelling: ['ryu', 'u'] }),
  sound({ sound: 'ryo', romaji: 'ryo', hiragana: 'りょ', katakana: 'リョ', row: 'rya', column: 'o', vocabulary: 'りょこう', meaning: '旅行', icon: '✈️', spelling: ['ryo', 'ko', 'u'] }),

  sound({ sound: 'ja', romaji: 'ja', hiragana: 'じゃ', katakana: 'ジャ', row: 'ja', column: 'a', vocabulary: 'じゃがいも', meaning: '馬鈴薯', icon: '🥔', spelling: ['ja', 'ga', 'i', 'mo'] }),
  sound({ sound: 'ju', romaji: 'ju', hiragana: 'じゅ', katakana: 'ジュ', row: 'ja', column: 'u', vocabulary: 'じゅう', meaning: '十', icon: '🔟', spelling: ['ju', 'u'] }),
  sound({ sound: 'jo', romaji: 'jo', hiragana: 'じょ', katakana: 'ジョ', row: 'ja', column: 'o', vocabulary: 'じょせい', meaning: '女性', icon: '👩', spelling: ['jo', 'se', 'i'] }),
]

export function getSound(soundId: string): KanaSound {
  const found = KANA_SOUNDS.find((k) => k.sound === soundId)
  if (!found) throw new Error(`Unknown sound: ${soundId}`)
  return found
}

export function soundsForRows(rows: readonly RowId[]): KanaSound[] {
  const set = new Set(rows)
  return KANA_SOUNDS.filter((s) => set.has(s.row))
}

export function spellingInRows(spelling: string[], rows: readonly RowId[]): boolean {
  const set = new Set(rows)
  return spelling.length >= 2 && spelling.every((id) => {
    const found = KANA_SOUNDS.find((s) => s.sound === id)
    return found ? set.has(found.row) : false
  })
}
