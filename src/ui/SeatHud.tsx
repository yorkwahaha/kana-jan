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

const PLACE_BADGES = ['', '🥇 1st', '🥈 2nd', '🥉 3rd', '4th']

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

  return (
    <section className={className}>
      <div className="seat-hud-row seat-hud-row-top">
        <strong className="seat-name">{player.name}</strong>
        {position === 'human' ? <span className="kind">你</span> : null}
        <span className={`seat-place place-${place}`}>{PLACE_BADGES[place] ?? `${place}th`}</span>
      </div>
      <div className="seat-hud-row seat-hud-row-bottom">
        <span className="chip-badge">點數 {player.gold}</span>
        {goldDelta !== undefined && goldDelta !== 0 && (
          <em className={goldDelta > 0 ? 'delta-up' : 'delta-down'}>
            {goldDelta > 0 ? `＋${goldDelta}` : goldDelta}
          </em>
        )}
      </div>
    </section>
  )
}
