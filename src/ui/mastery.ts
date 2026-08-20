const KEY = 'kana-jan-mastery-v1'

export interface MasteryState {
  sounds: Record<string, number>
}

export function loadMastery(): MasteryState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { sounds: {} }
    const parsed = JSON.parse(raw) as MasteryState
    return { sounds: parsed.sounds ?? {} }
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
