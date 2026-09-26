import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildWordReviewEntries,
  filterFlaggedEntries,
  parseFlaggedSoundIds,
  serializeFlaggedEntries,
  WORD_REVIEW_STORAGE_KEY,
} from '../audio/wordReview'
import './AudioReview.css'

function loadFlaggedSounds(): Set<string> {
  try {
    return parseFlaggedSoundIds(window.localStorage.getItem(WORD_REVIEW_STORAGE_KEY))
  } catch {
    return new Set()
  }
}

export function AudioReview() {
  const entries = useMemo(() => buildWordReviewEntries(), [])
  const [flagged, setFlagged] = useState<Set<string>>(loadFlaggedSounds)
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const visibleEntries = flaggedOnly ? filterFlaggedEntries(entries, flagged) : entries
  const flaggedEntries = filterFlaggedEntries(entries, flagged)

  function persist(next: Set<string>) {
    setFlagged(next)
    try {
      window.localStorage.setItem(WORD_REVIEW_STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      setMessage('瀏覽器無法儲存標記，但本次頁面仍會保留。')
    }
  }

  function toggleFlag(sound: string) {
    const next = new Set(flagged)
    if (next.has(sound)) next.delete(sound)
    else next.add(sound)
    persist(next)
  }

  function stopAudio() {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaying(null)
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function toggleAudio(sound: string, url: string) {
    if (playing === sound) {
      stopAudio()
      return
    }
    stopAudio()
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = stopAudio
    audio.onerror = () => {
      setFailed((current) => new Set(current).add(sound))
      stopAudio()
    }
    setPlaying(sound)
    void audio.play().catch(() => {
      setFailed((current) => new Set(current).add(sound))
      stopAudio()
    })
  }

  async function copyFlagged() {
    const text = serializeFlaggedEntries(flaggedEntries)
    try {
      await navigator.clipboard.writeText(text)
      setMessage(`已複製 ${flaggedEntries.length} 筆標記`)
    } catch {
      setMessage('無法自動複製，請使用匯出檔案')
    }
  }

  function exportFlagged() {
    const blob = new Blob([serializeFlaggedEntries(flaggedEntries)], { type: 'text/tab-separated-values;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kana-jan-word-audio-errors.tsv'
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`已匯出 ${flaggedEntries.length} 筆標記`)
  }

  return (
    <main className="audio-review">
      <header className="audio-review__header">
        <div>
          <p className="audio-review__eyebrow">Kana Jan 維護工具</p>
          <h1>單字音檔試聽</h1>
          <p>逐一播放實體 MP3；此頁不會改用系統語音。</p>
        </div>
        <a href="./" className="audio-review__back">回到遊戲</a>
      </header>

      <section className="audio-review__toolbar" aria-label="試聽清單工具">
        <strong>{entries.length} 個單字 · 已標記 {flagged.size} 個</strong>
        <label>
          <input type="checkbox" checked={flaggedOnly} onChange={(event) => setFlaggedOnly(event.target.checked)} />
          只看重音有誤
        </label>
        <button type="button" onClick={copyFlagged} disabled={flagged.size === 0}>複製錯誤清單</button>
        <button type="button" onClick={exportFlagged} disabled={flagged.size === 0}>匯出 TSV</button>
        <span role="status" aria-live="polite">{message}</span>
      </section>

      <div className="audio-review__list">
        {visibleEntries.map((entry, index) => {
          const isPlaying = playing === entry.sound
          const hasFailed = failed.has(entry.sound)
          return (
            <article className={`audio-review__item${flagged.has(entry.sound) ? ' is-flagged' : ''}`} key={entry.sound}>
              <span className="audio-review__index">{index + 1}</span>
              <div className="audio-review__word">
                <strong lang="ja">{entry.vocabulary}</strong>
                <span>{entry.meaning}</span>
              </div>
              <div className="audio-review__reading">
                <span lang="ja">{entry.kana}</span>
                <code>{entry.romaji} · {entry.sound}.mp3</code>
              </div>
              <button
                type="button"
                className="audio-review__play"
                onClick={() => toggleAudio(entry.sound, entry.audioUrl)}
                aria-label={`${isPlaying ? '停止' : '播放'} ${entry.vocabulary}`}
              >
                {isPlaying ? '停止' : '播放'}
              </button>
              <label className="audio-review__flag">
                <input
                  type="checkbox"
                  checked={flagged.has(entry.sound)}
                  onChange={() => toggleFlag(entry.sound)}
                />
                重音有誤
              </label>
              {hasFailed && <strong className="audio-review__error" role="alert">MP3 載入失敗</strong>}
            </article>
          )
        })}
      </div>
    </main>
  )
}
