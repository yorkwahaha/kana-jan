/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTurnCountdown } from './TurnTimer'

function Harness({ onTimeout }: { onTimeout: () => void }) {
  const remaining = useTurnCountdown(2, 'turn-1', true, onTimeout, 'discard')
  return <output data-testid="remaining">{remaining}</output>
}

describe('useTurnCountdown DOM lifecycle', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('does not write deadline timing during render before effects commit', () => {
    const now = vi.spyOn(Date, 'now')
    renderToString(<Harness onTimeout={() => undefined} />)
    expect(now).not.toHaveBeenCalled()
  })

  it('does not restart the deadline when only the callback identity changes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const first = vi.fn()
    const second = vi.fn()
    const view = render(<Harness onTimeout={first} />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    view.rerender(<Harness onTimeout={second} />)
    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
