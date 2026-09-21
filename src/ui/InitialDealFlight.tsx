import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { HAND_SIZE, type GameState } from '../engine/types'
import type { TablePosition } from './seats'
import type { Settings } from './settings'
import { initialDealAssignments } from './initialDeal'

interface Props {
  state: GameState
  settings: Settings
  mySeat?: number
}

interface DealFlight {
  id: number
  position: TablePosition
  startX: number
  startY: number
  endX: number
  endY: number
  delay: number
  duration: number
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function timingFor(settings: Settings) {
  if (settings.animation === 'off') return { step: 0, duration: 1 }
  return settings.animation === 'fast'
    ? { step: 50, duration: 240 }
    : { step: 105, duration: 390 }
}

export function InitialDealFlight({ state, settings, mySeat = 0 }: Props) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [flights, setFlights] = useState<DealFlight[]>([])
  const [dealtCount, setDealtCount] = useState(0)

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined' || state.phase !== 'dealing') return
    if (settings.animation === 'off') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const layer = layerRef.current
    const table = layer?.closest('.felt-oval')
    if (!layer || !table) return

    const tableRect = table.getBoundingClientRect()
    const deck = table.querySelector('.deck-pile')
    const deckRect = deck?.getBoundingClientRect()
    const startX = deckRect
      ? deckRect.left + deckRect.width / 2 - tableRect.left
      : tableRect.width * 0.43
    const startY = deckRect
      ? deckRect.top + deckRect.height / 2 - tableRect.top
      : tableRect.height * 0.45
    const { step, duration } = timingFor(settings)
    const next: DealFlight[] = []

    initialDealAssignments(state, mySeat).forEach(({ position, slotIndex }, order) => {
      const targetSelector =
        position === 'human'
          ? `.human-hand-area .hand-card-slot:nth-child(${slotIndex + 1})`
          : `.hand-fan.pos-${position} .mini-back:nth-child(${slotIndex + 1})`
      const target = table.querySelector(targetSelector)
      const targetRect = target?.getBoundingClientRect()

      const fallback = {
        human: { x: 0.45, y: 0.88 },
        left: { x: 0.14, y: 0.37 },
        top: { x: 0.52, y: 0.1 },
        right: { x: 0.86, y: 0.4 },
      }[position]

      next.push({
        id: order,
        position,
        startX,
        startY,
        endX: targetRect
          ? targetRect.left + targetRect.width / 2 - tableRect.left
          : tableRect.width * fallback.x,
        endY: targetRect
          ? targetRect.top + targetRect.height / 2 - tableRect.top
          : tableRect.height * fallback.y,
        delay: order * step,
        duration,
      })
    })

    setFlights(next)
  }, [state.phase, state.players, state.startPlayerIndex, settings.animation, mySeat])

  useEffect(() => {
    setDealtCount(0)
    if (flights.length === 0) return
    const timers = flights.map((flight, index) =>
      window.setTimeout(
        () => setDealtCount(index + 1),
        flight.delay + Math.round(flight.duration * 0.18),
      ),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [flights])

  const deckOrigin = flights[0]
  const initialDeckCount = state.deck.length + state.players.length * HAND_SIZE

  return (
    <div
      ref={layerRef}
      className="initial-deal-flight-layer"
      aria-hidden="true"
      style={deckOrigin ? {
        '--deal-deck-x': `${deckOrigin.startX}px`,
        '--deal-deck-y': `${deckOrigin.startY}px`,
      } as React.CSSProperties : undefined}
    >
      {flights.map((flight) => (
        <i
          key={flight.id}
          className={`initial-deal-card pos-${flight.position}`}
          style={{
            '--deal-start-x': `${flight.startX}px`,
            '--deal-start-y': `${flight.startY}px`,
            '--deal-end-x': `${flight.endX}px`,
            '--deal-end-y': `${flight.endY}px`,
            '--deal-delay': `${flight.delay}ms`,
            '--deal-duration': `${flight.duration}ms`,
          } as React.CSSProperties}
        >
          <span>あ</span>
        </i>
      ))}
      {deckOrigin && (
        <span className="initial-deal-deck-count">
          あと {Math.max(state.deck.length, initialDeckCount - dealtCount)}
        </span>
      )}
      <span className="initial-deal-status">{`配牌中 · 每家 ${HAND_SIZE} 張`}</span>
    </div>
  )
}
