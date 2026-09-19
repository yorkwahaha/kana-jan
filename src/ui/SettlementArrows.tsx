import type { PlayerState } from '../engine/types'
import { tablePosition, type TablePosition } from './seats'

interface Props {
  transfers: { fromId: string; toId: string; amount: number }[]
  players: PlayerState[]
  mySeat?: number
}

interface ArrowGeometry {
  stemPath: string
  headPoints: string
  coinPath: string
}

/**
 * 參照圖三精密幾何：
 * 1. 側向放槍：走在外圍桌角開闊走廊的優美弧形實體帶狀箭頭，絕對不遮擋中央成牌展示區。
 * 2. 對家放槍：位於失分方銘牌邊緣的鮮明直箭頭，指向贏家方向，長度適中絕不碰觸中央牌面。
 */
function getSettlementArrowGeom(from: TablePosition, to: TablePosition): ArrowGeometry | null {
  const key = `${from}->${to}`
  switch (key) {
    // ==========================================
    // 贏家在下方 (自家 human) - 完美參照圖三
    // ==========================================
    case 'top->human':
      // 對家直向下箭頭：上方銘牌底部直直向下指，絕不碰觸中央牌面 (停於 y=206，在牌型標題上方)
      return {
        stemPath: 'M 500,118 L 500,175',
        headPoints: '482,175 518,175 500,206',
        coinPath: 'M 500,118 L 500,206',
      }
    case 'left->human':
      // 左側向右下優美弧線：沿左下方開闊走廊弧入下方銘牌左上
      return {
        stemPath: 'M 240,415 Q 270,525 345,545',
        headPoints: '338,531 352,559 375,553',
        coinPath: 'M 240,415 Q 270,525 375,553',
      }
    case 'right->human':
      // 右側向左下優美弧線：沿右下方開闊走廊弧入下方銘牌右上
      return {
        stemPath: 'M 760,415 Q 730,525 655,545',
        headPoints: '662,531 648,559 625,553',
        coinPath: 'M 760,415 Q 730,525 625,553',
      }

    // ==========================================
    // 贏家在上方 (對家 top)
    // ==========================================
    case 'human->top':
      // 自家直向上箭頭：下方銘牌頂部直直向上指，絕不碰觸中央牌面
      return {
        stemPath: 'M 500,575 L 500,518',
        headPoints: '482,518 518,518 500,487',
        coinPath: 'M 500,575 L 500,487',
      }
    case 'left->top':
      // 左側向右上優美弧線：沿左上方開闊走廊弧入上方銘牌左下
      return {
        stemPath: 'M 240,275 Q 270,165 345,145',
        headPoints: '338,159 352,131 375,137',
        coinPath: 'M 240,275 Q 270,165 375,137',
      }
    case 'right->top':
      // 右側向左上優美弧線：沿右上方開闊走廊弧入上方銘牌右下
      return {
        stemPath: 'M 760,275 Q 730,165 655,145',
        headPoints: '662,159 648,131 625,137',
        coinPath: 'M 760,275 Q 730,165 625,137',
      }

    // ==========================================
    // 贏家在左方 (left)
    // ==========================================
    case 'top->left':
      // 上方流暢弧向左側贏家頂部
      return {
        stemPath: 'M 360,135 Q 270,165 245,255',
        headPoints: '231,248 259,262 238,285',
        coinPath: 'M 360,135 Q 270,165 238,285',
      }
    case 'human->left':
      // 自家流暢弧向左側贏家底部
      return {
        stemPath: 'M 360,555 Q 270,525 245,435',
        headPoints: '231,442 259,428 238,405',
        coinPath: 'M 360,555 Q 270,525 238,405',
      }
    case 'right->left':
      // 右側對家直向左箭頭：在右側銘牌左側向左水平直指，不穿透中央
      return {
        stemPath: 'M 735,335 L 675,335',
        headPoints: '675,317 675,353 647,335',
        coinPath: 'M 735,335 L 647,335',
      }

    // ==========================================
    // 贏家在右方 (right)
    // ==========================================
    case 'top->right':
      // 上方流暢弧向右側贏家頂部
      return {
        stemPath: 'M 640,135 Q 730,165 755,255',
        headPoints: '769,248 741,262 762,285',
        coinPath: 'M 640,135 Q 730,165 762,285',
      }
    case 'human->right':
      // 自家流暢弧向右側贏家底部
      return {
        stemPath: 'M 640,555 Q 730,525 755,435',
        headPoints: '769,442 741,428 762,405',
        coinPath: 'M 640,555 Q 730,525 762,405',
      }
    case 'left->right':
      // 左側對家直向右箭頭：在左側銘牌右側向右水平直指，不穿透中央
      return {
        stemPath: 'M 265,335 L 325,335',
        headPoints: '325,317 325,353 353,335',
        coinPath: 'M 265,335 L 353,335',
      }

    default:
      return null
  }
}

export function SettlementArrows({ transfers, players, mySeat = 0 }: Props) {
  if (!transfers || transfers.length === 0) return null

  const seatOf = (id: string) => players.find((p) => p.id === id)?.seat ?? 0

  return (
    <div className="settlement-arrows-layer" aria-hidden>
      <svg className="settlement-svg" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          {/* 紅色立體漸層 (參照圖三：亮珊瑚粉紅至正紅、深紅) */}
          <linearGradient id="settlement-arrow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b8b" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          {/* 柔和立體投影 */}
          <filter id="settlement-arrow-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0, 0, 0, 0.45)" />
          </filter>

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

          {/* 3D 傾斜金幣物件 */}
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
          const geom = getSettlementArrowGeom(fromPos, toPos)
          if (!geom) return null

          const coinCount = 4
          const streamDuration = 1.15

          return (
            <g key={`transfer-${t.fromId}-${t.toId}`} className="settlement-arrow-group">
              {/* 1. 立體帶狀紅箭頭（參照圖三：白色粗邊框 + 紅色飽滿主管道 + 箭頭三角形） */}
              <g filter="url(#settlement-arrow-shadow)">
                {/* 1.1 管道底層純白厚描邊 */}
                <path
                  d={geom.stemPath}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                {/* 1.2 管道內層鮮紅主漸層 */}
                <path
                  d={geom.stemPath}
                  fill="none"
                  stroke="url(#settlement-arrow-grad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* 1.3 箭頭三角尖端（純白描邊 + 鮮紅漸層填充） */}
                <polygon
                  points={geom.headPoints}
                  fill="url(#settlement-arrow-grad)"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </g>

              {/* 2. 沿著箭頭軌跡飛舞的金幣串（由失分方沿外圍走廊飛入贏家，不遮擋中央） */}
              {Array.from({ length: coinCount }).map((_, i) => {
                const delay = 0.2 + i * 0.16
                return (
                  <g key={`coin-${i}`} className="flying-coin-item" opacity="0">
                    <use href="#flying-gold-coin" />
                    <animateMotion
                      path={geom.coinPath}
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
