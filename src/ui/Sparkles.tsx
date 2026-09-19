import React from 'react'

/** 單顆四角星芒 (✨) */
export function SparkleStar({
  size = 24,
  color = '#ffffff',
  className = '',
  style,
}: {
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={`sparkle-star ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M 20,4 Q 20,20 4,20 Q 20,20 20,36 Q 20,20 36,20 Q 20,20 20,4 Z"
        fill={color}
      />
    </svg>
  )
}

/** 參照截圖：放槍牌上方與 POKA JAN 標題旁的四角星芒群 (Sparkle Cluster) */
export function SparkleCluster({
  className = '',
  scale = 1,
}: {
  className?: string
  scale?: number
}) {
  return (
    <div
      className={`sparkle-cluster ${className}`}
      style={{ transform: `scale(${scale})` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="sparkle-cluster-svg">
        <defs>
          <filter id="sparkle-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 中心亮藍光暈 */}
        <circle cx="50" cy="50" r="22" fill="#38bdf8" opacity="0.35" className="sparkle-glow-pulse" />

        {/* 主星芒：白光大四角星 */}
        <path
          d="M 50,14 Q 50,50 14,50 Q 50,50 50,86 Q 50,50 86,50 Q 50,50 50,14 Z"
          fill="#ffffff"
          filter="url(#sparkle-glow-filter)"
          className="cluster-star star-main"
        />

        {/* 左上次星芒：淡青色 */}
        <path
          d="M 26,22 Q 26,38 10,38 Q 26,38 26,54 Q 26,38 42,38 Q 26,38 26,22 Z"
          fill="#a5f3fc"
          className="cluster-star star-sub-1"
        />

        {/* 右上次星芒：亮青色 */}
        <path
          d="M 76,26 Q 76,40 62,40 Q 76,40 76,54 Q 76,40 90,40 Q 76,40 76,26 Z"
          fill="#67e8f9"
          className="cluster-star star-sub-2"
        />

        {/* 右下次星芒：金白高光 */}
        <path
          d="M 74,70 Q 74,80 64,80 Q 74,80 74,90 Q 74,80 84,80 Q 74,80 74,70 Z"
          fill="#ffffff"
          className="cluster-star star-sub-3"
        />
      </svg>
    </div>
  )
}
