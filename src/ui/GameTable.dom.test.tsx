/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { getCardById } from '../data/cards'
import { startGame } from '../engine/game'
import { GameTable } from './GameTable'
import { DEFAULT_SETTINGS } from './settings'

const cards = (...ids: string[]) => ids.map(getCardById)
const noop = () => undefined

afterEach(cleanup)

function table(state: ReturnType<typeof startGame>, extra: { onLocalOverlayChange?: (open: boolean) => void } = {}) {
  return (
    <GameTable
      state={state}
      settings={DEFAULT_SETTINGS}
      selectedCardId={null}
      locked={false}
      onSelectCard={noop}
      onChooseYaku={noop}
      onSkipYaku={noop}
      onClaim={noop}
      onPassClaim={noop}
      onOpenSettings={noop}
      onOpenHelp={noop}
      onOpenCatalog={noop}
      onLocalOverlayChange={extra.onLocalOverlayChange}
    />
  )
}

describe('GameTable DOM state', () => {
  it('牌況／記錄抽屜會回報父層暫停狀態', () => {
    const state = startGame({ seed: 71, skipPreview: true })
    const onLocalOverlayChange = vi.fn()
    const view = render(table(state, { onLocalOverlayChange }))
    expect(onLocalOverlayChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(view.getByRole('button', { name: '牌況與役種' }))
    expect(onLocalOverlayChange).toHaveBeenLastCalledWith(true)
    fireEvent.click(view.getByRole('button', { name: '牌況與役種' }))
    expect(onLocalOverlayChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(view.getByRole('button', { name: '對局記錄' }))
    expect(onLocalOverlayChange).toHaveBeenLastCalledWith(true)
  })

  it('換回合時會清掉上一回合 hover 的役種高亮', () => {
    const state = startGame({
      seed: 72,
      skipPreview: true,
      activeRows: ['ka', 'sa', 'ta', 'na'],
      hands: [
        cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary', 'ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'ko-hiragana'),
        cards('sa-hiragana'),
        cards('ta-hiragana'),
        cards('na-hiragana'),
      ],
    })
    state.phase = 'playerAction'
    state.currentPlayerIndex = 0
    state.turnNumber = 1

    const view = render(table(state))
    const claimButtons = [...view.container.querySelectorAll<HTMLButtonElement>('.btn-compact-claim')]
    expect(claimButtons.length).toBeGreaterThan(1)
    const highlighted = () => [...view.container.querySelectorAll('.human-hand-area .is-yaku')]
      .map((element) => element.getAttribute('aria-label'))
      .sort()
    const defaultHighlight = highlighted()

    fireEvent.mouseEnter(claimButtons[1]!)
    expect(highlighted()).not.toEqual(defaultHighlight)

    view.rerender(table({ ...state, turnNumber: 2 }))
    expect(highlighted()).toEqual(defaultHighlight)
  })
})
