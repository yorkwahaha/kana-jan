export type AnimationSpeed = 'off' | 'fast' | 'normal'

export interface Settings {
  bgm: boolean
  sfx: boolean
  speech: boolean
  animation: AnimationSpeed
  learningHints: boolean
  showRomaji: boolean
  showRow: boolean
  showColumn: boolean
  highlightNear: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  bgm: false,
  sfx: true,
  speech: true,
  animation: 'normal',
  learningHints: true,
  showRomaji: true,
  showRow: false,
  showColumn: false,
  highlightNear: true,
}

const KEY = 'kana-jan-settings-v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function delayFor(settings: Settings, kind: 'draw' | 'think' | 'deal' | 'fx'): number {
  if (settings.animation === 'off') return 40
  const fast = settings.animation === 'fast'
  switch (kind) {
    case 'draw':
      return fast ? 180 : 450
    case 'think':
      return fast ? 280 : 500 + Math.floor(Math.random() * 700)
    case 'deal':
      return fast ? 400 : 900
    case 'fx':
      return fast ? 500 : 1100
    default:
      return 300
  }
}
