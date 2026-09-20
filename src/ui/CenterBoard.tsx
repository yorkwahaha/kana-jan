import { bonusCardOf } from '../data/bonuses'
import { ROW_COLOR, ROW_MARK, isYoonRow, soundsForRows } from '../data/kana'
import type { GameState } from '../engine/types'
import { CardView } from './CardView'
import type { TablePosition } from './seats'
import type { Settings } from './settings'

interface Props {
  state: GameState
  settings: Settings
  actingPos?: TablePosition
}

export function CenterBoard({ state, settings, actingPos }: Props) {
  const bonusCard = bonusCardOf(state.bonus)
  const completedSounds = new Set(
    state.players.flatMap((p) => p.completed.flatMap((c) => c.yaku.cards.map((card) => card.sound))),
  )

  return (
    <div className="center-board">
      {/* 4 方指示燈號 (參照圖二：出牌或思考時對應方向亮起黃金燈條) */}
      <div className={`center-turn-light pos-top ${actingPos === 'top' ? 'is-lit' : ''}`} aria-hidden="true" />
      <div className={`center-turn-light pos-bottom ${actingPos === 'human' ? 'is-lit' : ''}`} aria-hidden="true" />
      <div className={`center-turn-light pos-left ${actingPos === 'left' ? 'is-lit' : ''}`} aria-hidden="true" />
      <div className={`center-turn-light pos-right ${actingPos === 'right' ? 'is-lit' : ''}`} aria-hidden="true" />

      <div className="deck-pile" title="剩餘牌山">
        <div className="kana-card face-down size-sm" aria-hidden="true" />
        <span className="deck-badge">あと {state.deck.length}</span>
      </div>
      <div className="gojuon-mini" aria-label="本次登場的行">
        <div className="gojuon-header">登場行</div>
        {state.activeRows.map((row) => {
          const isRowYoon = isYoonRow(row) || ROW_MARK[row].length > 1
          return (
            <div key={row} className="gojuon-row">
              <span
                className={`gojuon-mark ${isRowYoon ? 'is-yoon' : ''}`}
                style={{ background: ROW_COLOR[row] }}
              >
                {ROW_MARK[row]}
              </span>
              {soundsForRows([row]).map((kana) => {
                const isDotYoon = kana.hiragana.length > 1
                return (
                  <i
                    key={kana.sound}
                    className={`gojuon-dot ${isDotYoon ? 'is-yoon' : ''} ${completedSounds.has(kana.sound) ? 'is-lit' : ''}`}
                    title={kana.hiragana}
                  >
                    {kana.hiragana}
                  </i>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="bonus-slot" title="懸賞役札（牌型含該讀音即加分）">
        <CardView card={bonusCard} size="sm" showHints={settings} />
        <span className="bonus-badge">BONUS</span>
      </div>
    </div>
  )
}
