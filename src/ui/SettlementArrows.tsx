import type { PlayerState } from '../engine/types'
import { tablePosition, type TablePosition } from './seats'

interface Props {
  transfers: { fromId: string; toId: string; amount: number }[]
  players: PlayerState[]
}

/** 計算付款方到贏家之 SVG 1000×700 貝茲曲線與直線路徑 */
function getSettlementArrowPath(from: TablePosition, to: TablePosition): string {
  const key = `${from}->${to}`
  switch (key) {
    // 贏家在下方 (自家 - 最常見)
    case 'top->human':
      // 垂直向下直箭頭 (對照圖二、圖三)
      return 'M 500,165 L 500,285'
    case 'left->human':
      // 左側優雅向右下弧形箭頭
      return 'M 220,410 Q 240,560 360,595'
    case 'right->human':
      // 右側優雅向左下弧形箭頭
      return 'M 780,410 Q 760,560 640,595'

    // 贏家在上方
    case 'human->top':
      return 'M 500,535 L 500,415'
    case 'left->top':
      return 'M 220,290 Q 240,140 360,105'
    case 'right->top':
      return 'M 780,290 Q 760,140 640,105'

    // 贏家在左方
    case 'right->left':
      return 'M 740,350 L 615,350'
    case 'top->left':
      return 'M 410,120 Q 250,140 220,260'
    case 'human->left':
      return 'M 410,580 Q 250,560 220,440'

    // 贏家在右方
    case 'left->right':
      return 'M 260,350 L 385,350'
    case 'top->right':
      return 'M 590,120 Q 750,140 780,260'
    case 'human->right':
      return 'M 590,580 Q 750,560 780,440'

    default:
      return ''
  }
}

export function SettlementArrows({ transfers, players }: Props) {
  if (!transfers || transfers.length === 0) return null

  const seatOf = (id: string) => players.find((p) => p.id === id)?.seat ?? 0

  return (
    <div className="settlement-arrows-layer" aria-hidden>
      <svg className="settlement-svg" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <linearGradient id="settlement-arrow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff597b" />
            <stop offset="100%" stopColor="#e63946" />
          </linearGradient>
          <filter id="settlement-arrow-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0, 0, 0, 0.45)" />
          </filter>
          <marker
            id="settlement-red-arrowhead"
            viewBox="0 0 32 32"
            refX="22"
            refY="16"
            markerUnits="userSpaceOnUse"
            markerWidth="36"
            markerHeight="36"
            orient="auto"
          >
            <path
              d="M 4,4 L 28,16 L 4,28 Q 10,16 4,4 Z"
              fill="#e63946"
              stroke="#ff758f"
              strokeWidth="1.5"
            />
          </marker>
        </defs>

        {transfers.map((t) => {
          const fromPos = tablePosition(seatOf(t.fromId))
          const toPos = tablePosition(seatOf(t.toId))
          const path = getSettlementArrowPath(fromPos, toPos)
          if (!path) return null

          return (
            <path
              key={`${t.fromId}-${t.toId}`}
              className="settlement-arrow-path"
              d={path}
              fill="none"
              stroke="url(#settlement-arrow-grad)"
              strokeWidth="14"
              strokeLinecap="round"
              markerEnd="url(#settlement-red-arrowhead)"
              filter="url(#settlement-arrow-shadow)"
            />
          )
        })}
      </svg>
    </div>
  )
}
