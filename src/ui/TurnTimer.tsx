import { useEffect, useRef, useState } from 'react'

interface Props {
  seconds?: number
  turnKey: string | number
  active: boolean
  onTimeout: () => void
  label?: string
  className?: string
}

function useTurnCountdown(seconds: number, turnKey: string | number, active: boolean, onTimeout: () => void) {
  const [remaining, setRemaining] = useState(seconds)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    setRemaining(seconds)
    if (!active) return

    const deadline = Date.now() + seconds * 1000
    let fired = false
    const finish = () => {
      if (fired) return
      fired = true
      setRemaining(0)
      onTimeoutRef.current()
    }
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(next)
      if (next === 0) finish()
    }
    const interval = window.setInterval(tick, 250)
    const timeout = window.setTimeout(finish, seconds * 1000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [active, seconds, turnKey])

  return remaining
}

export function TurnTimer({
  seconds = 18,
  turnKey,
  active,
  onTimeout,
  label,
  className = '',
}: Props) {
  const remaining = useTurnCountdown(seconds, turnKey, active, onTimeout)

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
export function CompactTurnTimer({
  seconds = 18,
  turnKey,
  active,
  onTimeout,
}: {
  seconds?: number
  turnKey: string | number
  active: boolean
  onTimeout: () => void
}) {
  const remaining = useTurnCountdown(seconds, turnKey, active, onTimeout)

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
