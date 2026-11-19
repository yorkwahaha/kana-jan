import { afterEach, describe, expect, it, vi } from 'vitest'
import { speakJapanese, stopSpeech } from './speech'

class SuccessfulAudio {
  static urls: string[] = []
  onended: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string) {
    SuccessfulAudio.urls.push(url)
  }

  play() {
    this.onended?.()
    return Promise.resolve()
  }

  pause() {}
  removeAttribute() {}
}

afterEach(() => {
  stopSpeech()
  SuccessfulAudio.urls = []
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('speech local audio routing', () => {
  it('settles a cancelled pronunciation and suppresses stale fallback', async () => {
    const audios: PendingAudio[] = []
    class PendingAudio extends SuccessfulAudio {
      rejectPlay!: (error: Error) => void
      constructor(url: string) {
        super(url)
        audios.push(this)
      }
      play() {
        return new Promise<void>((_, reject) => { this.rejectPlay = reject })
      }
    }
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak })
    vi.stubGlobal('SpeechSynthesisUtterance', class {})
    vi.stubGlobal('Audio', PendingAudio)

    const old = speakJapanese('い', true)
    const latest = speakJapanese('う', true)
    audios[1]!.onended?.()
    await latest
    await expect(Promise.race([old.then(() => 'settled'), Promise.resolve().then(() => 'pending')])).resolves.toBe('settled')
    audios[0]!.rejectPlay(new DOMException('Cancelled', 'AbortError'))
    await old
    expect(speak).not.toHaveBeenCalled()
  })

  it('じ/ず/ぢ/づ 的實際假名播放會各自路由到正確本地音檔', async () => {
    vi.stubGlobal('Audio', SuccessfulAudio)
    await speakJapanese('じ', true)
    await speakJapanese('ず', true)
    await speakJapanese('ぢ', true)
    await speakJapanese('づ', true)

    expect(SuccessfulAudio.urls.map((url) => url.split('/').at(-1))).toEqual([
      'ji.mp3',
      'zu.mp3',
      'di.mp3',
      'du.mp3',
    ])
  })

  it('falls back to Web Speech when a local audio file fails', async () => {
    class FailedAudio extends SuccessfulAudio {
      play() {
        this.onerror?.()
        return Promise.resolve()
      }
    }
    class MockUtterance {
      lang = ''
      rate = 1
      pitch = 1
      voice: SpeechSynthesisVoice | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(public text: string) {}
    }
    const speak = vi.fn((utterance: MockUtterance) => utterance.onend?.())
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: vi.fn(), getVoices: () => [], speak },
    })
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)
    vi.stubGlobal('Audio', FailedAudio)

    await speakJapanese('あ', true)
    expect(speak).toHaveBeenCalledOnce()
  })
})
