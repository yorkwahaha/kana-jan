import { Mascot } from './Mascot'
import type { AiDifficulty } from '../engine/types'
import { LESSONS } from '../data/lessons'

interface Props {
  playerName: string
  difficulty: AiDifficulty
  lessonId: string
  hasSave: boolean
  onName: (v: string) => void
  onDifficulty: (v: AiDifficulty) => void
  onLesson: (id: string) => void
  onStart: () => void
  onContinue: () => void
  onHelp: () => void
}

export function Lobby({
  playerName,
  difficulty,
  lessonId,
  hasSave,
  onName,
  onDifficulty,
  onLesson,
  onStart,
  onContinue,
  onHelp,
}: Props) {
  return (
    <div className="lobby">
      <div className="lobby-atmosphere" aria-hidden>
        <span className="ghost-kana">あ</span>
      </div>
      <section className="lobby-sheet">
        <header className="lobby-brand">
          <Mascot mood="idle" />
          <p className="eyebrow">五十音かるた</p>
          <h1>かなジャン！</h1>
          <p className="lobby-kana">KANA JAN</p>
          <p className="lede">收集同音、同一行，並拼出桌上的 Bonus 單字。每局只出場部分行，好讓你反覆記住假名。</p>
        </header>
        <div className="lobby-form">
          <label className="field">
            你的名字
            <input value={playerName} maxLength={12} onChange={(e) => onName(e.target.value)} />
          </label>
          <fieldset className="diff">
            <legend>課程（本次登場的行）</legend>
            <div className="lesson-picks">
              {LESSONS.map((lesson) => (
                <label key={lesson.id} className={lessonId === lesson.id ? 'is-on' : ''}>
                  <input
                    type="radio"
                    name="lesson"
                    checked={lessonId === lesson.id}
                    onChange={() => onLesson(lesson.id)}
                  />
                  <span>{lesson.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="diff">
            <legend>電腦難度</legend>
            <label>
              <input
                type="radio"
                name="diff"
                checked={difficulty === 'easy'}
                onChange={() => onDifficulty('easy')}
              />
              簡單
            </label>
            <label>
              <input
                type="radio"
                name="diff"
                checked={difficulty === 'normal'}
                onChange={() => onDifficulty('normal')}
              />
              普通
            </label>
          </fieldset>
          <div className="lobby-actions">
            <button className="btn primary lg" onClick={onStart}>
              開始對局
            </button>
            {hasSave && (
              <button className="btn lg" onClick={onContinue}>
                繼續上次
              </button>
            )}
            <button className="btn ghost" onClick={onHelp}>
              玩法說明
            </button>
          </div>
          <p className="seats-note">對戰 さくら、ひなた、あおい。建議從あ行開始。</p>
        </div>
      </section>
    </div>
  )
}
