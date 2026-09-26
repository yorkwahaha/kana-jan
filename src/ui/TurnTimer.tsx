/* eslint-disable react-refresh/only-export-components -- 回合計時 hook 與 clock key 與此元件共用 */
import { useEffect, useRef, useState } from 'react'

interface Props {
  remaining: number
  active: boolean
  label?: string
  className?: string
}

/** 自摸決策與摸切共用同一把回合鐘；反應階段才換成獨立的抄牌鐘。 */
export function turnClockKey(input: {
  turnNumber: number
  phase: string
  actorId?: string
  comboCount: number
  reactionIndex: number
}): string {
  if (input.phase === 'reaction') {
    return `rx:${input.turnNumber}:${input.actorId ?? ''}:${input.reactionIndex}`
  }
  return `turn:${input.turnNumber}:${input.actorId ?? ''}:${input.comboCount}`
}

/** 共用回合鐘在自摸階段耗盡後，棄牌階段必須再觸發一次託管。 */
export function followUpDiscardAfterExpiredClock(phase: string, clockExpired: boolean): boolean {
  return clockExpired && phase === 'discard'
}

export function useTurnCountdown(
  seconds: number,
  turnKey: string | number,
  active: boolean,
  onTimeout: () => void,
  phase?: string,
) {
  const [remaining, setRemaining] = useState(seconds)
  const onTimeoutRef = useRef(onTimeout)
  const deadlineRef = useRef(0)
  const keyRef = useRef<string | number | null>(null)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (keyRef.current !== turnKey) {
      keyRef.current = turnKey
      deadlineRef.current = Date.now() + seconds * 1000
    }
    const remainingMs = deadlineRef.current - Date.now()
    setRemaining(Math.max(0, Math.ceil(remainingMs / 1000)))
    if (!active) return

    let fired = false
    const finish = () => {
      if (fired) return
      fired = true
      setRemaining(0)
      onTimeoutRef.current()
    }
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setRemaining(next)
      if (next === 0) finish()
    }
    tick()
    const interval = window.setInterval(tick, 250)
    const timeout = window.setTimeout(finish, Math.max(0, remainingMs))
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [active, seconds, turnKey, phase])

  return remaining
}

export function TurnTimer({ remaining, active, label, className = '' }: Props) {
  if (!active) return null

  const isUrgent = remaining <= 5

  return (
    <div
      className={`turn-timer-widget ${isUrgent ? 'urgent' : ''} ${className}`}
      title={`回合剩餘思考時間：${remaining} 秒`}
    >
      <div className="timer-inner">
        {label && <span className="timer-tag">{label}</span>}
        <span className="timer-icon">⏳</span>
        <span className="timer-num">{remaining}s</span>
      </div>
    </div>
  )
}

/** 參照圖一：藍色快捷和牌按鈕旁之大字純數字即時倒數計時器 */
export function CompactTurnTimer({ remaining, active }: { remaining: number; active: boolean }) {
  if (!active || remaining <= 0) return null

  const isUrgent = remaining <= 5

  return (
    <div
      className={`compact-timer-display ${isUrgent ? 'is-urgent' : ''}`}
      aria-label={`剩餘思考時間 ${remaining} 秒`}
    >
      {remaining}
    </div>
  )
}
