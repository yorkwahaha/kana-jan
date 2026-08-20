import type { GoldTransfer } from '../engine/scoring'
import type { PlayerState } from '../engine/types'
import { TABLE_POINTS, tablePosition } from './seats'

interface Props {
  transfers: GoldTransfer[]
  players: PlayerState[]
}

export function TransferFlights({ transfers, players }: Props) {
  if (transfers.length === 0) return null
  const seatOf = (id: string) => players.find((p) => p.id === id)?.seat ?? 0

  return (
    <div className="transfer-layer" aria-hidden>
      <svg className="transfer-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="gold-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="#ffe082" />
          </marker>
        </defs>
        {transfers.map((t) => {
          const from = TABLE_POINTS[tablePosition(seatOf(t.fromId))]
          const to = TABLE_POINTS[tablePosition(seatOf(t.toId))]
          return (
            <line
              key={`${t.fromId}-${t.toId}`}
              className="transfer-line"
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              markerEnd="url(#gold-arrow)"
            />
          )
        })}
      </svg>
    </div>
  )
}
