/* eslint-disable react-refresh/only-export-components -- testable geometry and coin motion helpers */
import type { PlayerState } from '../engine/types'
import { tablePosition, type TablePosition } from './seats'

interface Props {
  transfers: { fromId: string; toId: string; amount: number; paid?: number; systemTopUp?: number }[]
  players: PlayerState[]
  mySeat?: number
}

/** 飛幣數量跟實際扣款走；破產只扣 20 時不會再噴 7 顆大金幣。 */
export function flyingCoinCount(amount: number, paid?: number): number {
  const visual = paid ?? amount
  if (visual <= 0) return 0
  if (visual >= 400) return 7
  if (visual >= 120) return 5
  if (visual >= 40) return 3
  return 2
}

export interface ArrowGeometry {
  arrowAsset:
    | '/assets/ui/settlement-arrow-straight.svg'
    | '/assets/ui/settlement-arrow-curve.svg'
    | '/assets/ui/settlement-arrow-arc.svg'
    | '/assets/ui/settlement-arrow-outer-corner.svg'
    | '/assets/ui/settlement-arrow-side-corner.svg'
  arrowBox: {
    x: number
    y: number
    width: number
    height: number
    transform?: string
  }
  coinPath: string
}

export interface CoinMotionParams {
  delay: number
  duration: number
  scale: number
  wobble: number
  spin: number
  glow: number
}

export function settlementAssetUrl(asset: ArrowGeometry['arrowAsset'], baseUrl = import.meta.env.BASE_URL): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${asset.replace(/^\//, '')}`
}

/**
 * Short arrow artwork only identifies transfer direction. The independent
 * coin path always spans payer→winner through an outer corridor beside the island.
 */
export function getSettlementArrowGeom(from: TablePosition, to: TablePosition): ArrowGeometry | null {
  const key = `${from}->${to}`
  switch (key) {
    case 'top->human':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-straight.svg',
        arrowBox: { x: 470, y: 145, width: 60, height: 92 },
        coinPath: 'M 500,154 C 392,220 392,478 500,546',
      }
    case 'left->human':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-side-corner.svg',
        arrowBox: { x: 141, y: 459, width: 118, height: 124 },
        coinPath: 'M 286,350 C 296,468 365,526 456,548',
      }
    case 'right->human':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-side-corner.svg',
        arrowBox: { x: 721, y: 459, width: 118, height: 124, transform: 'translate(1560 0) scale(-1 1)' },
        coinPath: 'M 714,350 C 704,468 635,526 544,548',
      }

    case 'human->top':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-straight.svg',
        arrowBox: { x: 470, y: 463, width: 60, height: 92, transform: 'translate(0 1018) scale(1 -1)' },
        coinPath: 'M 500,546 C 608,478 608,220 500,154',
      }
    case 'left->top':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-side-corner.svg',
        arrowBox: { x: 141, y: 85, width: 118, height: 124, transform: 'translate(0 294) scale(1 -1)' },
        coinPath: 'M 286,350 C 296,232 365,174 456,152',
      }
    case 'right->top':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-side-corner.svg',
        arrowBox: { x: 721, y: 85, width: 118, height: 124, transform: 'translate(1560 294) scale(-1 -1)' },
        coinPath: 'M 714,350 C 704,232 635,174 544,152',
      }

    case 'top->left':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-outer-corner.svg',
        arrowBox: { x: 138, y: 88, width: 124, height: 118, transform: 'translate(400 0) scale(-1 1)' },
        coinPath: 'M 430,154 C 310,154 225,205 225,315',
      }
    case 'human->left':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-outer-corner.svg',
        arrowBox: { x: 138, y: 462, width: 124, height: 118, transform: 'translate(400 1042) scale(-1 -1)' },
        coinPath: 'M 430,546 C 310,546 225,495 225,385',
      }
    case 'right->left':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-arc.svg',
        arrowBox: { x: 300, y: 174, width: 400, height: 140 },
        coinPath: 'M 714,350 C 686,218 314,218 286,350',
      }

    case 'top->right':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-outer-corner.svg',
        arrowBox: { x: 718, y: 88, width: 124, height: 118 },
        coinPath: 'M 570,154 C 690,154 775,205 775,315',
      }
    case 'human->right':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-outer-corner.svg',
        arrowBox: { x: 718, y: 462, width: 124, height: 118, transform: 'translate(0 1042) scale(1 -1)' },
        coinPath: 'M 570,546 C 690,546 775,495 775,385',
      }
    case 'left->right':
      return {
        arrowAsset: '/assets/ui/settlement-arrow-arc.svg',
        arrowBox: { x: 300, y: 174, width: 400, height: 140, transform: 'translate(1000 0) scale(-1 1)' },
        coinPath: 'M 286,350 C 314,218 686,218 714,350',
      }

    default:
      return null
  }
}

/** Deterministic per-coin flight variation. No Math.random or engine RNG. */
export function getCoinMotionParams(index: number, amount: number): CoinMotionParams {
  const mix = (index * 13 + (amount % 11) * 7) % 24
  return {
    delay: 0.1 + index * 0.12 + (mix % 5) * 0.03,
    duration: 1.05 + (mix % 6) * 0.09 + (index % 2) * 0.05,
    scale: 1.28 + (index % 4) * 0.14 + (mix % 3) * 0.05,
    wobble: ((mix % 9) - 4) * 2.2,
    spin: 160 + index * 50 + (mix % 4) * 25,
    glow: 0.42 + (mix % 5) * 0.11,
  }
}

