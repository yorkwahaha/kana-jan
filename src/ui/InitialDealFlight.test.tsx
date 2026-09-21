import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { startGame } from '../engine/game'
import { DEFAULT_SETTINGS } from './settings'
import { InitialDealFlight } from './InitialDealFlight'
import { initialDealAssignments } from './initialDeal'

describe('InitialDealFlight', () => {
  it('deals seven cards to every seat in rounds starting with the first player', () => {
    const state = startGame({ seed: 44, skipPreview: true })
    const assignments = initialDealAssignments(state, 0)

    expect(assignments).toHaveLength(28)
    expect(assignments[0]?.playerIndex).toBe(state.startPlayerIndex)
    expect(assignments.slice(0, 4).map((assignment) => assignment.slotIndex)).toEqual([0, 0, 0, 0])
    expect(
      Object.fromEntries(
        ['human', 'left', 'top', 'right'].map((position) => [
          position,
          assignments.filter((assignment) => assignment.position === position).length,
        ]),
      ),
    ).toEqual({ human: 7, left: 7, top: 7, right: 7 })
  })

  it('renders a dedicated initial-deal presentation layer', () => {
    const state = startGame({ seed: 42, skipPreview: true })
    const html = renderToString(
      <InitialDealFlight state={state} settings={{ ...DEFAULT_SETTINGS, animation: 'normal' }} />,
    )

    expect(state.phase).toBe('dealing')
    expect(html).toContain('initial-deal-flight-layer')
    expect(html).toContain('配牌中 · 每家 7 張')
  })
})
