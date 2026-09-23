import { KANA_SOUNDS } from '../data/kana'

const KEY = 'kana-jan-mastery-v1'
const VALID_SOUNDS = new Set(KANA_SOUNDS.map((sound) => sound.sound))

export interface MasteryState {
  sounds: Record<string, number>
}

export function loadMastery(): MasteryState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { sounds: {} }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { sounds: {} }
    const rawSounds = (parsed as { sounds?: unknown }).sounds
    if (!rawSounds || typeof rawSounds !== 'object' || Array.isArray(rawSounds)) return { sounds: {} }
    const sounds: Record<string, number> = {}
    for (const [id, count] of Object.entries(rawSounds)) {
      if (VALID_SOUNDS.has(id) && Number.isInteger(count) && Number(count) >= 0) sounds[id] = Number(count)
    }
    return { sounds }
  } catch {
    return { sounds: {} }
  }
}

export function recordSounds(soundIds: string[]) {
  const next = loadMastery()
  for (const id of soundIds) {
    next.sounds[id] = (next.sounds[id] ?? 0) + 1
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function isMastered(soundId: string, mastery = loadMastery()): boolean {
  return (mastery.sounds[soundId] ?? 0) > 0
}
