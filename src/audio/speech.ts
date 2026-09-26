/**
 * 日文語音播放模組。
 *
 * 1. 本地實體音檔優先（/audio/words/{sound}.mp3 與 /audio/kana/{sound}.mp3）。
 * 2. 本地音檔失敗時，改用系統 speechSynthesis，不阻斷遊戲。
 */

import { KANA_SOUNDS } from '../data/kana'

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
const ROOT = BASE.endsWith('/') ? BASE : `${BASE}/`
const WORDS_BASE = `${ROOT}audio/words/`
const KANA_BASE = `${ROOT}audio/kana/`

const VOCAB_MAP = new Map<string, string>()
const KANA_MAP = new Map<string, string>()

for (const k of KANA_SOUNDS) {
  VOCAB_MAP.set(k.vocabulary, k.sound)
  KANA_MAP.set(k.hiragana, k.sound)
  KANA_MAP.set(k.katakana, k.sound)
  KANA_MAP.set(k.sound, k.sound)
  // Hepburn has deliberate collisions (じ/ぢ => ji, ず/づ => zu).
  // Never let a later romanization alias overwrite a canonical sound id.
  if (!KANA_MAP.has(k.romaji)) KANA_MAP.set(k.romaji, k.sound)
}

let currentAudio: HTMLAudioElement | null = null
const FAILED_URL_TTL_MS = 60_000
const failedUrls = new Map<string, number>()

function rememberFailedUrl(url: string): void {
  failedUrls.set(url, Date.now())
}

function isFailedUrl(url: string): boolean {
  const at = failedUrls.get(url)
  if (at === undefined) return false
  if (Date.now() - at > FAILED_URL_TTL_MS) {
    failedUrls.delete(url)
    return false
  }
  return true
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
  }
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.onended = null
      currentAudio.onerror = null
      currentAudio.removeAttribute('src')
    } catch {
      // ignore
    }
    currentAudio = null
  }
}

async function playAudioUrl(url: string): Promise<boolean> {
  if (isFailedUrl(url)) return false
  return new Promise<boolean>((resolve) => {
    try {
      const audio = new Audio(url)
      currentAudio = audio
      let settled = false
      const done = (success: boolean) => {
        if (settled) return
        settled = true
        if (currentAudio === audio) currentAudio = null
        resolve(success)
      }
      audio.onended = () => done(true)
      audio.onerror = () => {
        rememberFailedUrl(url)
        done(false)
      }
      const p = audio.play()
      if (p !== undefined) {
        p.catch((err) => {
          if (err && err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
            rememberFailedUrl(url)
          }
          done(false)
        })
      }
    } catch {
      rememberFailedUrl(url)
      resolve(false)
    }
  })
}

function speakWebSpeech(text: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve()
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ja-JP'
    utter.rate = 0.95
    utter.pitch = 1.02
    const voices = window.speechSynthesis.getVoices()
    const ja = voices.find((v) => v.lang.startsWith('ja'))
    if (ja) utter.voice = ja

    return new Promise<void>((resolve) => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        resolve()
      }
      utter.onend = done
      utter.onerror = done
      window.speechSynthesis.speak(utter)
      window.setTimeout(done, 2500)
    })
  } catch {
    return Promise.resolve()
  }
}

export async function speakJapanese(text: string, enabled: boolean): Promise<void> {
  if (!enabled || !text) return
  stopSpeech()

  const clean = text.trim()
  let localSound = VOCAB_MAP.get(clean)
  let isVocab = true
  if (!localSound) {
    localSound = KANA_MAP.get(clean)
    isVocab = false
  }

  if (localSound) {
    const dir = isVocab ? WORDS_BASE : KANA_BASE
    const localUrl = `${dir}${localSound}.mp3`
    const played = await playAudioUrl(localUrl)
    if (played) return
  }

  await speakWebSpeech(clean)
}
