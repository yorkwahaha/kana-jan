/**
 * 日文語音播放。失敗時靜默結束，絕不卡住遊戲。
 *
 * TODO(speech-recognition): 未來可在此接上 Web Speech API 辨識，
 * 讓玩家真正讀出假名後再通過挑戰。介面預留如下：
 *
 *   recognizeSpeech(expected: string): Promise<{ ok: boolean; transcript: string }>
 */
export async function speakJapanese(text: string, enabled: boolean): Promise<void> {
  if (!enabled || !text) return
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ja-JP'
    utter.rate = 0.88
    utter.pitch = 1.05
    const voices = window.speechSynthesis.getVoices()
    const ja = voices.find((v) => v.lang.startsWith('ja'))
    if (ja) utter.voice = ja

    await new Promise<void>((resolve) => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        resolve()
      }
      utter.onend = done
      utter.onerror = done
      window.speechSynthesis.speak(utter)
      window.setTimeout(done, 2800)
    })
  } catch {
    // fallback: 不中斷遊戲
  }
}

export async function recognizeSpeech(_expected: string): Promise<{ ok: boolean; transcript: string }> {
  // TODO(speech-recognition): 接上 SpeechRecognition / 雲端辨識
  return { ok: true, transcript: '' }
}
