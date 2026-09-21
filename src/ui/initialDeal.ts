import { HAND_SIZE, type GameState } from '../engine/types'
import { tablePosition, type TablePosition } from './seats'

export interface InitialDealAssignment {
  playerIndex: number
  position: TablePosition
  slotIndex: number
}

export function initialDealAssignments(state: GameState, mySeat: number): InitialDealAssignment[] {
  return Array.from({ length: state.players.length * HAND_SIZE }, (_, order) => {
    const playerIndex = (state.startPlayerIndex + order) % state.players.length
    const player = state.players[playerIndex]
    if (!player) throw new Error(`Missing player at index ${playerIndex}`)
    return {
      playerIndex,
      position: tablePosition(player.seat, mySeat),
      slotIndex: Math.floor(order / state.players.length),
    }
  })
}
