/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { turnClockKey, useTurnCountdown, visibleTurnClockKey } from './TurnTimer'

function Harness({ onTimeout, active = true, phase = 'discard', deadlineAt }: { onTimeout: () => void; active?: boolean; phase?: string; deadlineAt?: number }) {
  const remaining = useTurnCountdown(2, 'turn-1', active, onTimeout, phase, deadlineAt)
  return <output data-testid="remaining">{remaining}</output>
}

function ReactionHarness({ onTimeout, isMyTurn, actorId, reactionIndex }: {
  onTimeout: () => void
  isMyTurn: boolean
  actorId: string
  reactionIndex: number
}) {
  const clockKey = turnClockKey({
    turnNumber: 5, phase: 'reaction', actorId, comboCount: 0, reactionIndex,
  })
  const visible = visibleTurnClockKey({
    phase: 'reaction', isMyTurn, clockKey, turnNumber: 5, lastDiscardPlayerId: 'discarder',
  })
  const remaining = useTurnCountdown(12, visible, true, onTimeout, 'reaction')
  return <output data-testid="reaction-remaining">{remaining}</output>
}

describe('useTurnCountdown DOM lifecycle', () => {
  it('第二位抄牌者即使公開參考鐘已歸零，也獲得完整新的 12 秒', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const observedTimeout = vi.fn()
    const ownTimeout = vi.fn()
    const view = render(<ReactionHarness onTimeout={observedTimeout} isMyTurn={false}
      actorId="first" reactionIndex={0} />)
    act(() => vi.advanceTimersByTime(12_100))
    expect(view.getByTestId('reaction-remaining').textContent).toBe('0')
    view.rerender(<ReactionHarness onTimeout={ownTimeout} isMyTurn
      actorId="second" reactionIndex={1} />)
    expect(view.getByTestId('reaction-remaining').textContent).toBe('12')
    act(() => vi.advanceTimersByTime(11_000))
    expect(ownTimeout).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1_100))
    expect(ownTimeout).toHaveBeenCalledTimes(1)
  })
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

  it('shows the room deadline after reopening a local panel', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const onTimeout = vi.fn()
    const view = render(<Harness onTimeout={onTimeout} deadlineAt={7000} />)
    expect(view.getByTestId('remaining').textContent).toBe('6')
    view.rerender(<Harness onTimeout={onTimeout} deadlineAt={7000} active={false} />)
    act(() => vi.advanceTimersByTime(4000))
    view.rerender(<Harness onTimeout={onTimeout} deadlineAt={7000} />)
    expect(view.getByTestId('remaining').textContent).toBe('2')
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
