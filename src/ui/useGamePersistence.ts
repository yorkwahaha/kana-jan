import { useCallback, useEffect, useRef } from 'react'
import type { GameState } from '../engine/types'
import { saveGame } from './persist'

/** Debounced local save lifecycle. Network callers simply do not invoke scheduleSave. */
export function useGamePersistence(): (state: GameState) => void {
  const pendingSaveRef = useRef<GameState | null>(null)
  const saveTimerRef = useRef(0)

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = 0
    }
    const pending = pendingSaveRef.current
    pendingSaveRef.current = null
    if (pending) saveGame(pending)
  }, [])

  const scheduleSave = useCallback((next: GameState) => {
    pendingSaveRef.current = next
    if (next.phase === 'lobby' || next.phase === 'review' || next.phase === 'gameOver') {
      flushPendingSave()
      return
    }
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = 0
      const pending = pendingSaveRef.current
      pendingSaveRef.current = null
      if (pending) saveGame(pending)
    }, 300)
  }, [flushPendingSave])

  useEffect(() => {
    const onHide = () => flushPendingSave()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      flushPendingSave()
    }
  }, [flushPendingSave])

  return scheduleSave
}
