import { DAKUON_ROWS, ROW_ORDER, SEION_ROWS, YOON_ROWS, type RowId } from './kana'

export interface Lesson {
  id: string
  label: string
  detail: string
  rows: RowId[]
  isRandom?: boolean
}

export const LESSONS: Lesson[] = [
  { id: 'random-4', label: '隨機 4 行', detail: '清・濁・拗全隨機 4 行對局', rows: [], isRandom: true },
  { id: 'seion-4', label: '清音隨機 4 行', detail: '從あ〜ら基礎行隨機抽選 4 行', rows: [], isRandom: true },
  { id: 'dakuon-4', label: '濁音混成 4 行', detail: '清音 2 行 ＋ 濁音 2 行', rows: [], isRandom: true },
  { id: 'yoon-4', label: '拗音挑戰 4 行', detail: '清音 2 行 ＋ 拗音 2 行', rows: [], isRandom: true },
  { id: 'a', label: 'あ行', detail: '先學會あいうえお', rows: ['a'] },
  { id: 'a-ka', label: 'あ・か行', detail: '加上かきくけこ', rows: ['a', 'ka'] },
  { id: 'a-sa', label: 'あ〜さ行', detail: '三次練習，同音組會很常出現', rows: ['a', 'ka', 'sa'] },
  { id: 'a-ta', label: 'あ〜た行', detail: '加入たちつてと', rows: ['a', 'ka', 'sa', 'ta'] },
  { id: 'a-na', label: 'あ〜な行', detail: '前五行，可組成同一段', rows: ['a', 'ka', 'sa', 'ta', 'na'] },
  { id: 'a-ra', label: 'あ〜ら行', detail: '前八行清音', rows: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ra'] },
]

export const DEFAULT_LESSON_ID = 'random-4'

export function getLesson(id: string | undefined): Lesson {
  return LESSONS.find((l) => l.id === id) ?? LESSONS[0]!
}

export function pickLessonRows(
  lessonId: string,
  shuffle: <T>(items: readonly T[]) => T[],
): RowId[] {
  if (lessonId === 'random-4') {
    const seionAndDakuon: RowId[] = [...SEION_ROWS, ...DAKUON_ROWS]
    const pickedSeionDakuon = shuffle(seionAndDakuon).slice(0, 2)
    const pickedYoon = shuffle(YOON_ROWS).slice(0, 1)
    const alreadyPicked = new Set<RowId>([...pickedSeionDakuon, ...pickedYoon])
    const remainingRows = ROW_ORDER.filter((r) => !alreadyPicked.has(r))
    const fourthRow = shuffle(remainingRows).slice(0, 1)
    return [...pickedSeionDakuon, ...pickedYoon, ...fourthRow]
  }
  if (lessonId === 'seion-4') {
    return shuffle(SEION_ROWS).slice(0, 4)
  }
  if (lessonId === 'dakuon-4') {
    const s = shuffle(SEION_ROWS).slice(0, 2)
    const d = shuffle(DAKUON_ROWS).slice(0, 2)
    return [...s, ...d]
  }
  if (lessonId === 'yoon-4') {
    const s = shuffle(SEION_ROWS).slice(0, 2)
    const y = shuffle(YOON_ROWS).slice(0, 2)
    return [...s, ...y]
  }
  const lesson = getLesson(lessonId)
  if (lesson.rows.length > 0) {
    return lesson.rows.slice(0, 4)
  }
  return shuffle(ROW_ORDER).slice(0, 4)
}

export function columnYakuEnabled(rows: readonly RowId[]): boolean {
  return rows.length >= 4
}

