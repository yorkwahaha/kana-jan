export type AnimationSpeed = 'off' | 'fast' | 'normal'
export type WinScreenHold = '4s' | '8s' | 'manual'

export interface Settings {
  bgm: boolean
  sfx: boolean
  speech: boolean
  animation: AnimationSpeed
  winScreenHold: WinScreenHold
  learningHints: boolean
  showRomaji: boolean
  showMeaning: boolean
  showPosition: boolean
  highlightNear: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  bgm: false,
  sfx: true,
  speech: true,
  animation: 'normal',
  winScreenHold: '4s',
  learningHints: true,
  showRomaji: false,
  showMeaning: false,
  showPosition: false,
  highlightNear: true,
}

const KEY = 'kana-jan-settings-v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_SETTINGS }
    const candidate = parsed as Record<string, unknown>
    const next = { ...DEFAULT_SETTINGS }
    const booleanKeys = [
      'bgm', 'sfx', 'speech', 'learningHints', 'showRomaji', 'showMeaning', 'showPosition', 'highlightNear',
    ] as const
    for (const key of booleanKeys) {
      if (typeof candidate[key] === 'boolean') next[key] = candidate[key]
    }
    // v1 migration: the old UI stored row/column as two independent toggles.
    if (typeof candidate.showPosition !== 'boolean') {
      next.showPosition = candidate.showRow === true || candidate.showColumn === true
    }
    if (candidate.animation === 'off' || candidate.animation === 'fast' || candidate.animation === 'normal') {
      next.animation = candidate.animation
    }
    if (candidate.winScreenHold === '4s' || candidate.winScreenHold === '8s' || candidate.winScreenHold === 'manual') {
      next.winScreenHold = candidate.winScreenHold
    } else if (candidate.winScreenHold === '5s') {
      next.winScreenHold = '4s'
    } else if (candidate.winScreenHold === '10s') {
      next.winScreenHold = '8s'
    }
    return next
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
  settings: Pick<Settings, 'animation'>,
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
      // 28 張依起始玩家輪流配牌；保留最後一張落位後的短暫確認。
      return fast ? 1700 : 3400
    case 'fx':
      return fast ? 700 : 1600
    case 'hold':
      return fast ? 800 : 1600
    case 'discardFlight':
      return fast ? 420 : 820
    default: {
      const unexpected: never = kind
      return unexpected
    }
  }
}
