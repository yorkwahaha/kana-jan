import type { PlayerState } from '../engine/types'
import type { TablePosition } from './seats'

interface Props {
  player: PlayerState
  place: number
  goldDelta?: number
  active?: boolean
  thinking?: boolean
  discarder?: boolean
  claiming?: boolean
  position: TablePosition
}

const PLACE_LABELS = ['', '1st', '2nd', '3rd', '4th']

export function SeatHud({
  player,
  place,
  goldDelta,
  active,
  discarder,
  claiming,
  position,
}: Props) {
  const className = [
    'seat-hud',
    `pos-${position}`,
    active ? 'is-active' : '',
    discarder ? 'is-discarder' : '',
    claiming ? 'is-claiming' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const initial = player.name.trim().slice(0, 1) || '?'

  return (
    <section className={className}>
      <div className="seat-avatar" aria-hidden>
        {initial}
      </div>
      <div className="seat-hud-body">
        <div className="seat-hud-head">
          <span className={`seat-place place-${place}`}>{PLACE_LABELS[place] ?? `${place}th`}</span>
          {position === 'human' ? <span className="kind">你</span> : null}
          {active && position !== 'human' ? <span className="active-turn-tag">思考中</span> : null}
        </div>
        <strong className="seat-name">{player.name}</strong>
        <span className="chip-badge">{player.gold}</span>
        {goldDelta !== undefined && goldDelta !== 0 && (
          <em className={goldDelta > 0 ? 'delta-up' : 'delta-down'}>
            {goldDelta > 0 ? `＋${goldDelta}` : goldDelta}
          </em>
        )}
      </div>
    </section>
  )
}
