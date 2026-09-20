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
      // 從上方銘牌外緣下方起跑，保留面板與箭頭之間的呼吸空間。
      return {
        stemPath: 'M 500,152 L 500,216',
        headPoints: '484,216 516,216 500,244',
        coinPath: 'M 500,152 L 500,244',
      }
    case 'left->human':
      // 從左側銘牌右下外緣出發，沿外側走廊弧入下方銘牌上方。
      return {
        stemPath: 'M 286,414 Q 306,508 365,536',
        headPoints: '356,523 374,549 395,537',
        coinPath: 'M 286,414 Q 306,508 395,537',
      }
    case 'right->human':
      // 右側鏡像走外側走廊，不壓到玩家銘牌。
      return {
        stemPath: 'M 714,414 Q 694,508 635,536',
        headPoints: '644,523 626,549 605,537',
        coinPath: 'M 714,414 Q 694,508 605,537',
      }

    // ==========================================
    // 贏家在上方 (對家 top)
    // ==========================================
    case 'human->top':
      // 自家銘牌上方的直向導流，起點不覆蓋銘牌。
      return {
        stemPath: 'M 500,548 L 500,484',
        headPoints: '484,484 516,484 500,456',
        coinPath: 'M 500,548 L 500,456',
      }
    case 'left->top':
      // 左上外側走廊，兩端皆停在銘牌外。
      return {
        stemPath: 'M 286,286 Q 306,192 365,164',
        headPoints: '356,177 374,151 395,163',
        coinPath: 'M 286,286 Q 306,192 395,163',
      }
    case 'right->top':
      // 右上外側走廊鏡像。
      return {
        stemPath: 'M 714,286 Q 694,192 635,164',
        headPoints: '644,177 626,151 605,163',
        coinPath: 'M 714,286 Q 694,192 605,163',
      }

    // ==========================================
    // 贏家在左方 (left)
    // ==========================================
    case 'top->left':
      // 上方至左側的短外弧，避開雙方銘牌本體。
      return {
        stemPath: 'M 365,160 Q 306,190 286,274',
        headPoints: '274,266 298,282 278,305',
        coinPath: 'M 365,160 Q 306,190 278,305',
      }
    case 'human->left':
      // 下方至左側的短外弧。
      return {
        stemPath: 'M 365,540 Q 306,510 286,426',
        headPoints: '274,434 298,418 278,395',
        coinPath: 'M 365,540 Q 306,510 278,395',
      }
    case 'right->left':
      // 橫向讓渡改走上方弧廊，避免穿過中央展示與左右銘牌。
      return {
        stemPath: 'M 714,286 C 646,210 354,210 306,286',
        headPoints: '307,269 326,293 278,305',
        coinPath: 'M 714,286 C 646,210 354,210 278,305',
      }

    // ==========================================
    // 贏家在右方 (right)
    // ==========================================
    case 'top->right':
      // 上方至右側的短外弧。
      return {
        stemPath: 'M 635,160 Q 694,190 714,274',
        headPoints: '726,266 702,282 722,305',
        coinPath: 'M 635,160 Q 694,190 722,305',
      }
    case 'human->right':
      // 下方至右側的短外弧。
      return {
        stemPath: 'M 635,540 Q 694,510 714,426',
        headPoints: '726,434 702,418 722,395',
        coinPath: 'M 635,540 Q 694,510 722,395',
      }
    case 'left->right':
      // 左右互換時同樣走上方弧廊。
      return {
        stemPath: 'M 286,286 C 354,210 646,210 694,286',
        headPoints: '693,269 674,293 722,305',
        coinPath: 'M 286,286 C 354,210 646,210 722,305',
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

          <radialGradient id="coin-aura-grad">
            <stop offset="0%" stopColor="#fff7ae" stopOpacity="0.8" />
            <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

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

          const coinCount = t.amount >= 400 ? 7 : 5
          const streamDuration = 1.28

          return (
            <g
              key={`transfer-${t.fromId}-${t.toId}`}
              className="settlement-arrow-group"
              data-amount={t.amount}
              data-coin-count={coinCount}
            >
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
                const delay = 0.18 + i * 0.13
                return (
                  <g key={`coin-${i}`} className="flying-coin-item" opacity="0">
                    <circle r="23" fill="url(#coin-aura-grad)" className="flying-coin-aura" />
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
