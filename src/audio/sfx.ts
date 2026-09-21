/**
 * 音效與背景音樂模組。
 * 支援外部實體音檔 (public/audio/)，檔案不存在或播放失敗時自動無縫 fallback 到 Web Audio 合成音。
 */

export type SfxKind =
  | 'click'
  | 'draw'
  | 'discard'
  | 'coin'
  | 'dekita'
  | 'moratta'
  | 'ron'
  | 'win'
  | 'lose'
  | 'ready'

export type BgmTrack = 'lobby' | 'table'

/**
 * 依玩家名次決定結算音效：
 * - 第 1 名：'win'
 * - 最後一名：'lose'
 * - 第 2、3 名（中間名次）：null（不播放音效）
 */
export function getGameOverSfxKind(myPlace: number, maxPlace: number): 'win' | 'lose' | null {
  if (myPlace === 1) return 'win'
  if (myPlace === maxPlace && maxPlace > 1) return 'lose'
  return null
}

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
const ROOT = BASE.endsWith('/') ? BASE : `${BASE}/`
const AUDIO_BASE = `${ROOT}audio/`

export const SFX_PATHS: Record<string, string> = {
  click: `${AUDIO_BASE}sfx/click.mp3`,
  draw: `${AUDIO_BASE}sfx/draw.mp3`,
  discard: `${AUDIO_BASE}sfx/discard.mp3`,
  dekita: `${AUDIO_BASE}sfx/dekita.mp3`,
  moratta: `${AUDIO_BASE}sfx/moratta.mp3`,
  ron: `${AUDIO_BASE}sfx/ron.mp3`,
  coin: `${AUDIO_BASE}sfx/coin.mp3`,
  win: `${AUDIO_BASE}sfx/win.mp3`,
  lose: `${AUDIO_BASE}sfx/lose.mp3`,
  ready: `${AUDIO_BASE}sfx/ready.mp3`,
}

export const BGM_PATHS: Record<BgmTrack, string> = {
  lobby: `${AUDIO_BASE}bgm/bgm-lobby.mp3`,
  table: `${AUDIO_BASE}bgm/bgm-table.mp3`,
}

const missingAudioPaths = new Set<string>()

let ctx: AudioContext | null = null
let bgmTimer: number | null = null
let bgmStep = 0
let currentBgmAudio: HTMLAudioElement | null = null
let currentBgmTrack: BgmTrack | null = null
let bgmFallbackTimer: number | null = null
let bgmRetryTimer: number | null = null
let bgmPlayPending = false

export const BGM_STARTUP_GRACE_MS = 8000
const BGM_RETRY_DELAY_MS = 1200

export function shouldWaitForBgmGesture(error: unknown): boolean {
  const name = typeof error === 'object' && error !== null && 'name' in error
    ? String(error.name)
    : ''
  return name === 'NotAllowedError' || name === 'AbortError'
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  audio: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType,
  gainValue: number,
  delay = 0,
) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, audio.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(gainValue, audio.currentTime + delay + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + delay + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(audio.currentTime + delay)
  osc.stop(audio.currentTime + delay + duration + 0.05)
}

