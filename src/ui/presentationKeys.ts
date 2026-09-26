import type { GameState } from '../engine/types'

export function drawPresentationKey(state: Pick<GameState, 'lastFx' | 'lastDrawnCardId' | 'matchId' | 'seed'>): string | null {
  if (state.lastFx !== 'draw' || !state.lastDrawnCardId) return null
  return `${state.matchId ?? state.seed}:${state.lastDrawnCardId}`
}

export function discardPresentationKey(
  state: Pick<GameState, 'lastFx' | 'lastDiscardPlayerId' | 'matchId' | 'seed' | 'players'>,
): string | null {
  if (state.lastFx !== 'discard' || !state.lastDiscardPlayerId) return null
  const discarder = state.players.find((player) => player.id === state.lastDiscardPlayerId)
  const lastDiscardId = discarder?.discards.at(-1)?.id
  return lastDiscardId ? `${state.matchId ?? state.seed}:${state.lastDiscardPlayerId}:${lastDiscardId}` : null
}
