import { KANA_SOUNDS, type KanaSound } from '../data/kana'

export const WORD_REVIEW_STORAGE_KEY = 'kana-jan:word-audio-review:v1'

export interface WordReviewEntry {
  sound: string
  romaji: string
  kana: string
  vocabulary: string
  meaning: string
  audioUrl: string
}

function normalizedBase(base: string): string {
  return base.endsWith('/') ? base : `${base}/`
}

export function wordAudioUrl(sound: string, base = import.meta.env.BASE_URL || '/'): string {
  return `${normalizedBase(base)}audio/words/${sound}.mp3`
}

export function buildWordReviewEntries(sounds: readonly KanaSound[] = KANA_SOUNDS): WordReviewEntry[] {
  return sounds.map((item) => ({
    sound: item.sound,
    romaji: item.romaji,
    kana: `${item.hiragana} / ${item.katakana}`,
    vocabulary: item.vocabulary,
    meaning: item.meaning,
    audioUrl: wordAudioUrl(item.sound),
  }))
}

const VALID_SOUND_IDS = new Set(KANA_SOUNDS.map((item) => item.sound))

export function parseFlaggedSoundIds(raw: string | null): Set<string> {
  if (!raw) return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((value): value is string => typeof value === 'string' && VALID_SOUND_IDS.has(value)))
  } catch {
    return new Set()
  }
}

export function filterFlaggedEntries(entries: readonly WordReviewEntry[], flagged: ReadonlySet<string>): WordReviewEntry[] {
  return entries.filter((entry) => flagged.has(entry.sound))
}

export function serializeFlaggedEntries(entries: readonly WordReviewEntry[]): string {
  const rows = entries.map((entry) => [entry.sound, entry.vocabulary, entry.meaning, entry.kana, entry.audioUrl].join('\t'))
  return ['音檔鍵\t單字\t意思\t假名\t音檔路徑', ...rows].join('\n')
}