function playFallbackTone(kind: SfxKind) {
  const audio = getCtx()
  if (!audio) return
  try {
    switch (kind) {
      case 'click':
        tone(audio, 720, 0.06, 'triangle', 0.04)
        break
      case 'draw':
        tone(audio, 480, 0.1, 'sine', 0.05)
        tone(audio, 640, 0.12, 'sine', 0.04, 0.05)
        break
      case 'discard':
        tone(audio, 320, 0.12, 'triangle', 0.05)
        break
      case 'coin':
        tone(audio, 988, 0.15, 'triangle', 0.22)
        tone(audio, 1319, 0.28, 'sine', 0.26, 0.07)
        break
      case 'dekita':
        // 歡快明亮的和牌成牌和弦
        tone(audio, 523, 0.12, 'sine', 0.06)
        tone(audio, 659, 0.12, 'sine', 0.05, 0.1)
        tone(audio, 784, 0.18, 'sine', 0.05, 0.2)
        tone(audio, 1046, 0.25, 'triangle', 0.06, 0.3)
        break
      case 'moratta':
        // 俐落敏捷的抄牌提示雙音
        tone(audio, 659, 0.1, 'triangle', 0.06)
        tone(audio, 880, 0.18, 'triangle', 0.07, 0.08)
        break
      case 'ron':
        // 放槍／放銃震撼低沉衝擊音
        tone(audio, 220, 0.2, 'sawtooth', 0.08)
        tone(audio, 147, 0.3, 'sawtooth', 0.08, 0.06)
        tone(audio, 110, 0.45, 'triangle', 0.09, 0.15)
        break
      case 'win':
        // 優勝 Fanfare
        tone(audio, 523, 0.15, 'sine', 0.06)
        tone(audio, 659, 0.15, 'sine', 0.05, 0.12)
        tone(audio, 784, 0.15, 'sine', 0.05, 0.24)
        tone(audio, 1046, 0.35, 'triangle', 0.06, 0.36)
        break
      case 'lose':
        // 破產／墊底失落音
        tone(audio, 392, 0.2, 'sawtooth', 0.05)
        tone(audio, 330, 0.2, 'sawtooth', 0.05, 0.18)
        tone(audio, 262, 0.4, 'triangle', 0.05, 0.36)
        break
      case 'ready':
        // 聽牌提示叮聲
        tone(audio, 880, 0.12, 'sine', 0.05)
        tone(audio, 1174, 0.22, 'sine', 0.05, 0.1)
        break
      default:
        break
    }
  } catch {
    // ignore
  }
}

const sfxPool = new Map<string, HTMLAudioElement[]>()

function getSfxAudio(path: string, volume: number): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  let pool = sfxPool.get(path)
  if (!pool) {
    pool = []
    sfxPool.set(path, pool)
  }
  let audio: HTMLAudioElement | null = pool.find((a) => a.paused || a.ended) ?? null
  if (!audio && pool.length < 8) {
    audio = new Audio(path)
    audio.addEventListener('error', () => {
      missingAudioPaths.add(path)
    })
    pool.push(audio)
  }
  if (!audio) {
    audio = pool[0] ?? null
  }
  if (audio) {
    try {
      audio.volume = volume
      if (!audio.paused) {
        audio.pause()
      }
      audio.currentTime = 0
    } catch {
      // ignore
    }
  }
  return audio
}

export function playSfx(kind: SfxKind, enabled: boolean) {
  if (!enabled) return

  const path = SFX_PATHS[kind]
  if (path && !missingAudioPaths.has(path) && typeof Audio !== 'undefined') {
    try {
      const volume = kind === 'click' ? 0.4 : kind === 'ron' ? 0.9 : 0.75
      const audio = getSfxAudio(path, volume)
      if (audio) {
        const promise = audio.play()
        if (promise !== undefined) {
          promise.catch((err) => {
            // 中斷（AbortError）或瀏覽器自動播放策略（NotAllowedError）不代表檔案缺失
            if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
              return
            }
            missingAudioPaths.add(path)
            playFallbackTone(kind)
          })
          return
        }
      }
    } catch {
      missingAudioPaths.add(path)
    }
  }

  playFallbackTone(kind)
}

const PENTA = [262, 294, 330, 392, 440, 392, 330, 294]

function startSynthBgm() {
  stopSynthBgm()
  const audio = getCtx()
  if (!audio) return
  const tick = () => {
    try {
      const freq = PENTA[bgmStep % PENTA.length] ?? 262
      tone(audio, freq, 0.35, 'sine', 0.018)
      bgmStep += 1
    } catch {
      // ignore
    }
  }
  tick()
  bgmTimer = window.setInterval(tick, 700)
}

function stopSynthBgm() {
  if (bgmTimer !== null) {
    window.clearInterval(bgmTimer)
    bgmTimer = null
  }
}

function clearBgmStartupTimers() {
  if (bgmFallbackTimer !== null) {
    if (typeof window !== 'undefined') window.clearTimeout(bgmFallbackTimer)
    bgmFallbackTimer = null
  }
  if (bgmRetryTimer !== null) {
    if (typeof window !== 'undefined') window.clearTimeout(bgmRetryTimer)
    bgmRetryTimer = null
  }
}

function fallBackFromBgm(audio: HTMLAudioElement, path: string) {
  if (currentBgmAudio !== audio || !audio.paused) return
  missingAudioPaths.add(path)
  audio.pause()
  currentBgmAudio = null
  bgmPlayPending = false
  clearBgmStartupTimers()
  startSynthBgm()
}

