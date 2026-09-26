/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDialogA11y } from './useDialogA11y'

function DialogHarness({ onClose }: { onClose: () => void }) {
  const ref = useDialogA11y(true, onClose)
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true">
      <button type="button" style={{ display: 'none' }}>隱藏</button>
      <button type="button">第一個</button>
      <div tabIndex={-1} data-testid="scroll-region">可程式化聚焦捲動區</div>
      <button type="button">最後一個</button>
    </div>
  )
}

describe('useDialogA11y', () => {
  afterEach(cleanup)

  it('focuses inside, traps boundary/root Tab, ignores hidden targets, and closes on Escape', () => {
    const onClose = vi.fn()
    const view = render(<DialogHarness onClose={onClose} />)
    const buttons = view.getAllByRole('button', { hidden: true })
    const first = view.getByRole('button', { name: '第一個' })
    const last = view.getByRole('button', { name: '最後一個' })
    const dialog = view.getByRole('dialog')

    expect(document.activeElement).toBe(first)
    expect(document.activeElement).not.toBe(buttons[0])

    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    dialog.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    dialog.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    const scrollRegion = view.getByTestId('scroll-region')
    scrollRegion.focus()
    const innerTab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    scrollRegion.dispatchEvent(innerTab)
    expect(innerTab.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(scrollRegion)

    document.body.tabIndex = -1
    document.body.focus()
    fireEvent.keyDown(document.body, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    document.body.focus()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
