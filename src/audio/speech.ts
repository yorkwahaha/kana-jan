/**
 * 日文語音播放模組。
 *
 * 採用三層高音質語音策略：
 * 1. 本地實體音檔優先（/audio/words/{sound}.mp3 與 /audio/kana/{sound}.mp3）：
 *    零延遲、高音質（Google Cloud TTS Neural2 錄製）、完全離線可用。
 * 2. 雲端 Google Cloud TTS Proxy（ja-JP-Neural2-B，連線至 JPAPP 專屬 Worker）：
 *    若本地未命中則動態請求 Google Neural2 自然高傳真日語語音，並進行記憶體 Blob 快取。
 * 3. 系統 Web Speech API 保底：
 *    若前兩者皆不可用時自動無縫 fallback 到瀏覽器語音合成，絕不阻斷遊戲。
 */

import { KANA_SOUNDS } from '../data/kana'

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
const ROOT = BASE.endsWith('/') ? BASE : `${BASE}/`
const WORDS_BASE = `${ROOT}audio/words/`
const KANA_BASE = `${ROOT}audio/kana/`

const TTS_SESSION_URL = 'https://jpapp-tts-proxy.yorkwahaha.workers.dev/session'
const TTS_PROXY_URL = 'https://jpapp-tts-proxy.yorkwahaha.workers.dev/tts'
const DEFAULT_TTS_VOICE = 'ja-JP-Neural2-B'

const VOCAB_MAP = new Map<string, string>()
const KANA_MAP = new Map<string, string>()

for (const k of KANA_SOUNDS) {
  VOCAB_MAP.set(k.vocabulary, k.sound)
  KANA_MAP.set(k.hiragana, k.sound)
  KANA_MAP.set(k.katakana, k.sound)
  KANA_MAP.set(k.sound, k.sound)
  KANA_MAP.set(k.romaji, k.sound)
}

let currentAudio: HTMLAudioElement | null = null
let sessionToken: string | null = null
let sessionExp = 0
let sessionPromise: Promise<string | null> | null = null

const cloudAudioCache = new Map<string, string>()
const failedUrls = new Set<string>()

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
  if (failedUrls.has(url)) return false
  return new Promise<boolean>((resolve) => {
    try {
      const audio = new Audio(url)
      currentAudio = audio
      let settled = false
      const done = (success: boolean) => {
        if (settled) return
        settled = true
        if (currentAudio === audio) currentAudio = null
        if (!success) failedUrls.add(url)
        resolve(success)
      }
      audio.onended = () => done(true)
      audio.onerror = () => done(false)
      const p = audio.play()
      if (p !== undefined) {
        p.catch(() => done(false))
      }
    } catch {
      failedUrls.add(url)
      resolve(false)
    }
  })
}

async function getSessionToken(): Promise<string | null> {
  if (sessionToken && sessionExp > Date.now() + 5000) {
    return sessionToken
  }
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const res = await fetch(TTS_SESSION_URL)
        if (!res.ok) return null
        const data = await res.json()
        sessionToken = data.token
        sessionExp = Number(data.exp) || 0
        return sessionToken
      } catch {
        return null
      } finally {
        sessionPromise = null
      }
    })()
  }
  return sessionPromise
}

async function speakCloudTts(text: string): Promise<boolean> {
  const cachedUrl = cloudAudioCache.get(text)
  if (cachedUrl) {
    return playAudioUrl(cachedUrl)
  }

  const token = await getSessionToken()
  if (!token) return false

  try {
    const res = await fetch(TTS_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': token,
      },
      body: JSON.stringify({
        text,
        voice: DEFAULT_TTS_VOICE,
        rate: '1.0',
        pitch: 'default',
      }),
    })

    if (!res.ok) return false
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    cloudAudioCache.set(text, blobUrl)
    return playAudioUrl(blobUrl)
  } catch {
    return false
  }
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

  // 1. 本地實體音檔優先（/audio/words/ 與 /audio/kana/）
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

  // 2. 雲端 Google Cloud TTS (連線至 JPAPP 專屬 Worker Proxy，Neural2-B 聲線)
  const cloudPlayed = await speakCloudTts(clean)
  if (cloudPlayed) return

  // 3. 系統 Web Speech 語音合成保底
  await speakWebSpeech(clean)
}

export async function recognizeSpeech(_expected: string): Promise<{ ok: boolean; transcript: string }> {
  return { ok: true, transcript: '' }
}