function tryPlayBgm(audio: HTMLAudioElement, path: string, retryCount = 0) {
  if (currentBgmAudio !== audio || bgmPlayPending) return
  bgmPlayPending = true

  try {
    const promise = audio.play()
    if (promise === undefined) {
      bgmPlayPending = false
      clearBgmStartupTimers()
      stopSynthBgm()
      return
    }
    promise
      .then(() => {
        if (currentBgmAudio !== audio) return
        bgmPlayPending = false
        clearBgmStartupTimers()
        stopSynthBgm()
      })
      .catch((error) => {
        if (currentBgmAudio !== audio) return
        bgmPlayPending = false

        // 自動播放限制與切換音軌中斷都不是檔案失效；保留原音檔，等首次手勢直接重播。
        if (shouldWaitForBgmGesture(error)) {
          clearBgmStartupTimers()
          return
        }

        // 冷啟動或網路抖動先給音檔一次實質不同的緩衝重試，再由 grace timer 決定 fallback。
        if (retryCount < 1 && bgmRetryTimer === null) {
          bgmRetryTimer = window.setTimeout(() => {
            bgmRetryTimer = null
            tryPlayBgm(audio, path, retryCount + 1)
          }, BGM_RETRY_DELAY_MS)
        }
      })
  } catch (error) {
    bgmPlayPending = false
    if (shouldWaitForBgmGesture(error)) {
      clearBgmStartupTimers()
      return
    }
  }
}

export function startBgm(trackOrEnabled: BgmTrack | boolean = 'table', enabled = true) {
  let track: BgmTrack = 'table'
  let isEnabled = true

  if (typeof trackOrEnabled === 'boolean') {
    isEnabled = trackOrEnabled
    track = 'table'
  } else {
    track = trackOrEnabled
    isEnabled = enabled
  }

  if (!isEnabled) {
    stopBgm()
    return
  }

  if (currentBgmTrack === track) {
    if (currentBgmAudio) {
      if (currentBgmAudio.paused) tryPlayBgm(currentBgmAudio, BGM_PATHS[track])
      return
    }
    if (bgmTimer !== null) return
  }

  stopBgm()
  currentBgmTrack = track

  const path = BGM_PATHS[track]
  if (path && !missingAudioPaths.has(path) && typeof Audio !== 'undefined') {
    try {
      const audio = new Audio(path)
      audio.loop = true
      audio.volume = 0.35
      audio.preload = 'auto'
      currentBgmAudio = audio
      bgmFallbackTimer = window.setTimeout(() => fallBackFromBgm(audio, path), BGM_STARTUP_GRACE_MS)
      tryPlayBgm(audio, path)
      return
    } catch {
      currentBgmAudio = null
    }
  }

  startSynthBgm()
}

let isBgmPausedForVisibility = false

export function pauseBgm() {
  if (currentBgmAudio && !currentBgmAudio.paused) {
    try {
      currentBgmAudio.pause()
      isBgmPausedForVisibility = true
    } catch {
      // ignore
    }
  }
  stopSynthBgm()
}

export function resumeBgm() {
  if (isBgmPausedForVisibility) {
    isBgmPausedForVisibility = false
    if (currentBgmAudio && currentBgmAudio.paused) {
      currentBgmAudio.play().catch(() => {})
    } else if (currentBgmTrack) {
      startBgm(currentBgmTrack, true)
    }
  }
}

export function stopBgm() {
  isBgmPausedForVisibility = false
  bgmPlayPending = false
  clearBgmStartupTimers()
  if (currentBgmAudio) {
    try {
      currentBgmAudio.pause()
      currentBgmAudio.currentTime = 0
    } catch {
      // ignore
    }
    currentBgmAudio = null
  }
  stopSynthBgm()
  currentBgmTrack = null
}

// 瀏覽器分頁切換時自動暫停/靜音，切回時繼續播放
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseBgm()
    } else {
      resumeBgm()
    }
  })
}

// 頁面任意點擊或鍵盤操作時，解鎖瀏覽器 AudioContext 並在需要時恢復/啟動 BGM
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume()
    }
    if (currentBgmTrack && (!currentBgmAudio || currentBgmAudio.paused)) {
      startBgm(currentBgmTrack, true)
    }
  }
  window.addEventListener('pointerdown', unlockAudio, { capture: true })
  window.addEventListener('keydown', unlockAudio, { capture: true })
}
