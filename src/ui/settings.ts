export type AnimationSpeed = 'off' | 'fast' | 'normal'

export interface Settings {
  bgm: boolean
  sfx: boolean
  speech: boolean
  animation: AnimationSpeed
  learningHints: boolean
  showRomaji: boolean
  showMeaning: boolean
  showRow: boolean
  showColumn: boolean
  highlightNear: boolean
  recallQuiz: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  bgm: false,
  sfx: true,
  speech: true,
  animation: 'normal',
  learningHints: true,
  showRomaji: false,
  showMeaning: false,
  showRow: false,
  showColumn: false,
  highlightNear: true,
  recallQuiz: true,
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

export function delayFor(
  settings: Settings,
  kind: 'draw' | 'think' | 'deal' | 'fx' | 'hold' | 'discardFlight',
): number {
  if (settings.animation === 'off') return 40
  const fast = settings.animation === 'fast'
  switch (kind) {
    case 'draw':
      return fast ? 400 : 1200
    case 'think':
      return fast ? 600 : 1800 + Math.floor(Math.random() * 700)
    case 'deal':
      return fast ? 500 : 1100
    case 'fx':
      return fast ? 700 : 1600
    case 'hold':
      return fast ? 800 : 1600
    case 'discardFlight':
      return fast ? 420 : 820
    default:
      return 400
  }
}
