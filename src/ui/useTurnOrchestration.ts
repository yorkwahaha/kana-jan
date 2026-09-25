import { useCallback, useEffect, useRef } from 'react'
import { pickSafeTimeoutDiscard } from '../engine/ai'
import { currentPlayer, reactionActor, type GameAction } from '../engine/game'
import type { GameState, PlayerState } from '../engine/types'
import { followUpDiscardAfterExpiredClock, turnClockKey } from './TurnTimer'

export type NetworkMode = 'none' | 'host' | 'guest'

interface Options {
  state: GameState
  networkMode: NetworkMode
  mySeat: number
  spectating: boolean
  dispatch: (action: GameAction) => void
}

export interface TurnOrchestration {
  currentActor: PlayerState | null
  isMyTurn: boolean
  isTurnActive: boolean
  turnTimeoutEnabled: boolean
  clockKey: string
  handleTurnTimeout: () => void
}

export function shouldUseTurnTimeout(actor: PlayerState | null): boolean {
  return actor !== null && actor.aiDifficulty !== 'easy'
}

export function useTurnOrchestration({ state, networkMode, mySeat, spectating, dispatch }: Options): TurnOrchestration {
  const handleTurnTimeoutRef = useRef<() => void>(() => undefined)
  const turnClockExpiredRef = useRef(false)
  const currentActor =
    state.phase === 'lobby' || state.players.length === 0
      ? null
      : state.phase === 'reaction'
        ? (reactionActor(state) ?? state.players[state.currentPlayerIndex] ?? null)
        : (state.players[state.currentPlayerIndex] ?? null)
  const isMyTurn = !spectating && currentActor ? currentActor.seat === mySeat : false
  const isTurnActive =
    !spectating &&
    (state.phase === 'playerAction' || state.phase === 'discard' || state.phase === 'reaction')
  const turnTimeoutEnabled = shouldUseTurnTimeout(currentActor)

  const handleTurnTimeout = useCallback(() => {
    if (!turnTimeoutEnabled || !isTurnActive || !currentActor) return
    if (isMyTurn || (networkMode === 'host' && currentActor.kind === 'remote')) {
      if (state.phase === 'playerAction') {
        dispatch({ type: 'SKIP_YAKU' })
      } else if (state.phase === 'discard') {
        const actorPlayer = state.players.find((p) => p.seat === currentActor.seat)
        if (actorPlayer?.hand.length) {
          dispatch({ type: 'DISCARD', cardId: pickSafeTimeoutDiscard(actorPlayer, state) })
        }
      } else if (state.phase === 'reaction') {
        dispatch({ type: 'PASS_CLAIM' })
      }
    }
  }, [turnTimeoutEnabled, isTurnActive, isMyTurn, networkMode, currentActor, state, dispatch])
  handleTurnTimeoutRef.current = handleTurnTimeout

  const clockKey = turnClockKey({
    turnNumber: state.turnNumber,
    phase: state.phase,
    actorId: currentActor?.id,
    comboCount: state.comboCount,
    reactionIndex: state.reactionIndex,
  })
  const hostTimeoutMs = state.phase === 'reaction' ? 14_000 : 20_000
  const hostShouldTimeout =
    turnTimeoutEnabled &&
    networkMode === 'host' &&
    isTurnActive &&
    (state.phase === 'reaction' ? reactionActor(state) : currentPlayer(state))?.kind === 'remote'

  useEffect(() => {
    turnClockExpiredRef.current = false
  }, [clockKey])

  useEffect(() => {
    if (!hostShouldTimeout) return
    const timer = window.setTimeout(() => {
      turnClockExpiredRef.current = true
      handleTurnTimeoutRef.current()
    }, hostTimeoutMs)
    return () => window.clearTimeout(timer)
  }, [hostShouldTimeout, clockKey, hostTimeoutMs])

  useEffect(() => {
    if (!hostShouldTimeout || !followUpDiscardAfterExpiredClock(state.phase, turnClockExpiredRef.current)) return
    const timer = window.setTimeout(() => handleTurnTimeoutRef.current(), 280)
    return () => window.clearTimeout(timer)
  }, [hostShouldTimeout, state.phase, clockKey])

  return { currentActor, isMyTurn, isTurnActive, turnTimeoutEnabled, clockKey, handleTurnTimeout }
}