export function SettlementArrows({ transfers, players, mySeat = 0 }: Props) {
  if (!transfers || transfers.length === 0) return null

  const seatOf = (id: string) => players.find((p) => p.id === id)?.seat ?? 0

  return (
    <div className="settlement-arrows-layer" aria-hidden>
      <svg className="settlement-svg" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <filter id="settlement-coin-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.2" floodColor="rgba(0, 0, 0, 0.4)" />
            <feDropShadow dx="0" dy="0" stdDeviation="5.5" floodColor="rgba(255, 215, 0, 0.5)" />
          </filter>

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
            <stop offset="0%" stopColor="#fff7ae" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          <g id="flying-gold-coin" filter="url(#settlement-coin-glow)">
            <ellipse cx="0" cy="4.2" rx="26" ry="19.5" fill="#78350f" />
            <ellipse cx="0" cy="2.4" rx="26" ry="19.5" fill="#b45309" />
            <ellipse cx="0" cy="0" rx="26" ry="19.5" fill="url(#coin-edge-grad)" stroke="#fef9c3" strokeWidth="1.6" />
            <ellipse cx="0" cy="0" rx="19" ry="14.2" fill="url(#coin-face-grad)" stroke="#d97706" strokeWidth="1.1" />
            <ellipse cx="0" cy="0" rx="7" ry="5.2" fill="#fef08a" opacity="0.92" />
            <path d="M -5.4,0 L 5.4,0 M 0,-3.8 L 0,3.8" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
            <ellipse cx="-7" cy="-5.2" rx="6.2" ry="3.1" fill="#ffffff" opacity="0.72" />
          </g>
        </defs>

        {transfers.map((t) => {
          const fromPos = tablePosition(seatOf(t.fromId), mySeat)
          const toPos = tablePosition(seatOf(t.toId), mySeat)
          const geom = getSettlementArrowGeom(fromPos, toPos)
          if (!geom) return null

          const coinCount = flyingCoinCount(t.amount, t.paid)
          if (coinCount <= 0) return null

          return (
            <g
              key={`transfer-${t.fromId}-${t.toId}`}
              className="settlement-arrow-group"
              data-amount={t.amount}
              data-coin-count={coinCount}
            >
              <image
                className="settlement-arrow-art"
                href={settlementAssetUrl(geom.arrowAsset)}
                x={geom.arrowBox.x}
                y={geom.arrowBox.y}
                width={geom.arrowBox.width}
                height={geom.arrowBox.height}
                transform={geom.arrowBox.transform}
                preserveAspectRatio="xMidYMid meet"
              />

              {Array.from({ length: coinCount }).map((_, i) => {
                const motion = getCoinMotionParams(i, t.paid ?? t.amount)
                const flip = `${motion.scale} ${motion.scale}; 0.14 ${motion.scale}; ${motion.scale} ${motion.scale}; 0.2 ${motion.scale}; ${motion.scale} ${motion.scale}`
                const wobble = `0 0; ${motion.wobble} ${-motion.wobble * 0.28}; ${-motion.wobble} ${motion.wobble * 0.22}; 0 0`
                return (
                  <g
                    key={`coin-${i}`}
                    className="flying-coin-item"
                    data-coin-delay={motion.delay}
                    data-coin-duration={motion.duration}
                    data-coin-scale={motion.scale}
                    data-coin-wobble={motion.wobble}
                    data-coin-spin={motion.spin}
                    data-coin-glow={motion.glow}
                    opacity="0"
                  >
                    <g>
                      <circle
                        r="40"
                        fill="url(#coin-aura-grad)"
                        className="flying-coin-aura"
                        opacity={motion.glow}
                      />
                      <use href="#flying-gold-coin" />
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values={wobble}
                        keyTimes="0; 0.38; 0.72; 1"
                        dur={`${motion.duration}s`}
                        begin={`${motion.delay}s`}
                        repeatCount="1"
                        fill="freeze"
                        additive="sum"
                      />
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        values={`0; ${motion.spin}; ${motion.spin * 2}`}
                        keyTimes="0; 0.5; 1"
                        dur={`${motion.duration}s`}
                        begin={`${motion.delay}s`}
                        repeatCount="1"
                        fill="freeze"
                        additive="sum"
                      />
                      <animateTransform
                        attributeName="transform"
                        type="scale"
                        values={flip}
                        keyTimes="0; 0.22; 0.48; 0.74; 1"
                        dur={`${motion.duration}s`}
                        begin={`${motion.delay}s`}
                        repeatCount="1"
                        fill="freeze"
                        additive="sum"
                      />
                    </g>
                    <animateMotion
                      path={geom.coinPath}
                      dur={`${motion.duration}s`}
                      begin={`${motion.delay}s`}
                      repeatCount="1"
                      fill="freeze"
                      rotate="auto"
                      keyPoints="0;1"
                      keyTimes="0;1"
                    />
                    <animate
                      attributeName="opacity"
                      values="0; 0.95; 1; 1; 0"
                      keyTimes="0; 0.08; 0.45; 0.96; 1"
                      dur={`${motion.duration}s`}
                      begin={`${motion.delay}s`}
                      repeatCount="1"
                      fill="freeze"
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
