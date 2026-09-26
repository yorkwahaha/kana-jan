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

    fireEvent.keyDown(first, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
