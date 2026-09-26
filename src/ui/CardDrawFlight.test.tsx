import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { CardDrawFlight } from './CardDrawFlight'
import { drawPresentationKey } from './presentationKeys'
import { pushEvent, reduce, startGame } from '../engine/game'
import { DEFAULT_SETTINGS } from './settings'

describe('CardDrawFlight', () => {
  it('renders safely in SSR mode', () => {
    const state = startGame({ seed: 42 })
    const html = renderToString(
      <CardDrawFlight state={state} settings={DEFAULT_SETTINGS} mySeat={0} />,
    )
    expect(html).toContain('card-draw-flight-layer')
  })

  it('does not render flight element when state.lastFx is null', () => {
    const state = startGame({ seed: 42 })
    const html = renderToString(
      <CardDrawFlight state={state} settings={DEFAULT_SETTINGS} mySeat={0} />,
    )
    expect(html).not.toContain('flying-draw-card')
  })

  it('unrelated events do not create a new draw presentation identity', () => {
    let state = startGame({ seed: 42, skipPreview: true })
    state = reduce(state, { type: 'DEAL_DONE' })
    state = reduce(state, { type: 'DRAW' })
    const key = drawPresentationKey(state)
    const unrelated = pushEvent(state, '玩家重新連線')
    expect(unrelated.eventSeq).toBeGreaterThan(state.eventSeq)
    expect(drawPresentationKey(unrelated)).toBe(key)
  })
})
