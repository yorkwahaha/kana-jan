import { isClientAction } from '../engine/game'
import { isNetworkGameState, isRecord } from '../engine/stateValidation'
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
        typeof value.name !== 'string' ||
        typeof value.peerId !== 'string' ||
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
      return typeof value.text === 'string' ? { type: 'CHAT', text: value.text } : null
    default:
      return null
  }
}

export function parseHostMessage(value: unknown): HostMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null

  switch (value.type) {
    case 'ERROR':
      return typeof value.message === 'string' ? { type: 'ERROR', message: value.message } : null
    case 'CHAT':
      return typeof value.senderName === 'string' && typeof value.text === 'string'
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
    case 'GAME_START':
      return (
        isNetworkGameState(value.state) &&
        isSeat(value.yourSeat, value.spectating) &&
        (value.spectating === undefined || typeof value.spectating === 'boolean') &&
        (value.resumeToken === undefined || (typeof value.resumeToken === 'string' && /^[a-f0-9]{32}$/.test(value.resumeToken)))
      )
        ? (value as unknown as HostMessage)
        : null
    case 'GAME_SYNC':
      return (
        isNetworkGameState(value.state) &&
        (value.spectating === undefined || typeof value.spectating === 'boolean')
      )
        ? (value as unknown as HostMessage)
        : null
    default:
      return null
  }
}
