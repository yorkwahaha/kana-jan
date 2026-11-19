import { useCallback, useEffect, useRef } from 'react'
import { pickSafeTimeoutDiscard } from '../engine/ai'
import { reactionActor, type GameAction } from '../engine/game'
import type { GameState, PlayerState } from '../engine/types'
import { followUpDiscardAfterExpiredClock, turnClockKey } from './TurnTimer'

export type NetworkMode = 'none' | 'host' | 'guest'

interface Options {
  state: GameState
  networkMode: NetworkMode
  mySeat: number
  spectating: boolean
  dispatch: (action: GameAction) => void
  paused?: boolean
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

function turnActor(state: GameState): PlayerState | null {
  if (state.phase === 'reaction') return reactionActor(state)
  return state.players[state.currentPlayerIndex] ?? null
}

function isDecisionPhase(phase: GameState['phase']): boolean {
  return phase === 'playerAction' || phase === 'discard' || phase === 'reaction'
}

function clockKeyFor(state: GameState, actor: PlayerState | null): string {
  return turnClockKey({
    turnNumber: state.turnNumber,
    phase: state.phase,
    actorId: actor?.id,
    comboCount: state.comboCount,
    reactionIndex: state.reactionIndex,
  })
}

export function withRoomTurnDeadline(previous: GameState, next: GameState, now: number): GameState {
  const actor = turnActor(next)
  let deadline: number | undefined
  if (actor && actor.kind !== 'ai' && shouldUseTurnTimeout(actor) && isDecisionPhase(next.phase)) {
    deadline = clockKeyFor(previous, turnActor(previous)) === clockKeyFor(next, actor)
      ? previous.turnDeadlineAt
      : undefined
    deadline ??= now + (next.phase === 'reaction' ? 12_000 : 18_000)
  }
  return deadline === next.turnDeadlineAt ? next : { ...next, turnDeadlineAt: deadline }
}

export function useTurnOrchestration({ state, networkMode, mySeat, spectating, dispatch, paused = false }: Options): TurnOrchestration {
  const handleTurnTimeoutRef = useRef<() => void>(() => undefined)
  const turnClockExpiredRef = useRef(false)
  const currentActor = turnActor(state)
  const isMyTurn = !spectating && currentActor ? currentActor.seat === mySeat : false
  const isTurnActive = !spectating && isDecisionPhase(state.phase)
  const turnTimeoutEnabled = shouldUseTurnTimeout(currentActor)

  const handleTurnTimeout = useCallback(() => {
    if (!turnTimeoutEnabled || !isTurnActive || !currentActor || currentActor.kind === 'ai') return
    if (networkMode === 'guest' || (networkMode === 'none' && (paused || !isMyTurn))) return
    if (state.phase === 'playerAction') {
      turnClockExpiredRef.current = true
      dispatch({ type: 'SKIP_YAKU' })
    } else if (state.phase === 'discard' && currentActor.hand.length) {
      dispatch({ type: 'DISCARD', cardId: pickSafeTimeoutDiscard(currentActor, state) })
    } else if (state.phase === 'reaction') {
      dispatch({ type: 'PASS_CLAIM' })
    }
  }, [paused, turnTimeoutEnabled, isTurnActive, isMyTurn, networkMode, currentActor, state, dispatch])
  handleTurnTimeoutRef.current = handleTurnTimeout

  const clockKey = clockKeyFor(state, currentActor)
  const deadline = networkMode === 'host' ? state.turnDeadlineAt : undefined

  useEffect(() => {
    turnClockExpiredRef.current = false
  }, [clockKey])

  useEffect(() => {
    if (deadline === undefined) return
    const timer = window.setTimeout(() => handleTurnTimeoutRef.current(), Math.max(0, deadline - Date.now()))
    return () => window.clearTimeout(timer)
  }, [deadline, clockKey, state.phase])

  useEffect(() => {
    if (networkMode !== 'none' || paused || !isMyTurn || !followUpDiscardAfterExpiredClock(state.phase, turnClockExpiredRef.current)) return
    const timer = window.setTimeout(() => handleTurnTimeoutRef.current(), 280)
    return () => window.clearTimeout(timer)
  }, [networkMode, paused, isMyTurn, state.phase, clockKey])

  return { currentActor, isMyTurn, isTurnActive, turnTimeoutEnabled, clockKey, handleTurnTimeout }
}
