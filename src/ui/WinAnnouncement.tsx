import type { TablePosition } from './seats'
import { SparkleCluster, SparkleStar } from './Sparkles'

interface Props {
  winnerPos: TablePosition
  stage: 'idle' | 'gun' | 'cutin' | 'settlement'
}

/**
 * 巨大的立體漫畫藝術字「KANA JAN!」
 * - 斜向微翹姿態 (italic skew)
 * - 亮白與淡藍漸層正面
 * - 厚實的深紫色立體擠出層 (3D extrusion)
 * - 鮮天藍外框光暈
 */
function KanaJanTitle() {
  const cx = 220
  const y1 = 80
  const y2 = 168

  return (
    <div className="kanajan-3d-title-wrap" aria-label="KANA JAN!">
      <svg viewBox="0 0 440 195" className="kanajan-3d-title-svg">
        <defs>
          {/* 3D 陰影投影層漸層 */}
          <linearGradient id="kana-3d-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>

          {/* 正面字體亮面漸層 (白至天藍高光) */}
          <linearGradient id="kana-face-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>

          {/* 文字立體外發光 */}
          <filter id="kana-title-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#38bdf8" floodOpacity="0.85" />
          </filter>
        </defs>

        <g className="kanajan-text-group" filter="url(#kana-title-glow)">
          {/* 1. 最底層深紫厚立體層 (以直下垂直位移模擬端正飽滿的 3D 立體擠出層，不歪斜) */}
          {Array.from({ length: 11 }).map((_, i) => (
            <g key={`shadow-${i}`}>
              <text
                x={cx}
                y={y1 + i * 1.3}
                textAnchor="middle"
                className="kanajan-svg-text text-extrusion"
                fill="url(#kana-3d-shadow)"
                stroke="#581c87"
                strokeWidth="6"
                strokeLinejoin="round"
              >
                KANA
              </text>
              <text
                x={cx}
                y={y2 + i * 1.3}
                textAnchor="middle"
                className="kanajan-svg-text text-extrusion"
                fill="url(#kana-3d-shadow)"
                stroke="#581c87"
                strokeWidth="6"
                strokeLinejoin="round"
              >
                JAN!
              </text>
            </g>
          ))}

          {/* 2. 亮天藍色粗外描邊層 */}
          <text
            x={cx}
            y={y1}
            textAnchor="middle"
            className="kanajan-svg-text"
            fill="none"
            stroke="#0284c7"
            strokeWidth="14"
            strokeLinejoin="round"
          >
            KANA
          </text>
          <text
            x={cx}
            y={y2}
            textAnchor="middle"
            className="kanajan-svg-text"
            fill="none"
            stroke="#0284c7"
            strokeWidth="14"
            strokeLinejoin="round"
          >
            JAN!
          </text>

          {/* 3. 亮白色中層描邊 */}
          <text
            x={cx}
            y={y1}
            textAnchor="middle"
            className="kanajan-svg-text"
            fill="none"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinejoin="round"
          >
            KANA
          </text>
          <text
            x={cx}
            y={y2}
            textAnchor="middle"
            className="kanajan-svg-text"
            fill="none"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinejoin="round"
          >
            JAN!
          </text>

          {/* 4. 亮麗頂層漸層面字 */}
          <text
            x={cx}
            y={y1}
            textAnchor="middle"
            className="kanajan-svg-text text-face"
            fill="url(#kana-face-grad)"
          >
            KANA
          </text>
          <text
            x={cx}
            y={y2}
            textAnchor="middle"
            className="kanajan-svg-text text-face"
            fill="url(#kana-face-grad)"
          >
            JAN!
          </text>
        </g>
      </svg>
    </div>
  )
}

/**
 * 和牌宣告動畫：
 * 僅保留端正飽滿的「KANA JAN!」藝術字，並以密集且平均的星芒群緊貼環繞四周。
 */
export function WinAnnouncement({
  winnerPos,
  stage,
}: Props) {
  if (stage === 'idle' || stage === 'settlement') return null

  const isCutinVisible = stage === 'cutin'

  return (
    <div
      className={`win-announcement-overlay pos-${winnerPos} ${isCutinVisible ? 'is-visible' : 'is-preparing'}`}
      aria-live="assertive"
      aria-label="KANA JAN! 和牌宣告"
    >
      {/* 聚光暗角微遮罩 */}
      <div className="announcement-backdrop" aria-hidden="true" />

      {/* 宣告主體（端正立體、密集且平均分佈的星芒粒子環繞） */}
      <div className="announcement-cutin-box frameless">
        <KanaJanTitle />

        {/* 六點式緊湊星芒：集中在字標輪廓，不向桌面四周散開 */}
        <SparkleCluster className="cutin-star accent-top-left" scale={0.78} />
        <SparkleStar size={24} color="#fef08a" className="cutin-star accent-top-right" />
        <SparkleStar size={20} color="#ffffff" className="cutin-star accent-mid-left" />
        <SparkleStar size={22} color="#67e8f9" className="cutin-star accent-mid-right" />
        <SparkleStar size={24} color="#fef08a" className="cutin-star accent-bottom-left" />
        <SparkleCluster className="cutin-star accent-bottom-right" scale={0.74} />
      </div>
    </div>
  )
}
