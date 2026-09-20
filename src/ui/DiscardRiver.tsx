import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { PlayerState } from '../engine/types'
import type { TablePosition } from './seats'
import { CardView } from './CardView'
import { delayFor, type Settings } from './settings'
import { SparkleCluster } from './Sparkles'
import type { KanaCard } from '../data/cards'

interface Props {
  player: PlayerState
  position: TablePosition
  liveCardId?: string | null
  settings: Settings
  ronGunCard?: KanaCard | null
  isRonHighlight?: boolean
}

const FALLBACK_FROM: Record<TablePosition, { x: number; y: number }> = {
  human: { x: 0, y: 110 },
  top: { x: 0, y: -80 },
  left: { x: -90, y: 0 },
  right: { x: 90, y: 0 },
}

export function DiscardRiver({
  player,
  position,
  liveCardId,
  settings,
  ronGunCard,
  isRonHighlight = false,
}: Props) {
  const riverRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLSpanElement>(null)
  const flightMs = delayFor(settings, 'discardFlight')

  useLayoutEffect(() => {
    const slot = liveRef.current
    const river = riverRef.current
    if (!slot || !liveCardId) return
    if (settings.animation === 'off') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const table = river?.closest('.felt-oval')
    const fromEl = table?.querySelector(`[data-hand-origin="${position}"]`)
    const to = slot.getBoundingClientRect()
    const restingTransform = window.getComputedStyle(slot).transform
    let dx = FALLBACK_FROM[position].x
    let dy = FALLBACK_FROM[position].y
    if (fromEl) {
      const from = fromEl.getBoundingClientRect()
      dx = from.left + from.width / 2 - (to.left + to.width / 2)
      dy = from.top + from.height / 2 - (to.top + to.height / 2)
    }

    const startScale = position === 'human' ? 2 : 2.4
    river?.classList.add('is-flying')
    const anim = slot.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${startScale})` },
        { transform: `translate(${dx}px, ${dy}px) scale(${startScale})`, offset: 0.22 },
        { transform: restingTransform === 'none' ? 'none' : restingTransform },
      ],
      {
        duration: flightMs,
        easing: 'cubic-bezier(0.2, 0.85, 0.25, 1)',
        fill: 'both',
      },
    )
    const clear = () => river?.classList.remove('is-flying')
    void anim.finished.then(clear).catch(clear)
    return () => {
      anim.cancel()
      clear()
    }
  }, [liveCardId, position, settings.animation, flightMs])

  const discards = [...player.discards]
  if (ronGunCard && !discards.some((c) => c.id === ronGunCard.id)) {
    discards.push(ronGunCard)
  }

  if (discards.length === 0) return null

  const columns = Array.from({ length: Math.min(4, discards.length) }, (_, column) =>
    discards
      .map((card, index) => ({ card, index }))
      .filter(({ index }) => index % 4 === column)
      .map(({ card, index }) => ({ card, layer: Math.floor(index / 4) })),
  )

  return (
    <div
      ref={riverRef}
      className={`discard-river pos-${position}`}
      aria-label={`${player.name} 的棄牌`}
    >
      {columns.map((column, columnIndex) => (
        <span className="river-column" key={columnIndex}>
          {column.map(({ card, layer }) => {
            const live = card.id === liveCardId
            const isGun = ronGunCard?.id === card.id
            const slotClass = [
              'river-slot',
              live ? 'is-live' : '',
              isGun ? 'is-ron-gun' : '',
              isGun && isRonHighlight ? 'is-ron-active' : '',
            ]
              .filter(Boolean)
              .join(' ')
            const layerStyle = { '--river-layer': layer } as CSSProperties

            return (
              <span
                key={card.id}
                ref={live ? liveRef : undefined}
                className={slotClass}
                style={layerStyle}
              >
                <CardView card={card} size="river" showHints={settings} yakuPart={live || isGun} />
                {isGun && (
                  <>
                    <SparkleCluster className="river-ron-sparkles" scale={0.75} />
                    <span className="ron-gun-badge">⚡ 放槍！</span>
                  </>
                )}
              </span>
            )
          })}
        </span>
      ))}
    </div>
  )
}
