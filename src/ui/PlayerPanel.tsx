import type { PlayerState } from '../engine/types'
import { CardView } from './CardView'

interface Props {
  player: PlayerState
  active: boolean
  thinking?: boolean
  position: 'top' | 'left' | 'right' | 'human'
}

export function PlayerPanel({ player, active, thinking, position }: Props) {
  return (
    <section className={`player-panel pos-${position} ${active ? 'is-active' : ''}`}>
      <div className="player-id">
        <div>
          <strong>{player.name}</strong>
          <span className="kind">{player.kind === 'human' ? '你' : '電腦'}</span>
        </div>
        {active && <span className="turn-pill">{thinking ? '思考中…' : '行動中'}</span>}
      </div>
      <div className="player-stats">
        <span>🪙 {player.gold}</span>
        <span>★ {player.score} 分</span>
        <span>手牌 {player.hand.length}</span>
      </div>
      {position !== 'human' && (
        <div className="mini-backs" aria-hidden>
          {Array.from({ length: Math.min(player.hand.length, 8) }).map((_, i) => (
            <i key={i} className="mini-back" />
          ))}
        </div>
      )}
      <div className="completed-row">
        {player.completed.length === 0 ? (
          <span className="muted">尚未完成牌型</span>
        ) : (
          player.completed.map((c, i) => (
            <div key={`${c.yaku.id}-${i}`} className="completed-chip" title={c.yaku.label}>
              <span>{c.source === 'tsumo' ? 'できた' : 'もらった'}</span>
              <strong>{c.yaku.label}</strong>
              <em>+{c.yaku.totalScore}</em>
              <div className="mini-yaku">
                {c.yaku.cards.map((card) => (
                  <CardView key={card.id} card={card} size="mini" />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
