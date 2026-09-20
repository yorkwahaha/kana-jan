import {
  availableYakuFor,
  currentPlayer,
  currentReactionYakus,
  isClientAction,
  reactionActor,
  type GameAction,
} from '../engine/game'
import type { GameState } from '../engine/types'

export const MAX_PLAYER_NAME = 16
export const MAX_CHAT_LENGTH = 200

export function generateResumeToken(): string {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function sanitizePlayerName(name: string, fallback = '玩家'): string {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  if (!trimmed) return fallback
  return trimmed.slice(0, MAX_PLAYER_NAME)
}

export function sanitizeChatText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_LENGTH)
}

/**
 * 房主在套用客端動作前的權限檢查：必須是允許的動作類型、輪到該座位，
 * 且出牌／宣告的目標確實存在於該玩家可見的合法選項中。
 */
export function authorizeClientAction(state: GameState, seat: number, action: GameAction): boolean {
  if (!isClientAction(action)) return false
  if (seat < 0) return false
  const player = state.players.find((p) => p.seat === seat)
  if (!player) return false
  if (state.phase === 'lobby' || state.phase === 'gameOver') return false

  switch (action.type) {
    case 'SKIP_PREVIEW':
      return state.phase === 'preview'
    case 'CHOOSE_YAKU': {
      if (state.phase !== 'playerAction') return false
      if (currentPlayer(state).seat !== seat) return false
      return availableYakuFor(state, player.id).some((y) => y.id === action.yakuId)
    }
    case 'SKIP_YAKU':
      return state.phase === 'playerAction' && currentPlayer(state).seat === seat
    case 'DISCARD':
      return (
        state.phase === 'discard' &&
        currentPlayer(state).seat === seat &&
        player.hand.some((c) => c.id === action.cardId)
      )
    case 'CLAIM_YAKU': {
      if (state.phase !== 'reaction') return false
      if (reactionActor(state)?.seat !== seat) return false
      return currentReactionYakus(state).some((y) => y.id === action.yakuId)
    }
    case 'PASS_CLAIM':
      return state.phase === 'reaction' && reactionActor(state)?.seat === seat
    case 'FINISH_REVIEW': {
      if (state.phase !== 'review') return false
      const scoring = state.players.find((p) => p.id === state.pendingScore?.playerId)
      return scoring?.seat === seat || currentPlayer(state).seat === seat
    }
    default:
      return false
  }
}

/** 斷線改 AI 後，重連玩家收回座位。 */
export function restoreDisconnectedPlayer(state: GameState, seat: number): GameState {
  const player = state.players.find((p) => p.seat === seat)
  if (!player) return state
  const cleanName = player.name.replace(/\s*\(AI\)$/, '')
  return {
    ...state,
    players: state.players.map((p) =>
      p.seat === seat ? { ...p, kind: 'remote' as const, name: cleanName } : p,
    ),
  }
}
