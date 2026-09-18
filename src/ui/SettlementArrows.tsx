import type { PlayerState } from '../engine/types'
import { tablePosition, type TablePosition } from './seats'

interface Props {
  transfers: { fromId: string; toId: string; amount: number }[]
  players: PlayerState[]
  mySeat?: number
}

/** 計算付款方到贏家之 SVG 1000×700 貝茲曲線路徑（全數繞行開闊綠呢桌面，避開中央卡牌） */
function getSettlementArrowPath(from: TablePosition, to: TablePosition): string {
  const key = `${from}->${to}`
  switch (key) {
    // 贏家在下方 (自家)
    case 'top->human':
      // 對家放槍給自家：自上方開闊左側大弧度橫跨直指自家
      return 'M 440,110 Q 230,350 440,590'
    case 'left->human':
      // 左側向右下弧形指向自家
      return 'M 220,390 Q 280,540 430,595'
    case 'right->human':
      // 右側向左下弧形指向自家
      return 'M 780,390 Q 720,540 570,595'

    // 贏家在上方 (對家)
    case 'human->top':
      // 自家放槍給對家：自自家左側大弧度向上直指對家
      return 'M 440,590 Q 230,350 440,110'
    case 'left->top':
      // 左側向右上弧形指向對家
      return 'M 220,290 Q 280,160 430,115'
    case 'right->top':
      // 右側向左上弧形指向對家
      return 'M 780,290 Q 720,160 570,115'

    // 贏家在左方
    case 'right->left':
      // 右側對家放槍給左側（如圖二）：自上方開闊區橫跨指向左側贏家
      return 'M 780,280 Q 500,135 220,280'
    case 'top->left':
      // 上方流暢弧向左側贏家
      return 'M 430,115 Q 280,160 220,290'
    case 'human->left':
      // 自家弧向左側贏家
      return 'M 430,595 Q 280,540 220,390'

    // 贏家在右方
    case 'left->right':
      // 左側對家放槍給右側：自上方開闊區橫跨指向右側贏家
      return 'M 220,280 Q 500,135 780,280'
    case 'top->right':
      // 上方流暢弧向右側贏家
      return 'M 570,115 Q 720,160 780,290'
    case 'human->right':
      // 自家弧向右側贏家
      return 'M 570,590 Q 720,540 780,390'

    default:
      return ''
  }
}

export function SettlementArrows({ transfers, players, mySeat = 0 }: Props) {
  if (!transfers || transfers.length === 0) return null

  const seatOf = (id: string) => players.find((p) => p.id === id)?.seat ?? 0

  return (
    <div className="settlement-arrows-layer" aria-hidden>
      <svg className="settlement-svg" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <linearGradient id="settlement-arrow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4d6d" />
            <stop offset="100%" stopColor="#e60039" />
          </linearGradient>
          <filter id="settlement-arrow-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0, 0, 0, 0.6)" />
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(255, 0, 64, 0.4)" />
          </filter>
          <marker
            id="settlement-red-arrowhead"
            viewBox="0 0 32 32"
            refX="22"
            refY="16"
            markerUnits="userSpaceOnUse"
            markerWidth="34"
            markerHeight="34"
            orient="auto"
          >
            <path
              d="M 4,4 L 28,16 L 4,28 Q 11,16 4,4 Z"
              fill="#e60039"
              stroke="#ffffff"
              strokeWidth="1.8"
            />
          </marker>
          {/* 金幣立體陰影與發光濾鏡 */}
          <filter id="settlement-coin-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="rgba(0, 0, 0, 0.45)" />
            <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="rgba(255, 215, 0, 0.55)" />
          </filter>

          {/* 金幣金屬漸層 */}
          <linearGradient id="coin-edge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="35%" stopColor="#fde047" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          <linearGradient id="coin-face-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* 3D 傾斜金幣物件（參照圖二） */}
          <g id="flying-gold-coin" filter="url(#settlement-coin-glow)">
            <ellipse cx="0" cy="2.5" rx="15" ry="11.5" fill="#78350f" />
            <ellipse cx="0" cy="1.5" rx="15" ry="11.5" fill="#b45309" />
            <ellipse cx="0" cy="0" rx="15" ry="11.5" fill="url(#coin-edge-grad)" stroke="#fef9c3" strokeWidth="1.2" />
            <ellipse cx="0" cy="0" rx="11" ry="8.2" fill="url(#coin-face-grad)" stroke="#d97706" strokeWidth="0.8" />
            <ellipse cx="0" cy="0" rx="4" ry="3" fill="#fef08a" opacity="0.9" />
            <path d="M -3.2,0 L 3.2,0 M 0,-2.2 L 0,2.2" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
            <ellipse cx="-4" cy="-3" rx="3.5" ry="1.8" fill="#ffffff" opacity="0.75" />
          </g>
        </defs>

        {transfers.map((t) => {
          const fromPos = tablePosition(seatOf(t.fromId), mySeat)
          const toPos = tablePosition(seatOf(t.toId), mySeat)
          const path = getSettlementArrowPath(fromPos, toPos)
          if (!path) return null

          const coinCount = 5
          const streamDuration = 1.15

          return (
            <g key={`transfer-${t.fromId}-${t.toId}`}>
              {/* 1. 底層紅光箭頭路徑 */}
              <path
                className="settlement-arrow-path"
                d={path}
                fill="none"
                stroke="url(#settlement-arrow-grad)"
                strokeWidth="12"
                strokeLinecap="round"
                markerEnd="url(#settlement-red-arrowhead)"
                filter="url(#settlement-arrow-shadow)"
              />

              {/* 2. 沿著箭頭軌跡飛舞的金幣串（參照圖二：由放槍方飛入和牌贏家） */}
              {Array.from({ length: coinCount }).map((_, i) => {
                const delay = 0.15 + i * 0.15
                return (
                  <g key={`coin-${i}`} className="flying-coin-item" opacity="0">
                    <use href="#flying-gold-coin" />
                    <animateMotion
                      path={path}
                      dur={`${streamDuration}s`}
                      begin={`${delay}s`}
                      repeatCount="1"
                      fill="freeze"
                      rotate="auto"
                      keyPoints="0;1"
                      keyTimes="0;1"
                    />
                    <animate
                      attributeName="opacity"
                      values="0; 0.95; 1; 1; 0"
                      keyTimes="0; 0.12; 0.5; 0.88; 1"
                      dur={`${streamDuration}s`}
                      begin={`${delay}s`}
                      repeatCount="1"
                      fill="freeze"
                    />
                    <animateTransform
                      attributeName="transform"
                      type="scale"
                      values="0.75; 1.08; 1; 0.8"
                      keyTimes="0; 0.2; 0.8; 1"
                      dur={`${streamDuration}s`}
                      begin={`${delay}s`}
                      repeatCount="1"
                      fill="freeze"
                      additive="sum"
                    />
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
