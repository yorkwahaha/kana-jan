import { useMemo, useState } from 'react'
import { bonusSpelling } from '../data/bonuses'
import { getSound } from '../data/kana'
import type { GameState } from '../engine/types'
import { computeRowCardStats, getVisibleCards, MAX_COPIES_PER_TYPE } from './referenceHelper'

interface Props {
  state: GameState
  myPlayerId?: string
  isOpen: boolean
  onClose: () => void
}

type TabKey = 'remaining' | 'yaku' | 'bonus'

export function ReferenceDrawer({ state, myPlayerId, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('remaining')

  const visibleCards = useMemo(() => getVisibleCards(state, myPlayerId), [state, myPlayerId])
  const rowStats = useMemo(
    () => computeRowCardStats(state.activeRows, visibleCards),
    [state.activeRows, visibleCards],
  )

  const bonusKana = useMemo(() => {
    try {
      return getSound(state.bonus.sound)
    } catch {
      return null
    }
  }, [state.bonus.sound])

  const spelling = useMemo(
    () => bonusSpelling(state.bonus, state.activeRows),
    [state.bonus, state.activeRows],
  )

  if (!isOpen) return null

  return (
    <aside className="reference-drawer" aria-label="牌況與役種參考">
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />

      <div className="drawer-panel" role="dialog" aria-labelledby="drawer-title">
        <header className="drawer-header">
          <div className="drawer-tabs">
            <button
              type="button"
              className={`drawer-tab ${activeTab === 'remaining' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('remaining')}
            >
              剩餘卡牌
            </button>
            <button
              type="button"
              className={`drawer-tab ${activeTab === 'yaku' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('yaku')}
            >
              牌型一覽
            </button>
            <button
              type="button"
              className={`drawer-tab ${activeTab === 'bonus' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('bonus')}
            >
              本局加成
            </button>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="關閉面板">
            ✕
          </button>
        </header>

        <div className="drawer-body">
          {/* 分頁 1：剩餘卡牌 */}
          {activeTab === 'remaining' && (
            <div className="tab-pane remaining-pane">
              <div className="remaining-summary">
                <span>牌山剩餘：<strong>{state.deck.length}</strong> 張</span>
                <span className="summary-legend">
                  <i className="dot dot-hira" />平
                  <i className="dot dot-kata" />片
                  <i className="dot dot-vocab" />字
                </span>
              </div>

              <div className="row-stat-list">
                {rowStats.map((row) => (
                  <section key={row.rowId} className="row-stat-card">
                    <header className="row-stat-head">
                      <div className="row-stat-title">
                        <span className="row-badge" style={{ backgroundColor: row.color }}>
                          {row.rowLabel}
                        </span>
                      </div>
                      <span className="row-count-badge">
                        未見 {row.totalRemaining}/{row.totalMax}
                      </span>
                    </header>

                    <div className="sound-cards-grid">
                      {row.sounds.map((sound) => (
                        <div key={sound.sound} className="sound-stat-item">
                          <div className="sound-card-face">
                            <span className="face-hira">{sound.hiraganaText}</span>
                            <span className="face-kata">{sound.katakanaText}</span>
                            <span className="face-icon">{sound.icon}</span>
                            <span className="sound-rem-num">{sound.totalRemaining}</span>
                          </div>

                          {/* 3 列長條色塊 */}
                          <div className="block-bars">
                            {/* 平假名色塊 (紅/粉) */}
                            <div className="bar-row bar-hira" title={`平假名剩餘 ${sound.hiragana.remaining} 張`}>
                              {Array.from({ length: MAX_COPIES_PER_TYPE }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`block-pip ${i < sound.hiragana.remaining ? 'is-active' : 'is-consumed'}`}
                                />
                              ))}
                            </div>

                            {/* 片假名色塊 (藍/青) */}
                            <div className="bar-row bar-kata" title={`片假名剩餘 ${sound.katakana.remaining} 張`}>
                              {Array.from({ length: MAX_COPIES_PER_TYPE }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`block-pip ${i < sound.katakana.remaining ? 'is-active' : 'is-consumed'}`}
                                />
                              ))}
                            </div>

                            {/* 單字卡色塊 (橙黃) */}
                            <div className="bar-row bar-vocab" title={`單字卡剩餘 ${sound.vocabulary.remaining} 張`}>
                              {Array.from({ length: MAX_COPIES_PER_TYPE }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`block-pip ${i < sound.vocabulary.remaining ? 'is-active' : 'is-consumed'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}

          {/* 分頁 2：牌型一覽 */}
          {activeTab === 'yaku' && (
            <div className="tab-pane yaku-pane">
              <div className="yaku-category">
                <h4>🎴 基礎牌型（可胡牌）</h4>
                <div className="yaku-item-card">
                  <div className="yaku-info">
                    <strong>同音三張</strong>
                    <p>同一個讀音的任意 3 張卡片（混色 120 / 純色 840）</p>
                  </div>
                  <div className="yaku-score">120 / 840 點</div>
                </div>

                <div className="yaku-item-card highlight">
                  <div className="yaku-info">
                    <strong>三位相和（全彩加成）</strong>
                    <p>同音之「平假名 1 ＋ 片假名 1 ＋ 單字卡 1」各一張</p>
                  </div>
                  <div className="yaku-score">480 點</div>
                </div>

                <div className="yaku-item-card">
                  <div className="yaku-info">
                    <strong>拗音揃い（快攻首選）</strong>
                    <p>同一拗音行的 3 個相異讀音（混色 180 / 純色 480）</p>
                  </div>
                  <div className="yaku-score">180 / 480 點</div>
                </div>


                <div className="yaku-item-card highlight">
                  <div className="yaku-info">
                    <strong>一行揃い（滿貫大牌 5 張）</strong>
                    <p>清音／濁音同一行 5 個相異讀音（混色 480 / 純色 1800）</p>
                  </div>
                  <div className="yaku-score">480 / 1800 點</div>
                </div>

                <div className="yaku-item-card">
                  <div className="yaku-info">
                    <strong>組字牌型</strong>
                    <p>拼出本局指定 Bonus 目標單字</p>
                  </div>
                  <div className="yaku-score">240～360 點 ＋ Bonus</div>
                </div>
              </div>
            </div>
          )}

          {/* 分頁 3：本局加成 */}
          {activeTab === 'bonus' && (
            <div className="tab-pane bonus-pane">
              {bonusKana && (
                <section className="bonus-target-section">
                  <h4>🎯 本局 Bonus 任務</h4>
                  <div className="bonus-detail-box">
                    <div className="bonus-kana-avatar">
                      <span className="avatar-hira">{bonusKana.hiragana}</span>
                      <span className="avatar-icon">{bonusKana.icon}</span>
                    </div>
                    <div className="bonus-desc-text">
                      <p className="bonus-sound-name">
                        目標讀音：<strong>{bonusKana.hiragana} ({bonusKana.sound})</strong>
                      </p>
                      <p className="bonus-vocab-spelling">
                        組字目標：<strong>{bonusKana.vocabulary}</strong>（{bonusKana.meaning}）
                      </p>
                      <p className="bonus-points-tag">
                        達成時額外加成：<strong>＋{state.bonus.points} 點</strong>
                      </p>
                    </div>
                  </div>

                  {spelling.length >= 2 && (
                    <div className="spelling-guide">
                      <span>拼字讀音需要：</span>
                      <div className="spelling-badges">
                        {spelling.map((s, idx) => {
                          const kana = (() => {
                            try {
                              return getSound(s)
                            } catch {
                              return null
                            }
                          })()
                          return (
                            <span key={idx} className="spelling-badge">
                              {kana ? `${kana.hiragana} (${s})` : s}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )}

              <section className="bonus-type-rules">
                <h4>✨ 純色同類型加成規則</h4>
                <ul className="rule-list">
                  <li>
                    <span className="dot dot-hira" />
                    <strong>一行揃い純色（5張）</strong>：全平假名 / 全片假名 / 全單字，得分提升至 <strong>1,800 點</strong>
                  </li>
                  <li>
                    <span className="dot dot-vocab" />
                    <strong>同音純色（3張）</strong>：同讀音 3 張皆為同一字形，得分提升至 <strong>840 點</strong>
                  </li>
                  <li>
                    <strong>拗音純色（3張）</strong>：拗音 3 音同字形，得分提升至 <strong>480 點</strong>
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
