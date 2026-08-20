import { bonusCardOf } from '../data/bonuses'
import { ROW_COLOR, ROW_MARK, soundsForRows } from '../data/kana'
import type { GameState } from '../engine/types'
import { CardView } from './CardView'
import type { Settings } from './settings'

interface Props {
  state: GameState
  settings: Settings
}

export function CenterBoard({ state, settings }: Props) {
  const bonusCard = bonusCardOf(state.bonus)
  const completedSounds = new Set(
    state.players.flatMap((p) => p.completed.flatMap((c) => c.yaku.cards.map((card) => card.sound))),
  )

  return (
    <div className="center-board">
      <div className="deck-pile">
        <div className="kana-card face-down size-md" aria-hidden />
        <span>牌山 {state.deck.length}</span>
      </div>
      <div className="gojuon-mini" aria-label="本次登場的行">
        {state.activeRows.map((row) => (
          <div key={row} className="gojuon-row">
            <span className="gojuon-mark" style={{ background: ROW_COLOR[row] }}>
              {ROW_MARK[row]}
            </span>
            {soundsForRows([row]).map((kana) => (
              <i
                key={kana.sound}
                className={`gojuon-dot ${completedSounds.has(kana.sound) ? 'is-lit' : ''}`}
                title={kana.hiragana}
              >
                {kana.hiragana}
              </i>
            ))}
          </div>
        ))}
      </div>
      <div className="bonus-slot">
        <CardView card={bonusCard} size="sm" showHints={settings} />
        <span>役札</span>
      </div>
    </div>
  )
}
