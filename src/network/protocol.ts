import { isClientAction } from '../engine/game'
import { isNetworkGameState, isRecord } from '../engine/stateValidation'
import { MAX_CHAT_LENGTH, MAX_PLAYER_NAME } from './authorize'
import { makeHiddenCard } from './mask'
import type { ClientMessage, HostMessage } from './types'

function isRoomState(value: unknown): boolean {
  if (!isRecord(value) || typeof value.roomId !== 'string' || typeof value.hostPeerId !== 'string' || typeof value.lessonId !== 'string') return false
  if ((value.aiDifficulty !== 'easy' && value.aiDifficulty !== 'normal') || typeof value.started !== 'boolean') return false
  if (!Array.isArray(value.slots) || value.slots.length !== 4) return false
  const seats: number[] = []
  const ids: string[] = []
  for (const slot of value.slots) {
    if (!isRecord(slot) || !Number.isInteger(slot.seat) || typeof slot.playerId !== 'string' || !slot.playerId || typeof slot.name !== 'string') return false
    if (slot.kind !== 'human' && slot.kind !== 'remote' && slot.kind !== 'ai') return false
    if (typeof slot.isHost !== 'boolean' || typeof slot.connected !== 'boolean' || (slot.peerId !== undefined && typeof slot.peerId !== 'string')) return false
    seats.push(slot.seat as number)
    ids.push(slot.playerId)
  }
  seats.sort((a, b) => a - b)
  return seats.join(',') === '0,1,2,3' && new Set(ids).size === 4
}

function isSeat(value: unknown, spectating: unknown): value is number {
  if (!Number.isInteger(value)) return false
  if (spectating === true) return value === -1
  return typeof value === 'number' && value >= 0 && value < 4
}

export function parseClientMessage(value: unknown): ClientMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null

  switch (value.type) {
    case 'JOIN':
      if (
        typeof value.name !== 'string' || value.name.length > MAX_PLAYER_NAME * 4 ||
        typeof value.peerId !== 'string' || value.peerId.length > 128 ||
        (value.resumePlayerId !== undefined && typeof value.resumePlayerId !== 'string') ||
        (value.resumeToken !== undefined && typeof value.resumeToken !== 'string')
      ) {
        return null
      }
      return {
        type: 'JOIN',
        name: value.name,
        peerId: value.peerId,
        resumePlayerId: value.resumePlayerId,
        resumeToken: value.resumeToken,
      }
    case 'LEAVE':
      return { type: 'LEAVE' }
    case 'ACTION':
      return isClientAction(value.action) ? { type: 'ACTION', action: value.action } : null
    case 'CHAT':
      return typeof value.text === 'string' && value.text.length <= MAX_CHAT_LENGTH
        ? { type: 'CHAT', text: value.text }
        : null
    default:
      return null
  }
}

function expandNetworkState(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.deck)) return value
  if (value.deck.length !== 0 || value.deckCount === undefined) return value
  if (!Number.isInteger(value.deckCount) || Number(value.deckCount) < 0 || Number(value.deckCount) > 1000) return null
  const { deckCount, ...rest } = value
  return {
    ...rest,
    deck: Array.from({ length: Number(deckCount) }, (_, index) => makeHiddenCard(`deck-hidden-${index}`)),
  }
}

export function parseHostMessage(value: unknown): HostMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null

  switch (value.type) {
    case 'ERROR':
      return typeof value.message === 'string' && value.message.length <= 500 ? { type: 'ERROR', message: value.message } : null
    case 'CHAT':
      return typeof value.senderName === 'string' && value.senderName.length <= MAX_PLAYER_NAME * 4 &&
        typeof value.text === 'string' && value.text.length <= MAX_CHAT_LENGTH
        ? { type: 'CHAT', senderName: value.senderName, text: value.text }
        : null
    case 'ROOM_UPDATE':
      return (
        isRoomState(value.roomState) &&
        isSeat(value.yourSeat, value.spectating) &&
        (value.spectating === undefined || typeof value.spectating === 'boolean') &&
        (value.resumeToken === undefined || (typeof value.resumeToken === 'string' && /^[a-f0-9]{32}$/.test(value.resumeToken)))
      )
        ? (value as unknown as HostMessage)
        : null
    case 'GAME_START': {
      const state = expandNetworkState(value.state)
      if (
        !isNetworkGameState(state) ||
        !isSeat(value.yourSeat, value.spectating) ||
        (value.spectating !== undefined && typeof value.spectating !== 'boolean') ||
        (value.resumeToken !== undefined && (typeof value.resumeToken !== 'string' || !/^[a-f0-9]{32}$/.test(value.resumeToken)))
      ) return null
      return {
        type: 'GAME_START',
        state,
        yourSeat: value.yourSeat,
        spectating: value.spectating,
        resumeToken: value.resumeToken,
      }
    }
    case 'GAME_SYNC': {
      const state = expandNetworkState(value.state)
      if (!isNetworkGameState(state) || (value.spectating !== undefined && typeof value.spectating !== 'boolean')) return null
      return { type: 'GAME_SYNC', state, spectating: value.spectating }
    }
    default:
      return null
  }
}
