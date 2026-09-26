import { useEffect, useRef, useState } from 'react'
import { ROW_COLOR, ROW_LABEL, soundsForRows } from '../data/kana'
import type { GameState } from '../engine/types'
import { CardView } from './CardView'
import { getCardById } from '../data/cards'
import { playSfx } from '../audio/sfx'
import type { Settings } from './settings'
import { useDialogA11y } from './useDialogA11y'

interface Props {
  state: GameState
  settings?: Settings
  onContinue: () => void
  canSkip?: boolean
}

export function RowPreview({ state, settings, onContinue, canSkip = true }: Props) {
  const [elapsed, setElapsed] = useState(() => (settings?.animation === 'off' ? 6000 : 0))
  const onContinueRef = useRef(onContinue)
  onContinueRef.current = onContinue
  const dialogRef = useDialogA11y(true, canSkip ? () => onContinueRef.current() : undefined)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (settings?.animation === 'off' || reducedMotion) {
      setElapsed(6000)
      if (!canSkip) return
      const t = setTimeout(() => onContinueRef.current(), 2000)
      return () => clearTimeout(t)
    }

    const start = performance.now()
    const interval = setInterval(() => {
      const now = performance.now()
      const diff = now - start
      setElapsed(diff)
      if (diff >= 8000) {
        clearInterval(interval)
        if (canSkip) onContinueRef.current()
      }
    }, 40)

    const timeouts: number[] = []
    const sfxEnabled = settings?.sfx ?? true

    // 各行開始打牌發牌音效（每行約1秒）
    timeouts.push(window.setTimeout(() => playSfx('draw', sfxEnabled), 80))
    timeouts.push(window.setTimeout(() => playSfx('draw', sfxEnabled), 1080))
    timeouts.push(window.setTimeout(() => playSfx('draw', sfxEnabled), 2080))
    timeouts.push(window.setTimeout(() => playSfx('draw', sfxEnabled), 3080))

    // 加分卡翻牌動畫音效（4秒開始翻，5.1秒翻開亮相）
    timeouts.push(window.setTimeout(() => playSfx('ready', sfxEnabled), 4000))
    timeouts.push(window.setTimeout(() => playSfx('dekita', sfxEnabled), 5100))

    return () => {
      clearInterval(interval)
      timeouts.forEach((t) => window.clearTimeout(t))
    }
  }, [canSkip, settings?.animation, settings?.sfx])

  const bonusCard = getCardById(state.bonus.cardId)

  const isBonusFlipped = elapsed >= 4000
  const isBonusRevealed = elapsed >= 5000

  return (
    <div ref={dialogRef} tabIndex={-1} className="preview-overlay" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <div className="preview-felt-stage">
        {/* 頂部橫條：標題與略過按鈕 */}
        <header className="preview-header">
          <div className="preview-header-left">
            <span className="preview-badge">五十音かるた</span>
            <h2 id="preview-title">本次登場的牌組</h2>
          </div>
          <div className="preview-header-right">
            {canSkip && (
              <button
                type="button"
                className="btn sm preview-skip-btn"
                onClick={onContinue}
                title="略過展示直接開始"
              >
                略過 ⏩
              </button>
            )}
          </div>
        </header>

        {/* 主展示區：左邊 4 行打牌特效 ＋ 右邊加分卡 */}
        <div className="preview-main-grid">
          {/* 左側：四行牌組 */}
          <div className="preview-rows-container">
            {state.activeRows.map((rowId, rowIndex) => {
              const sounds = soundsForRows([rowId])
              const isRowStarted = elapsed >= rowIndex * 1000 + 80
              const rowFlippedCount = sounds.filter(
                (_, cIdx) => elapsed >= rowIndex * 1000 + 80 + cIdx * 160,
              ).length
              const isRowComplete = rowFlippedCount === sounds.length

              return (
                <div
                  key={rowId}
                  className={`preview-lane ${isRowStarted ? 'is-active' : ''} ${isRowComplete ? 'is-complete' : ''}`}
                >
                  <div className="preview-lane-cards">
                    {sounds.map((sound, cardIndex) => {
                      const flipTime = rowIndex * 1000 + 80 + cardIndex * 160
                      const isFlipped = elapsed >= flipTime
                      const isJustFlipped = elapsed >= flipTime && elapsed < flipTime + 380
                      const isCardVisible = cardIndex === 0 || elapsed >= flipTime - 80
                      const card = getCardById(`${sound.sound}-hiragana`)

                      return (
                        <div
                          key={sound.sound}
                          className={`preview-flipper ${isFlipped ? 'is-flipped' : ''} ${isCardVisible ? 'is-visible' : 'is-pending'}`}
                        >
                          <div className="preview-flipper-inner">
                            {/* 牌背 */}
                            <div className="preview-card-face card-back-side">
                              <div className="preview-card-back">
                                <span className="card-back-pattern">あ</span>
                              </div>
                            </div>
                            {/* 牌面 */}
                            <div className="preview-card-face card-front-side">
                              <CardView card={card} size="sm" />
                            </div>
                          </div>
                          {isJustFlipped && <div className="preview-slash-fx" />}
                        </div>
                      )
                    })}
                  </div>

                  {/* 行名標籤 */}
                  <div
                    className={`preview-row-tag ${isRowStarted ? 'is-visible' : ''}`}
                    style={{ '--row-color': ROW_COLOR[rowId] } as React.CSSProperties}
                  >
                    <span className="row-tag-name">{ROW_LABEL[rowId]}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 右側：加分卡 (BONUS) 舞台 */}
          <div className="preview-bonus-stage">
            <div className="bonus-stage-card-wrap">
              <div className="bonus-stage-frame">
                <div
                  className={`preview-flipper bonus-flipper ${isBonusFlipped ? 'is-flipped' : ''}`}
                >
                  <div className="preview-flipper-inner">
                    {/* 役札卡背 */}
                    <div className="preview-card-face card-back-side">
                      <div className="bonus-card-back">
                        <span className="bonus-back-badge">BONUS</span>
                        <span className="bonus-back-icon">⭐</span>
                        <span className="bonus-back-sub">役札</span>
                      </div>
                    </div>
                    {/* 役札卡面 */}
                    <div className="preview-card-face card-front-side">
                      <div className="bonus-card-front-wrap">
                        <CardView card={bonusCard} size="lg" />
                        <div className="bonus-gold-sheen" />
                      </div>
                    </div>
                  </div>
                  {elapsed >= 4000 && elapsed < 5600 && <div className="bonus-burst-fx" />}
                </div>

                <div className="bonus-laurel-wrap">
                  <span className="bonus-laurel-icon">🌿</span>
                  <span className="bonus-badge-title">BONUS</span>
                  <span className="bonus-laurel-icon flip">🌿</span>
                </div>
              </div>

              <div className={`bonus-info-panel ${isBonusRevealed ? 'is-visible' : ''}`}>
                <div className="bonus-name-row">
                  <span className="bonus-point-pill">+{state.bonus.points} 分</span>
                  <strong className="bonus-mission-title">役札：{state.bonus.label}</strong>
                </div>
                <p className="bonus-mission-desc">{state.bonus.detail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部時間進度條 */}
        <div className="preview-progress-track">
          <div
            className="preview-progress-bar"
            style={{ width: `${Math.min(100, (elapsed / 8000) * 100)}%` }}
          />
        </div>
        {!canSkip && (settings?.animation === 'off' || elapsed >= 8000) && (
          <p className="preview-host-wait" role="status">等待房主開始…</p>
        )}
      </div>
    </div>
  )
}
