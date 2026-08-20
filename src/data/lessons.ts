import { ROW_LABEL, type RowId } from './kana'

export interface Lesson {
  id: string
  label: string
  detail: string
  rows: RowId[]
}

export const LESSONS: Lesson[] = [
  { id: 'a', label: 'あ行', detail: '先學會あいうえお', rows: ['a'] },
  { id: 'a-ka', label: 'あ・か行', detail: '加上かきくけこ', rows: ['a', 'ka'] },
  { id: 'a-sa', label: 'あ〜さ行', detail: '三次練習，同音組會很常出現', rows: ['a', 'ka', 'sa'] },
  { id: 'a-ta', label: 'あ〜た行', detail: '加入たちつてと', rows: ['a', 'ka', 'sa', 'ta'] },
  { id: 'a-na', label: 'あ〜な行', detail: '前五行，可組成同一段', rows: ['a', 'ka', 'sa', 'ta', 'na'] },
  { id: 'a-ha', label: 'あ〜は行', detail: '加入はひふへほ', rows: ['a', 'ka', 'sa', 'ta', 'na', 'ha'] },
  { id: 'a-ma', label: 'あ〜ま行', detail: '加入まみむめも', rows: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'] },
  { id: 'a-ra', label: 'あ〜ら行', detail: '目前完整課程', rows: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ra'] },
]

export const DEFAULT_LESSON_ID = 'a'

export function getLesson(id: string | undefined): Lesson {
  return LESSONS.find((l) => l.id === id) ?? LESSONS[0]!
}

export function lessonTitle(lesson: Lesson): string {
  return lesson.rows.map((row) => ROW_LABEL[row]).join('・')
}

export function columnYakuEnabled(rows: readonly RowId[]): boolean {
  return rows.length >= 5
}
