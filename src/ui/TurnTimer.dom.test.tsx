/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTurnCountdown } from './TurnTimer'

function Harness({ onTimeout, active = true, phase = 'discard' }: { onTimeout: () => void; active?: boolean; phase?: string }) {
  const remaining = useTurnCountdown(2, 'turn-1', active, onTimeout, phase)
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

  it('pauses the remaining duration and resumes the same turn without instant timeout', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const onTimeout = vi.fn()
    const view = render(<Harness onTimeout={onTimeout} />)

    act(() => vi.advanceTimersByTime(750))
    view.rerender(<Harness onTimeout={onTimeout} active={false} />)
    const paused = Number(view.getByTestId('remaining').textContent)
    act(() => vi.advanceTimersByTime(5000))
    expect(onTimeout).not.toHaveBeenCalled()
    expect(Number(view.getByTestId('remaining').textContent)).toBe(paused)

    view.rerender(<Harness onTimeout={onTimeout} active />)
    act(() => vi.advanceTimersByTime(1100))
    expect(onTimeout).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(500))
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('fires at most once for the same turn key even when phase changes after expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const onTimeout = vi.fn()
    const view = render(<Harness onTimeout={onTimeout} phase="discard" />)

    act(() => vi.advanceTimersByTime(2100))
    expect(onTimeout).toHaveBeenCalledTimes(1)
    view.rerender(<Harness onTimeout={onTimeout} phase="playerAction" />)
    act(() => vi.advanceTimersByTime(1))
    expect(onTimeout).toHaveBeenCalledTimes(1)
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
