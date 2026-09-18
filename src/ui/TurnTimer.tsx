import { useEffect, useState } from 'react'

interface Props {
  seconds?: number
  turnKey: string | number
  active: boolean
  onTimeout: () => void
}

export function TurnTimer({ seconds = 20, turnKey, active, onTimeout }: Props) {
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
  const percent = Math.max(0, Math.min(100, (remaining / seconds) * 100))

  return (
    <div className={`turn-timer-widget ${isUrgent ? 'urgent' : ''}`} title={`回合剩餘思考時間：${remaining} 秒`}>
      <div className="timer-inner">
        <span className="timer-icon">⏳</span>
        <span className="timer-num">{remaining}s</span>
      </div>
      <div className="timer-bar-track">
        <div className="timer-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
