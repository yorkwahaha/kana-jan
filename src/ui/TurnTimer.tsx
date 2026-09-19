import { useEffect, useState } from 'react'

interface Props {
  seconds?: number
  turnKey: string | number
  active: boolean
  onTimeout: () => void
  label?: string
  className?: string
}

export function TurnTimer({
  seconds = 18,
  turnKey,
  active,
  onTimeout,
  label,
  className = '',
}: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [turnKey, seconds, active])

  useEffect(() => {
    if (!active) return

    if (remaining <= 0) {
      onTimeout()
      return
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [active, remaining, onTimeout])

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
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [turnKey, seconds, active])

  useEffect(() => {
    if (!active) return

    if (remaining <= 0) {
      onTimeout()
      return
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [active, remaining, onTimeout])

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
