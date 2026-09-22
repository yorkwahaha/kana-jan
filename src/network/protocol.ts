import type { GameAction } from '../engine/game'
import type { ClientMessage, HostMessage } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isClientAction(value: unknown): value is GameAction {
  if (!isRecord(value) || typeof value.type !== 'string') return false

  switch (value.type) {
    case 'CHOOSE_YAKU':
    case 'CLAIM_YAKU':
      return typeof value.yakuId === 'string'
    case 'DISCARD':
      return typeof value.cardId === 'string'
    case 'SKIP_YAKU':
    case 'PASS_CLAIM':
      return true
    default:
      return false
  }
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
        isRecord(value.roomState) &&
        Array.isArray(value.roomState.slots) &&
        value.roomState.slots.length === 4 &&
        Number.isInteger(value.yourSeat) &&
        (value.spectating === undefined || typeof value.spectating === 'boolean') &&
        (value.resumeToken === undefined || typeof value.resumeToken === 'string')
      )
        ? (value as unknown as HostMessage)
        : null
    case 'GAME_START':
      return (
        isRecord(value.state) &&
        Array.isArray(value.state.players) &&
        value.state.players.length === 4 &&
        Array.isArray(value.state.deck) &&
        typeof value.state.phase === 'string' &&
        Number.isInteger(value.yourSeat) &&
        (value.spectating === undefined || typeof value.spectating === 'boolean') &&
        (value.resumeToken === undefined || typeof value.resumeToken === 'string')
      )
        ? (value as unknown as HostMessage)
        : null
    case 'GAME_SYNC':
      return (
        isRecord(value.state) &&
        Array.isArray(value.state.players) &&
        value.state.players.length === 4 &&
        Array.isArray(value.state.deck) &&
        typeof value.state.phase === 'string' &&
        (value.spectating === undefined || typeof value.spectating === 'boolean')
      )
        ? (value as unknown as HostMessage)
        : null
    default:
      return null
  }
}
