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

const PLACE = ['', '1st', '2nd', '3rd', '4th']

export function SeatHud({
  player,
  place,
  goldDelta,
  active,
  thinking,
  discarder,
  claiming,
  position,
}: Props) {
  const initial = player.name.slice(0, 1)
  const className = [
    'seat-hud',
    `pos-${position}`,
    active ? 'is-active' : '',
    discarder ? 'is-discarder' : '',
    claiming ? 'is-claiming' : '',
  ]
    .filter(Boolean)
    .join(' ')

  let pill: string | null = null
  if (claiming) pill = thinking ? '考慮抄牌…' : '要抄這張'
  else if (discarder) pill = '剛丟出'
  else if (active) pill = thinking ? '思考中…' : '輪到出牌'

  return (
    <section className={className}>
      <div className={`seat-place place-${place}`}>{PLACE[place] ?? place}</div>
      <div className="seat-avatar" aria-hidden>
        {initial}
      </div>
      <div className="seat-meta">
        <strong>{player.name}</strong>
        {position === 'human' ? <span className="kind">你</span> : null}
        {pill ? <span className="turn-pill">{pill}</span> : null}
        <div className="seat-gold">
          <span>金 {player.gold}</span>
          {goldDelta !== undefined && goldDelta !== 0 && (
            <em className={goldDelta > 0 ? 'delta-up' : 'delta-down'}>
              {goldDelta > 0 ? `＋${goldDelta}` : goldDelta}
            </em>
          )}
        </div>
      </div>
    </section>
  )
}
