/**
 * 音效與背景音樂模組。
 * 支援外部實體音檔 (public/audio/)，檔案不存在或播放失敗時自動無縫 fallback 到 Web Audio 合成音。
 */

export type SfxKind =
  | 'click'
  | 'draw'
  | 'discard'
  | 'coin'
  | 'yaku'
  | 'dekita'
  | 'moratta'
  | 'ron'
  | 'win'
  | 'lose'
  | 'ready'
  | 'tick'

export type BgmTrack = 'lobby' | 'table' | 'tension'

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
  tick: `${AUDIO_BASE}sfx/tick.mp3`,
  yaku: `${AUDIO_BASE}sfx/dekita.mp3`,
}

export const BGM_PATHS: Record<BgmTrack, string> = {
  lobby: `${AUDIO_BASE}bgm/bgm-lobby.mp3`,
  table: `${AUDIO_BASE}bgm/bgm-table.mp3`,
  tension: `${AUDIO_BASE}bgm/bgm-tension.mp3`,
}

const missingAudioPaths = new Set<string>()

let ctx: AudioContext | null = null
let bgmTimer: number | null = null
let bgmStep = 0
let currentBgmAudio: HTMLAudioElement | null = null
let currentBgmTrack: BgmTrack | null = null

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
        tone(audio, 880, 0.08, 'square', 0.03)
        tone(audio, 1320, 0.1, 'square', 0.025, 0.07)
        break
      case 'dekita':
      case 'yaku':
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
      case 'tick':
        tone(audio, 540, 0.04, 'sine', 0.02)
        break
      default:
        break
    }
  } catch {
    // ignore
  }
}

export function playSfx(kind: SfxKind, enabled: boolean) {
  if (!enabled) return

  const path = SFX_PATHS[kind]
  if (path && !missingAudioPaths.has(path) && typeof Audio !== 'undefined') {
    try {
      const audio = new Audio(path)
      audio.volume = kind === 'click' ? 0.4 : kind === 'ron' ? 0.9 : 0.75
      const promise = audio.play()
      if (promise !== undefined) {
        promise.catch(() => {
          missingAudioPaths.add(path)
          playFallbackTone(kind)
        })
        return
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

  if (currentBgmTrack === track && (currentBgmAudio || bgmTimer !== null)) {
    return
  }

  stopBgm()
  currentBgmTrack = track

  const path = BGM_PATHS[track]
  if (path && !missingAudioPaths.has(path) && typeof Audio !== 'undefined') {
    try {
      const audio = new Audio(path)
      audio.loop = true
      audio.volume = 0.35
      currentBgmAudio = audio
      const promise = audio.play()
      if (promise !== undefined) {
        promise
          .then(() => {
            // HTML5 BGM 正常播放中
          })
          .catch(() => {
            missingAudioPaths.add(path)
            if (currentBgmAudio === audio) {
              currentBgmAudio = null
            }
            startSynthBgm()
          })
        return
      }
    } catch {
      missingAudioPaths.add(path)
      currentBgmAudio = null
    }
  }

  startSynthBgm()
}

export function stopBgm() {
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
