import { ROW_COLOR, ROW_LABEL, soundsForRows } from '../data/kana'
import { getLesson } from '../data/lessons'
import type { GameState } from '../engine/types'
import { CardView } from './CardView'
import { getCardById } from '../data/cards'

interface Props {
  state: GameState
  onContinue: () => void
}

export function RowPreview({ state, onContinue }: Props) {
  const lesson = getLesson(state.lessonId)
  return (
    <div className="preview-overlay" role="dialog" aria-labelledby="preview-title">
      <div className="preview-panel">
        <h2 id="preview-title">本次登場的行</h2>
        <p>{lesson.detail}</p>
        <div className="preview-grid">
          {state.activeRows.map((row) => (
            <div key={row} className="preview-row">
              <div className="preview-portraits">
                {soundsForRows([row]).map((kana) => (
                  <span key={kana.sound} className="preview-face" style={{ borderColor: ROW_COLOR[row] }}>
                    {kana.hiragana}
                  </span>
                ))}
              </div>
              <strong style={{ color: ROW_COLOR[row] }}>
                {ROW_LABEL[row]}
              </strong>
            </div>
          ))}
        </div>
        <div className="preview-bonus">
          <CardView card={getCardById(state.bonus.cardId)} size="md" />
          <div>
            <span>役札</span>
            <strong>{state.bonus.label}</strong>
            <small>{state.bonus.detail}</small>
          </div>
        </div>
        <button className="btn primary lg" onClick={onContinue}>
          開始發牌
        </button>
      </div>
    </div>
  )
}

