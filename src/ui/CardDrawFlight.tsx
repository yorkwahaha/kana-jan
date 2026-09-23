import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KanaCard } from '../data/cards'
import type { GameState } from '../engine/types'
import { CardView } from './CardView'
import { tablePosition, type TablePosition } from './seats'
import type { Settings } from './settings'

interface Props {
  state: GameState
  settings: Settings
  mySeat?: number
}

interface ActiveFlight {
  id: number
  pos: TablePosition
  card: KanaCard | null
  startX: number
  startY: number
  endX: number
  endY: number
  duration: number
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function CardDrawFlight({ state, settings, mySeat = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const flightRef = useRef<HTMLDivElement>(null)
  const [activeFlight, setActiveFlight] = useState<ActiveFlight | null>(null)
  const lastHandledSeqRef = useRef<number>(-1)

  // 監聽抽牌事件（依據 state.eventSeq 與 state.lastFx === 'draw'）
  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (state.eventSeq === lastHandledSeqRef.current) return
    lastHandledSeqRef.current = state.eventSeq

    // A real draw presentation must have an actual drawn-card id. Turn-boundary
    // events may advance eventSeq but must never replay a stale draw animation.
    if (state.lastFx !== 'draw' || !state.lastDrawnCardId) {
      setActiveFlight(null)
      return
    }

    if (settings.animation === 'off') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const container = containerRef.current?.closest('.felt-oval')
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const width = containerRect.width || 1000
    const height = containerRect.height || 700

    const drawer = state.players[state.currentPlayerIndex]
    const drawerPos = tablePosition(drawer?.seat ?? 0, mySeat)
    const drawnCard = drawer?.hand.find((c) => c.id === state.lastDrawnCardId) ?? null

    // 1. 起點：牌池中心牌堆 (.deck-pile)
    let startX = width * 0.44
    let startY = height * 0.48
    const deckEl = container.querySelector('.deck-pile')
    if (deckEl) {
      const r = deckEl.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        startX = r.left + r.width / 2 - containerRect.left
        startY = r.top + r.height / 2 - containerRect.top
      }
    }

    // 2. 終點：抽牌玩家手牌位置
    let endX = width * 0.5
    let endY = height * 0.5

    if (drawerPos === 'human') {
      endX = width * 0.58
      endY = height * 0.9
      const slotEl =
        container.querySelector('.human-hand-area .hand-card-slot.is-drawn-slot') ??
        container.querySelector('.human-hand-area')
      if (slotEl) {
        const r = slotEl.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          endX = r.left + r.width / 2 - containerRect.left
          endY = r.top + r.height / 2 - containerRect.top
        }
      }
    } else if (drawerPos === 'top') {
      endX = width * 0.5
      endY = height * 0.08
      const fanEl = container.querySelector('.hand-fan.pos-top')
      if (fanEl) {
        const r = fanEl.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          endX = r.left + r.width * 0.75 - containerRect.left
          endY = r.top + r.height / 2 - containerRect.top
        }
      }
    } else if (drawerPos === 'left') {
      endX = width * 0.06
      endY = height * 0.38
      const fanEl = container.querySelector('.hand-fan.pos-left')
      if (fanEl) {
        const r = fanEl.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          endX = r.left + r.width / 2 - containerRect.left
          endY = r.top + r.height * 0.82 - containerRect.top
        }
      }
    } else if (drawerPos === 'right') {
      endX = width * 0.94
      endY = height * 0.38
      const fanEl = container.querySelector('.hand-fan.pos-right')
      if (fanEl) {
        const r = fanEl.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          endX = r.left + r.width / 2 - containerRect.left
          endY = r.top + r.height * 0.82 - containerRect.top
        }
      }
    }

    const duration = settings.animation === 'fast' ? 280 : 420
    setActiveFlight({
      id: state.eventSeq,
      pos: drawerPos,
      card: drawnCard,
      startX,
      startY,
      endX,
      endY,
      duration,
    })
  }, [state.eventSeq, state.lastFx, state.lastDrawnCardId, state.currentPlayerIndex, settings.animation, mySeat])

  // 驅動 3D 拋物線飛行與金色光影動畫
  useIsomorphicLayoutEffect(() => {
    const cardEl = flightRef.current
    if (!cardEl || !activeFlight) return

    if (typeof cardEl.animate !== 'function') {
      const timer = window.setTimeout(() => setActiveFlight(null), activeFlight.duration)
      return () => window.clearTimeout(timer)
    }

    const dx = activeFlight.endX - activeFlight.startX
    const dy = activeFlight.endY - activeFlight.startY
    const dist = Math.hypot(dx, dy)
    // 弧度抬升高度（根據飛行距離在 26px ~ 55px 之間自適應）
    const arcHeight = Math.min(55, Math.max(26, dist * 0.14))
    const midX = (activeFlight.startX + activeFlight.endX) / 2
    const midY = (activeFlight.startY + activeFlight.endY) / 2 - arcHeight

    const startRot = 0
    const midRot =
      activeFlight.pos === 'left' ? -14 : activeFlight.pos === 'right' ? 14 : activeFlight.pos === 'human' ? 4 : -5
    const endRot = activeFlight.pos === 'left' ? -8 : activeFlight.pos === 'right' ? 8 : 0
    const endScale = activeFlight.pos === 'human' ? 1.0 : 0.74

    const anim = cardEl.animate(
      [
        {
          transform: `translate(${activeFlight.startX}px, ${activeFlight.startY}px) scale(0.85) rotate(${startRot}deg)`,
          opacity: 0.9,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
          offset: 0,
        },
        {
          transform: `translate(${midX}px, ${midY}px) scale(1.18) rotate(${midRot}deg)`,
          opacity: 1,
          boxShadow: '0 20px 42px rgba(0, 0, 0, 0.52), 0 0 24px rgba(251, 191, 36, 0.85)',
          offset: 0.5,
        },
        {
          transform: `translate(${activeFlight.endX}px, ${activeFlight.endY}px) scale(${endScale * 1.03}) rotate(${endRot}deg)`,
          opacity: 1,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
          offset: 0.85,
        },
        {
          transform: `translate(${activeFlight.endX}px, ${activeFlight.endY}px) scale(${endScale}) rotate(${endRot}deg)`,
          opacity: 0,
          boxShadow: 'none',
          offset: 1,
        },
      ],
      {
        duration: activeFlight.duration,
        easing: 'cubic-bezier(0.2, 0.85, 0.25, 1)',
        fill: 'forwards',
      },
    )

    const clear = () => setActiveFlight(null)
    void anim.finished.then(clear).catch(clear)
    return () => {
      anim.cancel()
      clear()
    }
  }, [activeFlight])

  return (
    <div ref={containerRef} className="card-draw-flight-layer" aria-hidden="true">
      {activeFlight && (
        <div
          ref={flightRef}
          className={`flying-draw-card pos-${activeFlight.pos}`}
          style={{
            transform: `translate(${activeFlight.startX}px, ${activeFlight.startY}px) scale(0.85)`,
          }}
        >
          <div className="flying-draw-card-trail" />
          {activeFlight.pos === 'human' && activeFlight.card ? (
            <CardView card={activeFlight.card} size="sm" showHints={settings} />
          ) : (
            <div className="kana-card size-sm face-down" aria-hidden>
              <span className="card-back-kana">あ</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
