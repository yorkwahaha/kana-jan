/** 可替換的音效介面。第一版以 Web Audio 合成短音，避免授權疑慮。 */

export type SfxKind = 'click' | 'draw' | 'discard' | 'coin' | 'yaku' | 'win' | 'tick'

let ctx: AudioContext | null = null
let bgmTimer: number | null = null
let bgmStep = 0

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

export function playSfx(kind: SfxKind, enabled: boolean) {
  if (!enabled) return
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
      case 'yaku':
        tone(audio, 523, 0.12, 'sine', 0.06)
        tone(audio, 659, 0.12, 'sine', 0.05, 0.1)
        tone(audio, 784, 0.18, 'sine', 0.05, 0.2)
        break
      case 'win':
        tone(audio, 523, 0.15, 'sine', 0.06)
        tone(audio, 659, 0.15, 'sine', 0.05, 0.12)
        tone(audio, 784, 0.15, 'sine', 0.05, 0.24)
        tone(audio, 1046, 0.28, 'sine', 0.05, 0.36)
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

const PENTA = [262, 294, 330, 392, 440, 392, 330, 294]

export function startBgm(enabled: boolean) {
  stopBgm()
  if (!enabled) return
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

export function stopBgm() {
  if (bgmTimer !== null) {
    window.clearInterval(bgmTimer)
    bgmTimer = null
  }
}
